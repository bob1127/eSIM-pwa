-- ============================================================
-- 商品評價防刷／防惡意留言
-- 請在 Supabase → SQL Editor 執行此檔案
-- ============================================================

create or replace function public.enforce_product_review_anti_spam()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  last_at timestamptz;
  review_today int;
  reply_hour int;
  dup_count int;
  body text;
  is_reply boolean;
begin
  -- 必須登入
  if auth.uid() is null then
    raise exception '請先登入後再留言';
  end if;

  -- 只能替自己發文
  if new.user_id is distinct from auth.uid() then
    raise exception '無法代他人留言';
  end if;

  body := trim(coalesce(new.content, ''));
  is_reply := new.parent_id is not null;

  if char_length(body) < (case when is_reply then 2 else 5 end) then
    raise exception '留言內容過短';
  end if;

  if char_length(body) > 2000 then
    raise exception '留言內容過長（上限 2000 字）';
  end if;

  if new.title is not null and char_length(trim(new.title)) > 100 then
    raise exception '標題過長（上限 100 字）';
  end if;

  -- 純重複字元（例如 666666 / aaaaa）
  if char_length(body) >= 6
     and body ~ ('^(.)\1{' || (char_length(body) - 1)::text || '}$') then
    raise exception '內容疑似無效或洗版，請改寫後再送';
  end if;

  -- 發文冷卻：同一帳號 60 秒內只能發 1 則
  select max(created_at) into last_at
  from public.product_reviews
  where user_id = auth.uid();

  if last_at is not null and last_at > now() - interval '60 seconds' then
    raise exception '發文過於頻繁，請 60 秒後再試';
  end if;

  -- 同一商品每日最多 3 則主評價
  if not is_reply then
    select count(*) into review_today
    from public.product_reviews
    where user_id = auth.uid()
      and product_id = new.product_id
      and parent_id is null
      and created_at > now() - interval '24 hours';

    if review_today >= 3 then
      raise exception '此商品今日評價已達上限（每天最多 3 則）';
    end if;
  end if;

  -- 每小時最多 15 則回覆
  if is_reply then
    select count(*) into reply_hour
    from public.product_reviews
    where user_id = auth.uid()
      and parent_id is not null
      and created_at > now() - interval '1 hour';

    if reply_hour >= 15 then
      raise exception '回覆過於頻繁，請稍後再試';
    end if;
  end if;

  -- 24 小時內禁止完全相同內容
  select count(*) into dup_count
  from public.product_reviews
  where user_id = auth.uid()
    and product_id = new.product_id
    and lower(trim(content)) = lower(body)
    and created_at > now() - interval '24 hours';

  if dup_count > 0 then
    raise exception '請勿重複張貼相同內容';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_product_review_anti_spam on public.product_reviews;
create trigger trg_product_review_anti_spam
  before insert on public.product_reviews
  for each row
  execute function public.enforce_product_review_anti_spam();

-- 按讚也加一層：1 秒冷卻（通常 primary key 已防重，此為額外保護）
create or replace function public.enforce_product_review_like_anti_spam()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent int;
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception '請先登入才能按讚';
  end if;

  select count(*) into recent
  from public.product_review_likes
  where user_id = auth.uid()
    and created_at > now() - interval '2 seconds';

  if recent >= 3 then
    raise exception '按讚過於頻繁，請稍後再試';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_product_review_like_anti_spam on public.product_review_likes;
create trigger trg_product_review_like_anti_spam
  before insert on public.product_review_likes
  for each row
  execute function public.enforce_product_review_like_anti_spam();
