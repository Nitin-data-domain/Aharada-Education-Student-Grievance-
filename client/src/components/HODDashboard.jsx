import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import StatusBadge from './StatusBadge';

export default function HODDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('submissions'); // 'submissions' | 'users' | 'programs' | 'reports'
  
  // Reports state
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [reportDate, setReportDate] = useState(''); // 'YYYY-MM-DD'
  
  // Submissions state
  const [tasks, setTasks] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const [selectedFaculty, setSelectedFaculty] = useState({});
  const [filter, setFilter] = useState('all');

  // Reassignment state
  const [reassignModal, setReassignModal] = useState(null); // task_id or null
  const [reassignFaculty, setReassignFaculty] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [expandedTask, setExpandedTask] = useState(null);

  // Users Directory state
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  // Edit User state
  const [editUserModal, setEditUserModal] = useState(null); // holds user object
  const [editUserForm, setEditUserForm] = useState({ email: '', phone: '', password: '' });
  const [updatingUser, setUpdatingUser] = useState(false);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user.name);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Programs state
  const [programs, setPrograms] = useState([]);
  const [newProgCode, setNewProgCode] = useState('');
  const [newProgName, setNewProgName] = useState('');
  const [creatingProg, setCreatingProg] = useState(false);

  // Edit Remark State
  const [editingRemarkId, setEditingRemarkId] = useState(null);
  const [editRemarkHod, setEditRemarkHod] = useState('');
  const [editRemarkStudent, setEditRemarkStudent] = useState('');
  const [savingRemark, setSavingRemark] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 20;

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = () => {
    setLoading(true);
    Promise.all([
      fetchTasks(),
      fetchFaculty(),
      fetchUsers(),
      fetchPrograms()
    ]).finally(() => setLoading(false));
  };

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data.tasks);
    } catch (err) {
      toast.error('Failed to fetch tasks');
    }
  };

  const fetchFaculty = async () => {
    try {
      const res = await api.get('/users/faculty');
      setFaculty(res.data.faculty);
    } catch (err) {
      toast.error('Failed to fetch faculty list');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.users);
    } catch (err) {
      toast.error('Failed to fetch users directory');
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await api.get('/programs');
      setPrograms(res.data.programs);
    } catch (err) {
      toast.error('Failed to fetch programs');
    }
  };

  const handleAssign = async (taskId) => {
    const facultyId = selectedFaculty[taskId];
    if (!facultyId) {
      toast.error('Please select a faculty member first');
      return;
    }
    setAssigningId(taskId);
    try {
      const res = await api.put(`/tasks/${taskId}/assign`, { faculty_id: parseInt(facultyId) });
      toast.success(res.data.message);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Assignment failed');
    } finally {
      setAssigningId(null);
    }
  };

  const handleReassign = async () => {
    if (!reassignModal || !reassignFaculty) return;
    setReassigning(true);
    try {
      const res = await api.put(`/tasks/${reassignModal}/reassign`, {
        faculty_id: parseInt(reassignFaculty),
        reason: reassignReason
      });
      toast.success(res.data.message);
      setReassignModal(null);
      setReassignFaculty('');
      setReassignReason('');
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reassignment failed');
    } finally {
      setReassigning(false);
    }
  };

  const handleSaveRemark = async (taskId) => {
    setSavingRemark(true);
    try {
      await api.put(`/tasks/${taskId}/hod-remark`, {
        remark_hod: editRemarkHod,
        remark_student: editRemarkStudent
      });
      toast.success('Remarks updated successfully!');
      setEditingRemarkId(null);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update remark');
    } finally {
      setSavingRemark(false);
    }
  };

  const startEditingRemark = (task) => {
    setEditingRemarkId(task.task_id);
    setEditRemarkHod(task.remark_hod || '');
    setEditRemarkStudent(task.remark_student || '');
  };

  const handleToggleFacultyActive = async (userId) => {
    try {
      const res = await api.put(`/users/${userId}/toggle-active`);
      toast.success(res.data.message);
      // Reload lists
      fetchUsers();
      fetchFaculty();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to toggle status');
    }
  };

  const handleAdminUpdateUser = async (e) => {
    e.preventDefault();
    setUpdatingUser(true);
    try {
      const payload = {
        email: editUserForm.email,
        phone: editUserForm.phone,
      };
      if (editUserForm.password) {
        payload.password = editUserForm.password;
      }
      const res = await api.put(`/users/${editUserModal.user_id}/admin-update`, payload);
      toast.success(res.data.message);
      setEditUserModal(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update user');
    } finally {
      setUpdatingUser(false);
    }
  };

  const handleCreateProgram = async (e) => {
    e.preventDefault();
    if (!newProgCode || !newProgName) return;
    setCreatingProg(true);
    try {
      const res = await api.post('/programs', {
        program_code: newProgCode.toUpperCase(),
        program_name: newProgName
      });
      toast.success(res.data.message);
      setNewProgCode('');
      setNewProgName('');
      fetchPrograms();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create program');
    } finally {
      setCreatingProg(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const res = await api.put('/users/profile', {
        name: profileName
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

  const handleToggleProgramActive = async (progId, currentStatus) => {
    try {
      await api.put(`/programs/${progId}`, { is_active: !currentStatus });
      toast.success('Program status updated.');
      fetchPrograms();
    } catch (err) {
      toast.error('Failed to update program status');
    }
  };

  const handleDeleteProgram = async (progId) => {
    if (!window.confirm('Are you sure you want to delete this program?')) return;
    try {
      await api.delete(`/programs/${progId}`);
      toast.success('Program deleted successfully.');
      fetchPrograms();
    } catch (err) {
      toast.error('Failed to delete program');
    }
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const downloadReport = () => {
    let filteredTasks = tasks;
    
    if (reportDate) {
      filteredTasks = tasks.filter(t => {
        const d = new Date(t.created_at);
        const taskDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return taskDate === reportDate;
      });
    } else {
      const selectedYear = parseInt(reportMonth.split('-')[0]);
      const selectedMonth = parseInt(reportMonth.split('-')[1]) - 1;
      
      filteredTasks = tasks.filter(t => {
        const d = new Date(t.created_at);
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      });
    }

    if (filteredTasks.length === 0) {
      toast.error('No tasks available for the selected period to download.');
      return;
    }

    let csv = 'Task ID,Student Name,Admission No,Program,Status,Date Submitted,Problem Description,Faculty Assigned\n';
    filteredTasks.forEach(t => {
      csv += `${t.task_id},"${t.student_name}","${t.admission_no}","${t.student_program || ''}","${t.current_status}","${new Date(t.created_at).toLocaleDateString()}","${t.problem_desc.replace(/"/g, '""')}","${t.faculty_name || 'Unassigned'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `HOD_Report_${reportDate || reportMonth}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };


  const filteredTasks = tasks.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'unassigned') return t.current_status === 'Submitted';
    if (filter === 'assigned') return t.current_status === 'Assigned';
    if (filter === 'in-progress') return t.current_status === 'In Progress';
    if (filter === 'resolved') return t.current_status === 'Resolved';
    if (filter === 'delegated') return t.assigned_hod === user.user_id;
    return true;
  });

  const filteredUsers = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                        u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    return matchSearch && matchRole;
  });

  const stats = {
    total: tasks.length,
    unassigned: tasks.filter((t) => t.current_status === 'Submitted').length,
    assigned: tasks.filter((t) => t.current_status === 'Assigned').length,
    inProgress: tasks.filter((t) => t.current_status === 'In Progress').length,
    resolved: tasks.filter((t) => t.current_status === 'Resolved').length,
    delegated: tasks.filter((t) => t.assigned_hod === user.user_id).length,
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-fade-in-up">
        <div>
          {!isEditingProfile ? (
            <>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                HOD Administration — <span className="gradient-text">{user.name}</span>
                <button
                  onClick={() => {
                    setProfileName(user.name);
                    setIsEditingProfile(true);
                  }}
                  className="text-brand-600 hover:text-brand-800 p-1 cursor-pointer"
                  title="Edit Name"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </h2>
              <p className="text-slate-500 mt-1 text-sm font-medium">Configure programs, active directory, and resolve grievances.</p>
            </>
          ) : (
            <form onSubmit={handleUpdateProfile} className="flex flex-col sm:flex-row items-end gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 w-full">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Your Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="form-input !py-1.5 !px-3 text-sm w-64"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="btn-primary !py-1.5 !px-3 text-xs cursor-pointer"
                >
                  {updatingProfile ? 'Saving...' : 'Save Name'}
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
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === 'submissions' ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Submissions
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === 'users' ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Academic Directory
          </button>
          <button
            onClick={() => setActiveTab('programs')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === 'programs' ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Manage Programs
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === 'reports' ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Reports
          </button>
        </div>
      </div>

      {activeTab === 'submissions' && (
        <>
        <div className="space-y-6 animate-fade-in-up">
          {/* Submissions Stats Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 animate-fade-in-up stagger-1">
            {[
              { label: 'Total', value: stats.total, color: 'border-slate-200 bg-slate-50/50 text-slate-800', f: 'all' },
              { label: 'Delegated to Me', value: stats.delegated, color: 'border-indigo-200 bg-indigo-50/50 text-indigo-800', f: 'delegated' },
              { label: 'Unassigned', value: stats.unassigned, color: 'border-yellow-200 bg-yellow-50/50 text-yellow-800', f: 'unassigned' },
              { label: 'Assigned', value: stats.assigned, color: 'border-blue-200 bg-blue-50/50 text-blue-800', f: 'assigned' },
              { label: 'In Progress', value: stats.inProgress, color: 'border-orange-200 bg-orange-50/50 text-orange-800', f: 'in-progress' },
              { label: 'Resolved', value: stats.resolved, color: 'border-emerald-200 bg-emerald-50/50 text-emerald-800', f: 'resolved' },
            ].map((s) => (
              <button
                key={s.label}
                onClick={() => setFilter(s.f)}
                className={`border rounded-2xl p-4 text-left transition-all duration-200 cursor-pointer shadow-sm ${s.color} ${filter === s.f ? 'ring-2 ring-brand-500 scale-[1.02] font-semibold' : 'hover:scale-[1.01]'}`}
              >
                <p className="text-xs font-bold uppercase tracking-wider opacity-75">{s.label}</p>
                <p className="text-2xl font-black mt-1">{s.value}</p>
              </button>
            ))}
          </div>

          {/* Quick Active Faculty list */}
          <div className="glass-card p-5 animate-fade-in-up stagger-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Available Faculty</h3>
            <div className="flex flex-wrap gap-2">
              {faculty.filter(f => f.is_active).map((f) => (
                <div key={f.user_id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 shadow-sm">
                  <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center text-[10px] font-bold text-white">
                    {f.name.charAt(0)}
                  </div>
                  <span className="text-xs font-semibold text-slate-700">{f.name}</span>
                </div>
              ))}
              {faculty.filter(f => f.is_active).length === 0 && (
                <span className="text-xs font-semibold text-red-500">No active faculty members available.</span>
              )}
            </div>
          </div>

          {/* Submissions Table */}
          <div className="glass-card overflow-hidden animate-fade-in-up stagger-3">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Student Submissions</h3>
                  <p className="text-xs text-slate-500 font-medium">{filteredTasks.length} of {tasks.length} grievances</p>
                </div>
              </div>
              <button onClick={loadAllData} className="btn-secondary text-xs cursor-pointer">↻ Refresh</button>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm font-semibold">No submissions match this filter.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Student</th>
                      <th>Program</th>
                      <th>Problem</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Assign Faculty</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.slice((currentPage - 1) * tasksPerPage, currentPage * tasksPerPage).map((task) => (
                      <React.Fragment key={task.task_id}>
                      <tr onClick={() => setExpandedTask(expandedTask === task.task_id ? null : task.task_id)} className="border-t border-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer">
                        <td className="font-mono text-brand-700 font-bold">
                          #{task.task_id}
                          {task.assigned_hod === user.user_id && (
                            <span className="block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 w-fit">
                              DELEGATED
                            </span>
                          )}
                        </td>
                        <td>
                          <p className="text-slate-800 font-bold text-sm">{task.student_name}</p>
                          <p className="text-slate-500 text-xs font-semibold">{task.admission_no}</p>
                        </td>
                        <td className="text-slate-600 text-xs font-bold">{task.student_program || '—'}</td>
                        <td className="max-w-[200px]">
                          <p className="text-slate-600 text-sm truncate font-medium" title={task.problem_desc}>{task.problem_desc}</p>
                          {task.file_url && (
                            <a
                              href={api.defaults.baseURL + task.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-600 text-xs font-bold hover:underline"
                            >
                              📎 Attachment
                            </a>
                          )}
                        </td>
                        <td><StatusBadge status={task.current_status} /></td>
                        <td className="text-slate-500 text-xs whitespace-nowrap">{formatDate(task.created_at)}</td>
                        <td>
                          {task.current_status === 'Submitted' ? (
                            <select
                              id={`assign-select-${task.task_id}`}
                              value={selectedFaculty[task.task_id] || ''}
                              onChange={(e) => setSelectedFaculty({ ...selectedFaculty, [task.task_id]: e.target.value })}
                              className="form-select text-xs min-w-[150px]"
                            >
                              <option value="">Select Faculty...</option>
                              {faculty.filter(f => f.is_active).map((f) => (
                                <option key={f.user_id} value={f.user_id}>{f.name}</option>
                              ))}
                            </select>
                          ) : (
                            <div>
                              <span className="text-slate-700 font-semibold text-sm">{task.faculty_name || '—'}</span>
                              {task.previous_faculty_name && (
                                <p className="text-[10px] text-orange-600 font-semibold mt-0.5">↻ Previously: {task.previous_faculty_name}</p>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          {task.current_status === 'Submitted' ? (
                            <button
                              id={`assign-btn-${task.task_id}`}
                              onClick={() => handleAssign(task.task_id)}
                              disabled={assigningId === task.task_id || !selectedFaculty[task.task_id]}
                              className="btn-primary text-xs !px-3 !py-1.5 cursor-pointer"
                            >
                              {assigningId === task.task_id ? '...' : 'Assign'}
                            </button>
                          ) : task.current_status !== 'Resolved' ? (
                            <button
                              onClick={() => { setReassignModal(task.task_id); setReassignFaculty(''); setReassignReason(''); }}
                              className="px-2.5 py-1 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 text-xs font-bold hover:bg-orange-100 cursor-pointer transition-all"
                            >
                              ↻ Reassign
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-600 font-semibold">✓ Resolved</span>
                          )}
                        </td>
                      </tr>
                      {/* Expanded View for HOD */}
                      {expandedTask === task.task_id && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={8} className="p-6 border-t border-slate-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
                              {/* Internal Remark */}
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Faculty Remark (Visible to HOD)</h4>
                                {editingRemarkId === task.task_id ? (
                                  <textarea
                                    value={editRemarkHod}
                                    onChange={(e) => setEditRemarkHod(e.target.value)}
                                    className="form-textarea w-full text-sm font-semibold text-slate-800"
                                    rows={3}
                                  />
                                ) : (
                                  <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap">
                                    {task.remark_hod || 'No internal remarks provided by faculty yet.'}
                                  </p>
                                )}
                              </div>
                              
                              {/* Student Remark & File */}
                              <div className="space-y-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                  <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faculty Remark (Visible to Student)</h4>
                                    {editingRemarkId !== task.task_id ? (
                                      <button onClick={() => startEditingRemark(task)} className="text-xs font-bold text-brand-600 hover:underline cursor-pointer">
                                        Edit Remarks
                                      </button>
                                    ) : (
                                      <div className="flex gap-2">
                                        <button onClick={() => setEditingRemarkId(null)} className="text-xs font-bold text-slate-500 hover:underline cursor-pointer">
                                          Cancel
                                        </button>
                                        <button onClick={() => handleSaveRemark(task.task_id)} disabled={savingRemark} className="text-xs font-bold text-brand-600 hover:underline cursor-pointer">
                                          {savingRemark ? 'Saving...' : 'Save'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {editingRemarkId === task.task_id ? (
                                    <textarea
                                      value={editRemarkStudent}
                                      onChange={(e) => setEditRemarkStudent(e.target.value)}
                                      className="form-textarea w-full text-sm font-semibold text-slate-800"
                                      rows={3}
                                    />
                                  ) : (
                                    <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap">
                                      {task.remark_student || 'No remarks provided for the student yet.'}
                                    </p>
                                  )}
                                </div>
                                {task.faculty_file_url && (
                                  <div className="bg-brand-50 p-4 rounded-xl border border-brand-100">
                                    <h4 className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-2">Attached Faculty Evidence</h4>
                                    <a href={api.defaults.baseURL + task.faculty_file_url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-brand-600 hover:underline flex items-center gap-2">
                                      <span>📎</span> View Uploaded File
                                    </a>
                                  </div>
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
            
            {!loading && filteredTasks.length > 0 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {(currentPage - 1) * tasksPerPage + 1} to {Math.min(currentPage * tasksPerPage, filteredTasks.length)} of {filteredTasks.length} entries
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
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTasks.length / tasksPerPage), p + 1))}
                    disabled={currentPage === Math.ceil(filteredTasks.length / tasksPerPage)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reassignment Modal */}
        {reassignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-5">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Reassign Task #{reassignModal}</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Select a new faculty member. The new faculty will be able to view all previous remarks, sub-tasks, and history.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">New Faculty Member</label>
                <select
                  value={reassignFaculty}
                  onChange={(e) => setReassignFaculty(e.target.value)}
                  className="form-select text-sm"
                >
                  <option value="">Select Faculty...</option>
                  {faculty.filter(f => f.is_active && f.user_id !== tasks.find(t => t.task_id === reassignModal)?.assigned_to).map((f) => (
                    <option key={f.user_id} value={f.user_id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Reason for Reassignment <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="e.g., Faculty on leave, workload rebalancing..."
                  rows={3}
                  className="form-input resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setReassignModal(null)}
                  className="btn-secondary w-1/2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReassign}
                  disabled={reassigning || !reassignFaculty}
                  className="btn-primary w-1/2 cursor-pointer"
                >
                  {reassigning ? 'Reassigning...' : 'Confirm Reassign'}
                </button>
              </div>
            </div>
          </div>
        )}
        </>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-full sm:max-w-xs">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Search User</label>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="w-full sm:max-w-xs">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Role Filter</label>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="form-select !py-2.5 !text-sm"
              >
                <option value="all">All Roles</option>
                <option value="Student">Students Only</option>
                <option value="Faculty">Faculty Only</option>
                <option value="HOD">HODs Only</option>
              </select>
            </div>
          </div>

          {/* Academic Users Table */}
          <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">Academic Directory List</h3>
              <p className="text-xs text-slate-500 font-medium">Viewing students, faculty members, and authentication statuses</p>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Program</th>
                    <th>System ID Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.user_id} className="border-t border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="font-mono text-slate-500">#{u.user_id}</td>
                      <td><span className="text-slate-800 font-bold">{u.name}</span></td>
                      <td className="text-slate-600 font-medium">{u.email}</td>
                      <td>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          u.role === 'Student' ? 'bg-emerald-50 text-emerald-700' :
                          u.role === 'Faculty' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="text-slate-600 text-xs font-bold">{u.program_name || '—'}</td>
                      <td>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          u.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {u.is_active ? 'Active ID' : 'Deactivated'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditUserModal(u);
                              setEditUserForm({ email: u.email, phone: u.phone || '', password: '' });
                            }}
                            className="px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                          >
                            Edit
                          </button>
                          {u.role === 'Faculty' && (
                            <button
                              onClick={() => handleToggleFacultyActive(u.user_id)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                                u.is_active ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              {u.is_active ? 'Deactivate ID' : 'Activate ID'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center p-8 text-slate-400 font-semibold">No directory users match search filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {editUserModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in-up">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Edit User: {editUserModal.name}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Update user details or reset their password.</p>
                </div>

                <form onSubmit={handleAdminUpdateUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">Email</label>
                    <input
                      type="email"
                      value={editUserForm.email}
                      onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                      className="form-input text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">Phone</label>
                    <input
                      type="text"
                      value={editUserForm.phone}
                      onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                      className="form-input text-sm"
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">New Password (leave blank to keep current)</label>
                    <input
                      type="password"
                      value={editUserForm.password}
                      onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
                      className="form-input text-sm"
                      placeholder="Enter new password"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditUserModal(null)}
                      className="btn-secondary w-1/2 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updatingUser}
                      className="btn-primary w-1/2 cursor-pointer"
                    >
                      {updatingUser ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'programs' && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Add New Program Code Form */}
          <div className="glass-card p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Add New Academic Program
            </h3>
            
            <form onSubmit={handleCreateProgram} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Program Code</label>
                <input
                  type="text"
                  placeholder="e.g. BBA-AT"
                  value={newProgCode}
                  onChange={(e) => setNewProgCode(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Program Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. BBA - Automation Technology"
                  value={newProgName}
                  onChange={(e) => setNewProgName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={creatingProg}
                className="btn-primary w-full cursor-pointer shadow-md"
              >
                {creatingProg ? 'Adding...' : 'Add Program'}
              </button>
            </form>
          </div>

          {/* Programs List Table */}
          <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">Academic Programs List</h3>
              <p className="text-xs text-slate-500 font-medium">Students select their program from this active list during registration and profile configuration</p>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Program ID</th>
                    <th>Code</th>
                    <th>Full Name</th>
                    <th>Status</th>
                    <th>Date Added</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((p) => (
                    <tr key={p.program_id} className="border-t border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="font-mono text-slate-500">#{p.program_id}</td>
                      <td><span className="text-brand-700 font-bold">{p.program_code}</span></td>
                      <td className="text-slate-800 font-bold">{p.program_name}</td>
                      <td>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          p.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {p.is_active ? 'Active Selection' : 'Inactive'}
                        </span>
                      </td>
                      <td className="text-slate-500 text-xs">{formatDate(p.created_at)}</td>
                      <td className="text-right space-x-2">
                        <button
                          onClick={() => handleToggleProgramActive(p.program_id, p.is_active)}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                        >
                          {p.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDeleteProgram(p.program_id)}
                          className="px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {programs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-slate-400 font-semibold">No programs configured yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="glass-card p-6 sm:p-8 animate-fade-in-up">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Monthly Grievance Report</h3>
              <p className="text-sm text-slate-500 font-medium">Select a month to view grievance statistics.</p>
            </div>
            <div className="flex gap-3">
              <input 
                type="month" 
                value={reportMonth}
                onChange={(e) => { setReportMonth(e.target.value); setReportDate(''); }}
                className="form-input text-sm font-bold w-48 shadow-sm"
              />
              <span className="text-sm font-bold text-slate-400 self-center">OR</span>
              <input 
                type="date" 
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="form-input text-sm font-bold w-48 shadow-sm"
              />
              <button onClick={downloadReport} className="btn-primary text-sm !px-4 cursor-pointer">
                Download CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(() => {
              let filteredTasks = tasks;
              let periodLabel = '';

              if (reportDate) {
                filteredTasks = tasks.filter(t => {
                  const d = new Date(t.created_at);
                  const taskDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  return taskDate === reportDate;
                });
                periodLabel = new Date(reportDate).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
              } else {
                const selectedYear = parseInt(reportMonth.split('-')[0]);
                const selectedMonth = parseInt(reportMonth.split('-')[1]) - 1;
                
                filteredTasks = tasks.filter(t => {
                  const d = new Date(t.created_at);
                  return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
                });
                periodLabel = new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
              }

              const total = filteredTasks.length;
              const resolved = filteredTasks.filter(t => t.current_status === 'Resolved').length;
              const pending = total - resolved;
              const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

              return (
                <>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Grievances</p>
                    <p className="text-4xl font-black text-slate-800">{total}</p>
                    <p className="text-sm font-semibold text-slate-500 mt-2">Submitted in {periodLabel}</p>
                  </div>
                  
                  <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200">
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Resolved</p>
                    <p className="text-4xl font-black text-emerald-700">{resolved}</p>
                    <p className="text-sm font-semibold text-emerald-600/80 mt-2">{resolutionRate}% Resolution Rate</p>
                  </div>

                  <div className="bg-orange-50 p-6 rounded-2xl border border-orange-200">
                    <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">Pending / Active</p>
                    <p className="text-4xl font-black text-orange-700">{pending}</p>
                    <p className="text-sm font-semibold text-orange-600/80 mt-2">Tasks requiring action</p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
