import { useState, useEffect } from 'react';
import { getAdminStats } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Users, FileText, CheckCircle, AlertTriangle, Clock, TrendingUp,
  RefreshCw, BarChart3, Activity, UserX, UserCheck, Briefcase,
  Shield, Eye, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const WINDOWS = [
  { value: 'today', label: 'Oggi' },
  { value: '7d', label: '7 giorni' },
  { value: '30d', label: '30 giorni' },
  { value: 'all', label: 'Tutto' },
];

export default function AdminStatsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [window, setWindow] = useState('30d');

  const isCreator = user?.is_creator || user?.role === 'creator';

  useEffect(() => {
    if (!isCreator) { navigate('/dashboard'); return; }
    (async () => {
      setLoading(true);
      try {
        const res = await getAdminStats(window);
        setStats(res.data);
      } catch (e) { console.warn('Stats load failed:', e?.message); }
      finally { setLoading(false); }
    })();
  }, [window, isCreator, navigate]);

  if (!isCreator) return null;
  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-5 h-5 animate-spin text-[var(--text-muted)]" /></div>;
  if (!stats) return <div className="text-center py-12 text-[var(--text-muted)]">Impossibile caricare le statistiche</div>;

  const u = stats.users;
  const p = stats.practices;

  return (
    <div className="space-y-5" data-testid="admin-stats-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight" data-testid="stats-title">Statistiche prodotto</h1>
          <p className="text-[12px] text-[var(--text-secondary)] mt-1">Panoramica operativa per l'amministratore</p>
        </div>
        <div className="flex items-center gap-1 bg-white rounded-lg border p-0.5" style={{ borderColor: 'var(--border-soft)' }} data-testid="window-selector">
          {WINDOWS.map(w => (
            <button key={w.value} onClick={() => setWindow(w.value)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${window === w.value ? 'bg-[var(--text-primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              data-testid={`window-${w.value}`}>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TOP KPI ROW ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="kpi-row">
        <KpiCard icon={Users} label="Utenti registrati" value={u.total} sub={`+${u.new_this_month} questo mese`} color="#3B82F6" testId="kpi-users" />
        <KpiCard icon={FileText} label="Pratiche totali" value={p.total} sub={`${p.active} attive`} color="#8B5CF6" testId="kpi-practices" />
        <KpiCard icon={CheckCircle} label="Completate" value={p.completed} sub={`${p.completion_rate}% tasso completamento`} color="#10B981" testId="kpi-completed" />
        <KpiCard icon={Activity} label="Utenti attivi oggi" value={u.active_today} sub={`${u.active_this_week} questa settimana`} color="#0ABFCF" testId="kpi-active" />
      </div>

      {/* ── USER METRICS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="user-metrics">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-blue-500" />
            <h2 className="text-[12px] font-bold text-[var(--text-primary)]">Utenti</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MetricItem label="Registrati totali" value={u.total} />
            <MetricItem label="Nuovi oggi" value={u.new_today} highlight={u.new_today > 0} />
            <MetricItem label="Nuovi questa settimana" value={u.new_this_week} />
            <MetricItem label="Nuovi questo mese" value={u.new_this_month} />
            <MetricItem label="Attivi oggi" value={u.active_today} highlight />
            <MetricItem label="Attivi settimana" value={u.active_this_week} />
            <MetricItem label="Attivi mese" value={u.active_this_month} />
            <MetricItem label="Inattivi (30gg)" value={u.inactive_30d} warn={u.inactive_30d > 0} />
          </div>
        </div>

        {/* User segmentation */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="user-segments">
          <div className="flex items-center gap-2 mb-4">
            <UserX className="w-4 h-4 text-amber-500" />
            <h2 className="text-[12px] font-bold text-[var(--text-primary)]">Segmentazione utenti</h2>
          </div>
          <div className="space-y-3">
            <SegmentBar label="Non hanno mai iniziato una pratica" value={u.segments.never_started} total={u.total} color="#94A3B8" testId="seg-never" />
            <SegmentBar label="Hanno iniziato ma si sono fermati" value={u.segments.started_then_dropped} total={u.total} color="#F59E0B" testId="seg-dropped" />
            <SegmentBar label="Hanno completato, poi inattivi" value={u.segments.used_then_stopped} total={u.total} color="#8B5CF6" testId="seg-stopped" />
          </div>
          <p className="text-[9px] text-[var(--text-muted)] mt-4">Basato sull'attivita degli ultimi 30 giorni</p>
        </div>
      </div>

      {/* ── PRACTICE METRICS ── */}
      <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="practice-metrics">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-4 h-4 text-purple-500" />
          <h2 className="text-[12px] font-bold text-[var(--text-primary)]">Pratiche</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <MetricItem label="Totali" value={p.total} />
          <MetricItem label="Attive" value={p.active} highlight />
          <MetricItem label="Completate" value={p.completed} />
          <MetricItem label="Bloccate" value={p.blocked} warn={p.blocked > 0} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricItem label="Bozze" value={p.draft} />
          <MetricItem label="Attesa ente" value={p.waiting_official} />
          <MetricItem label="Create nel periodo" value={p.created_in_window} />
          <MetricItem label="Tempo medio completamento" value={p.avg_completion_days ? `${p.avg_completion_days}gg` : '—'} />
        </div>

        {/* Status distribution */}
        {Object.keys(p.status_distribution).length > 0 && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-soft)' }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-2">Distribuzione per stato</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(p.status_distribution).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                <span key={status} className="text-[9px] font-medium text-[var(--text-secondary)] bg-[var(--bg-app)] px-2 py-1 rounded" data-testid={`status-dist-${status}`}>
                  {status.replace(/_/g, ' ')} <span className="font-bold text-[var(--text-primary)]">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── ACTIVITY TRENDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TrendChart title="Attivita giornaliera (14 giorni)" data={stats.trends.daily} xKey="date" yKey="actions" color="#0ABFCF" testId="daily-trend" />
        <TrendChart title="Attivita settimanale (8 settimane)" data={stats.trends.weekly} xKey="week" yKey="actions" color="#8B5CF6" testId="weekly-trend" />
      </div>

      {/* ── OPERATIONAL INSIGHTS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top procedures */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="top-procedures">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <h2 className="text-[12px] font-bold text-[var(--text-primary)]">Procedure piu utilizzate</h2>
          </div>
          {stats.operational.top_procedures.length > 0 ? (
            <div className="space-y-2">
              {stats.operational.top_procedures.map((proc, i) => (
                <div key={i} className="flex items-center gap-3" data-testid={`top-proc-${i}`}>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{proc.name}</p>
                    <p className="text-[9px] text-[var(--text-muted)]">{proc.category}</p>
                  </div>
                  <span className="text-[11px] font-bold text-[var(--text-primary)]">{proc.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[var(--text-muted)] text-center py-4">Nessun dato disponibile</p>
          )}
        </div>

        {/* Most blocked */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="most-blocked">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-[12px] font-bold text-[var(--text-primary)]">Procedure piu bloccate</h2>
          </div>
          {stats.operational.most_blocked.length > 0 ? (
            <div className="space-y-2">
              {stats.operational.most_blocked.map((proc, i) => (
                <div key={i} className="flex items-center gap-3" data-testid={`blocked-proc-${i}`}>
                  <span className="text-[10px] font-bold text-red-400 w-4">{i + 1}</span>
                  <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate flex-1">{proc.name}</p>
                  <span className="text-[11px] font-bold text-red-500">{proc.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <Shield className="w-5 h-5 text-emerald-300 mx-auto mb-1" />
              <p className="text-[11px] text-emerald-600 font-medium">Nessuna pratica bloccata</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── SUB-COMPONENTS ───

function KpiCard({ icon: Icon, label, value, sub, color, testId }) {
  return (
    <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid={testId}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}10` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <p className="text-[10px] text-[var(--text-muted)] font-medium">{label}</p>
      </div>
      <p className="text-[22px] font-bold text-[var(--text-primary)] leading-none">{value}</p>
      {sub && <p className="text-[9px] text-[var(--text-muted)] mt-1">{sub}</p>}
    </div>
  );
}

function MetricItem({ label, value, highlight, warn }) {
  return (
    <div className={`p-2.5 rounded-lg ${warn ? 'bg-red-50/40' : highlight ? 'bg-[#0ABFCF]/5' : 'bg-[var(--bg-app)]'}`}>
      <p className="text-[9px] text-[var(--text-muted)] font-medium">{label}</p>
      <p className={`text-[16px] font-bold mt-0.5 ${warn ? 'text-red-500' : highlight ? 'text-[#0ABFCF]' : 'text-[var(--text-primary)]'}`}>{value}</p>
    </div>
  );
}

function SegmentBar({ label, value, total, color, testId }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div data-testid={testId}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-[var(--text-secondary)]">{label}</p>
        <p className="text-[10px] font-bold text-[var(--text-primary)]">{value} <span className="text-[var(--text-muted)] font-normal">({pct}%)</span></p>
      </div>
      <div className="h-1.5 bg-[var(--bg-app)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function TrendChart({ title, data, xKey, yKey, color, testId }) {
  const maxVal = Math.max(...data.map(d => d[yKey]), 1);
  return (
    <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid={testId}>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4" style={{ color }} />
        <h2 className="text-[12px] font-bold text-[var(--text-primary)]">{title}</h2>
      </div>
      <div className="flex items-end gap-1 h-[100px]">
        {data.map((d, i) => {
          const h = maxVal > 0 ? (d[yKey] / maxVal) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end group" data-testid={`trend-bar-${i}`}>
              <span className="text-[7px] font-bold text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity mb-0.5">{d[yKey]}</span>
              <div className="w-full rounded-t transition-all group-hover:opacity-80" style={{ height: `${Math.max(h, 2)}%`, backgroundColor: color, minHeight: '2px' }} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5">
        {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0 || i === data.length - 1).map((d, i) => (
          <span key={i} className="text-[7px] text-[var(--text-muted)]">{d[xKey]}</span>
        ))}
      </div>
    </div>
  );
}
