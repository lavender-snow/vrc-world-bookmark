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
