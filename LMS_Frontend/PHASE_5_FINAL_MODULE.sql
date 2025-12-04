-- ============================================
-- LMS Phase 5: Bulk Upload + Map + AGO Sync
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Add AGO sync columns to properties table
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS ago_sync_status TEXT DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS ago_sync_error TEXT,
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS global_id TEXT;

-- Create index for AGO sync queries
CREATE INDEX IF NOT EXISTS idx_properties_ago_sync_status 
ON public.properties(ago_sync_status) 
WHERE ago_sync_status != 'SYNCED';

-- Create bulk upload sessions table
CREATE TABLE IF NOT EXISTS public.bulk_upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_type TEXT NOT NULL, -- 'CUSTOMER', 'PROPERTY', 'TAX_ASSESSMENT', 'TAX_PAYMENT'
  file_name TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'PREVIEW', -- 'PREVIEW', 'COMMITTED', 'FAILED'
  total_rows INTEGER NOT NULL,
  valid_rows INTEGER NOT NULL,
  error_rows INTEGER NOT NULL,
  warning_rows INTEGER NOT NULL DEFAULT 0,
  validation_results JSONB,
  committed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for cleanup
CREATE INDEX IF NOT EXISTS idx_bulk_upload_expires 
ON public.bulk_upload_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_bulk_upload_user 
ON public.bulk_upload_sessions(uploaded_by, uploaded_at DESC);

-- Create AGO sync retries table
CREATE TABLE IF NOT EXISTS public.ago_sync_retries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_retry_at TIMESTAMPTZ NOT NULL,
  error_message TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'RETRYING', 'SUCCESS', 'FAILED'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for retry scheduler
CREATE INDEX IF NOT EXISTS idx_ago_sync_next_retry 
ON public.ago_sync_retries(next_retry_at, status) 
WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_ago_sync_property 
ON public.ago_sync_retries(property_id, created_at DESC);

-- Add trigger for bulk_upload_sessions updated_at
CREATE OR REPLACE FUNCTION update_bulk_upload_sessions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bulk_upload_sessions_updated_at_trigger ON public.bulk_upload_sessions;
CREATE TRIGGER bulk_upload_sessions_updated_at_trigger
BEFORE UPDATE ON public.bulk_upload_sessions
FOR EACH ROW
EXECUTE FUNCTION update_bulk_upload_sessions_updated_at();

-- Add trigger for ago_sync_retries updated_at
CREATE OR REPLACE FUNCTION update_ago_sync_retries_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ago_sync_retries_updated_at_trigger ON public.ago_sync_retries;
CREATE TRIGGER ago_sync_retries_updated_at_trigger
BEFORE UPDATE ON public.ago_sync_retries
FOR EACH ROW
EXECUTE FUNCTION update_ago_sync_retries_updated_at();

-- RLS Policies for bulk_upload_sessions
ALTER TABLE public.bulk_upload_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own upload sessions" ON public.bulk_upload_sessions;
CREATE POLICY "Users can view their own upload sessions"
ON public.bulk_upload_sessions
FOR SELECT
TO authenticated
USING (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Admins can view all upload sessions" ON public.bulk_upload_sessions;
CREATE POLICY "Admins can view all upload sessions"
ON public.bulk_upload_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'ADMINISTRATOR'
  )
);

DROP POLICY IF EXISTS "Users can insert their own upload sessions" ON public.bulk_upload_sessions;
CREATE POLICY "Users can insert their own upload sessions"
ON public.bulk_upload_sessions
FOR INSERT
TO authenticated
WITH CHECK (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their own upload sessions" ON public.bulk_upload_sessions;
CREATE POLICY "Users can update their own upload sessions"
ON public.bulk_upload_sessions
FOR UPDATE
TO authenticated
USING (uploaded_by = auth.uid());

-- RLS Policies for ago_sync_retries
ALTER TABLE public.ago_sync_retries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all AGO sync retries" ON public.ago_sync_retries;
CREATE POLICY "Admins can view all AGO sync retries"
ON public.ago_sync_retries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'ADMINISTRATOR'
  )
);

DROP POLICY IF EXISTS "System can manage AGO sync retries" ON public.ago_sync_retries;
CREATE POLICY "System can manage AGO sync retries"
ON public.ago_sync_retries
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Function to generate mock GlobalID
CREATE OR REPLACE FUNCTION generate_global_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN '{' || 
    substr(md5(random()::text), 1, 8) || '-' ||
    substr(md5(random()::text), 1, 4) || '-' ||
    substr(md5(random()::text), 1, 4) || '-' ||
    substr(md5(random()::text), 1, 4) || '-' ||
    substr(md5(random()::text), 1, 12) || 
  '}';
END;
$$;

-- Function to schedule AGO retry
CREATE OR REPLACE FUNCTION schedule_ago_retry(
  p_property_id UUID,
  p_attempt_number INTEGER,
  p_error_message TEXT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_retry_id UUID;
  v_delay_minutes INTEGER;
BEGIN
  -- Calculate delay based on attempt number
  v_delay_minutes := CASE p_attempt_number
    WHEN 1 THEN 15
    WHEN 2 THEN 30
    WHEN 3 THEN 60
    WHEN 4 THEN 120
    WHEN 5 THEN 240
    ELSE 0 -- No more retries after 5 attempts
  END;
  
  IF v_delay_minutes > 0 THEN
    INSERT INTO public.ago_sync_retries (
      property_id,
      attempt_number,
      last_attempt_at,
      next_retry_at,
      error_message,
      status
    ) VALUES (
      p_property_id,
      p_attempt_number,
      NOW(),
      NOW() + (v_delay_minutes || ' minutes')::INTERVAL,
      p_error_message,
      'PENDING'
    )
    RETURNING id INTO v_retry_id;
  END IF;
  
  RETURN v_retry_id;
END;
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.bulk_upload_sessions TO authenticated;
GRANT ALL ON public.ago_sync_retries TO authenticated;
GRANT EXECUTE ON FUNCTION generate_global_id() TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_ago_retry(UUID, INTEGER, TEXT) TO authenticated;

-- Add comments
COMMENT ON TABLE public.bulk_upload_sessions IS 'Tracks bulk Excel upload sessions and validation results';
COMMENT ON TABLE public.ago_sync_retries IS 'Manages retry schedule for failed AGO sync operations';
COMMENT ON COLUMN public.properties.ago_sync_status IS 'AGO sync status: PENDING, SYNCED, ERROR';
COMMENT ON COLUMN public.properties.ago_sync_error IS 'Error message from last failed AGO sync attempt';
COMMENT ON COLUMN public.properties.last_sync_at IS 'Timestamp of last AGO sync attempt';
COMMENT ON COLUMN public.properties.global_id IS 'ArcGIS Online GlobalID';

-- Phase 5 setup complete
SELECT 'Phase 5 migration completed successfully!' AS status;
