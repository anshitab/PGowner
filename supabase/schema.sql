-- PGowner Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Properties table
CREATE TABLE properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'Boys PG',
  total_floors int NOT NULL DEFAULT 1,
  total_rooms int NOT NULL DEFAULT 0,
  rules text[] DEFAULT '{}',
  verification_status text NOT NULL DEFAULT 'pending',
  verification_doc_url text,
  created_at timestamptz DEFAULT now()
);

-- Rooms table
CREATE TABLE rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  number text NOT NULL,
  floor int NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'Single',
  rent int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Vacant',
  amenities text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Beds table
CREATE TABLE beds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'A',
  tenant_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_name text,
  status text NOT NULL DEFAULT 'available',
  assigned_date date,
  created_at timestamptz DEFAULT now()
);

-- Tenants table (profile for auth users with tenant role)
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text DEFAULT '',
  email text DEFAULT '',
  room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
  rent int NOT NULL DEFAULT 0,
  join_date date DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'Active',
  occupation text DEFAULT '',
  company text DEFAULT '',
  address text DEFAULT '',
  emergency_contact jsonb DEFAULT '{}',
  gov_ids jsonb DEFAULT '{}',
  deposit int DEFAULT 0,
  documents jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Payments table
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount int NOT NULL DEFAULT 0,
  method text DEFAULT 'Cash',
  verified boolean DEFAULT false,
  date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Rent Collection table
CREATE TABLE rent_collection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount int NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  paid_date date,
  status text NOT NULL DEFAULT 'Pending',
  method text,
  created_at timestamptz DEFAULT now()
);

-- On-site service contacts (plumber, electrician, etc.) per property
CREATE TABLE service_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  trade text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  email text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Complaints table
CREATE TABLE complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  priority text NOT NULL DEFAULT 'Medium',
  status text NOT NULL DEFAULT 'Open',
  assigned_to text,
  category text,
  approval_status text NOT NULL DEFAULT 'pending',
  vendor_id uuid REFERENCES service_vendors(id) ON DELETE SET NULL,
  approved_at timestamptz,
  comments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Visitors table
CREATE TABLE visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  name text NOT NULL,
  purpose text DEFAULT '',
  check_in timestamptz DEFAULT now(),
  check_out timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Expenses table
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'Miscellaneous',
  description text DEFAULT '',
  amount int NOT NULL DEFAULT 0,
  date date DEFAULT CURRENT_DATE,
  vendor text DEFAULT '',
  payment_method text DEFAULT 'Cash',
  created_at timestamptz DEFAULT now()
);

-- Announcements table
CREATE TABLE announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text DEFAULT '',
  priority text NOT NULL DEFAULT 'normal',
  created_at timestamptz DEFAULT now()
);

-- Activity Log table
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  type text NOT NULL,
  action text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  entity_id text,
  entity_type text,
  actor text DEFAULT 'System',
  created_at timestamptz DEFAULT now()
);

-- Settings table (one per property)
CREATE TABLE settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
  rent_due_day int DEFAULT 1,
  late_fee_amount int DEFAULT 500,
  late_fee_type text DEFAULT 'flat',
  late_fee_grace_days int DEFAULT 5,
  notice_period_days int DEFAULT 30,
  visitor_hours jsonb DEFAULT '{"start": "08:00", "end": "21:00"}',
  maintenance_sla jsonb DEFAULT '{"high": 24, "medium": 72, "low": 168}',
  pg_rules text[] DEFAULT '{}',
  deposit_multiplier int DEFAULT 2,
  checkout_deductions jsonb DEFAULT '{"cleaningFee": 2000, "noticePenaltyPerDay": 500}',
  notifications jsonb DEFAULT '{"paymentReceived": true, "rentOverdue": true, "newComplaint": true, "visitorCheckIn": false, "monthlyReports": true}',
  upi_id text DEFAULT '',
  food_included boolean NOT NULL DEFAULT false,
  weekly_menu jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Checkout Records table
CREATE TABLE checkout_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tenant_name text NOT NULL,
  room_number text NOT NULL,
  bed_label text DEFAULT '',
  status text NOT NULL DEFAULT 'settlement_pending',
  check_in_date date,
  deposit_amount int DEFAULT 0,
  pending_rent int DEFAULT 0,
  deductions jsonb DEFAULT '[]',
  total_deductions int DEFAULT 0,
  refund_amount int DEFAULT 0,
  notice_period_served boolean DEFAULT false,
  notice_date date,
  last_date date,
  notes text DEFAULT '',
  initiated_date date DEFAULT CURRENT_DATE,
  completed_date date,
  created_at timestamptz DEFAULT now()
);

-- Checkout Messages table (tenant-owner chat about checkout)
CREATE TABLE checkout_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_role text NOT NULL DEFAULT 'tenant',
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Bed Transfers table
CREATE TABLE bed_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tenant_name text NOT NULL,
  from_bed_id uuid REFERENCES beds(id),
  to_bed_id uuid REFERENCES beds(id),
  from_room_id uuid REFERENCES rooms(id),
  to_room_id uuid REFERENCES rooms(id),
  reason text DEFAULT '',
  date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

-- Transactions table (payment gateway records)
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount int NOT NULL DEFAULT 0,
  gateway_fee int DEFAULT 0,
  net_amount int DEFAULT 0,
  status text NOT NULL DEFAULT 'Pending',
  gateway_id text DEFAULT '',
  date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);


-- Enable Row Level Security on all tables
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bed_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_vendors ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public can read verified properties (for visitor booking)
CREATE POLICY "public_read_verified" ON properties FOR SELECT TO anon USING (verification_status = 'verified');

-- RLS Policies: Owner can access all data for their properties
CREATE POLICY "owner_properties" ON properties FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "owner_rooms" ON rooms FOR ALL USING (
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
);

CREATE POLICY "owner_beds" ON beds FOR ALL USING (
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
);

-- Owners can manage tenants for their properties.
-- Tenant creation is also gated in /api/tenants/create until verification_status = 'verified'.
CREATE POLICY "owner_tenants" ON tenants FOR ALL USING (
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
);

CREATE POLICY "owner_payments" ON payments FOR ALL USING (
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
);

CREATE POLICY "owner_rent_collection" ON rent_collection FOR ALL USING (
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
);

CREATE POLICY "owner_complaints" ON complaints FOR ALL USING (
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
);

CREATE POLICY "owner_visitors" ON visitors FOR ALL USING (
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
);

CREATE POLICY "owner_expenses" ON expenses FOR ALL USING (
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
);

CREATE POLICY "owner_announcements" ON announcements FOR ALL USING (
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
);

CREATE POLICY "owner_activity_log" ON activity_log FOR ALL USING (
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
);

CREATE POLICY "owner_settings" ON settings FOR ALL USING (
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
);

CREATE POLICY "owner_checkout_records" ON checkout_records FOR ALL USING (
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
);

CREATE POLICY "owner_checkout_messages" ON checkout_messages FOR ALL USING (
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
);

CREATE POLICY "tenant_checkout_messages" ON checkout_messages FOR ALL USING (
  tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
);

CREATE POLICY "owner_bed_transfers" ON bed_transfers FOR ALL USING (
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
);

CREATE POLICY "owner_transactions" ON transactions FOR ALL USING (
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
);

CREATE POLICY "owner_service_vendors" ON service_vendors FOR ALL USING (
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
);


-- RLS Policies: Authenticated users can browse verified properties (for tenant onboarding)
CREATE POLICY "authenticated_browse_verified" ON properties FOR SELECT TO authenticated
  USING (verification_status = 'verified');

-- RLS Policies: Tenants can read their own data
CREATE POLICY "tenant_read_own" ON tenants FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "tenant_read_own_room" ON rooms FOR SELECT USING (
  id IN (SELECT room_id FROM tenants WHERE user_id = auth.uid())
);

CREATE POLICY "tenant_read_own_beds" ON beds FOR SELECT USING (
  room_id IN (SELECT room_id FROM tenants WHERE user_id = auth.uid())
);

CREATE POLICY "tenant_read_property" ON properties FOR SELECT USING (
  id IN (SELECT property_id FROM tenants WHERE user_id = auth.uid())
);

CREATE POLICY "tenant_read_own_payments" ON payments FOR SELECT USING (
  tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
);

CREATE POLICY "tenant_read_own_complaints" ON complaints FOR ALL USING (
  tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
);

CREATE POLICY "tenant_read_announcements" ON announcements FOR SELECT USING (
  property_id IN (SELECT property_id FROM tenants WHERE user_id = auth.uid())
);

CREATE POLICY "tenant_read_own_rent" ON rent_collection FOR SELECT USING (
  tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
);

CREATE POLICY "tenant_read_settings" ON settings FOR SELECT USING (
  property_id IN (SELECT property_id FROM tenants WHERE user_id = auth.uid())
);

-- Indexes for common queries
CREATE INDEX idx_rooms_property ON rooms(property_id);
CREATE INDEX idx_beds_room ON beds(room_id);
CREATE INDEX idx_beds_property ON beds(property_id);
CREATE INDEX idx_tenants_property ON tenants(property_id);
CREATE INDEX idx_payments_property ON payments(property_id);
CREATE INDEX idx_rent_collection_property ON rent_collection(property_id);
CREATE INDEX idx_complaints_property ON complaints(property_id);
CREATE INDEX idx_visitors_property ON visitors(property_id);
CREATE INDEX idx_expenses_property ON expenses(property_id);
CREATE INDEX idx_activity_log_property ON activity_log(property_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_service_vendors_property ON service_vendors(property_id);
CREATE INDEX idx_complaints_approval ON complaints(property_id, approval_status);
