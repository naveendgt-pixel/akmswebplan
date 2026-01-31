-- ============================================================
-- AURA KNOT EVENT MANAGEMENT SYSTEM - COMPLETE DATABASE SCHEMA
-- ============================================================
-- ⚠️  WARNING: THIS FILE DELETES ALL DATA! ⚠️
-- DO NOT RUN THIS ON A DATABASE WITH REAL DATA!
-- 
-- For adding new columns, use migrations.sql instead
-- ============================================================

-- ============================================
-- STEP 1: DROP ALL EXISTING TABLES
-- ⚠️  THIS DELETES ALL YOUR DATA!
-- ============================================
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS quotation_items CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS quotations CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS sequence_counters CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 2: CREATE TABLES
-- ============================================

-- 1. CUSTOMERS TABLE
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50) NOT NULL,
  alternate_phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(20),
  source VARCHAR(50) DEFAULT 'Walk-in',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name ON customers(name);

-- 2. SERVICES TABLE (Service Catalog)
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  base_price DECIMAL(12, 2) DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'per event',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_active ON services(is_active);

-- 3. QUOTATIONS TABLE
-- Status: Draft, Pending, Confirmed, Declined
CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_id UUID DEFAULT NULL,
  -- Event Details
  event_type VARCHAR(100) NOT NULL,
  event_date DATE,
  event_end_date DATE,
  event_venue TEXT,
  event_city VARCHAR(100),
  package_type VARCHAR(100),
  -- Photography Details (Snapshot)
  photo_type VARCHAR(100),
  photo_area VARCHAR(100),
  photo_cameras INTEGER DEFAULT 1,
  photo_rate DECIMAL(12, 2) DEFAULT 0,
  photo_session VARCHAR(100),
  -- Videography Details (Snapshot)
  video_type VARCHAR(100),
  video_area VARCHAR(100),
  video_cameras INTEGER DEFAULT 1,
  video_rate DECIMAL(12, 2) DEFAULT 0,
  video_session VARCHAR(100),
  -- Album Details (Snapshot)
  num_albums INTEGER DEFAULT 0,
  sheets_per_album INTEGER DEFAULT 0,
  total_photos INTEGER DEFAULT 0,
  album_size VARCHAR(100),
  -- Print & Gifts (Snapshot)
  mini_books INTEGER DEFAULT 0,
  calendars INTEGER DEFAULT 0,
  frames INTEGER DEFAULT 0,
  -- Pricing
  subtotal DECIMAL(12, 2) DEFAULT 0,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  tax_percent DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) DEFAULT 0,
  -- Status and Metadata
  status VARCHAR(50) DEFAULT 'Draft',
  valid_until DATE,
  notes TEXT,
  terms_conditions TEXT,
  confirmed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotations_customer ON quotations(customer_id);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_number ON quotations(quotation_number);
CREATE INDEX idx_quotations_order ON quotations(order_id);

-- 4. QUOTATION ITEMS TABLE
CREATE TABLE quotation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  category VARCHAR(100),
  description VARCHAR(500) NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(12, 2) DEFAULT 0,
  total_price DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotation_items_quotation ON quotation_items(quotation_id);
CREATE INDEX idx_quotation_items_category ON quotation_items(category);

-- 5. ORDERS TABLE
-- Created only when quotation status = Confirmed
-- Contains snapshot of quotation data for historical accuracy
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  -- Customer Snapshot (frozen at order creation)
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),
  -- Event Details Snapshot
  event_type VARCHAR(100) NOT NULL,
  event_date DATE,
  event_end_date DATE,
  event_venue TEXT,
  event_city VARCHAR(100),
  package_type VARCHAR(100),
  -- Photography Details Snapshot
  photo_type VARCHAR(100),
  photo_area VARCHAR(100),
  photo_cameras INTEGER DEFAULT 1,
  photo_rate DECIMAL(12, 2) DEFAULT 0,
  photo_session VARCHAR(100),
  -- Videography Details Snapshot
  video_type VARCHAR(100),
  video_area VARCHAR(100),
  video_cameras INTEGER DEFAULT 1,
  video_rate DECIMAL(12, 2) DEFAULT 0,
  video_session VARCHAR(100),
  -- Album Details Snapshot
  num_albums INTEGER DEFAULT 0,
  sheets_per_album INTEGER DEFAULT 0,
  total_photos INTEGER DEFAULT 0,
  album_size VARCHAR(100),
  -- Print & Gifts Snapshot
  mini_books INTEGER DEFAULT 0,
  calendars INTEGER DEFAULT 0,
  frames INTEGER DEFAULT 0,
  -- Pricing Snapshot
  subtotal DECIMAL(12, 2) DEFAULT 0,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) DEFAULT 0,
  final_budget DECIMAL(12, 2) DEFAULT NULL,
  -- Payment Tracking
  amount_paid DECIMAL(12, 2) DEFAULT 0,
  balance_due DECIMAL(12, 2) DEFAULT 0,
  -- Status
  status VARCHAR(50) DEFAULT 'Confirmed',
  payment_status VARCHAR(50) DEFAULT 'Pending',
  delivery_status VARCHAR(50) DEFAULT 'Pending',
  delivery_date DATE,
  delivery_notes TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_quotation ON orders(quotation_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_number ON orders(order_number);

-- 6. ORDER ITEMS TABLE
-- Snapshot of quotation items at order creation
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  quotation_item_id UUID,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  category VARCHAR(100),
  description VARCHAR(500) NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(12, 2) DEFAULT 0,
  total_price DECIMAL(12, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_quotation_item ON order_items(quotation_item_id);
CREATE INDEX idx_order_items_category ON order_items(category);

-- 7. PAYMENTS TABLE
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_number VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_type VARCHAR(50),
  payment_method VARCHAR(50) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  reference_number VARCHAR(100),
  bank_name VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Completed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_date ON payments(payment_date);

-- 8. EXPENSES TABLE
-- Expenses are linked to orders and optionally to specific quotation services
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  category VARCHAR(100) DEFAULT 'Miscellaneous',
  vendor_name VARCHAR(255),
  expense_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_order ON expenses(order_id);
CREATE INDEX idx_expenses_order_item ON expenses(order_item_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);

-- 9. SETTINGS TABLE
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SEQUENCE COUNTERS TABLE
CREATE TABLE sequence_counters (
  id VARCHAR(50) PRIMARY KEY,
  year INTEGER NOT NULL,
  counter INTEGER DEFAULT 0
);

-- ============================================
-- STEP 3: INSERT DEFAULT DATA
-- ============================================

-- Settings
INSERT INTO settings (key, value, description) VALUES
  ('company_name', 'Aura Knot', 'Company display name'),
  ('company_email', '', 'Company email address'),
  ('company_phone', '', 'Company phone number'),
  ('company_address', '', 'Company address'),
  ('company_gst', '', 'GST number'),
  ('default_tax_percent', '18', 'Default tax percentage'),
  ('quotation_validity_days', '30', 'Default quotation validity in days'),
  ('quotation_terms', 'Terms and conditions apply.', 'Default quotation terms'),
  ('quotation_prefix', 'QT', 'Quotation number prefix'),
  ('order_prefix', 'ORD', 'Order number prefix'),
  ('payment_prefix', 'PAY', 'Payment number prefix');

-- Sequence counters
INSERT INTO sequence_counters (id, year, counter) VALUES
  ('quotation', 2026, 0),
  ('order', 2026, 0),
  ('payment', 2026, 0);

-- Sample Services
INSERT INTO services (name, category, description, base_price, unit) VALUES
  ('Wedding Photography', 'Photography', 'Full day wedding photography coverage', 50000, 'per event'),
  ('Pre-Wedding Shoot', 'Photography', 'Pre-wedding photo session at location', 25000, 'per session'),
  ('Engagement Photography', 'Photography', 'Engagement ceremony coverage', 15000, 'per event'),
  ('Birthday Photography', 'Photography', 'Birthday party photography', 10000, 'per event'),
  ('Wedding Videography', 'Videography', 'Full wedding video coverage with editing', 75000, 'per event'),
  ('Cinematic Trailer', 'Videography', '3-5 minute cinematic wedding trailer', 20000, 'per piece'),
  ('Drone Coverage', 'Videography', 'Aerial drone footage', 15000, 'per event'),
  ('Traditional Album', 'Album', '12x18 inch traditional photo album - 40 pages', 15000, 'per piece'),
  ('Premium Album', 'Album', '12x36 inch premium flush mount album - 60 pages', 25000, 'per piece'),
  ('Photo Frame 16x24', 'Frame', 'Premium wooden frame with photo print', 3500, 'per piece'),
  ('Photo Frame 20x30', 'Frame', 'Premium wooden frame with photo print', 5000, 'per piece'),
  ('Canvas Print 24x36', 'Frame', 'Gallery wrapped canvas print', 8000, 'per piece');

-- ============================================
-- STEP 4: CREATE FUNCTIONS
-- ============================================

-- Generate Quotation Number
CREATE OR REPLACE FUNCTION generate_quotation_number()
RETURNS VARCHAR AS $$
DECLARE
  current_year INTEGER;
  next_counter INTEGER;
  prefix VARCHAR;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  SELECT value INTO prefix FROM settings WHERE key = 'quotation_prefix';
  IF prefix IS NULL THEN prefix := 'QT'; END IF;
  
  UPDATE sequence_counters 
  SET counter = CASE WHEN year = current_year THEN counter + 1 ELSE 1 END,
      year = current_year
  WHERE id = 'quotation'
  RETURNING counter INTO next_counter;
  
  RETURN prefix || '-' || current_year || '-' || LPAD(next_counter::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate Order Number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR AS $$
DECLARE
  current_year INTEGER;
  next_counter INTEGER;
  prefix VARCHAR;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  SELECT value INTO prefix FROM settings WHERE key = 'order_prefix';
  IF prefix IS NULL THEN prefix := 'ORD'; END IF;
  
  UPDATE sequence_counters 
  SET counter = CASE WHEN year = current_year THEN counter + 1 ELSE 1 END,
      year = current_year
  WHERE id = 'order'
  RETURNING counter INTO next_counter;
  
  RETURN prefix || '-' || current_year || '-' || LPAD(next_counter::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate Payment Number
CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS VARCHAR AS $$
DECLARE
  current_year INTEGER;
  next_counter INTEGER;
  prefix VARCHAR;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  SELECT value INTO prefix FROM settings WHERE key = 'payment_prefix';
  IF prefix IS NULL THEN prefix := 'PAY'; END IF;
  
  UPDATE sequence_counters 
  SET counter = CASE WHEN year = current_year THEN counter + 1 ELSE 1 END,
      year = current_year
  WHERE id = 'payment'
  RETURNING counter INTO next_counter;
  
  RETURN prefix || '-' || current_year || '-' || LPAD(next_counter::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Create Order from Quotation (called when quotation is confirmed)
CREATE OR REPLACE FUNCTION create_order_from_quotation(quotation_uuid UUID)
RETURNS UUID AS $$
DECLARE
  new_order_id UUID;
  new_order_number VARCHAR;
  q RECORD;
  c RECORD;
  qi RECORD;
BEGIN
  -- Get quotation details
  SELECT * INTO q FROM quotations WHERE id = quotation_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found';
  END IF;
  
  IF q.status = 'Confirmed' THEN
    RAISE EXCEPTION 'Quotation already confirmed';
  END IF;
  
  -- Get customer details
  SELECT * INTO c FROM customers WHERE id = q.customer_id;
  
  -- Generate order number
  SELECT generate_order_number() INTO new_order_number;
  
  -- Create order with snapshot data
  INSERT INTO orders (
    order_number, quotation_id, customer_id,
    customer_name, customer_phone, customer_email,
    event_type, event_date, event_end_date, event_venue, event_city, package_type,
    photo_type, photo_area, photo_cameras, photo_rate, photo_session,
    video_type, video_area, video_cameras, video_rate, video_session,
    num_albums, sheets_per_album, total_photos, album_size,
    mini_books, calendars, frames,
    subtotal, discount_percent, discount_amount, tax_amount, total_amount,
    balance_due, status, payment_status
  ) VALUES (
    new_order_number, quotation_uuid, q.customer_id,
    c.name, c.phone, c.email,
    q.event_type, q.event_date, q.event_end_date, q.event_venue, q.event_city, q.package_type,
    q.photo_type, q.photo_area, q.photo_cameras, q.photo_rate, q.photo_session,
    q.video_type, q.video_area, q.video_cameras, q.video_rate, q.video_session,
    q.num_albums, q.sheets_per_album, q.total_photos, q.album_size,
    q.mini_books, q.calendars, q.frames,
    q.subtotal, q.discount_percent, q.discount_amount, q.tax_amount, q.total_amount,
    q.total_amount, 'Confirmed', 'Pending'
  ) RETURNING id INTO new_order_id;
  
  -- Copy quotation items to order items
  FOR qi IN SELECT * FROM quotation_items WHERE quotation_id = quotation_uuid
  LOOP
    INSERT INTO order_items (
      order_id, quotation_item_id, service_id, category,
      description, quantity, unit_price, total_price
    ) VALUES (
      new_order_id, qi.id, qi.service_id, qi.category,
      qi.description, qi.quantity, qi.unit_price, qi.total_price
    );
  END LOOP;
  
  -- Update quotation status and link
  UPDATE quotations 
  SET status = 'Confirmed', 
      order_id = new_order_id,
      confirmed_at = NOW(),
      updated_at = NOW()
  WHERE id = quotation_uuid;
  
  RETURN new_order_id;
END;
$$ LANGUAGE plpgsql;

-- Decline Quotation
CREATE OR REPLACE FUNCTION decline_quotation(quotation_uuid UUID, reason TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE quotations 
  SET status = 'Declined', 
      declined_at = NOW(),
      decline_reason = reason,
      updated_at = NOW()
  WHERE id = quotation_uuid AND status NOT IN ('Confirmed', 'Declined');
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Update Order Payment Status (called by trigger)
CREATE OR REPLACE FUNCTION update_order_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid DECIMAL(12, 2);
  order_total DECIMAL(12, 2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM payments 
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id) 
    AND status = 'Completed';
  
  SELECT total_amount INTO order_total 
  FROM orders 
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  UPDATE orders SET 
    amount_paid = total_paid,
    balance_due = order_total - total_paid,
    payment_status = CASE
      WHEN total_paid >= order_total THEN 'Paid'
      WHEN total_paid > 0 THEN 'Partial'
      ELSE 'Pending'
    END,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 5: CREATE TRIGGERS
-- ============================================

-- Payment status trigger
DROP TRIGGER IF EXISTS trigger_update_order_payment ON payments;
CREATE TRIGGER trigger_update_order_payment
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_order_payment_status();

-- Updated_at triggers
DROP TRIGGER IF EXISTS trigger_customers_updated ON customers;
CREATE TRIGGER trigger_customers_updated
  BEFORE UPDATE ON customers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_services_updated ON services;
CREATE TRIGGER trigger_services_updated
  BEFORE UPDATE ON services 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_quotations_updated ON quotations;
CREATE TRIGGER trigger_quotations_updated
  BEFORE UPDATE ON quotations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_orders_updated ON orders;
CREATE TRIGGER trigger_orders_updated
  BEFORE UPDATE ON orders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_payments_updated ON payments;
CREATE TRIGGER trigger_payments_updated
  BEFORE UPDATE ON payments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- STEP 6: DISABLE ROW LEVEL SECURITY
-- (Required for public access without auth)
-- ============================================
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_counters DISABLE ROW LEVEL SECURITY;

-- ============================================
-- DONE! Schema created successfully.
-- ============================================
-- 
-- Tables created:
--   ✓ customers
--   ✓ services  
--   ✓ quotations (with extended snapshot fields)
--   ✓ quotation_items (with category)
--   ✓ orders (with full snapshot from quotation)
--   ✓ order_items (linked to quotation_items)
--   ✓ payments (with payment_type)
--   ✓ expenses (linked to order_items)
--   ✓ settings
--   ✓ sequence_counters
--
-- Functions created:
--   ✓ generate_quotation_number()
--   ✓ generate_order_number()
--   ✓ generate_payment_number()
--   ✓ create_order_from_quotation()
--   ✓ decline_quotation()
--   ✓ update_order_payment_status()
--   ✓ update_updated_at()
--
-- Key Features:
--   • Quotation → Order workflow with explicit linking
--   • Full data snapshot when order is created
--   • Expenses linked to specific order items
--   • Historical accuracy preserved
--
-- ============================================
