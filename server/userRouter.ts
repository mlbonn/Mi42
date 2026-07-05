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
import { eq, sql } from 'drizzle-orm';
// encryption.ts entfernt (PR C) - CalDAV-Credentials in email_accounts_new
import bcrypt from 'bcryptjs';

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
        email: z.string().email().refine(
          (email) => {
            const allowedDomains = ['bl2020.com', 'BL.cx', 'marktdaten.de'];
            return allowedDomains.some(domain => email.endsWith(`@${domain}`));
          },
          { message: 'Email muss eine @bl2020.com, @BL.cx oder @marktdaten.de Adresse sein' }
        ),
        password: z.string().min(8),
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

      if (existing.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists',
        });
      }

      // Create user
      const userId = crypto.randomUUID();
      
      // Hash password with bcrypt (nur für Login-Auth)
      const bcryptHash = await bcrypt.hash(input.password, 10);
      
      await db.createUser({
        id: userId,
        name: input.name,
        email: input.email,
        passwordHash: bcryptHash,
        role: input.role,
        status: 'active',
        assignedTo: input.assignedTo,
        loginMethod: 'password',
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

  // getAssignedEntities removed - user assignments not needed

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
      // PR C: CalDAV-Credentials in email_accounts_new speichern
      const { encryptCredential } = await import('./credentialService');
      const passwordEncrypted = encryptCredential(input.caldavPassword);
      const existing = await db.getEmailAccounts(ctx.user.id);
      const primary = existing.find((a: any) => a.isPrimary) || existing[0];
      const database = await getDb();
      if (!database) throw new Error('Database not available');
      if (primary) {
        const { emailAccountsNew: eaNew } = await import('../drizzle/schema');
        const { eq: eqOp } = await import('drizzle-orm');
        await database.update(eaNew)
          .set({ emailAddress: input.caldavEmail, passwordEncrypted, useForCaldav: input.caldavEnabled, updatedAt: new Date() })
          .where(eqOp(eaNew.id, primary.id));
      } else {
        await db.createEmailAccount({
          userId: ctx.user.id,
          emailAddress: input.caldavEmail,
          passwordEncrypted,
          serverUrl: 'https://mail.bl2020.com',
          isPrimary: true,
        });
      }
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
        // PR C: CalDAV via email_accounts_new
        const { encryptCredential } = await import('./credentialService');
        const passwordEncrypted = encryptCredential(userUpdate.caldavPassword);
        await db.createEmailAccount({
          userId: userUpdate.userId,
          emailAddress: userUpdate.caldavEmail,
          passwordEncrypted,
          serverUrl: 'https://mail.bl2020.com',
          isPrimary: true,
        });
      }
      
      return { success: true, count: input.users.length };
    }),

  // Revoke all sessions for current user
  revokeAllSessions: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.execute(
      sql`UPDATE sessions SET revokedAt = NOW() WHERE userId = ${ctx.user.id} AND revokedAt IS NULL`
    );
    return { success: true };
  }),
});

