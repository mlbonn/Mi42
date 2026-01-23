import { router, protectedProcedure } from "./_core/trpc";
import { getAllContacts, getAllCompanies, getAllCorporations, getAllDeals, getAllActivities } from "./db";

export const dashboardRouter = router({
  stats: protectedProcedure.query(async () => {
    const [contacts, companies, corporations, deals, activities] = await Promise.all([
      getAllContacts(),
      getAllCompanies(),
      getAllCorporations(),
      getAllDeals(),
      getAllActivities(),
    ]);

    return {
      contactsCount: contacts.length,
      companiesCount: companies.length,
      corporationsCount: corporations.length,
      dealsCount: deals.length,
      activitiesCount: activities.length,
    };
  }),
});
