import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, Archive, Search } from "lucide-react";
import PageHeader from '@/components/shared/PageHeader';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "../components/shared/StatusBadge";
import { format } from "date-fns";
import PartForm from "../components/parts/PartForm";
import PartDetail from "../components/parts/PartDetail";
import { fetchFilteredEntities } from '../components/shared/accessControl';
import { deleteAndLog } from "@/components/shared/useActivityLogger";

export default function Parts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [displayArchived, setDisplayArchived] = useState(false); // New state for displaying archived parts

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Determine if the current user is an internal user or admin
  const isInternalUser = currentUser?.user_type === 'internal';

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ['parts', currentUser?.id],
    queryFn: () => fetchFilteredEntities('Part', currentUser, '-created_date'),
    enabled: !!currentUser,
  });

  const { data: customStatuses = [] } = useQuery({
    queryKey: ['partStatusConfigs'],
    queryFn: () => base44.entities.PartStatusConfig.list(),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get('id'); // Changed from 'view' to 'id'
    if (viewId && parts.length > 0) {
      const itemToView = parts.find(c => c.id === viewId);
      if (itemToView) {
        setSelectedPart(itemToView);
        // Clean the URL so that reloading the page doesn't open the detail again
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [parts]); // Depend on parts to ensure data is loaded before trying to find an item

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Part.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Part.update(id, data),
    onSuccess: (updatedPart) => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      setSelectedPart(updatedPart); // Update the selected part with the latest data
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }) => base44.entities.Part.update(id, { archived }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      setSelectedPart(null); // Close detail view after archiving/unarchiving
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteAndLog("Part", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      setSelectedPart(null); // Close detail view after deletion
    },
  });

  const filteredParts = parts.filter(part => {
    const matchesSearch = part.vehicle_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.part_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.bodyshop_company?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || part.sourcing_status === filterStatus;
    
    // Filter based on whether archived parts should be displayed
    const matchesArchivedState = displayArchived ? part.archived : !part.archived;

    return matchesSearch && matchesStatus && matchesArchivedState;
  });

  // Build status options for filter - defaults + active custom
  const defaultStatuses = [
    "New Request",
    "Quoted",
    "Waiting Repairer Payment",
    "Need to Order",
    "Ordered",
    "Complete",
    "Cancelled",
    "Refund Required",
    "Needs Crediting"
  ];

  const activeCustomStatuses = customStatuses
    .filter(s => s.is_active)
    .map(s => s.status_name);

  const allStatuses = [...defaultStatuses, ...activeCustomStatuses];

  if (selectedPart) {
    return (
      <PartDetail
        part={selectedPart}
        onClose={() => setSelectedPart(null)}
        onUpdate={(data) => updateMutation.mutate({ id: selectedPart.id, data })}
        onArchive={({ id, archived }) => archiveMutation.mutate({ id, archived })}
        onDelete={(id) => deleteMutation.mutate(id)}
        isInternalUser={isInternalUser}
      />
    );
  }

  if (showForm) {
    return (
      <PartForm
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
          title={displayArchived ? "Archived parts" : "Parts"}
          subtitle={`${filteredParts.length} ${displayArchived ? "archived" : "active"} part${filteredParts.length === 1 ? "" : "s"} requests`}
          actions={isInternalUser && (
            <>
              {!displayArchived && (
                <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">New part</span>
                </Button>
              )}
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
            </>
          )}
        />

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" aria-hidden="true" />
            <Input
              placeholder="Search by vehicle, part or bodyshop…"
              aria-label="Search parts"
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
            {allStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Parts List - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-3 md:px-0 md:pb-0 md:pr-1">
        <div className="space-y-2">
          {isLoading ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading parts requests">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : filteredParts.length === 0 ? (
            <div className="rounded-xl border border-border bg-card shadow-card p-8 text-center text-sm text-muted-foreground">
              {searchTerm || filterStatus !== "all" ? "Nothing matches your search." : "No parts requests found."}
            </div>
          ) : (
            filteredParts.map((part) => (
              <div key={part.id} onClick={() => setSelectedPart(part)} className="rounded-xl border border-border bg-card shadow-card hover:bg-muted/40 cursor-pointer transition-colors p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-bold text-foreground">{part.vehicle_ref || 'No reference'}</h3>
                      <StatusBadge status={part.sourcing_status || 'New Request'} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs m-keep-2">
                      <div>
                        <p className="text-muted-foreground">Part Description</p>
                        <p className="font-medium text-foreground">{part.part_description?.substring(0, 50) || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Bodyshop</p>
                        <p className="font-medium text-foreground">{part.bodyshop_company || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Supplier</p>
                        <p className="font-medium text-foreground">{part.supplier || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Requested</p>
                        <p className="font-medium text-foreground">
                          {part.date_requested ? format(new Date(part.date_requested), 'dd/MM/yyyy') : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open"
                    onClick={(e) => { e.stopPropagation(); setSelectedPart(part); }}
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