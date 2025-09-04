'use client';

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Phone, 
  Building, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Eye,
  Filter,
  Search,
  Calendar,
  User,
  ChevronDown,
  MoreVertical,
  Archive,
  Trash2,
  MessageSquare,
  Star
} from 'lucide-react';
import { GlassCard } from '@/components/ui/dashboard';

interface FormSubmission {
  id: string;
  formType: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  phone?: string;
  company?: string;
  status: string;
  priority: string;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
  User?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function FormSubmissionsPage() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    formType: '',
    priority: '',
    search: ''
  });

  // Fetch submissions
  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(filters.status && { status: filters.status }),
        ...(filters.formType && { formType: filters.formType }),
        ...(filters.priority && { priority: filters.priority }),
      });

      const response = await fetch(`/api/form-submissions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch submissions');

      const data = await response.json();
      setSubmissions(data.submissions);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [currentPage, filters]);

  // Update submission status
  const updateSubmissionStatus = async (id: string, updates: any) => {
    try {
      const response = await fetch(`/api/form-submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Failed to update submission');

      // Refresh the submissions list
      fetchSubmissions();
      
      // Update selected submission if it's the one being updated
      if (selectedSubmission?.id === id) {
        const updatedData = await response.json();
        setSelectedSubmission(updatedData.submission);
      }
    } catch (error) {
      console.error('Error updating submission:', error);
    }
  };

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'text-blue-400';
      case 'IN_REVIEW': return 'text-yellow-400';
      case 'RESPONDED': return 'text-green-400';
      case 'RESOLVED': return 'text-emerald-400';
      case 'CLOSED': return 'text-gray-400';
      default: return 'text-slate-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-400';
      case 'HIGH': return 'text-orange-400';
      case 'NORMAL': return 'text-green-400';
      case 'LOW': return 'text-slate-400';
      default: return 'text-slate-400';
    }
  };

  const getFormTypeLabel = (formType: string) => {
    return formType.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Form Submissions</h1>
          <p className="text-slate-400 mt-1">
            Manage contact forms and customer inquiries
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-stone-800/60 rounded-lg px-3 py-2 text-sm text-slate-300">
            {pagination && (
              <>
                Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Submissions List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <GlassCard className="p-4">
            <div className="grid md:grid-cols-4 gap-4">
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="rounded-lg border border-stone-600 bg-black/40 px-3 py-2 text-white text-sm"
              >
                <option value="">All Status</option>
                <option value="NEW">New</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="RESPONDED">Responded</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>

              <select
                value={filters.formType}
                onChange={(e) => setFilters(prev => ({ ...prev, formType: e.target.value }))}
                className="rounded-lg border border-stone-600 bg-black/40 px-3 py-2 text-white text-sm"
              >
                <option value="">All Types</option>
                <option value="CONTACT">Contact</option>
                <option value="CUSTOM_ORDER">Custom Order</option>
                <option value="BULK_ORDER">Bulk Order</option>
                <option value="SUPPORT">Support</option>
                <option value="PARTNERSHIP">Partnership</option>
              </select>

              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="rounded-lg border border-stone-600 bg-black/40 px-3 py-2 text-white text-sm"
              >
                <option value="">All Priority</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Low</option>
              </select>

              <button
                onClick={() => setFilters({ status: '', formType: '', priority: '', search: '' })}
                className="px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded-lg text-sm font-medium text-white border border-stone-600 transition"
              >
                Clear Filters
              </button>
            </div>
          </GlassCard>

          {/* Submissions List */}
          <div className="space-y-3">
            {loading ? (
              <GlassCard className="p-6 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-400">Loading submissions...</p>
              </GlassCard>
            ) : submissions.length === 0 ? (
              <GlassCard className="p-6 text-center">
                <Mail className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No form submissions found</p>
              </GlassCard>
            ) : (
              submissions.map((submission) => (
                <GlassCard 
                  key={submission.id}
                  className={`p-4 cursor-pointer transition-all hover:bg-stone-800/70 ${
                    selectedSubmission?.id === submission.id ? 'ring-2 ring-lime-400/50' : ''
                  }`}
                  onClick={() => setSelectedSubmission(submission)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium text-slate-300">
                          {getFormTypeLabel(submission.formType)}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full bg-stone-700 border border-stone-600 ${getStatusColor(submission.status)}`}>
                          {submission.status.replace('_', ' ')}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full bg-stone-700 border border-stone-600 ${getPriorityColor(submission.priority)}`}>
                          {submission.priority}
                        </span>
                      </div>

                      <h3 className="font-semibold text-white truncate mb-1">
                        {submission.name} - {submission.subject || 'No Subject'}
                      </h3>
                      
                      <p className="text-sm text-slate-400 mb-2">
                        {submission.email}
                        {submission.company && ` • ${submission.company}`}
                      </p>

                      <p className="text-sm text-slate-300 line-clamp-2">
                        {submission.message}
                      </p>

                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(submission.createdAt)}
                        </span>
                        {submission.resolved && (
                          <span className="flex items-center gap-1 text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            Resolved
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {submission.phone && (
                        <Phone className="w-4 h-4 text-slate-500" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Add dropdown menu for actions
                        }}
                        className="p-1 hover:bg-stone-700 rounded transition"
                      >
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-stone-700 hover:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white border border-stone-600 transition"
                >
                  Previous
                </button>

                <span className="text-sm text-slate-400">
                  Page {currentPage} of {pagination.pages}
                </span>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                  disabled={currentPage === pagination.pages}
                  className="px-4 py-2 bg-stone-700 hover:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white border border-stone-600 transition"
                >
                  Next
                </button>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Submission Detail Panel */}
        <div className="space-y-4">
          {selectedSubmission ? (
            <>
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Submission Details</h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full bg-stone-700 border border-stone-600 ${getStatusColor(selectedSubmission.status)}`}>
                      {selectedSubmission.status.replace('_', ' ')}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full bg-stone-700 border border-stone-600 ${getPriorityColor(selectedSubmission.priority)}`}>
                      {selectedSubmission.priority}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-400">Form Type</label>
                    <p className="text-white">{getFormTypeLabel(selectedSubmission.formType)}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-400">Name</label>
                    <p className="text-white">{selectedSubmission.name}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-400">Email</label>
                    <p className="text-white">{selectedSubmission.email}</p>
                  </div>

                  {selectedSubmission.phone && (
                    <div>
                      <label className="text-sm font-medium text-slate-400">Phone</label>
                      <p className="text-white">{selectedSubmission.phone}</p>
                    </div>
                  )}

                  {selectedSubmission.company && (
                    <div>
                      <label className="text-sm font-medium text-slate-400">Company</label>
                      <p className="text-white">{selectedSubmission.company}</p>
                    </div>
                  )}

                  {selectedSubmission.subject && (
                    <div>
                      <label className="text-sm font-medium text-slate-400">Subject</label>
                      <p className="text-white">{selectedSubmission.subject}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-slate-400">Message</label>
                    <div className="bg-stone-800/60 rounded-lg p-4 border border-stone-600 mt-1">
                      <p className="text-slate-200 whitespace-pre-wrap">{selectedSubmission.message}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-600">
                    <div>
                      <label className="text-sm font-medium text-slate-400">Submitted</label>
                      <p className="text-white text-sm">{formatDate(selectedSubmission.createdAt)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-400">Updated</label>
                      <p className="text-white text-sm">{formatDate(selectedSubmission.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Actions */}
              <GlassCard className="p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Actions</h4>
                <div className="space-y-3">
                  <select
                    value={selectedSubmission.status}
                    onChange={(e) => updateSubmissionStatus(selectedSubmission.id, { status: e.target.value })}
                    className="w-full rounded-lg border border-stone-600 bg-black/40 px-3 py-2 text-white"
                  >
                    <option value="NEW">New</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="RESPONDED">Responded</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>

                  <select
                    value={selectedSubmission.priority}
                    onChange={(e) => updateSubmissionStatus(selectedSubmission.id, { priority: e.target.value })}
                    className="w-full rounded-lg border border-stone-600 bg-black/40 px-3 py-2 text-white"
                  >
                    <option value="LOW">Low Priority</option>
                    <option value="NORMAL">Normal Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent Priority</option>
                  </select>

                  <button
                    onClick={() => updateSubmissionStatus(selectedSubmission.id, { 
                      resolved: !selectedSubmission.resolved,
                      status: selectedSubmission.resolved ? 'IN_REVIEW' : 'RESOLVED'
                    })}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-medium border transition ${
                      selectedSubmission.resolved
                        ? 'bg-stone-700 hover:bg-stone-600 text-white border-stone-600'
                        : 'bg-green-600 hover:bg-green-700 text-white border-green-500'
                    }`}
                  >
                    {selectedSubmission.resolved ? 'Mark as Unresolved' : 'Mark as Resolved'}
                  </button>

                  <a
                    href={`mailto:${selectedSubmission.email}?subject=Re: ${selectedSubmission.subject || 'Your inquiry'}&body=Hi ${selectedSubmission.name},%0A%0AThank you for contacting US Custom Cap. In response to your inquiry:%0A%0A"${selectedSubmission.message}"%0A%0A`}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-lime-600 hover:bg-lime-700 rounded-lg text-sm font-medium text-white border border-lime-500 transition"
                  >
                    <Mail className="w-4 h-4" />
                    Reply via Email
                  </a>
                </div>
              </GlassCard>
            </>
          ) : (
            <GlassCard className="p-6 text-center">
              <Eye className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Select a submission to view details</p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}