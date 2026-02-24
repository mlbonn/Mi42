// Neue, einfache getArchivedEmails Funktion
getArchivedEmails: publicProcedure
  .input(z.object({ contactId: z.string() }))
  .query(async ({ input }) => {
    const db = await getDb();
    
    const query = `
      SELECT id, from_address, from_name, to_address, subject, body, html_body, email_date, notes
      FROM archived_emails 
      WHERE contact_id = ?
      ORDER BY email_date DESC
    `;
    
    const [rows] = await db.execute(query, [input.contactId]);
    return rows;
  }),
