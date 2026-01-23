/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Roles:
 * - super_admin: Full access (users, billing, API keys, agents, CRM, analytics)
 * - admin: User management (except super_admin), team API keys, agents, CRM, analytics
 * - staff: CRM full access, own+team deals, outreach, analytics (own+team)
 * - staff_plus: Assigned entities only, create deals, cold calls, LinkedIn research
 */

import { TRPCError } from '@trpc/server';
import * as db from './db';
import { eq, and } from 'drizzle-orm';

export type UserRole = 'super_admin' | 'admin' | 'staff' | 'staff_plus';

/**
 * Check if user has one of the required roles
 */
export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Check if user is admin or higher
 */
export function isAdminOrHigher(userRole: UserRole): boolean {
  return hasRole(userRole, ['super_admin', 'admin']);
}

/**
 * Check if user is staff or higher
 */
export function isStaffOrHigher(userRole: UserRole): boolean {
  return hasRole(userRole, ['super_admin', 'admin', 'staff']);
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(userRole: UserRole): boolean {
  return userRole === 'super_admin';
}

/**
 * Require user to have one of the specified roles
 */
export function requireRole(userRole: UserRole, allowedRoles: UserRole[]): void {
  if (!hasRole(userRole, allowedRoles)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
    });
  }
}

/**
 * Check if a staff_plus user has access to a specific entity
 */
export async function checkEntityAccess(
  userId: string,
  entityType: 'company' | 'contact',
  entityId: string
): Promise<boolean> {
  const user = await db.getUserByIdSingle(userId);
  if (!user) return false;

  // Super admin, admin, and staff have access to all entities
  if (user.role === 'super_admin' || user.role === 'admin' || user.role === 'staff') {
    return true;
  }

  // Staff+ only has access to assigned entities
  if (user.role === 'staff_plus') {
    const assignments = await db.getUserAssignments(userId);
    return assignments.some(
      (a: any) => a.entityType === entityType && a.entityId === entityId
    );
  }

  return false;
}

/**
 * Get all assigned entity IDs for a staff_plus user
 */
export async function getAssignedEntities(
  userId: string,
  entityType: 'company' | 'contact'
): Promise<string[]> {
  const assignments = await db.getUserAssignments(userId);
  return assignments
    .filter((a: any) => a.entityType === entityType)
    .map((a: any) => a.entityId);
}

/**
 * Assign an entity (company or contact) to a staff_plus user
 */
export async function assignEntity(
  userId: string,
  entityType: 'company' | 'contact',
  entityId: string,
  assignedBy: string
): Promise<void> {
  const user = await db.getUserByIdSingle(userId);
  
  if (!user) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'User not found',
    });
  }

  if (user.role !== 'staff_plus') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Can only assign entities to staff_plus users',
    });
  }

  // Check if assignment already exists
  const existing = await db.getUserAssignments(userId);
  const alreadyAssigned = existing.some(
    (a: any) => a.entityType === entityType && a.entityId === entityId
  );

  if (alreadyAssigned) {
    return; // Already assigned
  }

  // Create assignment (using db helper function if available, otherwise direct insert)
  await db.assignUserEntity(userId, entityType, entityId, assignedBy);
}

/**
 * Unassign an entity from a staff_plus user
 */
export async function unassignEntity(
  userId: string,
  entityType: 'company' | 'contact',
  entityId: string
): Promise<void> {
  await db.unassignUserEntity(userId, entityType, entityId);
}


/**
 * Require user to be admin or higher (throws if not)
 */
export async function requireAdminOrHigher(userId: string) {
  const user = await db.getUserByIdSingle(userId);
  if (!user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User not found',
    });
  }

  if (!isAdminOrHigher(user.role as UserRole)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }
  
  return user;
}

/**
 * Require user to be super admin (throws if not)
 */
export async function requireSuperAdmin(userId: string) {
  const user = await db.getUserByIdSingle(userId);
  if (!user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User not found',
    });
  }

  if (!isSuperAdmin(user.role as UserRole)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Super admin access required',
    });
  }
  
  return user;
}


/**
 * Require user to be staff or higher (throws if not)
 */
export async function requireStaffOrHigher(userId: string) {
  const user = await db.getUserByIdSingle(userId);
  if (!user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User not found',
    });
  }

  if (!isStaffOrHigher(user.role as UserRole)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Staff access or higher required',
    });
  }
  
  return user;
}

