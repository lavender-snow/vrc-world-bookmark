import { Message } from 'openai/resources/beta/threads/messages';
import { createOpenAIClient } from './openai-client';

import { RecommendResult } from 'src/types/main';

function buildRecommendWorldPrompt(userRequest: string) {
  const userMessage = userRequest.length > 0 ? `以下の条件を加味してください「${userRequest.trim()}」` : '';

  const prompt: Message[] = [
  {
    'role': 'user',
    'content': [{
      type: 'text',
      text: { value: `おすすめワールドを提案してください。${userMessage}`},
    }],
  }];

  return prompt;
}

export async function getLLMRecommendWorld(userRequest: string): Promise<RecommendResult> {
  const client = createOpenAIClient();

  const prompt =
  throw new Error('No tool use content found in the response');
}
