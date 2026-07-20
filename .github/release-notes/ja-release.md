# Self-hosted LiveSync 日本語化フォーク

Self-hosted LiveSync 0.25.79 をベースにした日本語化フォークです。

この Release は、上流 0.25.79 への追従と日本語化フォーク側の翻訳を含む更新版です。

## 主な内容

- 上流 Self-hosted LiveSync 0.25.79 の変更を取り込み
- 高速同期（Fast Fetch）で一時的なストリーム切断が起きた際、最初からではなく最新チェックポイントから再開する機能の追加の取り込み
- アプリの一時中断などの同期リトライ時に、Simple Fetch がユーザーへの事前質問の選択内容を保持するよう改善された件の取り込み
- ローカルデータベースのメンテナンスコマンド実行前に、必要なチャンク設定を事前に適用できるようにする機能の取り込み
- 変更履歴タブ用の `updates_ja.md` を 0.25.79 まで更新
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
