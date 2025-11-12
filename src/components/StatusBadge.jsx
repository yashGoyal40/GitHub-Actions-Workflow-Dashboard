import { getWorkflowRunColor, getDisplayStatus } from '../utils/statusUtils';

export default function StatusBadge({ status, conclusion }) {
  const bg = getWorkflowRunColor(status, conclusion);
  const text = getDisplayStatus(status, conclusion);
  return (
    <span className="px-3 py-1 rounded-full text-xs font-medium shadow-sm ring-1 ring-white/10 whitespace-nowrap" style={{ backgroundColor: bg, color: 'white' }}>
      {text}
    </span>
  );
}
