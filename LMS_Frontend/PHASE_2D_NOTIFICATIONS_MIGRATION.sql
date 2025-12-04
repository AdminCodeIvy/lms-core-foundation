-- ============================================================================
-- PHASE 2D: ACTIVITY LOGS & NOTIFICATIONS MIGRATION
-- ============================================================================
-- This migration creates the notifications table and related functions
-- to support in-app notifications for customer workflow events
-- ============================================================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'CUSTOMER', 'USER', etc.
    entity_id UUID NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    
    -- Add indexes for common queries
    CONSTRAINT notifications_entity_type_check CHECK (entity_type IN ('CUSTOMER', 'USER'))
);

-- Add read_at column if it doesn't exist (for partial migration recovery)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'read_at'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN read_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON public.notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- RLS Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: System can insert notifications (via service role)
CREATE POLICY "Service role can insert notifications"
    ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT INSERT ON public.notifications TO service_role;

-- ============================================================================
-- HELPER FUNCTION: Create notification
-- ============================================================================
-- This function creates a notification for a specific user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_entity_type TEXT,
    p_entity_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        entity_type,
        entity_id
    )
    VALUES (
        p_user_id,
        p_title,
        p_message,
        p_entity_type,
        p_entity_id
    )
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;

-- ============================================================================
-- HELPER FUNCTION: Get unread notification count
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.notifications
    WHERE user_id = p_user_id
    AND is_read = false;
$$;

-- ============================================================================
-- Update activity_logs table to ensure proper indexes
-- ============================================================================

-- Add index for entity lookups if not exists (note: activity_logs uses 'timestamp' column)
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_performed_by ON public.activity_logs(performed_by);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.notifications IS 'Stores in-app notifications for users';
COMMENT ON COLUMN public.notifications.user_id IS 'User who will receive the notification';
COMMENT ON COLUMN public.notifications.title IS 'Notification title/heading';
COMMENT ON COLUMN public.notifications.message IS 'Notification message body';
COMMENT ON COLUMN public.notifications.entity_type IS 'Type of entity (CUSTOMER, USER, etc)';
COMMENT ON COLUMN public.notifications.entity_id IS 'ID of the related entity';
COMMENT ON COLUMN public.notifications.is_read IS 'Whether notification has been read';
COMMENT ON COLUMN public.notifications.read_at IS 'Timestamp when notification was marked as read';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run these queries to verify the migration:
-- SELECT COUNT(*) FROM public.notifications;
-- SELECT * FROM pg_indexes WHERE tablename = 'notifications';
-- SELECT * FROM pg_policies WHERE tablename = 'notifications';
-- ============================================================================
