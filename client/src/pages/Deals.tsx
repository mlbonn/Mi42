import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STAGES = [
  { id: 'Lead', label: 'Lead', color: 'bg-gray-100', headerColor: 'bg-gray-200' },
  { id: 'Qualified', label: 'Qualifiziert', color: 'bg-blue-50', headerColor: 'bg-blue-100' },
  { id: 'Proposal', label: 'Angebot', color: 'bg-yellow-50', headerColor: 'bg-yellow-100' },
  { id: 'Negotiation', label: 'Verhandlung', color: 'bg-orange-50', headerColor: 'bg-orange-100' },
  { id: 'Won', label: 'Gewonnen', color: 'bg-green-50', headerColor: 'bg-green-100' },
  { id: 'Lost', label: 'Verloren', color: 'bg-red-50', headerColor: 'bg-red-100' },
];

// Legacy stages mapping
const LEGACY_STAGE_MAP: Record<string, string> = {
  'Cold': 'Lead',
  'Contacted': 'Qualified',
  'Demo': 'Proposal',
  'Trial': 'Proposal',
  'Negotiation': 'Negotiation',
  'Closed Won': 'Won',
  'Closed Lost': 'Lost',
};

export default function Deals() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: deals, isLoading } = trpc.deals.list.useQuery();
  const { data: companies } = trpc.companies.list.useQuery();
  const { data: contacts } = trpc.contacts.list.useQuery();
  
  const updateDealMutation = trpc.deals.update.useMutation({
    onSuccess: () => utils.deals.list.invalidate(),
  });
  
  const createDealMutation = trpc.deals.create.useMutation({
    onSuccess: () => {
      utils.deals.list.invalidate();
      setShowNewDealDialog(false);
      setNewDealData({ dealName: '', dealValueEur: '', stage: 'Lead', description: '', companyId: '' });
    },
  });

  // Drag state
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  
  // New Deal Dialog
  const [showNewDealDialog, setShowNewDealDialog] = useState(false);
  const [newDealStage, setNewDealStage] = useState('Lead');
  const [newDealData, setNewDealData] = useState({
    dealName: '',
    dealValueEur: '',
    stage: 'Lead',
    description: '',
    companyId: '',
  });

  // Map legacy stages to new stages
  const mapStage = (stage: string) => LEGACY_STAGE_MAP[stage] || stage;

  // Group deals by stage
  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage.id] = deals?.filter(d => mapStage(d.stage || 'Lead') === stage.id) || [];
    return acc;
  }, {} as Record<string, typeof deals>);

  // Calculate totals per stage
  const stageTotals = STAGES.reduce((acc, stage) => {
    const stageDeals = dealsByStage[stage.id] || [];
    acc[stage.id] = stageDeals.reduce((sum, deal) => sum + (Number(deal?.dealValueEur) || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggedDealId(dealId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dealId);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    
    if (draggedDealId) {
      const deal = deals?.find(d => d.id === draggedDealId);
      if (deal && mapStage(deal.stage || '') !== newStage) {
        updateDealMutation.mutate({
          id: draggedDealId,
          stage: newStage,
        });
      }
    }
    setDraggedDealId(null);
  };

  const handleDragEnd = () => {
    setDraggedDealId(null);
    setDragOverStage(null);
  };

  // Open new deal dialog for specific stage
  const openNewDealDialog = (stageId: string) => {
    setNewDealStage(stageId);
    setNewDealData({ ...newDealData, stage: stageId });
    setShowNewDealDialog(true);
  };

  // Create new deal
  const handleCreateDeal = () => {
    if (!newDealData.dealName.trim()) return;
    
    createDealMutation.mutate({
      title: newDealData.dealName,
      value: newDealData.dealValueEur ? Number(newDealData.dealValueEur) : undefined,
      stage: newDealData.stage,
      companyId: newDealData.companyId || undefined,
      userId: user?.id || '',
    });
  };

  // Get company name
  const getCompanyName = (companyId: string | null | undefined) => {
    if (!companyId) return null;
    const companyList = (companies as any)?.data || companies || [];
    const company = companyList?.find((c: any) => c.id === companyId);
    return company?.name || null;
  };

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `€${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `€${(value / 1000).toFixed(0)}K`;
    }
    return `€${value.toLocaleString()}`;
  };

  // Format date
  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="h-full bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Pipeline</h1>
            <p className="text-sm text-gray-500 mt-1">
              {deals?.length || 0} Deals • {formatCurrency(deals?.reduce((sum, d) => sum + (Number(d.dealValueEur) || 0), 0) || 0)} Gesamtwert
            </p>
          </div>
          <Button 
            onClick={() => openNewDealDialog('Lead')}
            className="bg-black hover:bg-gray-800 text-white"
          >
            + Neuer Deal
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Lädt...</div>
        </div>
      ) : (
        <div className="p-4 overflow-x-auto">
          <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
            {STAGES.map((stage) => (
              <div
                key={stage.id}
                className={`flex-shrink-0 w-72 rounded-lg ${stage.color} ${
                  dragOverStage === stage.id ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {/* Column Header */}
                <div className={`px-3 py-2 rounded-t-lg ${stage.headerColor}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-700">{stage.label}</span>
                      <span className="text-xs text-gray-500 bg-white/50 px-1.5 py-0.5 rounded">
                        {dealsByStage[stage.id]?.length || 0}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                      {formatCurrency(stageTotals[stage.id])}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="p-2 min-h-[200px] space-y-2">
                  {dealsByStage[stage.id]?.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal.id)}
                      onDragEnd={handleDragEnd}
                      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                        draggedDealId === deal.id ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Deal Name */}
                      <Link href={`/deals/${deal.id}`}>
                        <div className="font-medium text-sm text-gray-900 hover:text-blue-600 mb-2 line-clamp-2">
                          {deal.dealName}
                        </div>
                      </Link>

                      {/* Company */}
                      {getCompanyName(deal.companyId) && (
                        <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {getCompanyName(deal.companyId)}
                        </div>
                      )}

                      {/* Value & Probability */}
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-900">
                          {deal.dealValueEur ? formatCurrency(Number(deal.dealValueEur)) : '—'}
                        </div>
                        {deal.probability && (
                          <div className="text-xs text-gray-500">
                            {deal.probability}%
                          </div>
                        )}
                      </div>

                      {/* Footer with date and tier */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        {deal.createdAt && (
                          <div className="text-xs text-gray-400">
                            {formatDate(deal.createdAt)}
                          </div>
                        )}
                        {deal.subscriptionTier && (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {deal.subscriptionTier}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add Deal Button */}
                  <button
                    onClick={() => openNewDealDialog(stage.id)}
                    className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded transition-colors flex items-center justify-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Neuer Deal
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Deal Dialog */}
      <Dialog open={showNewDealDialog} onOpenChange={setShowNewDealDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Neuen Deal erstellen</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dealName">Deal-Name *</Label>
              <Input
                id="dealName"
                value={newDealData.dealName}
                onChange={(e) => setNewDealData({ ...newDealData, dealName: e.target.value })}
                placeholder="z.B. Enterprise Lizenz - Firma XYZ"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dealValue">Wert (EUR)</Label>
                <Input
                  id="dealValue"
                  type="number"
                  value={newDealData.dealValueEur}
                  onChange={(e) => setNewDealData({ ...newDealData, dealValueEur: e.target.value })}
                  placeholder="50000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stage">Stage</Label>
                <Select
                  value={newDealData.stage}
                  onValueChange={(value) => setNewDealData({ ...newDealData, stage: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Firma</Label>
              <Select
                value={newDealData.companyId}
                onValueChange={(value) => setNewDealData({ ...newDealData, companyId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Firma auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {((companies as any)?.data || companies || [])?.map((company: any) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={newDealData.description}
                onChange={(e) => setNewDealData({ ...newDealData, description: e.target.value })}
                placeholder="Zusätzliche Informationen zum Deal..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDealDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleCreateDeal}
              disabled={!newDealData.dealName.trim() || createDealMutation.isPending}
              className="bg-black hover:bg-gray-800"
            >
              {createDealMutation.isPending ? 'Erstellt...' : 'Deal erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
