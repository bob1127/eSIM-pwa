-- 任務牆：後台開關／名額 + 申請審核
CREATE TABLE IF NOT EXISTS public.mission_wall_controls (
  mission_id TEXT PRIMARY KEY,
  is_open BOOLEAN NOT NULL DEFAULT FALSE,
  max_slots INTEGER,
  closed_reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS public.mission_applications (
  id BIGSERIAL PRIMARY KEY,
  mission_id TEXT NOT NULL,
  mission_title TEXT,
  partner_type TEXT,
  partner_type_label TEXT,
  company TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  line_id TEXT,
  resource_note TEXT,
  payload TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mission_applications_mission
  ON public.mission_applications(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_applications_status
  ON public.mission_applications(status);
CREATE INDEX IF NOT EXISTS idx_mission_applications_email
  ON public.mission_applications(email);
CREATE INDEX IF NOT EXISTS idx_mission_applications_created
  ON public.mission_applications(created_at DESC);

ALTER TABLE public.mission_wall_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_applications ENABLE ROW LEVEL SECURITY;
