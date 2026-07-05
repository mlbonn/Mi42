// @ts-nocheck
import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';

interface ProjectLinkModalProps {
  emailId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ProjectLinkModal: React.FC<ProjectLinkModalProps> = ({
  emailId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const { data: projects } = (trpc.projects as any).getAll.useQuery();
  const { data: projectStats } = trpc.projects.getProjectStats.useQuery(
    { projectId: selectedProjectId },
    { enabled: !!selectedProjectId }
  );

  const linkMutation = (trpc.projects.linkEmailToProject as any).useMutation({
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Mit Projekt verlinken</h2>

        {/* Projekt-Liste */}
        <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
          {projects?.map((project: any) => (
            <button
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className={`w-full text-left p-3 rounded border transition ${
                selectedProjectId === project.id
                  ? 'border-orange-600 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">{project.name}</div>
              <div className="text-xs text-gray-600">{project.company}</div>
            </button>
          ))}
        </div>

        {/* Stats anzeigen */}
        {projectStats && (
          <div className="bg-gray-50 p-4 rounded mb-6">
            <div className="text-sm font-semibold mb-3">📊 Projekt-Übersicht</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>E-Mails:</span>
                <span className="font-semibold">{projectStats.emailCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Kosten:</span>
                <span className={projectStats.budgetUtilization > 100 ? 'text-red-600 font-semibold' : ''}>
                  €{projectStats.budgetSpent} / €{projectStats.budget}
                </span>
              </div>
              {projectStats.budgetUtilization > 100 && (
                <div className="text-red-600 font-semibold">
                  ⚠️ {projectStats.budgetUtilization.toFixed(0)}% über Budget
                </div>
              )}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            onClick={() =>
              linkMutation.mutate({
                emailId,
                projectId: selectedProjectId,
              })
            }
            disabled={!selectedProjectId || linkMutation.isPending}
            className="flex-1 px-4 py-2 bg-bl2020-orange text-white rounded hover:bg-bl2020-orange-dark disabled:opacity-50"
          >
            {linkMutation.isPending ? 'Wird verlinkt...' : 'Verlinken'}
          </button>
        </div>
      </div>
    </div>
  );
};
