import { Button } from "@/components/ui/button";

/**
 * Quick Action Bar (Pipedrive-inspiriert)
 * Minimale Icons für schnelle Aktionen
 */

interface QuickActionsProps {
  onEmail?: () => void;
  onCall?: () => void;
  onMeeting?: () => void;
  onNote?: () => void;
}

export default function QuickActions({ onEmail, onCall, onMeeting, onNote }: QuickActionsProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onEmail}
        className="flex items-center gap-2"
        title="Email senden"
      >
        <span className="text-base">✉</span>
        <span className="text-sm">Email</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onCall}
        className="flex items-center gap-2"
        title="Anrufen"
      >
        <span className="text-base">☎</span>
        <span className="text-sm">Call</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onMeeting}
        className="flex items-center gap-2"
        title="Meeting planen"
      >
        <span className="text-base">📅</span>
        <span className="text-sm">Meeting</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onNote}
        className="flex items-center gap-2"
        title="Notiz hinzufügen"
      >
        <span className="text-base">📝</span>
        <span className="text-sm">Note</span>
      </Button>
    </div>
  );
}

