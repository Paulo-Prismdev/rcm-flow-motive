import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Settings, Plus, Save, X, Layout as LayoutIcon, ChevronDown } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import WidgetStatCard from "../components/dashboard/widgets/WidgetStatCard";
import WidgetRecentActivity from "../components/dashboard/widgets/WidgetRecentActivity";
import WidgetInvoiceTracking from "../components/dashboard/widgets/WidgetInvoiceTracking";
import WidgetCustomMetric from "../components/dashboard/widgets/WidgetCustomMetric";
import WidgetQuickActions from "../components/dashboard/widgets/WidgetQuickActions";
import WidgetActivityFeed from "../components/dashboard/widgets/WidgetActivityFeed";
import WidgetDepartmentStats from "../components/dashboard/widgets/WidgetDepartmentStats";
import WidgetStatusBreakdown from "../components/dashboard/widgets/WidgetStatusBreakdown";
import WidgetRecentItems from "../components/dashboard/widgets/WidgetRecentItems";
import WidgetGallery from "../components/dashboard/WidgetGallery";

const WIDGET_COMPONENTS = {
  StatCard: WidgetStatCard,
  RecentActivity: WidgetRecentActivity,
  InvoiceTracking: WidgetInvoiceTracking,
  CustomMetric: WidgetCustomMetric,
  QuickActions: WidgetQuickActions,
  ActivityFeed: WidgetActivityFeed,
  DepartmentStats: WidgetDepartmentStats,
  StatusBreakdown: WidgetStatusBreakdown,
  RecentItems: WidgetRecentItems,
};

const DEFAULT_USER_WIDGETS = [
  { id: 'stat-claims', type: 'StatCard', config: { title: 'Open Claims', entity: 'Claim', color: 'blue', span: 1 } },
  { id: 'stat-estimates', type: 'StatCard', config: { title: 'Open Estimates', entity: 'Estimate', color: 'green', span: 1 } },
  { id: 'stat-engineering', type: 'StatCard', config: { title: 'Engineering Jobs', entity: 'Engineering', color: 'purple', span: 1 } },
  { id: 'stat-parts', type: 'StatCard', config: { title: 'Parts Requests', entity: 'Part', color: 'orange', span: 1 } },
  { id: 'invoice-tracking', type: 'InvoiceTracking', config: { span: 2 } },
  { id: 'recent-activity', type: 'RecentActivity', config: { span: 4 } },
];

const DEFAULT_COMPANY_WIDGETS = [
  { id: 'company-claims', type: 'StatCard', config: { title: 'Total Claims', entity: 'Claim', color: 'blue', span: 1 } },
  { id: 'company-estimates', type: 'StatCard', config: { title: 'Total Estimates', entity: 'Estimate', color: 'green', span: 1 } },
  { id: 'company-engineering', type: 'StatCard', config: { title: 'Total Engineering', entity: 'Engineering', color: 'purple', span: 1 } },
  { id: 'company-parts', type: 'StatCard', config: { title: 'Total Parts', entity: 'Part', color: 'orange', span: 1 } },
  { id: 'company-invoices', type: 'InvoiceTracking', config: { span: 4 } },
  { id: 'company-activity', type: 'RecentActivity', config: { span: 4 } },
];

const DEPARTMENT_TEMPLATES = {
  Claims: [
    { id: 'claims-stats', type: 'DepartmentStats', config: { department: 'Claims', entity: 'Claim', span: 4 } },
    { id: 'claims-status', type: 'StatusBreakdown', config: { department: 'Claims', entity: 'Claim', statusField: 'job_status', span: 2 } },
    { id: 'claims-invoice', type: 'StatCard', config: { title: 'Ready to Invoice', entity: 'Claim', color: 'green', filter: { invoice_status: 'Ready to Invoice' }, span: 2 } },
    { id: 'claims-recent', type: 'RecentItems', config: { department: 'Claims', entity: 'Claim', limit: 10, span: 4 } },
  ],
  Estimating: [
    { id: 'est-stats', type: 'DepartmentStats', config: { department: 'Estimating', entity: 'Estimate', span: 4 } },
    { id: 'est-status', type: 'StatusBreakdown', config: { department: 'Estimating', entity: 'Estimate', statusField: 'status', span: 2 } },
    { id: 'est-priority', type: 'StatCard', config: { title: 'High Priority', entity: 'Estimate', color: 'red', filter: { priority: 'High' }, span: 2 } },
    { id: 'est-recent', type: 'RecentItems', config: { department: 'Estimating', entity: 'Estimate', limit: 10, span: 4 } },
  ],
  Engineering: [
    { id: 'eng-stats', type: 'DepartmentStats', config: { department: 'Engineering', entity: 'Engineering', span: 4 } },
    { id: 'eng-status', type: 'StatusBreakdown', config: { department: 'Engineering', entity: 'Engineering', statusField: 'status', span: 2 } },
    { id: 'eng-pending', type: 'StatCard', config: { title: 'Reports Pending', entity: 'Engineering', color: 'orange', filter: { report_status: 'In Progress' }, span: 2 } },
    { id: 'eng-recent', type: 'RecentItems', config: { department: 'Engineering', entity: 'Engineering', limit: 10, span: 4 } },
  ],
  Parts: [
    { id: 'parts-stats', type: 'DepartmentStats', config: { department: 'Parts', entity: 'Part', span: 4 } },
    { id: 'parts-status', type: 'StatusBreakdown', config: { department: 'Parts', entity: 'Part', statusField: 'sourcing_status', span: 2 } },
    { id: 'parts-urgent', type: 'StatCard', config: { title: 'Urgent Requests', entity: 'Part', color: 'red', filter: { sourcing_status: 'Need to Order' }, span: 2 } },
    { id: 'parts-recent', type: 'RecentItems', config: { department: 'Parts', entity: 'Part', limit: 10, span: 4 } },
  ],
  Invoicing: [
    { id: 'inv-tracking', type: 'InvoiceTracking', config: { span: 4 } },
    { id: 'inv-ready', type: 'StatCard', config: { title: 'Ready to Invoice', entity: 'Claim', color: 'green', filter: { invoice_status: 'Ready to Invoice' }, span: 1 } },
    { id: 'inv-sent', type: 'StatCard', config: { title: 'Invoiced', entity: 'Claim', color: 'blue', filter: { invoice_status: 'Invoiced' }, span: 1 } },
    { id: 'inv-paid', type: 'StatCard', config: { title: 'Paid', entity: 'Claim', color: 'gray', filter: { invoice_status: 'Invoice Paid' }, span: 1 } },
    { id: 'inv-overdue', type: 'StatCard', config: { title: 'Overdue', entity: 'Claim', color: 'red', filter: { invoice_status: 'Invoice Overdue' }, span: 1 } },
  ],
};

const DASHBOARD_OPTIONS = [
  { value: 'my-dashboard', label: 'My Dashboard', type: 'user' },
  { value: 'company', label: 'Company Overview', type: 'company' },
  { value: 'claims', label: 'Claims Department', type: 'department', department: 'Claims' },
  { value: 'estimating', label: 'Estimating Department', type: 'department', department: 'Estimating' },
  { value: 'engineering', label: 'Engineering Department', type: 'department', department: 'Engineering' },
  { value: 'parts', label: 'Parts Department', type: 'department', department: 'Parts' },
  { value: 'invoicing', label: 'Invoicing Department', type: 'department', department: 'Invoicing' },
];

export default function Dashboard() {
  const [selectedDashboard, setSelectedDashboard] = useState('my-dashboard');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showWidgetGallery, setShowWidgetGallery] = useState(false);
  const [localWidgets, setLocalWidgets] = useState([]);
  const [resizingWidget, setResizingWidget] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin';
  const currentDashboardOption = DASHBOARD_OPTIONS.find(opt => opt.value === selectedDashboard);
  
  // Determine if current user can edit this dashboard
  const canEdit = currentDashboardOption?.type === 'user' || 
                  (currentDashboardOption?.type === 'company' && isAdmin) ||
                  (currentDashboardOption?.type === 'department' && isAdmin);

  const { data: allConfigs = [], isLoading: isLoadingConfig } = useQuery({
    queryKey: ['dashboardConfigs'],
    queryFn: () => base44.entities.DashboardConfig.list(),
    enabled: !!currentUser,
  });

  const currentConfig = React.useMemo(() => {
    if (!currentDashboardOption) return null;
    
    if (currentDashboardOption.type === 'user') {
      return allConfigs.find(c => 
        c.dashboard_type === 'user' && 
        c.user_id === currentUser?.id
      ) || null;
    } else if (currentDashboardOption.type === 'company') {
      return allConfigs.find(c => c.dashboard_type === 'company') || null;
    } else if (currentDashboardOption.type === 'department') {
      return allConfigs.find(c => 
        c.dashboard_type === 'department' && 
        c.department === currentDashboardOption.department
      ) || null;
    }
    return null;
  }, [currentDashboardOption, allConfigs, currentUser]);

  React.useEffect(() => {
    if (currentConfig?.widgets && currentConfig.widgets.length > 0) {
      setLocalWidgets(currentConfig.widgets.map(w => ({
        ...w,
        config: { ...w.config, span: w.config?.span || 1 }
      })));
    } else if (!isLoadingConfig) {
      if (currentDashboardOption?.type === 'user') {
        setLocalWidgets(DEFAULT_USER_WIDGETS);
      } else if (currentDashboardOption?.type === 'company') {
        setLocalWidgets(DEFAULT_COMPANY_WIDGETS);
      } else if (currentDashboardOption?.type === 'department') {
        setLocalWidgets(DEPARTMENT_TEMPLATES[currentDashboardOption.department] || []);
      }
    }
    setIsEditMode(false);
  }, [currentConfig, isLoadingConfig, currentDashboardOption]);

  const saveDashboardMutation = useMutation({
    mutationFn: async (widgets) => {
      const dashboardData = {
        widgets,
        dashboard_type: currentDashboardOption.type,
        ...(currentDashboardOption.type === 'user' && { user_id: currentUser.id }),
        ...(currentDashboardOption.type === 'department' && { department: currentDashboardOption.department }),
      };

      if (currentConfig) {
        return base44.entities.DashboardConfig.update(currentConfig.id, dashboardData);
      } else {
        return base44.entities.DashboardConfig.create(dashboardData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardConfigs'] });
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
      config: { ...widgetConfig, span: widgetConfig?.span || 1 },
    };
    setLocalWidgets([...localWidgets, newWidget]);
    setShowWidgetGallery(false);
  };

  const handleRemoveWidget = (widgetId) => {
    setLocalWidgets(localWidgets.filter(w => w.id !== widgetId));
  };

  const handleResizeStart = (e, widgetId) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent drag from starting
    if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
      e.nativeEvent.stopImmediatePropagation();
    }
    
    setResizingWidget(widgetId);
  };

  const handleResize = (widgetId, newSpan) => {
    setLocalWidgets(localWidgets.map(w => 
      w.id === widgetId 
        ? { ...w, config: { ...w.config, span: Math.max(1, Math.min(4, newSpan)) } }
        : w
    ));
  };

  React.useEffect(() => {
    if (!resizingWidget) return;

    const handleMouseMove = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const widget = localWidgets.find(w => w.id === resizingWidget);
      if (!widget) return;

      const widgetElement = document.querySelector(`[data-widget-id="${resizingWidget}"]`);
      if (!widgetElement) return;

      const rect = widgetElement.getBoundingClientRect();
      const mouseX = e.clientX;
      const widthDiff = mouseX - rect.left;
      
      // Calculate span based on width (each column is roughly 25% of container)
      const gridContainer = document.getElementById('widgets-grid');
      if (!gridContainer) return;
      
      const containerWidth = gridContainer.offsetWidth;
      const columnWidth = containerWidth / 4;
      
      const newSpan = Math.round(widthDiff / columnWidth);
      handleResize(resizingWidget, Math.max(1, Math.min(4, newSpan)));
    };

    const handleMouseUp = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setResizingWidget(null);
    };

    document.addEventListener('mousemove', handleMouseMove, { capture: true });
    document.addEventListener('mouseup', handleMouseUp, { capture: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, { capture: true });
      document.removeEventListener('mouseup', handleMouseUp, { capture: true });
    };
  }, [resizingWidget, localWidgets]);

  const handleSave = () => {
    saveDashboardMutation.mutate(localWidgets);
  };

  const handleCancel = () => {
    if (currentConfig?.widgets) {
      setLocalWidgets(currentConfig.widgets);
    } else {
      if (currentDashboardOption?.type === 'user') {
        setLocalWidgets(DEFAULT_USER_WIDGETS);
      } else if (currentDashboardOption?.type === 'company') {
        setLocalWidgets(DEFAULT_COMPANY_WIDGETS);
      } else if (currentDashboardOption?.type === 'department') {
        setLocalWidgets(DEPARTMENT_TEMPLATES[currentDashboardOption.department] || []);
      }
    }
    setIsEditMode(false);
  };

  const handleResetToDefault = () => {
    const dashboardName = currentDashboardOption?.label || 'this dashboard';
    if (window.confirm(`Reset ${dashboardName} to default layout? This cannot be undone.`)) {
      if (currentDashboardOption?.type === 'user') {
        setLocalWidgets(DEFAULT_USER_WIDGETS);
      } else if (currentDashboardOption?.type === 'company') {
        setLocalWidgets(DEFAULT_COMPANY_WIDGETS);
      } else if (currentDashboardOption?.type === 'department') {
        setLocalWidgets(DEPARTMENT_TEMPLATES[currentDashboardOption.department] || []);
      }
    }
  };

  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-foreground-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <style>{`
        @keyframes sway {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-1deg) scale(1.02); }
          75% { transform: rotate(1deg) scale(1.02); }
        }

        .widget-edit-mode:hover {
          animation: sway 2s ease-in-out infinite;
        }

        .resize-handle {
          cursor: nwse-resize;
          touch-action: none;
          z-index: 100;
        }

        .resize-handle:hover svg {
          transform: scale(1.2);
        }

        .widget-resizing {
          pointer-events: none;
        }

        .widget-resizing .resize-handle {
          pointer-events: all;
        }
      `}</style>

      {/* Header */}
      <div className="glass p-4 md:p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
              <p className="text-sm text-foreground-muted mt-1">
                {isEditMode ? 'Customize your dashboard layout' : 'Monitor your operations'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="glass-button px-3 md:px-4 py-2 flex items-center gap-2" disabled={isEditMode}>
                  <LayoutIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">{currentDashboardOption?.label || 'Select Dashboard'}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {DASHBOARD_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setSelectedDashboard(option.value)}
                    className={selectedDashboard === option.value ? 'bg-glass-hover' : ''}
                  >
                    {option.label}
                    {option.type === 'company' && !isAdmin && (
                      <span className="ml-auto text-xs text-foreground-subtle">(View Only)</span>
                    )}
                    {option.type === 'department' && !isAdmin && (
                      <span className="ml-auto text-xs text-foreground-subtle">(View Only)</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {!isEditMode ? (
              canEdit && (
                <Button
                  onClick={() => setIsEditMode(true)}
                  className="glass-button px-4 py-2 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Customize</span>
                </Button>
              )
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

      {isEditMode && (
        <div className="glass p-4 border-2 border-accent">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
            <p className="text-sm">
              <strong>Edit Mode:</strong> Drag widgets to reorder, drag bottom-right corner to resize, or click X to remove.
            </p>
          </div>
        </div>
      )}

      {/* Widgets Grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard" direction="vertical" isDropDisabled={!isEditMode || !!resizingWidget}>
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              id="widgets-grid"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
            >
              {localWidgets.map((widget, index) => {
                const WidgetComponent = WIDGET_COMPONENTS[widget.type];
                
                if (!WidgetComponent) return null;

                const span = widget.config?.span || 1;
                const isResizing = resizingWidget === widget.id;

                return (
                  <Draggable
                    key={widget.id}
                    draggableId={widget.id}
                    index={index}
                    isDragDisabled={!isEditMode || isResizing}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        data-widget-id={widget.id}
                        className={`relative ${snapshot.isDragging ? 'z-50 rotate-2 scale-105' : ''} ${isEditMode && !snapshot.isDragging && !isResizing ? 'widget-edit-mode' : ''} ${isResizing ? 'widget-resizing' : ''} transition-all`}
                        style={{
                          ...provided.draggableProps.style,
                          gridColumn: `span ${Math.min(span, 4)}`,
                        }}
                      >
                        {isEditMode && (
                          <>
                            {/* Remove Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveWidget(widget.id);
                              }}
                              className="absolute -top-2 -right-2 z-10 glass-elevated w-6 h-6 rounded-full flex items-center justify-center text-red-500 hover:scale-110 transition-all shadow-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            
                            {/* Resize Handle - Bottom Right Corner */}
                            <div
                              onMouseDown={(e) => handleResizeStart(e, widget.id)}
                              onTouchStart={(e) => {
                                e.preventDefault();
                                handleResizeStart(e, widget.id);
                              }}
                              className="absolute -bottom-2 -right-2 z-10 glass-elevated w-8 h-8 rounded-full flex items-center justify-center resize-handle hover:scale-110 transition-all shadow-lg"
                              title="Drag to resize"
                            >
                              {/* Diagonal Arrows Icon - pointing from bottom-left to top-right */}
                              <svg className="w-4 h-4 text-accent transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 7V3h4"/>
                                <path d="M21 17v4h-4"/>
                                <path d="M3 3l9 9"/>
                                <path d="M21 21l-9-9"/>
                              </svg>
                            </div>

                            {/* Size Indicator */}
                            <div className="absolute top-2 left-2 z-10 glass-flat px-2 py-1 rounded text-xs font-mono text-accent">
                              {span}/{4}
                            </div>
                          </>
                        )}
                        <div {...(isEditMode && !isResizing ? provided.dragHandleProps : {})} className={isEditMode && !isResizing ? 'cursor-move' : ''}>
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

      {localWidgets.length === 0 && (
        <div className="glass p-12 text-center">
          <LayoutIcon className="w-16 h-16 mx-auto mb-4 text-foreground-subtle opacity-50" />
          <h3 className="text-lg font-bold mb-2">Your dashboard is empty</h3>
          <p className="text-sm text-foreground-muted mb-4">Add widgets to personalize your dashboard</p>
          {canEdit && (
            <Button
              onClick={() => setShowWidgetGallery(true)}
              className="glass-button px-6 py-3 text-accent"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Widget
            </Button>
          )}
        </div>
      )}

      {showWidgetGallery && (
        <WidgetGallery
          onClose={() => setShowWidgetGallery(false)}
          onAddWidget={handleAddWidget}
          department={currentDashboardOption?.department}
        />
      )}
    </div>
  );
}