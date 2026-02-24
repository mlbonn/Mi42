/**
 * Calendar Router for FRIDAY CRM
 * 
 * Handles ICS event creation and email sending
 */

import { router, protectedProcedure } from '../_core';
import { z } from 'zod';
import { generateMeetingInvitation, generateICSFilename, validateEventData, type ICSEventData } from '../utils/icsGenerator';
import { sendEmailWithAttachment } from '../utils/emailSender';
import { TRPCError } from '@trpc/server';

export const calendarRouter = router({
  /**
   * Create and send ICS meeting invitation
   */
  createMeetingInvitation: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, 'Title is required'),
        description: z.string().optional(),
        location: z.string().optional(),
        startTime: z.string().datetime(), // ISO 8601 format
        endTime: z.string().datetime(),
        attendeeEmails: z.array(z.string().email()).min(1, 'At least one attendee is required'),
        reminderMinutes: z.number().int().min(0).optional().default(30),
        meetingUrl: z.string().url().optional(),
        emailSubject: z.string().optional(),
        emailBody: z.string().optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const user = ctx.user;

        // Get user's email from database
        const userEmail = user.email;
        const userName = user.name || userEmail.split('@')[0];

        // Parse dates
        const startTime = new Date(input.startTime);
        const endTime = new Date(input.endTime);

        // Validate dates
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid date format'
          });
        }

        if (startTime >= endTime) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'End time must be after start time'
          });
        }

        // Generate ICS file
        const icsContent = generateMeetingInvitation({
          title: input.title,
          description: input.description,
          location: input.location,
          startTime,
          endTime,
          organizerName: userName,
          organizerEmail: userEmail,
          attendeeEmails: input.attendeeEmails,
          reminderMinutes: input.reminderMinutes,
          meetingUrl: input.meetingUrl
        });

        const icsFilename = generateICSFilename(input.title);

        // Prepare email
        const emailSubject = input.emailSubject || `Meeting Invitation: ${input.title}`;
        const emailBody = input.emailBody || generateEmailBody({
          title: input.title,
          description: input.description,
          location: input.location,
          startTime,
          endTime,
          organizerName: userName,
          meetingUrl: input.meetingUrl
        });

        // Send email with ICS attachment to each attendee
        const sendResults = await Promise.allSettled(
          input.attendeeEmails.map(async (email) => {
            return sendEmailWithAttachment({
              from: {
                name: userName,
                email: userEmail
              },
              to: email,
              subject: emailSubject,
              html: emailBody,
              attachments: [
                {
                  filename: icsFilename,
                  content: icsContent,
                  contentType: 'text/calendar; charset=utf-8; method=REQUEST'
                }
              ]
            });
          })
        );

        // Check results
        const successful = sendResults.filter(r => r.status === 'fulfilled').length;
        const failed = sendResults.filter(r => r.status === 'rejected').length;

        if (failed > 0) {
          const errors = sendResults
            .filter(r => r.status === 'rejected')
            .map((r: any) => r.reason?.message || 'Unknown error');

          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to send ${failed} invitation(s): ${errors.join(', ')}`
          });
        }

        return {
          success: true,
          message: `Meeting invitation sent to ${successful} attendee(s)`,
          icsFilename,
          sentTo: input.attendeeEmails
        };
      } catch (error: any) {
        console.error('Error creating meeting invitation:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create meeting invitation'
        });
      }
    }),

  /**
   * Generate ICS file without sending
   */
  generateICS: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, 'Title is required'),
        description: z.string().optional(),
        location: z.string().optional(),
        startTime: z.string().datetime(),
        endTime: z.string().datetime(),
        attendeeEmails: z.array(z.string().email()).optional(),
        reminderMinutes: z.number().int().min(0).optional().default(30),
        meetingUrl: z.string().url().optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const user = ctx.user;
        const userEmail = user.email;
        const userName = user.name || userEmail.split('@')[0];

        const startTime = new Date(input.startTime);
        const endTime = new Date(input.endTime);

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid date format'
          });
        }

        if (startTime >= endTime) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'End time must be after start time'
          });
        }

        const icsContent = generateMeetingInvitation({
          title: input.title,
          description: input.description,
          location: input.location,
          startTime,
          endTime,
          organizerName: userName,
          organizerEmail: userEmail,
          attendeeEmails: input.attendeeEmails || [],
          reminderMinutes: input.reminderMinutes,
          meetingUrl: input.meetingUrl
        });

        const icsFilename = generateICSFilename(input.title);

        return {
          success: true,
          icsContent,
          icsFilename
        };
      } catch (error: any) {
        console.error('Error generating ICS:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to generate ICS file'
        });
      }
    })
});

/**
 * Generate email body for meeting invitation
 */
function generateEmailBody(data: {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  organizerName: string;
  meetingUrl?: string;
}): string {
  const formatDate = (date: Date) => {
    return date.toLocaleString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const duration = Math.round((data.endTime.getTime() - data.startTime.getTime()) / (1000 * 60));
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  const durationStr = hours > 0 ? `${hours}h ${minutes}min` : `${minutes} minutes`;

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .details { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .detail-row { display: flex; margin: 10px 0; }
    .detail-label { font-weight: bold; min-width: 120px; color: #6b7280; }
    .detail-value { color: #111827; }
    .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Meeting Invitation</h1>
    </div>
    <div class="content">
      <p>Hi,</p>
      <p>${data.organizerName} has invited you to a meeting.</p>
      
      <div class="details">
        <div class="detail-row">
          <div class="detail-label">📅 Title:</div>
          <div class="detail-value"><strong>${data.title}</strong></div>
        </div>
        <div class="detail-row">
          <div class="detail-label">🕐 Start:</div>
          <div class="detail-value">${formatDate(data.startTime)}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">⏱️ Duration:</div>
          <div class="detail-value">${durationStr}</div>
        </div>
        ${data.location ? `
        <div class="detail-row">
          <div class="detail-label">📍 Location:</div>
          <div class="detail-value">${data.location}</div>
        </div>
        ` : ''}
        ${data.description ? `
        <div class="detail-row">
          <div class="detail-label">📝 Description:</div>
          <div class="detail-value">${data.description}</div>
        </div>
        ` : ''}
      </div>

      ${data.meetingUrl ? `
      <p style="text-align: center;">
        <a href="${data.meetingUrl}" class="button">Join Meeting</a>
      </p>
      ` : ''}

      <p><strong>Please open the attached ICS file to add this meeting to your calendar.</strong></p>
      
      <p>Looking forward to seeing you!</p>
      <p>Best regards,<br>${data.organizerName}</p>
    </div>
    <div class="footer">
      <p>Sent via FRIDAY CRM</p>
    </div>
  </div>
</body>
</html>
  `;

  return html;
}
