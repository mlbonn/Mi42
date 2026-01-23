import { describe, it, expect } from "vitest";

const BASE_URL = "https://46.224.13.250/api/trpc";

// Helper function to make tRPC calls
async function trpcCall(endpoint: string, input?: any, method: "GET" | "POST" = "GET") {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set("batch", "1");

  if (input && method === "GET") {
    const encodedInput = encodeURIComponent(JSON.stringify({ "0": { json: input } }));
    url.searchParams.set("input", encodedInput);
  }

  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (input && method === "POST") {
    options.body = JSON.stringify({ "0": { json: input } });
  }

  const response = await fetch(url.toString(), options);
  const data = await response.json();

  if (data[0].error) {
    throw new Error(data[0].error.json.message);
  }

  return data[0].result.data.json;
}

describe("FRIDAY CRM API - E2E Workflows", () => {
  describe("Workflow 1: Contact Discovery from Email", () => {
    it("should search for contact by email and retrieve full details", async () => {
      // Step 1: Search for contact by email
      const email = "peter.mueller@sika.com";
      const contacts = await trpcCall("contacts.searchByEmail", { email });

      expect(Array.isArray(contacts)).toBe(true);
      expect(contacts.length).toBeGreaterThan(0);

      const contact = contacts[0];
      expect(contact.primaryEmail).toBe(email);

      // Step 2: Get full contact details
      const fullContact = await trpcCall("contacts.get", { id: contact.id });
      expect(fullContact.id).toBe(contact.id);
      expect(fullContact.firstName).toBeDefined();
      expect(fullContact.lastName).toBeDefined();

      // Step 3: Get companies for this contact
      const companies = await trpcCall("contacts.getCompanies", { contactId: contact.id });
      expect(Array.isArray(companies)).toBe(true);

      if (companies.length > 0) {
        // Step 4: Get company details
        const company = await trpcCall("companies.get", { id: companies[0].id });
        expect(company.name).toBeDefined();

        // Step 5: Get corporation if exists
        if (company.corporationId) {
          const corporation = await trpcCall("corporations.get", { id: company.corporationId });
          expect(corporation.name).toBeDefined();
        }
      }
    });
  });

  describe("Workflow 2: Corporation Hierarchy Navigation", () => {
    it("should navigate from corporation to companies to contacts", async () => {
      // Step 1: Get all corporations
      const corporations = await trpcCall("corporations.list");
      expect(Array.isArray(corporations)).toBe(true);
      expect(corporations.length).toBeGreaterThan(0);

      const corporation = corporations[0];

      // Step 2: Get companies for this corporation
      const companies = await trpcCall("companies.list", { corporationId: corporation.id });
      expect(Array.isArray(companies)).toBe(true);

      if (companies.length > 0) {
        const company = companies[0];

        // Step 3: Get contacts for this company
        const contacts = await trpcCall("contacts.list", { companyId: company.id });
        expect(Array.isArray(contacts)).toBe(true);

        // Step 4: Get activities for the corporation
        const activities = await trpcCall("activities.listByCorporation", {
          corporationId: corporation.id,
          limit: 10,
        });
        expect(Array.isArray(activities)).toBe(true);

        // Step 5: Get deals for the corporation
        const deals = await trpcCall("deals.listByCorporation", {
          corporationId: corporation.id,
        });
        expect(Array.isArray(deals)).toBe(true);
      }
    });
  });

  describe("Workflow 3: Activity Tracking", () => {
    it("should retrieve activities across different entity types", async () => {
      // Step 1: Get a contact
      const contacts = await trpcCall("contacts.list");
      expect(contacts.length).toBeGreaterThan(0);
      const contact = contacts[0];

      // Step 2: Get activities for this contact
      const contactActivities = await trpcCall("activities.listByContact", {
        contactId: contact.id,
        limit: 5,
      });
      expect(Array.isArray(contactActivities)).toBe(true);

      // Step 3: Get companies for this contact
      const companies = await trpcCall("contacts.getCompanies", { contactId: contact.id });

      if (companies.length > 0) {
        const company = companies[0];

        // Step 4: Get activities for the company
        const companyActivities = await trpcCall("activities.listByCompany", {
          companyId: company.id,
          limit: 5,
        });
        expect(Array.isArray(companyActivities)).toBe(true);
      }
    });
  });

  describe("Workflow 4: Search and Filter", () => {
    it("should search across multiple entity types", async () => {
      // Step 1: Search contacts
      const contactSearch = await trpcCall("contacts.list", { search: "mueller" });
      expect(Array.isArray(contactSearch)).toBe(true);

      // Step 2: Search companies
      const companySearch = await trpcCall("companies.list", { search: "gmbh" });
      expect(Array.isArray(companySearch)).toBe(true);

      // Step 3: Search corporations
      const corpSearch = await trpcCall("corporations.list", { search: "ag" });
      expect(Array.isArray(corpSearch)).toBe(true);

      // Step 4: Filter companies by country
      const germanCompanies = await trpcCall("companies.list", { country: "Germany" });
      expect(Array.isArray(germanCompanies)).toBe(true);

      if (germanCompanies.length > 0) {
        germanCompanies.forEach((company: any) => {
          if (company.country) {
            expect(company.country.toLowerCase()).toBe("germany");
          }
        });
      }
    });
  });

  describe("Workflow 5: Deal Pipeline", () => {
    it("should retrieve deals across different levels", async () => {
      // Step 1: Get corporations
      const corporations = await trpcCall("corporations.list");
      expect(corporations.length).toBeGreaterThan(0);

      const corporation = corporations[0];

      // Step 2: Get deals for corporation
      const corpDeals = await trpcCall("deals.listByCorporation", {
        corporationId: corporation.id,
      });
      expect(Array.isArray(corpDeals)).toBe(true);

      // Step 3: Get companies for this corporation
      const companies = await trpcCall("companies.list", { corporationId: corporation.id });

      if (companies.length > 0) {
        const company = companies[0];

        // Step 4: Get deals for company
        const companyDeals = await trpcCall("deals.listByCompany", {
          companyId: company.id,
        });
        expect(Array.isArray(companyDeals)).toBe(true);
      }
    });
  });

  describe("Workflow 6: Data Consistency Checks", () => {
    it("should verify referential integrity across entities", async () => {
      // Step 1: Get a company with a corporation
      const companies = await trpcCall("companies.list");
      const companyWithCorp = companies.find((c: any) => c.corporationId);

      if (companyWithCorp) {
        // Step 2: Verify corporation exists
        const corporation = await trpcCall("corporations.get", {
          id: companyWithCorp.corporationId,
        });
        expect(corporation).toBeDefined();
        expect(corporation.id).toBe(companyWithCorp.corporationId);

        // Step 3: Verify company appears in corporation\s company list
