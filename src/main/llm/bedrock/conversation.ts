import {
  ContentBlock,
  Message,
} from '@aws-sdk/client-bedrock-runtime';

import { createBedrockClient, extractToolUseContent, sendBedrock } from './bedrock-client';

import { LLMResponseValidationError, ToolInvocationError  } from 'src/errors/llm-errors';
import { getBookmarkList, getWorldInfo } from 'src/main/database';
import { systemPrompt } from 'src/main/llm/prompt';
import { buildWorldListQuery } from 'src/main/llm/recommendation-service';
import { RecommendResult } from 'src/types/main';

interface WorldRecommendationResult {
  id: string;
  name: string;
  description: string;
  capacity: number;
  favorites: number;
  tags: string[];
  updatedAt: string;
  visits: number;
  note: string;
}

function buildRecommendWorldPrompt(userRequest: string) {
  const userMessage = userRequest.length > 0 ? `以下の条件を加味してください「${userRequest.trim()}」` : '';

  const prompt: Message[] = [{
    'role': 'user',
    'content': [{
      'text': systemPrompt,
    }],
  },
  {
    'role': 'user',
    'content': [{
      'text': `おすすめワールドを提案してください。${userMessage}`,
    }],
  }];

  return prompt;
}

function extractAndValidateToolInput(toolCall: ContentBlock, expectedName: string) {
  if (!toolCall || toolCall.toolUse.name !== expectedName) {
    throw new LLMResponseValidationError(`Invalid response schema from LLM. response: ${JSON.stringify(toolCall)}`);
  }
  const input = toolCall.toolUse.input;
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new LLMResponseValidationError(`Missing required properties in response schema from LLM. toolInput: ${JSON.stringify(input)}`);
  }
  return input;
}

export async function getLLMRecommendWorld(userRequest: string): Promise<RecommendResult> {
  const client = createBedrockClient();

  const prompt = buildRecommendWorldPrompt(userRequest);

  // ワールドリストを取得するためのツールコールを送信
  const toolWorldListResponse: Message = await sendBedrock(client, prompt);
  const worldListToolCall = extractToolUseContent(toolWorldListResponse);
  const worldListToolCallInput = extractAndValidateToolInput(worldListToolCall, 'getWorldListRequest');

  const genre = worldListToolCallInput['genre'];
  const orderBy = worldListToolCallInput['orderBy'];
  const sortOrder = worldListToolCallInput['sortOrder'];

  if (typeof genre !== 'string' || typeof orderBy !== 'string' || typeof sortOrder !== 'string') {
    throw new LLMResponseValidationError(`Invalid input schema from LLM. toolInput: ${worldListToolCallInput}`);
  }

  prompt.push(toolWorldListResponse);

  const selectQueryBase = buildWorldListQuery(genre, orderBy, sortOrder);
  const getWorldListRequestResult = getBookmarkList(selectQueryBase) as WorldRecommendationResult[] | undefined;

  if (!Array.isArray(getWorldListRequestResult) || getWorldListRequestResult.length === 0) {
    throw new ToolInvocationError(`No world found for the given criteria. sql: ${selectQueryBase}`);
  }

  prompt.push({
    'role': 'user',
    'content': [
      {
        'toolResult': {
          toolUseId: worldListToolCall.toolUse.toolUseId,
          content: getWorldListRequestResult.map(world => ({
            json: {
              id: world.id,
              name: world.name,
              description: world.description,
              capacity: world.capacity,
              favorites: world.favorites,
              tags: world.tags,
              updatedAt: world.updatedAt,
              visits: world.visits,
              note: world.note,
            },
          })),
          status: 'success',
        },
      },
    ],
  });

  // おすすめワールドを取得するためのツールコールを送信
  const toolWorldInfoResponse = await sendBedrock(client, prompt);
  const worldInfoToolCall = extractToolUseContent(toolWorldInfoResponse);
  const worldInfoToolCallInput = extractAndValidateToolInput(worldInfoToolCall, 'getWorldInfoRequest');

  if (!worldInfoToolCallInput || typeof worldInfoToolCallInput !== 'object' || Array.isArray(worldInfoToolCallInput)) {
    throw new LLMResponseValidationError(`Missing required properties in response schema from LLM. toolInput: ${worldInfoToolCallInput}`);
  }

  const worldId = worldInfoToolCallInput['worldId'];
  const reason = worldInfoToolCallInput['reason'];

  if (typeof worldId !== 'string' || typeof reason !== 'string') {
    throw new LLMResponseValidationError('Invalid input schema from LLM. toolInput: ${worldInfoToolCallInput}');
  }

  const worldInfo = getWorldInfo(worldId);
  if (!worldInfo) {
    throw new ToolInvocationError(`World with ID ${worldId} not found`);
  }

  return { VRChatWorldInfo: worldInfo, reason };
};
