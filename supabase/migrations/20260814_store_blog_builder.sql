-- 夥伴文章：SEO 外層欄位 + Elementor 式區塊 JSON
alter table public.store_blog_posts
  add column if not exists meta_description text,
  add column if not exists meta_keywords text,
  add column if not exists og_title text,
  add column if not exists og_image_url text,
  add column if not exists content_blocks jsonb not null default '[]'::jsonb;

comment on column public.store_blog_posts.meta_description is
  '搜尋／社群描述（主站 SEO 正本亦讀此欄）';
comment on column public.store_blog_posts.meta_keywords is
  'SEO 關鍵字，逗號分隔';
comment on column public.store_blog_posts.og_title is
  '社群預覽標題，空白則用 title';
comment on column public.store_blog_posts.og_image_url is
  '社群預覽圖，空白則用封面';
comment on column public.store_blog_posts.content_blocks is
  '視覺編輯器區塊 JSON（發布時另寫 content_html 供主站／前台）';
