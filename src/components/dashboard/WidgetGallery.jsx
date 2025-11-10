
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Calculator, DollarSign, TrendingUp, Activity, Zap, PieChart, Clock } from 'lucide-react';
import WidgetUpdateTracking from './widgets/WidgetUpdateTracking';

const WIDGET_TYPES = [
  {
    type: 'DepartmentStats',
    name: 'Department Overview',
    description: 'Key metrics for this department',
    icon: TrendingUp,
    color: 'blue',
    defaultConfig: { span: 4 },
    configurable: false,
    departmentSpecific: true,
  },
  {
    type: 'StatusBreakdown',
    name: 'Status Breakdown',
    description: 'Visual breakdown by status',
    icon: PieChart,
    color: 'purple',
    defaultConfig: { span: 2 },
    configurable: false,
    departmentSpecific: true,
  },
  {
    type: 'RecentItems',
    name: 'Recent Items',
    description: 'Latest entries in this department',
    icon: Clock,
    color: 'green',
    defaultConfig: { limit: 10, span: 4 },
    configurable: true,
  },
  {
    type: 'StatCard',
    name: 'Stat Card',
    description: 'Display a custom metric',
    icon: TrendingUp,
    color: 'blue',
    defaultConfig: { title: 'Custom Stat', color: 'blue' },
    configurable: true,
  },
  {
    type: 'InvoiceTracking',
    name: 'Invoice Tracking',
    description: 'Monitor invoicing status',
    icon: DollarSign,
    color: 'green',
    defaultConfig: { span: 2 },
    configurable: false,
  },
  {
    type: 'RecentActivity',
    name: 'Recent Activity',
    description: 'Cross-department activity feed',
    icon: Activity,
    color: 'orange',
    defaultConfig: { span: 4 },
    configurable: false,
  },
  {
    type: 'CustomMetric',
    name: 'Custom Metric',
    description: 'Create a custom calculation',
    icon: Calculator,
    color: 'indigo',
    defaultConfig: { title: 'Custom Metric', calculation: 'count' },
    configurable: true,
  },
  {
    type: 'QuickActions',
    name: 'Quick Actions',
    description: 'Frequently used actions',
    icon: Zap,
    color: 'pink',
    defaultConfig: {},
    configurable: false,
  },
  {
    type: 'UpdateTracking',
    name: '48-Hour Update Tracking',
    description: 'Monitor claims requiring updates',
    icon: Clock,
    color: 'red',
    defaultConfig: { span: 2 },
    configurable: false,
  },
];

export default function WidgetGallery({ onClose, onAddWidget, department }) {
  const [selectedType, setSelectedType] = useState(null);
  const [config, setConfig] = useState({});

  const handleSelect = (widgetType) => {
    const widget = WIDGET_TYPES.find(w => w.type === widgetType.type);
    setSelectedType(widget);
    setConfig(widget.defaultConfig);
  };

  const handleAdd = () => {
    if (selectedType) {
      onAddWidget(selectedType.type, config);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="glass-elevated max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-glass-border">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Widget Gallery</h2>
            <p className="text-xs md:text-sm text-foreground-muted mt-1">Choose a widget to add to your dashboard</p>
          </div>
          <button onClick={onClose} className="glass-button p-2">
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {WIDGET_TYPES.map((widget) => {
              const Icon = widget.icon;
              const isSelected = selectedType?.type === widget.type;
              
              return (
                <button
                  key={widget.type}
                  onClick={() => handleSelect(widget)}
                  className={`glass text-left p-4 md:p-6 hover:scale-105 transition-all ${
                    isSelected ? 'border-2 border-accent' : ''
                  }`}
                >
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg bg-${widget.color}-500 bg-opacity-20 flex items-center justify-center mb-3 md:mb-4`}>
                    <Icon className={`w-5 h-5 md:w-6 md:h-6 text-${widget.color}-500`} />
                  </div>
                  <h3 className="font-bold text-sm md:text-base mb-1 md:mb-2">{widget.name}</h3>
                  <p className="text-xs md:text-sm text-foreground-muted">{widget.description}</p>
                  {widget.configurable && (
                    <span className="inline-block mt-2 md:mt-3 text-[10px] md:text-xs px-2 py-1 rounded-full bg-accent bg-opacity-20 text-accent">
                      Configurable
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Configuration Panel */}
          {selectedType && selectedType.configurable && (
            <div className="mt-4 md:mt-6 glass p-4 md:p-6">
              <h3 className="font-bold mb-4">Configure Widget</h3>
              {selectedType.type === 'StatCard' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title</label>
                    <input
                      type="text"
                      value={config.title || ''}
                      onChange={(e) => setConfig({ ...config, title: e.target.value })}
                      className="glass-inset w-full px-3 md:px-4 py-2 rounded-lg text-sm"
                      placeholder="Widget title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Color</label>
                    <div className="flex gap-2">
                      {['blue', 'green', 'orange', 'red', 'purple', 'pink'].map(color => (
                        <button
                          key={color}
                          onClick={() => setConfig({ ...config, color })}
                          className={`w-7 h-7 md:w-8 md:h-8 rounded-full bg-${color}-500 ${
                            config.color === color ? 'ring-2 ring-accent ring-offset-2' : ''
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Widget Width</label>
                    <select
                      value={config.span || 1}
                      onChange={(e) => setConfig({ ...config, span: parseInt(e.target.value) })}
                      className="glass-inset w-full px-3 md:px-4 py-2 rounded-lg text-sm"
                    >
                      <option value="1">1 Column</option>
                      <option value="2">2 Columns</option>
                      <option value="3">3 Columns</option>
                      <option value="4">4 Columns (Full Width)</option>
                    </select>
                  </div>
                </div>
              )}
              {selectedType.type === 'RecentItems' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Number of Items</label>
                    <input
                      type="number"
                      min="5"
                      max="20"
                      value={config.limit || 10}
                      onChange={(e) => setConfig({ ...config, limit: parseInt(e.target.value) })}
                      className="glass-inset w-full px-3 md:px-4 py-2 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}
              {selectedType.type === 'CustomMetric' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Metric Title</label>
                    <input
                      type="text"
                      value={config.title || ''}
                      onChange={(e) => setConfig({ ...config, title: e.target.value })}
                      className="glass-inset w-full px-3 md:px-4 py-2 rounded-lg text-sm"
                      placeholder="e.g., Revenue This Month"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Calculation</label>
                    <select
                      value={config.calculation || 'count'}
                      onChange={(e) => setConfig({ ...config, calculation: e.target.value })}
                      className="glass-inset w-full px-3 md:px-4 py-2 rounded-lg text-sm"
                    >
                      <option value="count">Count Records</option>
                      <option value="sum">Sum Field</option>
                      <option value="average">Average Field</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 md:gap-3 p-4 md:p-6 border-t border-glass-border">
          <Button onClick={onClose} className="glass-button px-4 md:px-6 py-2 text-sm">
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedType}
            className="glass-button px-4 md:px-6 py-2 text-accent text-sm"
          >
            Add Widget
          </Button>
        </div>
      </div>
    </div>
  );
}
