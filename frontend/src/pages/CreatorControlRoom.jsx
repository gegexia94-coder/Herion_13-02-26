import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/services/api';
import {
  Shield, AlertTriangle, Clock, CheckCircle, TrendingUp,
  Activity, Lock, ArrowRight, Zap, XCircle,
  BarChart3, Loader2, RefreshCw, ChevronRight, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const PRIORITY_CFG = {
  critical: { accent: '#DC2626', bg: 'bg-red-50/70', border: 'border-l-red-500', label: 'CRITICO', icon: XCircle },
  high: { accent: '#D97706', bg: 'bg-amber-50/50', border: 'border-l-amber-400', label: 'ALTO', icon: AlertTriangle },
  medium: { accent: '#2563EB', bg: 'bg-blue-50/40', border: 'border-l-blue-400', label: 'MEDIO', icon: Eye },
  info: { accent: '#6B7280', bg: 'bg-white', border: 'border-l-gray-300', label: 'INFO', icon: Activity },
};

function InsightCard({ insight }) {
  const cfg = PRIORITY_CFG[insight.priority] || PRIORITY_CFG.info;
  const Icon = cfg.icon;
  return (
    <div className={`${cfg.bg} border border-[var(--border-soft)] ${cfg.border} border-l-[3px] rounded-lg px-4 py-3 overflow-hidden`} data-testid={`insight-${insight.priority}`}>
      <div className="flex items-start gap-2.5">
        <Icon className="w-3.5 h-3.5 mt-[3px] flex-shrink-0" style={{ color: cfg.accent }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[7px] font-extrabold uppercase tracking-[0.1em] px-1.5 py-[1px] rounded" style={{ color: cfg.accent, background: `${cfg.accent}10` }}>{cfg.label}</span>
          </div>
          <p className="text-[12px] font-bold text-[var(--text-primary)] leading-snug">{insight.signal}</p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">{insight.explanation}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-[var(--text-primary)] font-medium flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" style={{ color: cfg.accent }} />
              {insight.action}
            </p>
            {insight.link && (
              <Link to={insight.link} className="inline-flex items-center gap-0.5 text-[9px] font-bold hover:underline" style={{ color: cfg.accent }}>
                Vai <ChevronRight className="w-2.5 h-2.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value, color }) {
  return (
    <div className="p-3 bg-white/[0.06] rounded-lg border border-white/[0.05]" data-testid={`metric-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <p className="text-[7px] text-white/35 uppercase tracking-[0.15em] font-bold mb-1">{label}</p>
      <p className="text-xl font-extrabold leading-none" style={{ color: color || '#fff' }}>{value}</p>
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
      <span className="text-[12px] text-[var(--text-muted)]">Father sta analizzando il sistema...</span>
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
  const statusLabel = criticalCount > 0 ? `${criticalCount} critici` : highCount > 0 ? `${highCount} da risolvere` : 'Stabile';
  const statusColor = criticalCount > 0 ? 'bg-red-500' : highCount > 0 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-5" data-testid="creator-control-room">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0A192F] flex items-center justify-center flex-shrink-0">
            <Shield className="w-[18px] h-[18px] text-[#60A5FA]" />
          </div>
          <div>
            <h1 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight leading-tight">Control Room</h1>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Father Agent — Intelligenza operativa</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] px-2 py-[3px] bg-[#0A192F] text-white/80 rounded font-bold uppercase tracking-[0.1em]">Founder</span>
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing} className="rounded-lg gap-1.5 text-[10px] h-7 px-3 border-[var(--border-soft)]" data-testid="father-refresh">
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />Aggiorna
          </Button>
        </div>
      </div>

      {/* ── SYSTEM HEALTH ── */}
      <div className="bg-[#0A192F] rounded-xl p-4 sm:p-5" data-testid="system-health">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#60A5FA]" />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">Stato del sistema</h3>
          </div>
          <span className={`text-[7px] font-bold text-white px-2 py-[2px] rounded ${statusColor} ${criticalCount > 0 ? 'animate-pulse-soft' : ''}`}>{statusLabel}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <MetricTile label="Utenti" value={h.total_users} />
          <MetricTile label="Attive" value={h.active} color="#60A5FA" />
          <MetricTile label="Completate" value={h.completed} color="#34D399" />
          <MetricTile label="Bloccate" value={h.blocked} color={h.blocked > 0 ? '#F87171' : '#4B5563'} />
          <MetricTile label="Attesa doc." value={h.waiting_docs} color={h.waiting_docs > 0 ? '#FBBF24' : '#4B5563'} />
          <MetricTile label="Ferme 7g+" value={h.stalled_7d} color={h.stalled_7d > 0 ? '#FBBF24' : '#4B5563'} />
        </div>
      </div>

      {/* ── FATHER INSIGHTS ── */}
      <div data-testid="father-insights">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-3.5 h-3.5 text-[#0A192F]" />
          <h2 className="text-[12px] font-bold text-[var(--text-primary)]">Analisi Father</h2>
          <span className="text-[8px] text-[var(--text-muted)] font-medium">{insights.length} {insights.length === 1 ? 'segnale' : 'segnali'}</span>
        </div>
        {insights.length > 0 ? (
          <div className="space-y-2">
            {insights.map((ins, i) => (
              <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 0.04}s` }}>
                <InsightCard insight={ins} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-emerald-50/50 rounded-lg border border-emerald-200/50">
            <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto mb-1.5" />
            <p className="text-[11px] font-semibold text-emerald-700">Nessun segnale critico</p>
            <p className="text-[9px] text-emerald-600">Il sistema opera normalmente.</p>
          </div>
        )}
      </div>

      {/* ── FRICTION + TOP USED ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)' }} data-testid="friction-points">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <h3 className="text-[11px] font-bold text-[var(--text-primary)]">Punti di frizione</h3>
          </div>
          {friction.length > 0 ? (
            <div className="space-y-1.5">
              {friction.map((f, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-[var(--bg-app)] rounded-lg">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-[var(--text-primary)] truncate">{f.procedure}</p>
                    <p className="text-[8px] text-[var(--text-muted)] font-mono">{f.practice_type}</p>
                  </div>
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded shrink-0 ml-2">{f.stuck_count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-[var(--text-muted)] text-center py-3">Nessun punto di frizione rilevato</p>
          )}
        </div>

        <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)' }} data-testid="top-procedures">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-[#0ABFCF]" />
            <h3 className="text-[11px] font-bold text-[var(--text-primary)]">Procedure piu utilizzate</h3>
          </div>
          {topUsed.length > 0 ? (
            <div className="space-y-1.5">
              {topUsed.map((t, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-[var(--bg-app)] rounded-lg">
                  <p className="text-[10px] font-semibold text-[var(--text-primary)] truncate">{t.procedure}</p>
                  <span className="text-[9px] font-bold text-[#0ABFCF] bg-[#0ABFCF]/10 px-2 py-0.5 rounded shrink-0 ml-2">{t.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-[var(--text-muted)] text-center py-3">Nessun dato</p>
          )}
        </div>
      </div>

      {/* ── STALLED PRACTICES ── */}
      {stalled.length > 0 && (
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)' }} data-testid="stalled-practices">
          <div className="flex items-center gap-2 mb-2.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <h3 className="text-[11px] font-bold text-[var(--text-primary)]">Pratiche ferme</h3>
            <span className="text-[8px] text-[var(--text-muted)] font-medium">7+ giorni senza aggiornamento</span>
          </div>
          <div className="space-y-0.5">
            {stalled.map((s, i) => (
              <Link key={i} to={`/practices/${s.id}`} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-amber-50/40 transition-colors group">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-[var(--text-primary)] truncate">{s.client_name || s.id?.slice(0, 8)}</p>
                  <p className="text-[8px] text-[var(--text-muted)]">{s.practice_type_label || s.status}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] font-bold text-amber-600">{s.days_idle}g</span>
                  <ArrowRight className="w-3 h-3 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── ACTIVITY CHART ── */}
      {activity.length > 0 && (
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)' }} data-testid="activity-trend">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-3.5 h-3.5 text-[#0A192F]" />
            <h3 className="text-[11px] font-bold text-[var(--text-primary)]">Attivita ultimi 7 giorni</h3>
          </div>
          <div className="flex items-end gap-2 h-20">
            {activity.map((d, i) => {
              const max = Math.max(...activity.map(a => a.count), 1);
              const pct = Math.max((d.count / max) * 100, 6);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[7px] font-bold text-[var(--text-muted)]">{d.count > 0 ? d.count : ''}</span>
                  <div className="w-full rounded-md transition-all" style={{ height: `${pct}%`, background: d.count > 0 ? 'linear-gradient(to top, #0ABFCF, #60A5FA)' : '#E2E8F0', minHeight: '4px' }} />
                  <span className="text-[7px] text-[var(--text-muted)] font-medium">{d.date}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div className="py-2 px-3 flex items-center gap-2">
        <Lock className="w-3 h-3 text-[var(--text-muted)]" />
        <p className="text-[8px] text-[var(--text-muted)]">
          Area riservata al Founder. I dati sono generati in tempo reale.
        </p>
      </div>
    </div>
  );
}
