"use client";

import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { FormEvent, useEffect, useState } from "react";
import { auth, db, googleProvider } from "@/lib/firebase";

type Post = {
  id: string;
  uid: string;
  name: string;
  photoURL: string;
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

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return `${fallbackMessage}（${error.code}）`;
  }

  return fallbackMessage;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    getRedirectResult(auth).catch((redirectError) => {
      setError(
        getErrorMessage(
          redirectError,
          "Googleログインの完了確認に失敗しました。Firebase Authenticationの設定を確認してください。",
        ),
      );
    });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const nextPosts = snapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            uid: typeof data.uid === "string" ? data.uid : "",
            name: typeof data.name === "string" ? data.name : "名前なし",
            photoURL: typeof data.photoURL === "string" ? data.photoURL : "",
            message: typeof data.message === "string" ? data.message : "",
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
          };
        });

        setPosts(nextPosts);
        setError("");
      },
      (snapshotError) => {
        setError(
          getErrorMessage(
            snapshotError,
            "投稿の読み込みに失敗しました。Firestoreのルールを確認してください。",
          ),
        );
      },
    );

    return () => unsubscribe();
  }, []);

  async function handleLogin() {
    setError("");

    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectError) {
        setError(
          getErrorMessage(
            redirectError,
            "Googleログインに失敗しました。Firebase Authenticationの設定を確認してください。",
          ),
        );
      }
    }
  }

  async function handleLogout() {
    setError("");

    try {
      await signOut(auth);
    } catch (logoutError) {
      setError(getErrorMessage(logoutError, "ログアウトに失敗しました。もう一度試してください。"));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setError("投稿するにはGoogleログインが必要です。");
      return;
    }

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setError("投稿内容を入力してください。");
      return;
    }

    setIsPosting(true);
    setError("");

    try {
      await addDoc(collection(db, "posts"), {
        uid: user.uid,
        name: user.displayName ?? "名前なし",
        photoURL: user.photoURL ?? "",
        message: trimmedMessage,
        createdAt: serverTimestamp(),
      });

      setMessage("");
    } catch (postError) {
      setError(
        getErrorMessage(postError, "投稿に失敗しました。Firestoreのルールを確認してください。"),
      );
    } finally {
      setIsPosting(false);
    }
  }

  async function handleDeletePost(post: Post) {
    if (!user) {
      setError("投稿を削除するにはGoogleログインが必要です。");
      return;
    }

    if (post.uid !== user.uid) {
      setError("削除できるのは自分の投稿だけです。");
      return;
    }

    setDeletingPostId(post.id);
    setError("");

    try {
      await deleteDoc(doc(db, "posts", post.id));
    } catch (deleteError) {
      setError(
        getErrorMessage(deleteError, "投稿の削除に失敗しました。Firestoreのルールを確認してください。"),
      );
    } finally {
      setDeletingPostId("");
    }
  }

  return (
    <main className="page">
      <section className="sns-shell" aria-labelledby="page-title">
        <header className="header">
          <div>
            <p className="eyebrow">Micro SNS</p>
            <h1 id="page-title">ひとことSNS</h1>
          </div>

          <div className="auth-panel">
            {isAuthLoading ? (
              <span className="auth-status">確認中...</span>
            ) : user ? (
              <>
                {user.photoURL ? (
                  <img className="avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span className="avatar avatar-placeholder">?</span>
                )}
                <span className="auth-name">{user.displayName ?? "名前なし"}</span>
                <button className="secondary-button" type="button" onClick={handleLogout}>
                  ログアウト
                </button>
              </>
            ) : (
              <button type="button" onClick={handleLogin}>
                Googleでログイン
              </button>
            )}
          </div>
        </header>

        <form className="post-form" onSubmit={handleSubmit}>
          <label htmlFor="message">投稿内容</label>
          <textarea
            id="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={
              user ? "いま思っていることを書いてください" : "ログインすると投稿できます"
            }
            maxLength={140}
            rows={4}
            disabled={!user || isPosting}
          />

          <div className="form-footer">
            <span>{message.length}/140</span>
            <button type="submit" disabled={!user || isPosting}>
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
                <div className="post-layout">
                  {post.photoURL ? (
                    <img
                      className="avatar"
                      src={post.photoURL}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="avatar avatar-placeholder">?</span>
                  )}
                  <div className="post-body">
                    <div className="post-meta">
                      <div>
                        <strong>{post.name}</strong>
                        <time>{formatDate(post.createdAt)}</time>
                      </div>
                      {user?.uid === post.uid ? (
                        <button
                          className="delete-button"
                          type="button"
                          onClick={() => handleDeletePost(post)}
                          disabled={deletingPostId === post.id}
                        >
                          {deletingPostId === post.id ? "削除中..." : "削除"}
                        </button>
                      ) : null}
                    </div>
                    <p>{post.message}</p>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}
