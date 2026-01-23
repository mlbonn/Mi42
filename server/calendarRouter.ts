import { router, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import {
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  CalDAVConfig,
  CalendarEvent,
} from './caldav';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { decryptPassword } from './encryption';

// Single color for all users (monochrome Apollo/Notion style)
const USER_COLOR = '#6b7280'; // gray-500

/**
 * Get CalDAV config for a specific calendar
 */
function getCalDAVConfig(calendarType: 'team' | string): CalDAVConfig | null {
  if (calendarType === 'team') {
    return {
      serverUrl: process.env.CALDAV_SERVER_URL || '',
      username: process.env.CALDAV_TEAM_USER || '',
      password: process.env.CALDAV_TEAM_PASSWORD || '',
    };
  }

  // Individual user calendars (from environment or database)
  const users = (process.env.CALDAV_USERS || '').split(',').filter(Boolean);
  const userIndex = users.indexOf(calendarType);
  
  if (userIndex === -1) {
    return null;
  }

  // Extract username from email (e.g., "ml@bl2020.com" → "ml")
  const username = calendarType.split('@')[0];
  const domain = calendarType.split('@')[1] || 'bl2020.com';
  
  // SmarterMail WebDAV URL structure:
  // https://mail.bl2020.com/webdav/principals/[domain]/[username]/
  const baseUrl = process.env.CALDAV_BASE_URL || 'https://mail.bl2020.com';
  const serverUrl = `${baseUrl}/webdav/principals/${domain}/${username}/`;

  return {
    serverUrl,
    username: calendarType, // Full email as username
    password: process.env.CALDAV_USER_PASSWORD || '',
  };
}

/**
 * Get all calendar configs from database (uses FRIDAY user email + password directly)
 */
async function getAllCalendarConfigs(): Promise<Array<{ type: string; config: CalDAVConfig; color: string }>> {
  const configs: Array<{ type: string; config: CalDAVConfig; color: string }> = [];

  const db = await getDb();
  if (!db) return configs;

  // Get all FRIDAY users (use their email + password for CalDAV)
  const allUsers = await db.select({
    id: users.id,
    email: users.email,
    passwordHash: users.passwordHash,
  }).from(users);

  // Build configs for each user (use FRIDAY email + decrypted password)
  for (const user of allUsers) {
    if (!user.email || !user.passwordHash) continue;

    // Skip if passwordHash doesn't contain encrypted password (old users)
    // Format: "bcrypt_hash|encrypted_password" or just "bcrypt_hash"
    const parts = user.passwordHash.split('|');
    if (parts.length < 2) continue; // No encrypted password stored

    try {
      // Decrypt CalDAV password from second part
      const encryptedPassword = parts[1];
      const password = decryptPassword(encryptedPassword);

      // Extract username and domain from FRIDAY email
      const username = user.email.split('@')[0];
      const domain = user.email.split('@')[1] || 'bl2020.com';

      // Build WebDAV URL
      const baseUrl = process.env.CALDAV_BASE_URL || 'https://mail.bl2020.com';
      const serverUrl = `${baseUrl}/webdav/principals/${domain}/${username}/`;

      configs.push({
        type: user.email,
        config: {
          serverUrl,
          username: user.email,
          password,
        },
        color: USER_COLOR,
      });
    } catch (error) {
      console.error(`Failed to decrypt password for user ${user.id}:`, error);
    }
  }

  return configs;
}

export const calendarRouter = router({
  /**
   * Get all events from all calendars (team + individual)
   */
  getEvents: protectedProcedure
    .input(z.object({
      start: z.string(),
      end: z.string(),
      calendars: z.array(z.string()).optional(), // Filter by calendar types
    }))
    .query(async ({ input }) => {
      const start = new Date(input.start);
      const end = new Date(input.end);
      
      const allConfigs = await getAllCalendarConfigs();
      
      // Handle "Team (Alle)" view - show all users
      let filteredConfigs = allConfigs;
      if (input.calendars) {
        const hasTeamView = input.calendars.includes('__team_view__');
        const otherCalendars = input.calendars.filter(c => c !== '__team_view__');
        
        if (hasTeamView && otherCalendars.length > 0) {
          // Team view + specific calendars: show all
          filteredConfigs = allConfigs;
        } else if (hasTeamView) {
          // Only team view: show all users
          filteredConfigs = allConfigs;
        } else {
          // Specific calendars only
          filteredConfigs = allConfigs.filter(c => input.calendars!.includes(c.type));
        }
      }

      // Fetch events from all calendars in parallel
      const eventsPromises = filteredConfigs.map(async ({ type, config, color }) => {
        const events = await fetchCalendarEvents(config, start, end);
        // Extract user prefix (e.g., "rh@bl2020.com" → "RH")
        const userPrefix = type.split('@')[0].toUpperCase();
        return events.map(event => ({
          ...event,
          title: `${userPrefix}: ${event.title}`, // Add user prefix to title
          calendar: type,
          color,
        }));
      });

      const eventsArrays = await Promise.all(eventsPromises);
      const allEvents = eventsArrays.flat();

      return allEvents;
    }),

  /**
   * Get list of available calendars
   */
  getCalendars: protectedProcedure
    .query(async () => {
      console.log("[CALENDAR] getCalendars called");
      
      // Always start with Team view
      const calendars: Array<{ id: string; name: string; color: string; type: string }> = [{
        id: '__team_view__',
        name: 'Team (Alle)',
        color: '#6b7280',
        type: 'team_view',
      }];
      
      try {
        const configs = await getAllCalendarConfigs();
        console.log("[CALENDAR] Loaded", configs.length, "user configs");
        
        for (const { type, color } of configs) {
          calendars.push({
            id: type,
            name: type === 'team' ? 'Team-Kalender' : type.split('@')[0],
            color,
            type: type === 'team' ? 'team' : 'individual',
          });
        }
      } catch (error) {
        console.error("[CALENDAR] Error loading configs:", error);
      }
      
      console.log("[CALENDAR] Returning", calendars.length, "calendars");
      return calendars;
    }),

  /**
   * Create a new event
   */
  createEvent: protectedProcedure
    .input(z.object({
      calendar: z.string(),
      summary: z.string(),
      description: z.string().optional(),
      start: z.string(),
      end: z.string(),
      location: z.string().optional(),
      attendees: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const config = getCalDAVConfig(input.calendar);
      
      if (!config) {
        throw new Error('Calendar not found');
      }

      const eventId = await createCalendarEvent(config, {
        summary: input.summary,
        description: input.description,
        start: new Date(input.start),
        end: new Date(input.end),
        location: input.location,
        attendees: input.attendees,
      });

      return { success: true, eventId };
    }),

  /**
   * Update an existing event
   */
  updateEvent: protectedProcedure
    .input(z.object({
      calendar: z.string(),
      eventId: z.string(),
      summary: z.string().optional(),
      description: z.string().optional(),
      start: z.string().optional(),
      end: z.string().optional(),
      location: z.string().optional(),
      attendees: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const config = getCalDAVConfig(input.calendar);
      
      if (!config) {
        throw new Error('Calendar not found');
      }

      await updateCalendarEvent(config, input.eventId, {
        summary: input.summary,
        description: input.description,
        start: input.start ? new Date(input.start) : undefined,
        end: input.end ? new Date(input.end) : undefined,
        location: input.location,
        attendees: input.attendees,
      });

      return { success: true };
    }),

  /**
   * Delete an event
   */
  deleteEvent: protectedProcedure
    .input(z.object({
      calendar: z.string(),
      eventId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const config = getCalDAVConfig(input.calendar);
      
      if (!config) {
        throw new Error('Calendar not found');
      }

      await deleteCalendarEvent(config, input.eventId);

      return { success: true };
    }),
});

