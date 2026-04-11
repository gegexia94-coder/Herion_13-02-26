import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardStats, getReminders, runPracticeWorkflow, approvePractice } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight, Play, CheckCircle, AlertTriangle, RefreshCw, Send, FileText, ShieldCheck, Zap, ChevronLeft, ChevronRight, Calendar, FileCheck, Megaphone, Globe, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_CFG = {
  draft: { label: 'Bozza', color: '#5B6475' },
  in_progress: { label: 'In Elaborazione', color: '#3B82F6' },
  processing: { label: 'In Elaborazione', color: '#3B82F6' },
  waiting_approval: { label: 'Approvazione', color: '#F59E0B' },
  approved: { label: 'Approvata', color: '#10B981' },
  submitted: { label: 'Inviata', color: '#06B6D4' },
  completed: { label: 'Completata', color: '#10B981' },
  blocked: { label: 'Bloccata', color: '#EF4444' },
  escalated: { label: 'Escalation', color: '#EF4444' },
  failed: { label: 'Fallita', color: '#EF4444' },
};

const REMINDER_ICONS = { deadlines: Calendar, declarations: FileCheck, vat_reminders: AlertTriangle, document_preparation: FileText, country_notices: Globe, platform_updates: Megaphone };

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentReminder, setCurrentReminder] = useState(0);
  const [actionLoading, setActionLoading] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([getDashboardStats(), getReminders()]);
      setStats(s.data);
      setReminders(r.data);
    } catch (e) { console.warn('Dashboard load failed:', e?.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (reminders.length <= 1) return;
    const t = setInterval(() => setCurrentReminder(c => (c + 1) % reminders.length), 6000);
    return () => clearInterval(t);
  }, [reminders.length]);

  const handleRun = async (id) => {
    setActionLoading(id + '-run');
    try { await runPracticeWorkflow(id); toast.success('Workflow avviato'); loadData(); }
    catch (e) { toast.error(e?.response?.data?.detail || 'Errore'); }
    finally { setActionLoading(null); }
  };

  const handleApprove = async (id) => {
    setActionLoading(id + '-approve');
    try { await approvePractice(id); toast.success('Pratica approvata'); loadData(); }
    catch (e) { toast.error(e?.response?.data?.detail || 'Errore'); }
    finally { setActionLoading(null); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-5 h-5 animate-spin text-[var(--text-muted)]" /></div>;

  const criticalCount = (stats?.critical_practices?.length || 0);
  const waitingCount = stats?.waiting_approval || 0;

  return (
    <div className="space-y-6" data-testid="dashboard-page">

      {/* ── CRITICAL ALERT (only if blocking issues exist) ── */}
      {criticalCount > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-5 py-3.5" data-testid="critical-alert">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-red-800">
                {criticalCount} {criticalCount === 1 ? 'pratica richiede' : 'pratiche richiedono'} attenzione
              </p>
              <p className="text-[11px] text-red-600/70">Pratiche bloccate, in escalation o in attesa di approvazione</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="rounded-lg text-[11px] font-semibold border-red-200 text-red-700 hover:bg-red-100 h-8 px-4" data-testid="resolve-critical-btn"
            onClick={() => { const first = stats?.critical_practices?.[0]; if (first) navigate(`/practices/${first.id}`); }}>
            Risolvi ora
          </Button>
        </div>
      )}

      {/* ── ACTIONS ── */}
      <div className="flex items-center gap-2.5" data-testid="quick-actions">
        <Button onClick={() => navigate('/practices/new')} className="bg-[var(--text-primary)] hover:bg-[#2a3040] text-white rounded-lg text-[12px] font-semibold gap-2 h-9 px-5" data-testid="create-practice-btn">
          <Plus className="w-3.5 h-3.5" /> Nuova Pratica
        </Button>
        <Button variant="outline" onClick={() => navigate('/email-center')} className="rounded-lg text-[12px] font-semibold gap-2 h-9 px-5 text-[var(--text-secondary)]" style={{ borderColor: 'var(--border-soft)' }} data-testid="quick-email-btn">
          <Send className="w-3.5 h-3.5" /> Comunicazione
        </Button>
      </div>

      {/* ── REMINDER BANNER ── */}
      {reminders.length > 0 && (
        <ReminderBanner reminders={reminders} current={currentReminder} setCurrent={setCurrentReminder} />
      )}

      {/* ── PRACTICE TABLE ── */}
      <div className="bg-white rounded-xl border" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="practice-table">
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--border-soft)' }}>
          <h2 className="text-[13px] font-bold text-[var(--text-primary)]">Pratiche Recenti</h2>
          <Link to="/practices" className="text-[11px] text-[var(--surface-accent-1)] font-semibold flex items-center gap-1 hover:underline" style={{ color: '#5B8DEF' }} data-testid="view-all-practices">
            Vedi tutte <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_100px_90px] sm:grid-cols-[1fr_120px_100px] px-5 py-2 border-b text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]" style={{ borderColor: 'var(--border-soft)' }}>
          <span>Nome</span>
          <span>Stato</span>
          <span className="text-right">Azione</span>
        </div>

        {stats?.recent_practices?.length > 0 ? (
          <div className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
            {stats.recent_practices.map((p) => (
              <div key={p.id} className="grid grid-cols-[1fr_100px_90px] sm:grid-cols-[1fr_120px_100px] items-center px-5 py-3 hover:bg-[var(--hover-soft)] transition-colors" data-testid={`practice-row-${p.id}`}>
                <Link to={`/practices/${p.id}`} className="min-w-0">
                  <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{p.client_name || 'N/A'}</p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{p.practice_type_label}</p>
                </Link>
                <StatusPill status={p.status} />
                <div className="flex justify-end">
                  {p.status === 'draft' && (
                    <button onClick={() => handleRun(p.id)} disabled={!!actionLoading}
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-[var(--surface-accent-1)]/20 text-[var(--text-primary)] hover:bg-[var(--surface-accent-1)]/40 transition-colors flex items-center gap-1 disabled:opacity-50"
                      data-testid={`run-${p.id}`}>
                      {actionLoading === p.id + '-run' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      Esegui
                    </button>
                  )}
                  {p.status === 'waiting_approval' && (
                    <button onClick={() => handleApprove(p.id)} disabled={!!actionLoading}
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors flex items-center gap-1 disabled:opacity-50"
                      data-testid={`approve-${p.id}`}>
                      {actionLoading === p.id + '-approve' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                      Approva
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 px-5">
            <FileText className="w-7 h-7 text-[var(--text-muted)] mx-auto mb-2 opacity-40" strokeWidth={1.5} />
            <p className="text-[13px] text-[var(--text-secondary)]">Nessuna pratica</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/practices/new')} className="mt-3 rounded-lg text-[12px]" data-testid="empty-create-btn">
              Crea la prima pratica
            </Button>
          </div>
        )}
      </div>

      {/* ── SECONDARY ROW: Critical + Activity ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Critical practices */}
        {criticalCount > 0 && (
          <div className="bg-white rounded-xl border" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="critical-block">
            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-soft)' }}>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <h3 className="text-[12px] font-bold text-[var(--text-primary)]">Richiede Attenzione</h3>
            </div>
            <div className="divide-y max-h-[220px] overflow-y-auto" style={{ borderColor: 'var(--border-soft)' }}>
              {stats?.critical_practices?.map((p) => (
                <Link key={p.id} to={`/practices/${p.id}`} className="flex items-center justify-between px-5 py-2.5 hover:bg-[var(--hover-soft)] transition-colors" data-testid={`critical-${p.id}`}>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{p.client_name}</p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{p.practice_type_label}</p>
                  </div>
                  <StatusPill status={p.status} small />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Activity log */}
        <div className="bg-white rounded-xl border" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="activity-log">
          <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-soft)' }}>
            <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <h3 className="text-[12px] font-bold text-[var(--text-primary)]">Attivita Recenti</h3>
          </div>
          {stats?.activity_logs?.length > 0 ? (
            <div className="divide-y max-h-[220px] overflow-y-auto" style={{ borderColor: 'var(--border-soft)' }}>
              {stats.activity_logs.map((log, i) => (
                <div key={log.id || i} className="px-5 py-2.5" data-testid={`activity-${i}`}>
                  <p className="text-[11px] font-medium text-[var(--text-primary)] truncate">{log.action?.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{log.timestamp ? format(new Date(log.timestamp), 'dd MMM HH:mm', { locale: it }) : ''}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center">
              <Zap className="w-5 h-5 text-[var(--text-muted)] mx-auto mb-1.5 opacity-40" strokeWidth={1.5} />
              <p className="text-[11px] text-[var(--text-muted)]">Nessuna attivita recente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function StatusPill({ status, small }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
  return (
    <span className={`inline-flex items-center gap-1 ${small ? 'text-[9px]' : 'text-[10px]'} font-semibold`} style={{ color: cfg.color }} data-testid={`status-badge-${status}`}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
      {cfg.label}
    </span>
  );
}


function ReminderBanner({ reminders, current, setCurrent }) {
  const prev = () => setCurrent((current - 1 + reminders.length) % reminders.length);
  const next = () => setCurrent((current + 1) % reminders.length);
  const r = reminders[current];
  if (!r) return null;
  const Icon = REMINDER_ICONS[r.category] || Megaphone;

  return (
    <div className="bg-white rounded-xl border px-5 py-3.5 flex items-center gap-4" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="reminder-banner">
      <button onClick={prev} className="p-1 rounded hover:bg-[var(--hover-soft)] flex-shrink-0" data-testid="reminder-prev">
        <ChevronLeft className="w-3.5 h-3.5 text-[var(--text-muted)]" />
      </button>
      <div className="w-7 h-7 rounded-lg bg-[var(--bg-soft)] flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-[var(--text-secondary)]" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{r.category_label}</p>
        <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{r.title}</p>
      </div>
      <button onClick={next} className="p-1 rounded hover:bg-[var(--hover-soft)] flex-shrink-0" data-testid="reminder-next">
        <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
      </button>
      {reminders.length > 1 && (
        <div className="flex gap-1">
          {reminders.map((_, i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === current ? 'bg-[var(--surface-accent-1)]' : 'bg-[var(--text-muted)]/20'}`} />
          ))}
        </div>
      )}
    </div>
  );
}
