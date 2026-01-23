-- Find all companies
SELECT id, name FROM companies WHERE name LIKE '%Zalando%' OR name LIKE '%Delivery Hero%';

-- Delete contact_company_relations for these companies
DELETE FROM contact_company_relations 
WHERE companyId IN (
  SELECT id FROM companies WHERE name LIKE '%Zalando%' OR name LIKE '%Delivery Hero%'
);

-- Delete deals for these companies
DELETE FROM deals 
WHERE companyId IN (
  SELECT id FROM companies WHERE name LIKE '%Zalando%' OR name LIKE '%Delivery Hero%'
);

-- Delete activities for these companies
DELETE FROM activities 
WHERE companyId IN (
  SELECT id FROM companies WHERE name LIKE '%Zalando%' OR name LIKE '%Delivery Hero%'
);

-- Delete the companies
DELETE FROM companies WHERE name LIKE '%Zalando%' OR name LIKE '%Delivery Hero%';
