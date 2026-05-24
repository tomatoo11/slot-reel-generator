"use client";

import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { FormEvent, useEffect, useState } from "react";
import { db } from "@/lib/firebase";

type Post = {
  id: string;
  name: string;
  message: string;
  createdAt: Timestamp | null;
};

function formatDate(timestamp: Timestamp | null) {
  if (!timestamp) {
    return "投稿中";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp.toDate());
}

export default function Home() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const nextPosts = snapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            name: typeof data.name === "string" ? data.name : "名無し",
            message: typeof data.message === "string" ? data.message : "",
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
          };
        });

        setPosts(nextPosts);
        setError("");
      },
      () => {
        setError("投稿の読み込みに失敗しました。Firestoreの設定を確認してください。");
      },
    );

    return () => unsubscribe();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim() || "名無し";
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setError("投稿内容を入力してください。");
      return;
    }

    setIsPosting(true);
    setError("");

    try {
      await addDoc(collection(db, "posts"), {
        name: trimmedName,
        message: trimmedMessage,
        createdAt: serverTimestamp(),
      });

      setMessage("");
    } catch {
      setError("投稿に失敗しました。Firestoreの設定を確認してください。");
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <main className="page">
      <section className="sns-shell" aria-labelledby="page-title">
        <header className="header">
          <p className="eyebrow">Micro SNS</p>
          <h1 id="page-title">ひとこと投稿</h1>
        </header>

        <form className="post-form" onSubmit={handleSubmit}>
          <label htmlFor="name">名前</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="名無しでも投稿できます"
            maxLength={24}
          />

          <label htmlFor="message">投稿内容</label>
          <textarea
            id="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="いま思っていることを書いてください"
            maxLength={140}
            rows={4}
          />

          <div className="form-footer">
            <span>{message.length}/140</span>
            <button type="submit" disabled={isPosting}>
              {isPosting ? "投稿中..." : "投稿する"}
            </button>
          </div>
        </form>

        {error ? <p className="message error">{error}</p> : null}

        <section className="timeline" aria-label="投稿一覧">
          {posts.length === 0 ? (
            <p className="empty">まだ投稿はありません。</p>
          ) : (
            posts.map((post) => (
              <article className="post" key={post.id}>
                <div className="post-meta">
                  <strong>{post.name}</strong>
                  <time>{formatDate(post.createdAt)}</time>
                </div>
                <p>{post.message}</p>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}
