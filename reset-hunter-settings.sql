-- Reset Hunter Settings to optimized defaults
-- Run this on Hetzner: mysql -u bluser -p friday_crm < reset-hunter-settings.sql

-- Delete old settings
DELETE FROM hunter_settings;

-- Insert new optimized settings
INSERT INTO hunter_settings (
  id, 
  personTitles, 
  personSeniorities, 
  departments, 
  targetCount,
  createdAt,
  updatedAt
) VALUES (
  UUID(),
  '[]',  -- Empty = all titles (broader search)
  '["c_suite","vp","director","manager"]',  -- Broader seniority range
  '[]',  -- Empty = all departments (broader search)
  10,  -- Increased from 5 to 10
  NOW(),
  NOW()
);

-- Verify settings
SELECT * FROM hunter_settings;

