-- Run once in Supabase → SQL Editor (combines recent feature migrations)

-- Food menu on settings
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS food_included boolean NOT NULL DEFAULT false;

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS weekly_menu jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Service vendors + complaint routing
CREATE TABLE IF NOT EXISTS service_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  trade text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  email text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES service_vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_service_vendors_property ON service_vendors(property_id);
CREATE INDEX IF NOT EXISTS idx_complaints_approval ON complaints(property_id, approval_status);

ALTER TABLE service_vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_service_vendors" ON service_vendors;
CREATE POLICY "owner_service_vendors" ON service_vendors FOR ALL USING (
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
);
