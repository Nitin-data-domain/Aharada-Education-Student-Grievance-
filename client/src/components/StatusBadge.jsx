export default function StatusBadge({ status }) {
  const classMap = {
    Submitted: 'status-submitted',
    Assigned: 'status-assigned',
    'In Progress': 'status-in-progress',
    Resolved: 'status-resolved',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${classMap[status] || 'status-submitted'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
