-- Find duplicates and keep only the oldest (smallest id) for each firstName/lastName combination
DELETE c1 FROM contacts c1
INNER JOIN contacts c2 
WHERE c1.firstName = c2.firstName 
  AND c1.lastName = c2.lastName 
  AND c1.id > c2.id;

-- Show remaining duplicates (should be 0)
SELECT firstName, lastName, COUNT(*) as count 
FROM contacts 
GROUP BY firstName, lastName 
HAVING count > 1;
