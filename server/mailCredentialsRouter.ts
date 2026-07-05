import { z } from 'zod';
import { publicProcedure, router } from './_core/trpc';
import { encryptPassword, decryptPassword } from './credentialEncryption';
import { v4 as uuidv4 } from 'uuid';

const mailCredentialsSchema = z.object({
  mailServerHost: z.string().min(1),
  mailServerPort: z.number().min(1).max(65535),
  mailServerUsername: z.string().min(1),
  mailServerPassword: z.string().min(1),
  mailServerUseSsl: z.boolean().default(true),
  mailServerUseTls: z.boolean().default(false),
});

export const mailCredentialsRouter = router({
  /**
   * Speichert Mail-Server Credentials verschlüsselt
   */
  saveCredentials: publicProcedure
    .input(mailCredentialsSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new Error('Unauthorized');
      
      try {
        const encryptedPassword = encryptPassword(input.mailServerPassword);
        const credentialId = uuidv4();
        
        // In echtem Code würde hier die DB Query sein
        // Für jetzt nur Mock
        console.log('Saving credentials for user:', ctx.user?.id);
        
        return {
          success: true,
          credentialId,
          message: 'Credentials saved successfully',
        };
      } catch (error) {
        console.error('Error saving credentials:', error);
        throw new Error('Failed to save credentials');
      }
    }),

  /**
   * Ruft Mail-Server Credentials ab (entschlüsselt)
   */
  getCredentials: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user?.id) throw new Error('Unauthorized');
      
      try {
        // In echtem Code würde hier die DB Query sein
        // Für jetzt nur Mock
        return {
          mailServerHost: 'mail.example.com',
          mailServerPort: 993,
          mailServerUsername: 'test@example.com',
          mailServerUseSsl: true,
          mailServerUseTls: false,
        };
      } catch (error) {
        console.error('Error retrieving credentials:', error);
        throw new Error('Failed to retrieve credentials');
      }
    }),

  /**
   * Testet die Mail-Server Verbindung
   */
  testConnection: publicProcedure
    .input(mailCredentialsSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new Error('Unauthorized');
      
      try {
        // Hier würde die echte IMAP Verbindung getestet
        console.log('Testing connection to:', input.mailServerHost);
        
        return {
          success: true,
          message: 'Connection test passed',
        };
      } catch (error) {
        console.error('Connection test failed:', error);
        return {
          success: false,
          message: 'Connection test failed',
          error: (error as Error).message,
        };
      }
    }),

  /**
   * Löscht Mail-Server Credentials
   */
  deleteCredentials: publicProcedure
    .mutation(async ({ ctx }) => {
      if (!ctx.user?.id) throw new Error('Unauthorized');
      
      try {
        // In echtem Code würde hier die DB Query sein
        console.log('Deleting credentials for user:', ctx.user?.id);
        
        return {
          success: true,
          message: 'Credentials deleted successfully',
        };
      } catch (error) {
        console.error('Error deleting credentials:', error);
        throw new Error('Failed to delete credentials');
      }
    }),
});
