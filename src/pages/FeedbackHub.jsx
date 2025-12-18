import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MessageCircle, 
  Heart, 
  Smile, 
  Meh, 
  Frown,
  Send,
  Search,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Filter,
  ArrowLeft,
  Wrench,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

const RATING_CONFIG = {
  love: { icon: Heart, color: 'text-pink-500', bgColor: 'bg-pink-50 dark:bg-pink-900/20', label: 'Love Artura' },
  good: { icon: Smile, color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20', label: 'Good' },
  ok: { icon: Meh, color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20', label: 'Ok' },
  hate: { icon: Frown, color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-900/20', label: 'Hate' }
};

export default function FeedbackHub() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState('all');
  const [filterUserType, setFilterUserType] = useState('all');
  const [requestType, setRequestType] = useState('bodyshop'); // 'bodyshop' or 'referrer'
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: feedback = [], isLoading: feedbackLoading } = useQuery({
    queryKey: ['userFeedback'],
    queryFn: () => base44.entities.UserFeedback.list('-created_date', 5000),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: bodyshops = [] } = useQuery({
    queryKey: ['bodyshops'],
    queryFn: () => base44.entities.Bodyshop.list(),
  });

  const { data: referrers = [] } = useQuery({
    queryKey: ['referrers'],
    queryFn: () => base44.entities.Referrer.list(),
  });

  const requestFeedbackMutation = useMutation({
    mutationFn: async ({ userId, companyId, companyType }) => {
      const response = await base44.functions.invoke('requestFeedback', { 
        userId, 
        companyId, 
        companyType 
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['bodyshops'] });
      queryClient.invalidateQueries({ queryKey: ['referrers'] });
      setSelectedUserId('');
      setSelectedCompanyId('');
      alert('Feedback request sent successfully!');
    },
    onError: (error) => {
      console.error('Error requesting feedback:', error);
      alert('Failed to send feedback request: ' + (error.message || 'Unknown error'));
    }
  });

  // Get companies and users based on selected type (sorted alphabetically)
  const companies = (requestType === 'bodyshop' ? bodyshops : referrers)
    .sort((a, b) => a.name.localeCompare(b.name));
  const linkedField = requestType === 'bodyshop' ? 'linked_bodyshop_id' : 'linked_referrer_id';
  const companyUsers = selectedCompanyId 
    ? users.filter(u => u[linkedField] === selectedCompanyId)
        .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
    : [];

  // Calculate stats
  const stats = {
    total: feedback.length,
    love: feedback.filter(f => f.rating === 'love').length,
    good: feedback.filter(f => f.rating === 'good').length,
    ok: feedback.filter(f => f.rating === 'ok').length,
    hate: feedback.filter(f => f.rating === 'hate').length,
    withComments: feedback.filter(f => f.comment).length
  };

  // Filter feedback and sort by submission date (newest first)
  const filteredFeedback = feedback
    .filter(f => {
      const matchesSearch = !searchTerm || 
        f.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.comment?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRating = filterRating === 'all' || f.rating === filterRating;
      const matchesUserType = filterUserType === 'all' || f.user_type === filterUserType;
      return matchesSearch && matchesRating && matchesUserType;
    })
    .sort((a, b) => new Date(b.submission_date) - new Date(a.submission_date));

  // Enrich feedback with company names
  const enrichedFeedback = filteredFeedback.map(f => {
    const user = users.find(u => u.email === f.user_email);
    let companyName = 'Unknown Company';
    
    if (user) {
      if (f.user_type === 'bodyshop' && user.linked_bodyshop_id) {
        const bodyshop = bodyshops.find(b => b.id === user.linked_bodyshop_id);
        companyName = bodyshop?.name || 'Unknown Company';
      } else if (f.user_type === 'referrer' && user.linked_referrer_id) {
        const referrer = referrers.find(r => r.id === user.linked_referrer_id);
        companyName = referrer?.name || 'Unknown Company';
      }
    }
    
    return { ...f, companyName };
  });

  // Group by user type
  const repairerFeedback = enrichedFeedback.filter(f => f.user_type === 'bodyshop');
  const referrerFeedback = enrichedFeedback.filter(f => f.user_type === 'referrer');

  const isInternalUser = currentUser?.user_type === 'internal' || currentUser?.role === 'admin';

  if (!isInternalUser) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="neomorph p-8 text-center max-w-md">
          <AlertTriangle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-foreground-muted">
            This page is only accessible to internal staff.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="neomorph p-4 md:p-6">
        <div className="flex items-center gap-4 mb-4">
          <Link to={createPageUrl('Dashboard')}>
            <Button className="neomorph-flat p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold">Feedback Hub</h1>
            <p className="text-foreground-muted mt-1">
              Monitor and manage feedback from referrers and repairers
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="neomorph-flat p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-5 h-5 text-accent" />
              <span className="text-xs text-foreground-muted">Total</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="neomorph-flat p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-5 h-5 text-pink-500" />
              <span className="text-xs text-foreground-muted">Love</span>
            </div>
            <p className="text-2xl font-bold">{stats.love}</p>
          </div>
          <div className="neomorph-flat p-4">
            <div className="flex items-center gap-2 mb-2">
              <Smile className="w-5 h-5 text-green-500" />
              <span className="text-xs text-foreground-muted">Good</span>
            </div>
            <p className="text-2xl font-bold">{stats.good}</p>
          </div>
          <div className="neomorph-flat p-4">
            <div className="flex items-center gap-2 mb-2">
              <Meh className="w-5 h-5 text-yellow-500" />
              <span className="text-xs text-foreground-muted">Ok</span>
            </div>
            <p className="text-2xl font-bold">{stats.ok}</p>
          </div>
          <div className="neomorph-flat p-4">
            <div className="flex items-center gap-2 mb-2">
              <Frown className="w-5 h-5 text-red-500" />
              <span className="text-xs text-foreground-muted">Hate</span>
            </div>
            <p className="text-2xl font-bold">{stats.hate}</p>
          </div>
        </div>
      </div>

      {/* Request Feedback Section */}
      <div className="neomorph p-4 md:p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Send className="w-5 h-5 text-accent" />
          Request Feedback
        </h3>
        
        <div className="space-y-3">
          {/* Step 1: Select Type */}
          <div>
            <label className="block text-sm font-medium mb-2">1. Select Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRequestType('bodyshop');
                  setSelectedCompanyId('');
                  setSelectedUserId('');
                }}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                  requestType === 'bodyshop'
                    ? 'bg-accent text-accent-foreground'
                    : 'neomorph-flat hover:bg-surface-hover'
                }`}
              >
                Repairer/Bodyshop
              </button>
              <button
                onClick={() => {
                  setRequestType('referrer');
                  setSelectedCompanyId('');
                  setSelectedUserId('');
                }}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                  requestType === 'referrer'
                    ? 'bg-accent text-accent-foreground'
                    : 'neomorph-flat hover:bg-surface-hover'
                }`}
              >
                Referrer
              </button>
            </div>
          </div>

          {/* Step 2: Select Company */}
          <div>
            <label className="block text-sm font-medium mb-2">2. Select Company</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => {
                setSelectedCompanyId(e.target.value);
                setSelectedUserId('');
              }}
              className="neomorph-inset w-full px-4 py-3 rounded-xl border-0"
            >
              <option value="">Select a {requestType === 'bodyshop' ? 'bodyshop' : 'referrer'}...</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          {/* Step 3: Select User or All */}
          {selectedCompanyId && (
            <div>
              <label className="block text-sm font-medium mb-2">3. Select User (or send to all)</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="neomorph-inset w-full px-4 py-3 rounded-xl border-0"
              >
                <option value="">All users in this company ({companyUsers.length})</option>
                {companyUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Send Button */}
          <Button
            onClick={() => {
              if (selectedUserId) {
                requestFeedbackMutation.mutate({ userId: selectedUserId });
              } else if (selectedCompanyId) {
                requestFeedbackMutation.mutate({ 
                  companyId: selectedCompanyId, 
                  companyType: requestType 
                });
              }
            }}
            disabled={!selectedCompanyId || requestFeedbackMutation.isPending}
            className="w-full neomorph-flat px-6 py-3 bg-accent/10 text-accent font-medium"
          >
            {requestFeedbackMutation.isPending 
              ? 'Sending...' 
              : selectedUserId 
                ? 'Send to Selected User' 
                : `Send to All Users (${companyUsers.length})`
            }
          </Button>
        </div>

        <p className="text-xs text-foreground-muted mt-2">
          Users will see the feedback prompt the next time they log in to their portal
        </p>
      </div>

      {/* Filters and Search */}
      <div className="neomorph p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <Input
              placeholder="Search by email or comment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="neomorph-inset pl-10"
            />
          </div>
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="neomorph-inset px-4 py-2 rounded-xl border-0"
          >
            <option value="all">All Ratings</option>
            <option value="love">Love</option>
            <option value="good">Good</option>
            <option value="ok">Ok</option>
            <option value="hate">Hate</option>
          </select>
          <select
            value={filterUserType}
            onChange={(e) => setFilterUserType(e.target.value)}
            className="neomorph-inset px-4 py-2 rounded-xl border-0"
          >
            <option value="all">All Types</option>
            <option value="referrer">Referrers</option>
            <option value="bodyshop">Repairers</option>
          </select>
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {feedbackLoading ? (
          <div className="neomorph p-4">
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-foreground-muted">Loading feedback...</p>
            </div>
          </div>
        ) : enrichedFeedback.length === 0 ? (
          <div className="neomorph p-4">
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 mx-auto text-foreground-muted mb-2" />
              <p className="text-foreground-muted">No feedback responses yet</p>
            </div>
          </div>
        ) : (
          <>
            {/* Repairer Feedback */}
            {repairerFeedback.length > 0 && (
              <div className="neomorph p-4">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-accent" />
                  Repairer Feedback ({repairerFeedback.length})
                </h3>
                <div className="space-y-3">
                  {repairerFeedback.map(item => {
                    const config = RATING_CONFIG[item.rating];
                    const Icon = config.icon;
                    
                    return (
                      <div key={item.id} className={`neomorph-flat p-4 ${config.bgColor} border border-opacity-30`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
                                <Icon className={`w-5 h-5 ${config.color}`} />
                              </div>
                              <div>
                                <p className="font-bold">{item.user_email}</p>
                                <p className="text-sm font-medium text-accent">{item.companyName}</p>
                                <p className="text-xs text-foreground-muted">
                                  {item.submission_date ? format(new Date(item.submission_date), 'dd/MM/yyyy HH:mm') : 'N/A'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="ml-13">
                              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
                                <Icon className="w-4 h-4" />
                                {config.label}
                              </span>
                              
                              {item.comment && (
                                <div className="mt-3 p-3 rounded-lg bg-surface border border-border">
                                  <p className="text-sm font-medium text-foreground-muted mb-1">Comment:</p>
                                  <p className="text-sm">{item.comment}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Referrer Feedback */}
            {referrerFeedback.length > 0 && (
              <div className="neomorph p-4">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent" />
                  Referrer Feedback ({referrerFeedback.length})
                </h3>
                <div className="space-y-3">
                  {referrerFeedback.map(item => {
                    const config = RATING_CONFIG[item.rating];
                    const Icon = config.icon;
                    
                    return (
                      <div key={item.id} className={`neomorph-flat p-4 ${config.bgColor} border border-opacity-30`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
                                <Icon className={`w-5 h-5 ${config.color}`} />
                              </div>
                              <div>
                                <p className="font-bold">{item.user_email}</p>
                                <p className="text-sm font-medium text-accent">{item.companyName}</p>
                                <p className="text-xs text-foreground-muted">
                                  {item.submission_date ? format(new Date(item.submission_date), 'dd/MM/yyyy HH:mm') : 'N/A'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="ml-13">
                              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
                                <Icon className="w-4 h-4" />
                                {config.label}
                              </span>
                              
                              {item.comment && (
                                <div className="mt-3 p-3 rounded-lg bg-surface border border-border">
                                  <p className="text-sm font-medium text-foreground-muted mb-1">Comment:</p>
                                  <p className="text-sm">{item.comment}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}