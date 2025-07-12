import { GENRE } from 'src/consts/const';

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

// 指定したミリ秒だけ呼び出しを遅延し、最後の呼び出しのみ実行するdebounce関数
export function debounce<T extends unknown[], R>(
  func: (...args: T) => R,
  wait: number,
): (...args: T) => void {
  let timeoutId: NodeJS.Timeout | undefined;

  return (...args: T) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// タグ文字列から各種属性を判定する関数
export function checkTag(tag: string) {
  const lowerTag = tag.toLowerCase();

  // TODO: タグのハードコーディングを避ける
  const isChill = lowerTag === 'author_tag_chill';
  const isHorror = lowerTag === 'author_tag_horror';
  const isGame = ['author_tag_game', 'author_tag_riddle'].includes(lowerTag);
  const isAdmin = lowerTag.startsWith('admin_');

  return {
    isChill,
    isHorror,
    isGame,
    isAdmin,
  };
}

export function parseWorldTagsToGenreIds(worldTags: string[]): number[] {
  const genreIds = [];
  const lowerTags = worldTags.map(tag => tag.toLowerCase());

  if (lowerTags.includes('author_tag_horror')) {
    genreIds.push(GENRE.horror);
  }

  const gameTags = ['author_tag_game', 'author_tag_riddle'];
  if (lowerTags.some(tag => gameTags.includes(tag))) {
    genreIds.push(GENRE.game);
  }

  if (lowerTags.findIndex(tag => tag.startsWith('admin_')) >= 0) {
    genreIds.push(GENRE.high_quality);
  }

  if (lowerTags.includes('author_tag_chill')) {
    genreIds.push(GENRE.chill);
  }

  return genreIds;
}

// 配列をシャッフルする関数
export function shuffleArray<T>(array: T[]): T[] {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
