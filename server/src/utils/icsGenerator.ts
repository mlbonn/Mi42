/**
 * ICS (iCalendar) Generator for FRIDAY CRM
 * 
 * Generates Outlook-compatible ICS files for calendar events
 * Uses ical-generator library for RFC 5545 compliance
 */

import ical, { ICalCalendar, ICalEvent } from 'ical-generator';
import { v4 as uuidv4 } from 'uuid';

export interface ICSEventData {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  organizer: {
    name: string;
    email: string;
  };
  attendees?: Array<{
    name: string;
    email: string;
    rsvp?: boolean;
    role?: 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT' | 'NON-PARTICIPANT';
    status?: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'NEEDS-ACTION';
  }>;
  reminder?: number; // Minutes before event
  url?: string;
  timezone?: string;
}

export interface ICSGeneratorOptions {
  method?: 'PUBLISH' | 'REQUEST' | 'REPLY' | 'CANCEL';
  prodId?: string;
  calendarName?: string;
}

/**
 * Generate ICS file content from event data
 */
export function generateICS(
  eventData: ICSEventData,
  options: ICSGeneratorOptions = {}
): string {
  const {
    method = 'REQUEST',
    prodId = '-//FRIDAY CRM//Event//EN',
    calendarName = 'FRIDAY CRM Event'
  } = options;

  // Create calendar
  const calendar: ICalCalendar = ical({
    name: calendarName,
    prodId: prodId,
    method: method,
    timezone: eventData.timezone || 'Europe/Berlin'
  });

  // Create event
  const event: ICalEvent = calendar.createEvent({
    start: eventData.startTime,
    end: eventData.endTime,
    summary: eventData.title,
    description: eventData.description,
    location: eventData.location,
    url: eventData.url,
    organizer: {
      name: eventData.organizer.name,
      email: eventData.organizer.email
    },
    uid: uuidv4() + '@friday-crm.com',
    sequence: 0,
    status: 'CONFIRMED'
  });

  // Add attendees
  if (eventData.attendees && eventData.attendees.length > 0) {
    eventData.attendees.forEach(attendee => {
      event.createAttendee({
        name: attendee.name,
        email: attendee.email,
        rsvp: attendee.rsvp !== false, // Default: true
        role: attendee.role || 'REQ-PARTICIPANT',
        status: attendee.status || 'NEEDS-ACTION'
      });
    });
  }

  // Add reminder (alarm)
  if (eventData.reminder && eventData.reminder > 0) {
    event.createAlarm({
      type: 'display',
      trigger: eventData.reminder * 60, // Convert minutes to seconds
      description: eventData.title
    });
  }

  // Generate ICS string
  return calendar.toString();
}

/**
 * Generate ICS filename
 */
export function generateICSFilename(eventTitle: string): string {
  const sanitized = eventTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
  
  const timestamp = new Date().toISOString().split('T')[0];
  return `${sanitized}-${timestamp}.ics`;
}

/**
 * Generate ICS for meeting invitation
 */
export function generateMeetingInvitation(data: {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  organizerName: string;
  organizerEmail: string;
  attendeeEmails: string[];
  reminderMinutes?: number;
  meetingUrl?: string;
}): string {
  const eventData: ICSEventData = {
    title: data.title,
    description: data.description,
    location: data.location,
    startTime: data.startTime,
    endTime: data.endTime,
    organizer: {
      name: data.organizerName,
      email: data.organizerEmail
    },
    attendees: data.attendeeEmails.map(email => ({
      name: email.split('@')[0], // Use email prefix as name
      email: email,
      rsvp: true,
      role: 'REQ-PARTICIPANT',
      status: 'NEEDS-ACTION'
    })),
    reminder: data.reminderMinutes || 30,
    url: data.meetingUrl
  };

  return generateICS(eventData, {
    method: 'REQUEST',
    calendarName: 'Meeting Invitation'
  });
}

/**
 * Generate ICS for event cancellation
 */
export function generateCancellation(data: {
  title: string;
  startTime: Date;
  endTime: Date;
  organizerName: string;
  organizerEmail: string;
  attendeeEmails: string[];
  eventUid: string;
}): string {
  const calendar = ical({
    name: 'Event Cancellation',
    prodId: '-//FRIDAY CRM//Event//EN',
    method: 'CANCEL'
  });

  const event = calendar.createEvent({
    start: data.startTime,
    end: data.endTime,
    summary: data.title,
    organizer: {
      name: data.organizerName,
      email: data.organizerEmail
    },
    uid: data.eventUid,
    sequence: 1,
    status: 'CANCELLED'
  });

  data.attendeeEmails.forEach(email => {
    event.createAttendee({
      name: email.split('@')[0],
      email: email,
      rsvp: true
    });
  });

  return calendar.toString();
}

/**
 * Validate event data
 */
export function validateEventData(data: ICSEventData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.title || data.title.trim() === '') {
    errors.push('Title is required');
  }

  if (!data.startTime || !(data.startTime instanceof Date) || isNaN(data.startTime.getTime())) {
    errors.push('Valid start time is required');
  }

  if (!data.endTime || !(data.endTime instanceof Date) || isNaN(data.endTime.getTime())) {
    errors.push('Valid end time is required');
  }

  if (data.startTime && data.endTime && data.startTime >= data.endTime) {
    errors.push('End time must be after start time');
  }

  if (!data.organizer || !data.organizer.email) {
    errors.push('Organizer email is required');
  }

  if (data.organizer && data.organizer.email && !isValidEmail(data.organizer.email)) {
    errors.push('Organizer email is invalid');
  }

  if (data.attendees) {
    data.attendees.forEach((attendee, index) => {
      if (!attendee.email) {
        errors.push(`Attendee ${index + 1}: Email is required`);
      } else if (!isValidEmail(attendee.email)) {
        errors.push(`Attendee ${index + 1}: Email is invalid`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
