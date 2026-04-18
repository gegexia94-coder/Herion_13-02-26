import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/services/api';
import {
  Shield, AlertTriangle, Clock, CheckCircle, TrendingUp, Users,
  FileText, Eye, Activity, Lock, ArrowRight, Zap, XCircle,
  BarChart3, Loader2, RefreshCw, ChevronRight, Inbox
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const PRIORITY_CFG = {
  critical: { color: '#EF4444', bg: 'bg-red-50', border: 'border-red-200', label: 'CRITICO', icon: XCircle },
  high: { color: '#F59E0B', bg: 'bg-amber-50', border: 'border-amber-200', label: 'ALTO', icon: AlertTriangle },
  medium: { color: '#3B82F6', bg: 'bg-blue-50', border: 'border-blue-200', label: 'MEDIO', icon: Eye },
  info: { color: '#6B7280', bg: 'bg-gray-50', border: 'border-gray-200', label: 'INFO', icon: Activity },
};

function InsightCard({ insight }) {
  const cfg = PRIORITY_CFG[insight.priority] || PRIORITY_CFG.info;
  const Icon = cfg.icon;
  return (
    <div className={`${cfg.bg} ${cfg.border} border rounded-xl p-4`} data-testid={`insight-${insight.priority}`}>
      <div className="flex items-start gap-3">
        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: cfg.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ color: cfg.color, background: `${cfg.color}15` }}>{cfg.label}</span>
          </div>
          <p className="text-[13px] font-bold text-[var(--text-primary)] leading-tight">{insight.signal}</p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">{insight.explanation}</p>
          <p className="text-[11px] text-[var(--text-primary)] mt-2 font-medium flex items-center gap-1">
            <Zap className="w-3 h-3" style={{ color: cfg.color }} />
            {insight.action}
          </p>
          {insight.link && (
            <Link to={insight.link} className="inline-flex items-center gap-1 text-[10px] font-semibold mt-2 hover:underline" style={{ color: cfg.color }}>
              Vai <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value, sub, color }) {
  return (
    <div className="p-3 bg-white/5 rounded-xl" data-testid={`metric-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <p className="text-[9px] text-white/50 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color: color || '#fff' }}>{value}</p>
      {sub && <p className="text-[9px] text-white/40 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function CreatorControlRoom() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isCreator = user?.is_creator || user?.role === 'creator';

  useEffect(() => {
    if (!isCreator) { navigate('/dashboard'); return; }
    loadData();
  }, [isCreator, navigate]);

  const loadData = async () => {
    try {
      const res = await api.get('/creator/father');
      setData(res.data);
    } catch (e) { console.error('Father load failed:', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const refresh = () => { setRefreshing(true); loadData(); };

  if (!isCreator) return null;
  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <Loader2 className="w-5 h-5 animate-spin text-[#0A192F]" />
      <span className="text-sm text-[var(--text-muted)]">Father sta analizzando il sistema...</span>
    </div>
  );

  const h = data?.health || {};
  const insights = data?.insights || [];
  const friction = data?.friction_points || [];
  const topUsed = data?.top_used || [];
  const stalled = data?.stalled_practices || [];
  const activity = data?.daily_activity || [];

  const criticalCount = insights.filter(i => i.priority === 'critical').length;
  const highCount = insights.filter(i => i.priority === 'high').length;

  return (
    <div className="space-y-6" data-testid="creator-control-room">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#0A192F] flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#3B82F6]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Control Room</h1>
            <p className="text-[11px] text-[var(--text-muted)]">Father Agent — Intelligenza operativa</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] px-2 py-0.5 bg-[#0A192F]/10 text-[#0A192F] rounded-full font-bold uppercase tracking-wider">Creator</span>
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing} className="rounded-xl gap-1.5 text-[11px] h-8" data-testid="father-refresh">
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />Aggiorna
          </Button>
        </div>
      </div>

      {/* ═══ SYSTEM HEALTH ═══ */}
      <div className="bg-[#0A192F] rounded-2xl p-5 text-white" data-testid="system-health">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-[#3B82F6]" />
          <h3 className="text-[12px] font-bold uppercase tracking-wider">Stato del sistema</h3>
          {criticalCount > 0 && <span className="text-[8px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full ml-auto">{criticalCount} critici</span>}
          {highCount > 0 && criticalCount === 0 && <span className="text-[8px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full ml-auto">{highCount} da risolvere</span>}
          {criticalCount === 0 && highCount === 0 && <span className="text-[8px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full ml-auto">Stabile</span>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <MetricTile label="Utenti" value={h.total_users} />
          <MetricTile label="Pratiche attive" value={h.active} color="#3B82F6" />
          <MetricTile label="Completate" value={h.completed} color="#10B981" />
          <MetricTile label="Bloccate" value={h.blocked} color={h.blocked > 0 ? '#EF4444' : '#6B7280'} />
          <MetricTile label="Attesa documenti" value={h.waiting_docs} color={h.waiting_docs > 0 ? '#F59E0B' : '#6B7280'} />
          <MetricTile label="Ferme 7g+" value={h.stalled_7d} color={h.stalled_7d > 0 ? '#F59E0B' : '#6B7280'} />
        </div>
      </div>

      {/* ═══ FATHER INSIGHTS ═══ */}
      <div data-testid="father-insights">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-[#0A192F]" />
          <h2 className="text-[13px] font-bold text-[var(--text-primary)]">Analisi Father</h2>
          <span className="text-[9px] text-[var(--text-muted)] ml-1">{insights.length} segnali</span>
        </div>
        {insights.length > 0 ? (
          <div className="space-y-2.5">
            {insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
          </div>
        ) : (
          <div className="text-center py-8 bg-emerald-50 rounded-xl border border-emerald-200">
            <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
            <p className="text-[12px] font-semibold text-emerald-700">Nessun segnale critico rilevato</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">Il sistema opera normalmente.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ═══ FRICTION POINTS ═══ */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border-soft)' }} data-testid="friction-points">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-[12px] font-bold text-[var(--text-primary)]">Punti di frizione</h3>
          </div>
          {friction.length > 0 ? (
            <div className="space-y-2">
              {friction.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-[var(--bg-soft)] rounded-lg">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{f.procedure}</p>
                    <p className="text-[9px] text-[var(--text-muted)]">{f.practice_type}</p>
                  </div>
                  <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">{f.stuck_count} bloccate</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[var(--text-muted)] text-center py-4">Nessun punto di frizione rilevato</p>
          )}
        </div>

        {/* ═══ MOST USED ═══ */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border-soft)' }} data-testid="top-procedures">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[#0ABFCF]" />
            <h3 className="text-[12px] font-bold text-[var(--text-primary)]">Procedure piu utilizzate</h3>
          </div>
          {topUsed.length > 0 ? (
            <div className="space-y-2">
              {topUsed.map((t, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-[var(--bg-soft)] rounded-lg">
                  <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{t.procedure}</p>
                  <span className="text-[11px] font-bold text-[#0ABFCF] bg-[#0ABFCF]/10 px-2 py-0.5 rounded-full shrink-0">{t.count} pratiche</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[var(--text-muted)] text-center py-4">Nessun dato disponibile</p>
          )}
        </div>
      </div>

      {/* ═══ STALLED PRACTICES ═══ */}
      {stalled.length > 0 && (
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border-soft)' }} data-testid="stalled-practices">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="text-[12px] font-bold text-[var(--text-primary)]">Pratiche ferme</h3>
            <span className="text-[9px] text-[var(--text-muted)]">Nessun aggiornamento da 7+ giorni</span>
          </div>
          <div className="space-y-1.5">
            {stalled.map((s, i) => (
              <Link key={i} to={`/practices/${s.id}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--hover-soft)] transition-colors group">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{s.client_name || s.id?.slice(0, 8)}</p>
                  <p className="text-[9px] text-[var(--text-muted)]">{s.practice_type_label || s.status}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold text-amber-600">{s.days_idle}g ferma</span>
                  <ArrowRight className="w-3 h-3 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ═══ ACTIVITY SPARKLINE ═══ */}
      {activity.length > 0 && (
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border-soft)' }} data-testid="activity-trend">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-[#0A192F]" />
            <h3 className="text-[12px] font-bold text-[var(--text-primary)]">Attivita ultimi 7 giorni</h3>
          </div>
          <div className="flex items-end gap-1.5 h-16">
            {activity.map((d, i) => {
              const max = Math.max(...activity.map(a => a.count), 1);
              const pct = Math.max((d.count / max) * 100, 4);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-md transition-all" style={{ height: `${pct}%`, background: d.count > 0 ? '#0ABFCF' : '#E2E8F0', minHeight: '3px' }} />
                  <span className="text-[7px] text-[var(--text-muted)]">{d.date}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Security footer */}
      <div className="p-3 bg-[#0A192F]/[0.03] border border-[#0A192F]/10 rounded-xl flex items-start gap-2.5">
        <Lock className="w-3.5 h-3.5 text-[#0A192F] flex-shrink-0 mt-0.5" />
        <p className="text-[9px] text-[var(--text-muted)] leading-relaxed">
          Area riservata al Creator. Nessun utente admin o standard ha accesso. I dati di Father sono generati in tempo reale dal sistema.
        </p>
      </div>
    </div>
  );
}
