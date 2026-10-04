import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

const tones = {
  info: { icon: Info, bar: 'border-l-ink-3', text: 'text-ink-2' },
  ok: { icon: CheckCircle2, bar: 'border-l-ok', text: 'text-ok' },
  warn: { icon: AlertTriangle, bar: 'border-l-warn', text: 'text-warn' },
  err: { icon: XCircle, bar: 'border-l-err', text: 'text-err' },
};

/** Messaggio breve con barra colorata a sinistra: info, ok, warn o err. */
const Callout = ({ tone = 'info', title, children, role, className = '' }) => {
  const { icon: Icon, bar, text } = tones[tone];
  return (
    <div role={role} className={`flex gap-3 rounded-md border border-line border-l-2 ${bar} bg-sunken/60 px-3.5 py-3 ${className}`}>
      <Icon size={16} className={`mt-0.5 shrink-0 ${text}`} aria-hidden="true" />
      <div className="min-w-0 text-sm leading-relaxed">
        {title && <p className={`font-medium ${tone === 'info' ? 'text-ink' : text}`}>{title}</p>}
        {children && <div className={`text-ink-2 ${title ? 'mt-0.5' : ''}`}>{children}</div>}
      </div>
    </div>
  );
};

export default Callout;
