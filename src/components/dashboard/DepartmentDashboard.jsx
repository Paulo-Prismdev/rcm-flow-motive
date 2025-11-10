
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Settings, Plus, Save, X, Layout as LayoutIcon } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import WidgetStatCard from "./widgets/WidgetStatCard";
import WidgetRecentActivity from "./widgets/WidgetRecentActivity";
import WidgetInvoiceTracking from "./widgets/WidgetInvoiceTracking";
// WidgetDepartmentLinks is being removed
import WidgetCustomMetric from "./widgets/WidgetCustomMetric";
import WidgetQuickActions from "./widgets/WidgetQuickActions";
import WidgetActivityFeed from "./widgets/WidgetActivityFeed";
import WidgetDepartmentStats from "./widgets/WidgetDepartmentStats";
import WidgetStatusBreakdown from "./widgets/WidgetStatusBreakdown";
import WidgetRecentItems from "./widgets/WidgetRecentItems";
import WidgetGallery from "./WidgetGallery";

const WIDGET_COMPONENTS = {
  StatCard: WidgetStatCard,
  RecentActivity: WidgetRecentActivity,
  InvoiceTracking: WidgetInvoiceTracking,
  // DepartmentLinks: WidgetDepartmentLinks, // Removed as per instructions
  CustomMetric: WidgetCustomMetric,
  QuickActions: WidgetQuickActions,
  ActivityFeed: WidgetActivityFeed,
  DepartmentStats: WidgetDepartmentStats,
  StatusBreakdown: WidgetStatusBreakdown,
  RecentItems: WidgetRecentItems,
};

const DEPARTMENT_TEMPLATES = {
  Claims: [
    { id: 'claims-stats', type: 'DepartmentStats', config: { department: 'Claims', entity: 'Claim' } },
    { id: 'claims-status', type: 'StatusBreakdown', config: { department: 'Claims', entity: 'Claim', statusField: 'job_status' } },
    { id: 'claims-recent', type: 'RecentItems', config: { department: 'Claims', entity: 'Claim', limit: 10 } },
    { id: 'claims-invoice', type: 'StatCard', config: { title: 'Ready to Invoice', entity: 'Claim', color: 'green', filter: { invoice_status: 'Ready to Invoice' } } },
  ],
  Estimating: [
    { id: 'est-stats', type: 'DepartmentStats', config: { department: 'Estimating', entity: 'Estimate' } },
    { id: 'est-status', type: 'StatusBreakdown', config: { department: 'Estimating', entity: 'Estimate', statusField: 'status' } },
    { id: 'est-recent', type: 'RecentItems', config: { department: 'Estimating', entity: 'Estimate', limit: 10 } },
    { id: 'est-priority', type: 'StatCard', config: { title: 'High Priority', entity: 'Estimate', color: 'red', filter: { priority: 'High' } } },
  ],
  Engineering: [
    { id: 'eng-stats', type: 'DepartmentStats', config: { department: 'Engineering', entity: 'Engineering' } },
    { id: 'eng-status', type: 'StatusBreakdown', config: { department: 'Engineering', entity: 'Engineering', statusField: 'status' } },
    { id: 'eng-recent', type: 'RecentItems', config: { department: 'Engineering', entity: 'Engineering', limit: 10 } },
    { id: 'eng-pending', type: 'StatCard', config: { title: 'Reports Pending', entity: 'Engineering', color: 'orange', filter: { report_status: 'In Progress' } } },
  ],
  Parts: [
    { id: 'parts-stats', type: 'DepartmentStats', config: { department: 'Parts', entity: 'Part' } },
    { id: 'parts-status', type: 'StatusBreakdown', config: { department: 'Parts', entity: 'Part', statusField: 'sourcing_status' } },
    { id: 'parts-recent', type: 'RecentItems', config: { department: 'Parts', entity: 'Part', limit: 10 } },
    { id: 'parts-urgent', type: 'StatCard', config: { title: 'Urgent Requests', entity: 'Part', color: 'red', filter: { sourcing_status: 'Need to Order' } } },
  ],
};

export default function DepartmentDashboard({ department }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showWidgetGallery, setShowWidgetGallery] = useState(false);
  const [localWidgets, setLocalWidgets] = useState([]);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: dashboardConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['dashboardConfig', currentUser?.id, department],
    queryFn: async () => {
      const configs = await base44.entities.DashboardConfig.filter({ 
        user_id: currentUser.id,
        department: department 
      });
      return configs[0] || null;
    },
    enabled: !!currentUser,
  });

  // Initialize local widgets when config loads
  React.useEffect(() => {
    if (dashboardConfig?.widgets && dashboardConfig.widgets.length > 0) {
      setLocalWidgets(dashboardConfig.widgets);
    } else if (!isLoadingConfig && !dashboardConfig) {
      setLocalWidgets(DEPARTMENT_TEMPLATES[department] || []);
    }
  }, [dashboardConfig, isLoadingConfig, department]);

  const saveDashboardMutation = useMutation({
    mutationFn: async (widgets) => {
      if (dashboardConfig) {
        return base44.entities.DashboardConfig.update(dashboardConfig.id, { widgets });
      } else {
        return base44.entities.DashboardConfig.create({ 
          user_id: currentUser.id, 
          department: department,
          widgets 
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardConfig'] });
      setIsEditMode(false);
    },
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(localWidgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setLocalWidgets(items);
  };

  const handleAddWidget = (widgetType, widgetConfig) => {
    const newWidget = {
      id: `widget-${Date.now()}`,
      type: widgetType,
      config: { ...widgetConfig, department, entity: widgetConfig.entity || getDefaultEntity(department) },
    };
    setLocalWidgets([...localWidgets, newWidget]);
    setShowWidgetGallery(false);
  };

  const getDefaultEntity = (dept) => {
    const entityMap = {
      Claims: 'Claim',
      Estimating: 'Estimate',
      Engineering: 'Engineering',
      Parts: 'Part',
    };
    return entityMap[dept] || 'Claim';
  };

  const handleRemoveWidget = (widgetId) => {
    setLocalWidgets(localWidgets.filter(w => w.id !== widgetId));
  };

  const handleSave = () => {
    saveDashboardMutation.mutate(localWidgets);
  };

  const handleCancel = () => {
    if (dashboardConfig?.widgets) {
      setLocalWidgets(dashboardConfig.widgets);
    } else {
      setLocalWidgets(DEPARTMENT_TEMPLATES[department] || []);
    }
    setIsEditMode(false);
  };

  const handleResetToDefault = () => {
    if (window.confirm(`Reset ${department} dashboard to default layout? This cannot be undone.`)) {
      setLocalWidgets(DEPARTMENT_TEMPLATES[department] || []);
    }
  };

  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-foreground-muted">Loading {department} dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="glass p-4 md:p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">{department} Dashboard</h2>
            <p className="text-sm text-foreground-muted mt-1">
              {isEditMode ? 'Customize your dashboard layout' : `Overview of your ${department.toLowerCase()} department`}
            </p>
          </div>
          <div className="flex gap-2 md:gap-3">
            {!isEditMode ? (
              <Button
                onClick={() => setIsEditMode(true)}
                className="glass-button px-4 py-2 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Customize</span>
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => setShowWidgetGallery(true)}
                  className="glass-button px-4 py-2 flex items-center gap-2 text-green-600"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add</span>
                </Button>
                <Button
                  onClick={handleResetToDefault}
                  className="glass-button px-4 py-2 flex items-center gap-2 text-orange-600"
                >
                  <LayoutIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>
                <Button
                  onClick={handleCancel}
                  className="glass-button px-4 py-2 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Cancel</span>
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saveDashboardMutation.isPending}
                  className="glass-button px-4 py-2 flex items-center gap-2 text-accent"
                >
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Save</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit Mode Banner */}
      {isEditMode && (
        <div className="glass p-4 border-2 border-accent">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
            <p className="text-sm">
              <strong>Edit Mode:</strong> Drag widgets to reorder, click X to remove, or add new widgets.
            </p>
          </div>
        </div>
      )}

      {/* Widgets Grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard" direction="vertical" isDropDisabled={!isEditMode}>
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
            >
              {localWidgets.map((widget, index) => {
                const WidgetComponent = WIDGET_COMPONENTS[widget.type];
                
                if (!WidgetComponent) return null;

                return (
                  <Draggable
                    key={widget.id}
                    draggableId={widget.id}
                    index={index}
                    isDragDisabled={!isEditMode}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`relative ${snapshot.isDragging ? 'z-50 rotate-2 scale-105' : ''} transition-transform`}
                        style={{
                          ...provided.draggableProps.style,
                          gridColumn: widget.config?.span ? `span ${Math.min(widget.config.span, 4)}` : 'span 1',
                        }}
                      >
                        {isEditMode && (
                          <button
                            onClick={() => handleRemoveWidget(widget.id)}
                            className="absolute -top-2 -right-2 z-10 glass-elevated w-6 h-6 rounded-full flex items-center justify-center text-red-500 hover:scale-110 transition-all shadow-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <div className={isEditMode ? 'cursor-move' : ''}>
                          <WidgetComponent config={widget.config} isEditMode={isEditMode} />
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Empty State */}
      {localWidgets.length === 0 && (
        <div className="glass p-12 text-center">
          <LayoutIcon className="w-16 h-16 mx-auto mb-4 text-foreground-subtle opacity-50" />
          <h3 className="text-lg font-bold mb-2">Your dashboard is empty</h3>
          <p className="text-sm text-foreground-muted mb-4">Add widgets to personalize your {department.toLowerCase()} dashboard</p>
          <Button
            onClick={() => setShowWidgetGallery(true)}
            className="glass-button px-6 py-3 text-accent"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Widget
          </Button>
        </div>
      )}

      {/* Widget Gallery Modal */}
      {showWidgetGallery && (
        <WidgetGallery
          onClose={() => setShowWidgetGallery(false)}
          onAddWidget={handleAddWidget}
          department={department}
        />
      )}
    </div>
  );
}
