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
