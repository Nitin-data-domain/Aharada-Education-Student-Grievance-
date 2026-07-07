import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import StatusBadge from './StatusBadge';

export default function DeanDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'delegation'
  
  const [tasks, setTasks] = useState([]);
  const [hods, setHods] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Reports state
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  
  // Delegation state
  const [selectedAssignee, setSelectedAssignee] = useState({});
  const [delegatingId, setDelegatingId] = useState(null);

  // Expansion & History state
  const [expandedTask, setExpandedTask] = useState(null);
  const [history, setHistory] = useState({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 20;

  // Create Task state
  const [form, setForm] = useState({ problem_desc: '', file: null });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = () => {
    setLoading(true);
    Promise.all([
      api.get('/tasks'),
      api.get('/users?role=HOD'),
      api.get('/users/faculty')
    ]).then(([resTasks, resHods, resFaculty]) => {
      setTasks(resTasks.data.tasks);
      setHods(resHods.data.users);
      setFaculty(resFaculty.data.faculty);
    }).catch(err => {
      console.error(err);
      toast.error('Failed to load Dean data');
    }).finally(() => {
      setLoading(false);
    });
  };

  const handleAssign = async (taskId) => {
    const selection = selectedAssignee[taskId];
    if (!selection) {
      toast.error('Please select an assignee (HOD or Faculty)');
      return;
    }
    setDelegatingId(taskId);
    try {
      if (selection.startsWith('HOD-')) {
        const id = selection.split('-')[1];
        const res = await api.put(`/tasks/${taskId}/assign-hod`, { hod_id: parseInt(id) });
        toast.success(res.data.message);
      } else if (selection.startsWith('FAC-')) {
        const id = selection.split('-')[1];
        const res = await api.put(`/tasks/${taskId}/assign`, { faculty_id: parseInt(id) });
        toast.success(res.data.message);
      }
      loadAllData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delegate task');
    } finally {
      setDelegatingId(null);
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
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('problem_desc', form.problem_desc);
      if (form.file) {
        formData.append('file', form.file);
      }
      await api.post('/tasks', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Task created successfully! You can now delegate it from the Delegation tab.');
      setForm({ problem_desc: '', file: null });
      const fileInput = document.getElementById('dean-file-upload');
      if (fileInput) fileInput.value = '';
      loadAllData();
      setActiveTab('delegation');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadReport = () => {
    const selectedYear = parseInt(reportMonth.split('-')[0]);
    const selectedMonth = parseInt(reportMonth.split('-')[1]) - 1;
    
    const monthTasks = tasks.filter(t => {
      const d = new Date(t.created_at);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });

    if (monthTasks.length === 0) {
      toast.error('No tasks available for the selected month to download.');
      return;
    }

    let csv = 'Task ID,Student Name,Admission No,Program,Status,Date Submitted,Problem Description,Assigned HOD\n';
    monthTasks.forEach(t => {
      csv += `${t.task_id},"${t.student_name}","${t.admission_no}","${t.student_program || ''}","${t.current_status}","${new Date(t.created_at).toLocaleDateString()}","${t.problem_desc.replace(/"/g, '""')}","${t.assigned_hod_name || 'Not Delegated'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `Grievance_Report_${reportMonth}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-fade-in-up">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            MD Aharada Education — <span className="gradient-text">{user.name}</span>
          </h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">Download college reports and delegate grievances to HODs.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === 'reports' ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Monthly Reports
          </button>
          <button
            onClick={() => setActiveTab('delegation')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === 'delegation' ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Delegation
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === 'create' ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            + Create Task
          </button>
        </div>
      </div>

      {activeTab === 'reports' && (
        <div className="glass-card p-6 sm:p-8 animate-fade-in-up">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-800">College Grievance Report</h3>
              <p className="text-sm text-slate-500 font-medium">Select a month to view and download grievance statistics.</p>
            </div>
            <div className="flex gap-3">
              <input 
                type="month" 
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="form-input text-sm font-bold w-48 shadow-sm"
              />
              <button onClick={downloadReport} className="btn-primary text-sm !px-4">
                Download CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(() => {
              const selectedYear = parseInt(reportMonth.split('-')[0]);
              const selectedMonth = parseInt(reportMonth.split('-')[1]) - 1;
              
              const monthTasks = tasks.filter(t => {
                const d = new Date(t.created_at);
                return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
              });

              const total = monthTasks.length;
              const resolved = monthTasks.filter(t => t.current_status === 'Resolved').length;
              const pending = total - resolved;
              const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

              return (
                <>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total College Grievances</p>
                    <p className="text-4xl font-black text-slate-800">{total}</p>
                    <p className="text-sm font-semibold text-slate-500 mt-2">Submitted in {new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                  </div>
                  
                  <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200">
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">College Resolved</p>
                    <p className="text-4xl font-black text-emerald-700">{resolved}</p>
                    <p className="text-sm font-semibold text-emerald-600/80 mt-2">{resolutionRate}% Resolution Rate</p>
                  </div>

                  <div className="bg-orange-50 p-6 rounded-2xl border border-orange-200">
                    <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">College Pending</p>
                    <p className="text-4xl font-black text-orange-700">{pending}</p>
                    <p className="text-sm font-semibold text-orange-600/80 mt-2">Requires immediate attention</p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {activeTab === 'delegation' && (
        <div className="glass-card overflow-hidden animate-fade-in-up">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Delegate Tasks to HODs & Faculty</h3>
              <p className="text-xs text-slate-500 font-medium">Assign overarching tasks to specific department heads or individual faculty members.</p>
            </div>
            <button onClick={loadAllData} className="btn-secondary text-xs cursor-pointer">↻ Refresh</button>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm font-semibold">No submissions available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Student / Program</th>
                    <th>Problem Description</th>
                    <th>Status / Date</th>
                    <th>Delegate To</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.slice((currentPage - 1) * tasksPerPage, currentPage * tasksPerPage).map((task) => (
                    <React.Fragment key={task.task_id}>
                    <tr onClick={() => fetchHistory(task.task_id)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="font-mono text-brand-700 font-bold">#{task.task_id}</td>
                      <td>
                        <p className="text-slate-800 font-bold text-sm">{task.student_name}</p>
                        <p className="text-slate-600 text-xs font-semibold">{task.student_program || '—'}</p>
                      </td>
                      <td className="max-w-[250px]">
                        <p className="text-slate-600 text-sm truncate font-medium" title={task.problem_desc}>{task.problem_desc}</p>
                      </td>
                      <td>
                        <StatusBadge status={task.current_status} />
                        <p className="text-slate-400 text-[10px] mt-1">{formatDate(task.created_at)}</p>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1 mb-2">
                          {task.assigned_hod && (
                            <span className="block text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-200">
                              HOD: {task.assigned_hod_name}
                            </span>
                          )}
                          {task.assigned_to && (
                            <span className="block text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                              Faculty: {task.faculty_name || 'Assigned'}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={selectedAssignee[task.task_id] || ''}
                            onChange={(e) => setSelectedAssignee({ ...selectedAssignee, [task.task_id]: e.target.value })}
                            className="form-select text-xs min-w-[150px]"
                          >
                            <option value="">Select Assignee...</option>
                            <optgroup label="HODs">
                              {hods.filter(h => h.is_active).map((h) => (
                                <option key={`HOD-${h.user_id}`} value={`HOD-${h.user_id}`}>{h.name}</option>
                              ))}
                            </optgroup>
                            <optgroup label="Faculty">
                              {faculty.filter(f => f.is_active).map((f) => (
                                <option key={`FAC-${f.user_id}`} value={`FAC-${f.user_id}`}>{f.name}</option>
                              ))}
                            </optgroup>
                          </select>
                          <button
                            onClick={() => handleAssign(task.task_id)}
                            disabled={delegatingId === task.task_id || !selectedAssignee[task.task_id]}
                            className="btn-primary text-xs !px-3 !py-1.5 cursor-pointer"
                          >
                            {delegatingId === task.task_id ? '...' : 'Assign'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Row */}
                    {expandedTask === task.task_id && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={5} className="p-5 border-t border-slate-100">
                          <div className="space-y-6 max-w-5xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Internal Remark */}
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Faculty Remark (Visible to HOD/MD)</h4>
                                <p className="text-sm font-semibold text-slate-800">
                                  {task.remark_hod || 'No internal remarks provided by faculty yet.'}
                                </p>
                              </div>
                              
                              {/* Student Remark & File */}
                              <div className="space-y-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Faculty Remark (Visible to Student)</h4>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {task.remark_student || 'No remarks provided for the student yet.'}
                                  </p>
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

                            <div>
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Audit Timeline History</h4>
                              {history[task.task_id] ? (
                                <div className="relative pl-4 border-l border-slate-200 space-y-3">
                                  {history[task.task_id].map((h) => (
                                    <div key={h.history_id} className="relative flex flex-col gap-1 text-xs">
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
      )}
      {activeTab === 'create' && (
        <div className="glass-card p-6 sm:p-8 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
              <span className="text-brand-700 font-bold">+</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800">Create Administrative Task</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
            <div>
              <label htmlFor="problem-desc" className="block text-sm font-semibold text-slate-600 mb-2">Task Description</label>
              <textarea
                id="problem-desc"
                value={form.problem_desc}
                onChange={(e) => setForm({ ...form, problem_desc: e.target.value })}
                placeholder="Describe the task to be delegated..."
                rows={4}
                className="form-input resize-none"
                required
              />
            </div>

            <div>
              <label htmlFor="dean-file-upload" className="block text-sm font-semibold text-slate-600 mb-2">
                Attachment (Optional)
              </label>
              <input
                id="dean-file-upload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                onChange={(e) => setForm({ ...form, file: e.target.files[0] })}
                className="form-input text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 file:cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary cursor-pointer shadow-md"
            >
              {submitting ? 'Creating...' : 'Create Task'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
