-- 夥伴賣場 status：active（上線）、deleted（軟刪除）、setup（智慧開店進行中，前台不可見）
comment on column public.stores.status is
  'active=上線; deleted=軟刪除; setup=智慧開店進行中（wizard 完成後才 active）';
