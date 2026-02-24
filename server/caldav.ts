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
        console.warn(`[CALDAV] Available calendars:`, calendars.map(c => ({ url: c.url, name: c.displayName })));
        return [];
      }
      console.log(`[CALDAV] Found calendar: ${calendar.displayName}`);
    } else {
      calendar = calendars[0];
      console.log(`[CALDAV] Using first calendar: ${calendar?.displayName}`);
    }

    if (!calendar) {
      console.warn(`[CALDAV] No calendar found for ${config.username}`);
      return [];
    }

    console.log(`[CALDAV] Fetching calendar objects from ${calendar.displayName}...`);
    const calendarObjects = await client.fetchCalendarObjects({
      calendar: calendar,
      timeRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
    console.log(`[CALDAV] Found ${calendarObjects.length} calendar objects`);

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
 * Create a new event
 */
export async function createCalendarEvent(
  config: CalDAVConfig,
  event: Omit<CalendarEvent, 'id' | 'calendar'>
): Promise<string> {
  const client = await getCalDAVClient(config);
  const calendars = await client.fetchCalendars();
  const calendar = calendars[0];

  if (!calendar) {
    throw new Error('No calendar found');
  }

  const uid = `${Date.now()}@friday-crm`;
  
  const icalEvent = new ICAL.Component('vevent');
  icalEvent.addPropertyWithValue('uid', uid);
  icalEvent.addPropertyWithValue('summary', event.summary);
  icalEvent.addPropertyWithValue('dtstart', ICAL.Time.fromJSDate(event.start, true));
  icalEvent.addPropertyWithValue('dtend', ICAL.Time.fromJSDate(event.end, true));
  
  if (event.description) {
    icalEvent.addPropertyWithValue('description', event.description);
  }
  
  if (event.location) {
    icalEvent.addPropertyWithValue('location', event.location);
  }

  const vcalendar = new ICAL.Component('vcalendar');
  vcalendar.addPropertyWithValue('version', '2.0');
  vcalendar.addPropertyWithValue('prodid', '-//FRIDAY CRM//EN');
  vcalendar.addSubcomponent(icalEvent);

  await client.createCalendarObject({
    calendar,
    filename: `${uid}.ics`,
    iCalString: vcalendar.toString(),
  });

  return uid;
}

/**
 * Update an existing event
 */
export async function updateCalendarEvent(
  config: CalDAVConfig,
  eventId: string,
  event: Omit<CalendarEvent, 'id' | 'calendar'>
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

  const icalEvent = new ICAL.Component('vevent');
  icalEvent.addPropertyWithValue('uid', eventId);
  icalEvent.addPropertyWithValue('summary', event.summary);
  icalEvent.addPropertyWithValue('dtstart', ICAL.Time.fromJSDate(event.start, true));
  icalEvent.addPropertyWithValue('dtend', ICAL.Time.fromJSDate(event.end, true));
  
  if (event.description) {
    icalEvent.addPropertyWithValue('description', event.description);
  }
  
  if (event.location) {
    icalEvent.addPropertyWithValue('location', event.location);
  }

  const vcalendar = new ICAL.Component('vcalendar');
  vcalendar.addPropertyWithValue('version', '2.0');
  vcalendar.addPropertyWithValue('prodid', '-//FRIDAY CRM//EN');
  vcalendar.addSubcomponent(icalEvent);

  await client.updateCalendarObject({
    calendarObject: {
      ...existingObject,
      data: vcalendar.toString(),
    },
  });
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
