-- 部落格留言回覆：parent_id 指向父留言（僅一層回覆）
alter table public.blog_reviews
  add column if not exists parent_id uuid references public.blog_reviews(id) on delete cascade;

create index if not exists blog_reviews_parent_id_idx
  on public.blog_reviews(parent_id);

comment on column public.blog_reviews.parent_id is '回覆的父留言 id；null 為頂層留言';
