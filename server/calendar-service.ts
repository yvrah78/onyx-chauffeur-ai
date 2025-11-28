import { getUncachableGoogleCalendarClient } from "./googleCalendarClient";
import { storage } from "./storage";
import type { Trip, Client, Driver } from "@shared/schema";
import { format } from "date-fns";

export class CalendarService {
  private calendarId: string = 'primary'; // Uses the connected account's primary calendar

  /**
   * Create a calendar event for a trip
   */
  async createTripEvent(trip: Trip): Promise<string | null> {
    try {
      const calendar = await getUncachableGoogleCalendarClient();
      
      // Fetch client and driver details
      const client = await storage.getClient(trip.clientId);
      const driver = trip.driverId ? await storage.getDriver(trip.driverId) : null;

      const eventSummary = `🚗 ${client?.name || 'Client'} - ${trip.dropoffLocation}`;
      const eventDescription = this.buildEventDescription(trip, client, driver);

      // Estimate 1 hour duration for trips (can be adjusted)
      const startTime = new Date(trip.pickupTime);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // +1 hour

      const event = {
        summary: eventSummary,
        location: trip.pickupLocation,
        description: eventDescription,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'America/New_York', // Adjust based on business location
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'America/New_York',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 }, // 1 hour before
            { method: 'popup', minutes: 15 }, // 15 minutes before
          ],
        },
        colorId: this.getColorForStatus(trip.status),
        extendedProperties: {
          private: {
            tripId: trip.id,
            clientId: trip.clientId,
            driverId: trip.driverId || '',
          },
        },
      };

      const result = await calendar.events.insert({
        calendarId: this.calendarId,
        requestBody: event,
      });

      console.log(`Calendar event created: ${result.data.id}`);
      return result.data.id || null;
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      return null;
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateTripEvent(trip: Trip, eventId: string): Promise<boolean> {
    try {
      const calendar = await getUncachableGoogleCalendarClient();
      
      const client = await storage.getClient(trip.clientId);
      const driver = trip.driverId ? await storage.getDriver(trip.driverId) : null;

      const eventSummary = `🚗 ${client?.name || 'Client'} - ${trip.dropoffLocation}`;
      const eventDescription = this.buildEventDescription(trip, client, driver);

      const startTime = new Date(trip.pickupTime);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      await calendar.events.update({
        calendarId: this.calendarId,
        eventId: eventId,
        requestBody: {
          summary: eventSummary,
          location: trip.pickupLocation,
          description: eventDescription,
          start: {
            dateTime: startTime.toISOString(),
            timeZone: 'America/New_York',
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: 'America/New_York',
          },
          colorId: this.getColorForStatus(trip.status),
        },
      });

      console.log(`Calendar event updated: ${eventId}`);
      return true;
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      return false;
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteTripEvent(eventId: string): Promise<boolean> {
    try {
      const calendar = await getUncachableGoogleCalendarClient();
      
      await calendar.events.delete({
        calendarId: this.calendarId,
        eventId: eventId,
      });

      console.log(`Calendar event deleted: ${eventId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      return false;
    }
  }

  /**
   * List upcoming events from the calendar
   */
  async listUpcomingEvents(maxResults: number = 10): Promise<any[]> {
    try {
      const calendar = await getUncachableGoogleCalendarClient();
      
      const response = await calendar.events.list({
        calendarId: this.calendarId,
        timeMin: new Date().toISOString(),
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Failed to list calendar events:', error);
      return [];
    }
  }

  /**
   * Build a detailed event description
   */
  private buildEventDescription(trip: Trip, client: Client | undefined, driver: Driver | undefined): string {
    const lines = [
      `📍 PICKUP: ${trip.pickupLocation}`,
      `🏁 DROPOFF: ${trip.dropoffLocation}`,
      '',
      `👤 CLIENT: ${client?.name || 'Unknown'}`,
      `📱 Phone: ${client?.phone || 'N/A'}`,
      '',
    ];

    if (driver) {
      lines.push(`🚗 DRIVER: ${driver.name}`);
      lines.push(`📱 Driver Phone: ${driver.phone}`);
      lines.push('');
    }

    lines.push(`💰 PRICE: $${trip.price}`);
    lines.push(`💳 Payment: ${trip.paymentStatus.toUpperCase()}`);
    lines.push(`📋 Status: ${trip.status.toUpperCase()}`);

    if (trip.notes) {
      lines.push('');
      lines.push(`📝 NOTES: ${trip.notes}`);
    }

    lines.push('');
    lines.push('---');
    lines.push('Managed by Onyx Chauffeur AI');

    return lines.join('\n');
  }

  /**
   * Get Google Calendar color ID based on trip status
   * Color IDs: 1=Lavender, 2=Sage, 3=Grape, 4=Flamingo, 5=Banana, 
   * 6=Tangerine, 7=Peacock, 8=Graphite, 9=Blueberry, 10=Basil, 11=Tomato
   */
  private getColorForStatus(status: string): string {
    switch (status) {
      case 'scheduled':
        return '9'; // Blueberry (blue)
      case 'in-progress':
        return '6'; // Tangerine (orange)
      case 'completed':
        return '10'; // Basil (green)
      case 'cancelled':
        return '11'; // Tomato (red)
      default:
        return '8'; // Graphite (gray)
    }
  }
}

export const calendarService = new CalendarService();
