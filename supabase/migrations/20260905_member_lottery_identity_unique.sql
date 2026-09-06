-- 拉霸：同一 Supabase user / LINE 身分終身限抽一次（補 email unique）
-- 先清重複（保留最早一筆），再建 partial unique

-- user_id 重複
with ranked_user as (
  select
    id,
    row_number() over (
      partition by user_id
      order by created_at asc nulls last, id asc
    ) as rn
  from public.member_lottery_plays
  where user_id is not null
)
delete from public.member_lottery_plays p
using ranked_user r
where p.id = r.id
  and r.rn > 1;

-- line_user_id 重複
with ranked_line as (
  select
    id,
    row_number() over (
      partition by line_user_id
      order by created_at asc nulls last, id asc
    ) as rn
  from public.member_lottery_plays
  where line_user_id is not null
    and btrim(line_user_id) <> ''
)
delete from public.member_lottery_plays p
using ranked_line r
where p.id = r.id
  and r.rn > 1;

create unique index if not exists uq_member_lottery_one_per_user_id
  on public.member_lottery_plays (user_id)
  where user_id is not null;

create unique index if not exists uq_member_lottery_one_per_line_user_id
  on public.member_lottery_plays (line_user_id)
  where line_user_id is not null and btrim(line_user_id) <> '';
