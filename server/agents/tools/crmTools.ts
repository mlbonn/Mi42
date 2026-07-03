import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import {
  contacts,
  contactCompanyRelations,
  companies,
  corporations,
  activities,
} from "../../../drizzle/schema";

export const crmTools = {
  async getContactContext(input: { contactId: string }) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const contactRows = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, input.contactId))
      .limit(1);

    if (!contactRows[0]) return null;

    const relations = await db
      .select()
      .from(contactCompanyRelations)
      .where(eq(contactCompanyRelations.contactId, input.contactId));

    const companyIds = relations
      .map((r) => r.companyId)
      .filter(Boolean) as string[];

    let company = null;
    let corporation = null;

    if (companyIds[0]) {
      const companyRows = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyIds[0]))
        .limit(1);
      company = companyRows[0] ?? null;

      if (company?.corporationId) {
        const corpRows = await db
          .select()
          .from(corporations)
          .where(eq(corporations.id, company.corporationId))
          .limit(1);
        corporation = corpRows[0] ?? null;
      }
    }

    return {
      contact: contactRows[0],
      company,
      corporation,
      relations,
    };
  },

  async getCorporationContext(input: { corporationId: string }) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const corpRows = await db
      .select()
      .from(corporations)
      .where(eq(corporations.id, input.corporationId))
      .limit(1);

    const corporation = corpRows[0] ?? null;
    if (!corporation) return null;

    const companyRows = await db
      .select()
      .from(companies)
      .where(eq(companies.corporationId, input.corporationId));

    const activityRows = await db
      .select()
      .from(activities)
      .where(eq(activities.corporationId, input.corporationId))
      .limit(20);

    return {
      corporation,
      companies: companyRows,
      activities: activityRows,
    };
  },
};
