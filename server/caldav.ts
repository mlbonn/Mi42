import { createDAVClient, DAVClient, DAVCalendar, DAVCalendarObject } from 'tsdav';
import ICAL from 'ical.js';
// CalDAV Client Cache
let clientCache: Map<string, DAVClient> = new Map();
export interface CalDAVConfig {
  serverUrl: string;
  username: string;
  password: string;
}
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: string[];
  calendar: string; // Which calendar this event belongs to
  color?: string; // For UI color coding
}
/**
 * Create or get cached CalDAV client
 */
export async function getCalDAVClient(config: CalDAVConfig): Promise<DAVClient> {
  const cacheKey = `${config.serverUrl}:${config.username}`;
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }
  const client = await createDAVClient({
    serverUrl: config.serverUrl,
    credentials: {
      username: config.username,
      password: config.password,
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  }) as unknown as DAVClient;
  clientCache.set(cacheKey, client);
  return client;
}
/**
 * Fetch calendars for a user
 */
export async function fetchCalendars(config: CalDAVConfig): Promise<DAVCalendar[]> {
  const client = await getCalDAVClient(config);
  const calendars = await client.fetchCalendars();
  return calendars;
}
/**
 * Fetch events from a calendar
 * NEW: Support for specific calendar URL
 */
export async function fetchCalendarEvents(
  config: CalDAVConfig,
  start: Date,
  end: Date,
  calendarUrl?: string // NEW: Specific calendar URL
): Promise<CalendarEvent[]> {
  try {
    console.log(`[CALDAV] Fetching events for ${config.username}, calendarUrl: ${calendarUrl}`);
    const client = await getCalDAVClient(config);
    const calendars = await client.fetchCalendars();
    console.log(`[CALDAV] Found ${calendars.length} calendars for ${config.username}`);
    // NEW: Find calendar by URL if provided, otherwise use first calendar
    let calendar: DAVCalendar | undefined;
    if (calendarUrl) {
      console.log(`[CALDAV] Looking for calendar with URL: ${calendarUrl}`);
      calendar = calendars.find(cal => cal.url === calendarUrl);
      if (!calendar) {
        console.warn(`[CALDAV] Calendar with URL ${calendarUrl} not found for ${config.username}`);
        return [];
      }
    } else {
      calendar = calendars[0];
    }
    if (!calendar) {
      console.warn(`[CALDAV] No calendar found for ${config.username}`);
      return [];
    }
    console.log(`[CALDAV] Using calendar: ${calendar.displayName} (${calendar.url})`);
    const calendarObjects = await client.fetchCalendarObjects({
      calendar,
      timeRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
    console.log(`[CALDAV] Fetched ${calendarObjects.length} calendar objects`);
    const events = parseCalendarObjects(calendarObjects, config.username);
    console.log(`[CALDAV] Parsed ${events.length} events from ${calendar.displayName}`);
    return events;
  } catch (error) {
    console.error(`Error fetching calendar for ${config.username}:`, error);
    return [];
  }
}
/**
 * Parse iCalendar objects to CalendarEvent format
 */
function parseCalendarObjects(
  objects: DAVCalendarObject[],
  calendarOwner: string
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const obj of objects) {
    try {
      if (!obj.data) continue;
      const jcalData = ICAL.parse(obj.data);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');
      for (const vevent of vevents) {
        const event = new ICAL.Event(vevent);
        events.push({
          id: event.uid,
          summary: event.summary || 'Untitled Event',
          description: event.description || undefined,
          start: event.startDate.toJSDate(),
          end: event.endDate.toJSDate(),
          location: event.location || undefined,
          attendees: event.attendees.map(att => {
            const cn = att.getParameter('cn');
            const value = att.getFirstValue();
            return (typeof cn === 'string' ? cn : (typeof value === 'string' ? value : ''));
          }).filter(Boolean),
          calendar: calendarOwner,
        });
      }
    } catch (error) {
      console.error('Error parsing calendar object:', error);
    }
  }
  return events;
}
/**
 * Build a VCALENDAR iCalString with METHOD:REQUEST, ORGANIZER and ATTENDEEs.
 * Used both for CalDAV storage and as the .ics attachment in invitation emails.
 */
export function buildICalString(
  uid: string,
  event: Omit<CalendarEvent, 'id' | 'calendar' | 'color'>,
  organizerEmail: string
): string {
  const vcalendar = new ICAL.Component('vcalendar');
  vcalendar.addPropertyWithValue('version', '2.0');
  vcalendar.addPropertyWithValue('prodid', '-//FRIDAY CRM//EN');
  // METHOD:REQUEST is required for invitation emails (RFC 5546)
  vcalendar.addPropertyWithValue('method', 'REQUEST');

  const icalEvent = new ICAL.Component('vevent');
  icalEvent.addPropertyWithValue('uid', uid);
  icalEvent.addPropertyWithValue('summary', event.summary);
  icalEvent.addPropertyWithValue('dtstart', ICAL.Time.fromJSDate(event.start, true));
  icalEvent.addPropertyWithValue('dtend', ICAL.Time.fromJSDate(event.end, true));
  icalEvent.addPropertyWithValue('dtstamp', ICAL.Time.now());
  icalEvent.addPropertyWithValue('sequence', 0);

  if (event.description) {
    icalEvent.addPropertyWithValue('description', event.description);
  }
  if (event.location) {
    icalEvent.addPropertyWithValue('location', event.location);
  }

  // ORGANIZER property (required for METHOD:REQUEST)
  const organizerProp = new ICAL.Property('organizer');
  organizerProp.setValue(`mailto:${organizerEmail}`);
  organizerProp.setParameter('cn', organizerEmail);
  icalEvent.addProperty(organizerProp);

  // ATTENDEE properties
  if (event.attendees && event.attendees.length > 0) {
    for (const attendeeEmail of event.attendees) {
      const attendeeProp = new ICAL.Property('attendee');
      attendeeProp.setValue(`mailto:${attendeeEmail}`);
      attendeeProp.setParameter('cn', attendeeEmail);
      attendeeProp.setParameter('rsvp', 'TRUE');
      attendeeProp.setParameter('partstat', 'NEEDS-ACTION');
      attendeeProp.setParameter('role', 'REQ-PARTICIPANT');
      icalEvent.addProperty(attendeeProp);
    }
  }

  vcalendar.addSubcomponent(icalEvent);
  return vcalendar.toString();
}
/**
 * Create a new event.
 * Returns { uid, icalString } so the router can send the .ics as invitation email.
 */
export async function createCalendarEvent(
  config: CalDAVConfig,
  event: Omit<CalendarEvent, 'id' | 'calendar' | 'color'>,
  organizerEmail?: string
): Promise<{ uid: string; icalString: string }> {
  const client = await getCalDAVClient(config);
  const calendars = await client.fetchCalendars();
  const calendar = calendars[0];
  if (!calendar) {
    throw new Error('No calendar found');
  }
  const uid = `${Date.now()}@friday-crm`;
  const organizer = organizerEmail || config.username;
  const icalString = buildICalString(uid, event, organizer);

  await client.createCalendarObject({
    calendar,
    filename: `${uid}.ics`,
    iCalString: icalString,
  });
  return { uid, icalString };
}
/**
 * Update an existing event.
 * Returns { icalString } so the router can send an updated invitation.
 */
export async function updateCalendarEvent(
  config: CalDAVConfig,
  eventId: string,
  event: Omit<CalendarEvent, 'id' | 'calendar' | 'color'>,
  organizerEmail?: string
): Promise<{ icalString: string }> {
  const client = await getCalDAVClient(config);
  const calendars = await client.fetchCalendars();
  const calendar = calendars[0];
  if (!calendar) {
    throw new Error('No calendar found');
  }
  const calendarObjects = await client.fetchCalendarObjects({ calendar });
  const existingObject = calendarObjects.find(obj => obj.data?.includes(eventId));
  if (!existingObject) {
    throw new Error('Event not found');
  }
  const organizer = organizerEmail || config.username;
  const icalString = buildICalString(eventId, event, organizer);

  await client.updateCalendarObject({
    calendarObject: {
      ...existingObject,
      data: icalString,
    },
  });
  return { icalString };
}
/**
 * Delete an event
 */
export async function deleteCalendarEvent(
  config: CalDAVConfig,
  eventId: string
): Promise<void> {
  const client = await getCalDAVClient(config);
  const calendars = await client.fetchCalendars();
  const calendar = calendars[0];
  if (!calendar) {
    throw new Error('No calendar found');
  }
  const calendarObjects = await client.fetchCalendarObjects({ calendar });
  const existingObject = calendarObjects.find(obj => obj.data?.includes(eventId));
  if (!existingObject) {
    throw new Error('Event not found');
  }
  await client.deleteCalendarObject({
    calendarObject: existingObject,
  });
}

// ─── SMTP-Kalendereinladung ───────────────────────────────────────────────────
// Sendet eine Kalendereinladung als multipart/alternative mit eingebettetem
// text/calendar-Part, sodass Outlook native Annehmen/Ablehnen-Buttons zeigt.
// Wird NUR für Kalendereinladungen genutzt; alle anderen E-Mails laufen
// weiterhin über die SmarterMail REST-API.

export interface CalendarInviteOptions {
  organizerEmail: string;
  organizerPassword: string;
  to: string;
  subject: string;
  htmlBody: string;
  icalString: string;
}

export async function sendCalendarInviteViaSmtp(opts: CalendarInviteOptions): Promise<void> {
  const nodemailer = await import('nodemailer');

  const transporter = nodemailer.default.createTransport({
    host: 'mail.bl2020.com',
    port: 465,
    secure: true,
    auth: {
      user: opts.organizerEmail,
      pass: opts.organizerPassword,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  await transporter.sendMail({
    from: opts.organizerEmail,
    to: opts.to,
    subject: opts.subject,
    html: opts.htmlBody,
    alternatives: [
      {
        contentType: 'text/calendar; method=REQUEST; charset=UTF-8',
        content: opts.icalString,
      },
    ],
  });
}
