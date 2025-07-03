import {
  BedrockRuntime,
  ContentBlock,
  ConverseCommandInput,
  Message,
  Tool,
} from '@aws-sdk/client-bedrock-runtime';

import { LLMApiError } from 'src/errors/llm-errors';
import { loadKey } from 'src/main/credential-store';
import { getWorldInfoRequest, getWorldListRequest } from 'src/main/llm/prompt';

const tools: Tool[] = [
  {
    toolSpec: {
      name: getWorldListRequest.name,
      description: getWorldListRequest.description,
      inputSchema: {
        json: getWorldListRequest.parameters,
      },
    },
  },
  {
    toolSpec: {
      name: getWorldInfoRequest.name,
      description: getWorldInfoRequest.description,
      inputSchema: {
        json: getWorldInfoRequest.parameters,
      },
    },
  },
];

const modelId = 'apac.anthropic.claude-3-5-sonnet-20241022-v2:0';

export function createBedrockClient(): BedrockRuntime {
  const bedrockCredentialsRaw = loadKey('bedrockCredentials');
  const bedrockCredentials = JSON.parse(bedrockCredentialsRaw) as BedrockCredentials;

  const client = new BedrockRuntime({
    region: bedrockCredentials.region,
    credentials: {
      accessKeyId: bedrockCredentials.accessKey,
      secretAccessKey: bedrockCredentials.secretAccessKey,
    },
  });

  return client;
}

export async function sendBedrock(client: BedrockRuntime, messages: Message[]) {
  const params: ConverseCommandInput = {
    modelId,
    messages,
    toolConfig:{
      'tools': tools,
    },
  };


  try {
    const data = await client.converse(params);
    const resultMessage = data.output.message;

    return resultMessage;
  } catch (e) {
    console.log(e);
    throw new LLMApiError(e);
  }
}

export function extractToolUseContent(message: Message): ContentBlock | undefined {
  if (message.role === 'assistant' && message.content) {
    for (const content of message.content) {
      if (content.toolUse) {
        return content;
      }
    }
  }
  return undefined;
}
