import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, Archive } from "lucide-react"; // Import Archive icon
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "../components/shared/StatusBadge";
import { format } from "date-fns";
import EngineeringForm from "../components/engineering/EngineeringForm";
import EngineeringDetail from "../components/engineering/EngineeringDetail";
import { fetchFilteredEntities } from '../components/shared/accessControl';

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
  const isInternalUser = currentUser?.user_type === 'internal' || currentUser?.role === 'admin';

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
    mutationFn: (id) => base44.entities.Engineering.delete(id),
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
      {/* Header - Fixed */}
      <div className="glass p-3 md:p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3 md:mb-4 flex-wrap gap-2">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-gray-700">
              {displayArchived ? "Archived Engineering" : "Engineering Management"}
            </h1>
            <p className="text-xs text-foreground-muted mt-0.5">
              {filteredJobs.length} {displayArchived ? "archived jobs" : "active jobs"}
            </p>
          </div>
          <div className="flex gap-2">
            {!displayArchived && isInternalUser && ( // Show New Job button only for internal users and if not displaying archived
              <Button
                onClick={() => setShowForm(true)}
                className="glass-button px-3 md:px-4 py-2 text-xs md:text-sm flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">New Job</span>
              </Button>
            )}
            {isInternalUser && ( // Show Archive/Active toggle only for internal users
              <Button
                onClick={() => setDisplayArchived(!displayArchived)}
                className="glass-button px-3 md:px-4 py-2 text-xs md:text-sm flex items-center gap-2"
              >
                {displayArchived ? (
                  <>
                    <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Active</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Archived</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by reference or vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="neomorph-inset px-3 py-2 text-sm text-gray-700 border-0 focus:ring-0"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="neomorph-inset px-3 py-2 text-sm text-gray-700 border-0 rounded-lg"
          >
            <option value="all">All Statuses</option>
            <option value="New">New</option>
            <option value="Scheduled">Scheduled</option>
            <option value="In Progress">In Progress</option>
            <option value="Report Pending">Report Pending</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Engineering List - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        <div className="space-y-2">
          {isLoading ? (
            <div className="glass p-6 text-center text-gray-500 text-sm">Loading engineering jobs...</div>
          ) : filteredJobs.length === 0 ? ( // Use filteredJobs here
            <div className="glass p-6 text-center text-gray-500 text-sm">
              No {displayArchived ? "archived" : "active"} engineering jobs found.
            </div>
          ) : (
            filteredJobs.map((job) => ( // Use filteredJobs here
              <div key={job.id} className={`glass card-hover p-4 ${job.archived ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-bold text-gray-700">{job.reference || job.vehicle_reg || 'Untitled'}</h3>
                      <StatusBadge status={job.status || 'New'} />
                      {job.archived && (
                        <span className="neomorph-flat px-2 py-1 text-xs font-medium text-gray-600">
                          Archived
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">Vehicle</p>
                        <p className="font-medium text-gray-700">{job.make_model || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Inspection Type</p>
                        <p className="font-medium text-gray-700">{job.inspection_type || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Engineer</p>
                        <p className="font-medium text-gray-700">{job.engineer_assigned || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Requested</p>
                        <p className="font-medium text-gray-700">
                          {job.date_requested ? format(new Date(job.date_requested), 'dd/MM/yyyy') : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => setSelectedEngineering(job)} // Updated state setter
                    className="neomorph-flat p-2 transition-all active:neomorph-pressed ml-3"
                  >
                    <Eye className="w-4 h-4 text-gray-600" />
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