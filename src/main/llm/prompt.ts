const dataSchema = {
  worldList: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ワールドのUUID形式のID' },
        capacity: { type: 'integer', description: 'ワールドの収容人数' },
        createdAt: { type: 'string', format: 'date-time', description: 'ワールドの作成日時' },
        description: { type: 'string', description: 'ワールドの説明' },
        favorites: { type: 'integer', description: 'ワールドのお気に入り数' },
        name: { type: 'string', description: 'ワールド名' },
        tags: { type: 'array', items: { type: 'string' }, description: 'ワールドタグ' },
        updatedAt: { type: 'string', format: 'date-time', description: 'ワールドの更新日時' },
        visits: { type: 'integer', description: 'ワールドの総訪問数' },
        note: { type: 'string', description: 'ユーザーが書いたワールドのメモ' },
      },
    },
  },
};

export interface GetWorldListRequest {
  name: string;
  description: string;
  inputSchema: {
    json: {
      type: string;
      properties: {
        genre: {
          type: string;
          description: string;
        };
        orderby: {
          type: string;
          description: string;
        };
      };
      required: string[];
    };
  };
};

export const worldGenres = ['chill', 'high_quality', 'game', 'horror', 'photo_spot'];
export const orderableColumns = ['favorites_cached', 'popularity_cached', 'heat_cached', 'visits_cached', 'world_updated_at_cached'];

export const getWorldListRequest ={
  name: 'getWorldListRequest',
  description: '指定した条件でワールドのリストを最大10件取得します。',
  parameters: { type: 'object',
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
};

export const getWorldInfoRequest = {
  name: 'getWorldInfoRequest',
  description: '指定したワールドIDの詳細情報を取得します。',
  parameters: {
    type: 'object',
    properties: {
      worldId: {
        type: 'string',
        description: '取得するワールドのUUID形式のID',
      },
      reason: {
        type: 'string',
        description: 'ワールドがおすすめできる理由を日本語で簡潔にまとめてください。予測であることを明記してください。',
      },
    },
    required: ['worldId', 'reason'],
  },
};

export const systemPrompt = `あなたはVRChatのおすすめワールドを提案するためのAIです。

ユーザーからのリクエストに対してツールを活用しながらおすすめワールドを提案します。
条件を指定された場合はそれを加味しながらワールド情報を取得します。

それに対し getWorldListRequest ツールを使用してワールド情報を最大10件取得します。

データベースからのワールド情報レスポンスは以下の形式で行われます。
${JSON.stringify(dataSchema)}

この結果を基にユーザーに対して最もオススメのワールドを選び、 getWorldInfoRequest ツールを使用して詳細情報を取得してください。
選定の際には特にdescriptionやtagsなど数値評価することが難しい値を考慮してください。
ワールド一覧に適合するものが無い場合はツールの再実行をせず、別のおすすめを提案してください。
`;
