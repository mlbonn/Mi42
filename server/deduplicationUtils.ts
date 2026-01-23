// Deduplication Utilities for FRIDAY CRM
// Provides domain and email-based duplicate detection

import { db } from './db';

/**
 * Extract domain from URL or email
 * Examples:
 *   https://www.example.com/path -> example.com
 *   http://example.com -> example.com
 *   www.example.com -> example.com
 *   user@example.com -> example.com
 */
export function extractDomain(input: string): string | null {
  if (!input) return null;
  
  let domain = input.toLowerCase().trim();
  
  // Remove protocol
  domain = domain.replace(/^https?:\/\//, '');
  
  // Remove www
  domain = domain.replace(/^www\./, '');
  
  // Extract domain from email
  if (domain.includes('@')) {
    domain = domain.split('@')[1];
  }
  
  // Remove path and query string
  domain = domain.split('/')[0].split('?')[0];
  
  // Remove port
  domain = domain.split(':')[0];
  
  return domain || null;
}

/**
 * Check for duplicate corporations by domain
 */
export async function findDuplicateCorporationsByDomain(
  domain: string,
  excludeId?: string
): Promise<any[]> {
  if (!domain) return [];
  
  const query = excludeId
    ? `SELECT id, name, domain, website FROM corporations WHERE domain = ? AND id != ?`
    : `SELECT id, name, domain, website FROM corporations WHERE domain = ?`;
  
  const params = excludeId ? [domain, excludeId] : [domain];
  
  return await db.query(query, params);
}

/**
 * Check for duplicate companies by domain
 */
export async function findDuplicateCompaniesByDomain(
  domain: string,
  excludeId?: string
): Promise<any[]> {
  if (!domain) return [];
  
  const query = excludeId
    ? `SELECT id, name, domain, website FROM companies WHERE domain = ? AND id != ?`
    : `SELECT id, name, domain, website FROM companies WHERE domain = ?`;
  
  const params = excludeId ? [domain, excludeId] : [domain];
  
  return await db.query(query, params);
}

/**
 * Check for duplicate contacts by email (across all 5 email fields)
 */
export async function findDuplicateContactsByEmail(
  email: string,
  excludeId?: string
): Promise<any[]> {
  if (!email) return [];
  
  const emailLower = email.toLowerCase().trim();
  
  const query = excludeId
    ? `SELECT id, firstName, lastName, email, email2, email3, email4, email5 
       FROM contacts 
       WHERE (LOWER(email) = ? OR LOWER(email2) = ? OR LOWER(email3) = ? OR LOWER(email4) = ? OR LOWER(email5) = ?)
       AND id != ?`
    : `SELECT id, firstName, lastName, email, email2, email3, email4, email5 
       FROM contacts 
       WHERE LOWER(email) = ? OR LOWER(email2) = ? OR LOWER(email3) = ? OR LOWER(email4) = ? OR LOWER(email5) = ?`;
  
  const params = excludeId
    ? [emailLower, emailLower, emailLower, emailLower, emailLower, excludeId]
    : [emailLower, emailLower, emailLower, emailLower, emailLower];
  
  return await db.query(query, params);
}

/**
 * Get all child corporations
 */
export async function getChildCorporations(parentId: string): Promise<any[]> {
  return await db.query(
    `SELECT id, name, status, priority, country, totalRevenueEur 
     FROM corporations 
     WHERE parent_corporation_id = ?
     ORDER BY name`,
    [parentId]
  );
}

/**
 * Get all child companies
 */
export async function getChildCompanies(parentId: string): Promise<any[]> {
  return await db.query(
    `SELECT id, name, city, country, revenueEur 
     FROM companies 
     WHERE parent_company_id = ?
     ORDER BY name`,
    [parentId]
  );
}

/**
 * Get parent corporation
 */
export async function getParentCorporation(childId: string): Promise<any | null> {
  const results = await db.query(
    `SELECT c2.id, c2.name, c2.status, c2.priority 
     FROM corporations c1
     JOIN corporations c2 ON c1.parent_corporation_id = c2.id
     WHERE c1.id = ?`,
    [childId]
  );
  
  return results[0] || null;
}

/**
 * Get parent company
 */
export async function getParentCompany(childId: string): Promise<any | null> {
  const results = await db.query(
    `SELECT c2.id, c2.name, c2.city, c2.country 
     FROM companies c1
     JOIN companies c2 ON c1.parent_company_id = c2.id
     WHERE c1.id = ?`,
    [childId]
  );
  
  return results[0] || null;
}

/**
 * Get full corporation hierarchy (parents and children)
 */
export async function getCorporationHierarchy(corporationId: string): Promise<{
  parent: any | null;
  current: any;
  children: any[];
}> {
  const current = await db.query(
    `SELECT * FROM corporations WHERE id = ?`,
    [corporationId]
  );
  
  if (!current[0]) {
    throw new Error('Corporation not found');
  }
  
  const parent = await getParentCorporation(corporationId);
  const children = await getChildCorporations(corporationId);
  
  return {
    parent,
    current: current[0],
    children,
  };
}

/**
 * Get full company hierarchy (parents and children)
 */
export async function getCompanyHierarchy(companyId: string): Promise<{
  parent: any | null;
  current: any;
  children: any[];
}> {
  const current = await db.query(
    `SELECT * FROM companies WHERE id = ?`,
    [companyId]
  );
  
  if (!current[0]) {
    throw new Error('Company not found');
  }
  
  const parent = await getParentCompany(companyId);
  const children = await getChildCompanies(companyId);
  
  return {
    parent,
    current: current[0],
    children,
  };
}

/**
 * Validate that setting parent doesn't create circular reference
 */
export async function validateNoCircularReference(
  entityType: 'corporation' | 'company',
  childId: string,
  proposedParentId: string
): Promise<{ valid: boolean; error?: string }> {
  if (childId === proposedParentId) {
    return { valid: false, error: 'Entity cannot be its own parent' };
  }
  
  const table = entityType === 'corporation' ? 'corporations' : 'companies';
  const parentField = entityType === 'corporation' ? 'parent_corporation_id' : 'parent_company_id';
  
  // Check if proposed parent is actually a descendant of child
  let currentId = proposedParentId;
  let depth = 0;
  const maxDepth = 10; // Prevent infinite loops
  
  while (currentId && depth < maxDepth) {
    const result = await db.query(
      `SELECT ${parentField} FROM ${table} WHERE id = ?`,
      [currentId]
    );
    
    if (!result[0]) break;
    
    const parentId = result[0][parentField];
    
    if (parentId === childId) {
      return { valid: false, error: 'Circular reference detected' };
    }
    
    currentId = parentId;
    depth++;
  }
  
  return { valid: true };
}
