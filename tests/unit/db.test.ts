import { describe, it, expect, beforeAll } from "vitest";
import {
  getDb,
  getAllContacts,
  getContact,
  getAllCompanies,
  getCompany,
  getAllCorporations,
  getCorporation,
} from "../../server/db";

describe("Database Functions - Unit Tests", () => {
  beforeAll(async () => {
    // Ensure database connection is established
    const db = await getDb();
    expect(db).toBeDefined();
  });

  describe("Contacts", () => {
    it("should fetch all contacts", async () => {
      const contacts = await getAllContacts();
      expect(Array.isArray(contacts)).toBe(true);
      expect(contacts.length).toBeGreaterThan(0);
    });

    it("should fetch a single contact by ID", async () => {
      const contacts = await getAllContacts();
      if (contacts.length > 0) {
        const firstContact = contacts[0];
        const contact = await getContact(firstContact.id);
        expect(contact).toBeDefined();
        expect(contact.id).toBe(firstContact.id);
        expect(contact.firstName).toBeDefined();
        expect(contact.lastName).toBeDefined();
      }
    });

    it("should return null for non-existent contact", async () => {
      const contact = await getContact("non-existent-id");
      expect(contact).toBeNull();
    });
  });

  describe("Companies", () => {
    it("should fetch all companies", async () => {
      const companies = await getAllCompanies();
      expect(Array.isArray(companies)).toBe(true);
      expect(companies.length).toBeGreaterThan(0);
    });

    it("should fetch a single company by ID", async () => {
      const companies = await getAllCompanies();
      if (companies.length > 0) {
        const firstCompany = companies[0];
        const company = await getCompany(firstCompany.id);
        expect(company).toBeDefined();
        expect(company.id).toBe(firstCompany.id);
        expect(company.name).toBeDefined();
      }
    });

    it("should return null for non-existent company", async () => {
      const company = await getCompany("non-existent-id");
      expect(company).toBeNull();
    });
  });

  describe("Corporations", () => {
    it("should fetch all corporations", async () => {
      const corporations = await getAllCorporations();
      expect(Array.isArray(corporations)).toBe(true);
      expect(corporations.length).toBeGreaterThan(0);
    });

    it("should fetch a single corporation by ID", async () => {
      const corporations = await getAllCorporations();
      if (corporations.length > 0) {
        const firstCorp = corporations[0];
        const corp = await getCorporation(firstCorp.id);
        expect(corp).toBeDefined();
        expect(corp.id).toBe(firstCorp.id);
        expect(corp.name).toBeDefined();
      }
    });

    it("should return null for non-existent corporation", async () => {
      const corp = await getCorporation("non-existent-id");
      expect(corp).toBeNull();
    });
  });

  describe("Data Integrity", () => {
    it("contacts should have valid email format", async () => {
      const contacts = await getAllContacts();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      contacts.forEach((contact: any) => {
        if (contact.primaryEmail) {
          expect(emailRegex.test(contact.primaryEmail)).toBe(true);
        }
      });
    });

    it("companies should have valid names", async () => {
      const companies = await getAllCompanies();
      
      companies.forEach((company: any) => {
        expect(company.name).toBeDefined();
        expect(company.name.length).toBeGreaterThan(0);
      });
    });

    it("corporations should have valid names", async () => {
      const corporations = await getAllCorporations();
      
      corporations.forEach((corp: any) => {
        expect(corp.name).toBeDefined();
        expect(corp.name.length).toBeGreaterThan(0);
      });
    });
  });
});
