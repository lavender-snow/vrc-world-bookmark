# 第1段階: API契約の検証記録

2026-09-06。資料確認とオフライン検証を実施。実API操作は未実施。

## 今回追加したコード

`src/main/vrchat/contracts.ts` に、今後のHTTP・認証サービスから使用する次の処理を追加した。まだアプリのIPCや画面には接続していない。

- `parseAuthResponse`: 現在ユーザーと2FA要求を区別する。ユーザー情報はIDと表示名のみ取り出し、APIのauthToken等は戻り値に含めない。未知の2FA方式は保持する。
- `twoFactorVerifyPath` / `parseTwoFactorVerification`: 方式から送信パスを選び、認証結果を厳密に確認する。
- `buildCreateInstanceRequest`: 5つの公開範囲をAPI値へ変換。ownerIdは認証サービスが渡したユーザーIDから決定し、フォーム由来の追加フィールドは採用しない。
- `parseInstanceReference`: worldIdとlocationの整合を検証し、返されたinstanceIdを保持する。これはmain内部用のデータで、privateインスタンスのnonceを含み得る。
- `buildSelfInvitePath`: 検証済みの参照から自己招待パスを生成する。インスタンスID内のURL区切り文字をエンコードする。
- `parseInviteResponse`: 通知種別と宛先を確認し、成功表示に必要な情報のみ取り出す。

検証エラーにはフィールド名のみを含め、元のレスポンスや秘密情報を埋め込まない。

## 資料で確認できたこと

| 項目 | 確認内容 |
| --- | --- |
| ログイン | `/auth/user`はユーザーまたは`requiresTwoFactorAuth`を返し得る |
| メール認証 | 要求値は`emailOtp`、送信パスは`/auth/twofactorauth/emailotp/verify` |
| TOTP | 要求値は`totp`、送信パスは`/auth/twofactorauth/totp/verify` |
| 2FA完了 | `verified`を確認し、その後に現在ユーザーを再取得する |
| 公開範囲 | Friends+は`hidden`、Invite+は`private`と`canRequestInvite: true` |
| Publicの所有者 | `ownerId: null` |
| 作成結果 | `worldId`、`instanceId`、`location`を区別する |
| 自己招待 | `/invite/myself/to/{worldId}:{instanceId}`を使用する |

根拠: [JavaScript SDK認証サンプル](https://raw.githubusercontent.com/vrchatapi/vrchatapi-javascript/master/example.js)、[TOTP](https://vrchat.community/reference/verify2fa)、[メール認証](https://vrchat.community/reference/verify2faemail-code)、[作成](https://vrchat.community/reference/create-instance)、[インスタンスの説明](https://vrchat.community/instances)、[自己招待](https://vrchat.community/reference/invite-myself-to)。

## 未確定・実機で検証すること

- フレンド招待本文の`instanceId`が完全なlocationを必要とするか。現在は作成結果の`worldId:instanceId`全体を送信する実装としたが、実APIでの受信・入室による確認は未実施。
- 招待資料は本文で`invite`通知を返すと説明する一方、レスポンス例は`friendRequest`になっている。検証コードは説明どおり`invite`を期待するが、実レスポンスで確認する必要がある。[Invite User](https://vrchat.community/reference/invite-user)
- 作成者が未入室の状態での自己招待・フレンド招待と、各公開範囲での入室可否。
- 認証Cookieの実際の属性・期限・更新と、TOTP／メール認証後のセッション復元。

作成・招待POSTのレスポンス検証に失敗した場合、HTTPサービスは「操作結果不明」と扱うこと。サーバーで操作自体は成功している可能性があるため、検証エラーを理由に自動再送しない。

実機検証では、本人が選んだワールドとテスト協力者を用いて、ログイン → 2FA → 作成 → 自己招待 → フレンド招待を確認する。認証情報はチャットやログへ記録しない。保存する検証記録はHTTPステータス、応答フィールド名、通知種別、画面上の入室結果とし、Cookie・nonce等は除く。

## Cookie管理の選定

次段階は既存のfetchに`tough-cookie`を組み合わせる方針とする。Cookieのパース、属性に応じた保存・送出を担わせ、暗号化した永続化はアプリ側で実装する。全APIを扱うSDKの導入は現時点では不要。依存パッケージの追加とElectronビルドの確認は、実際に使用するHTTP基盤の実装時に行う。[tough-cookieの仕様](https://github.com/salesforce/tough-cookie)

## オフライン検証

`src/main/vrchat/contracts.spec.ts` は合成データで以下を検証する。これは実サーバーとの疎通確認ではない。

- 認証レスポンスの秘密情報除外、未知・不正な2FA要求、方式名の変換。
- 認証結果のboolean検証、全公開範囲の変換、非対応入力の拒否、所有者の決定。
- 応答ワールドの取り違え、location不整合、offline等の特殊値、IDのURLエンコード。
- エラーへの秘密情報混入防止、招待通知種別・宛先の検証。

実行: `npx jest --runInBand src/main/vrchat/contracts.spec.ts`

## 第2段階の実装状況

HTTP／Cookie／認証基盤を追加し、mainの起動処理と専用preload APIに接続した。実アカウントでの確認が済むまで、APIの実動作を確認済みとは扱わない。

- `client.ts`: tough-cookieによるCookie管理、固定API送信先、User-Agent、15秒タイムアウト、リダイレクト拒否、GETの限定再試行と429の待機。Basic認証とPOST／PUTは自動再送しない。
- `auth-service.ts`: ログイン、TOTP／メール認証、セッション復元、ログアウト。重複操作を拒否し、ログアウト前の遅延レスポンスは現在の状態へ反映しない。
- `session-store.ts`: `app.getPath('userData')/vrchat-session.dat`へ暗号化保存。保存不可ならその起動中のみ利用し、`persistence: 'memory'`とストレージエラーを返す。既存LLM資格情報ファイルは変更しない。
- `ipc.ts`: アプリのメインウィンドウ・メインフレーム・URLを検証する専用IPC。
- `credential-access.ts`: 既存のLLM設定・一覧初期表示設定のキーだけを許可し、任意キーへのアクセスを拒否する。
- `src/types/vrchat-auth.ts`: 画面側に渡せる認証状態とエラーコード、preload APIの型。

画面から利用するAPIは `window.vrchatAuth.getAuthState()`、`restoreSession()`、`login({ username, password })`、`verifyTwoFactor({ method, code })`、`logout()`。状態取得以外は`AuthResult`を返す。保存だけに失敗したログインは`ok: true`でも`state.error.code: 'storage'`になるため、UIでセッションが保存されていないことを表示する。

起動時に保存済みセッションを復元する。復元中は`restoring`、一時障害・復号失敗は`restoreFailed`、401は`expired`として扱う。`restoreFailed`では保存データを消さず、`restoreSession()`で再試行できる。

## ログインUIの実装状況（2026-09-07）

設定にVRChatカテゴリを追加し、`VRChatSettings`から専用preload APIへ接続した。ユーザー名・パスワード、TOTP／メールコード、ログイン済みの表示名、復元の再試行、ログアウトを操作できる。

パスワードと確認コードは送信時に入力状態から削除する。送信中の重複操作を抑止し、429の待機時間中は認証フォームを無効化する。未対応の2FA方式には中止操作を表示する。起動時の復元中・ログイン中は状態を再取得し、画面の再表示時にもmainの状態を読み直す。

ログインUI追加時は全体テスト178件、TypeScriptチェック、ESLint、rendererのWebpackビルドに成功。実アカウントでのログイン・2FAは未検証。

## インスタンス作成の実装状況（2026-09-07）

- ワールドカードに作成モーダルを追加。Public／Friends+／Friends／Invite+／Inviteと、Japan／US West／US East／Europeを選択できる。既定値はInvite+・Japan。
- 認証済みHTTP通信を経由して`POST /instances`を送信し、レスポンスのワールドID・locationの整合を検証する。
- mainのサービスがワールドごとに作成状態とprivateなインスタンス参照を保持する。画面側には設定値・状態・作成日時のみを渡し、nonceを含むlocationは渡さない。
- `window.vrchatInstances`に`getState`／`create`／`reset`を追加。すべてのハンドラで認証UIと同じ送信元検証を行う。
- 作成中・作成済み・結果不明の間は同じワールドへのPOSTを再送しない。別のインスタンスを作る場合は明示的に入力画面へ戻す。結果不明の場合は重複の可能性を確認するチェックを必要とする。
- パネルを閉じても作成はmainで完了し、開き直すと保持した結果を再表示する。状態の定期確認はmainのメモリだけを読み、VRChat APIへのポーリングはしない。
- ログアウト／アカウント変更時に保持状態を無効化し、以前のセッションの遅延レスポンスやCookieを新しいセッションへ反映しない。

`reset`はアプリ内の作成結果を忘れる操作であり、VRChat上のインスタンスを閉じる操作ではない。作成状態はアプリ再起動をまたいで永続化しない。実APIでの作成・入室は未検証。

## 自己招待・フレンド招待の実装状況（2026-09-07）

- 作成済みモーダルから自分、または選択したフレンドへ招待を送信する専用IPCを接続。mainで保持したインスタンス参照を使用し、画面へlocation・nonceは渡さない。
- フレンド一覧はオンライン／オフライン別に100件ずつ取得し、30秒キャッシュする。名前検索は表示中のページを対象とする。アカウント変更でキャッシュを破棄する。
- 招待POSTは自動再送しない。宛先別に送信中・送信済み・失敗・結果不明を保持し、結果不明の再送は画面の確認チェックを必要とする。
- 招待が失敗してもインスタンスを再作成しない。送信中の重複操作と作成結果のリセットをmainでも抑止する。
- 全体テスト209件、TypeScriptチェック、ESLint、main／rendererのWebpackビルドに成功。配布パッケージと実APIでの招待受信・入室は未検証。

資料: [フレンド一覧](https://vrchat.community/reference/get-friends)、[自己招待](https://vrchat.community/reference/invite-myself-to)、[フレンド招待](https://vrchat.community/reference/invite-user)。

## 作成時の自動自己招待の確認（2026-10-13）

- 作成フォームに「作成後に自分を招待する」を追加（既定でオン）。作成APIの成功応答を検証した後、保持した参照へ一度だけ自己招待を送信する。
- ユーザーから、追加の2秒待機を外した版でも自動自己招待が届くとの報告あり。変更が反映されていない状態で試していた可能性があるが、原因は確定していない。
- 全219テスト、TypeScriptチェック、ESLintに成功。作成完了前の招待防止、重複送信防止、招待失敗時の作成結果保持、セッション変更時の結果破棄を検証。
- 各公開範囲・リージョンでの入室、フレンド招待、セッション復元等の実機検証は別途必要。上記はユーザーによる招待到着の確認であり、実レスポンスの採取は行っていない。

## マイインスタンス・閉鎖の実装（2026-10-13）

- マイインスタンスタブを追加。ワールド名・作成日時・公開範囲・リージョンと招待操作を表示する。同じワールドを再作成しても以前の記録を保持する。
- アプリ内の不透明な識別子で対象を指定し、main側に保持したlocationを使って招待・閉鎖する。rendererへprivateなlocationやnonceは渡さない。ログアウト・セッション変更・アプリ終了で記録はクリアされ、再起動をまたぐ永続化は行わない。
- 所有権は作成応答の`ownerId`と認証済みユーザーIDの一致で確認。閉鎖は`DELETE /instances/{worldId}:{instanceId}`を使用し、`hardClose`・`closedAt`の指定は行わない。資料では所有者本人または権限のあるグループ所有者が実行でき、`closedAt`を省略すると直ちに新規参加を停止する。[Close Instance](https://raw.githubusercontent.com/vrchatapi/specification/master/openapi/components/paths/instances.yaml)
- 閉鎖応答のインスタンス参照・`closedAt`を検証する。通信失敗や不正な応答は結果不明として保持し、自動再送しない。結果不明で再実行する際はUIで確認を求める。閉鎖中は招待・リセット・重複閉鎖を抑止する。
- 全243テスト、TypeScriptチェック、ESLintに成功。同じワールドの複数記録の分離、所有権の確認、重複閉鎖防止、結果不明の再実行制御、セッション変更時の結果破棄を検証。閉鎖APIでの実機動作・入室停止は未検証。

## フレンドグループ・一括招待の実装（2026-10-18）

- 「マイインスタンス → フレンドグループ」でグループ名・複数メンバーの作成、編集、削除を追加。フレンドのページ送り・オンライン／オフライン切替をまたいで選択を保持する。最大100グループ、各100人。
- `userData/friend-groups/{userId}.json`へアカウント別に保存。メンバーID・表示名とグループ名のみを保持し、認証情報・locationは保存しない。新規メンバーはmainが取得済みのフレンドに限定する。再起動後は保存済みメンバーを利用でき、フレンド関係の変化等による招待拒否は個別の失敗として表示する。
- 一時ファイルからの置き換えで保存し、破損した保存データは上書きしない。保存失敗を画面に返し、アカウントが変わった古い画面からの保存・削除を拒否する。専用IPCは他のVRChat操作と同じ送信元検証を適用。
- 作成済みモーダルとマイインスタンスから一括招待を開始する。mainでインスタンス識別子とメンバーを固定し、既存のフレンド招待APIへ1人ずつ送信。次の送信まで1秒待機し、グループ送信は同時に1件までとする。画面を閉じても処理を続け、再表示すると進捗を取得できる。
- 成功済みの宛先はグループ再試行から除外する。結果不明は確認チェックがある場合だけ再送する。送信制限・通信障害等では残りを停止し、権限拒否等の個別失敗では次のメンバーへ進む。停止操作は進行中の1件の完了を待って残りを止める。ログアウト・セッション変更では残りを破棄する。
- 送信中は同じインスタンスへの個別招待・閉鎖・リセットを抑止する。同じワールドの別インスタンスと結果を混同せず、メンバーごとの結果を保持する。
- 全266テスト、`npx tsc --noEmit`、`npm run lint -- --ignore-pattern 'work/**'`、rendererのWebpackビルドに成功。通常のlintは既存の`work/`内の生成済みJSを検査して失敗するため除外した。Webpackはバンドルサイズの警告あり。
- グループ一括招待の実API送信・受信・入室、配布版でのグループ再読み込みは未検証。自動テストでは永続化、保存失敗時の保全、アカウント分離、途中停止、部分失敗の再試行、重複防止、結果不明の明示再送、画面の選択保持を検証した。
