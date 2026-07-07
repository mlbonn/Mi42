/**
 * FRIDAY CRM - Outreach Job Queue
 * Monitoring and management of Outreach Agent jobs (via agent_jobs)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { useState } from "react";

interface AgentJob {
  id: number;
  type: string;
  status: "pending" | "processing" | "completed" | "failed";
  payload: string | null;
  result: string | null;
  error: string | null;
  createdAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export default function OutreachJobQueue() {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: jobs = [], isLoading } = useQuery<AgentJob[]>({
    queryKey: ["/api/outreach/queue", selectedStatus],
    queryFn: async () => {
      const params = selectedStatus !== "all" ? `?status=${selectedStatus}` : "";
      const res = await fetch(`/api/outreach/queue${params}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const retryMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const res = await fetch(`/api/outreach/queue/${jobId}/retry`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/outreach/queue"] }),
  });

  const stats = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === "pending").length,
    processing: jobs.filter(j => j.status === "processing").length,
    completed: jobs.filter(j => j.status === "completed").length,
    failed: jobs.filter(j => j.status === "failed").length,
  };

  const filteredJobs = selectedStatus === "all" ? jobs : jobs.filter(j => j.status === selectedStatus);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any; label: string }> = {
      pending: { variant: "secondary", icon: Clock, label: "Pending" },
      processing: { variant: "default", icon: RefreshCw, label: "Processing" },
      completed: { variant: "outline", icon: CheckCircle, label: "Completed" },
      failed: { variant: "destructive", icon: XCircle, label: "Failed" },
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getDuration = (job: AgentJob) => {
    if (!job.startedAt) return "-";
    const end = job.completedAt || new Date().toISOString();
    const duration = new Date(end).getTime() - new Date(job.startedAt).getTime();
    const seconds = Math.floor(duration / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  return (
    <div className="container py-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outreach Job Queue</h1>
          <p className="text-sm text-gray-600">Monitor and manage Outreach Agent jobs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/outreach/queue"] })}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total Jobs", value: stats.total, color: "", filter: "all" },
          { label: "Pending", value: stats.pending, color: "text-gray-600", filter: "pending" },
          { label: "Processing", value: stats.processing, color: "text-orange-600", filter: "processing" },
          { label: "Completed", value: stats.completed, color: "text-green-600", filter: "completed" },
          { label: "Failed", value: stats.failed, color: "text-red-600", filter: "failed" },
        ].map(({ label, value, color, filter }) => (
          <Card key={filter} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedStatus(filter)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-600">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Jobs {selectedStatus !== "all" ? `(${selectedStatus})` : ""} — {filteredJobs.length} entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No jobs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-gray-600">ID</th>
                    <th className="pb-2 font-medium text-gray-600">Type</th>
                    <th className="pb-2 font-medium text-gray-600">Status</th>
                    <th className="pb-2 font-medium text-gray-600">Duration</th>
                    <th className="pb-2 font-medium text-gray-600">Created</th>
                    <th className="pb-2 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map(job => (
                    <tr key={job.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-mono text-xs text-gray-500">#{job.id}</td>
                      <td className="py-2 text-xs font-mono">{job.type}</td>
                      <td className="py-2">{getStatusBadge(job.status)}</td>
                      <td className="py-2 text-gray-600">{getDuration(job)}</td>
                      <td className="py-2 text-gray-500 text-xs">
                        {job.createdAt ? new Date(job.createdAt).toLocaleString("de-DE") : "-"}
                      </td>
                      <td className="py-2">
                        {job.status === "failed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => retryMutation.mutate(job.id)}
                            disabled={retryMutation.isPending}
                          >
                            Retry
                          </Button>
                        )}
                        {job.error && (
                          <span className="ml-2 text-xs text-red-500" title={job.error}>⚠</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
