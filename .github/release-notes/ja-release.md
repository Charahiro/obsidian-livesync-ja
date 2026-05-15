# Self-hosted LiveSync 日本語化フォーク

Self-hosted LiveSync 0.25.62 をベースにした日本語化フォークです。

この Release は、上流 0.25.62 への追従と日本語化フォーク側の翻訳を含む更新版です。

## 主な内容

- 上流 Self-hosted LiveSync 0.25.62 の変更を取り込み
- commonlib の更新を取り込み
  - salt 更新時のデータベースセットアップ修正
  - コード整形変更
- `manifest.json`、`package.json`、`package-lock.json` を 0.25.62 に更新
- 上流の `updates.md` 更新を取り込み
- 上流の `version-bump.mjs` を追加
- BRAT 向けに Release へ必要な成果物を添付

## インストール

Obsidian BRAT でこのリポジトリを追加し、この Release を使用してください。

## 含まれるファイル

- `manifest.json`
- `main.js`
- `styles.css`
- zip パッケージ

## 注意

このフォークは上流の Self-hosted LiveSync を日本語化したものです。
上流の MIT License と著作権表示を維持しています。
