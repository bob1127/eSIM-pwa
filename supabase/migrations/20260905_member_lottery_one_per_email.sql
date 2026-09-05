-- 拉霸：每位會員（email）終身限抽一次
-- 先清重複（保留最早一筆），再建 unique

with ranked as (
  select
    id,
    row_number() over (
      partition by lower(email)
      order by created_at asc nulls last, id asc
    ) as rn
  from public.member_lottery_plays
)
delete from public.member_lottery_plays p
using ranked r
where p.id = r.id
  and r.rn > 1;

create unique index if not exists uq_member_lottery_one_per_email
  on public.member_lottery_plays (lower(email));
