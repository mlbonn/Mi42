import { useState, useMemo, useCallback } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, View, Event } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Calendar as CalendarIcon, Filter } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Setup date-fns localizer
const locales = {
  'de': de,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent extends Event {
  id: string;
  calendar: string;
  color: string;
  description?: string;
  location?: string;
  attendees?: string[];
}

export default function Calendar() {
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);

  // Fetch available calendars
  const { data: calendars = [] } = trpc.calendar.getCalendars.useQuery();

  // Calendar filter state
  const [visibleCalendars, setVisibleCalendars] = useState<string[]>([]);

  // Initialize visible calendars when data loads
  useMemo(() => {
    if (calendars.length > 0 && visibleCalendars.length === 0) {
      setVisibleCalendars(calendars.map(c => c.id));
    }
  }, [calendars, visibleCalendars.length]);

  // Calculate date range for fetching events
  const dateRange = useMemo(() => {
    const start = startOfMonth(addMonths(date, -1));
    const end = endOfMonth(addMonths(date, 1));
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }, [date]);

  // Fetch events
  const { data: events = [], refetch } = trpc.calendar.getEvents.useQuery({
    start: dateRange.start,
    end: dateRange.end,
    calendars: visibleCalendars.length > 0 ? visibleCalendars : undefined,
  }, {
    enabled: visibleCalendars.length > 0,
  });

  // Transform events for React Big Calendar
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return events.map(event => ({
      id: event.id,
      title: event.summary,
      start: new Date(event.start),
      end: new Date(event.end),
      calendar: event.calendar,
      color: event.color,
      description: event.description,
      location: event.location,
      attendees: event.attendees,
    }));
  }, [events]);

  // Mutations
  const createMutation = trpc.calendar.createEvent.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreateDialogOpen(false);
      setSelectedSlot(null);
    },
  });

  const updateMutation = trpc.calendar.updateEvent.useMutation({
    onSuccess: () => {
      refetch();
      setIsEditDialogOpen(false);
      setSelectedEvent(null);
    },
  });

  const deleteMutation = trpc.calendar.deleteEvent.useMutation({
    onSuccess: () => {
      refetch();
      setIsEditDialogOpen(false);
      setSelectedEvent(null);
    },
  });

  // Event handlers
  const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
    setSelectedSlot(slotInfo);
    setIsCreateDialogOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEditDialogOpen(true);
  }, []);

  const handleCreateEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!selectedSlot) return;

    createMutation.mutate({
      calendar: formData.get('calendar') as string,
      summary: formData.get('summary') as string,
      description: formData.get('description') as string || undefined,
      start: selectedSlot.start.toISOString(),
      end: selectedSlot.end.toISOString(),
      location: formData.get('location') as string || undefined,
    });
  };

  const handleUpdateEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!selectedEvent) return;

    updateMutation.mutate({
      calendar: selectedEvent.calendar,
      eventId: selectedEvent.id,
      summary: formData.get('summary') as string,
      description: formData.get('description') as string || undefined,
      location: formData.get('location') as string || undefined,
    });
  };

  const handleDeleteEvent = () => {
    if (!selectedEvent) return;
    
    if (confirm('Möchten Sie diesen Termin wirklich löschen?')) {
      deleteMutation.mutate({
        calendar: selectedEvent.calendar,
        eventId: selectedEvent.id,
      });
    }
  };

  const toggleCalendar = (calendarId: string) => {
    setVisibleCalendars(prev => 
      prev.includes(calendarId)
        ? prev.filter(id => id !== calendarId)
        : [...prev, calendarId]
    );
  };

  // Custom event style
  const eventStyleGetter = (event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: event.color,
        borderColor: event.color,
        color: '#fff',
        borderRadius: '4px',
        border: 'none',
        fontSize: '12px',
        padding: '2px 4px',
      },
    };
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-gray-600" />
          <h1 className="text-xl font-semibold text-gray-900">Kalender</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Calendar Filter */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter ({visibleCalendars.length}/{calendars.length})
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Kalender anzeigen</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-4">
                {calendars.map(calendar => (
                  <div key={calendar.id} className="flex items-center gap-3">
                    <Checkbox
                      id={`calendar-${calendar.id}`}
                      checked={visibleCalendars.includes(calendar.id)}
                      onCheckedChange={() => toggleCalendar(calendar.id)}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: calendar.color }}
                      />
                      <Label
                        htmlFor={`calendar-${calendar.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {calendar.name}
                      </Label>
                      <span className="text-xs text-gray-500">
                        ({calendar.type === 'team' ? 'Team' : 'Persönlich'})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* Create Event Button */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Neuer Termin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neuer Termin</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <Label htmlFor="calendar">Kalender</Label>
                  <select
                    id="calendar"
                    name="calendar"
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    required
                  >
                    {calendars.map(calendar => (
                      <option key={calendar.id} value={calendar.id}>
                        {calendar.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="summary">Titel</Label>
                  <Input
                    id="summary"
                    name="summary"
                    placeholder="Meeting mit..."
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Beschreibung</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Details zum Termin..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="location">Ort</Label>
                  <Input
                    id="location"
                    name="location"
                    placeholder="Konferenzraum, Zoom-Link..."
                  />
                </div>

                {selectedSlot && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    <div><strong>Start:</strong> {format(selectedSlot.start, 'dd.MM.yyyy HH:mm', { locale: de })}</div>
                    <div><strong>Ende:</strong> {format(selectedSlot.end, 'dd.MM.yyyy HH:mm', { locale: de })}</div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Erstelle...' : 'Erstellen'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 p-6 flex flex-col gap-4">
        <BigCalendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          culture="de"
          messages={{
            next: 'Weiter',
            previous: 'Zurück',
            today: 'Heute',
            month: 'Monat',
            week: 'Woche',
            day: 'Tag',
            agenda: 'Agenda',
            date: 'Datum',
            time: 'Zeit',
            event: 'Termin',
            noEventsInRange: 'Keine Termine in diesem Zeitraum',
            showMore: (total) => `+ ${total} weitere`,
          }}
        />

        {/* Setup Instructions - unter dem Kalender */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            📅 Kalender-Synchronisation einrichten
          </h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>So verbinden Sie Ihren SmarterMail-Kalender:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Gehen Sie zu <strong>Einstellungen → 📅 Mein Kalender</strong></li>
              <li>Tragen Sie Ihre <strong>SmarterMail E-Mail</strong> und <strong>Passwort</strong> ein (z.B. agent32@bl2020.com)</li>
              <li>Aktivieren Sie <strong>"Kalender-Synchronisation"</strong></li>
              <li>Klicken Sie auf <strong>"Einstellungen speichern"</strong></li>
              <li>Kehren Sie zum Kalender zurück und aktivieren Sie <strong>"Team (Alle)"</strong> im Filter</li>
            </ol>
            <p className="mt-2 text-blue-700">💡 <em>Ihre Termine werden automatisch synchronisiert und sind für das gesamte Team sichtbar!</em></p>
          </div>
        </div>
      </div>

      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Termin bearbeiten</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: selectedEvent.color }}
                  />
                  <span className="font-medium">
                    {calendars.find(c => c.id === selectedEvent.calendar)?.name}
                  </span>
                </div>
                <div><strong>Start:</strong> {format(selectedEvent.start as Date, 'dd.MM.yyyy HH:mm', { locale: de })}</div>
                <div><strong>Ende:</strong> {format(selectedEvent.end as Date, 'dd.MM.yyyy HH:mm', { locale: de })}</div>
              </div>

              <div>
                <Label htmlFor="edit-summary">Titel</Label>
                <Input
                  id="edit-summary"
                  name="summary"
                  defaultValue={selectedEvent.title as string}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Beschreibung</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  defaultValue={selectedEvent.description || ''}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-location">Ort</Label>
                <Input
                  id="edit-location"
                  name="location"
                  defaultValue={selectedEvent.location || ''}
                />
              </div>

              <div className="flex justify-between gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteEvent}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Lösche...' : 'Löschen'}
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Speichere...' : 'Speichern'}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

