import { ResponseInput, ResponseInputItem, ResponseOutputItem } from 'openai/resources/responses/responses';

import { createOpenAIClient, sendOpenAI } from './openai-client';

import { LLMResponseValidationError, ToolInvocationError } from 'src/errors/llm-errors';
import { getBookmarkList, getWorldInfo } from 'src/main/database';
import { getWorldInfoRequest, getWorldListRequest } from 'src/main/llm/prompt';
import { buildWorldListQuery, WorldRecommendationResult } from 'src/main/llm/recommendation-service';
import { RecommendResult } from 'src/types/main';


function buildRecommendWorldMessages(userRequest: string) {
  const userMessage = userRequest.length > 0 ? `以下の条件を加味してください「${userRequest.trim()}」` : '';

  const messages: ResponseInput = [{
    role: 'user',
    content: [{
      type: 'input_text',
      text: `おすすめワールドを提案してください。${userMessage}`,
    }],
  }];

  return messages;
}

function extractAndValidateOutput(output: ResponseOutputItem[], expectedName: string) {
  if (output) {
    for (const item of output) {
      if (item.type === 'function_call' && item.name && item.name === expectedName) {
        return item;
      }
    }
  }

  throw new LLMResponseValidationError(`Invalid response schema from OpenAI. response: ${JSON.stringify(output)}`);
}

export async function getLLMRecommendWorld(userRequest: string): Promise<RecommendResult> {
  const client = createOpenAIClient();

  const messages = buildRecommendWorldMessages(userRequest);

  // ワールドリストを取得するためのツールコールを送信
  const toolWorldListResponse = await sendOpenAI(client, messages);
  const worldListToolCall = extractAndValidateOutput(toolWorldListResponse.output, getWorldListRequest.name);

  const worldListToolCallArgs = JSON.parse(worldListToolCall.arguments);

  if (!worldListToolCallArgs || typeof worldListToolCallArgs !== 'object' || Array.isArray(worldListToolCallArgs)) {
    throw new LLMResponseValidationError(`Missing required properties in response schema from LLM. arguments: ${worldListToolCall.arguments}`);
  }

  const genre = worldListToolCallArgs['genre'];
  const orderBy = worldListToolCallArgs['orderBy'];
  const sortOrder = worldListToolCallArgs['sortOrder'];

  if (typeof genre !== 'string' || typeof orderBy !== 'string' || typeof sortOrder !== 'string') {
    throw new LLMResponseValidationError(`Invalid input schema from LLM. arguments: ${worldListToolCall.arguments}`);
  }

  const selectQueryBase = buildWorldListQuery(genre, orderBy, sortOrder);
  const getWorldListRequestResult = getBookmarkList(selectQueryBase) as WorldRecommendationResult[] | undefined;

  if (!Array.isArray(getWorldListRequestResult) || getWorldListRequestResult.length === 0) {
    throw new ToolInvocationError(`No world found for the given criteria. sql: ${selectQueryBase}`);
  }

  messages.push(worldListToolCall);

  const toolOutputs: ResponseInputItem.FunctionCallOutput = {
    type: 'function_call_output',
    call_id: worldListToolCall.call_id,
    output: JSON.stringify(getWorldListRequestResult),
  };

  messages.push(toolOutputs);
  // おすすめワールドを取得するためのツールコールを送信
  const toolWorldInfoResponse = await sendOpenAI(client, messages);
  const worldInfoToolCall = extractAndValidateOutput(toolWorldInfoResponse.output, getWorldInfoRequest.name);

  const worldInfoToolCallArgs = JSON.parse(worldInfoToolCall.arguments);

  if (!worldInfoToolCallArgs || typeof worldInfoToolCallArgs !== 'object' || Array.isArray(worldInfoToolCallArgs)) {
    throw new LLMResponseValidationError(`Missing required properties in response schema from LLM. arguments: ${worldInfoToolCallArgs}`);
  }

  const worldId = worldInfoToolCallArgs['worldId'];
  const reason = worldInfoToolCallArgs['reason'];

  if (typeof worldId !== 'string' || typeof reason !== 'string') {
    throw new LLMResponseValidationError(`Invalid input schema from LLM. toolInput: ${worldInfoToolCallArgs}`);
  }

  const worldInfo = getWorldInfo(worldId);
  if (!worldInfo) {
    throw new ToolInvocationError(`World with ID ${worldId} not found`);
  }

  return { VRChatWorldInfo: worldInfo, reason };
}
