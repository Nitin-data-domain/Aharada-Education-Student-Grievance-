import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import StatusBadge from './StatusBadge';

export default function StudentDashboard() {
  const { user, updateUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  
  // Profile edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user.name);
  const [profileProgram, setProfileProgram] = useState(user.program_name || '');

  const [expandedTask, setExpandedTask] = useState(null);
  const [history, setHistory] = useState({});
  const [form, setForm] = useState({
    admission_no: '',
    problem_desc: '',
    file: null,
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 20;

  useEffect(() => {
    fetchTasks();
    fetchPrograms();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data.tasks);
    } catch (err) {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await api.get('/programs');
      // Only active programs
      const activeProgs = res.data.programs.filter(p => p.is_active);
      setPrograms(activeProgs);
      if (!user.program_name && activeProgs.length > 0) {
        setProfileProgram(activeProgs[0].program_name);
      }
    } catch (err) {
      console.error('Failed to fetch programs:', err);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const res = await api.put('/users/profile', {
        name: profileName,
        program_name: profileProgram
      });
      updateUser(res.data.user);
      toast.success('Profile updated successfully!');
      setIsEditingProfile(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const fetchHistory = async (taskId) => {
    if (expandedTask === taskId) {
      setExpandedTask(null);
      return;
    }
    if (history[taskId]) {
      setExpandedTask(taskId);
      return;
    }
    try {
      const res = await api.get(`/tasks/${taskId}/history`);
      setHistory((prev) => ({ ...prev, [taskId]: res.data.history }));
      setExpandedTask(taskId);
    } catch (err) {
      toast.error('Failed to fetch history');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user.program_name) {
      toast.error('Please configure your Academic Program in settings before submitting a grievance.');
      setIsEditingProfile(true);
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('admission_no', form.admission_no);
      formData.append('problem_desc', form.problem_desc);
      if (form.file) {
        formData.append('file', form.file);
      }

      await api.post('/tasks', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Grievance submitted successfully! HOD has been notified.');
      setForm({ admission_no: '', problem_desc: '', file: null });

      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';

      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-8">
      {/* Header & Quick Profile Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-fade-in-up">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Welcome, <span className="gradient-text">{user.name}</span>
          </h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Program: <span className="text-brand-600 font-semibold">{user.program_name || 'Not Selected'}</span>
          </p>
        </div>
        
        <div>
          {!isEditingProfile ? (
            <button
              onClick={() => {
                setProfileName(user.name);
                setProfileProgram(user.program_name || (programs[0]?.program_name || ''));
                setIsEditingProfile(true);
              }}
              className="btn-secondary flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile Settings
            </button>
          ) : (
            <form onSubmit={handleUpdateProfile} className="flex flex-col sm:flex-row items-end gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Your Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="form-input !py-1.5 !px-3 text-xs w-48"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Program</label>
                <select
                  value={profileProgram}
                  onChange={(e) => setProfileProgram(e.target.value)}
                  className="form-select text-xs w-48"
                  required
                >
                  {programs.map((p) => (
                    <option key={p.program_code} value={p.program_name}>
                      {p.program_code} - {p.program_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="btn-primary !py-1.5 !px-3 text-xs cursor-pointer"
                >
                  {updatingProfile ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="btn-secondary !py-1.5 !px-3 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in-up stagger-1">
        {[
          { label: 'Total Requests', value: tasks.length, color: 'border-brand-100 bg-brand-50/50 text-brand-800' },
          { label: 'Submitted', value: tasks.filter((t) => t.current_status === 'Submitted').length, color: 'border-yellow-100 bg-yellow-50/50 text-yellow-800' },
          { label: 'In Progress', value: tasks.filter((t) => ['Assigned', 'In Progress'].includes(t.current_status)).length, color: 'border-blue-100 bg-blue-50/50 text-blue-800' },
          { label: 'Resolved', value: tasks.filter((t) => t.current_status === 'Resolved').length, color: 'border-emerald-100 bg-emerald-50/50 text-emerald-800' },
        ].map((stat) => (
          <div key={stat.label} className={`border rounded-2xl p-4 shadow-sm ${stat.color}`}>
            <p className="text-xs font-bold uppercase tracking-wider opacity-75">{stat.label}</p>
            <p className="text-2xl font-black mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Submission Form */}
      <div className="glass-card p-6 sm:p-8 animate-fade-in-up stagger-2">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800">Submit New Request</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="student-name" className="block text-sm font-semibold text-slate-600 mb-2">Student Name</label>
              <input
                id="student-name"
                type="text"
                value={user.name}
                disabled
                className="form-input opacity-70 cursor-not-allowed bg-slate-50 border-slate-200"
              />
            </div>
            <div>
              <label htmlFor="admission-no" className="block text-sm font-semibold text-slate-600 mb-2">Admission Number</label>
              <input
                id="admission-no"
                type="text"
                value={form.admission_no}
                onChange={(e) => setForm({ ...form, admission_no: e.target.value })}
                placeholder="e.g., 2024-BBA-0042"
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="program-name" className="block text-sm font-semibold text-slate-600 mb-2">Program Name</label>
              <input
                id="program-name"
                type="text"
                value={user.program_name || 'Please configure in settings above'}
                disabled
                className={`form-input opacity-70 cursor-not-allowed bg-slate-50 ${!user.program_name ? 'text-red-500 border-red-200 font-medium' : 'text-slate-500 border-slate-200'}`}
              />
            </div>
            <div>
              <label htmlFor="file-upload" className="block text-sm font-semibold text-slate-600 mb-2">
                Upload Evidence <span className="text-slate-400 font-normal">(PDF/Image, max 10MB)</span>
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                onChange={(e) => setForm({ ...form, file: e.target.files[0] })}
                className="form-input text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 file:cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label htmlFor="problem-desc" className="block text-sm font-semibold text-slate-600 mb-2">Problem Description</label>
            <textarea
              id="problem-desc"
              value={form.problem_desc}
              onChange={(e) => setForm({ ...form, problem_desc: e.target.value })}
              placeholder="Describe your issue in detail..."
              rows={4}
              className="form-input resize-none"
              required
            />
          </div>

          <button
            type="submit"
            id="submit-grievance"
            disabled={submitting}
            className="btn-primary cursor-pointer shadow-md"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Submit Grievance
              </>
            )}
          </button>
        </form>
      </div>

      {/* Live Status Table */}
      <div className="glass-card overflow-hidden animate-fade-in-up stagger-3">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Live Status Tracker</h3>
              <p className="text-xs text-slate-500 font-medium">Click a row to view remarks and timeline history</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-500 mt-3 text-sm font-medium">Loading your requests...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center bg-slate-50/50">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2 2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm font-medium">No requests yet. Submit your first grievance above!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Admission No</th>
                  <th>Problem</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {tasks.slice((currentPage - 1) * tasksPerPage, currentPage * tasksPerPage).map((task) => (
                  <React.Fragment key={task.task_id}>
                    <tr
                      onClick={() => fetchHistory(task.task_id)}
                      className="cursor-pointer border-t border-slate-100 hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="font-mono text-brand-700 font-bold">#{task.task_id}</td>
                      <td className="text-slate-700 font-semibold">{task.admission_no}</td>
                      <td className="max-w-xs truncate text-slate-600 font-medium" title={task.problem_desc}>
                        {task.problem_desc}
                      </td>
                      <td className="text-slate-600 font-medium">{task.faculty_name || 'Not Assigned yet'}</td>
                      <td><StatusBadge status={task.current_status} /></td>
                      <td className="text-slate-500 text-xs whitespace-nowrap">{formatDate(task.created_at)}</td>
                      <td>
                        {task.file_url ? (
                          <a
                            href={api.defaults.baseURL + task.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-brand-600 hover:text-brand-800 text-xs font-semibold underline"
                          >
                            View File ↗
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs font-medium">—</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Row Expansion for Timeline & Remark */}
                    {expandedTask === task.task_id && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={7} className="p-5 border-t border-slate-100">
                          <div className="space-y-4 max-w-3xl">
                            {/* Faculty Remark (Student Visible Only) */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Faculty Remarks for you</h4>
                              <p className="text-sm font-semibold text-slate-800">
                                {task.remark_student || 'No remarks provided by faculty yet.'}
                              </p>
                            </div>

                            {/* Timeline */}
                            <div>
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Audit Timeline History</h4>
                              {history[task.task_id] ? (
                                <div className="relative pl-4 border-l border-slate-200 space-y-3">
                                  {history[task.task_id].map((h) => (
                                    <div key={h.history_id} className="relative flex flex-col gap-1 text-xs">
                                      {/* Timeline circle point */}
                                      <div className="flex items-center gap-3">
                                        <div className="-ml-[21.5px] w-3 h-3 rounded-full border-2 border-white bg-brand-600 shadow-sm flex-shrink-0" />
                                        <span className="text-slate-400 font-semibold">{formatDate(h.changed_at)}</span>
                                        <span className="text-slate-700 font-medium">
                                          Stage: <strong className="text-brand-700">{h.stage_changed_to}</strong>
                                        </span>
                                        <span className="text-slate-400 font-medium">by {h.updated_by_name}</span>
                                      </div>
                                      {h.remark && (
                                        <p className="ml-4 text-[11px] text-orange-700 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-lg font-medium mt-0.5">
                                          {h.remark}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-slate-400 font-semibold py-1">Loading timeline...</div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {!loading && tasks.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Showing {(currentPage - 1) * tasksPerPage + 1} to {Math.min(currentPage * tasksPerPage, tasks.length)} of {tasks.length} entries
            </span>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(tasks.length / tasksPerPage), p + 1))}
                disabled={currentPage === Math.ceil(tasks.length / tasksPerPage)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// React 19 forward-compat helper import react
import React from 'react';
