import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, Archive, Search } from "lucide-react";
import PageHeader from '@/components/shared/PageHeader';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "../components/shared/StatusBadge";
import { format } from "date-fns";
import EstimateForm from "../components/estimating/EstimateForm";
import EstimateDetail from "../components/estimating/EstimateDetail";
import { fetchFilteredEntities } from '../components/shared/accessControl';
import { deleteAndLog } from "@/components/shared/useActivityLogger";

export default function Estimating() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [displayArchived, setDisplayArchived] = useState(false); // New state for displaying archived estimates

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isInternalUser = currentUser?.user_type === 'internal';

  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ['estimates', currentUser?.id],
    queryFn: () => fetchFilteredEntities('Estimate', currentUser, '-created_date'),
    enabled: !!currentUser,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get('id'); // Changed from 'view' to 'id'
    if (viewId && estimates.length > 0) {
      const itemToView = estimates.find(c => c.id === viewId);
      if (itemToView) {
        setSelectedEstimate(itemToView);
        // Clear the 'id' parameter from the URL after processing it
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [estimates]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Estimate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Estimate.update(id, data),
    onSuccess: (updatedEstimate) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      setSelectedEstimate(updatedEstimate); // Optionally update the selected estimate in view
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }) => base44.entities.Estimate.update(id, { archived }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      setSelectedEstimate(null); // Close the detail view after archiving/unarchiving
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteAndLog("Estimate", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      setSelectedEstimate(null); // Close the detail view after deletion
    },
  });

  const filteredEstimates = estimates.filter(est => {
    const matchesSearch = est.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         est.make_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         est.repairer?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || est.status === filterStatus;
    const matchesArchived = displayArchived ? est.archived : !est.archived; // Only show non-archived by default unless displayArchived is true
    return matchesSearch && matchesStatus && matchesArchived;
  });

  if (selectedEstimate) {
    return (
      <EstimateDetail
        estimate={selectedEstimate}
        onClose={() => setSelectedEstimate(null)}
        onUpdate={(data) => updateMutation.mutate({ id: selectedEstimate.id, data })}
        onArchive={({ id, archived }) => archiveMutation.mutate({ id, archived })}
        onDelete={(id) => deleteMutation.mutate(id)}
        isInternalUser={isInternalUser}
      />
    );
  }

  if (showForm) {
    return (
      <EstimateForm
        onSubmit={(data) => createMutation.mutate(data)}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col gap-3 md:gap-4">
      {/* Header */}
      <div className="flex-shrink-0 space-y-3 px-3 pt-3 md:px-0 md:pt-0">
        <PageHeader
          title={displayArchived ? "Archived estimates" : "Estimating"}
          subtitle={`${filteredEstimates.length} ${displayArchived ? "archived" : "active"} estimate${filteredEstimates.length === 1 ? "" : "s"}`}
          actions={isInternalUser && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDisplayArchived(!displayArchived)}
                aria-pressed={displayArchived}
                className="gap-1.5"
              >
                {displayArchived ? <Eye className="w-4 h-4" aria-hidden="true" /> : <Archive className="w-4 h-4" aria-hidden="true" />}
                <span className="hidden sm:inline">{displayArchived ? "Show active" : "Archived"}</span>
              </Button>
              {!displayArchived && (
                <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">New estimate</span>
                </Button>
              )}
            </>
          )}
        />

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" aria-hidden="true" />
            <Input
              placeholder="Search estimates…"
              aria-label="Search estimates"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Status"
            className="h-9 rounded-lg border border-input bg-card px-2.5 text-[13px] text-foreground"
          >
            <option value="all">All statuses</option>
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="Awaiting Authority">Awaiting Authority</option>
            <option value="Authorised">Authorised</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Estimates List - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-3 md:px-0 md:pb-0 md:pr-1">
        <div className="space-y-2">
          {isLoading ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : filteredEstimates.length === 0 ? (
            <div className="rounded-xl border border-border bg-card shadow-card p-8 text-center text-sm text-muted-foreground">
              {searchTerm || filterStatus !== "all" ? "Nothing matches your search." : <>No estimates found.</>}
            </div>
          ) : (
            filteredEstimates.map((estimate) => (
              <div key={estimate.id} onClick={() => setSelectedEstimate(estimate)} className={`rounded-xl border border-border bg-card shadow-card hover:bg-muted/40 cursor-pointer transition-colors p-4 ${estimate.archived ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-bold text-foreground">{estimate.name || 'Untitled'}</h3>
                      <StatusBadge status={estimate.status || 'New'} />
                      {estimate.archived && (
                        <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                          Archived
                        </span>
                      )}
                      {estimate.priority === 'High' && (
                        <span className="px-2 py-0.5 rounded-full bg-danger-bg text-xs font-medium text-danger-fg">
                          High priority
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs m-keep-2">
                      <div>
                        <p className="text-muted-foreground">Repairer</p>
                        <p className="font-medium text-foreground">{estimate.repairer || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Vehicle</p>
                        <p className="font-medium text-foreground">{estimate.make_model || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Estimate Value</p>
                        <p className="font-medium text-foreground">
                          {estimate.estimate_value ? `£${estimate.estimate_value.toFixed(2)}` : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Date Received</p>
                        <p className="font-medium text-foreground">
                          {estimate.date_received ? format(new Date(estimate.date_received), 'dd/MM/yyyy') : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open"
                    onClick={(e) => { e.stopPropagation(); setSelectedEstimate(estimate); }}
                    className="ml-3 flex-shrink-0"
                  >
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}