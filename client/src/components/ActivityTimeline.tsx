import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Activity Timeline mit Filters
 * Inspiriert von HubSpot Activity Feed
 */

interface Activity {
  id: string;
  activityType: string | null;
  activityDate: Date | null;
  subject: string | null;
  content: string | null;
  direction: string | null;
  outcome: string | null;
  createdBy: string | null;
}

interface ActivityTimelineProps {
  activities: Activity[];
  onAddActivity?: () => void;
}

export default function ActivityTimeline({ activities, onAddActivity }: ActivityTimelineProps) {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    const matchesType = filterType === "all" || activity.activityType === filterType;
    const matchesUser = filterUser === "all" || activity.createdBy === filterUser;
    const matchesSearch =
      searchQuery === "" ||
      activity.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.content?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesType && matchesUser && matchesSearch;
  });

  // Get unique users
  const uniqueUsers = Array.from(
    new Set(activities.map((a) => a.createdBy).filter((u) => u !== null))
  );

  // Get activity type icon
  const getActivityIcon = (type: string | null) => {
    switch (type) {
      case "Email":
        return "✉";
      case "Call":
        return "☎";
      case "Meeting":
        return "📅";
      case "Demo":
        return "🖥";
      case "Note":
        return "📝";
      case "AI Outreach":
        return "🤖";
      default:
        return "•";
    }
  };

  // Get outcome badge class
  const getOutcomeClass = (outcome: string | null) => {
    if (!outcome) return "";
    const outcomeLower = outcome.toLowerCase();
    if (outcomeLower === "positive") return "text-[oklch(0.608_0.167_160.267)]";
    if (outcomeLower === "negative") return "text-[oklch(0.578_0.201_27.325)]";
    if (outcomeLower === "no response") return "text-[oklch(0.455_0_0)]";
    return "text-muted-foreground";
  };

  // Get direction indicator
  const getDirectionIndicator = (direction: string | null) => {
    if (direction === "Outbound") return "→";
    if (direction === "Inbound") return "←";
    return "";
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        {/* Search */}
        <Input
          placeholder="Suche in Aktivitäten..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />

        {/* Type Filter */}
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            <SelectItem value="Email">Email</SelectItem>
            <SelectItem value="Call">Call</SelectItem>
            <SelectItem value="Meeting">Meeting</SelectItem>
            <SelectItem value="Demo">Demo</SelectItem>
            <SelectItem value="Note">Note</SelectItem>
            <SelectItem value="AI Outreach">AI Outreach</SelectItem>
          </SelectContent>
        </Select>

        {/* User Filter */}
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="User" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle User</SelectItem>
            {uniqueUsers.map((user) => (
              <SelectItem key={user} value={user!}>
                {user}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {filteredActivities.length > 0 ? (
          filteredActivities.map((activity, index) => (
            <Card key={activity.id} className="p-4 relative">
              {/* Timeline connector line */}
              {index < filteredActivities.length - 1 && (
                <div className="absolute left-[22px] top-[52px] w-[2px] h-[calc(100%+12px)] bg-border" />
              )}

              <div className="flex gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-muted text-lg z-10">
                  {getActivityIcon(activity.activityType)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {activity.activityType || "Activity"}
                      </span>
                      {activity.direction && (
                        <span className="text-xs text-muted-foreground">
                          {getDirectionIndicator(activity.direction)} {activity.direction}
                        </span>
                      )}
                      {activity.outcome && (
                        <span className={`text-xs font-medium ${getOutcomeClass(activity.outcome)}`}>
                          {activity.outcome}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {activity.activityDate
                        ? new Date(activity.activityDate).toLocaleDateString("de-DE", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : ""}
                    </div>
                  </div>

                  {/* Subject */}
                  {activity.subject && (
                    <div className="text-sm font-medium mb-1">{activity.subject}</div>
                  )}

                  {/* Content */}
                  {activity.content && (
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {activity.content}
                    </div>
                  )}

                  {/* Created By */}
                  {activity.createdBy && (
                    <div className="text-xs text-muted-foreground mt-2">
                      von {activity.createdBy}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery || filterType !== "all" || filterUser !== "all"
              ? "Keine Aktivitäten gefunden"
              : "Keine Aktivitäten vorhanden"}
          </div>
        )}
      </div>

      {/* Add Activity Button */}
      <Button variant="outline" className="w-full" onClick={onAddActivity}>
        + Aktivität hinzufügen
      </Button>
    </div>
  );
}

