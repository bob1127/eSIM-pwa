-- 合作須知同意存證（scroll-wrap clickwrap）：
-- 申請流程要求捲動至頁尾才能點擊同意，這裡記錄使用者當下同意的
-- 條款版本與時間，做為日後糾紛的證據，避免只靠前端一顆勾選框卻無留存紀錄。
alter table public.partners
  add column if not exists agreed_terms_version text,
  add column if not exists agreed_terms_at timestamptz;

comment on column public.partners.agreed_terms_version is
  '申請時同意的合作須知版本（對應 lib/cooperationTermsContent.js 的 TERMS_VERSION，需與 pages/terms.jsx lastUpdated 一致）';
comment on column public.partners.agreed_terms_at is
  '使用者於申請流程中，捲動閱讀合作須知至頁尾後點擊同意的時間戳';
