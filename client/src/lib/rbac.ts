/**
 * Role-Based Access Control (RBAC) Helpers for Frontend
 */

export type UserRole = 'super_admin' | 'admin' | 'staff' | 'staff_plus';

/**
 * Check if user has one of the specified roles
 */
export function hasRole(userRole: UserRole | undefined, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

/**
 * Check if user is Admin or higher
 */
export function isAdminOrHigher(userRole: UserRole | undefined): boolean {
  return hasRole(userRole, ['super_admin', 'admin']);
}

/**
 * Check if user is Staff or higher
 */
export function isStaffOrHigher(userRole: UserRole | undefined): boolean {
  return hasRole(userRole, ['super_admin', 'admin', 'staff', 'staff_plus']);
}

/**
 * Check if user is Super Admin
 */
export function isSuperAdmin(userRole: UserRole | undefined): boolean {
  return userRole === 'super_admin';
}

/**
 * Menu visibility rules based on role
 */
export const menuVisibility = {
  // CRM Section
  corporations: (role: UserRole | undefined) => isStaffOrHigher(role),
  companies: (role: UserRole | undefined) => isStaffOrHigher(role),
  contacts: (role: UserRole | undefined) => isStaffOrHigher(role),
  pipeline: (role: UserRole | undefined) => isStaffOrHigher(role),
  
  // Scout Agent (Admin+ only)
  scout: (role: UserRole | undefined) => isAdminOrHigher(role),
  
  // Hunter Agent (Admin+ only)
  hunter: (role: UserRole | undefined) => isAdminOrHigher(role),
  
  // Outreach Agent (Staff+ can use, Admin+ can configure)
  outreach: (role: UserRole | undefined) => isStaffOrHigher(role),
  outreachConfig: (role: UserRole | undefined) => isAdminOrHigher(role),
  
  // Analytics
  analytics: (role: UserRole | undefined) => isStaffOrHigher(role),
  
  // Settings
  settings: (role: UserRole | undefined) => isAdminOrHigher(role),
  userManagement: (role: UserRole | undefined) => isAdminOrHigher(role),
};

