import { useState, useEffect, useMemo } from 'react';
import { getCatalog } from '@/services/api';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search, Shield, ShieldCheck, ShieldAlert, Users, User, Briefcase,
  Globe, Mail, Monitor, FileText, ChevronDown, ChevronUp, CheckCircle,
  AlertTriangle, ArrowRight, Lock, ClipboardList, Calculator, KeyRound,
  Timer, GitBranch, Activity, MessageCircle, Zap
} from 'lucide-react';
import { toast } from 'sonner';

const RISK_CONFIG = {
  basic: { label: 'Base', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: Shield },
  medium: { label: 'Medio', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: ShieldCheck },
  high: { label: 'Alto', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: ShieldAlert },
};

const SUPPORT_CONFIG = {
  supported: { label: 'Supportato', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  partially_supported: { label: 'Parziale', color: 'text-amber-700', bg: 'bg-amber-50' },
  not_supported: { label: 'Non supportato', color: 'text-red-700', bg: 'bg-red-50' },
  escalation: { label: 'Escalation', color: 'text-orange-700', bg: 'bg-orange-50' },
  future_scope_only: { label: 'Futuro', color: 'text-slate-500', bg: 'bg-slate-50' },
};

const STATUS_CONFIG = {
  active_italy_scope: { label: 'Attivo Italia', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  active_internal: { label: 'Servizio Interno', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
  needs_validation: { label: 'In Validazione', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  future_scope_only: { label: 'Futuro', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' },
  inactive: { label: 'Non Attivo', color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
};

const CHANNEL_CONFIG = {
  email: { label: 'Email', icon: Mail },
  official_portal: { label: 'Portale Ufficiale', icon: Monitor },
  preparation_only: { label: 'Solo Preparazione', icon: FileText },
  escalation: { label: 'Escalation', icon: AlertTriangle },
};

const USER_TYPE_CONFIG = {
  private: { label: 'Privato', icon: User },
  freelancer: { label: 'Libero Professionista', icon: Briefcase },
  company: { label: 'Azienda', icon: Users },
};

const AGENT_CONFIG = {
  intake: { name: 'Intake', icon: ClipboardList, color: 'text-sky-600', bg: 'bg-sky-50' },
  ledger: { name: 'Ledger', icon: Calculator, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  compliance: { name: 'Compliance', icon: ShieldCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
  documents: { name: 'Documents', icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  delegate: { name: 'Delegate', icon: KeyRound, color: 'text-violet-600', bg: 'bg-violet-50' },
  deadline: { name: 'Deadline', icon: Timer, color: 'text-rose-600', bg: 'bg-rose-50' },
  flow: { name: 'Flow', icon: GitBranch, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  routing: { name: 'Routing', icon: ArrowRight, color: 'text-teal-600', bg: 'bg-teal-50' },
  research: { name: 'Research', icon: Search, color: 'text-blue-600', bg: 'bg-blue-50' },
  monitor: { name: 'Monitor', icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50' },
  advisor: { name: 'Advisor', icon: MessageCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
};

const FILTER_TABS = [
  { key: 'all', label: 'Tutti' },
  { key: 'basic', label: 'Base', type: 'risk' },
  { key: 'medium', label: 'Medio', type: 'risk' },
  { key: 'private', label: 'Privato', type: 'user' },
  { key: 'freelancer', label: 'Freelancer', type: 'user' },
  { key: 'company', label: 'Azienda', type: 'user' },
];

export default function CatalogPage() {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      const res = await getCatalog();
      setCatalog(res.data);
    } catch {
      toast.error('Errore nel caricamento del catalogo');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let items = [...catalog];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.practice_id.toLowerCase().includes(q)
      );
    }
    if (activeFilter !== 'all') {
      const tab = FILTER_TABS.find(t => t.key === activeFilter);
      if (tab?.type === 'risk') {
        items = items.filter(c => c.risk_level === activeFilter);
      } else if (tab?.type === 'user') {
        items = items.filter(c => c.user_type?.includes(activeFilter));
      }
    }
    return items;
  }, [catalog, search, activeFilter]);

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F4C5C]" /></div>;

  return (
    <div className="space-y-6" data-testid="catalog-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight mb-1">Catalogo Servizi</h1>
        <p className="text-sm text-[#475569]">Servizi fiscali e amministrativi operativi per l'Italia</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium flex items-center gap-1" data-testid="catalog-scope-badge">
            <Globe className="w-3 h-3" />Ambito operativo attuale: Italia
          </span>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <Input
              placeholder="Cerca servizio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl border-[#E2E8F0] h-10 text-sm"
              data-testid="catalog-search"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeFilter === tab.key
                    ? 'bg-[#0F4C5C] text-white shadow-sm'
                    : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                }`}
                data-testid={`filter-${tab.key}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-xs text-[#94A3B8]">{filtered.length} servizi trovati</p>

      {/* Catalog Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((entry) => {
            const risk = RISK_CONFIG[entry.risk_level] || RISK_CONFIG.basic;
            const support = SUPPORT_CONFIG[entry.support_level] || SUPPORT_CONFIG.supported;
            const channel = CHANNEL_CONFIG[entry.expected_channel] || CHANNEL_CONFIG.email;
            const RiskIcon = risk.icon;
            const ChannelIcon = channel.icon;
            const isOpen = expanded[entry.practice_id];

            return (
              <div
                key={entry.practice_id}
                className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.07)] transition-shadow duration-300 overflow-hidden"
                data-testid={`catalog-entry-${entry.practice_id}`}
              >
                {/* Card Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-[#0F172A] mb-1 leading-snug">{entry.name}</h3>
                      <p className="text-xs text-[#475569] leading-relaxed">{entry.description}</p>
                    </div>
                    <div className={`flex-shrink-0 w-9 h-9 rounded-xl ${risk.bg} flex items-center justify-center`}>
                      <RiskIcon className={`w-4 h-4 ${risk.color}`} strokeWidth={1.5} />
                    </div>
                  </div>

                  {/* Badges Row */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${risk.bg} ${risk.color} ${risk.border}`} data-testid={`risk-${entry.practice_id}`}>
                      Rischio: {risk.label}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${support.bg} ${support.color}`}>
                      {support.label}
                    </span>
                    {entry.operational_status && (() => {
                      const sc = STATUS_CONFIG[entry.operational_status] || STATUS_CONFIG.active_italy_scope;
                      return (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${sc.bg} ${sc.color} ${sc.border}`} data-testid={`status-${entry.practice_id}`}>
                          {sc.label}
                        </span>
                      );
                    })()}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569] flex items-center gap-1">
                      <ChannelIcon className="w-2.5 h-2.5" />{channel.label}
                    </span>
                    {entry.approval_required && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0F4C5C]/5 text-[#0F4C5C] flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />Approvazione
                      </span>
                    )}
                    {entry.delegation_required && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 flex items-center gap-1">
                        <KeyRound className="w-2.5 h-2.5" />Delega
                      </span>
                    )}
                  </div>

                  {/* User Types */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[9px] font-semibold text-[#94A3B8] uppercase tracking-wider">Per:</span>
                    {entry.user_type?.map(ut => {
                      const cfg = USER_TYPE_CONFIG[ut];
                      if (!cfg) return null;
                      const UTIcon = cfg.icon;
                      return (
                        <span key={ut} className="text-[10px] px-2 py-0.5 rounded-full bg-[#F7FAFC] text-[#475569] border border-[#E2E8F0] flex items-center gap-1">
                          <UTIcon className="w-2.5 h-2.5" />{cfg.label}
                        </span>
                      );
                    })}
                    {entry.country_scope && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F7FAFC] text-[#475569] border border-[#E2E8F0] flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" />{entry.country_scope}
                      </span>
                    )}
                  </div>

                  {/* Expand Button */}
                  <button
                    onClick={() => toggleExpand(entry.practice_id)}
                    className="flex items-center gap-1 text-[10px] text-[#0F4C5C] font-medium hover:underline"
                    data-testid={`expand-${entry.practice_id}`}
                  >
                    {isOpen ? 'Meno dettagli' : 'Piu dettagli'}
                    {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {/* Expandable Detail */}
                {isOpen && (
                  <div className="border-t border-[#E2E8F0] bg-[#F7FAFC] p-5 space-y-4">
                    {/* User Explanation */}
                    <div>
                      <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1">Cosa fa Herion</p>
                      <p className="text-xs text-[#0F172A] leading-relaxed">{entry.user_explanation || entry.description}</p>
                      {entry.scope_note && (
                        <p className="text-[10px] text-[#94A3B8] italic mt-1">{entry.scope_note}</p>
                      )}
                    </div>

                    {/* Required Documents */}
                    {entry.required_documents?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1.5">Documenti richiesti</p>
                        <div className="flex flex-wrap gap-1.5">
                          {entry.required_documents.map(doc => (
                            <span key={doc} className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-[#E2E8F0] text-[#0F172A] flex items-center gap-1">
                              <FileText className="w-2.5 h-2.5 text-[#94A3B8]" />{doc.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Agents Involved */}
                    {entry.agents?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1.5">Agenti coinvolti</p>
                        <div className="flex flex-wrap gap-1.5">
                          {entry.agents.map(agentKey => {
                            const ac = AGENT_CONFIG[agentKey];
                            if (!ac) return <span key={agentKey} className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-[#E2E8F0] text-[#475569]">{agentKey}</span>;
                            const AgentIcon = ac.icon;
                            return (
                              <span key={agentKey} className={`text-[10px] px-2 py-0.5 rounded-md ${ac.bg} ${ac.color} flex items-center gap-1 font-medium`}>
                                <AgentIcon className="w-2.5 h-2.5" />Herion {ac.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Blocking & Escalation */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {entry.blocking_conditions?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1.5">Condizioni bloccanti</p>
                          <div className="space-y-1">
                            {entry.blocking_conditions.map((bc, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-[10px] text-red-700">
                                <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />{bc}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {entry.escalation_conditions?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1.5">Condizioni di escalation</p>
                          <div className="space-y-1">
                            {entry.escalation_conditions.map((ec, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-[10px] text-amber-700">
                                <Zap className="w-2.5 h-2.5 flex-shrink-0" />{ec}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Next Step */}
                    {entry.next_step && (
                      <div className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-[#E2E8F0]">
                        <CheckCircle className="w-3.5 h-3.5 text-[#5DD9C1] flex-shrink-0" />
                        <div>
                          <p className="text-[9px] font-semibold text-[#94A3B8] uppercase tracking-wider">Prossimo passo</p>
                          <p className="text-xs text-[#0F172A] font-medium">{entry.next_step}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] text-center py-16 shadow-sm">
          <Search className="w-10 h-10 text-[#CBD5E1] mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="text-base font-semibold text-[#0F172A] mb-1">Nessun servizio trovato</h3>
          <p className="text-sm text-[#475569]">Prova a modificare i filtri o la ricerca</p>
        </div>
      )}
    </div>
  );
}
