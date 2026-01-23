/**
 * User Management Router
 * Handles user CRUD operations and role-based access control
 */

import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import {
  requireAdminOrHigher,
  requireSuperAdmin,
  assignEntity,
  unassignEntity,
} from "./rbac";
import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { encryptPassword, decryptPassword } from './encryption';

export const userRouter = router({
  /**
   * List all users (Admin+ only)
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    // Check permission
    await requireAdminOrHigher(ctx.user.id);

    const allUsers = await db.getAllUsers();
    
    return allUsers.map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      assignedTo: user.assignedTo,
      createdAt: user.createdAt,
      lastSignedIn: user.lastSignedIn,
    }));
  }),

  /**
   * Get user by ID (Admin+ only)
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check permission
      await requireAdminOrHigher(ctx.user.id);

      const user = await db.getUserByIdSingle(input.id);

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        assignedTo: user.assignedTo,
        createdAt: user.createdAt,
        lastSignedIn: user.lastSignedIn,
      };
    }),

  /**
   * Create new user (Admin+ only, Super Admin for creating admins)
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.string().email(),
        role: z.enum(['super_admin', 'admin', 'staff', 'staff_plus']),
        assignedTo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check permission
      const { role: currentUserRole } = await requireAdminOrHigher(ctx.user.id);

      // Only super_admin can create super_admin or admin users
      if ((input.role === 'super_admin' || input.role === 'admin') && currentUserRole !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admin can create admin or super admin users',
        });
      }

      // Check if email already exists
      const existing = await db.getUserByEmail(input.email);

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists',
        });
      }

      // Create user
      const userId = crypto.randomUUID();
      
      await db.createUser({
        id: userId,
        name: input.name,
        email: input.email,
        role: input.role,
        status: 'active',
        assignedTo: input.assignedTo,
        loginMethod: 'oauth',
      });

      return { id: userId, message: 'User created successfully' };
    }),

  /**
   * Update user (Admin+ only, Super Admin for updating admins)
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        role: z.enum(['super_admin', 'admin', 'staff', 'staff_plus']).optional(),
        status: z.enum(['active', 'inactive']).optional(),
        assignedTo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check permission
      const { role: currentUserRole } = await requireAdminOrHigher(ctx.user.id);

      // Get target user
      const targetUser = await db.getUserByIdSingle(input.id);

      if (!targetUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Only super_admin can update super_admin or admin users
      if (
        (targetUser.role === 'super_admin' || targetUser.role === 'admin' || input.role === 'super_admin' || input.role === 'admin') &&
        currentUserRole !== 'super_admin'
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admin can update admin or super admin users',
        });
      }

      // Update user
      await db.updateUser(input.id, {
        name: input.name,
        email: input.email,
        role: input.role,
        status: input.status,
        assignedTo: input.assignedTo,
      });

      return { message: 'User updated successfully' };
    }),

  /**
   * Delete user (Admin+ only, Super Admin for deleting admins)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check permission
      const { role: currentUserRole } = await requireAdminOrHigher(ctx.user.id);

      // Get target user
      const targetUser = await db.getUserByIdSingle(input.id);

      if (!targetUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Only super_admin can delete super_admin or admin users
      if ((targetUser.role === 'super_admin' || targetUser.role === 'admin') && currentUserRole !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admin can delete admin or super admin users',
        });
      }

      // Delete user
      await db.deleteUser(input.id);

      return { message: 'User deleted successfully' };
    }),

  /**
   * Assign entity (company or contact) to staff_plus user
   */
  assignEntity: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        entityType: z.enum(['company', 'contact']),
        entityId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check permission
      await requireAdminOrHigher(ctx.user.id);

      await assignEntity(input.userId, input.entityType, input.entityId, ctx.user.id);

      return { message: 'Entity assigned successfully' };
    }),

  /**
   * Unassign entity from staff_plus user
   */
  unassignEntity: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        entityType: z.enum(['company', 'contact']),
        entityId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check permission
      await requireAdminOrHigher(ctx.user.id);

      await unassignEntity(input.userId, input.entityType, input.entityId);

      return { message: 'Entity unassigned successfully' };
    }),

  /**
   * Get assigned entities for a staff_plus user
   */
  getAssignedEntities: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check permission
      await requireAdminOrHigher(ctx.user.id);

      const assignments = await db.getUserAssignments(input.userId);

      return assignments.map((a: any) => ({
        id: a.id,
        entityType: a.entityType,
        entityId: a.entityId,
        assignedBy: a.assignedBy,
        assignedAt: a.assignedAt,
      }));
    }),

  /**
   * Get current user's CalDAV settings
   */
  getCalDAVSettings: protectedProcedure
    .query(async ({ ctx }) => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');
      
      const user = await database.select({
        caldavEmail: users.caldavEmail,
        caldavEnabled: users.caldavEnabled,
      }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
      
      if (user.length === 0) {
        return { caldavEmail: null, caldavEnabled: false };
      }
      
      return user[0];
    }),

  /**
   * Update current user's CalDAV settings
   */
  updateCalDAVSettings: protectedProcedure
    .input(z.object({
      caldavEmail: z.string().email(),
      caldavPassword: z.string().min(1),
      caldavEnabled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');
      
      // Encrypt password before storing
      const encryptedPassword = encryptPassword(input.caldavPassword);
      
      await database.update(users)
        .set({
          caldavEmail: input.caldavEmail,
          caldavPassword: encryptedPassword,
          caldavEnabled: input.caldavEnabled,
        })
        .where(eq(users.id, ctx.user.id));
      
      return { success: true };
    }),

  /**
   * Admin: Get all users with CalDAV settings
   */
  getAllUsersCalDAV: protectedProcedure
    .query(async ({ ctx }) => {
      // Check if user is admin
      await requireAdminOrHigher(ctx.user.id);
      
      const database = await getDb();
      if (!database) throw new Error('Database not available');
      
      const allUsers = await database.select({
        id: users.id,
        name: users.name,
        email: users.email,
        caldavEmail: users.caldavEmail,
        caldavEnabled: users.caldavEnabled,
      }).from(users);
      
      return allUsers;
    }),

  /**
   * Admin: Bulk update CalDAV settings for multiple users
   */
  bulkUpdateCalDAV: protectedProcedure
    .input(z.object({
      users: z.array(z.object({
        userId: z.string(),
        caldavEmail: z.string().email(),
        caldavPassword: z.string().min(1),
        caldavEnabled: z.boolean(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      await requireAdminOrHigher(ctx.user.id);
      
      const database = await getDb();
      if (!database) throw new Error('Database not available');
      
      // Update each user
      for (const userUpdate of input.users) {
        const encryptedPassword = encryptPassword(userUpdate.caldavPassword);
        
        await database.update(users)
          .set({
            caldavEmail: userUpdate.caldavEmail,
            caldavPassword: encryptedPassword,
            caldavEnabled: userUpdate.caldavEnabled,
          })
          .where(eq(users.id, userUpdate.userId));
      }
      
      return { success: true, count: input.users.length };
    }),
});

