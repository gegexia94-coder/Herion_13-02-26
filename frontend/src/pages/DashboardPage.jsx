import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardStats, getReminders, runPracticeWorkflow, approvePractice } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight, Play, CheckCircle, AlertTriangle, RefreshCw, Send, FileText, Zap, ChevronLeft, ChevronRight, Calendar, FileCheck, Megaphone, Globe, Clock, Lock, Shield, Bot } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_CFG = {
  draft: { label: 'Non iniziata', color: '#5B6475' },
  waiting_user_documents: { label: 'Attesa documenti', color: '#F59E0B' },
  documents_received: { label: 'Documenti ricevuti', color: '#3B82F6' },
  internal_processing: { label: 'In revisione', color: '#3B82F6' },
  internal_validation_passed: { label: 'Revisione OK', color: '#10B981' },
  internal_validation_failed: { label: 'Problemi', color: '#EF4444' },
  waiting_user_review: { label: 'Verifica richiesta', color: '#F59E0B' },
  waiting_signature: { label: 'Attesa firma', color: '#F59E0B' },
  ready_for_submission: { label: 'Pronta invio', color: '#06B6D4' },
  submitted_manually: { label: 'Inviata', color: '#06B6D4' },
  submitted_via_channel: { label: 'Inviata', color: '#06B6D4' },
  waiting_external_response: { label: 'Attesa ente', color: '#8B5CF6' },
  accepted_by_entity: { label: 'Accettata', color: '#10B981' },
  rejected_by_entity: { label: 'Rifiutata', color: '#EF4444' },
  completed: { label: 'Completata', color: '#10B981' },
  blocked: { label: 'Bloccata', color: '#EF4444' },
  // Legacy
  in_progress: { label: 'Elaborazione', color: '#3B82F6' },
  processing: { label: 'Elaborazione', color: '#3B82F6' },
  waiting_approval: { label: 'Verifica richiesta', color: '#F59E0B' },
  approved: { label: 'Approvata', color: '#10B981' },
  submitted: { label: 'Inviata', color: '#06B6D4' },
  escalated: { label: 'Escalation', color: '#EF4444' },
  failed: { label: 'Fallita', color: '#EF4444' },
  pending: { label: 'In attesa', color: '#F59E0B' },
};

const PRIORITY_CFG = {
  urgent: { label: 'Urgente', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  high: { label: 'Alta', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  normal: { label: 'Normale', bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-400' },
  low: { label: 'Bassa', bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-300' },
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

  const criticalCount = stats?.critical_practices?.length || 0;

  // Smart sections: group by priority
  const urgentPractices = (stats?.recent_practices || []).filter(p => p.priority === 'urgent');
  const waitingPractices = (stats?.recent_practices || []).filter(p =>
    ['waiting_approval', 'waiting_user_review', 'waiting_signature', 'ready_for_submission'].includes(p.status) && p.priority !== 'urgent'
  );
  const stablePractices = (stats?.recent_practices || []).filter(p =>
    p.priority !== 'urgent' && !['waiting_approval', 'waiting_user_review', 'waiting_signature', 'ready_for_submission'].includes(p.status)
  );

  return (
    <div className="space-y-6" data-testid="dashboard-page">

      {/* ── GREETING + GUIDANCE ── */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
          Ciao{user?.first_name ? `, ${user.first_name}` : ''}
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          {criticalCount > 0
            ? `Hai ${criticalCount} ${criticalCount === 1 ? 'pratica che richiede' : 'pratiche che richiedono'} la tua attenzione. Inizia da qui.`
            : 'Tutto sotto controllo. Ecco la tua panoramica.'
          }
        </p>
      </div>

      {/* ── CRITICAL ALERT ── */}
      {criticalCount > 0 && (
        <div className="flex items-center justify-between bg-red-50/70 border border-red-100 rounded-xl px-5 py-3.5" data-testid="critical-alert">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-red-800">
                {criticalCount} {criticalCount === 1 ? 'pratica richiede' : 'pratiche richiedono'} attenzione
              </p>
              <p className="text-[11px] text-red-600/60">Clicca per risolvere la piu urgente</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl text-[11px] font-semibold border-red-200 text-red-700 hover:bg-red-100 h-9 px-5" data-testid="resolve-critical-btn"
            onClick={() => { const first = stats?.critical_practices?.[0]; if (first) navigate(`/practices/${first.id}`); }}>
            Risolvi ora
          </Button>
        </div>
      )}

      {/* ── QUICK ACTIONS ── */}
      <div className="flex items-center gap-2.5" data-testid="quick-actions">
        <Button onClick={() => navigate('/practices/new')} className="bg-[#0ABFCF] hover:bg-[#09a8b6] text-white rounded-xl text-[12px] font-semibold gap-2 h-10 px-5" data-testid="create-practice-btn">
          <Plus className="w-3.5 h-3.5" /> Nuova Pratica
        </Button>
        <Button variant="outline" onClick={() => navigate('/email-center')} className="rounded-xl text-[12px] font-semibold gap-2 h-10 px-5 text-[var(--text-secondary)]" style={{ borderColor: 'var(--border-soft)' }} data-testid="quick-email-btn">
          <Send className="w-3.5 h-3.5" /> Comunicazione
        </Button>
      </div>

      {/* ── REMINDER BANNER ── */}
      {reminders.length > 0 && (
        <ReminderBanner reminders={reminders} current={currentReminder} setCurrent={setCurrentReminder} />
      )}

      {/* ── SMART SECTIONS ── */}
      {/* URGENT NOW */}
      {urgentPractices.length > 0 && (
        <PracticeSection
          title="Urgente Ora" icon={<AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
          practices={urgentPractices}
          onRun={handleRun} onApprove={handleApprove} actionLoading={actionLoading}
          headerStyle="border-red-100"
          testId="urgent-section"
        />
      )}

      {/* WAITING APPROVAL */}
      {waitingPractices.length > 0 && (
        <PracticeSection
          title="In Attesa di Approvazione" icon={<Lock className="w-3.5 h-3.5 text-amber-500" />}
          practices={waitingPractices}
          onRun={handleRun} onApprove={handleApprove} actionLoading={actionLoading}
          testId="waiting-section"
        />
      )}

      {/* ALL PRACTICES TABLE */}
      <div className="bg-white rounded-xl border" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="practice-table">
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--border-soft)' }}>
          <h2 className="text-[13px] font-bold text-[var(--text-primary)]">Tutte le Pratiche</h2>
          <Link to="/practices" className="text-[11px] font-semibold flex items-center gap-1 hover:underline" style={{ color: '#5B8DEF' }} data-testid="view-all-practices">
            Vedi tutte <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_70px_100px_90px] sm:grid-cols-[1fr_70px_120px_100px] px-5 py-2 border-b text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]" style={{ borderColor: 'var(--border-soft)' }}>
          <span>Nome</span>
          <span>Priorita</span>
          <span>Stato</span>
          <span className="text-right">Azione</span>
        </div>

        {stablePractices.length > 0 ? (
          <div className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
            {stablePractices.map((p) => (
              <PracticeRow key={p.id} practice={p} onRun={handleRun} onApprove={handleApprove} actionLoading={actionLoading} />
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <FileText className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2 opacity-30" strokeWidth={1.5} />
            <p className="text-[12px] font-medium text-[var(--text-primary)]">Nessuna pratica ancora</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Crea la tua prima pratica per iniziare a gestire documenti, scadenze e adempimenti in un unico posto.</p>
            <Button onClick={() => navigate('/practices/new')} className="mt-4 bg-[#0ABFCF] hover:bg-[#09a8b6] text-white rounded-xl text-[11px] h-9 px-5 font-semibold" data-testid="empty-create-btn">
              <Plus className="w-3.5 h-3.5 mr-1.5" />Crea la prima pratica
            </Button>
          </div>
        )}
      </div>

      {/* ── SECONDARY: Agent Activity + Critical + Activity ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* AGENT ACTIVITY WIDGET */}
        <div className="bg-white rounded-xl border" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="agent-activity-widget">
          <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-soft)' }}>
            <Bot className="w-3.5 h-3.5 text-[#0ABFCF]" />
            <h3 className="text-[12px] font-bold text-[var(--text-primary)]">Attivita Agenti</h3>
            <Link to="/agents" className="ml-auto text-[10px] font-semibold text-[#0ABFCF] hover:underline">Vedi tutto</Link>
          </div>
          {stats?.agent_activity?.length > 0 ? (
            <div className="divide-y max-h-[220px] overflow-y-auto" style={{ borderColor: 'var(--border-soft)' }}>
              {stats.agent_activity.slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-2.5" data-testid={`agent-widget-${i}`}>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    a.status === 'completed' ? 'bg-emerald-50' : a.status === 'running' ? 'bg-blue-50' : 'bg-red-50'
                  }`}>
                    <Bot className={`w-3 h-3 ${
                      a.status === 'completed' ? 'text-emerald-500' : a.status === 'running' ? 'text-blue-500' : 'text-red-500'
                    }`} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-[var(--text-primary)] truncate">{a.branded_name}</p>
                    <p className="text-[9px] text-[var(--text-muted)] truncate">{a.client_name}</p>
                  </div>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                    a.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : a.status === 'running' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                  }`}>{a.status === 'completed' ? 'OK' : a.status === 'running' ? 'Attivo' : 'Err'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center">
              <Bot className="w-5 h-5 text-[var(--text-muted)] mx-auto mb-1.5 opacity-30" strokeWidth={1.5} />
              <p className="text-[11px] font-medium text-[var(--text-primary)]">Nessuna attivita agenti</p>
              <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Gli agenti si attivano quando avvii l'analisi di una pratica</p>
            </div>
          )}
        </div>

        {/* CRITICAL / ATTENTION */}
        {criticalCount > 0 ? (
          <div className="bg-white rounded-xl border" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="critical-block">
            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-soft)' }}>
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              <h3 className="text-[12px] font-bold text-[var(--text-primary)]">Richiede Attenzione</h3>
            </div>
            <div className="divide-y max-h-[220px] overflow-y-auto" style={{ borderColor: 'var(--border-soft)' }}>
              {stats?.critical_practices?.map((p) => (
                <Link key={p.id} to={`/practices/${p.id}`} className="flex items-center justify-between px-5 py-2.5 hover:bg-[var(--hover-soft)] transition-colors" data-testid={`critical-${p.id}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{p.client_name}</p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{p.practice_type_label}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <PriorityBadge priority={p.priority} />
                    <StatusPill status={p.status} small />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
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
                <Clock className="w-5 h-5 text-[var(--text-muted)] mx-auto mb-1.5 opacity-30" strokeWidth={1.5} />
                <p className="text-[11px] font-medium text-[var(--text-primary)]">Nessuna attivita recente</p>
                <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Le attivita appariranno qui quando lavori sulle pratiche</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CFG[priority] || PRIORITY_CFG.normal;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${cfg.bg} ${cfg.text}`} data-testid={`priority-badge-${priority}`}>
      <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
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


function PracticeRow({ practice: p, onRun, onApprove, actionLoading }) {
  return (
    <div className="grid grid-cols-[1fr_70px_100px_90px] sm:grid-cols-[1fr_70px_120px_100px] items-center px-5 py-3 hover:bg-[var(--hover-soft)] transition-colors" data-testid={`practice-row-${p.id}`}>
      <Link to={`/practices/${p.id}`} className="min-w-0">
        <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{p.client_name || 'N/A'}</p>
        <p className="text-[10px] text-[var(--text-muted)] truncate">{p.practice_type_label}</p>
      </Link>
      <PriorityBadge priority={p.priority} />
      <StatusPill status={p.status} />
      <div className="flex justify-end">
        {p.status === 'draft' && (
          <button onClick={() => onRun(p.id)} disabled={!!actionLoading}
            className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-[var(--surface-accent-1)]/20 text-[var(--text-primary)] hover:bg-[var(--surface-accent-1)]/40 transition-colors flex items-center gap-1 disabled:opacity-50"
            data-testid={`run-${p.id}`}>
            {actionLoading === p.id + '-run' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            Apri
          </button>
        )}
        {['waiting_approval', 'waiting_user_review'].includes(p.status) && (
          <button onClick={() => onApprove(p.id)} disabled={!!actionLoading}
            className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors flex items-center gap-1 disabled:opacity-50"
            data-testid={`approve-${p.id}`}>
            {actionLoading === p.id + '-approve' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
            Verifica
          </button>
        )}
      </div>
    </div>
  );
}


function PracticeSection({ title, icon, practices, onRun, onApprove, actionLoading, headerStyle, testId }) {
  return (
    <div className={`bg-white rounded-xl border ${headerStyle || ''}`} style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid={testId}>
      <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: 'var(--border-soft)' }}>
        {icon}
        <h3 className="text-[12px] font-bold text-[var(--text-primary)]">{title}</h3>
        <span className="text-[10px] font-bold text-[var(--text-muted)] ml-auto">{practices.length}</span>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
        {practices.map(p => (
          <div key={p.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-[var(--hover-soft)] transition-colors" data-testid={`section-row-${p.id}`}>
            <Link to={`/practices/${p.id}`} className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{p.client_name}</p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">{p.practice_type_label}</p>
            </Link>
            <div className="flex items-center gap-2 flex-shrink-0">
              <PriorityBadge priority={p.priority} />
              {['waiting_approval', 'waiting_user_review'].includes(p.status) && (
                <button onClick={() => onApprove(p.id)} disabled={!!actionLoading}
                  className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors flex items-center gap-1 disabled:opacity-50"
                  data-testid={`section-approve-${p.id}`}>
                  {actionLoading === p.id + '-approve' ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <CheckCircle className="w-2.5 h-2.5" />}
                  Verifica
                </button>
              )}
              {p.status === 'draft' && (
                <button onClick={() => onRun(p.id)} disabled={!!actionLoading}
                  className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-[var(--surface-accent-1)]/20 text-[var(--text-primary)] hover:bg-[var(--surface-accent-1)]/40 transition-colors flex items-center gap-1 disabled:opacity-50"
                  data-testid={`section-run-${p.id}`}>
                  {actionLoading === p.id + '-run' ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Play className="w-2.5 h-2.5" />}
                  Esegui
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
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
