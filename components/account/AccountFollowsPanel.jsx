"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { NavyPanel } from "./AccountShell";
import CreatorFollowFeed from "@/components/creators/CreatorFollowFeed";
import CreatorProfileView from "@/components/creators/CreatorProfileView";

export default function AccountFollowsPanel() {
  const { token } = useAuth();
  const [follows, setFollows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inner, setInner] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await fetch("/api/blog/engage?action=list-follows", {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (!cancelled) {
        setFollows(data.follows || []);
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
        <p className="text-sm text-slate-400">載入中…</p>
      ) : (
        <CreatorFollowFeed
          follows={follows}
          onUnfollow={unfollow}
          onOpenInner={setInner}
        />
      )}
    </NavyPanel>
  );
}
