import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "../../server/routers";
import type { Context } from "../../server/_core/context";

// Mock context for testing
const createMockContext = (): Context => ({
  req: {
    cookies: {},
    headers: {},
  } as any,
  res: {
    cookie: () => {},
    clearCookie: () => {},
  } as any,
  user: null,
});

describe("tRPC Routers - Integration Tests", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);
  });

  describe("Contacts Router", () => {
    it("should list all contacts", async () => {
      const result = await caller.contacts.list();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should search contacts by email", async () => {
      const allContacts = await caller.contacts.list();
      if (allContacts.length > 0 && allContacts[0].primaryEmail) {
        const email = allContacts[0].primaryEmail;
        const result = await caller.contacts.searchByEmail({ email });
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].primaryEmail).toBe(email);
      }
    });

    it("should get a single contact", async () => {
      const allContacts = await caller.contacts.list();
      if (allContacts.length > 0) {
        const id = allContacts[0].id;
        const result = await caller.contacts.get({ id });
        expect(result).toBeDefined();
        expect(result.id).toBe(id);
      }
    });

    it("should filter contacts by company", async () => {
      const companies = await caller.companies.list();
      if (companies.length > 0) {
        const companyId = companies[0].id;
        const result = await caller.contacts.list({ companyId });
        expect(Array.isArray(result)).toBe(true);
      }
    });
  });

  describe("Companies Router", () => {
    it("should list all companies", async () => {
      const result = await caller.companies.list();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should get a single company", async () => {
      const allCompanies = await caller.companies.list();
      if (allCompanies.length > 0) {
        const id = allCompanies[0].id;
        const result = await caller.companies.get({ id });
        expect(result).toBeDefined();
        expect(result.id).toBe(id);
      }
    });

    it("should filter companies by corporation", async () => {
      const corporations = await caller.corporations.list();
      if (corporations.length > 0) {
        const corporationId = corporations[0].id;
        const result = await caller.companies.list({ corporationId });
        expect(Array.isArray(result)).toBe(true);
      }
    });

    it("should search companies by name", async () => {
      const allCompanies = await caller.companies.list();
      if (allCompanies.length > 0) {
        const searchTerm = allCompanies[0].name.substring(0, 3);
        const result = await caller.companies.list({ search: searchTerm });
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Corporations Router", () => {
    it("should list all corporations", async () => {
      const result = await caller.corporations.list();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should get a single corporation", async () => {
      const allCorporations = await caller.corporations.list();
      if (allCorporations.length > 0) {
        const id = allCorporations[0].id;
        const result = await caller.corporations.get({ id });
        expect(result).toBeDefined();
        expect(result.id).toBe(id);
      }
    });

    it("should search corporations by name", async () => {
      const allCorporations = await caller.corporations.list();
      if (allCorporations.length > 0) {
        const searchTerm = allCorporations[0].name.substring(0, 3);
        const result = await caller.corporations.list({ search: searchTerm });
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      }
    });

    it("should filter corporations by status", async () => {
      const allCorporations = await caller.corporations.list();
      if (allCorporations.length > 0 && allCorporations[0].status) {
        const status = allCorporations[0].status;
        const result = await caller.corporations.list({ status });
        expect(Array.isArray(result)).toBe(true);
        result.forEach((corp: any) => {
          expect(corp.status).toBe(status);
        });
      }
    });
  });

  describe("Activities Router", () => {
    it("should list activities by contact", async () => {
      const contacts = await caller.contacts.list();
      if (contacts.length > 0) {
        const contactId = contacts[0].id;
        const result = await caller.activities.listByContact({ contactId });
        expect(Array.isArray(result)).toBe(true);
      }
    });

    it("should list activities by company", async () => {
      const companies = await caller.companies.list();
      if (companies.length > 0) {
        const companyId = companies[0].id;
        const result = await caller.activities.listByCompany({ companyId });
        expect(Array.isArray(result)).toBe(true);
      }
    });

    it("should list activities by corporation", async () => {
      const corporations = await caller.corporations.list();
      if (corporations.length > 0) {
        const corporationId = corporations[0].id;
        const result = await caller.activities.listByCorporation({ corporationId });
        expect(Array.isArray(result)).toBe(true);
      }
    });
  });

  describe("Deals Router", () => {
    it("should list deals by corporation", async () => {
      const corporations = await caller.corporations.list();
      if (corporations.length > 0) {
        const corporationId = corporations[0].id;
        const result = await caller.deals.listByCorporation({ corporationId });
        expect(Array.isArray(result)).toBe(true);
      }
    });

    it("should list deals by company", async () => {
      const companies = await caller.companies.list();
      if (companies.length > 0) {
        const companyId = companies[0].id;
        const result = await caller.deals.listByCompany({ companyId });
        expect(Array.isArray(result)).toBe(true);
      }
    });
  });

  describe("Cross-Router Integration", () => {
    it("should maintain data consistency across routers", async () => {
      const corporations = await caller.corporations.list();
      if (corporations.length > 0) {
        const corp = corporations[0];
        
        // Get companies for this corporation
        const companies = await caller.companies.list({ corporationId: corp.id });
        
        // Verify all companies belong to this corporation
        companies.forEach((company: any) => {
          if (company.corporationId) {
            expect(company.corporationId).toBe(corp.id);
          }
        });
      }
    });

    it("should handle empty results gracefully", async () => {
      const result = await caller.contacts.searchByEmail({ email: "nonexistent@example.com" });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
});
