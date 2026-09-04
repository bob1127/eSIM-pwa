import { createClient } from "@supabase/supabase-js";
import { resolveMemberEmail } from "../push/_memberAuth";
import {
  memberKeyFromAuth,
} from "../../../lib/blogCreator";
import { loadCreatorTeasers, loadSavedPostsFromLikes } from "../../../lib/creatorProfile";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function clip(s, n) {
  return String(s || "").trim().slice(0, n);
}

async function statsRow(postKey) {
  const { data } = await supabaseAdmin
    .from("blog_post_stats")
    .select("view_count, like_count")
    .eq("post_key", postKey)
    .maybeSingle();
  return {
    viewCount: data?.view_count ?? 0,
    likeCount: data?.like_count ?? 0,
  };
}

async function bumpViews(postKey) {
  try {
    const current = await statsRow(postKey);
    const next = current.viewCount + 1;
    await supabaseAdmin.from("blog_post_stats").upsert(
      {
        post_key: postKey,
        view_count: next,
        like_count: current.likeCount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "post_key" },
    );
    return next;
  } catch {
    return 0;
  }
}

async function countFollowers(creatorKey) {
  if (!creatorKey) return 0;
  try {
    const { count } = await supabaseAdmin
      .from("creator_follows")
      .select("*", { count: "exact", head: true })
      .eq("creator_key", creatorKey);
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function isFollowing(creatorKey, memberKey) {
  if (!creatorKey || !memberKey) return false;
  const { data } = await supabaseAdmin
    .from("creator_follows")
    .select("id")
    .eq("creator_key", creatorKey)
    .eq("member_key", memberKey)
    .maybeSingle();
  return Boolean(data);
}

async function recountLikes(postKey) {
  const { count } = await supabaseAdmin
    .from("blog_post_likes")
    .select("*", { count: "exact", head: true })
    .eq("post_key", postKey);
  const likes = count ?? 0;
  const current = await statsRow(postKey);
  await supabaseAdmin.from("blog_post_stats").upsert(
    {
      post_key: postKey,
      view_count: current.viewCount,
      like_count: likes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "post_key" },
  );
  return likes;
}

export default async function handler(req, res) {
  const postKey = clip(req.query.postKey || req.body?.postKey, 200);
  const creatorKey = clip(req.query.creatorKey || req.body?.creatorKey, 120);
  const creatorName = clip(req.body?.creatorName, 80);

  if (req.method === "GET") {
    const action = clip(req.query.action, 20);
    const listFollows = action === "list-follows";
    const listLikes = action === "list-likes";
    const member = await resolveMemberEmail(req, res);
    const memberKey = memberKeyFromAuth(member);

    // 只查追蹤狀態：愛心按鈕重新整理後靠這支還原，不需要整份創作者資料
    if (action === "follow-state") {
      if (!creatorKey) return res.status(400).json({ error: "缺少創作者" });
      const [following, followerCount] = await Promise.all([
        isFollowing(creatorKey, memberKey),
        countFollowers(creatorKey),
      ]);
      return res.status(200).json({
        creatorKey,
        following,
        followerCount,
        loggedIn: Boolean(memberKey),
      });
    }

    if (listFollows) {
      if (!memberKey) return res.status(401).json({ error: "請先登入會員" });
      const { data } = await supabaseAdmin
        .from("creator_follows")
        .select("creator_key, creator_name, created_at, notify_push")
        .eq("member_key", memberKey)
        .order("created_at", { ascending: false });
      const follows = data || [];
      const teasers = await loadCreatorTeasers(follows.map((f) => f.creator_key));
      const byKey = Object.fromEntries(teasers.map((t) => [t.key, t]));
      return res.status(200).json({
        follows: follows.map((f) => ({
          ...f,
          profile: byKey[f.creator_key] || null,
        })),
      });
    }

    if (listLikes) {
      if (!memberKey) return res.status(401).json({ error: "請先登入會員" });
      const { data } = await supabaseAdmin
        .from("blog_post_likes")
        .select("post_key, created_at")
        .eq("member_key", memberKey)
        .order("created_at", { ascending: false })
        .limit(80);
      const posts = await loadSavedPostsFromLikes(data || []);
      return res.status(200).json({ posts });
    }

    if (!postKey) return res.status(400).json({ error: "缺少文章" });
    const stats = await statsRow(postKey);
    let liked = false;
    let following = false;
    if (memberKey) {
      const [{ data: likeRow }, { data: followRow }] = await Promise.all([
        supabaseAdmin
          .from("blog_post_likes")
          .select("post_key")
          .eq("post_key", postKey)
          .eq("member_key", memberKey)
          .maybeSingle(),
        creatorKey
          ? supabaseAdmin
              .from("creator_follows")
              .select("id")
              .eq("creator_key", creatorKey)
              .eq("member_key", memberKey)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      liked = Boolean(likeRow);
      following = Boolean(followRow);
    }
    let followerCount = 0;
    if (creatorKey) {
      try {
        const { count } = await supabaseAdmin
          .from("creator_follows")
          .select("*", { count: "exact", head: true })
          .eq("creator_key", creatorKey);
        followerCount = count ?? 0;
      } catch {
        followerCount = 0;
      }
    }
    return res.status(200).json({
      ...stats,
      liked,
      following,
      loggedIn: Boolean(memberKey),
      followerCount,
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const action = clip(req.body?.action, 20);
  if (!postKey && action !== "follow" && action !== "unfollow") {
    return res.status(400).json({ error: "缺少文章" });
  }

  if (action === "view") {
    const viewCount = await bumpViews(postKey);
    return res.status(200).json({ viewCount });
  }

  const member = await resolveMemberEmail(req, res);
  const memberKey = memberKeyFromAuth(member);
  if (!memberKey) {
    return res.status(401).json({ error: "請先登入會員" });
  }

  if (action === "like" || action === "unlike") {
    if (action === "like") {
      await supabaseAdmin
        .from("blog_post_likes")
        .upsert({ post_key: postKey, member_key: memberKey }, { onConflict: "post_key,member_key" });
    } else {
      await supabaseAdmin
        .from("blog_post_likes")
        .delete()
        .eq("post_key", postKey)
        .eq("member_key", memberKey);
    }
    const likeCount = await recountLikes(postKey);
    return res.status(200).json({ liked: action === "like", likeCount });
  }

  if (action === "follow" || action === "unfollow") {
    if (!creatorKey) return res.status(400).json({ error: "缺少創作者" });

    // 幂等：重複按同一個方向不會重複寫入或重複計數
    const wantFollow = action === "follow";
    const already = await isFollowing(creatorKey, memberKey);
    let changed = false;

    if (wantFollow && !already) {
      await supabaseAdmin.from("creator_follows").upsert(
        {
          member_key: memberKey,
          user_id: member.userId || null,
          member_email: member.email || null,
          line_user_id: member.lineUserId || null,
          creator_key: creatorKey,
          creator_name: creatorName || null,
          notify_push: true,
        },
        { onConflict: "member_key,creator_key" },
      );
      changed = true;
    } else if (!wantFollow && already) {
      await supabaseAdmin
        .from("creator_follows")
        .delete()
        .eq("member_key", memberKey)
        .eq("creator_key", creatorKey);
      changed = true;
    }

    const followerCount = await countFollowers(creatorKey);
    return res.status(200).json({
      following: wantFollow,
      followerCount,
      changed,
    });
  }

  if (action === "list-follows") {
    const { data } = await supabaseAdmin
      .from("creator_follows")
      .select("creator_key, creator_name, created_at, notify_push")
      .eq("member_key", memberKey)
      .order("created_at", { ascending: false });
    const rows = data || [];
    let teasers = [];
    try {
      teasers = await loadCreatorTeasers(rows.map((r) => r.creator_key));
    } catch {
      teasers = [];
    }
    const byKey = Object.fromEntries(
      (teasers || []).map((p) => [p.key, p]),
    );
    return res.status(200).json({
      follows: rows.map((row) => ({
        ...row,
        profile: byKey[row.creator_key] || null,
      })),
    });
  }

  return res.status(400).json({ error: "未知動作" });
}
