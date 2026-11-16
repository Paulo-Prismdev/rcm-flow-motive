import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, Archive, Search } from "lucide-react"; // Import Archive icon
import PageHeader from '@/components/shared/PageHeader';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "../components/shared/StatusBadge";
import { format } from "date-fns";
import EngineeringForm from "../components/engineering/EngineeringForm";
import EngineeringDetail from "../components/engineering/EngineeringDetail";
import { fetchFilteredEntities } from '../components/shared/accessControl';
import { deleteAndLog } from "@/components/shared/useActivityLogger";

export default function Engineering() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [selectedEngineering, setSelectedEngineering] = useState(null); // Renamed from selectedJob
  const [displayArchived, setDisplayArchived] = useState(false); // New state for displaying archived jobs

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Determine if the current user is an internal user or an admin
  const isInternalUser = currentUser?.user_type === 'internal';

  const { data: engineering = [], isLoading } = useQuery({
    queryKey: ['engineering', currentUser?.id],
    queryFn: () => fetchFilteredEntities('Engineering', currentUser, '-created_date'),
    enabled: !!currentUser,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get('id'); // Changed from 'view' to 'id'
    if (viewId && engineering.length > 0) {
      const itemToView = engineering.find(c => c.id === viewId);
      if (itemToView) {
        setSelectedEngineering(itemToView); // Updated state setter
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [engineering]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Engineering.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engineering'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Engineering.update(id, data),
    onSuccess: (updatedJob) => {
      queryClient.invalidateQueries({ queryKey: ['engineering'] });
      // Update the selected job with the new data to reflect changes immediately
      setSelectedEngineering(updatedJob); // Updated state setter
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }) => base44.entities.Engineering.update(id, { archived }),
    onSuccess: (_, variables) => { // Corrected: `variables` contains the arguments passed to mutationFn
      queryClient.invalidateQueries({ queryKey: ['engineering'] });
      // If the selected item was archived/unarchived, update its state immediately
      if (selectedEngineering && selectedEngineering.id === variables.id) {
        setSelectedEngineering(prev => prev ? { ...prev, archived: variables.archived } : null);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteAndLog("Engineering", id),
    onSuccess: (_, deletedId) => { // Corrected: `deletedId` contains the argument passed to mutationFn
      queryClient.invalidateQueries({ queryKey: ['engineering'] });
      // If the currently selected item was deleted, close the detail view
      if (selectedEngineering && selectedEngineering.id === deletedId) {
        setSelectedEngineering(null);
      }
    },
  });

  // Filter engineering jobs based on search term, status, and archived state
  const filteredJobs = engineering.filter(eng => {
    const matchesSearch = eng.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         eng.vehicle_reg?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         eng.make_model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || eng.status === filterStatus;
    // Filter based on whether archived jobs should be displayed
    const matchesArchivedState = displayArchived ? eng.archived : !eng.archived;
    return matchesSearch && matchesStatus && matchesArchivedState;
  });

  if (selectedEngineering) { // Updated state variable
    return (
      <EngineeringDetail
        engineering={selectedEngineering} // Updated prop name and state variable
        onClose={() => setSelectedEngineering(null)} // Updated state setter
        onUpdate={(data) => updateMutation.mutate({ id: selectedEngineering.id, data })} // Updated state variable
        onArchive={({ id, archived }) => archiveMutation.mutate({ id, archived })} // New prop
        onDelete={(id) => deleteMutation.mutate(id)} // New prop
        isInternalUser={isInternalUser} // Pass isInternalUser prop
      />
    );
  }

  if (showForm) {
    return (
      <EngineeringForm
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
          title={displayArchived ? "Archived engineering" : "Engineering"}
          subtitle={`${filteredJobs.length} ${displayArchived ? "archived" : "active"} job${filteredJobs.length === 1 ? "" : "s"}`}
          actions={isInternalUser && (
            <>
              {!displayArchived && (
                <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">New job</span>
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
              placeholder="Search by reference or vehicle…"
              aria-label="Search by reference or vehicle"
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
            <option value="Scheduled">Scheduled</option>
            <option value="In Progress">In Progress</option>
            <option value="Report Pending">Report Pending</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Engineering List - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-3 md:px-0 md:pb-0 md:pr-1">
        <div className="space-y-2">
          {isLoading ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : filteredJobs.length === 0 ? ( // Use filteredJobs here
            <div className="rounded-xl border border-border bg-card shadow-card p-8 text-center text-sm text-muted-foreground">
              {searchTerm || filterStatus !== "all" ? "Nothing matches your search." : <>No {displayArchived ? "archived" : "active"} engineering jobs found.</>}
            </div>
          ) : (
            filteredJobs.map((job) => ( // Use filteredJobs here
              <div key={job.id} onClick={() => setSelectedEngineering(job)} className={`rounded-xl border border-border bg-card shadow-card hover:bg-muted/40 cursor-pointer transition-colors p-4 ${job.archived ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-bold text-foreground">{job.reference || job.vehicle_reg || 'Untitled'}</h3>
                      <StatusBadge status={job.status || 'New'} />
                      {job.archived && (
                        <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                          Archived
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs m-keep-2">
                      <div>
                        <p className="text-muted-foreground">Vehicle</p>
                        <p className="font-medium text-foreground">{job.make_model || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Inspection Type</p>
                        <p className="font-medium text-foreground">{job.inspection_type || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Engineer</p>
                        <p className="font-medium text-foreground">{job.engineer_assigned || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Requested</p>
                        <p className="font-medium text-foreground">
                          {job.date_requested ? format(new Date(job.date_requested), 'dd/MM/yyyy') : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open"
                    onClick={(e) => { e.stopPropagation(); setSelectedEngineering(job); }} // Updated state setter
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