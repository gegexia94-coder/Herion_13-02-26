import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getFollowUps, getFollowUpsSummary, resolveFollowUp } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle, AlertCircle, CheckCircle, Eye, RefreshCw, ArrowRight, Shield, CircleDot } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const URGENCY_CONFIG = {
  pending: { label: 'In Attesa', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock },
  overdue: { label: 'Scaduto', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: AlertTriangle },
  critical: { label: 'Critico', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: AlertCircle },
  resolved: { label: 'Risolto', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
};

export default function FollowUpPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [resolving, setResolving] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = filter === 'all' ? {} : filter === 'resolved' ? { status: 'resolved' } : { status: 'open' };
      const [itemsRes, summaryRes] = await Promise.all([
        getFollowUps(params),
        getFollowUpsSummary(),
      ]);
      setItems(itemsRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      console.warn('Follow-up fetch failed silently:', err?.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleResolve = async (id) => {
    try {
      setResolving(id);
      await resolveFollowUp(id);
      toast.success('Follow-up risolto');
      fetchData();
    } catch {
      toast.error('Errore nella risoluzione');
    } finally {
      setResolving(null);
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'creator';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6" data-testid="follow-up-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight" data-testid="follow-up-title">Follow-Up in Tempo Reale</h1>
          <p className="text-sm text-[#64748B] mt-1">Tracciamento eventi post-transizione, elementi mancanti e scaduti</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-2" data-testid="follow-up-refresh">
          <RefreshCw className="w-4 h-4" />
          Aggiorna
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="follow-up-summary">
          <SummaryCard label="Aperti" value={summary.total_open} color="text-[#0A192F]" bg="bg-[#0A192F]/5" />
          <SummaryCard label="In Attesa" value={summary.pending} color="text-amber-600" bg="bg-amber-50" />
          <SummaryCard label="Scaduti" value={summary.overdue} color="text-orange-600" bg="bg-orange-50" />
          <SummaryCard label="Critici" value={summary.critical} color="text-red-600" bg="bg-red-50" />
          <SummaryCard label="Risolti" value={summary.resolved} color="text-emerald-600" bg="bg-emerald-50" />
        </div>
      )}

      <div className="flex gap-2" data-testid="follow-up-filters">
        {['open', 'resolved', 'all'].map((f) => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm"
            onClick={() => setFilter(f)}
            className={filter === f ? 'bg-[#0A192F] text-white' : ''}
            data-testid={`filter-${f}`}>
            {f === 'open' ? 'Aperti' : f === 'resolved' ? 'Risolti' : 'Tutti'}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-5 h-5 animate-spin text-[#0A192F]" />
          <span className="ml-2 text-sm text-[#64748B]">Analisi follow-up...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#E2E8F0]" data-testid="follow-up-empty">
          <Shield className="w-10 h-10 text-[#3B82F6] mx-auto mb-3" />
          <p className="text-[#0F172A] font-medium">Nessun follow-up {filter === 'open' ? 'aperto' : filter === 'resolved' ? 'risolto' : ''}</p>
          <p className="text-sm text-[#64748B] mt-1">Tutte le pratiche sono in ordine</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="follow-up-list">
          {items.map((item) => {
            const cfg = URGENCY_CONFIG[item.urgency] || URGENCY_CONFIG.pending;
            const Icon = cfg.icon;
            return (
              <div key={item.id} className={`bg-white rounded-xl border ${cfg.border} p-4 transition-all hover:shadow-md`} data-testid={`follow-up-item-${item.id}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#0F172A] text-sm">{item.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-1">{item.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-[#94A3B8]">
                      <span className="flex items-center gap-1">
                        <CircleDot className="w-3 h-3" />
                        {item.client_name || 'N/A'}
                      </span>
                      <span>{item.practice_label}</span>
                      {item.deadline_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Scadenza: {format(new Date(item.deadline_at), 'dd MMM yyyy HH:mm', { locale: it })}
                        </span>
                      )}
                      {item.resolved_at && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          Risolto: {format(new Date(item.resolved_at), 'dd MMM yyyy HH:mm', { locale: it })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/practices/${item.practice_id}`)}
                      className="text-xs gap-1" data-testid={`follow-up-view-${item.id}`}>
                      <Eye className="w-3.5 h-3.5" />
                      Dettagli
                    </Button>
                    {isAdmin && item.status !== 'resolved' && (
                      <Button variant="outline" size="sm" onClick={() => handleResolve(item.id)}
                        disabled={resolving === item.id}
                        className="text-xs gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        data-testid={`follow-up-resolve-${item.id}`}>
                        {resolving === item.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Risolvi
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, bg }) {
  return (
    <div className={`${bg} rounded-xl p-4 border border-[#E2E8F0]/50`}>
      <p className="text-xs text-[#64748B] font-medium">{label}</p>
      <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
    </div>
  );
}
