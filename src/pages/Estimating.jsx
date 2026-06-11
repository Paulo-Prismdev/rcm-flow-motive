import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "../components/shared/StatusBadge";
import { format } from "date-fns";
import EstimateForm from "../components/estimating/EstimateForm";
import EstimateDetail from "../components/estimating/EstimateDetail";
import { fetchFilteredEntities } from '../components/shared/accessControl';

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

  const isInternalUser = currentUser?.user_type === 'internal' || currentUser?.role === 'admin';

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
    mutationFn: (id) => base44.entities.Estimate.delete(id),
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
      {/* Header - Fixed */}
      <div className="glass p-3 md:p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3 md:mb-4 flex-wrap gap-2">
          <div>
            <h1 className="text-lg md:text-xl font-bold">
              {displayArchived ? "Archived Estimates" : "Estimating Management"}
            </h1>
            <p className="text-xs text-foreground-muted mt-0.5">
              {filteredEstimates.length} {displayArchived ? "archived estimates" : "active estimates"}
            </p>
          </div>
          <div className="flex gap-2">
            {!displayArchived && isInternalUser && (
              <Button
                onClick={() => setShowForm(true)}
                className="glass-button px-3 md:px-4 py-2 text-xs md:text-sm flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">New Estimate</span>
              </Button>
            )}
            {isInternalUser && (
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
              placeholder="Search estimates..."
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
            <option value="In Progress">In Progress</option>
            <option value="Awaiting Authority">Awaiting Authority</option>
            <option value="Authorised">Authorised</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Estimates List - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        <div className="space-y-2">
          {isLoading ? (
            <div className="neomorph p-6 text-center text-gray-500 text-sm">Loading estimates...</div>
          ) : filteredEstimates.length === 0 ? (
            <div className="neomorph p-6 text-center text-gray-500 text-sm">
              No estimates found.
            </div>
          ) : (
            filteredEstimates.map((estimate) => (
              <div key={estimate.id} className={`neomorph card-hover p-4 ${estimate.archived ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-bold text-gray-700">{estimate.name || 'Untitled'}</h3>
                      <StatusBadge status={estimate.status || 'New'} />
                      {estimate.archived && (
                        <span className="neomorph-flat px-2 py-1 text-xs font-medium text-gray-600">
                          Archived
                        </span>
                      )}
                      {estimate.priority === 'High' && (
                        <span className="neomorph-flat px-2 py-1 text-xs font-medium text-red-600">
                          High Priority
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">Repairer</p>
                        <p className="font-medium text-gray-700">{estimate.repairer || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Vehicle</p>
                        <p className="font-medium text-gray-700">{estimate.make_model || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Estimate Value</p>
                        <p className="font-medium text-gray-700">
                          {estimate.estimate_value ? `£${estimate.estimate_value.toFixed(2)}` : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Date Received</p>
                        <p className="font-medium text-gray-700">
                          {estimate.date_received ? format(new Date(estimate.date_received), 'dd/MM/yyyy') : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => setSelectedEstimate(estimate)}
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