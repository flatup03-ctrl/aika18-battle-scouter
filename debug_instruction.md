# 開発コンテキストとデバッグ依頼書 (v2.9.8)

## 1. 概要
LINE公式アカウントと連携したNext.jsアプリ（Renderデプロイ）において、Google Gemini APIを用いた動画解析機能の実装中に発生している「2つの重大なエラー」の解決を依頼します。

## 2. システム構成
- **Frontend/Backend**: Next.js (App Router) / Node.js
- **Infrastructure**: Render
- **AI Engine**: Google Gemini 1.5 Pro (v2.9.8)
- **API Client**: `@google/generative-ai` (Node.js SDK)
- **Method**: File API (アップロード方式)
- **Orchestration**: Dify (BackendからAPI経由で利用)

## 3. これまでの経緯
1. **v2.9.5 (Inline方式)**: 動画データを直接送信。データ容量オーバーで404エラー。
2. **v2.9.6 (File API導入)**: 動画を一度Geminiサーバーにアップロードする方式に変更。アップロード自体は成功するように改善。
3. **v2.9.7 (Flashモデル)**: `gemini-1.5-flash` を使用したが、Dify側で認識されず404エラー。
4. **v2.9.8 (Proモデル/現在)**: 安定性を求めて `gemini-1.5-pro` に変更。しかし、以下の複合エラーが発生中。

## 4. 現在発生している2つのエラー

### エラーA：Google側での動画処理失敗 (`FAILED`)
アプリからGoogleへのアップロードは成功している（URI発行済み）が、その後のGoogle内部処理で `FAILED` となる。
```text
[Gemini FileAPI] Uploaded ... URI: https://generativelanguage.googleapis.com/...
[Gemini FileAPI] Processing...
Gemini ビデオ分析エラー: エラー: ファイル処理に失敗しました: 失敗
```
*   **推測原因**: 送信した動画ファイル（iPhone撮影のMOV/HEVC/HDR等）が、Geminiの対応コーデックと相性が悪い。
*   **求められる解決策**: コードまたは運用での回避策提示。

### エラーB：Dify側でのモデル認識エラー (`404 NOT_FOUND`)
Geminiの解析結果（または失敗通知）をDifyに送った際、Dify側でエラーが出る。
```text
Dify API Error: 400 ... models/gemini-1.5-pro is not found ...
```
*   **推測原因**: Difyの現在のインフラ設定が、`gemini-1.5-pro` (v1beta) に対応していない。
*   **求められる解決策**: Difyの設定変更、またはAPI側でのフォールバック処理強化。

## 5. 依頼内容（ゴール）
上記の状況を踏まえ、以下のいずれかのアプローチでシステムを完全稼働させてください。

1.  **コード修正案**: 動画処理の成功率を上げるための追加実装（MIMEタイプ強制指定などがあれば）。
2.  **運用回避策**: 明確な「ユーザーが守るべき動画形式のルール」や「Difyの推奨設定」の定義。

**最優先事項**: ユーザー（LINE利用者）に対して、エラーを見せず、何らかの応答（解析結果または親切なエラーメッセージ）を確実に返すこと。
