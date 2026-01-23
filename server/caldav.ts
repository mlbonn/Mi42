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
 */
export async function fetchCalendarEvents(
  config: CalDAVConfig,
  start: Date,
  end: Date,
  calendarName: string = 'Calendar'
): Promise<CalendarEvent[]> {
  try {
    const client = await getCalDAVClient(config);
    const calendars = await client.fetchCalendars();
    
    // Find the calendar (default to first one if not found)
    const calendar = calendars.find(cal => 
      cal.displayName === calendarName || cal.url.includes(calendarName)
    ) || calendars[0];

    if (!calendar) {
      console.warn(`No calendar found for ${config.username}`);
      return [];
    }

    const calendarObjects = await client.fetchCalendarObjects({
      calendar: calendar,
      timeRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });

    return parseCalendarObjects(calendarObjects, config.username);
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

  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const icsString = createICSString(uid, event);

  await client.createCalendarObject({
    calendar: calendar,
    filename: `${uid}.ics`,
    iCalString: icsString,
  });

  return uid;
}

/**
 * Update an existing event
 */
export async function updateCalendarEvent(
  config: CalDAVConfig,
  eventId: string,
  event: Partial<Omit<CalendarEvent, 'id' | 'calendar'>>
): Promise<void> {
  const client = await getCalDAVClient(config);
  const calendars = await client.fetchCalendars();
  const calendar = calendars[0];

  if (!calendar) {
    throw new Error('No calendar found');
  }

  // Fetch existing event
  const objects = await client.fetchCalendarObjects({ calendar });
  const existingObject = objects.find(obj => obj.data?.includes(eventId));

  if (!existingObject) {
    throw new Error('Event not found');
  }

  // Parse existing event
  const jcalData = ICAL.parse(existingObject.data!);
  const comp = new ICAL.Component(jcalData);
  const vevent = comp.getFirstSubcomponent('vevent');
  if (!vevent) {
    throw new Error('No VEVENT found in calendar object');
  }
  const icalEvent = new ICAL.Event(vevent);

  // Update fields
  const updatedEvent: Omit<CalendarEvent, 'id' | 'calendar'> = {
    summary: event.summary || icalEvent.summary,
    description: event.description !== undefined ? event.description : icalEvent.description,
    start: event.start || icalEvent.startDate.toJSDate(),
    end: event.end || icalEvent.endDate.toJSDate(),
    location: event.location !== undefined ? event.location : icalEvent.location,
    attendees: event.attendees || icalEvent.attendees.map(att => {
      const value = att.getFirstValue();
      return typeof value === 'string' ? value : '';
    }).filter(Boolean),
  };

  const icsString = createICSString(eventId, updatedEvent);

  await client.updateCalendarObject({
    calendarObject: {
      ...existingObject,
      data: icsString,
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

  const objects = await client.fetchCalendarObjects({ calendar });
  const objectToDelete = objects.find(obj => obj.data?.includes(eventId));

  if (!objectToDelete) {
    throw new Error('Event not found');
  }

  await client.deleteCalendarObject({
    calendarObject: objectToDelete,
  });
}

/**
 * Create ICS string from event data
 */
function createICSString(
  uid: string,
  event: Omit<CalendarEvent, 'id' | 'calendar'>
): string {
  const comp = new ICAL.Component(['vcalendar', [], []]);
  comp.updatePropertyWithValue('prodid', '-//FRIDAY CRM//Calendar//EN');
  comp.updatePropertyWithValue('version', '2.0');

  const vevent = new ICAL.Component('vevent');
  vevent.updatePropertyWithValue('uid', uid);
  vevent.updatePropertyWithValue('summary', event.summary);
  
  if (event.description) {
    vevent.updatePropertyWithValue('description', event.description);
  }
  
  if (event.location) {
    vevent.updatePropertyWithValue('location', event.location);
  }

  const startTime = ICAL.Time.fromJSDate(event.start, false);
  vevent.updatePropertyWithValue('dtstart', startTime);

  const endTime = ICAL.Time.fromJSDate(event.end, false);
  vevent.updatePropertyWithValue('dtend', endTime);

  vevent.updatePropertyWithValue('dtstamp', ICAL.Time.now());

  comp.addSubcomponent(vevent);

  return comp.toString();
}

/**
 * Clear client cache (for testing/logout)
 */
export function clearCalDAVCache(): void {
  clientCache.clear();
}

