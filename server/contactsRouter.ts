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
        contacts = contacts.filter(
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
      
      const contact = await createContact(contactData, companyId, isPrimary);
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
      console.log("📧 Query result rows:", result.rows?.length || 0, "emails");
      return mappedResult;
    }),

  // Get archived emails for contact
  getArchivedEmails: publicProcedure
    .input(
      z.object({
        contactId: z.string(),
      })
    )
    .query(async ({ input }) => {
      console.log("🔍 getArchivedEmails INPUT:", input);
      console.log("🔍 contactId:", input.contactId, "Type:", typeof input.contactId);
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }
      
      const result = await db.execute(
        sql`SELECT 
          id, email_id, from_address, from_name, to_address, 
          subject, email_date, notes, archived_at
        FROM archived_emails 
        WHERE contact_id = ${input.contactId} 
        ORDER BY email_date DESC`
      );
      
      console.log("🔍 Full result object:", JSON.stringify(result, null, 2));
      console.log("📧 Query result rows:", result.rows?.length || 0, "emails");
      console.log("🔍 result type:", Array.isArray(result) ? "array" : typeof result);
      console.log("🔍 result keys:", Object.keys(result));
      console.log("🔍 result[0]:", result[0]);
      // Map database fields to frontend expected format
      const rows = result.rows || result[0] || result;
      const mappedResult = (Array.isArray(rows) ? rows : []).map((email: any) => ({
        id: email.email_id,
        from_address: email.from_address,
        from_name: email.from_name,
        to_address: email.to_address,
        subject: email.subject,
        email_date: email.email_date,
        timestamp: email.email_date,
        notes: email.notes,
        archived_at: email.archived_at,
      }));
      return mappedResult;
    }),
});
