import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  getAllCompanies,
  getCompany,
  getCompaniesByCorporation,
  createCompany,
  updateCompany,
} from "./db";

// Zod Schema für alle Company-Felder
const companySchema = z.object({
  name: z.string().optional(),
  legalForm: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  revenueEur: z.number().optional(),
  products: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
  corporationId: z.string().optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  companyName2: z.string().optional(),
  responsibleUserId: z.string().optional(),
  street: z.string().optional(),
  zip: z.string().optional(),
  state: z.string().optional(),
  poBox: z.string().optional(),
  poBoxZip: z.string().optional(),
  rebate: z.number().optional(),
  priceList: z.string().optional(),
  rebateList: z.string().optional(),
  debitorNumber: z.string().optional(),
  creditorNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  paymentTerm: z.string().optional(),
  currency: z.string().optional(),
  company_type: z.enum(["partner", "supplier", "customer", "staff", "staff_plus", "prospect"]).optional(),
  parent_company_id: z.string().optional(),
  domain: z.string().optional(),
  addressFormat: z.string().optional(),
  branch: z.string().optional(),
  city2: z.string().optional(),
  companySize: z.string().optional(),
  deactivated: z.boolean().optional(),
  district: z.string().optional(),
  email: z.string().optional(),
  externalAddressId: z.string().optional(),
  gwAddressNumber: z.string().optional(),
  name2: z.string().optional(),
  ownerName: z.string().optional(),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  poBoxCity: z.string().optional(),
  stage: z.string().optional(),
  state2: z.string().optional(),
  street2: z.string().optional(),
  taxId: z.string().optional(),
  website2: z.string().optional(),
  zip2: z.string().optional(),
});

export const companiesRouter = router({
  // List all companies with pagination
  list: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        corporationId: z.string().optional(),
        country: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit || 50;
      const offset = input?.offset || 0;
      
      let companies = input?.corporationId
        ? await getCompaniesByCorporation(input.corporationId)
        : await getAllCompanies();
      
      // Apply filters
      if (input?.search) {
        const searchLower = input.search.toLowerCase();
        companies = (companies as any[]).filter(
          (c: any) =>
            c.name?.toLowerCase().includes(searchLower) ||
            c.city?.toLowerCase().includes(searchLower) ||
            c.country?.toLowerCase().includes(searchLower)
        );
      }
      
      if (input?.country) {
        companies = (companies as any[]).filter(
          (c: any) => c.country?.toLowerCase() === input.country?.toLowerCase()
        );
      }
      
      // Apply pagination
      const total = companies.length;
      const paginatedCompanies = companies.slice(offset, offset + limit);
      
      return {
        data: paginatedCompanies,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      };
    }),

  // Get single company by ID
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await getCompany(input.id);
    }),

  // Get companies by corporation
  getByCorporation: publicProcedure
    .input(z.object({ corporationId: z.string() }))
    .query(async ({ input }) => {
      return await getCompaniesByCorporation(input.corporationId);
    }),
  // Alias for listByCorporation (used by frontend)
  listByCorporation: publicProcedure
    .input(z.object({ corporationId: z.string() }))
    .query(async ({ input }) => {
      return await getCompaniesByCorporation(input.corporationId);
    }),

  // Create new company
  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
      }).merge(companySchema.partial())
    )
    .mutation(async ({ input }) => {
      return await createCompany(input as any);
    }),

  // Update company
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }).merge(companySchema)
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await updateCompany(id, data as any);
    }),
});
