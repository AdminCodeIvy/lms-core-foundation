-- Add is_archived column to tax_assessments table
-- This allows administrators to archive tax assessments instead of deleting them

ALTER TABLE public.tax_assessments 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_tax_assessments_is_archived 
ON public.tax_assessments(is_archived);

-- Update audit logs to include archive actions
COMMENT ON COLUMN public.tax_assessments.is_archived IS 'Indicates if the tax assessment has been archived by an administrator';
