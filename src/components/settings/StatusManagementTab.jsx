import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Edit, Check, X, Plus, GripVertical, Lock } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const colorOptions = [
  { name: "blue", bg: "#3b82f6", label: "Blue" },
  { name: "green", bg: "#10b981", label: "Green" },
  { name: "orange", bg: "#f97316", label: "Orange" },
  { name: "red", bg: "#ef4444", label: "Red" },
  { name: "purple", bg: "#a855f7", label: "Purple" },
  { name: "yellow", bg: "#eab308", label: "Yellow" },
  { name: "gray", bg: "#6b7280", label: "Gray" },
  { name: "pink", bg: "#ec4899", label: "Pink" },
  { name: "indigo", bg: "#6366f1", label: "Indigo" },
  { name: "teal", bg: "#14b8a6", label: "Teal" },
  { name: "cyan", bg: "#06b6d4", label: "Cyan" },
  { name: "lime", bg: "#84cc16", label: "Lime" },
  { name: "amber", bg: "#f59e0b", label: "Amber" },
  { name: "rose", bg: "#f43f5e", label: "Rose" },
  { name: "slate", bg: "#64748b", label: "Slate" },
];

function StatusItem({ status, onUpdate, onDelete, onEditToggle, editingStatusId, editingData, setEditingData, provided, snapshot, isProtected, isInUse }) {
  const isEditing = editingStatusId === status.id;
  
  // Get the color object for display
  const statusColorObj = colorOptions.find(c => c.name === status.color);

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={`neomorph-flat p-3 mb-2 flex items-center justify-between transition-shadow ${snapshot.isDragging ? 'shadow-lg' : ''} ${isProtected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''}`}
    >
      <div className="flex items-center gap-3 flex-grow">
        <button {...provided.dragHandleProps} className="cursor-grab p-1">
          <GripVertical className="w-4 h-4 text-foreground-subtle" />
        </button>
        {isEditing ? (
          <>
            <Input
              value={editingData.status_name}
              onChange={(e) => setEditingData({ ...editingData, status_name: e.target.value })}
              className="neomorph-inset h-8 flex-grow max-w-xs"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground-muted whitespace-nowrap">Color:</span>
              <div className="flex gap-1 flex-wrap max-w-md">
                {colorOptions.map(color => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => setEditingData({ ...editingData, color: color.name })}
                    className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                      editingData.color === color.name 
                        ? 'ring-2 ring-accent ring-offset-2' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    style={{ backgroundColor: color.bg }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div 
                className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0"
                style={{ backgroundColor: statusColorObj?.bg || '#6b7280' }}
                title={statusColorObj?.label || 'Unknown'}
              />
              <span className="neomorph-flat px-3 py-1 text-xs font-medium">
                {status.status_name}
              </span>
              {isProtected && (
                <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                  <Lock className="w-3 h-3" />
                  <span>Default</span>
                </div>
              )}
              {isInUse && (
                <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <Lock className="w-3 h-3" />
                  <span>In use</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <Button size="icon" variant="ghost" onClick={() => onUpdate(status.id)} className="text-green-500 hover:text-green-600">
              <Check className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onEditToggle(null)} className="text-gray-500 hover:text-gray-600">
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <Button size="icon" variant="ghost" onClick={() => onEditToggle(status)} className="text-blue-500 hover:text-blue-600">
              <Edit className="w-4 h-4" />
            </Button>
            {!isInUse && (
              <Button size="icon" variant="ghost" onClick={() => onDelete(status.id)} className="text-red-500 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function StatusManagementTab({ department }) {
  const queryClient = useQueryClient();
  const entityName = `${department}StatusConfig`;
  const queryKey = [entityName];

  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('blue');
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [editingData, setEditingData] = useState({ status_name: '', color: 'blue' });

  const { data: statuses = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => base44.entities[entityName].list('sort_order'),
  });

  // Determine which entity/field to check for in-use statuses
  const statusField = department === 'Claim' ? 'job_status' : 'status';
  const recordEntityName = department === 'Claim' ? 'Claim' : department === 'Estimate' ? 'Estimate' : department === 'Engineering' ? 'Engineering' : department === 'Part' ? 'Part' : null;

  // For claims, check secondary/tertiary fields and the job_statuses array.
  // job_status is the *journey* field (different concept) — excluded.
  const claimStatusFields = department === 'Claim'
    ? ['secondary_status', 'tertiary_status']
    : null;

  const { data: liveRecords = [] } = useQuery({
    queryKey: [recordEntityName, 'statusCheck'],
    queryFn: () => base44.entities[recordEntityName].list(statusField, 5000),
    enabled: !!recordEntityName,
    staleTime: 60000,
  });

  const usedStatusNames = useMemo(() => {
    const names = new Set();
    liveRecords.forEach(r => {
      if (claimStatusFields) {
        claimStatusFields.forEach(f => { if (r[f]) names.add(r[f]); });
        if (Array.isArray(r.job_statuses)) r.job_statuses.forEach(s => names.add(s));
      } else {
        if (r[statusField]) names.add(r[statusField]);
      }
    });
    return names;
  }, [liveRecords, statusField, claimStatusFields]);

  // Check if "New" status exists
  const hasNewStatus = statuses.some(s => s.status_name === 'New');

  const sortedStatuses = useMemo(() => [...statuses].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)), [statuses]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities[entityName].create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setNewStatusName('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, oldName }) => {
      const updated = await base44.entities[entityName].update(id, data);

      // ── Rename cascade ──
      // When a status is renamed, update every existing record that still
      // references the old name so the Repairs table / portals reflect the
      // new label immediately.
      const newName = data.status_name;
      if (oldName && newName && oldName !== newName) {
        if (department === 'Claim') {
          await base44.entities.Claim.updateMany(
            { secondary_status: oldName },
            { $set: { secondary_status: newName } }
          );
          await base44.entities.Claim.updateMany(
            { tertiary_status: oldName },
            { $set: { tertiary_status: newName } }
          );
          // job_statuses is an array — fetch and bulkUpdate each match
          const claimsWithArray = await base44.entities.Claim.filter(
            { job_statuses: oldName }, '-updated_date', 5000
          );
          if (claimsWithArray.length > 0) {
            const arrUpdates = claimsWithArray.map(c => ({
              id: c.id,
              job_statuses: (c.job_statuses || []).map(s => (s === oldName ? newName : s)),
            }));
            for (let i = 0; i < arrUpdates.length; i += 500) {
              await base44.entities.Claim.bulkUpdate(arrUpdates.slice(i, i + 500));
            }
          }
        } else if (recordEntityName) {
          await base44.entities[recordEntityName].updateMany(
            { [statusField]: oldName },
            { $set: { [statusField]: newName } }
          );
        }
      }
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      queryClient.invalidateQueries({ queryKey: ['claimStatusConfigs'] });
      setEditingStatusId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities[entityName].delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Create "New" status if it doesn't exist
  React.useEffect(() => {
    if (!isLoading && !hasNewStatus) {
      createMutation.mutate({
        status_name: 'New',
        color: 'blue',
        is_default: true,
        sort_order: 0,
      });
    }
  }, [isLoading, hasNewStatus]);

  // Clear is_default on any status that isn't "New" (one-time cleanup)
  React.useEffect(() => {
    if (isLoading || statuses.length === 0) return;
    const toUnflag = statuses.filter(s => s.is_default === true && s.status_name !== 'New');
    if (toUnflag.length > 0) {
      base44.entities[entityName].bulkUpdate(
        toUnflag.map(s => ({ id: s.id, is_default: false }))
      ).then(() => queryClient.invalidateQueries({ queryKey }));
    }
  }, [isLoading, statuses]);

  const handleAddStatus = () => {
    if (newStatusName.trim()) {
      createMutation.mutate({
        status_name: newStatusName,
        color: newStatusColor,
        is_default: false,
        sort_order: sortedStatuses.length,
      });
    }
  };

  const handleEditToggle = (status) => {
    if (status) {
      setEditingStatusId(status.id);
      setEditingData({ status_name: status.status_name, color: status.color });
    } else {
      setEditingStatusId(null);
    }
  };

  const handleUpdate = (id) => {
    const status = sortedStatuses.find(s => s.id === id);
    // Don't allow renaming "New" status
    if (status?.status_name === 'New' && editingData.status_name !== 'New') {
      alert('The "New" status name cannot be changed as it is the default status for new records.');
      return;
    }
    updateMutation.mutate({ id, data: editingData, oldName: status?.status_name });
  };

  const [optimisticOrder, setOptimisticOrder] = useState(null);

  const bulkReorderMutation = useMutation({
    mutationFn: (updates) => base44.entities[entityName].bulkUpdate(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setOptimisticOrder(null);
    },
    onError: () => {
      setOptimisticOrder(null);
    },
  });

  const displayStatuses = optimisticOrder || sortedStatuses;

  function handleDragEnd(result) {
    const { destination, source } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    const newOrder = Array.from(displayStatuses);
    const [reorderedItem] = newOrder.splice(source.index, 1);
    newOrder.splice(destination.index, 0, reorderedItem);

    // Optimistically update UI immediately
    setOptimisticOrder(newOrder);

    // Send a single bulk update
    const updates = newOrder.map((status, index) => ({ id: status.id, sort_order: index }));
    bulkReorderMutation.mutate(updates);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">{department} Statuses</h2>
      <div className="neomorph-inset p-4 bg-blue-50 dark:bg-blue-900/20">
        <div className="flex items-start gap-2">
          <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> Only the "New" status is marked as Default and cannot be renamed. Any status that is currently in use on active records cannot be deleted. All other statuses can be freely edited or removed when no longer in use.
          </div>
        </div>
      </div>

      {/* Add New Status */}
      <div className="neomorph p-4 space-y-3">
        <h3 className="text-md font-semibold">Add New Status</h3>
        <div className="flex flex-col gap-3">
          <Input
            placeholder="New status name..."
            value={newStatusName}
            onChange={(e) => setNewStatusName(e.target.value)}
            className="neomorph-inset"
          />
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
            <span className="text-sm font-medium whitespace-nowrap">Select Color:</span>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map(color => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setNewStatusColor(color.name)}
                  className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                    newStatusColor === color.name 
                      ? 'ring-2 ring-accent ring-offset-2' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  style={{ backgroundColor: color.bg }}
                  title={color.label}
                />
              ))}
            </div>
          </div>
          <Button onClick={handleAddStatus} className="neomorph-flat text-accent flex items-center gap-2 w-full md:w-auto">
            <Plus className="w-4 h-4" /> Add Status
          </Button>
        </div>
      </div>

      {/* Status List */}
      <div className="space-y-2">
        {isLoading ? (
          <p>Loading statuses...</p>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="statuses">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {displayStatuses.map((status, index) => (
                    <Draggable key={status.id} draggableId={status.id} index={index}>
                      {(provided, snapshot) => (
                        <StatusItem
                          status={status}
                          onUpdate={handleUpdate}
                          onDelete={deleteMutation.mutate}
                          onEditToggle={handleEditToggle}
                          editingStatusId={editingStatusId}
                          editingData={editingData}
                          setEditingData={setEditingData}
                          provided={provided}
                          snapshot={snapshot}
                          isProtected={status.status_name === 'New'}
                          isInUse={usedStatusNames.has(status.status_name)}
                        />
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}