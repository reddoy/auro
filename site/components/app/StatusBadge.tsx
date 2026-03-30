type Status =
  | 'pending'
  | 'accepted'
  | 'paid'
  | 'in_progress'
  | 'completed'
  | 'rejected';

const STYLES: Record<string, { bg: string; color: string }> = {
  pending: { bg: 'rgba(255, 193, 7, 0.2)', color: '#FFC107' },
  accepted: { bg: 'rgba(33, 150, 243, 0.2)', color: '#64B5F6' },
  paid: { bg: 'rgba(76, 175, 80, 0.2)', color: '#81C784' },
  in_progress: { bg: 'rgba(156, 39, 176, 0.2)', color: '#CE93D8' },
  completed: { bg: 'rgba(76, 175, 80, 0.25)', color: '#A5D6A7' },
  rejected: { bg: 'rgba(244, 67, 54, 0.2)', color: '#EF9A9A' },
};

const LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  paid: 'Paid',
  in_progress: 'In progress',
  completed: 'Completed',
  rejected: 'Declined',
};

export default function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const s = STYLES[status] || { bg: 'rgba(255,255,255,0.1)', color: '#C7BFD9' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}
    >
      {label || LABELS[status] || status}
    </span>
  );
}
