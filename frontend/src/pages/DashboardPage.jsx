import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getDashboardStats, getNotifications, markAllNotificationsRead, getReminders,
  runPracticeWorkflow, approvePractice,
} from '@/services/api';
import { Button } from '@/components/ui/button';
import {
  FileText, Plus, Clock, CheckCircle, AlertTriangle, ArrowRight, Play,
  ShieldCheck, ChevronLeft, ChevronRight, Calendar, FileCheck, Megaphone, Globe,
  Bell, RefreshCw, Send, Zap, Lock, XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

/* ── Status config ── */
const STATUS_CFG = {
  draft:              { label: 'Bozza',              color: '#64748B', bg: 'bg-slate-50',       border: 'border-slate-200' },
  in_progress:        { label: 'In Elaborazione',    color: '#3B82F6', bg: 'bg-blue-50',        border: 'border-blue-200' },
  processing:         { label: 'In Elaborazione',    color: '#3B82F6', bg: 'bg-blue-50',        border: 'border-blue-200' },
  waiting_approval:   { label: 'Attesa Approvazione', color: '#F59E0B', bg: 'bg-amber-50',      border: 'border-amber-200' },
  approved:           { label: 'Approvata',          color: '#10B981', bg: 'bg-emerald-50',     border: 'border-emerald-200' },
  submitted:          { label: 'Inviata',            color: '#06B6D4', bg: 'bg-cyan-50',        border: 'border-cyan-200' },
  completed:          { label: 'Completata',         color: '#10B981', bg: 'bg-emerald-50',     border: 'border-emerald-200' },
  blocked:            { label: 'Bloccata',           color: '#EF4444', bg: 'bg-red-50',         border: 'border-red-200' },
  escalated:          { label: 'Escalation',         color: '#EF4444', bg: 'bg-red-50',         border: 'border-red-200' },
  failed:             { label: 'Fallita',            color: '#EF4444', bg: 'bg-red-50',         border: 'border-red-200' },
};

const PRIORITY_CFG = {
  urgent: { label: 'Urgente', color: '#EF4444', bg: 'bg-red-50', border: 'border-red-200' },
  high:   { label: 'Alta',    color: '#F59E0B', bg: 'bg-amber-50', border: 'border-amber-200' },
  normal: { label: 'Normale', color: '#64748B', bg: 'bg-slate-50', border: 'border-slate-200' },
  low:    { label: 'Bassa',   color: '#94A3B8', bg: 'bg-gray-50', border: 'border-gray-200' },
};

const RISK_CFG = {
  high:   { label: 'Alto',   color: '#EF4444' },
  medium: { label: 'Medio',  color: '#F59E0B' },
  low:    { label: 'Basso',  color: '#10B981' },
};

const REMINDER_ICONS = { deadlines: Calendar, declarations: FileCheck, vat_reminders: AlertTriangle, document_preparation: FileText, country_notices: Globe, platform_updates: Megaphone };
const REMINDER_COLORS = {
  deadlines: { icon: 'text-red-500', bg: 'bg-red-50' }, declarations: { icon: 'text-amber-500', bg: 'bg-amber-50' },
  vat_reminders: { icon: 'text-red-500', bg: 'bg-red-50' }, document_preparation: { icon: 'text-blue-500', bg: 'bg-blue-50' },
  country_notices: { icon: 'text-violet-500', bg: 'bg-violet-50' }, platform_updates: { icon: 'text-cyan-500', bg: 'bg-cyan-50' },
};


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

  const handleRunWorkflow = async (practiceId) => {
    setActionLoading(practiceId + '-run');
    try {
      await runPracticeWorkflow(practiceId);
      toast.success('Workflow avviato con successo');
      loadData();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Errore nel workflow');
    } finally { setActionLoading(null); }
  };

  const handleApprove = async (practiceId) => {
    setActionLoading(practiceId + '-approve');
    try {
      await approvePractice(practiceId);
      toast.success('Pratica approvata');
      loadData();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Errore nell'approvazione");
    } finally { setActionLoading(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-5 h-5 animate-spin text-[#0A192F]" />
    </div>
  );

  return (
    <div className="space-y-6" data-testid="dashboard-page">

      {/* ══════════════ A. KPI SECTION ══════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="kpi-grid">
        <KpiCard label="Pratiche Attive" value={(stats?.total_practices || 0) - (stats?.completed || 0)} icon={FileText} accent="#3B82F6" testId="stat-active" />
        <KpiCard label="Attesa Approvazione" value={stats?.waiting_approval || 0} icon={Clock} accent="#F59E0B" testId="stat-waiting" highlight={stats?.waiting_approval > 0} />
        <KpiCard label="Completate" value={stats?.completed || 0} icon={CheckCircle} accent="#10B981" testId="stat-completed" />
        <KpiCard label="Urgenti" value={stats?.urgent || 0} icon={AlertTriangle} accent="#EF4444" testId="stat-urgent" highlight={stats?.urgent > 0} />
      </div>

      {/* ══════════════ B. QUICK ACTIONS ══════════════ */}
      <div className="flex flex-wrap gap-2" data-testid="quick-actions">
        <Button onClick={() => navigate('/practices/new')} size="sm" className="bg-[#0A192F] hover:bg-[#112240] text-white rounded-lg text-[12px] font-semibold gap-1.5 h-8 px-4" data-testid="create-practice-btn">
          <Plus className="w-3.5 h-3.5" /> Nuova Pratica
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/email-center')} className="rounded-lg text-[12px] font-semibold gap-1.5 h-8 px-4 border-[#E2E8F0] text-[#475569]" data-testid="quick-email-btn">
          <Send className="w-3.5 h-3.5" /> Comunicazione
        </Button>
      </div>

      {/* ══════════════ SMART REMINDER BANNER ══════════════ */}
      {reminders.length > 0 && <ReminderBanner reminders={reminders} current={currentReminder} setCurrent={setCurrentReminder} />}

      {/* ══════════════ MAIN GRID: Practice Table + Critical + Activity ══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── C. PRACTICE TABLE (2/3) ── */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0]" data-testid="practice-table">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0]">
            <h2 className="text-[13px] font-bold text-[#0A192F] uppercase tracking-wide">Pratiche Recenti</h2>
            <Link to="/practices" className="text-[11px] text-[#3B82F6] font-semibold flex items-center gap-1 hover:underline" data-testid="view-all-practices">
              Vedi tutte <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {stats?.recent_practices?.length > 0 ? (
            <div className="divide-y divide-[#F1F3F5]">
              {stats.recent_practices.map((p) => (
                <PracticeRow key={p.id} practice={p} onRun={handleRunWorkflow} onApprove={handleApprove} actionLoading={actionLoading} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-5">
              <FileText className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-[13px] text-[#475569]">Nessuna pratica</p>
              <Button variant="outline" size="sm" onClick={() => navigate('/practices/new')} className="mt-3 rounded-lg text-[12px]" data-testid="empty-create-btn">
                Crea la prima pratica
              </Button>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Critical + Activity ── */}
        <div className="space-y-4">

          {/* ── D. CRITICAL BLOCK ── */}
          <div className="bg-white rounded-xl border border-[#E2E8F0]" data-testid="critical-block">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0]">
              <h2 className="text-[13px] font-bold text-[#0A192F] uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" /> Richiede Attenzione
              </h2>
            </div>
            {stats?.critical_practices?.length > 0 ? (
              <div className="divide-y divide-[#F1F3F5] max-h-[260px] overflow-y-auto">
                {stats.critical_practices.map((p) => (
                  <Link key={p.id} to={`/practices/${p.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-[#F8F9FA] transition-colors" data-testid={`critical-${p.id}`}>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-[#0A192F] truncate">{p.client_name}</p>
                      <p className="text-[10px] text-[#94A3B8] truncate">{p.practice_type_label}</p>
                    </div>
                    <StatusBadge status={p.status} small />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <ShieldCheck className="w-6 h-6 text-[#CBD5E1] mx-auto mb-1.5" strokeWidth={1.5} />
                <p className="text-[11px] text-[#94A3B8]">Nessuna pratica critica</p>
              </div>
            )}
          </div>

          {/* ── E. ACTIVITY LOG ── */}
          <div className="bg-white rounded-xl border border-[#E2E8F0]" data-testid="activity-log">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0]">
              <h2 className="text-[13px] font-bold text-[#0A192F] uppercase tracking-wide">Attivita Recenti</h2>
            </div>
            {stats?.activity_logs?.length > 0 ? (
              <div className="divide-y divide-[#F1F3F5] max-h-[240px] overflow-y-auto">
                {stats.activity_logs.map((log, i) => (
                  <div key={log.id || i} className="px-5 py-2.5" data-testid={`activity-${i}`}>
                    <p className="text-[11px] font-semibold text-[#0A192F] truncate">
                      {log.action?.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[10px] text-[#94A3B8]">
                      {log.timestamp ? format(new Date(log.timestamp), 'dd MMM HH:mm', { locale: it }) : ''}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <Zap className="w-6 h-6 text-[#CBD5E1] mx-auto mb-1.5" strokeWidth={1.5} />
                <p className="text-[11px] text-[#94A3B8]">Nessuna attivita recente</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════ SUB-COMPONENTS ═══════════════ */

function KpiCard({ label, value, icon: Icon, accent, testId, highlight }) {
  return (
    <div className={`bg-white rounded-xl border p-4 transition-shadow hover:shadow-sm ${highlight ? 'border-amber-200 bg-amber-50/30' : 'border-[#E2E8F0]'}`} data-testid={testId}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#475569]">{label}</span>
        <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: `${accent}12` }}>
          <Icon className="w-3.5 h-3.5" style={{ color: accent }} strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-3xl font-black text-[#0A192F] tracking-tight">{value}</p>
    </div>
  );
}


function StatusBadge({ status, small }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${cfg.bg} ${cfg.border} ${small ? 'text-[9px]' : 'text-[10px]'}`}
      style={{ color: cfg.color }} data-testid={`status-badge-${status}`}>
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CFG[priority] || PRIORITY_CFG.normal;
  if (priority === 'normal' || priority === 'low') return null;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${cfg.bg} ${cfg.border}`}
      style={{ color: cfg.color }} data-testid={`priority-badge-${priority}`}>
      {cfg.label}
    </span>
  );
}


function PracticeRow({ practice: p, onRun, onApprove, actionLoading }) {
  const canRun = ['draft'].includes(p.status);
  const canApprove = p.status === 'waiting_approval';
  const riskCfg = RISK_CFG[p.risk_level];

  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-[#F8F9FA] transition-colors group" data-testid={`practice-row-${p.id}`}>
      {/* Info */}
      <Link to={`/practices/${p.id}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[12px] font-semibold text-[#0A192F] truncate">{p.client_name || 'N/A'}</p>
          <PriorityBadge priority={p.priority} />
        </div>
        <p className="text-[10px] text-[#94A3B8] truncate">{p.practice_type_label}</p>
      </Link>

      {/* Status + Risk */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {riskCfg && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: riskCfg.color, backgroundColor: `${riskCfg.color}12` }} data-testid={`risk-${p.risk_level}`}>
            {riskCfg.label}
          </span>
        )}
        <StatusBadge status={p.status} small />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {canRun && (
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-[10px] font-semibold gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 rounded-md"
            onClick={(e) => { e.preventDefault(); onRun(p.id); }} disabled={!!actionLoading} data-testid={`run-${p.id}`}>
            {actionLoading === p.id + '-run' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            Esegui
          </Button>
        )}
        {canApprove && (
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-[10px] font-semibold gap-1 border-amber-200 text-amber-700 hover:bg-amber-50 rounded-md"
            onClick={(e) => { e.preventDefault(); onApprove(p.id); }} disabled={!!actionLoading} data-testid={`approve-${p.id}`}>
            {actionLoading === p.id + '-approve' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
            Approva
          </Button>
        )}
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
  const colors = REMINDER_COLORS[r.category] || REMINDER_COLORS.platform_updates;

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] px-5 py-4 flex items-center gap-4" data-testid="reminder-banner">
      <button onClick={prev} className="p-1 rounded hover:bg-[#F1F3F5] flex-shrink-0" data-testid="reminder-prev">
        <ChevronLeft className="w-4 h-4 text-[#94A3B8]" />
      </button>
      <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${colors.icon}`} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#475569]">{r.category_label}</span>
          {r.priority === 'urgent' && <span className="text-[8px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded-full font-bold border border-red-200">URGENTE</span>}
        </div>
        <p className="text-[12px] font-semibold text-[#0A192F] truncate">{r.title}</p>
      </div>
      <button onClick={next} className="p-1 rounded hover:bg-[#F1F3F5] flex-shrink-0" data-testid="reminder-next">
        <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
      </button>
      {reminders.length > 1 && (
        <div className="flex gap-1">
          {reminders.map((_, i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === current ? 'bg-[#0A192F]' : 'bg-[#E2E8F0]'}`} />
          ))}
        </div>
      )}
    </div>
  );
}
