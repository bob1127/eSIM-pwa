-- LINE 以 ICCID 綁定監控時，同一人同一卡只留一筆
create unique index if not exists idx_line_traffic_alerts_user_iccid
  on public.line_traffic_alerts (line_user_id, iccid)
  where iccid is not null;
