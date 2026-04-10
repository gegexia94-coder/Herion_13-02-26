import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAlerts, patchAlert } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  Bell, AlertTriangle, ShieldAlert, FileText, Lock, CheckCircle,
  XCircle, ChevronRight, Shield, Clock, Eye, EyeOff, Volume2, VolumeX,
  ArrowRight, AlertCircle, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

const SEVERITY_CONFIG = {
  info: { label: 'Info', color: 'text-[#94A3B8]', bg: 'bg-[#F1F5F9]', dot: 'bg-[#94A3B8]', border: 'border-[#E2E8F0]' },
  warning: { label: 'Attenzione', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500', border: 'border-amber-200' },
  high: { label: 'Alto', color: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-500', border: 'border-orange-200' },
  critical: { label: 'Critico', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500', border: 'border-red-200' },
};

const MODULE_ICONS = {
  security: ShieldAlert, governance: Shield, documents: FileText,
  practice: AlertCircle, submission: ArrowRight, delegation: Lock,
  deadline: Clock, vault: Lock, system: Bell, routing: ArrowRight,
  approval: Lock,
};

const STATUS_CONFIG = {
  open: { label: 'Aperta', color: 'text-red-600', bg: 'bg-red-50' },
  acknowledged: { label: 'Presa in carico', color: 'text-amber-600', bg: 'bg-amber-50' },
  resolved: { label: 'Risolta', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  muted: { label: 'Silenziata', color: 'text-[#94A3B8]', bg: 'bg-[#F1F5F9]' },
};

const SECTION_ORDER = ['high_critical', 'new', 'practice', 'security', 'governance', 'resolved'];
const SECTION_LABELS = {
  high_critical: 'Alta Priorita', new: 'Nuove', practice: 'Pratiche',
  security: 'Sicurezza', governance: 'Governance', resolved: 'Risolte',
};
const SECTION_ICONS = {
  high_critical: AlertTriangle, new: Bell, practice: AlertCircle,
  security: ShieldAlert, governance: Shield, resolved: CheckCircle,
};

export default function AlertCenterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await getAlerts();
      setData(res.data);
    } catch { toast.error('Errore nel caricamento delle allerte'); }
    finally { setLoading(false); }
  };

  const handleAction = async (alertId, action) => {
    setActing(alertId);
    try {
      await patchAlert(alertId, action);
      toast.success(action === 'resolve' ? 'Allerta risolta' : 'Allerta aggiornata');
      loadData();
    } catch { toast.error('Errore nell\'aggiornamento'); }
    finally { setActing(null); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F4C5C]" /></div>;
  if (!data) return null;

  const { sections, counts } = data;

  return (
    <div className="space-y-6" data-testid="alert-center">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight mb-1">Centro Allerte</h1>
          <p className="text-sm text-[#475569]">Avvisi operativi, di sicurezza e governance</p>
        </div>
        <div className="flex items-center gap-2">
          {counts.critical > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full text-xs font-medium text-red-700" data-testid="critical-badge">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />{counts.critical} critiche
            </span>
          )}
          {counts.high > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full text-xs font-medium text-orange-700">
              {counts.high} alte
            </span>
          )}
          <span className="text-xs text-[#94A3B8] bg-[#F7FAFC] px-3 py-1.5 rounded-full border border-[#E2E8F0]">
            {counts.open} aperte / {counts.total} totali
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {[{ key: 'all', label: 'Tutte' }, ...SECTION_ORDER.map(k => ({ key: k, label: SECTION_LABELS[k] }))].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filter === tab.key ? 'bg-[#0F4C5C] text-white' : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'}`}
            data-testid={`filter-${tab.key}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sections */}
      {SECTION_ORDER.map(key => {
        if (filter !== 'all' && filter !== key) return null;
        const items = sections[key] || [];
        if (items.length === 0) return null;
        const SectionIcon = SECTION_ICONS[key] || Bell;
        const isResolved = key === 'resolved';

        return (
          <div key={key} className={`bg-white rounded-2xl border ${isResolved ? 'border-[#E2E8F0] opacity-80' : 'border-[#E2E8F0]'} shadow-[0_4px_20px_rgba(15,23,42,0.04)] overflow-hidden`} data-testid={`section-${key}`}>
            <div className="flex items-center gap-2.5 p-4 border-b border-[#E2E8F0]">
              <SectionIcon className={`w-4 h-4 ${key === 'high_critical' ? 'text-red-600' : key === 'security' ? 'text-orange-600' : key === 'resolved' ? 'text-emerald-600' : 'text-[#0F4C5C]'}`} strokeWidth={1.5} />
              <h2 className="text-sm font-bold text-[#0F172A]">{SECTION_LABELS[key]}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#F1F5F9] text-[#475569]">{items.length}</span>
            </div>
            <div className="p-3 space-y-2">
              {items.map(alert => {
                const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
                const st = STATUS_CONFIG[alert.status] || STATUS_CONFIG.open;
                const ModIcon = MODULE_ICONS[alert.module] || Bell;

                return (
                  <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-xl border ${sev.border} hover:shadow-sm transition-all`} data-testid={`alert-${alert.id}`}>
                    <div className={`w-2 h-2 rounded-full ${sev.dot} mt-1.5 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <ModIcon className={`w-3 h-3 ${sev.color}`} />
                        <p className="text-xs font-bold text-[#0F172A]">{alert.title}</p>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${sev.bg} ${sev.color}`}>{sev.label}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${st.bg} ${st.color}`}>{st.label}</span>
                      </div>
                      <p className="text-[10px] text-[#475569] mb-1">{alert.explanation}</p>
                      {alert.next_action && (
                        <div className="flex items-center gap-1 text-[9px] text-[#0F4C5C] font-medium">
                          <ArrowRight className="w-2.5 h-2.5" />{alert.next_action}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[9px] text-[#94A3B8] mr-1">{format(new Date(alert.timestamp), 'dd/MM HH:mm', { locale: it })}</span>
                      {alert.practice_id && (
                        <button onClick={() => navigate(`/practices/${alert.practice_id}`)}
                          className="p-1 rounded hover:bg-[#F1F5F9] transition-colors" title="Apri pratica">
                          <Eye className="w-3 h-3 text-[#94A3B8]" />
                        </button>
                      )}
                      {alert.status === 'open' && (
                        <button onClick={() => handleAction(alert.id, 'acknowledge')} disabled={acting === alert.id}
                          className="p-1 rounded hover:bg-amber-50 transition-colors" title="Prendi in carico" data-testid={`ack-${alert.id}`}>
                          {acting === alert.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3 text-amber-500" />}
                        </button>
                      )}
                      {alert.status !== 'resolved' && (
                        <button onClick={() => handleAction(alert.id, 'resolve')} disabled={acting === alert.id}
                          className="p-1 rounded hover:bg-emerald-50 transition-colors" title="Risolvi" data-testid={`resolve-${alert.id}`}>
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {counts.total === 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] text-center py-16">
          <Bell className="w-10 h-10 text-[#CBD5E1] mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="text-base font-semibold text-[#0F172A] mb-1">Nessuna allerta</h3>
          <p className="text-sm text-[#475569]">Il sistema e operativo senza segnalazioni</p>
        </div>
      )}
    </div>
  );
}
