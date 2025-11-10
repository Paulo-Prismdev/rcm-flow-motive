
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "../components/shared/StatusBadge";
import { format } from "date-fns";
import PartForm from "../components/parts/PartForm";
import PartDetail from "../components/parts/PartDetail";
import { fetchFilteredEntities } from '../components/shared/accessControl';

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
  const isInternalUser = currentUser?.user_type === 'internal' || currentUser?.role === 'admin';

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
    mutationFn: (id) => base44.entities.Part.delete(id),
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
      {/* Header - Fixed */}
      <div className="glass p-3 md:p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3 md:mb-4 flex-wrap gap-2">
          <div>
            <h1 className="text-lg md:text-xl font-bold">
              {displayArchived ? "Archived Parts" : "Parts Management"}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {filteredParts.length} {displayArchived ? "archived parts" : "active parts"}
            </p>
          </div>
          <div className="flex gap-2">
            {!displayArchived && isInternalUser && (
              <Button
                onClick={() => setShowForm(true)}
                className="glass-button px-3 md:px-4 py-2 text-xs md:text-sm flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">New Part</span>
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

        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search by vehicle, part, or bodyshop..."
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
            {allStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Parts List - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        <div className="space-y-2">
          {isLoading ? (
            <div className="neomorph p-6 text-center text-gray-500 text-sm">Loading parts requests...</div>
          ) : filteredParts.length === 0 ? (
            <div className="neomorph p-6 text-center text-gray-500 text-sm">
              No parts requests found.
            </div>
          ) : (
            filteredParts.map((part) => (
              <div key={part.id} className="neomorph card-hover p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-bold text-gray-700">{part.vehicle_ref || 'No Reference'}</h3>
                      <StatusBadge status={part.sourcing_status || 'New Request'} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-gray-500">Part Description</p>
                        <p className="font-medium text-gray-700">{part.part_description?.substring(0, 50) || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Bodyshop</p>
                        <p className="font-medium text-gray-700">{part.bodyshop_company || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Supplier</p>
                        <p className="font-medium text-gray-700">{part.supplier || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Requested</p>
                        <p className="font-medium text-gray-700">
                          {part.date_requested ? format(new Date(part.date_requested), 'dd/MM/yyyy') : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => setSelectedPart(part)}
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
