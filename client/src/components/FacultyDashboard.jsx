import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import StatusBadge from './StatusBadge';

export default function FacultyDashboard() {
  const { user, updateUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user.name);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  
  // Quick status changes selection state
  const [statusSelections, setStatusSelections] = useState({});
  const [filter, setFilter] = useState('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  // Expanded row details state (remarks, subtasks)
  const [expandedTask, setExpandedTask] = useState(null);
  const [remarks, setRemarks] = useState({}); // { [taskId]: { student: '', hod: '' } }
  const [savingRemarks, setSavingRemarks] = useState({});
  
  // Subtasks list state
  const [subtasks, setSubtasks] = useState({}); // { [taskId]: [...] }
  const [subtaskDesc, setSubtaskDesc] = useState('');
  const [subtaskType, setSubtaskType] = useState('General');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [facultyFiles, setFacultyFiles] = useState({});

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data.tasks);
      
      // Seed initial remarks state
      const initialRemarks = {};
      res.data.tasks.forEach(t => {
        initialRemarks[t.task_id] = {
          student: t.remark_student || '',
          hod: t.remark_hod || ''
        };
      });
      setRemarks(initialRemarks);
    } catch (err) {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const res = await api.put('/users/profile', {
        name: profileName
      });
      // Need updateUser from AuthContext! 
      // Wait, let's grab updateUser from useAuth. I need to modify the useAuth destructuring.
      toast.success('Profile updated successfully!');
      setIsEditingProfile(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleStatusUpdate = async (taskId) => {
    const status = statusSelections[taskId];
    if (!status) {
      toast.error('Please select a status');
      return;
    }
    setUpdatingId(taskId);
    try {
      const res = await api.put(`/tasks/${taskId}/status`, { status });
      toast.success(res.data.message);
      fetchTasks();
      setStatusSelections((prev) => {
        const copy = { ...prev };
        delete copy[taskId];
        return copy;
      });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRowClick = async (taskId) => {
    if (expandedTask === taskId) {
      setExpandedTask(null);
      return;
    }
    setExpandedTask(taskId);
    loadSubtasks(taskId);
  };

  const loadSubtasks = async (taskId) => {
    try {
      const res = await api.get(`/tasks/${taskId}/subtasks`);
      setSubtasks(prev => ({ ...prev, [taskId]: res.data.subTasks }));
    } catch (err) {
      console.error('Failed to fetch sub-tasks:', err);
    }
  };

  const handleSaveRemarks = async (taskId) => {
    setSavingRemarks(prev => ({ ...prev, [taskId]: true }));
    try {
      const { student, hod } = remarks[taskId] || {};
      const file = facultyFiles[taskId];

      const formData = new FormData();
      if (student) formData.append('remark_student', student);
      if (hod) formData.append('remark_hod', hod);
      if (file) formData.append('faculty_file', file);

      await api.put(`/tasks/${taskId}/status`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Remarks updated successfully');
      setFacultyFiles(prev => {
        const copy = { ...prev };
        delete copy[taskId];
        return copy;
      });
      fetchTasks();
    } catch (err) {
      toast.error('Failed to save remarks');
    } finally {
      setSavingRemarks(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const handleAddSubtask = async (e, taskId) => {
    e.preventDefault();
    if (!subtaskDesc) return;
    setAddingSubtask(true);
    try {
      await api.post(`/tasks/${taskId}/subtasks`, {
        description: subtaskDesc,
        sub_task_type: subtaskType
      });
      toast.success('Sub-task added successfully');
      setSubtaskDesc('');
      loadSubtasks(taskId);
    } catch (err) {
      toast.error('Failed to add sub-task');
    } finally {
      setAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (subtaskId, taskId, currentStatus) => {
    const nextStatus = currentStatus === 'Pending' ? 'Done' : 'Pending';
    try {
      await api.put(`/tasks/subtasks/${subtaskId}/status`, { status: nextStatus });
      toast.success('Sub-task updated');
      loadSubtasks(taskId);
    } catch (err) {
      toast.error('Failed to update sub-task status');
    }
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'active') return t.current_status !== 'Resolved';
    if (filter === 'resolved') return t.current_status === 'Resolved';
    return true;
  });

  const stats = {
    total: tasks.length,
    active: tasks.filter((t) => t.current_status !== 'Resolved').length,
    resolved: tasks.filter((t) => t.current_status === 'Resolved').length,
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-fade-in-up">
        <div>
          {!isEditingProfile ? (
            <>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                Faculty Portal — <span className="gradient-text">{user.name}</span>
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
              <p className="text-slate-500 mt-1 text-sm font-medium">Manage assigned tasks, sub-tasks (COE, MD), and add remarks.</p>
            </>
          ) : (
            <form onSubmit={(e) => {
              e.preventDefault();
              setUpdatingProfile(true);
              api.put('/users/profile', { name: profileName }).then((res) => {
                updateUser(res.data.user);
                toast.success('Profile updated successfully!');
                setIsEditingProfile(false);
              }).catch((err) => {
                toast.error(err.response?.data?.error || 'Failed to update profile');
              }).finally(() => {
                setUpdatingProfile(false);
              });
            }} className="flex flex-col sm:flex-row items-end gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 w-full">
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 animate-fade-in-up stagger-1">
        {[
          { label: 'Total Assigned', value: stats.total, color: 'border-slate-200 bg-slate-50/50 text-slate-800', f: 'all' },
          { label: 'Active', value: stats.active, color: 'border-orange-200 bg-orange-50/50 text-orange-800', f: 'active' },
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

      {/* Tasks Table */}
      <div className="glass-card overflow-hidden animate-fade-in-up stagger-2">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">My Assigned Tasks</h3>
              <p className="text-xs text-slate-500 font-medium">Click a row to edit remarks (Student/HOD) and sub-tasks</p>
            </div>
          </div>
          <button onClick={fetchTasks} className="btn-secondary text-xs cursor-pointer">↻ Refresh</button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center bg-slate-50/50">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm font-semibold">No tasks match this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Student</th>
                  <th>Admission No</th>
                  <th>Problem</th>
                  <th>Current Status</th>
                  <th>Submitted</th>
                  <th>File</th>
                  <th>Quick State</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.slice((currentPage - 1) * tasksPerPage, currentPage * tasksPerPage).map((task) => (
                  <React.Fragment key={task.task_id}>
                    <tr
                      onClick={() => handleRowClick(task.task_id)}
                      className="cursor-pointer border-t border-slate-100 hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="font-mono text-brand-700 font-bold">#{task.task_id}</td>
                      <td>
                        <p className="text-slate-800 font-bold text-sm">{task.student_name}</p>
                        <p className="text-slate-500 text-xs font-semibold">{task.student_email}</p>
                      </td>
                      <td className="text-slate-700 font-semibold">{task.admission_no}</td>
                      <td className="max-w-[200px]">
                        <p className="text-slate-600 text-sm truncate font-medium" title={task.problem_desc}>
                          {task.problem_desc}
                        </p>
                      </td>
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
                      <td>
                        {task.current_status !== 'Resolved' ? (
                          <select
                            id={`status-select-${task.task_id}`}
                            value={statusSelections[task.task_id] || ''}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setStatusSelections({ ...statusSelections, [task.task_id]: e.target.value })}
                            className="form-select text-xs min-w-[130px]"
                          >
                            <option value="">Select...</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        ) : (
                          <span className="text-emerald-700 font-bold text-xs">✓ Done</span>
                        )}
                      </td>
                      <td>
                        {task.current_status !== 'Resolved' ? (
                          <button
                            id={`update-btn-${task.task_id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(task.task_id);
                            }}
                            disabled={updatingId === task.task_id || !statusSelections[task.task_id]}
                            className="btn-primary text-xs !px-3 !py-1.5 cursor-pointer shadow-sm"
                          >
                            {updatingId === task.task_id ? '...' : 'Update'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-semibold">—</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Row Expansion details */}
                    {expandedTask === task.task_id && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={9} className="p-6 border-t border-slate-100">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl">
                            {/* Reassignment Context Banner */}
                            {task.previous_faculty_name && (
                              <div className="lg:col-span-2 bg-orange-50 border border-orange-200 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-bold text-orange-800">This task was reassigned to you</h4>
                                    <p className="text-xs text-orange-700 mt-1 font-medium">
                                      Previously handled by <strong>Prof. {task.previous_faculty_name}</strong>
                                      {task.reassignment_reason && <span> — Reason: <em>{task.reassignment_reason}</em></span>}
                                    </p>
                                    <p className="text-[11px] text-orange-600 mt-1.5 font-semibold">All previous remarks and sub-tasks from the prior faculty are preserved below.</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Column 1: Manage Remarks (HOD and Student separately) */}
                            <div className="space-y-4">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Configure Grievance Remarks</h4>
                              
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Remark for Student (Visible to Student)</label>
                                  <textarea
                                    value={remarks[task.task_id]?.student || ''}
                                    onChange={(e) => setRemarks({
                                      ...remarks,
                                      [task.task_id]: { ...remarks[task.task_id], student: e.target.value }
                                    })}
                                    placeholder="Enter status updates or actions for the student to see..."
                                    rows={3}
                                    className="form-input resize-none"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Remark for HOD (Visible to HOD only)</label>
                                  <textarea
                                    value={remarks[task.task_id]?.hod || ''}
                                    onChange={(e) => setRemarks({
                                      ...remarks,
                                      [task.task_id]: { ...remarks[task.task_id], hod: e.target.value }
                                    })}
                                    placeholder="Enter internal updates, deans recommendation, or status reports for HOD..."
                                    rows={3}
                                    className="form-input resize-none"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Upload Resolution/Evidence Document</label>
                                  <input
                                    type="file"
                                    onChange={(e) => setFacultyFiles({ ...facultyFiles, [task.task_id]: e.target.files[0] })}
                                    className="block w-full text-xs text-slate-500
                                      file:mr-3 file:py-1.5 file:px-3 file:rounded-lg
                                      file:border-0 file:text-xs file:font-semibold
                                      file:bg-brand-50 file:text-brand-700
                                      hover:file:bg-brand-100 cursor-pointer"
                                  />
                                  {task.faculty_file_url && (
                                    <div className="mt-2 text-xs font-medium">
                                      <span className="text-slate-500">Current file: </span>
                                      <a href={api.defaults.baseURL + task.faculty_file_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                                        View Attachment ↗
                                      </a>
                                    </div>
                                  )}
                                </div>

                                <button
                                  onClick={() => handleSaveRemarks(task.task_id)}
                                  disabled={savingRemarks[task.task_id]}
                                  className="btn-primary w-full text-xs cursor-pointer shadow-sm"
                                >
                                  {savingRemarks[task.task_id] ? 'Saving...' : 'Save Remarks'}
                                </button>
                              </div>
                            </div>

                            {/* Column 2: Manage Sub-Tasks (COE, MD, College Work) */}
                            <div className="space-y-4">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Internal Action Items (Sub-Tasks)</h4>
                              
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                {/* Sub-task submission form */}
                                <form onSubmit={(e) => handleAddSubtask(e, task.task_id)} className="flex gap-2">
                                  <select
                                    value={subtaskType}
                                    onChange={(e) => setSubtaskType(e.target.value)}
                                    className="form-select text-xs max-w-[140px]"
                                  >
                                    <option value="General">General</option>
                                    <option value="Mail to COE">Mail to COE</option>
                                    <option value="Mail to Dean">Mail to MD Aharada Edu</option>
                                    <option value="College Work">College Work</option>
                                  </select>
                                  
                                  <input
                                    type="text"
                                    placeholder="e.g. Email COE for duplicate marksheet..."
                                    value={subtaskDesc}
                                    onChange={(e) => setSubtaskDesc(e.target.value)}
                                    className="form-input !py-1 text-xs"
                                    required
                                  />
                                  
                                  <button
                                    type="submit"
                                    disabled={addingSubtask || !subtaskDesc}
                                    className="btn-primary text-xs !px-3 cursor-pointer"
                                  >
                                    Add
                                  </button>
                                </form>

                                {/* List of Sub-Tasks */}
                                <div className="space-y-2 pt-2 border-t border-slate-100 max-h-[220px] overflow-y-auto">
                                  {subtasks[task.task_id]?.map((st) => (
                                    <div
                                      key={st.sub_task_id}
                                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50/50 transition-all text-xs"
                                    >
                                      <div className="flex items-center gap-3">
                                        <input
                                          type="checkbox"
                                          checked={st.status === 'Done'}
                                          onChange={() => handleToggleSubtask(st.sub_task_id, task.task_id, st.status)}
                                          className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500 cursor-pointer"
                                        />
                                        <span className={`font-semibold ${st.status === 'Done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                          {st.description}
                                        </span>
                                      </div>
                                      
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        st.sub_task_type === 'Mail to COE' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                                        st.sub_task_type === 'Mail to Dean' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                        st.sub_task_type === 'College Work' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-50 text-slate-600'
                                      }`}>
                                        {st.sub_task_type}
                                      </span>
                                    </div>
                                  ))}
                                  {(!subtasks[task.task_id] || subtasks[task.task_id].length === 0) && (
                                    <p className="text-xs text-slate-400 font-semibold text-center py-4">No internal action items added yet.</p>
                                  )}
                                </div>
                              </div>
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
  );
}

// React 19 compatibility
import React from 'react';
