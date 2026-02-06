-- ============================================================
-- AURA KNOT - SAFE MIGRATIONS
-- ============================================================
-- ✅ SAFE TO RUN - This file only ADDS things, never deletes
-- Run these commands when you need to add new features
-- ============================================================

-- Add final_budget column to orders (if not exists)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS final_budget DECIMAL(12, 2) DEFAULT NULL;

-- Add order_completed column to orders (if not exists)
-- This field determines if an order is marked as complete
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_completed VARCHAR(10) DEFAULT 'No';

-- Add comprehensive print & gifts columns to quotations table
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS mini_books_comp BOOLEAN DEFAULT false;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS calendars_comp BOOLEAN DEFAULT false;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS frames_comp BOOLEAN DEFAULT false;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS cinematic_teaser INTEGER DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS cinematic_teaser_comp BOOLEAN DEFAULT false;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS traditional_highlight_video INTEGER DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS traditional_highlight_video_comp BOOLEAN DEFAULT false;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS cinematic_candid_video INTEGER DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS cinematic_candid_video_comp BOOLEAN DEFAULT false;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS save_the_date INTEGER DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS save_the_date_comp BOOLEAN DEFAULT false;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS e_invitation INTEGER DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS e_invitation_comp BOOLEAN DEFAULT false;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS other_deliverable VARCHAR(255);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS other_deliverable_qty INTEGER DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS other_deliverable_comp BOOLEAN DEFAULT false;

-- Add comprehensive print & gifts columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mini_books_comp BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS calendars_comp BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS frames_comp BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cinematic_teaser INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cinematic_teaser_comp BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS traditional_highlight_video INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS traditional_highlight_video_comp BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cinematic_candid_video INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cinematic_candid_video_comp BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS save_the_date INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS save_the_date_comp BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS e_invitation INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS e_invitation_comp BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS other_deliverable VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS other_deliverable_qty INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS other_deliverable_comp BOOLEAN DEFAULT false;

-- NOTE: If you have existing orders that should be marked as completed,
-- you need to manually update them in the UI by going to each order's detail page
-- and setting the "Order Completion Status" to "Completed".
-- 
-- Alternatively, if you want to bulk update orders where the event has ended,
-- you can run this query (uncomment and modify as needed):
-- UPDATE orders 
-- SET order_completed = 'Yes' 
-- WHERE order_completed IS NULL OR order_completed = 'No'
--   AND event_end_date < NOW()::date
--   AND YEAR(event_end_date) = 2025;

-- ============================================================
-- Add more migrations below as needed:
-- ============================================================

