import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDeadlines } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  Clock, AlertCircle, ShieldAlert, Lock, GitBranch, Timer,
  ArrowRight, ChevronRight, AlertTriangle, KeyRound, Activity
} from 'lucide-react';
import { toast } from 'sonner';

const SECTION_CONFIG = {
  pending_approvals: { label: 'Approvazioni in Attesa', icon: Lock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', accent: 'bg-amber-600' },
  blocked: { label: 'Pratiche Bloccate', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', accent: 'bg-red-600' },
  escalated: { label: 'Escalation', icon: ShieldAlert, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', accent: 'bg-orange-600' },
  waiting_delegation: { label: 'In Attesa di Delega', icon: KeyRound, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', accent: 'bg-violet-600' },
  overdue: { label: 'Scadute', icon: Timer, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300', accent: 'bg-red-700' },
  in_progress: { label: 'In Corso', icon: GitBranch, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200', accent: 'bg-sky-600' },
  upcoming_actions: { label: 'Prossime Azioni', icon: ArrowRight, color: 'text-[#0A192F]', bg: 'bg-[#F0FAF8]', border: 'border-[#3B82F6]/30', accent: 'bg-[#0A192F]' },
};

const URGENCY_CONFIG = {
  normal: { label: 'Normale', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  high: { label: 'Alta Priorita', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  critical: { label: 'Critica', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
};

function DeadlineCard({ entry, onOpen }) {
  const risk = entry.risk_level;
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#E2E8F0] hover:shadow-md hover:border-[#CBD5E1] transition-all duration-200 cursor-pointer group"
      onClick={() => onOpen(entry.id)}
      data-testid={`deadline-card-${entry.id}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-[#0F172A] truncate">{entry.practice_type_label || entry.status_label}</p>
        <p className="text-[10px] text-[#475569] truncate">{entry.client_name} &middot; {entry.client_type_label} &middot; {entry.country}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {risk && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
            risk === 'high' ? 'bg-red-50 text-red-700' : risk === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
          }`}>{risk === 'high' ? 'Alto' : risk === 'medium' ? 'Medio' : 'Base'}</span>
        )}
        {entry.overdue_days && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-800 font-bold">{entry.overdue_days}g</span>
        )}
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569]">{entry.status_label}</span>
        <ChevronRight className="w-3.5 h-3.5 text-[#CBD5E1] group-hover:text-[#0A192F] transition-colors" />
      </div>
    </div>
  );
}

export default function DeadlineDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await getDeadlines();
      setData(res.data);
    } catch { toast.error('Errore nel caricamento delle scadenze'); }
    finally { setLoading(false); }
  };

  const openPractice = (id) => navigate(`/practices/${id}`);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A192F]" /></div>;
  if (!data) return null;

  const { sections, counts, urgency } = data;
  const urg = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.normal;

  // Priority order for display
  const sectionOrder = ['overdue', 'blocked', 'escalated', 'pending_approvals', 'waiting_delegation', 'in_progress', 'upcoming_actions'];

  return (
    <div className="space-y-6" data-testid="deadline-dashboard">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight mb-1">Centro Operativo</h1>
          <p className="text-sm text-[#475569]">Scadenze, approvazioni e pratiche che richiedono attenzione</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${urg.bg} ${urg.color} ${urg.border}`} data-testid="urgency-badge">
            <Activity className="w-3.5 h-3.5" />
            Urgenza: {urg.label}
          </div>
          <div className="text-xs text-[#94A3B8] bg-[#F8F9FA] px-3 py-1.5 rounded-full border border-[#E2E8F0]">
            {counts.total_active} pratiche attive
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {sectionOrder.map(key => {
          const cfg = SECTION_CONFIG[key];
          const count = counts[key] || 0;
          const Icon = cfg.icon;
          return (
            <div key={key} className={`rounded-xl border p-3 ${count > 0 ? cfg.bg : 'bg-white'} ${count > 0 ? cfg.border : 'border-[#E2E8F0]'} transition-all`} data-testid={`count-${key}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-3.5 h-3.5 ${count > 0 ? cfg.color : 'text-[#CBD5E1]'}`} strokeWidth={1.5} />
                <span className={`text-[10px] font-medium ${count > 0 ? cfg.color : 'text-[#94A3B8]'}`}>{cfg.label}</span>
              </div>
              <p className={`text-xl font-bold ${count > 0 ? cfg.color : 'text-[#CBD5E1]'}`}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Sections */}
      {sectionOrder.map(key => {
        const items = sections[key] || [];
        if (items.length === 0) return null;
        const cfg = SECTION_CONFIG[key];
        const Icon = cfg.icon;

        return (
          <div key={key} className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_4px_20px_rgba(15,23,42,0.04)] overflow-hidden" data-testid={`section-${key}`}>
            <div className="flex items-center gap-2.5 p-4 border-b border-[#E2E8F0]">
              <div className={`w-1 h-6 rounded-full ${cfg.accent}`} />
              <Icon className={`w-4 h-4 ${cfg.color}`} strokeWidth={1.5} />
              <h2 className="text-sm font-bold text-[#0F172A]">{cfg.label}</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${cfg.bg} ${cfg.color}`}>{items.length}</span>
            </div>
            <div className="p-3 space-y-2">
              {items.map(entry => (
                <DeadlineCard key={entry.id} entry={entry} onOpen={openPractice} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {counts.total_active === 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] text-center py-16">
          <Clock className="w-10 h-10 text-[#CBD5E1] mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="text-base font-semibold text-[#0F172A] mb-1">Nessuna scadenza attiva</h3>
          <p className="text-sm text-[#475569]">Tutte le pratiche sono in ordine</p>
        </div>
      )}
    </div>
  );
}
