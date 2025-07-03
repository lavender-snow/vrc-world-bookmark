import {
  BedrockRuntime,
  ContentBlock,
  ConverseCommandInput,
  Message,
} from '@aws-sdk/client-bedrock-runtime';

import { loadKey } from 'src/main/credential-store';
import { tools } from 'src/main/llm/prompt';

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

export async function sendBedrock(client: BedrockRuntime, prompt: Message[]) {
  const params: ConverseCommandInput = {
    modelId,
    messages: prompt,
    toolConfig:{
      'tools': tools,
    },
  };

  let resultMessage: Message;
  try {
    await client.converse(params)
      .then((data) => {
        resultMessage = data.output.message;
      })
      .catch((error) => {
        console.log(error);
        throw new Error(error);
      });
  } catch (e) {
    console.log(e);
    throw new Error(e);
  }

  return resultMessage;
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
