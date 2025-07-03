import {
  BedrockRuntime,
  ContentBlock,
  ConverseCommandInput,
  Message,
  Tool,
} from '@aws-sdk/client-bedrock-runtime';

import { LLMApiError } from 'src/errors/llm-errors';
import { loadKey } from 'src/main/credential-store';
import { orderableColumns, worldGenres } from 'src/main/llm/prompt';

const tools: Tool[] = [
  {
    toolSpec: {
      name: 'getWorldListRequest',
      description: '指定した条件でワールドのリストを最大10件取得します。',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            genre: {
              type: 'string',
              description: `取得するワールドのジャンルを${JSON.stringify(worldGenres)}から選択します。`,
            },
            orderBy: {
              type: 'string',
              description: `取得するワールドをどの項目を基準に並べるか指定します。${JSON.stringify(orderableColumns)}から選択します。`,
            },
            sortOrder: {
              type: 'string',
              description: '取得するワールドの並び順を指定します。["asc", "desc"]から選択します。',
            },
          },
          required: ['genre', 'orderBy', 'sortOrder'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'getWorldInfoRequest',
      description: '指定したワールドIDの詳細情報を取得します。',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            worldId: {
              type: 'string',
              description: '取得するワールドのUUID形式のID',
            },
            reason: {
              type: 'string',
              description: 'ワールドを選定した理由を簡潔にまとめてください。',
            },
          },
          required: ['worldId', 'reason'],
        },
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
