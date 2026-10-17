# VRChat インスタンス作成・ユーザー招待 実装計画

作成日: 2026-09-06。既存コードと VRChat.community の資料に基づく計画。

実装状況: API境界の型・変換・レスポンス検証、HTTP／Cookie／認証／専用IPC基盤、設定画面のログインUI、インスタンス作成モーダル、自己招待・フレンド選択と招待を実装済み。2026-10-13にユーザーから、追加待機なしで作成後の自動自己招待が届くことを確認済みとの報告あり。各公開範囲での入室・フレンド招待など、実機での完了条件はまだすべて満たしていない。詳細は [API検証記録](vrchat-api-contract-validation.md) を参照。

## 1. 初期リリースの範囲

2026-10-18追記: マイインスタンス一覧・閉鎖に加え、アプリ内フレンドグループの管理・永続化と一括招待を実装。実機でのグループ招待受信・入室は未検証。

- VRChatアカウントでログイン、TOTP／メールコード認証、セッション復元、ログアウト。
- 登録済みワールドの詳細カードからインスタンスを作成。
- 公開範囲は Public、Friends+、Friends、Invite+、Invite。リージョンは日本、米国西部、米国東部、欧州。
- 初期値は Invite+／Japan。リージョンの表示は英語とし、作成者はログイン中のユーザーとする。
- 作成したインスタンスに自分を招待、または選択したフレンドを招待。アプリ内のフレンドグループを選んでまとめて招待することも可能。APIへの送信は一人ずつ行う。
- 「マイインスタンス → フレンドグループ」で名前とメンバーを管理し、アカウントごとにローカル保存する（最大100グループ・各100人）。作成済みモーダルとマイインスタンスの両方からグループを選択できる。これはVRChat上のグループインスタンスとは独立した機能。
- 一括招待はmainで対象メンバーを固定して順次送信する。次の送信まで1秒待機し、送信制限・通信障害時は停止する。画面を閉じても継続し、残りの送信を停止する操作を提供する。再試行は送信済みを除き、結果不明の再送は明示確認を必要とする。送信中の同一インスタンスへの個別招待・閉鎖・リセットを防ぎ、アカウント変更時は残りの送信を破棄する。
- 作成フォームの「作成後に自分を招待する」は初期状態でオン。オフにすると作成のみを行う。作成成功後にmain側で自己招待を続け、モーダルを閉じても処理を継続する。作成失敗・結果不明の場合は招待しない。招待失敗時も作成結果を保持し、自動再送せず既存の招待UIから再送する。
- 自動招待は作成APIの成功応答を検証した直後に一度だけ送信する。追加の待機は設けない。ユーザーによる実機確認で招待の到着を確認済み。
- 「マイインスタンス」タブに、この起動中・ログイン中に作成したインスタンスを表示。同じワールドで複数作成した場合も個別に保持し、各インスタンスから自己招待・フレンド招待を送信できる。
- 作成APIの応答で所有者本人と確認できたインスタンスは、一覧から確認操作を経てVRChat上で閉鎖できる。閉鎖中・閉鎖済み・閉鎖結果不明では招待を停止する。Public等で所有者本人と確認できないものには閉鎖操作を表示しない。閉鎖APIの実機動作は未検証。
- 初期版の招待先は自分とフレンド。グループインスタンス、写真付き招待、招待文編集、任意ユーザー検索、常時WebSocket接続、インスタンス履歴の永続化は後続候補。

招待APIには非フレンドに対する403の例があるため、フレンド選択を基本にする。[Invite User](https://vrchat.community/reference/invite-user)

## 2. 既存コードとの接続

| 現状 | 対応 |
| --- | --- |
| `src/main/vrchat-api.ts` は認証なしのワールドGETとIPC登録を担当 | 共通HTTPクライアントを切り出し、既存の取得処理も利用する |
| `src/main/credential-store.ts` はsafeStorageによる暗号化保存を実装済み | セッション保存を追加。削除、保存先作成、暗号化可否、破損時の扱いを整備 |
| `src/preload.ts` と `src/main/bookmark-ipc.ts` のcredentialStoreは任意キーを読み書きできる | 既存LLMキーのみ許可するホワイトリストをmainで適用。VRChatセッションは専用のmain内部ストアからのみアクセス |
| `src/react-components/common/world-card.tsx` にInviteの保留TODOがある | 共通カードに作成ボタンを追加し、一覧詳細・おすすめなどの利用箇所へ反映 |
| 設定には一般・LLMカテゴリがある | VRChatカテゴリとログイン状態表示を追加 |
| READMEには招待機能を見送った説明がある | 実装時に実際の機能範囲と認証方法に合わせて更新 |

既存READMEの記述は過去の判断として扱う。APIは非公式で仕様変更があり得るため、変更の影響をmainのAPI層に閉じ込める。[資料の位置づけ](https://vrchat.community/)

## 3. 利用APIとデータ変換

APIベースURLは `https://api.vrchat.cloud/api/1`。

| 機能 | HTTP／パス | 補足 |
| --- | --- | --- |
| ログイン・セッション確認 | `GET /auth/user` | 初回Basic認証、以後Cookie再利用 |
| TOTP確認 | `POST /auth/twofactorauth/totp/verify` | `{ code }` |
| メールコード確認 | `POST /auth/twofactorauth/emailotp/verify` | `{ code }` |
| ログアウト | `PUT /logout` | API失敗時もローカルセッションは削除 |
| フレンド一覧 | `GET /auth/user/friends` | `offset`、`n`、`offline`による取得 |
| インスタンス作成 | `POST /instances` | `worldId`、`type`、`region`、`ownerId`など |
| 自分に招待 | `POST /invite/myself/to/{worldId}:{instanceId}` | 作成結果を使用 |
| フレンドに招待 | `POST /invite/{userId}` | `instanceId`、必要に応じて`messageSlot` |

根拠: [認証](https://vrchat.community/reference/get-current-user)、[TOTP](https://vrchat.community/reference/verify2fa)、[メール認証](https://vrchat.community/reference/verify2faemail-code)、[ログアウト](https://vrchat.community/reference/logout)、[フレンド一覧](https://vrchat.community/reference/get-friends)、[作成](https://vrchat.community/reference/create-instance)、[自己招待](https://vrchat.community/reference/invite-myself-to)、[ユーザー招待](https://vrchat.community/reference/invite-user)。

| 画面の公開範囲 | APIのtype | ownerId | canRequestInvite |
| --- | --- | --- | --- |
| Public | `public` | `null` | 省略 |
| Friends+ | `hidden` | 自分のユーザーID | 省略 |
| Friends | `friends` | 自分のユーザーID | 省略 |
| Invite+ | `private` | 自分のユーザーID | `true` |
| Invite | `private` | 自分のユーザーID | `false` |

リージョンは `jp` / `us` / `use` / `eu` に変換する。インスタンスIDやnonceは自作せず、作成レスポンスを保持する。`worldId`、`instanceId`、`location`を別のフィールドで扱い、URL組み立て時に適切にエンコードする。[Instances](https://vrchat.community/instances)、[Create Instance](https://vrchat.community/reference/create-instance)

## 4. 構成案

```text
Reactの設定・ワールドカード・作成／招待ダイアログ
  → 型付きpreload API
  → mainのIPCハンドラ（送信元・引数・ログイン状態の検証）
  → 認証サービス／インスタンス・招待サービス
  → 共通HTTPクライアント＋Cookie管理
  → VRChat API
```

- `src/main/vrchat/client.ts`: fetch、明示的なCookie jar、User-Agent、タイムアウト、レスポンス検証、HTTPエラー変換。fetch単体にCookie保存を任せない。Cookie管理ライブラリは最初の検証で選定する。
- `src/main/vrchat/auth-service.ts`: ログイン、2FA、復元、ログアウトと認証状態遷移。
- `src/main/vrchat/session-store.ts`: Cookieの暗号化保存と削除。既存暗号化処理を再利用するが、汎用IPCには公開しない。
- `src/main/vrchat/instance-service.ts`: 公開範囲変換、作成結果の保持、自己招待・フレンド招待。
- `src/main/vrchat/friends-service.ts`: ページング、短時間キャッシュ、表示名検索。オンライン／オフラインを区別して取得する。
- `src/main/vrchat/ipc.ts`: 明示的な登録関数を作り、`src/main/index.ts`から呼び出す。
- `src/types/vrchat.d.ts` と `src/types/main.d.ts`: 入出力・認証状態・エラー型を追加。IPCの戻り値は成功／失敗を区別できるDTOに統一する。
- `src/contexts/vrchat-auth-provider.tsx`: 公開可能な認証状態のみ共有。
- `src/react-components/settings/vrchat/` と `src/react-components/instance/`: アカウント設定、作成フォーム、作成結果、招待先選択。

preloadは `getAuthState`、`login`、`verifyTwoFactor`、`logout`、`listFriends`、`createInstance`、`inviteSelf`、`inviteUser` を公開する。任意URLへのリクエストやCookie取得機能は公開しない。

## 5. 認証とエラー処理

- 状態は未ログイン、復元中、ログイン中、2FA待ち、ログイン済み、期限切れを区別する。通信失敗を即座に期限切れとみなさない。
- ユーザー名とパスワードは個別にURLエンコードしてBasic認証値を作る。パスワード・2FAコードは保存せず、送信後に入力状態から消す。
- APIが要求した2FA方式に応じて分岐し、成功後に現在ユーザーを再取得して認証完了とする。未対応方式は状態を明示する。
- `auth`や2FA用Cookieはmainで保持し、属性・有効期限・更新・削除を扱う。再起動時は保存済みセッションを検証し、毎回の新規ログインを避ける。[認証仕様](https://vrchat.community/reference/get-current-user)
- 画面へ返すユーザー情報はID・表示名などに限定し、APIのCurrentUser全体や認証ヘッダーを返さない。
- 暗号化不可時は平文保存へフォールバックせず、その起動中のみ利用する。復号失敗時は他の保存済みキーを上書きしない。
- ログアウト・アカウント変更時はCookie、フレンドキャッシュ、作成結果、保留操作をクリアする。古い非同期レスポンスが新しいアカウントの状態を更新しないよう世代を管理する。
- 401は再認証、403は権限・フレンド関係、404は対象消失、429は待機、5xx／通信エラーは一時障害として表示する。
- 429ではRetry-Afterがあれば尊重し、なければ上限付き指数バックオフ。GETのみ限定再試行とし、作成・招待POSTは自動再送しない。タイムアウト時は「結果不明」と表示する。[レート制限](https://vrchat.community/faq)
- UIの二重クリック防止に加えてmainでも重複実行を防ぐ。パスワード、Cookie、privateインスタンスのnonceをログへ出さない。

## 6. 画面と部分失敗の扱い

1. 設定の「VRChat」でログインする。未ログイン時の作成操作からもこの設定へ誘導する。
2. ワールドカードの「インスタンスを作成」で、ワールド名・公開範囲・リージョンを表示する。
3. 作成操作の成功後、対象インスタンスの情報と「自分に招待」「フレンドに招待」を表示する。
4. フレンド選択では表示名検索とオンライン状態を提供する。送信ボタン付近に宛先と対象ワールドを表示する。
5. API成功時は「招待を送信しました」と表示する。相手の受信・参加完了とは区別する。
6. 招待失敗時も作成結果を保持し、招待操作だけを再実行できる。画面遷移で失われないアプリ状態に保持し、再利用時は必要に応じてインスタンスの存在を確認する。

作成成功後の招待失敗でインスタンスを自動再作成しない。作成タイムアウトの場合も勝手に再作成せず、結果不明と再操作の意味を示す。

## 7. 実装順序と完了条件

| 段階 | 内容 | 完了条件 |
| --- | --- | --- |
| 1 | API契約の検証 | ログイン・2FA・作成・自己招待・フレンド招待の実レスポンスと必要項目を確定 |
| 2 | HTTP／Cookie／認証／IPC基盤 | 再起動で復元でき、ログアウトで削除され、汎用IPCからセッションを取得できない |
| 3 | 設定画面と作成導線 | 全公開範囲とリージョンが正しく送信され、重複作成を防止できる |
| 4 | フレンド選択と招待 | 自分・選択フレンドに送信でき、招待だけの再実行ができる |
| 5 | 回帰確認とREADME更新 | 既存のブックマーク・おすすめ・LLM設定が維持され、配布ビルドで動作する |

段階1では特に、招待本文の`instanceId`が完全な`worldId:instanceId`を必要とするか、作成直後・作成者未入室でも招待可能か、各公開範囲での入室可否を確認する。資料の招待レスポンス例は説明と異なる`friendRequest`を示しているため、その例だけを根拠に通知型を固定しない。[Invite User](https://vrchat.community/reference/invite-user)

実アカウント検証は実装段階で本人アカウントとテスト協力者を対象に、意図した作成・送信操作として行う。計画作成中には実行しない。

## 8. 検証計画

- main単体テスト: 2FA分岐、複数Set-Cookie処理、期限切れ、暗号化保存・削除、汎用IPCからのアクセス拒否、公開範囲変換、IDエンコード、429、タイムアウト、重複実行防止。
- Reactテスト: 未ログイン誘導、2FA入力、送信中の操作抑止、宛先表示、作成成功＋招待失敗の状態保持。
- 回帰確認: 既存Jest、`npm run lint`、`npx tsc --noEmit`。既存の失敗があれば変更起因と区別する。
- 配布確認: `npm run package`、Windowsでセッション復元・ログアウトを確認。
- 手動の受け入れ確認: 作成先への自己招待とフレンド招待がVRChat内で開けること、対象ワールド・公開範囲・リージョンが一致すること。

API契約を段階1で整理し、実アカウントでしか確認できない項目は認証基盤の実装後に検証する。その後、作成 → 招待の順で画面に接続する。
