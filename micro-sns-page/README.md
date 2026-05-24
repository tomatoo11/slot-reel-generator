# Micro SNS Page

Next.js App Router を使ったプロジェクトです。

## Firebase設定

`.env.local.example` を参考にして、`.env.local` にFirebaseの設定値を入れます。

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Firestoreは `src/lib/firebase.ts` から `db` として使えます。

## Firestoreルール

ログイン不要で投稿できるようにするには、Firebase Console の Firestore ルールを設定します。

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false;
    }
  }
}
```

この設定では、誰でも投稿の閲覧と新規投稿ができます。投稿の編集と削除はできません。

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開きます。
