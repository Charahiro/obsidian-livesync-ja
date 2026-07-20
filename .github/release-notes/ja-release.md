# Self-hosted LiveSync 日本語化フォーク

Self-hosted LiveSync 0.25.74 をベースにした日本語化フォークです。

この Release は、上流 0.25.74 への追従と日本語化フォーク側の翻訳を含む更新版です。

## 主な内容

- 上流 Self-hosted LiveSync 0.25.74 の変更を取り込み
- 非表示ファイル同期を無効化した際の設定挙動の修正の取り込み
- 競合リビジョンのいずれかが削除されている際、自動マージによるゾンビファイルを防ぐ修正の取り込み
- CLIにおける `--vault` (-V) オプションの追加（データベースディレクトリと実際のVaultディレクトリを分離可能に）および管理コマンドの追加などの取り込み
- 変更履歴タブ用の `updates_ja.md` を 0.25.74 まで更新
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
