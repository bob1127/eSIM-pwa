"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { NavyPanel } from "./AccountShell";
import CreatorFollowFeed from "@/components/creators/CreatorFollowFeed";
import CreatorProfileView from "@/components/creators/CreatorProfileView";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

export default function AccountFollowsPanel() {
  const { token } = useAuth();
  const [follows, setFollows] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inner, setInner] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [followsRes, likesRes] = await Promise.all([
        fetch("/api/blog/engage?action=list-follows", {
          credentials: "include",
          headers,
        }),
        fetch("/api/blog/engage?action=list-likes", {
          credentials: "include",
          headers,
        }),
      ]);
      const followsData = await followsRes.json().catch(() => ({}));
      const likesData = await likesRes.json().catch(() => ({}));
      if (!cancelled) {
        setFollows(followsData.follows || []);
        setSavedPosts(likesData.posts || []);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const unfollow = async (creatorKey) => {
    await fetch("/api/blog/engage", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action: "unfollow", creatorKey }),
    });
    setFollows((prev) => prev.filter((f) => f.creator_key !== creatorKey));
    if (inner?.key === creatorKey) setInner(null);
  };

  if (inner) {
    return (
      <CreatorProfileView
        profile={inner}
        embedded
        onClose={() => setInner(null)}
      />
    );
  }

  return (
    <NavyPanel title="追蹤創作者" icon="notifications">
      {loading ? (
        <LoadingIndicator label="載入中…" />
      ) : (
        <CreatorFollowFeed
          follows={follows}
          savedPosts={savedPosts}
          onUnfollow={unfollow}
          onOpenInner={setInner}
        />
      )}
    </NavyPanel>
  );
}
