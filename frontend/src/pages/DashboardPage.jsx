import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardStats, getReminders, runPracticeWorkflow, approvePractice } from '@/services/api';
import { Button } from '@/components/ui/button';
import {
  Plus, ArrowRight, Play, CheckCircle, AlertTriangle, RefreshCw, Send,
  FileText, ChevronLeft, ChevronRight, Calendar, FileCheck, Megaphone,
  Globe, Clock, Lock, Shield, Bot, Compass, MapPin, Eye, BookOpen
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_CFG = {
  draft: { label: 'Non iniziata', color: '#94A3B8', category: 'idle' },
  waiting_user_documents: { label: 'Attesa documenti', color: '#F59E0B', category: 'action' },
  documents_received: { label: 'Documenti ricevuti', color: '#3B82F6', category: 'progress' },
  internal_processing: { label: 'Herion sta lavorando', color: '#3B82F6', category: 'herion' },
  internal_validation_passed: { label: 'Verifica superata', color: '#10B981', category: 'progress' },
  internal_validation_failed: { label: 'Problema rilevato', color: '#EF4444', category: 'action' },
  waiting_user_review: { label: 'Serve la tua verifica', color: '#F59E0B', category: 'action' },
  waiting_approval: { label: 'Serve la tua approvazione', color: '#F59E0B', category: 'action' },
  waiting_signature: { label: 'Attesa firma', color: '#F59E0B', category: 'action' },
  ready_for_submission: { label: 'Pronta per l\'invio', color: '#06B6D4', category: 'action' },
  awaiting_authentication: { label: 'Accesso al portale', color: '#8B5CF6', category: 'action' },
  submission_in_progress: { label: 'Invio in corso', color: '#06B6D4', category: 'herion' },
  submitted_manually: { label: 'Inviata — in monitoraggio', color: '#8B5CF6', category: 'tracking' },
  submitted_via_channel: { label: 'Inviata — in monitoraggio', color: '#8B5CF6', category: 'tracking' },
  waiting_external_response: { label: 'Attesa risposta ente', color: '#8B5CF6', category: 'tracking' },
  accepted_by_entity: { label: 'Accettata dall\'ente', color: '#10B981', category: 'done' },
  rejected_by_entity: { label: 'Rifiutata dall\'ente', color: '#EF4444', category: 'action' },
  completed: { label: 'Completata', color: '#10B981', category: 'done' },
  blocked: { label: 'Bloccata', color: '#EF4444', category: 'action' },
  escalated: { label: 'Richiede attenzione', color: '#EF4444', category: 'action' },
  in_progress: { label: 'In elaborazione', color: '#3B82F6', category: 'herion' },
  processing: { label: 'In elaborazione', color: '#3B82F6', category: 'herion' },
  approved: { label: 'Approvata', color: '#10B981', category: 'progress' },
  submitted: { label: 'Inviata', color: '#06B6D4', category: 'tracking' },
  failed: { label: 'Errore', color: '#EF4444', category: 'action' },
  pending: { label: 'In attesa', color: '#F59E0B', category: 'action' },
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

  const allPractices = stats?.recent_practices || [];
  const criticalPractices = stats?.critical_practices || [];
  const actionNeeded = allPractices.filter(p => (STATUS_CFG[p.status]?.category === 'action') || p.priority === 'urgent');
  const herionWorking = allPractices.filter(p => STATUS_CFG[p.status]?.category === 'herion');
  const tracked = allPractices.filter(p => STATUS_CFG[p.status]?.category === 'tracking');
  const otherActive = allPractices.filter(p => !['action', 'herion', 'tracking', 'done', 'idle'].includes(STATUS_CFG[p.status]?.category) || STATUS_CFG[p.status]?.category === 'progress');
  const totalActive = allPractices.filter(p => STATUS_CFG[p.status]?.category !== 'done').length;
  const totalDone = allPractices.filter(p => STATUS_CFG[p.status]?.category === 'done').length;

  // Greeting logic
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';
  const userName = user?.first_name || user?.name?.split(' ')[0] || '';

  return (
    <div className="space-y-5" data-testid="dashboard-page">

      {/* ═══ WELCOME / ORIENTATION ═══ */}
      <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="welcome-block">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight" data-testid="greeting">
              {greeting}{userName ? `, ${userName}` : ''}
            </h1>
            <p className="text-[12px] text-[var(--text-secondary)] mt-1 max-w-md leading-relaxed">
              {actionNeeded.length > 0
                ? `Hai ${actionNeeded.length} ${actionNeeded.length === 1 ? 'pratica che richiede' : 'pratiche che richiedono'} il tuo intervento. Herion ti indica da dove partire.`
                : tracked.length > 0
                  ? `Herion sta monitorando ${tracked.length} ${tracked.length === 1 ? 'pratica' : 'pratiche'} in attesa di risposta ufficiale. Nessuna azione richiesta da parte tua.`
                  : herionWorking.length > 0
                    ? `Herion sta lavorando su ${herionWorking.length} ${herionWorking.length === 1 ? 'pratica' : 'pratiche'}. Ti avviseremo quando sara il tuo turno.`
                    : 'Tutto in ordine. Nessuna azione urgente in questo momento.'
              }
            </p>
          </div>
          {/* Compact stats */}
          <div className="flex items-center gap-4 flex-shrink-0 ml-6">
            <div className="text-center">
              <p className="text-[18px] font-bold text-[var(--text-primary)]">{totalActive}</p>
              <p className="text-[9px] text-[var(--text-muted)] font-medium">Attive</p>
            </div>
            <div className="w-px h-8 bg-[var(--border-soft)]" />
            <div className="text-center">
              <p className="text-[18px] font-bold text-emerald-500">{totalDone}</p>
              <p className="text-[9px] text-[var(--text-muted)] font-medium">Completate</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ WHAT NEEDS ATTENTION NOW ═══ */}
      {actionNeeded.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="attention-block">
          <div className="flex items-center gap-2 px-5 py-3 bg-amber-50/40 border-b border-amber-100">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-[11px] font-bold text-amber-800">Serve il tuo intervento</p>
            <span className="text-[10px] font-bold text-amber-500 ml-auto">{actionNeeded.length}</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
            {actionNeeded.slice(0, 5).map(p => (
              <ActionRow key={p.id} practice={p} onRun={handleRun} onApprove={handleApprove} actionLoading={actionLoading} />
            ))}
          </div>
          {actionNeeded.length > 5 && (
            <Link to="/practices" className="block px-5 py-2.5 text-center text-[10px] font-semibold text-amber-600 hover:bg-amber-50/30 transition-colors border-t" style={{ borderColor: 'var(--border-soft)' }}>
              Vedi tutte le {actionNeeded.length} pratiche che richiedono attenzione
            </Link>
          )}
        </div>
      )}

      {/* ═══ HERION ACTIVITY ═══ */}
      {(herionWorking.length > 0 || tracked.length > 0) && (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="herion-activity-block">
          <div className="flex items-center gap-2 px-5 py-3 bg-[#0ABFCF]/5 border-b" style={{ borderColor: 'rgba(10,191,207,0.15)' }}>
            <Compass className="w-3.5 h-3.5 text-[#0ABFCF]" />
            <p className="text-[11px] font-bold text-[var(--text-primary)]">Herion sta seguendo</p>
            <span className="text-[10px] font-bold text-[#0ABFCF] ml-auto">{herionWorking.length + tracked.length}</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
            {herionWorking.map(p => (
              <HerionRow key={p.id} practice={p} type="working" />
            ))}
            {tracked.map(p => (
              <HerionRow key={p.id} practice={p} type="tracking" />
            ))}
          </div>
        </div>
      )}

      {/* ═══ QUICK ACTIONS ═══ */}
      <div className="grid grid-cols-3 gap-2.5" data-testid="quick-actions">
        <button onClick={() => navigate('/practices/new')} className="bg-white rounded-xl border p-4 text-left hover:shadow-md transition-all group" style={{ borderColor: 'var(--border-soft)' }} data-testid="create-practice-btn">
          <Plus className="w-4 h-4 text-[#0ABFCF] mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-[11px] font-bold text-[var(--text-primary)]">Nuova pratica</p>
          <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Avvia con la preparazione guidata</p>
        </button>
        <button onClick={() => navigate('/services')} className="bg-white rounded-xl border p-4 text-left hover:shadow-md transition-all group" style={{ borderColor: 'var(--border-soft)' }} data-testid="quick-services-btn">
          <BookOpen className="w-4 h-4 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-[11px] font-bold text-[var(--text-primary)]">Aree operative</p>
          <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Esplora i servizi di Herion</p>
        </button>
        <button onClick={() => navigate('/email-center')} className="bg-white rounded-xl border p-4 text-left hover:shadow-md transition-all group" style={{ borderColor: 'var(--border-soft)' }} data-testid="quick-email-btn">
          <Send className="w-4 h-4 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-[11px] font-bold text-[var(--text-primary)]">Comunicazione</p>
          <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Messaggi e notifiche</p>
        </button>
      </div>

      {/* ═══ REMINDER BANNER ═══ */}
      {reminders.length > 0 && (
        <ReminderBanner reminders={reminders} current={currentReminder} setCurrent={setCurrentReminder} />
      )}

      {/* ═══ ALL PRACTICES ═══ */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="practice-table">
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--border-soft)' }}>
          <h2 className="text-[12px] font-bold text-[var(--text-primary)]">Le tue pratiche</h2>
          <Link to="/practices" className="text-[10px] font-semibold flex items-center gap-1 text-[#0ABFCF] hover:underline" data-testid="view-all-practices">
            Vedi tutte <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {allPractices.length > 0 ? (
          <div className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
            {allPractices.slice(0, 8).map(p => (
              <PracticeRow key={p.id} practice={p} onRun={handleRun} onApprove={handleApprove} actionLoading={actionLoading} />
            ))}
          </div>
        ) : (
          <EmptyState navigate={navigate} />
        )}
      </div>

      {/* ═══ BOTTOM: Agent Activity + Recent Activity ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AgentWidget stats={stats} />
        <ActivityWidget stats={stats} criticalPractices={criticalPractices} navigate={navigate} />
      </div>
    </div>
  );
}


// ─── SUB-COMPONENTS ───

function ActionRow({ practice: p, onRun, onApprove, actionLoading }) {
  const cfg = STATUS_CFG[p.status] || STATUS_CFG.draft;
  const isApproval = ['waiting_approval', 'waiting_user_review'].includes(p.status);
  const isSubmission = p.status === 'ready_for_submission';
  const isDraft = p.status === 'draft';

  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-amber-50/20 transition-colors" data-testid={`action-row-${p.id}`}>
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
      <Link to={`/practices/${p.id}`} className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{p.client_name || 'Pratica'}</p>
        <p className="text-[9px] text-[var(--text-secondary)]">{cfg.label}</p>
      </Link>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <PriorityBadge priority={p.priority} />
        {isApproval && (
          <button onClick={() => onApprove(p.id)} disabled={!!actionLoading}
            className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center gap-1 disabled:opacity-50"
            data-testid={`action-approve-${p.id}`}>
            {actionLoading === p.id + '-approve' ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <CheckCircle className="w-2.5 h-2.5" />}
            Verifica
          </button>
        )}
        {isDraft && (
          <button onClick={() => onRun(p.id)} disabled={!!actionLoading}
            className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-[var(--text-primary)] text-white hover:bg-[#2a3040] transition-colors flex items-center gap-1 disabled:opacity-50"
            data-testid={`action-run-${p.id}`}>
            {actionLoading === p.id + '-run' ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Play className="w-2.5 h-2.5" />}
            Inizia
          </button>
        )}
        {isSubmission && (
          <Link to={`/practices/${p.id}`} className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 transition-colors flex items-center gap-1">
            <ArrowRight className="w-2.5 h-2.5" />Procedi
          </Link>
        )}
        {!isApproval && !isDraft && !isSubmission && (
          <Link to={`/practices/${p.id}`} className="text-[9px] font-semibold px-2.5 py-1 rounded-lg bg-[var(--bg-soft)] text-[var(--text-secondary)] hover:bg-[var(--hover-soft)] transition-colors flex items-center gap-1">
            <Eye className="w-2.5 h-2.5" />Vedi
          </Link>
        )}
      </div>
    </div>
  );
}

function HerionRow({ practice: p, type }) {
  const cfg = STATUS_CFG[p.status] || STATUS_CFG.draft;
  return (
    <Link to={`/practices/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-[#0ABFCF]/5 transition-colors" data-testid={`herion-row-${p.id}`}>
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${type === 'tracking' ? 'bg-purple-50' : 'bg-blue-50'}`}>
        {type === 'tracking' ? <MapPin className="w-3 h-3 text-purple-500" /> : <Bot className="w-3 h-3 text-blue-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{p.client_name || 'Pratica'}</p>
        <p className="text-[9px] text-[var(--text-secondary)]">{cfg.label}</p>
      </div>
      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${type === 'tracking' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
        {type === 'tracking' ? 'Monitoraggio' : 'In lavorazione'}
      </span>
    </Link>
  );
}

function PracticeRow({ practice: p, onRun, onApprove, actionLoading }) {
  const cfg = STATUS_CFG[p.status] || STATUS_CFG.draft;
  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--hover-soft)] transition-colors" data-testid={`practice-row-${p.id}`}>
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
      <Link to={`/practices/${p.id}`} className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{p.client_name || 'N/A'}</p>
        <p className="text-[9px] text-[var(--text-muted)] truncate">{p.practice_type_label}</p>
      </Link>
      <PriorityBadge priority={p.priority} />
      <span className="text-[9px] font-semibold min-w-[80px] text-right" style={{ color: cfg.color }}>{cfg.label}</span>
      <div className="w-[70px] flex justify-end">
        {p.status === 'draft' && (
          <button onClick={() => onRun(p.id)} disabled={!!actionLoading}
            className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-[var(--bg-soft)] text-[var(--text-primary)] hover:bg-[var(--hover-soft)] transition-colors flex items-center gap-1 disabled:opacity-50"
            data-testid={`run-${p.id}`}>
            {actionLoading === p.id + '-run' ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Play className="w-2.5 h-2.5" />}
            Apri
          </button>
        )}
        {['waiting_approval', 'waiting_user_review'].includes(p.status) && (
          <button onClick={() => onApprove(p.id)} disabled={!!actionLoading}
            className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors flex items-center gap-1 disabled:opacity-50"
            data-testid={`approve-${p.id}`}>
            {actionLoading === p.id + '-approve' ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <CheckCircle className="w-2.5 h-2.5" />}
            Verifica
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ navigate }) {
  return (
    <div className="px-5 py-12 text-center">
      <Compass className="w-7 h-7 text-[#0ABFCF] mx-auto mb-3 opacity-40" strokeWidth={1.5} />
      <p className="text-[13px] font-semibold text-[var(--text-primary)]">Il tuo commercialista digitale e pronto</p>
      <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-xs mx-auto leading-relaxed">
        Crea la tua prima pratica per iniziare a gestire adempimenti, documenti e scadenze con Herion al tuo fianco.
      </p>
      <Button onClick={() => navigate('/practices/new')} className="mt-5 bg-[#0ABFCF] hover:bg-[#09a8b6] text-white rounded-xl text-[11px] h-9 px-5 font-semibold" data-testid="empty-create-btn">
        <Plus className="w-3.5 h-3.5 mr-1.5" />Crea la prima pratica
      </Button>
    </div>
  );
}

function AgentWidget({ stats }) {
  return (
    <div className="bg-white rounded-xl border" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="agent-activity-widget">
      <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-soft)' }}>
        <Bot className="w-3.5 h-3.5 text-[#0ABFCF]" />
        <h3 className="text-[11px] font-bold text-[var(--text-primary)]">Attivita di Herion</h3>
        <Link to="/agents" className="ml-auto text-[9px] font-semibold text-[#0ABFCF] hover:underline">Dettagli</Link>
      </div>
      {stats?.agent_activity?.length > 0 ? (
        <div className="divide-y max-h-[200px] overflow-y-auto" style={{ borderColor: 'var(--border-soft)' }}>
          {stats.agent_activity.slice(0, 5).map((a, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-2.5" data-testid={`agent-widget-${i}`}>
              <div className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 ${
                a.status === 'completed' ? 'bg-emerald-50' : a.status === 'running' ? 'bg-blue-50' : 'bg-red-50'
              }`}>
                <Bot className={`w-2.5 h-2.5 ${
                  a.status === 'completed' ? 'text-emerald-500' : a.status === 'running' ? 'text-blue-500' : 'text-red-500'
                }`} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-[var(--text-primary)] truncate">{a.branded_name}</p>
                <p className="text-[8px] text-[var(--text-muted)] truncate">{a.client_name}</p>
              </div>
              <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full ${
                a.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : a.status === 'running' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
              }`}>{a.status === 'completed' ? 'Fatto' : a.status === 'running' ? 'Attivo' : 'Errore'}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 py-8 text-center">
          <Bot className="w-5 h-5 text-[var(--text-muted)] mx-auto mb-1.5 opacity-25" strokeWidth={1.5} />
          <p className="text-[10px] font-medium text-[var(--text-secondary)]">Herion si attivera quando avvii una pratica</p>
        </div>
      )}
    </div>
  );
}

function ActivityWidget({ stats, criticalPractices, navigate }) {
  if (criticalPractices.length > 0) {
    return (
      <div className="bg-white rounded-xl border" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="critical-block">
        <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-soft)' }}>
          <Shield className="w-3.5 h-3.5 text-amber-500" />
          <h3 className="text-[11px] font-bold text-[var(--text-primary)]">Da non dimenticare</h3>
        </div>
        <div className="divide-y max-h-[200px] overflow-y-auto" style={{ borderColor: 'var(--border-soft)' }}>
          {criticalPractices.map(p => (
            <Link key={p.id} to={`/practices/${p.id}`} className="flex items-center justify-between px-5 py-2.5 hover:bg-amber-50/20 transition-colors" data-testid={`critical-${p.id}`}>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-[var(--text-primary)] truncate">{p.client_name}</p>
                <p className="text-[9px] text-[var(--text-muted)] truncate">{p.practice_type_label}</p>
              </div>
              <PriorityBadge priority={p.priority} />
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="activity-log">
      <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-soft)' }}>
        <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        <h3 className="text-[11px] font-bold text-[var(--text-primary)]">Attivita recenti</h3>
      </div>
      {stats?.activity_logs?.length > 0 ? (
        <div className="divide-y max-h-[200px] overflow-y-auto" style={{ borderColor: 'var(--border-soft)' }}>
          {stats.activity_logs.slice(0, 5).map((log, i) => (
            <div key={log.id || i} className="px-5 py-2.5" data-testid={`activity-${i}`}>
              <p className="text-[10px] font-medium text-[var(--text-primary)] truncate">{log.action?.replace(/_/g, ' ')}</p>
              <p className="text-[9px] text-[var(--text-muted)]">{log.timestamp ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: it }) : ''}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 py-8 text-center">
          <Clock className="w-5 h-5 text-[var(--text-muted)] mx-auto mb-1.5 opacity-25" strokeWidth={1.5} />
          <p className="text-[10px] font-medium text-[var(--text-secondary)]">Le attivita appariranno qui quando lavori sulle pratiche</p>
        </div>
      )}
    </div>
  );
}

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CFG[priority] || PRIORITY_CFG.normal;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold ${cfg.bg} ${cfg.text}`} data-testid={`priority-badge-${priority}`}>
      <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
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
    <div className="bg-white rounded-xl border px-5 py-3 flex items-center gap-3" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="reminder-banner">
      <button onClick={prev} className="p-1 rounded hover:bg-[var(--hover-soft)] flex-shrink-0" data-testid="reminder-prev">
        <ChevronLeft className="w-3 h-3 text-[var(--text-muted)]" />
      </button>
      <div className="w-6 h-6 rounded-lg bg-[var(--bg-soft)] flex items-center justify-center flex-shrink-0">
        <Icon className="w-3 h-3 text-[var(--text-secondary)]" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[8px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{r.category_label}</p>
        <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{r.title}</p>
      </div>
      <button onClick={next} className="p-1 rounded hover:bg-[var(--hover-soft)] flex-shrink-0" data-testid="reminder-next">
        <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
      </button>
      {reminders.length > 1 && (
        <div className="flex gap-1">
          {reminders.map((_, i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === current ? 'bg-[#0ABFCF]' : 'bg-[var(--text-muted)]/20'}`} />
          ))}
        </div>
      )}
    </div>
  );
}
