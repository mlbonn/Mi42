/**
 * FRIDAY CRM - Scout Job Queue
 * Monitoring and management of Scout Agent jobs
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle, CheckCircle, Clock, XCircle, Play } from "lucide-react";
import { useState } from "react";

interface ScoutJob {
  id: string;
  seedName: string;
  seedUrl: string;
  discoveryMethod: string;
  status: "pending" | "processing" | "completed" | "failed";
  priority: number;
  corporationsFound: number;
  error: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export default function ScoutJobQueue() {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch jobs
  const { data: jobs = [], isLoading } = useQuery<ScoutJob[]>({
    queryKey: ["/api/scout/jobs", selectedStatus],
    refetchInterval: autoRefresh ? 5000 : false, // Auto-refresh every 5s
  });

  // Retry failed job mutation
  const retryJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`/api/scout/jobs/${jobId}/retry`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scout/jobs"] });
    },
  });

  // Calculate stats
  const stats = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === "pending").length,
    processing: jobs.filter(j => j.status === "processing").length,
    completed: jobs.filter(j => j.status === "completed").length,
    failed: jobs.filter(j => j.status === "failed").length,
  };

  // Filter jobs
  const filteredJobs = selectedStatus === "all" 
    ? jobs 
    : jobs.filter(j => j.status === selectedStatus);

  // Status badge
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any, label: string }> = {
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

  // Calculate duration
  const getDuration = (job: ScoutJob) => {
    if (!job.startedAt) return "-";
    const end = job.completedAt || new Date();
    const duration = new Date(end).getTime() - new Date(job.startedAt).getTime();
    const seconds = Math.floor(duration / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  return (
    <div className="container py-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scout Job Queue</h1>
          <p className="text-sm text-gray-600">Monitor and manage Scout Agent jobs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/scout/jobs"] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedStatus("all")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600">Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedStatus("pending")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedStatus("processing")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#E48F00]">{stats.processing}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedStatus("completed")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-700">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedStatus("failed")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {selectedStatus === "all" ? "All Jobs" : `${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Jobs`}
              <span className="ml-2 text-sm font-normal text-gray-500">({filteredJobs.length})</span>
            </CardTitle>
            {selectedStatus !== "all" && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedStatus("all")}>
                Show All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading jobs...</div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No jobs found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Seed Name</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Method</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Found</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Duration</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Created</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => (
                    <tr key={job.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <div className="font-medium">{job.seedName}</div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">{job.seedUrl}</div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="outline" className="text-xs">
                          {job.discoveryMethod}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        {getStatusBadge(job.status)}
                      </td>
                      <td className="py-3 px-3">
                        {job.status === "completed" ? (
                          <span className="font-medium">{job.corporationsFound}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        {getDuration(job)}
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        {new Date(job.createdAt).toLocaleString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-3">
                        {job.status === "failed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => retryJobMutation.mutate(job.id)}
                            disabled={retryJobMutation.isPending}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Retry
                          </Button>
                        )}
                        {job.error && (
                          <div className="mt-1 text-xs text-gray-600 flex items-start gap-1">
                            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{job.error}</span>
                          </div>
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

