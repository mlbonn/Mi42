import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { sql } from "drizzle-orm";
import {
  getAllContacts,
  getContact,
  getContactsByCompany,
  getCompaniesByContact,
  createContact,
  updateContact,
  addContactToCompany,
  getDb,
} from "./db";
import { archivedEmails   archivedEmailAttachments,
} from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const contactsRouter = router({
  // List all contacts with pagination
  list: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        companyId: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit || 50;
      const offset = input?.offset || 0;
      
      let contacts = input?.companyId
        ? await getContactsByCompany(input.companyId)
        : await getAllContacts();
      
      // Apply search filter
      if (input?.search) {
        const searchLower = input.search.toLowerCase();
        contacts = (contacts as any[]).filter(
          (c: any) =>
            c.firstName?.toLowerCase().includes(searchLower) ||
            c.lastName?.toLowerCase().includes(searchLower) ||
            c.primaryEmail?.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply pagination
      const total = contacts.length;
      const paginatedContacts = contacts.slice(offset, offset + limit);
      
      return {
        data: paginatedContacts,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      };
    }),

  // Get single contact by ID
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await getContact(input.id);
    }),

  // Search contacts by email
  searchByEmail: publicProcedure
    .input(z.object({ email: z.string() }))
    .query(async ({ input }) => {
      const contacts = await getAllContacts();
      return contacts.filter(
        (c: any) => c.primaryEmail?.toLowerCase() === input.email.toLowerCase()
      );
    }),

  // Get companies for a contact
  getCompanies: publicProcedure
    .input(z.object({ contactId: z.string() }))
    .query(async ({ input }) => {
      return await getCompaniesByContact(input.contactId);
    }),

  // List contacts by company
  listByCompany: publicProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ input }) => {
      return await getContactsByCompany(input.companyId);
    }),

  // Create new contact
  create: publicProcedure
    .input(
      z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
        phoneMobile: z.string().optional(),
        phoneOffice: z.string().optional(),
        faxOffice: z.string().optional(),
        title: z.string().optional(),
        jobTitle: z.string().optional(),
        mobile: z.string().optional(),
        linkedinUrl: z.string().optional(),
        contactStatus: z.enum(["cold", "warm", "hot", "active", "inactive"]).optional(),
        decisionMaker: z.boolean().optional(),
        notes: z.string().optional(),
        email2: z.string().email().optional().nullable(),
        email3: z.string().email().optional().nullable(),
        email4: z.string().email().optional().nullable(),
        email5: z.string().email().optional().nullable(),
        position: z.string().optional(),
        department: z.string().optional(),
        function: z.string().optional(),
        contactType: z.enum(["partner", "supplier", "customer", "staff", "staff_plus", "prospect"]).optional(),
        companyId: z.string().optional(),
        isPrimary: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { companyId, isPrimary, ...contactData } = input;
      
      const contact = await createContact(contactData as any, companyId || '');
      return contact;
    }),

  // Update contact
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        phoneMobile: z.string().optional(),
        phoneOffice: z.string().optional(),
        faxOffice: z.string().optional(),
        title: z.string().optional(),
        jobTitle: z.string().optional(),
        mobile: z.string().optional(),
        linkedinUrl: z.string().optional(),
        contactStatus: z.enum(["cold", "warm", "hot", "active", "inactive"]).optional(),
        decisionMaker: z.boolean().optional(),
        notes: z.string().optional(),
        email2: z.string().email().optional().nullable(),
        email3: z.string().email().optional().nullable(),
        email4: z.string().email().optional().nullable(),
        email5: z.string().email().optional().nullable(),
        position: z.string().optional(),
        department: z.string().optional(),
        function: z.string().optional(),
        contactType: z.enum(["partner", "supplier", "customer", "staff", "staff_plus", "prospect"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      return await updateContact(id, data);
    }),

  // Create standalone contact (without company)
  createStandalone: publicProcedure
    .input(
      z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        position: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      // Create contact without company association
      const contactData = {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email || null,
        phone: input.phone || null,
        jobTitle: input.position || null,
      };
      const contact = await createContact(contactData as any, '', input.email || undefined, input.position || undefined);
      return { id: contact };
    }),

  // Add contact to company
  addCompany: publicProcedure
    .input(
      z.object({
        contactId: z.string(),
        companyId: z.string(),
        email: z.string().email().optional(),
        position: z.string().optional(),
        isPrimary: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await addContactToCompany(
        input.contactId,
        input.companyId,
        input.email,
        input.position,
        input.isPrimary
      );
    }),

  // Search contacts by name or email
  searchContacts: publicProcedure
    .input(
      z.object({
        query: z.string(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }
      
      const searchPattern = `%${input.query}%`;
      
      const result = await db.execute(
        sql`SELECT 
          id, firstName, lastName, email, email2, email3, company
        FROM contacts 
        WHERE 
          firstName LIKE ${searchPattern} OR
          lastName LIKE ${searchPattern} OR
          email LIKE ${searchPattern} OR
          email2 LIKE ${searchPattern} OR
          email3 LIKE ${searchPattern} OR
          company LIKE ${searchPattern}
        ORDER BY firstName, lastName
        LIMIT ${input.limit}`
      );
      
      console.log("🔍 Full result object:", JSON.stringify(result, null, 2));
      console.log("📧 Query result rows:", result?.length || 0, "emails");
      return (result as any[]) || [];
    }),

  // Get archived emails for contact
  getArchivedEmails: publicProcedure
    .input(z.object({ contactId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select({
          id: archivedEmails.id,
          emailId: archivedEmails.emailId,
          fromAddress: archivedEmails.fromAddress,
          fromName: archivedEmails.fromName,
          toAddress: archivedEmails.toAddress,
          subject: archivedEmails.subject,
          emailDate: archivedEmails.emailDate,
          body: archivedEmails.body,
          htmlBody: archivedEmails.htmlBody,
          notes: archivedEmails.notes,
          archivedAt: archivedEmails.archivedAt,
        })
        .from(archivedEmails)
        .where(eq(archivedEmails.contactId, input.contactId))
        .orderBy(desc(archivedEmails.emailDate));
      return rows.map(r => ({
        id: r.emailId || r.id,
        from_address: r.fromAddress,
        from_name: r.fromName,
        to_address: r.toAddress,
        subject: r.subject,
        email_date: r.emailDate ? r.emailDate.toISOString() : null,
        body: r.body,
        html_body: r.htmlBody,
        notes: r.notes,
        archived_at: r.archivedAt ? r.archivedAt.toISOString() : null,
      }));
    }),

  // Anhänge einer archivierten E-Mail abrufen
  getArchivedEmailAttachments: publicProcedure
    .input(z.object({ archivedEmailId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const rows = await db
        .select()
        .from(archivedEmailAttachments)
        .where(eq(archivedEmailAttachments.archivedEmailId, input.archivedEmailId))
        .orderBy(archivedEmailAttachments.createdAt);
      return rows;
    }),

});