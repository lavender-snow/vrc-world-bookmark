# VRChat World Bookmark

VRChatのワールド探索に活用するためのブックマークアプリです。

# 主な機能

- ワールド情報の登録
  - 自由入力の可能なメモ、タグ付け、訪問状況
- 登録したワールド情報から条件を指定した抽出

データはPC上の`%APPDATA%\vrc-world-bookmark`配下に保存されます。

# 使い方

1. [Release](https://github.com/lavender-snow/vrc-world-bookmark/releases)から最新バージョンのzipファイルをダウンロードし、展開します。
2. vrc-world-bookmark.exeを起動します。
3. ワールド情報登録にVRChatのワールドURLまたはワールドIDを貼り付け、`ワールド情報登録`ボタンを押下します。
4. 情報が登録され、ワールド一覧で管理されるようになります。

## 注意事項

本アプリはデジタル署名を行っていません。

そのため、Windowsなどで実行時に「発行元不明」等の警告が表示されますが仕様です。
気になる方はソースコードをご確認のうえ、ご利用ください。

ビルド手順についても以下に明記しております。

# 開発環境構築クイックスタートガイド

Electron + React + SQLiteで構築されています。

## 前提条件

以下のツールを導入します。
- nodejs
  - v22.14.0

## プロジェクトクローン&依存モジュールインストール

```
git clone git@github.com:lavender-snow/vrc-world-bookmark.git
cd vrc-world-bookmark
```

## 実行

```
npm run dev
```

## exeファイル作成

electron-forgeを使用しパッケージ化します

```
npm run package
```

## zipファイル作成

electron-forgeを使用しzipファイルを直接作成します

```
npm run make
```

# ライセンス

本ソフトウェアは [GNU Affero General Public License v3.0 (AGPL-3.0)](https://www.gnu.org/licenses/agpl-3.0.html) のもとで公開されています。
