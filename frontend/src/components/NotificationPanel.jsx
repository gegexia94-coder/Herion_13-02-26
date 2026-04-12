import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/services/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Bell, CheckCircle, AlertTriangle, Info, ExternalLink, FileText,
  Upload, PenTool, Send, Clock, Eye, X, Bot
} from 'lucide-react';

// Notification type config — visual hierarchy
const TYPE_CONFIG = {
  // User required actions (amber)
  documents_missing: { icon: Upload, color: 'text-amber-600', bg: 'bg-amber-50', source: 'Herion' },
  signature_required: { icon: PenTool, color: 'text-amber-600', bg: 'bg-amber-50', source: 'Herion' },
  approval_required: { icon: Eye, color: 'text-amber-600', bg: 'bg-amber-50', source: 'Herion' },
  receipt_required: { icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50', source: 'Herion' },
  // Urgent / blocked (red)
  practice_blocked: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', source: 'Herion' },
  escalation: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', source: 'Herion' },
  error: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', source: 'Sistema' },
  // Herion updates (blue)
  analysis_complete: { icon: Bot, color: 'text-blue-500', bg: 'bg-blue-50', source: 'Herion' },
  processing: { icon: Bot, color: 'text-blue-500', bg: 'bg-blue-50', source: 'Herion' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50', source: 'Herion' },
  // Official entity (purple)
  official_step_required: { icon: ExternalLink, color: 'text-purple-500', bg: 'bg-purple-50', source: 'Ente' },
  waiting_external: { icon: Clock, color: 'text-purple-500', bg: 'bg-purple-50', source: 'Ente' },
  entity_response: { icon: ExternalLink, color: 'text-purple-500', bg: 'bg-purple-50', source: 'Ente' },
  // Success (green)
  success: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50', source: 'Herion' },
  completed: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50', source: 'Herion' },
  approved: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50', source: 'Herion' },
  // Default
  default: { icon: Info, color: 'text-[var(--text-muted)]', bg: 'bg-[var(--bg-soft)]', source: 'Herion' },
};

function getNotifConfig(notif) {
  const t = notif.type || notif.notification_type || '';
  // Try exact match
  if (TYPE_CONFIG[t]) return TYPE_CONFIG[t];
  // Fuzzy match
  if (t.includes('missing') || t.includes('document')) return TYPE_CONFIG.documents_missing;
  if (t.includes('signature') || t.includes('firma')) return TYPE_CONFIG.signature_required;
  if (t.includes('blocked') || t.includes('block')) return TYPE_CONFIG.practice_blocked;
  if (t.includes('approv')) return TYPE_CONFIG.approval_required;
  if (t.includes('success') || t.includes('complet')) return TYPE_CONFIG.success;
  if (t.includes('error') || t.includes('fail')) return TYPE_CONFIG.error;
  if (t.includes('official') || t.includes('entity') || t.includes('ente')) return TYPE_CONFIG.official_step_required;
  return TYPE_CONFIG.default;
}

export function NotificationBell({ unreadCount = 0, onClick }) {
  return (
    <button onClick={onClick} className="relative p-1.5 rounded-lg hover:bg-[var(--hover-soft)] transition-colors" data-testid="notification-bell">
      <Bell className="w-[18px] h-[18px] text-[var(--text-secondary)]" strokeWidth={1.8} />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center" data-testid="notification-badge">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}


export function NotificationPanel({ open, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotifications();
      setNotifications(res.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (open) fetchNotifications(); }, [open, fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* silent */ }
  };

  if (!open) return null;

  const unread = notifications.filter(n => !n.read);
  const read = notifications.filter(n => n.read);

  return (
    <div className="fixed inset-0 z-[60]" data-testid="notification-panel">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-4 top-4 md:right-8 md:top-16 w-[360px] max-h-[480px] bg-white rounded-xl border shadow-xl flex flex-col" style={{ borderColor: 'var(--border-soft)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-soft)' }}>
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <p className="text-[12px] font-bold text-[var(--text-primary)]">Notifiche</p>
            {unread.length > 0 && <span className="text-[9px] font-bold bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full">{unread.length}</span>}
          </div>
          <div className="flex items-center gap-1">
            {unread.length > 0 && (
              <Button variant="ghost" size="sm" className="text-[9px] h-6 px-2 rounded-lg text-[#0ABFCF]" onClick={handleMarkAllRead} data-testid="mark-all-read-btn">
                Segna tutte lette
              </Button>
            )}
            <button onClick={onClose} className="p-1 rounded hover:bg-[var(--hover-soft)]"><X className="w-3.5 h-3.5 text-[var(--text-muted)]" /></button>
          </div>
        </div>

        {/* Body */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-6 text-center"><p className="text-[11px] text-[var(--text-muted)]">Caricamento...</p></div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-5 h-5 text-[var(--text-muted)] mx-auto mb-1.5 opacity-30" />
              <p className="text-[11px] font-medium text-[var(--text-primary)]">Nessuna notifica</p>
              <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Le notifiche appariranno qui quando ci sono aggiornamenti</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
              {/* Unread first */}
              {unread.map(n => <NotificationItem key={n.id} notif={n} onMarkRead={handleMarkRead} />)}
              {/* Then read */}
              {read.slice(0, 10).map(n => <NotificationItem key={n.id} notif={n} onMarkRead={handleMarkRead} />)}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}


function NotificationItem({ notif, onMarkRead }) {
  const cfg = getNotifConfig(notif);
  const Icon = cfg.icon;
  const isUnread = !notif.read;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 transition-colors ${isUnread ? 'bg-blue-50/20' : ''} hover:bg-[var(--hover-soft)] cursor-pointer`}
      onClick={() => isUnread && onMarkRead(notif.id)}
      data-testid={`notification-${notif.id}`}
    >
      <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-[11px] font-semibold text-[var(--text-primary)] truncate ${isUnread ? '' : 'opacity-70'}`}>{notif.title}</p>
          {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-[#0ABFCF] flex-shrink-0" />}
        </div>
        <p className={`text-[10px] text-[var(--text-secondary)] mt-0.5 line-clamp-2 ${isUnread ? '' : 'opacity-60'}`}>{notif.message}</p>
        <div className="flex items-center gap-2 mt-1 text-[8px] text-[var(--text-muted)]">
          <span className={`font-bold ${cfg.color}`}>{cfg.source}</span>
          {notif.created_at && <span>{new Date(notif.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
      </div>
    </div>
  );
}
