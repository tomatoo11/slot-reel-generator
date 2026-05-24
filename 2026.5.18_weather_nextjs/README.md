# Weather Next.js

Next.js App Router を使った天気アプリです。

## APIキーの設定

`.env` に OpenWeatherMap のAPIキーを設定します。

```env
OPENWEATHER_API_KEY=あなたのAPIキー
```

このキーはバックエンド側の `/api/weather` で使います。ブラウザ側のコードには直接出しません。

## 起動方法

依存関係をインストールします。

```bash
npm install
```

開発サーバーを起動します。

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

この環境で `npm` が見つからない場合は、プロジェクト内に置いた Node.js を使って起動できます。

```powershell
.\start-dev.ps1
```
