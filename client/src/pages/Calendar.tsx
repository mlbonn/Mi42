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
import { Plus, Calendar as CalendarIcon, Filter, X } from 'lucide-react';
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
  
  // Manual date/time state
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  
  // Meeting invitation state
  const [sendAsMeeting, setSendAsMeeting] = useState(false);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [attendeeInput, setAttendeeInput] = useState('');

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
      resetCreateForm();
    },
  });

  const createMeetingMutation = trpc.calendar.createMeetingInvitation.useMutation({
    onSuccess: () => {
      refetch();
      resetCreateForm();
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

  const resetCreateForm = () => {
    setIsCreateDialogOpen(false);
    setSelectedSlot(null);
    setSendAsMeeting(false);
    setAttendees([]);
    setAttendeeInput('');
    setStartDate('');
    setStartTime('');
    setEndDate('');
    setEndTime('');
  };

  // Event handlers
  const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
    setSelectedSlot(slotInfo);
    // Pre-fill manual fields from slot
    setStartDate(format(slotInfo.start, 'yyyy-MM-dd'));
    setStartTime(format(slotInfo.start, 'HH:mm'));
    setEndDate(format(slotInfo.end, 'yyyy-MM-dd'));
    setEndTime(format(slotInfo.end, 'HH:mm'));
    setIsCreateDialogOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEditDialogOpen(true);
  }, []);

  const handleAddAttendee = () => {
    if (attendeeInput && attendeeInput.includes('@')) {
      setAttendees([...attendees, attendeeInput]);
      setAttendeeInput('');
    }
  };

  const handleRemoveAttendee = (email: string) => {
    setAttendees(attendees.filter(a => a !== email));
  };

  const handleCreateEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Build start/end dates from manual fields
    const startDateValue = formData.get('startDate') as string;
    const startTimeValue = formData.get('startTime') as string;
    const endDateValue = formData.get('endDate') as string;
    const endTimeValue = formData.get('endTime') as string;

    if (!startDateValue || !startTimeValue || !endDateValue || !endTimeValue) {
      alert('Bitte Start- und End-Datum/Uhrzeit eingeben');
      return;
    }

    const startDateTime = new Date(`${startDateValue}T${startTimeValue}`);
    const endDateTime = new Date(`${endDateValue}T${endTimeValue}`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      alert('Ungültiges Datum/Uhrzeit-Format');
      return;
    }

    if (endDateTime <= startDateTime) {
      alert('End-Zeit muss nach Start-Zeit liegen');
      return;
    }

    const eventData = {
      calendar: formData.get('calendar') as string,
      summary: formData.get('summary') as string,
      description: formData.get('description') as string || undefined,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      location: formData.get('location') as string || undefined,
    };

    // If sending as meeting invitation with attendees
    if (sendAsMeeting && attendees.length > 0) {
      createMeetingMutation.mutate({
        ...eventData,
        meetingUrl: formData.get('meetingUrl') as string || undefined,
        attendees,
        reminder: parseInt(formData.get('reminder') as string) || 30,
      });
    } else {
      // Regular calendar event
      createMutation.mutate(eventData);
    }
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
      <div className="flex items-center justify-end px-6 py-4 border-b">
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
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) resetCreateForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Neuer Termin
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

                {/* Manual Date/Time Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start-Datum</Label>
                    <Input
                      id="startDate"
                      name="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="startTime">Start-Zeit</Label>
                    <Input
                      id="startTime"
                      name="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="endDate">End-Datum</Label>
                    <Input
                      id="endDate"
                      name="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End-Zeit</Label>
                    <Input
                      id="endTime"
                      name="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Meeting Invitation Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Checkbox
                      id="sendAsMeeting"
                      checked={sendAsMeeting}
                      onCheckedChange={(checked) => setSendAsMeeting(checked as boolean)}
                    />
                    <Label htmlFor="sendAsMeeting" className="cursor-pointer font-medium">
                      Als Meeting-Einladung versenden
                    </Label>
                  </div>

                  {sendAsMeeting && (
                    <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                      <div>
                        <Label htmlFor="meetingUrl">Meeting URL (optional)</Label>
                        <Input
                          id="meetingUrl"
                          name="meetingUrl"
                          placeholder="https://zoom.us/j/123456789"
                          type="url"
                        />
                      </div>

                      <div>
                        <Label>Teilnehmer *</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            placeholder="email@example.com"
                            type="email"
                            value={attendeeInput}
                            onChange={(e) => setAttendeeInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddAttendee();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddAttendee}
                          >
                            Hinzufügen
                          </Button>
                        </div>
                        {attendees.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {attendees.map((email) => (
                              <div
                                key={email}
                                className="flex items-center gap-1 bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm"
                              >
                                {email}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAttendee(email)}
                                  className="hover:text-orange-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="reminder">Erinnerung</Label>
                        <select
                          id="reminder"
                          name="reminder"
                          className="w-full mt-1 px-3 py-2 border rounded-md"
                        >
                          <option value="0">Keine Erinnerung</option>
                          <option value="15">15 Minuten vorher</option>
                          <option value="30">30 Minuten vorher</option>
                          <option value="60">1 Stunde vorher</option>
                          <option value="120">2 Stunden vorher</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => resetCreateForm()}
                  >
                    Abbrechen
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || createMeetingMutation.isPending || (sendAsMeeting && attendees.length === 0)}
                  >
                    {(createMutation.isPending || createMeetingMutation.isPending) ? 'Erstelle...' : 'Erstellen'}
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
        <div className="bg-gray-50 border border-blue-200 rounded-lg p-4 mt-4">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            📅 Kalender-Synchronisation einrichten
          </h3>
          <div className="text-sm text-gray-800 space-y-1">
            <p><strong>So verbinden Sie Ihren SmarterMail-Kalender:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Gehen Sie zu <strong>Einstellungen → 📅 Mein Kalender</strong></li>
              <li>Tragen Sie Ihre <strong>SmarterMail E-Mail</strong> und <strong>Passwort</strong> ein (z.B. agent32@bl2020.com)</li>
              <li>Aktivieren Sie <strong>"Kalender-Synchronisation"</strong></li>
              <li>Klicken Sie auf <strong>"Einstellungen speichern"</strong></li>
              <li>Kehren Sie zum Kalender zurück und aktivieren Sie <strong>"Team (Alle)"</strong> im Filter</li>
            </ol>
            <p className="mt-2 text-orange-700">💡 <em>Ihre Termine werden automatisch synchronisiert und sind für das gesamte Team sichtbar!</em></p>
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
