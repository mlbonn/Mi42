import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, Mail, Phone, Calendar, Video, MessageSquare, 
  Download, ExternalLink, ChevronDown, ChevronRight,
  Upload, Paperclip
} from "lucide-react";
import FileUploadActivity from "./FileUploadActivity";

interface ContactActivitiesProps {
  contactId: string;
}

const activityTypeIcons: Record<string, any> = {
  'Email': Mail,
  'Call': Phone,
  'Meeting': Calendar,
  'Demo': Video,
  'Document': FileText,
  'Note': MessageSquare,
};

const activityTypeLabels: Record<string, string> = {
  'Email': 'E-Mail',
  'Call': 'Anruf',
  'Meeting': 'Meeting',
  'Demo': 'Demo',
  'Document': 'Dokument',
  'Note': 'Notiz',
  'AI Outreach': 'AI Outreach',
};

export default function ContactActivities({ contactId }: ContactActivitiesProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  
  const { data: activities = [], refetch: refetchActivities } = trpc.activities.listByContact.useQuery(
    { contactId, limit: 50 },
    { enabled: !!contactId }
  );

  const { data: attachmentsMap = {} } = (trpc as any).attachments?.getByActivity?.useQuery
    ? {} // Will be populated per activity
    : {};

  const toggleActivity = (activityId: string) => {
    const newExpanded = new Set(expandedActivities);
    if (newExpanded.has(activityId)) {
      newExpanded.delete(activityId);
    } else {
      newExpanded.add(activityId);
    }
    setExpandedActivities(newExpanded);
  };

  const getActivityIcon = (type: string) => {
    const IconComponent = activityTypeIcons[type] || FileText;
    return <IconComponent className="h-4 w-4" />;
  };

  const getActivityTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Email': 'bg-gray-100 text-gray-800',
      'Call': 'bg-gray-100 text-gray-700',
      'Meeting': 'bg-gray-100 text-gray-700',
      'Demo': 'bg-gray-100 text-orange-800',
      'Document': 'bg-gray-100 text-gray-800',
      'Note': 'bg-gray-100 text-gray-600',
      'AI Outreach': 'bg-gray-400 text-gray-600',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const handleUploadSuccess = () => {
    refetchActivities();
    setShowUpload(false);
  };

  return (
    <div className="space-y-4">
      {/* Header mit Upload-Button */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Aktivitäten ({activities.length})
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowUpload(!showUpload)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Datei archivieren
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Upload Section (collapsible) */}
      {showUpload && (
        <FileUploadActivity 
          contactId={contactId}
          onUploadSuccess={handleUploadSuccess}
        />
      )}

      {/* Activities List */}
      <Card>
        <CardContent className="pt-4">
          {activities.length > 0 ? (
            <div className="space-y-2">
              {activities.map((activity: any) => (
                <div 
                  key={activity.id}
                  className="border rounded-lg overflow-hidden"
                >
                  {/* Activity Row */}
                  <div 
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleActivity(activity.id)}
                  >
                    {/* Expand Icon */}
                    <div className="text-gray-400">
                      {expandedActivities.has(activity.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>

                    {/* Type Badge */}
                    <span className={`text-xs font-medium px-2 py-1 rounded flex items-center gap-1 ${getActivityTypeColor(activity.activityType)}`}>
                      {getActivityIcon(activity.activityType)}
                      {activityTypeLabels[activity.activityType] || activity.activityType}
                    </span>

                    {/* Date */}
                    <span className="text-xs text-gray-500 min-w-[80px]">
                      {activity.activityDate 
                        ? new Date(activity.activityDate).toLocaleDateString('de-DE')
                        : '-'}
                    </span>

                    {/* Subject/Title - clickable link for documents */}
                    <div className="flex-1 truncate">
                      {activity.activityType === 'Document' && activity.hasAttachment ? (
                        <a 
                          href={`/api/download/${activity.id}`}
                          className="text-[#E48F00] hover:underline font-medium text-sm flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Paperclip className="h-3 w-3" />
                          {activity.subject || '(Kein Titel)'}
                        </a>
                      ) : (
                        <span className="text-sm font-medium text-gray-900">
                          {activity.subject || '(Kein Titel)'}
                        </span>
                      )}
                    </div>

                    {/* Attachment Indicator */}
                    {activity.hasAttachment && (
                      <div className="flex items-center gap-1 text-gray-400">
                        <Paperclip className="h-4 w-4" />
                        {activity.attachmentCount > 1 && (
                          <span className="text-xs">{activity.attachmentCount}</span>
                        )}
                      </div>
                    )}

                    {/* Direction */}
                    {activity.direction && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        activity.direction === 'Inbound' 
                          ? 'bg-gray-50 text-[#E48F00]' 
                          : activity.direction === 'Outbound'
                          ? 'bg-gray-50 text-gray-700'
                          : 'bg-gray-50 text-gray-600'
                      }`}>
                        {activity.direction === 'Inbound' ? '← Eingehend' : 
                         activity.direction === 'Outbound' ? '→ Ausgehend' : 
                         activity.direction}
                      </span>
                    )}
                  </div>

                  {/* Expanded Content */}
                  {expandedActivities.has(activity.id) && (
                    <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                      {/* Content */}
                      {activity.content && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">Inhalt:</p>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border max-h-40 overflow-y-auto">
                            {activity.content}
                          </div>
                        </div>
                      )}

                      {/* Attachments */}
                      {activity.hasAttachment && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">Anhänge:</p>
                          <AttachmentsList activityId={activity.id} />
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="mt-3 pt-3 border-t text-xs text-gray-400">
                        Erstellt: {activity.createdAt 
                          ? new Date(activity.createdAt).toLocaleString('de-DE')
                          : '-'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">Keine Aktivitäten vorhanden</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowUpload(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Erste Datei archivieren
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Sub-component for attachments list
function AttachmentsList({ activityId }: { activityId: string }) {
  const { data: attachments = [] } = (trpc as any).attachments?.getByActivity?.useQuery
    ? (trpc as any).attachments.getByActivity.useQuery({ activityId })
    : { data: [] };

  if (!attachments || attachments.length === 0) {
    return <p className="text-xs text-gray-400 italic">Keine Anhänge gefunden</p>;
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2">
      {attachments.map((att: any) => (
        <div 
          key={att.id}
          className="flex items-center justify-between p-2 bg-white rounded border"
        >
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">{att.originalFileName}</p>
              <p className="text-xs text-gray-400">
                {formatFileSize(att.fileSize)} • {att.mimeType}
              </p>
            </div>
          </div>
          <a
            href={`/api/download/${att.id}`}
            className="flex items-center gap-1 text-[#E48F00] hover:text-gray-800 text-sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download className="h-4 w-4" />
            Download
          </a>
        </div>
      ))}
    </div>
  );
}
