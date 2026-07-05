import { router, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import {
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  CalDAVConfig,
  CalendarEvent,
  getCalDAVClient,
} from './caldav';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import * as db from './db';

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
 * NOW INCLUDES ALL CALENDARS (own + shared) for each user
 */
async function getAllCalendarConfigs(): Promise<Array<{ 
  type: string; 
  config: CalDAVConfig; 
  color: string;
  displayName: string;
  calendarUrl: string;
  owner: string;
}>> {
  const configs: Array<{ 
    type: string; 
    config: CalDAVConfig; 
    color: string;
    displayName: string;
    calendarUrl: string;
    owner: string;
  }> = [];

  const db = await getDb();
  if (!db) return configs;

  // Get all FRIDAY users (use their email + password for CalDAV)
  // Get all FRIDAY users
  const allUsers = await db.select({
    id: users.id,
    email: users.email,
  }).from(users);
  console.log("[CALENDAR] Found", allUsers.length, "users in database");
  // Build configs for each user using getCaldavCredentials
  for (const user of allUsers) {
    if (!user.email) continue;
    const creds = await (db as any).getCaldavCredentials(user.id);
    if (!creds) {
      console.log("[CALENDAR] Skipping user", user.email, "- no CalDAV credentials in email_accounts_new");
      continue;
    }
    const password = creds.password;

    try {

      // Extract username and domain from FRIDAY email
      const username = user.email.split('@')[0];
      const domain = user.email.split('@')[1] || 'bl2020.com';

      // Build WebDAV URL
      const baseUrl = process.env.CALDAV_BASE_URL || 'https://mail.bl2020.com';
      const serverUrl = `${baseUrl}/webdav/principals/${domain}/${username}/`;

      // NEW: Fetch ALL calendars for this user (own + shared)
      const client = await getCalDAVClient({
        serverUrl,
        username: user.email,
        password,
      });
      
      const calendars = await client.fetchCalendars();
      console.log("[CALENDAR] User", user.email, "has", calendars.length, "calendars");

      // Add each calendar as separate config
      for (const calendar of calendars) {
        const calendarId = `${user.email}:${calendar.url}`;
        configs.push({
          type: calendarId,
          config: {
            serverUrl,
            username: user.email,
            password,
          },
          color: USER_COLOR,
          displayName: (calendar.displayName as string) || 'Calendar',
          calendarUrl: calendar.url,
          owner: user.email,
        });
        console.log("[CALENDAR] Added calendar:", calendar.displayName, "for", user.email);
      }
    } catch (error) {
      console.error(`[CALENDAR] Failed to load calendars for user ${user.email}:`, error);
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
      const eventsPromises = filteredConfigs.map(async ({ type, config, color, displayName, calendarUrl, owner }) => {
        const events = await fetchCalendarEvents(config, start, end, calendarUrl);
        // Extract user prefix (e.g., "rh@bl2020.com" → "RH")
        const userPrefix = owner.split('@')[0].toUpperCase();
        return events.map(event => ({
          ...event,
          title: `${userPrefix}: ${(event as any).title}`, // Add user prefix to title
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
        console.log("[CALENDAR] Loaded", configs.length, "calendar configs");
        
        for (const { type, color, displayName, owner } of configs) {
          // Format calendar name based on displayName
          const ownerPrefix = owner.split('@')[0];
          
          // Detect shared calendars by checking if displayName contains another user's name
          const isOwnCalendar = displayName.toLowerCase() === 'my calendar' || 
                               displayName.toLowerCase() === 'calendar';
          const isTaskCalendar = displayName.toLowerCase().includes('task');
          
          let name: string;
          if (isOwnCalendar) {
            name = ownerPrefix; // "agent33"
          } else if (isTaskCalendar) {
            name = `${ownerPrefix} (Tasks)`; // "agent33 (Tasks)"
          } else {
            // Shared calendar: show only the owner's name
            // "agent601 - My Calendar" → "agent601"
            // "pn - Calendar" → "pn"
            const sharedUser = displayName.split(' - ')[0];
            name = sharedUser;
          }
          
          calendars.push({
            id: type,
            name,
            color,
            type: 'individual',
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
      title: z.string(),
      start: z.string(),
      end: z.string(),
      description: z.string().optional(),
      location: z.string().optional(),
      attendees: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const config = getCalDAVConfig(input.calendar);
      if (!config) {
        throw new Error(`Calendar ${input.calendar} not found`);
      }

      const eventId = await createCalendarEvent(config, {
        summary: input.title,
        start: new Date(input.start),
        end: new Date(input.end),
        description: input.description,
        location: input.location,
        attendees: input.attendees,
      });

      return { id: eventId };
    }),

  /**
   * Update an existing event
   */
  updateEvent: protectedProcedure
    .input(z.object({
      calendar: z.string(),
      eventId: z.string(),
      title: z.string(),
      start: z.string(),
      end: z.string(),
      description: z.string().optional(),
      location: z.string().optional(),
      attendees: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const config = getCalDAVConfig(input.calendar);
      if (!config) {
        throw new Error(`Calendar ${input.calendar} not found`);
      }

      await updateCalendarEvent(config, input.eventId, {
        summary: input.title,
        start: new Date(input.start),
        end: new Date(input.end),
        description: input.description,
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
        throw new Error(`Calendar ${input.calendar} not found`);
      }

      await deleteCalendarEvent(config, input.eventId);

      return { success: true };
    }),
});
