import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, XCircle, Clock, UserPlus, ExternalLink, 
  Mail, Phone, Building2, Linkedin, Award, Briefcase 
} from "lucide-react";

export default function HunterFoundContacts() {
  const [reviewStatus, setReviewStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  
  const { data: results, isLoading, refetch } = trpc.hunterResults.list.useQuery({ reviewStatus });
  const { data: stats } = trpc.hunterResults.stats.useQuery();
  
  const updateReviewMutation = trpc.hunterResults.updateReviewStatus.useMutation({
    onSuccess: () => refetch(),
  });
  
  const addToCRMMutation = trpc.hunterResults.addToCRM.useMutation({
    onSuccess: () => {
      refetch();
      alert("Contact added to CRM successfully!");
    },
  });

  const handleApprove = (id: string) => {
    updateReviewMutation.mutate({ id, reviewStatus: "approved" });
  };

  const handleReject = (id: string) => {
    updateReviewMutation.mutate({ id, reviewStatus: "rejected" });
  };

  const handleAddToCRM = (id: string) => {
    if (confirm("Add this contact to CRM?")) {
      addToCRMMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-gray-100 text-gray-700";
      case "rejected": return "bg-gray-100 text-gray-600";
      case "pending": return "bg-gray-100 text-gray-600";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getEmailStatusColor = (status: string) => {
    switch (status) {
      case "valid": return "bg-gray-100 text-gray-700";
      case "invalid": return "bg-gray-100 text-gray-600";
      case "risky": return "bg-gray-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Hunter Found Contacts</h1>
        <p className="text-gray-600">
          Kontakte gefunden durch Hunter Agent
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Pending</div>
            <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Approved</div>
            <div className="text-2xl font-bold text-gray-700">{stats.approved}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Rejected</div>
            <div className="text-2xl font-bold text-gray-600">{stats.rejected}</div>
          </Card>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(["all", "pending", "approved", "rejected"] as const).map((status) => (
          <Button
            key={status}
            variant={reviewStatus === status ? "default" : "outline"}
            onClick={() => setReviewStatus(status)}
            className="capitalize"
          >
            {status}
          </Button>
        ))}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : !results || results.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-gray-400 mb-2">Keine Kontakte gefunden</div>
          <div className="text-sm text-gray-500">
            Hunter Agent hat noch keine Kontakte gefunden
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {results.map((result: any) => (
            <Card key={result.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">
                      {result.fullName || `${result.firstName} ${result.lastName}`}
                    </h3>
                    <Badge className={getStatusColor(result.reviewStatus)}>
                      {result.reviewStatus}
                    </Badge>
                    {result.emailStatus && (
                      <Badge className={getEmailStatusColor(result.emailStatus)}>
                        {result.emailStatus}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    {result.title && (
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {result.title}
                      </div>
                    )}
                    {result.seniority && (
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4" />
                        {result.seniority}
                      </div>
                    )}
                    {result.department && (
                      <Badge variant="outline">{result.department}</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {result.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <a href={`mailto:${result.email}`} className="text-[#E48F00] hover:underline">
                          {result.email}
                        </a>
                      </div>
                    )}
                    {result.phoneNumber && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <a href={`tel:${result.phoneNumber}`} className="text-[#E48F00] hover:underline">
                          {result.phoneNumber}
                        </a>
                      </div>
                    )}
                    {result.companyName && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span>{result.companyName}</span>
                      </div>
                    )}
                    {result.linkedinUrl && (
                      <div className="flex items-center gap-2">
                        <Linkedin className="w-4 h-4 text-gray-400" />
                        <a 
                          href={result.linkedinUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[#E48F00] hover:underline flex items-center gap-1"
                        >
                          LinkedIn
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                    <div>Source: <span className="font-medium">{result.dataSource}</span></div>
                    {result.confidence && (
                      <div>Confidence: <span className="font-medium">{result.confidence}%</span></div>
                    )}
                    {result.emailScore && (
                      <div>Email Score: <span className="font-medium">{result.emailScore}/100</span></div>
                    )}
                    <div>
                      {new Date(result.createdAt).toLocaleDateString("de-DE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {result.reviewStatus === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprove(result.id)}
                        className="text-gray-700 border-gray-300 hover:bg-gray-50"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(result.id)}
                        className="text-gray-600 border-gray-300 hover:bg-gray-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  {result.reviewStatus === "approved" && (
                    <Button
                      size="sm"
                      onClick={() => handleAddToCRM(result.id)}
                      disabled={addToCRMMutation.isPending}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add to CRM
                    </Button>
                  )}
                  {result.reviewStatus === "rejected" && (
                    <Badge variant="outline" className="text-gray-500">
                      <XCircle className="w-3 h-3 mr-1" />
                      Rejected
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

