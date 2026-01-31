-- ============================================================
-- AURA KNOT - SAFE MIGRATIONS
-- ============================================================
-- ✅ SAFE TO RUN - This file only ADDS things, never deletes
-- Run these commands when you need to add new features
-- ============================================================

-- Add final_budget column to orders (if not exists)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS final_budget DECIMAL(12, 2) DEFAULT NULL;

-- ============================================================
-- Add more migrations below as needed:
-- ============================================================

