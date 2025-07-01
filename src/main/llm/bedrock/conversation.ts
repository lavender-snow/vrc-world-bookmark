import {
  BedrockRuntime,
  ContentBlock,
  ConverseCommandInput,
  Message,
} from '@aws-sdk/client-bedrock-runtime';

import { GENRE, SORT_ORDERS_ID, VISITS_STATUS } from 'src/consts/const';
import { LLMResponseValidationError, ToolInvocationError  } from 'src/errors/llm-errors';
import { loadKey } from 'src/main/credential-store';
import { getBookmarkList, getWorldInfo, SelectQueryBase } from 'src/main/database';
import { orderableColumns, systemPrompt, tools } from 'src/main/llm/prompt';
import { LLMRecommendResult } from 'src/types/main';

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

async function sendBedrock(client: BedrockRuntime, prompt: Message[]) {
  const params: ConverseCommandInput = {
    modelId: 'apac.anthropic.claude-3-5-sonnet-20241022-v2:0',
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

function extractToolUseContent(message: Message): ContentBlock | undefined {
  if (message.role === 'assistant' && message.content) {
    for (const content of message.content) {
      if (content.toolUse) {
        return content;
      }
    }
  }
  return undefined;
}



export async function getLLMRecommendWorld(userRequest: string): Promise<LLMRecommendResult> {
  const bedrockCredentialsRaw = loadKey('bedrockCredentials');
  const bedrockCredentials = JSON.parse(bedrockCredentialsRaw) as BedrockCredentials;

  const client = new BedrockRuntime({
    region: bedrockCredentials.region,
    credentials: {
      accessKeyId: bedrockCredentials.accessKey,
      secretAccessKey: bedrockCredentials.secretAccessKey,
    },
  });

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

  const firstResult: Message = await sendBedrock(client, prompt);

  const firstToolContent = extractToolUseContent(firstResult);

  console.log('LLM first response:', firstToolContent);

  const name = firstToolContent.toolUse.name;

  if (name !== 'getWorldListRequest') {
    throw new LLMResponseValidationError('Invalid response schema from LLM');
  }

  const input = firstToolContent.toolUse.input;

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new LLMResponseValidationError('Missing required properties in response schema from LLM');
  }

  const genre = input['genre'];
  const orderBy = input['orderBy'];
  const sortOrder = input['sortOrder'];

  if (typeof genre !== 'string' || typeof orderBy !== 'string' || typeof sortOrder !== 'string') {
    throw new LLMResponseValidationError('Invalid input schema from LLM');
  }

  prompt.push(firstResult);

  const selectSql = `
    world.id AS id,
    world.capacity_cached AS capacity,
    world.world_created_at AS createdAt,
    world.description_cached AS description,
    world.favorites_cached AS favorites,
    world.name_cached AS name,
    world.tags_cached AS tags,
    world.world_updated_at_cached AS updatedAt,
    world.visits_cached AS visits,
    bookmark.note
  `.trim();

  const whereClauses: string[] = [];

  // GENREの定義と一致する値があれば数値を返却
  const genreKey = genre;
  const isValidGenreKey = (Object.keys(GENRE) as Array<keyof typeof GENRE>).includes(genreKey as keyof typeof GENRE);
  const genreValue = isValidGenreKey
    ? GENRE[genreKey as keyof typeof GENRE]
    : undefined;

  if (genreValue === undefined) {
    throw new LLMResponseValidationError('Invalid genre value from LLM');
  }

  // 指定されたジャンルのワールドを抽出
  whereClauses.push(`
    world.id IN (
      SELECT world_id
      FROM world_genres
      WHERE genre_id IN (${genreValue})
    )
  `.trim());

  // 訪れたことの無い場所を対象にする
  whereClauses.push(`bookmark.visit_status_id = ${VISITS_STATUS.unvisited}`);

  // 削除されていないワールドが対象
  whereClauses.push('world.deleted_at IS NULL');

  const orderByClauses: string[] = [];

  if (orderableColumns.includes(orderBy) && sortOrder in SORT_ORDERS_ID) {
    orderByClauses.push(`${orderBy} ${sortOrder}`);
  } else {
    throw new LLMResponseValidationError(`Invalid order by param: ${orderBy} ${sortOrder}`);
  }

  const selectQueryBase: SelectQueryBase = {
    select: selectSql,
    where: whereClauses,
    orderBy: orderByClauses,
    pagination: ['LIMIT 10'], // 最大10件取得
  };

  console.log('selectQueryBase:', selectQueryBase);

  const getWorldListRequestResult = getBookmarkList(selectQueryBase) as WorldRecommendationResult[] | undefined;

  if (!Array.isArray(getWorldListRequestResult) || getWorldListRequestResult.length === 0) {
    throw new ToolInvocationError('No world found for the given criteria');
  }

  prompt.push({
    'role': 'user',
    'content': [
      {
        'toolResult': {
          toolUseId: firstToolContent.toolUse.toolUseId,
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

  console.log('LLM prompt after database response:', prompt);

  const secondResult = await sendBedrock(client, prompt);

  console.log('LLM second response:', secondResult);

  const secondToolContent = extractToolUseContent(secondResult);

  console.log('LLM first response:', secondToolContent);

  const name2 = secondToolContent.toolUse.name;

  if (name2 !== 'getWorldInfoRequest') {
    throw new LLMResponseValidationError('Invalid response schema from LLM');
  }

  const input2 = secondToolContent.toolUse.input;

  if (!input2 || typeof input2 !== 'object' || Array.isArray(input2)) {
    throw new LLMResponseValidationError('Missing required properties in response schema from LLM');
  }

  const worldId = input2['worldId'];
  const reason = input2['reason'];

  if (typeof worldId !== 'string' || typeof reason !== 'string') {
    throw new LLMResponseValidationError('Invalid input schema from LLM');
  }
  const worldInfo = getWorldInfo(worldId);

  if (!worldInfo) {
    throw new ToolInvocationError(`World with ID ${worldId} not found`);
  }

  console.log(worldInfo, reason);

  return { VRChatWorldInfo: worldInfo, reason };
};
