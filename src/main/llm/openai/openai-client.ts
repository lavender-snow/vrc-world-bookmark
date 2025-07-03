import { OpenAI } from 'openai';
import { ResponseInput } from 'openai/resources/responses/responses';

import { LLMApiError } from 'src/errors/llm-errors';
import { loadKey } from 'src/main/credential-store';
import { systemPrompt, getWorldInfoRequest, getWorldListRequest } from 'src/main/llm/prompt';

const tools: OpenAI.Responses.Tool[] = [
  {
    type: 'function',
    name: getWorldListRequest.name,
    description: getWorldListRequest.description,
    parameters: { ...getWorldListRequest.parameters, additionalProperties: false },
    strict: true,
  },
  {
    type: 'function',
    name: getWorldInfoRequest.name,
    description: getWorldInfoRequest.description,
    parameters: { ...getWorldInfoRequest.parameters, additionalProperties: false },
    strict: true,
  },
];

export function createOpenAIClient() {
  const openAIApiKey = loadKey('openaiApiKey');

  const client = new OpenAI({ apiKey: openAIApiKey });

  return client;
}

const modelId = 'gpt-4o';

export async function sendOpenAI(openai: OpenAI, messages: ResponseInput) {
  const params: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
    model: modelId,
    instructions: systemPrompt,
    input: messages,
    tools,
    previous_response_id: undefined,
  };

  try {
    const response = await openai.responses.create(params);

    return response;
  } catch (e) {
    console.log(e);
    throw new LLMApiError(e);
  }
}
