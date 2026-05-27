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

## Googleログイン設定

Firebase Console で Authentication を開き、Sign-in method から Google を有効にします。

## Firestoreルール

Googleログインした人だけ投稿できるようにするには、Firebase Console の Firestore ルールを設定します。

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.message is string
        && request.resource.data.name is string
        && request.resource.data.photoURL is string;
      allow update: if false;
      allow delete: if request.auth != null
        && resource.data.uid == request.auth.uid;
    }
  }
}
```

この設定では、誰でも投稿を閲覧できます。投稿できるのはGoogleログイン済みのユーザーだけです。削除できるのは、その投稿を書いた本人だけです。投稿の編集はできません。

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開きます。
