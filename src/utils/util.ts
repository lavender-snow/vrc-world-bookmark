// VRChatのワールドURLかワールドIDかを判定したうえでワールドIDを返す関数
// URLの例
// wrld_xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
// https://vrchat.com/home/world/wrld_xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/info
// https://vrchat.com/home/launch?worldId=wrld_xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx&instanceId=00000~private(usr_xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)~canRequestInvite~region(jp)~nonce(xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
export function getWorldId(urlOrId: string): string | null {
  // wrld_xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx形式の文字列を抽出
  const regex = /wrld_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

  const match = urlOrId.match(regex);
  if (match) {
    return match[0];
  } else {
    return null;
  }
}

// クリップボードにテキストをコピーする関数
export function writeClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

// Sass側で定義した時間変数をミリ秒に変換する関数
export function parseSassTime(value: string): number {
  try {
    if (!value || typeof value !== 'string') {
      throw new Error('Input must be a non-empty string');
    }
    
    if (value.endsWith('ms')) return parseFloat(value);
    if (value.endsWith('s')) return parseFloat(value) * 1000;
    
    const parsed = Number(value);
    if (isNaN(parsed)) {
      throw new Error(`Could not parse value: ${value}`);
    }
    
    return parsed;
  } catch (error) {
    console.error(`Error parsing Sass time: ${error instanceof Error ? error.message : error}`);
    return 0;
  }
}
