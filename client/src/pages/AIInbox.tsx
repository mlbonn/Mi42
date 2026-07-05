import { useState } from "react";
import { trpc } from "../lib/trpc";
import { CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";

type SuggestionStatus = "pending" | "approved" | "rejected" | "applied";

const classificationColors: Record<string, string> = {
  interested: "bg-gray-100 text-gray-800",
  meeting_requested: "bg-gray-200 text-gray-900 font-semibold",
  not_interested: "bg-gray-50 text-gray-500",
  wrong_person: "bg-gray-50 text-gray-500",
  forwarded: "bg-gray-100 text-gray-700",
  out_of_office: "bg-gray-50 text-gray-500",
  unsubscribe: "bg-gray-100 text-gray-600",
  pricing_question: "bg-gray-100 text-gray-800",
  data_question: "bg-gray-100 text-gray-800",
  legal_question: "bg-gray-200 text-gray-900",
  competitor_question: "bg-gray-100 text-gray-800",
  unclear: "bg-gray-50 text-gray-500",
};

function StatusBadge({ status }: { status: SuggestionStatus }) {
  const map = {
    pending: { icon: Clock, label: "Pending", cls: "text-gray-500" },
    approved: { icon: CheckCircle, label: "Approved", cls: "text-gray-700" },
    rejected: { icon: XCircle, label: "Rejected", cls: "text-gray-400" },
    applied: { icon: CheckCircle, label: "Applied", cls: "text-gray-700" },
  };
  const { icon: Icon, label, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function SuggestionRow({ suggestion, onApprove, onReject }: {
  suggestion: {
    id: string;
    suggestionType: string;
    suggestionJson: unknown;
    confidence: string | null;
    status: SuggestionStatus;
    createdAt: Date | null;
  };
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const data = suggestion.suggestionJson as Record<string, unknown> | null;
  const classification = data?.classification as string | undefined;
  const summary = data?.summary as string | undefined;
  const riskFlags = data?.riskFlags as string[] | undefined;
  const nextAction = data?.nextAction as Record<string, unknown> | undefined;
  const confidence = suggestion.confidence ? Math.round(Number(suggestion.confidence) * 100) : null;

  return (
    <div className="border border-gray-200 rounded mb-2 bg-white">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-gray-400">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>

        {classification && (
          <span className={`text-xs px-2 py-0.5 rounded ${classificationColors[classification] ?? "bg-gray-100 text-gray-700"}`}>
            {classification.replace(/_/g, " ")}
          </span>
        )}

        <span className="text-sm text-gray-700 flex-1 truncate">{summary ?? "—"}</span>

        {confidence !== null && (
          <span className="text-xs text-gray-400 w-12 text-right">{confidence}%</span>
        )}

        <StatusBadge status={suggestion.status} />

        {suggestion.status === "pending" && (
          <div className="flex gap-2 ml-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onApprove(suggestion.id)}
              className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
            >
              Approve
            </button>
            <button
              onClick={() => onReject(suggestion.id)}
              className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 text-gray-500"
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 text-sm text-gray-600 space-y-2">
          {nextAction && (
            <div>
              <span className="font-medium text-gray-700">Next Action: </span>
              <span>{String(nextAction.type ?? "—")}</span>
              {(nextAction.title as any) && <span className="ml-2 text-gray-500">"{String(nextAction.title as any)}"</span>}
            </div>
          )}
          {riskFlags && riskFlags.length > 0 && (
            <div className="flex items-start gap-1">
              <AlertTriangle className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <span>{riskFlags.join(", ")}</span>
            </div>
          )}
          <div className="text-xs text-gray-400">
            {suggestion.createdAt ? new Date(suggestion.createdAt).toLocaleString() : "—"}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AIInbox() {
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus | "all">("all");

  const { data: suggestions, isLoading, refetch } = trpc.agent.listSuggestions.useQuery(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );

  const { data: tasks, isLoading: tasksLoading } = trpc.agent.listTasks.useQuery(
    { status: "open" }
  );

  const approve = trpc.agent.approveSuggestion.useMutation({ onSuccess: () => refetch() });
  const reject = trpc.agent.rejectSuggestion.useMutation({ onSuccess: () => refetch() });

  const filterOptions: { label: string; value: SuggestionStatus | "all" }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
    { label: "Applied", value: "applied" },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">AI Inbox</h1>
        <p className="text-sm text-gray-500 mt-1">
          Agent suggestions and tasks. Review before applying. No emails are sent automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Suggestions Panel */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-700">Suggestions</h2>
            <div className="flex gap-1">
              {filterOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`text-xs px-2 py-1 rounded border ${
                    statusFilter === opt.value
                      ? "border-gray-400 bg-gray-100 text-gray-800"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="text-sm text-gray-400 py-8 text-center">Loading...</div>
          ) : !suggestions?.length ? (
            <div className="text-sm text-gray-400 py-8 text-center border border-dashed border-gray-200 rounded">
              No suggestions found
            </div>
          ) : (
            suggestions.map((s) => (
              <SuggestionRow
                key={s.id}
                suggestion={{
                  ...s,
                  status: s.status as SuggestionStatus,
                }}
                onApprove={(id) => approve.mutate({ id })}
                onReject={(id) => reject.mutate({ id })}
              />
            ))
          )}
        </div>

        {/* Open Tasks Panel */}
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-3">Open Tasks (Agent)</h2>
          {tasksLoading ? (
            <div className="text-sm text-gray-400">Loading...</div>
          ) : !tasks?.length ? (
            <div className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded">
              No open tasks
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="border border-gray-200 rounded p-3 mb-2 bg-white">
                <div className="text-sm font-medium text-gray-800 truncate">{task.title}</div>
                {task.description && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</div>
                )}
                {task.dueAt && (
                  <div className="text-xs text-gray-400 mt-1">
                    Due: {new Date(task.dueAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
