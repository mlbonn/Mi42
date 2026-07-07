/**
 * FRIDAY CRM - Scout Job Queue Page
 * Übersicht über alle Scout Agent Jobs (Pending, Processing, Completed, Failed)
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Clock, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Trash2,
  Play,
  Filter,
  RotateCcw,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { de } from "date-fns/locale";

type JobStatus = "Pending" | "Processing" | "Completed" | "Failed" | "all";

const statusConfig: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  Pending: { label: "Wartend", icon: <Clock className="h-4 w-4" />, variant: "secondary" },
  Processing: { label: "In Bearbeitung", icon: <Loader2 className="h-4 w-4 animate-spin" />, variant: "default" },
  Completed: { label: "Abgeschlossen", icon: <CheckCircle2 className="h-4 w-4" />, variant: "outline" },
  Failed: { label: "Fehlgeschlagen", icon: <XCircle className="h-4 w-4" />, variant: "destructive" },
};

export default function ScoutQueue() {
  const [statusFilter, setStatusFilter] = useState<JobStatus>("all");
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);

  // Queries
  const { data: jobs, isLoading, refetch } = trpc.scout.getQueueJobs.useQuery(
    statusFilter === "all" ? {} : { status: statusFilter }
  );
  const { data: stats } = trpc.scout.getQueueStats.useQuery();

  // Mutations
  const deleteJob = trpc.scout.deleteQueueJob.useMutation({
    onSuccess: () => {
      toast.success("Job gelöscht", { description: "Der Job wurde erfolgreich entfernt." });
      refetch();
    },
    onError: (error) => {
      toast.error("Fehler", { description: error.message });
    },
  });

  const retryJob = trpc.scout.retryQueueJob.useMutation({
    onSuccess: () => {
      toast.success("Job neu gestartet", { description: "Der Job wurde zur Warteschlange hinzugefügt." });
      refetch();
    },
    onError: (error) => {
      toast.error("Fehler", { description: error.message });
    },
  });

  const bulkDelete = trpc.scout.bulkDeleteQueueJobs.useMutation({
    onSuccess: (data) => {
      toast.success("Jobs gelöscht", { description: `${data.count} Jobs wurden entfernt.` });
      setSelectedJobs([]);
      refetch();
    },
    onError: (error) => {
      toast.error("Fehler", { description: error.message });
    },
  });

  const bulkRetry = trpc.scout.bulkRetryQueueJobs.useMutation({
    onSuccess: (data) => {
      toast.success("Jobs neu gestartet", { description: `${data.count} Jobs wurden zur Warteschlange hinzugefügt.` });
      setSelectedJobs([]);
      refetch();
    },
    onError: (error) => {
      toast.error("Fehler", { description: error.message });
    },
  });

  const processNext = trpc.scout.processNextJob.useMutation({
    onSuccess: () => {
      toast.success("Job verarbeitet", { description: "Der nächste Job wurde verarbeitet." });
      refetch();
    },
    onError: (error) => {
      toast.error("Fehler", { description: error.message });
    },
  });

  // Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked && jobs) {
      setSelectedJobs(jobs.map((job) => job.id));
    } else {
      setSelectedJobs([]);
    }
  };

  const handleSelectJob = (jobId: string, checked: boolean) => {
    if (checked) {
      setSelectedJobs([...selectedJobs, jobId]);
    } else {
      setSelectedJobs(selectedJobs.filter((id) => id !== jobId));
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    const d = new Date(date);
    return format(d, "dd.MM.yyyy HH:mm", { locale: de });
  };

  const formatRelativeDate = (date: Date | string | null) => {
    if (!date) return "-";
    const d = new Date(date);
    return formatDistanceToNow(d, { addSuffix: true, locale: de });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scout Job Queue</h1>
          <p className="text-muted-foreground">
            Übersicht über alle Scout Agent Jobs (Pending, Processing, Completed, Failed)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
          <Button onClick={() => processNext.mutate()} disabled={processNext.isPending}>
            {processNext.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Nächsten Job verarbeiten
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gesamt</CardDescription>
            <CardTitle className="text-2xl">{stats?.total || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-gray-300/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              Wartend
            </CardDescription>
            <CardTitle className="text-2xl text-gray-600">{stats?.pending || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-[#E48F00]/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-[#E48F00] animate-spin" />
              In Bearbeitung
            </CardDescription>
            <CardTitle className="text-2xl text-[#E48F00]">{stats?.processing || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-gray-300/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-gray-600" />
              Abgeschlossen
            </CardDescription>
            <CardTitle className="text-2xl text-gray-700">{stats?.completed || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-gray-300/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-gray-500" />
              Fehlgeschlagen
            </CardDescription>
            <CardTitle className="text-2xl text-gray-600">{stats?.failed || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters and Bulk Actions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter:</span>
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as JobStatus)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="Pending">Wartend</SelectItem>
                  <SelectItem value="Processing">In Bearbeitung</SelectItem>
                  <SelectItem value="Completed">Abgeschlossen</SelectItem>
                  <SelectItem value="Failed">Fehlgeschlagen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedJobs.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedJobs.length} ausgewählt
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkRetry.mutate({ ids: selectedJobs })}
                  disabled={bulkRetry.isPending}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Neu starten
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Löschen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Jobs löschen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Möchten Sie wirklich {selectedJobs.length} Jobs löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => bulkDelete.mutate({ ids: selectedJobs })}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Löschen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : jobs && jobs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedJobs.length === jobs.length && jobs.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Seed Type</TableHead>
                  <TableHead>Generation</TableHead>
                  <TableHead>Discovery Method</TableHead>
                  <TableHead>Geplant</TableHead>
                  <TableHead>Gestartet</TableHead>
                  <TableHead>Abgeschlossen</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} className={job.status === "Failed" ? "bg-gray-50/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedJobs.includes(job.id)}
                        onCheckedChange={(checked) => handleSelectJob(job.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[job.status || "Pending"]?.variant || "secondary"}>
                        <span className="flex items-center gap-1">
                          {statusConfig[job.status || "Pending"]?.icon}
                          {statusConfig[job.status || "Pending"]?.label || job.status}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{job.seedType || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">Gen {job.generation || 0}</Badge>
                    </TableCell>
                    <TableCell>{job.discoveryMethod || "-"}</TableCell>
                    <TableCell>
                      <span title={formatDate(job.scheduledAt)}>
                        {formatRelativeDate(job.scheduledAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {job.startedAt ? (
                        <span title={formatDate(job.startedAt)}>
                          {formatRelativeDate(job.startedAt)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {job.completedAt ? (
                        <span title={formatDate(job.completedAt)}>
                          {formatRelativeDate(job.completedAt)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(job.status === "Failed" || job.status === "Completed") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => retryJob.mutate({ id: job.id })}
                            disabled={retryJob.isPending}
                            title="Neu starten"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Löschen">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Job löschen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Möchten Sie diesen Job wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteJob.mutate({ id: job.id })}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Löschen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">Keine Jobs gefunden</p>
              <p className="text-sm">
                {statusFilter !== "all"
                  ? `Es gibt keine Jobs mit dem Status "${statusConfig[statusFilter]?.label}".`
                  : "Die Job Queue ist leer."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Details for Failed Jobs */}
      {jobs && jobs.some((job) => job.status === "Failed" && job.errorMessage) && (
        <Card className="border-gray-300/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-600">
              <XCircle className="h-5 w-5" />
              Fehlermeldungen
            </CardTitle>
            <CardDescription>
              Details zu fehlgeschlagenen Jobs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {jobs
              .filter((job) => job.status === "Failed" && job.errorMessage)
              .map((job) => (
                <div key={job.id} className="p-4 bg-gray-50 rounded-lg border border-gray-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{job.seedType} (Gen {job.generation})</span>
                    <span className="text-xs text-muted-foreground">{formatDate(job.completedAt)}</span>
                  </div>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-gray-100 p-2 rounded">
                    {job.errorMessage}
                  </pre>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
