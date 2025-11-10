
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Calendar, AlertCircle, CheckCircle, Clock, Plus, X, ArrowLeft, Briefcase, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWeekend, addMonths, subMonths, startOfWeek, endOfWeek, getDay } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// UK Bank Holidays for 2025 (update yearly)
const UK_BANK_HOLIDAYS_2025 = [
  { date: '2025-01-01', name: 'New Year\'s Day' },
  { date: '2025-04-18', name: 'Good Friday' },
  { date: '2025-04-21', name: 'Easter Monday' },
  { date: '2025-05-05', name: 'Early May Bank Holiday' },
  { date: '2025-05-26', name: 'Spring Bank Holiday' },
  { date: '2025-08-25', name: 'Summer Bank Holiday' },
  { date: '2025-12-25', name: 'Christmas Day' },
  { date: '2025-12-26', name: 'Boxing Day' },
];

export default function EmployeeManagement() {
  const [activeTab, setActiveTab] = useState("calendar");
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showSicknessModal, setShowSicknessModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAllowanceModal, setShowAllowanceModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const canManage = currentUser?.role === 'admin' || currentUser?.can_manage_permissions;
  const isAdmin = currentUser?.role === 'admin';

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: canManage,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
    enabled: canManage, // Changed from isAdmin to canManage
  });

  const { data: holidayRequests = [] } = useQuery({
    queryKey: ['holidayRequests'],
    queryFn: () => base44.entities.HolidayRequest.list('-created_date'),
  });

  const { data: sicknessRecords = [] } = useQuery({
    queryKey: ['sicknessRecords'],
    queryFn: () => base44.entities.SicknessRecord.list('-created_date'),
  });

  const internalUsers = users.filter(u => u.user_type === 'internal' || u.role === 'admin');

  const tabs = [
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "holidays", label: "Holiday Requests", icon: Clock },
    { id: "sickness", label: "Sickness Records", icon: AlertCircle },
  ];

  if (isAdmin) {
    tabs.push({ id: "roles", label: "Roles & Permissions", icon: Briefcase });
  }

  const calculateWorkingDays = (startDate, endDate) => {
    let count = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
      const dayOfWeek = getDay(current); // 0 for Sunday, 6 for Saturday
      const dateStr = format(current, 'yyyy-MM-dd');
      const isBankHoliday = UK_BANK_HOLIDAYS_2025.some(h => h.date === dateStr);
      
      // Count if it's a weekday (Mon-Fri) and not a bank holiday
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isBankHoliday) {
        count++;
      }
      
      current.setDate(current.getDate() + 1); // Move to the next day
    }
    
    return count;
  };

  // Calendar view
  const renderCalendar = () => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    
    // Start from the Monday of the week containing the 1st of the month
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    // End on the Sunday of the week containing the last day of the month
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const days = eachDayOfInterval({ 
      start: calendarStart, 
      end: calendarEnd
    });

    const getEventsForDay = (day) => {
      const events = [];
      const dateStr = format(day, 'yyyy-MM-dd');
      
      // Check for bank holidays
      const bankHoliday = UK_BANK_HOLIDAYS_2025.find(h => h.date === dateStr);
      if (bankHoliday) {
        events.push({ type: 'bank-holiday', name: bankHoliday.name });
      }
      
      // Check holiday requests
      holidayRequests.forEach(req => {
        if (req.status === 'Approved') {
          const start = new Date(req.start_date);
          const end = new Date(req.end_date);
          if (day >= start && day <= end) { // Simplified date range check
            events.push({ type: 'holiday', name: req.employee_name, data: req });
          }
        }
      });

      // Check sickness records
      sicknessRecords.forEach(rec => {
        const start = new Date(rec.start_date);
        const end = rec.end_date ? new Date(rec.end_date) : new Date(); // If ongoing, assume today is end
        if (day >= start && day <= end) { // Simplified date range check
          events.push({ type: 'sickness', name: rec.employee_name, data: rec });
        }
      });

      return events;
    };

    return (
      <div className="glass p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{format(selectedMonth, 'MMMM yyyy')}</h2>
          <div className="flex gap-2">
            <Button onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))} className="glass-button p-2">
              ←
            </Button>
            <Button onClick={() => setSelectedMonth(new Date())} className="glass-button px-4 py-2 text-sm">
              Today
            </Button>
            <Button onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))} className="glass-button p-2">
              →
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className={`text-center text-sm font-semibold p-2 ${
              day === 'Sat' || day === 'Sun' ? 'text-foreground-subtle' : 'text-foreground-muted'
            }`}>
              {day}
            </div>
          ))}
          
          {days.map((day, idx) => {
            const events = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isWeekendDay = isWeekend(day);
            const isCurrentMonth = day.getMonth() === selectedMonth.getMonth();

            return (
              <div
                key={idx}
                className={`glass-inset p-2 min-h-[80px] ${isToday ? 'border-2 border-accent' : ''} ${
                  isWeekendDay ? 'bg-opacity-50' : ''
                } ${!isCurrentMonth ? 'opacity-40' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 ${!isCurrentMonth ? 'text-foreground-subtle' : ''}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {events.map((event, eventIdx) => (
                    <div
                      key={eventIdx}
                      className={`text-[10px] px-1 py-0.5 rounded ${
                        event.type === 'bank-holiday' ? 'bg-purple-500 text-white font-semibold' :
                        event.type === 'holiday' ? 'bg-blue-500 text-white' : 
                        'bg-red-500 text-white'
                      }`}
                      title={event.type === 'bank-holiday' ? event.name : event.name}
                    >
                      {event.type === 'bank-holiday' ? 'BH' : event.name.split(' ')[0]}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-4 mt-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span>Bank Holiday</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Staff Holiday</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Sickness</span>
          </div>
        </div>
      </div>
    );
  };

  // Holiday requests view
  const renderHolidays = () => {
    const myRequests = holidayRequests.filter(r => r.employee_email === currentUser?.email);
    const allRequests = canManage ? holidayRequests : myRequests;
    const pendingRequests = allRequests.filter(r => r.status === 'Pending');

    // Calculate approved and pending days
    const myApprovedDays = myRequests
      .filter(r => r.status === 'Approved')
      .reduce((sum, r) => sum + (r.total_days || 0), 0);
    
    const myPendingDays = myRequests
      .filter(r => r.status === 'Pending')
      .reduce((sum, r) => sum + (r.total_days || 0), 0);

    const myAllowance = currentUser?.annual_leave_allowance || 25;
    const myRemaining = myAllowance - myApprovedDays - myPendingDays;

    return (
      <div className="space-y-4">
        <div className="glass p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Holiday Requests</h2>
            <div className="flex gap-2">
              {isAdmin && (
                <Button onClick={() => setShowAllowanceModal(true)} className="glass-button px-4 py-2 flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Manage Allowances
                </Button>
              )}
              <Button onClick={() => setShowHolidayModal(true)} className="glass-button px-4 py-2 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Request Holiday
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="glass-flat p-4">
              <p className="text-sm text-foreground-muted">Annual Allowance</p>
              <p className="text-2xl font-bold">{myAllowance} days</p>
            </div>
            <div className="glass-flat p-4">
              <p className="text-sm text-foreground-muted">Days Approved</p>
              <p className="text-2xl font-bold text-green-600">{myApprovedDays} days</p>
            </div>
            <div className="glass-flat p-4">
              <p className="text-sm text-foreground-muted">Days Pending</p>
              <p className="text-2xl font-bold text-orange-600">{myPendingDays} days</p>
            </div>
            <div className="glass-flat p-4">
              <p className="text-sm text-foreground-muted">Days Remaining</p>
              <p className="text-2xl font-bold text-blue-600">{myRemaining} days</p>
            </div>
          </div>
        </div>

        {pendingRequests.length > 0 && (
          <div className="glass p-4">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Pending Requests
            </h3>
            <div className="space-y-2">
              {pendingRequests.map(req => (
                <HolidayRequestCard 
                  key={req.id} 
                  request={req} 
                  canManage={canManage} 
                  calculateWorkingDays={calculateWorkingDays}
                  isOwnRequest={req.employee_email === currentUser?.email}
                />
              ))}
            </div>
          </div>
        )}

        <div className="glass p-4">
          <h3 className="font-bold text-lg mb-3">All Requests</h3>
          <div className="space-y-2">
            {allRequests.map(req => (
              <HolidayRequestCard 
                key={req.id} 
                request={req} 
                canManage={canManage} 
                calculateWorkingDays={calculateWorkingDays}
                isOwnRequest={req.employee_email === currentUser?.email}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Sickness records view
  const renderSickness = () => {
    const myRecords = sicknessRecords.filter(r => r.employee_email === currentUser?.email);
    const allRecords = canManage ? sicknessRecords : myRecords;

    return (
      <div className="space-y-4">
        <div className="glass p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Sickness Records</h2>
          {canManage && (
            <Button onClick={() => setShowSicknessModal(true)} className="glass-button px-4 py-2 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Record
            </Button>
          )}
        </div>

        <div className="glass p-4">
          <div className="space-y-2">
            {allRecords.map(rec => (
              <SicknessRecordCard key={rec.id} record={rec} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderRoles = () => {
    return (
      <div className="space-y-4">
        <div className="glass p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Job Roles</h2>
            <p className="text-sm text-foreground-muted mt-1">Define roles and their default permissions</p>
          </div>
          <Button onClick={() => {
            setEditingRole(null);
            setShowRoleModal(true);
          }} className="glass-button px-4 py-2 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Role
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.filter(r => r.is_active).map(role => (
            <RoleCard
              key={role.id}
              role={role}
              onEdit={() => {
                setEditingRole(role);
                setShowRoleModal(true);
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <HolidayRequestModal
        isOpen={showHolidayModal}
        onClose={() => setShowHolidayModal(false)}
        currentUser={currentUser}
        users={internalUsers}
        canManage={canManage}
        calculateWorkingDays={calculateWorkingDays}
      />
      <SicknessRecordModal
        isOpen={showSicknessModal}
        onClose={() => setShowSicknessModal(false)}
        users={internalUsers}
      />
      {isAdmin && (
        <>
          <RoleModal
            isOpen={showRoleModal}
            onClose={() => {
              setShowRoleModal(false);
              setEditingRole(null);
            }}
            role={editingRole}
          />
          <AllowanceModal
            isOpen={showAllowanceModal}
            onClose={() => setShowAllowanceModal(false)}
            users={internalUsers}
          />
        </>
      )}

      <div className="glass p-4">
        <div className="flex items-center gap-3 mb-4">
          <Link to={createPageUrl("Dashboard")}>
            <Button className="glass-button p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-accent" />
            <div>
              <h1 className="text-xl font-bold">Employee Management</h1>
              <p className="text-xs text-foreground-muted">Manage staff, holidays, and permissions</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`glass-button px-4 py-2 text-sm whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id ? 'border-accent text-accent' : ''
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'calendar' && renderCalendar()}
      {activeTab === 'holidays' && renderHolidays()}
      {activeTab === 'sickness' && renderSickness()}
      {activeTab === 'roles' && renderRoles()}
    </div>
  );
}

function RoleCard({ role, onEdit }) {
  const queryClient = useQueryClient();
  
  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Role.update(role.id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  return (
    <div className="glass-flat p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-accent" />
          <h4 className="font-bold text-lg">{role.role_name}</h4>
        </div>
        <div className="flex gap-2">
          <Button onClick={onEdit} className="glass-button p-2" title="Edit Role">
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            onClick={() => {
              if (window.confirm(`Are you sure you want to deactivate the role "${role.role_name}"? This will hide it from available roles but not affect current users.`)) {
                deleteMutation.mutate();
              }
            }} 
            className="glass-button p-2 text-red-600" 
            title="Deactivate Role"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {role.description && (
        <p className="text-sm text-foreground-muted mb-3">{role.description}</p>
      )}
      
      <div>
        <p className="text-xs font-semibold text-foreground-muted mb-2">Default Permissions:</p>
        <div className="flex flex-wrap gap-2">
          {(role.departments_access || []).map(dept => (
            <span key={dept} className="glass-inset px-2 py-1 text-xs rounded">
              {dept}
            </span>
          ))}
          {(role.departments_access?.length === 0 || !role.departments_access) && (
            <span className="text-sm text-foreground-muted">No default access</span>
          )}
        </div>
      </div>
    </div>
  );
}

function RoleModal({ isOpen, onClose, role }) {
  const [formData, setFormData] = useState({
    role_name: '',
    description: '',
    departments_access: ['Dashboard'],
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (role) {
      setFormData({
        role_name: role.role_name || '',
        description: role.description || '',
        // Ensure departments_access is an array and defaults to Dashboard if empty
        departments_access: role.departments_access && role.departments_access.length > 0 ? role.departments_access : ['Dashboard'],
      });
    } else {
      setFormData({
        role_name: '',
        description: '',
        departments_access: ['Dashboard'],
      });
    }
  }, [role, isOpen]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (role) {
        return base44.entities.Role.update(role.id, data);
      } else {
        return base44.entities.Role.create({ ...data, is_active: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const AVAILABLE_DEPARTMENTS = [
    "Dashboard",
    "Claims",
    "Estimating",
    "Engineering",
    "Parts",
    "Invoicing",
    "Map"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{role ? 'Edit Role' : 'Create New Role'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-2 font-medium">Role Name *</label>
            <Input
              value={formData.role_name}
              onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
              className="glass-inset"
              placeholder="e.g., Claims Handler, Estimator"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-2 font-medium">Description</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="glass-inset"
              placeholder="Brief description of this role"
            />
          </div>
          <div>
            <label className="block text-sm mb-2 font-medium">Default Department Access</label>
            <div className="glass-inset p-4 space-y-2 rounded-xl max-h-48 overflow-y-auto">
              {AVAILABLE_DEPARTMENTS.map(dept => (
                <label key={dept} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.departments_access?.includes(dept)}
                    onChange={(e) => {
                      const newDepts = e.target.checked
                        ? [...(formData.departments_access || []), dept]
                        : (formData.departments_access || []).filter(d => d !== dept);
                      setFormData({ ...formData, departments_access: newDepts });
                    }}
                    className="form-checkbox h-4 w-4 text-accent rounded focus:ring-accent border-gray-300"
                  />
                  <span className="text-sm">{dept}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-foreground-muted mt-1">Users assigned this role will have these departments enabled by default</p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" onClick={onClose} className="glass-button px-4 py-2">
              Cancel
            </Button>
            <Button type="submit" className="glass-button px-4 py-2 text-accent" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : (role ? 'Update Role' : 'Create Role')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function HolidayRequestCard({ request, canManage, calculateWorkingDays, isOwnRequest }) {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: async (status) => {
      const currentUserData = await base44.auth.me();
      const approverEmail = currentUserData?.email || null;
      
      const updateData = {
        status,
        approved_by: approverEmail,
        approved_date: new Date().toISOString()
      };
      
      return base44.entities.HolidayRequest.update(request.id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidayRequests'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.HolidayRequest.delete(request.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidayRequests'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this holiday request?')) {
      deleteMutation.mutate();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'text-green-600';
      case 'Rejected': return 'text-red-600';
      case 'Pending': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const workingDays = calculateWorkingDays(request.start_date, request.end_date);

  return (
    <div className="glass-flat p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-bold">{request.employee_name}</h4>
            <span className={`text-sm font-medium ${getStatusColor(request.status)}`}>
              {request.status}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-foreground-muted">Start Date</p>
              <p className="font-medium">{format(new Date(request.start_date), 'dd/MM/yyyy')}</p>
            </div>
            <div>
              <p className="text-foreground-muted">End Date</p>
              <p className="font-medium">{format(new Date(request.end_date), 'dd/MM/yyyy')}</p>
            </div>
            <div>
              <p className="text-foreground-muted">Working Days</p>
              <p className="font-medium">{workingDays}</p>
            </div>
            <div>
              <p className="text-foreground-muted">Type</p>
              <p className="font-medium">{request.holiday_type}</p>
            </div>
          </div>
          {request.notes && (
            <p className="text-sm text-foreground-muted mt-2">{request.notes}</p>
          )}
        </div>
        <div className="flex gap-2 ml-4">
          {canManage && request.status === 'Pending' && (
            <>
              <Button
                onClick={() => approveMutation.mutate('Approved')}
                className="glass-button p-2 text-green-600"
                title="Approve"
                disabled={approveMutation.isPending}
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => approveMutation.mutate('Rejected')}
                className="glass-button p-2 text-red-600"
                title="Reject"
                disabled={approveMutation.isPending}
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          )}
          {isOwnRequest && request.status === 'Pending' && (
            <Button
              onClick={handleDelete}
              className="glass-button p-2 text-red-600"
              title="Delete Request"
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SicknessRecordCard({ record }) {
  return (
    <div className="glass-flat p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-bold mb-2">{record.employee_name}</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-foreground-muted">Start Date</p>
              <p className="font-medium">{format(new Date(record.start_date), 'dd/MM/yyyy')}</p>
            </div>
            <div>
              <p className="text-foreground-muted">End Date</p>
              <p className="font-medium">{record.end_date ? format(new Date(record.end_date), 'dd/MM/yyyy') : 'Ongoing'}</p>
            </div>
            <div>
              <p className="text-foreground-muted">Days</p>
              <p className="font-medium">{record.total_days || '-'}</p>
            </div>
            <div>
              <p className="text-foreground-muted">Certified</p>
              <p className="font-medium">{record.certified ? 'Yes' : 'No'}</p>
            </div>
          </div>
          {record.reason && (
            <p className="text-sm text-foreground-muted mt-2">{record.reason}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function HolidayRequestModal({ isOpen, onClose, currentUser, users, canManage, calculateWorkingDays }) {
  const [formData, setFormData] = useState({
    employee_email: currentUser?.email || '',
    employee_name: currentUser?.full_name || '',
    start_date: '',
    end_date: '',
    holiday_type: 'Annual Leave',
    notes: ''
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        employee_email: currentUser.email,
        employee_name: currentUser.full_name
      }));
    }
  }, [currentUser]);

  const createMutation = useMutation({
    mutationFn: (data) => {
      const workingDays = calculateWorkingDays(data.start_date, data.end_date);
      return base44.entities.HolidayRequest.create({ 
        ...data, 
        total_days: workingDays, // Store working days calculated
        status: 'Pending' 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidayRequests'] });
      onClose();
      setFormData({
        employee_email: currentUser?.email || '',
        employee_name: currentUser?.full_name || '',
        start_date: '',
        end_date: '',
        holiday_type: 'Annual Leave',
        notes: ''
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const workingDays = formData.start_date && formData.end_date 
    ? calculateWorkingDays(formData.start_date, formData.end_date)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Holiday</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {canManage && ( // Admins/managers can request for others
            <div>
              <label className="block text-sm mb-2">Employee</label>
              <select
                value={formData.employee_email}
                onChange={(e) => {
                  const user = users.find(u => u.email === e.target.value);
                  setFormData({ ...formData, employee_email: e.target.value, employee_name: user?.full_name || '' });
                }}
                className="glass-inset w-full px-3 py-2 border-0 rounded-lg"
                required
              >
                <option value="">Select employee...</option>
                {users.map(user => (
                  <option key={user.id} value={user.email}>{user.full_name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm mb-2">Start Date</label>
            <Input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="glass-inset"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-2">End Date</label>
            <Input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="glass-inset"
              required
            />
          </div>
          {formData.start_date && formData.end_date && (new Date(formData.end_date) >= new Date(formData.start_date)) && (
            <div className="glass-flat p-3">
              <p className="text-sm text-foreground-muted">Working Days Requested</p>
              <p className="text-lg font-bold">{workingDays} days</p>
              <p className="text-xs text-foreground-subtle mt-1">Excludes weekends and bank holidays</p>
            </div>
          )}
          <div>
            <label className="block text-sm mb-2">Type</label>
            <select
              value={formData.holiday_type}
              onChange={(e) => setFormData({ ...formData, holiday_type: e.target.value })}
              className="glass-inset w-full px-3 py-2 border-0 rounded-lg"
            >
              <option value="Annual Leave">Annual Leave</option>
              <option value="Unpaid Leave">Unpaid Leave</option>
              <option value="Study Leave">Study Leave</option>
              <option value="Compassionate Leave">Compassionate Leave</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2">Notes (optional)</label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="glass-inset"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" onClick={onClose} className="glass-button px-4 py-2">
              Cancel
            </Button>
            <Button type="submit" className="glass-button px-4 py-2 text-accent" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SicknessRecordModal({ isOpen, onClose, users }) {
  const [formData, setFormData] = useState({
    employee_email: '',
    employee_name: '',
    start_date: '',
    end_date: '',
    reason: '',
    certified: false,
    notes: ''
  });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => {
      const start = new Date(data.start_date);
      const end = data.end_date ? new Date(data.end_date) : null;
      const totalDays = end ? differenceInDays(end, start) + 1 : null;
      return base44.entities.SicknessRecord.create({ ...data, total_days: totalDays });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sicknessRecords'] });
      onClose();
      setFormData({
        employee_email: '',
        employee_name: '',
        start_date: '',
        end_date: '',
        reason: '',
        certified: false,
        notes: ''
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Sickness Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-2">Employee</label>
            <select
              value={formData.employee_email}
              onChange={(e) => {
                const user = users.find(u => u.email === e.target.value);
                setFormData({ ...formData, employee_email: e.target.value, employee_name: user?.full_name || '' });
              }}
              className="glass-inset w-full px-3 py-2 border-0 rounded-lg"
              required
            >
              <option value="">Select employee...</option>
              {users.map(user => (
                <option key={user.id} value={user.email}>{user.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2">Start Date</label>
            <Input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="glass-inset"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-2">End Date (leave empty if ongoing)</label>
            <Input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="glass-inset"
            />
          </div>
          <div>
            <label className="block text-sm mb-2">Reason (optional)</label>
            <Input
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="glass-inset"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="certified"
              checked={formData.certified}
              onChange={(e) => setFormData({ ...formData, certified: e.target.checked })}
              className="form-checkbox h-4 w-4 text-accent rounded focus:ring-accent border-gray-300"
            />
            <label htmlFor="certified" className="text-sm">Doctor's note provided</label>
          </div>
          <div>
            <label className="block text-sm mb-2">Notes (optional)</label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="glass-inset"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" onClick={onClose} className="glass-button px-4 py-2">
              Cancel
            </Button>
            <Button type="submit" className="glass-button px-4 py-2 text-accent" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Adding...' : 'Add Record'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AllowanceModal({ isOpen, onClose, users }) {
  const [selectedUser, setSelectedUser] = useState('');
  const [allowance, setAllowance] = useState(25);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ userId, allowance }) => {
      return base44.entities.User.update(userId, { annual_leave_allowance: allowance });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setSelectedUser('');
      setAllowance(25); // Reset allowance to default after successful update
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedUser) {
      updateMutation.mutate({ userId: selectedUser, allowance });
    }
  };

  const selectedUserData = users.find(u => u.id === selectedUser);

  useEffect(() => {
    if (selectedUserData) {
      setAllowance(selectedUserData.annual_leave_allowance || 25);
    } else {
      setAllowance(25); // Reset if no user selected or user data is gone
    }
  }, [selectedUserData, isOpen]); // Reset on modal open or user change

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Holiday Allowances</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-2">Employee</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="glass-inset w-full px-3 py-2 border-0 rounded-lg"
              required
            >
              <option value="">Select employee...</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.full_name}</option>
              ))}
            </select>
          </div>
          {selectedUserData && (
            <>
              <div className="glass-flat p-3">
                <p className="text-sm text-foreground-muted">Current Allowance</p>
                <p className="text-lg font-bold">{selectedUserData.annual_leave_allowance || 25} days</p>
                <p className="text-xs text-foreground-subtle mt-1">
                  {/* The annual_leave_taken field is no longer directly maintained on the user for a running total,
                      as approved days are now calculated dynamically from holiday requests. */}
                  {/* Removed: Taken: {selectedUserData.annual_leave_taken || 0} days */}
                </p>
              </div>
              <div>
                <label className="block text-sm mb-2">New Annual Allowance (days)</label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={allowance}
                  onChange={(e) => setAllowance(parseInt(e.target.value))}
                  className="glass-inset"
                  required
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" onClick={onClose} className="glass-button px-4 py-2">
              Cancel
            </Button>
            <Button type="submit" className="glass-button px-4 py-2 text-accent" disabled={updateMutation.isPending || !selectedUser}>
              {updateMutation.isPending ? 'Updating...' : 'Update Allowance'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
