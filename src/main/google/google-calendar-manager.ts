import https from 'https';
import { ipcMain } from 'electron';
import { RendererToMainEventsForBrowserIPC } from '../../constants/app-constants';
import { GoogleAuthManager } from './google-auth-manager';

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;  // ISO date string
  end: string;    // ISO date string
  allDay: boolean;
  location?: string;
  description?: string;
  htmlLink?: string;
  colorId?: string;
}

export abstract class GoogleCalendarManager {
  public static init(): void {
    GoogleCalendarManager.initListeners();
  }

  private static initListeners(): void {
    ipcMain.handle(RendererToMainEventsForBrowserIPC.GOOGLE_CALENDAR_GET_EVENTS, async (_event, timeMin?: string, timeMax?: string) => {
      return GoogleCalendarManager.getEvents(timeMin, timeMax);
    });
  }

  public static async getEvents(timeMin?: string, timeMax?: string): Promise<CalendarEvent[]> {
    const accessToken = await GoogleAuthManager.getAccessToken();
    if (!accessToken) {
      return [];
    }

    // Default to today's events if no range specified
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfRange = new Date(startOfDay);
    endOfRange.setDate(endOfRange.getDate() + 7); // Next 7 days

    const params = new URLSearchParams({
      timeMin: timeMin || startOfDay.toISOString(),
      timeMax: timeMax || endOfRange.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '50',
    });

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'www.googleapis.com',
          path: `/calendar/v3/calendars/primary/events?${params.toString()}`,
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                console.error('Google Calendar API error:', parsed.error);
                resolve([]);
                return;
              }

              const events: CalendarEvent[] = (parsed.items || []).map((item: any) => ({
                id: item.id,
                summary: item.summary || '(No title)',
                start: item.start?.dateTime || item.start?.date || '',
                end: item.end?.dateTime || item.end?.date || '',
                allDay: !item.start?.dateTime,
                location: item.location,
                description: item.description,
                htmlLink: item.htmlLink,
                colorId: item.colorId,
              }));

              resolve(events);
            } catch (e) {
              console.error('Failed to parse calendar response:', e);
              resolve([]);
            }
          });
        }
      );

      req.on('error', (err) => {
        console.error('Calendar API request failed:', err);
        resolve([]);
      });

      req.end();
    });
  }
}
