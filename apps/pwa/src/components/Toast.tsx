import { IconCheck } from '@aegis/ui';
import { useApp } from '../store';

export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;

  return (
    <div className="toast" role="status">
      <IconCheck size={17} style={{ color: 'var(--success)' }} />
      <span>{toast}</span>
    </div>
  );
}
