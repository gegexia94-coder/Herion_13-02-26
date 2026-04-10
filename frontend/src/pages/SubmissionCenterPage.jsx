import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubmissionCenter, submitPractice } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  Send, CheckCircle, Lock, AlertCircle, Clock, ArrowRight, XCircle,
  ShieldAlert, AlertTriangle, ChevronRight, FileText, KeyRound,
  Globe, Shield, RefreshCw, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

const SECTION_CONFIG = {
  ready_to_submit: { label: 'Pronte per l\'Invio', icon: Send, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', accent: 'bg-emerald-600' },
  waiting_approval: { label: 'In Attesa di Approvazione', icon: Lock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', accent: 'bg-amber-600' },
  not_ready: { label: 'Non Pronte', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', accent: 'bg-red-600' },
  in_preparation: { label: 'In Preparazione', icon: Clock, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200', accent: 'bg-sky-600' },
  submitted: { label: 'Inviate', icon: ArrowRight, color: 'text-[#0A192F]', bg: 'bg-[#F0FAF8]', border: 'border-[#3B82F6]/30', accent: 'bg-[#0A192F]' },
  completed: { label: 'Completate', icon: CheckCircle, color: 'text-[#3B82F6]', bg: 'bg-[#F0FAF8]', border: 'border-[#3B82F6]/30', accent: 'bg-[#3B82F6]' },
  blocked: { label: 'Bloccate', icon: XCircle, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', accent: 'bg-red-700' },
  escalated: { label: 'Escalation', icon: ShieldAlert, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', accent: 'bg-orange-600' },
  failed_submission: { label: 'Invio Fallito', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', accent: 'bg-red-600' },
  rejected: { label: 'Rifiutate', icon: XCircle, color: 'text-red-800', bg: 'bg-red-50', border: 'border-red-300', accent: 'bg-red-800' },
};

const CHANNEL_LABELS = {
  email: 'Email',
  official_portal: 'Portale Ufficiale',
  preparation_only: 'Solo Preparazione',
  escalation: 'Escalation',
};

const RISK_LABELS = { basic: 'Base', medium: 'Medio', high: 'Alto' };

function SubmissionCard({ entry, onOpen, onSubmit, submitting }) {
  const [expanded, setExpanded] = useState(false);
  const hasBlockers = entry.blockers?.length > 0;
  const hasWarnings = entry.warnings?.length > 0;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl hover:shadow-md hover:border-[#CBD5E1] transition-all duration-200 overflow-hidden" data-testid={`submission-card-${entry.id}`}>
      {/* Main row */}
      <div className="flex items-center gap-3 p-3.5 cursor-pointer" onClick={() => onOpen(entry.id)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-bold text-[#0F172A] truncate">{entry.practice_type_label}</p>
            {entry.risk_level && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                entry.risk_level === 'high' ? 'bg-red-50 text-red-700' : entry.risk_level === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
              }`}>{RISK_LABELS[entry.risk_level] || entry.risk_level}</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-[#475569]">{entry.client_name}</span>
            <span className="text-[10px] text-[#CBD5E1]">&middot;</span>
            <span className="text-[10px] text-[#475569]">{entry.client_type_label}</span>
            <span className="text-[10px] text-[#CBD5E1]">&middot;</span>
            <span className="text-[10px] text-[#475569] flex items-center gap-0.5"><Globe className="w-2.5 h-2.5" />{entry.country}</span>
            {entry.channel && entry.channel !== 'unknown' && (
              <>
                <span className="text-[10px] text-[#CBD5E1]">&middot;</span>
                <span className="text-[10px] text-[#475569] flex items-center gap-0.5"><Send className="w-2.5 h-2.5" />{CHANNEL_LABELS[entry.channel] || entry.channel}</span>
              </>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {entry.delegation_required && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 ${
              entry.delegation_status === 'valid' ? 'bg-emerald-50 text-emerald-700' :
              entry.delegation_status === 'not_required' ? 'bg-[#F1F5F9] text-[#94A3B8]' :
              'bg-violet-50 text-violet-700'
            }`}><KeyRound className="w-2.5 h-2.5" />Delega</span>
          )}
          {entry.approval_status && entry.approval_status !== 'not_required' && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 ${
              entry.approval_status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
              entry.approval_status === 'pending' ? 'bg-amber-50 text-amber-700' :
              'bg-[#F1F5F9] text-[#475569]'
            }`}><Lock className="w-2.5 h-2.5" />Approvazione</span>
          )}
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569] flex items-center gap-0.5">
            <FileText className="w-2.5 h-2.5" />{entry.document_count}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {entry.is_ready && (
            <button
              onClick={(e) => { e.stopPropagation(); onSubmit(entry.id); }}
              disabled={submitting === entry.id}
              className="text-[10px] px-3 py-1.5 bg-[#0A192F] text-white rounded-lg font-medium hover:bg-[#0D3D4A] transition-colors disabled:opacity-50 flex items-center gap-1"
              data-testid={`submit-btn-${entry.id}`}
            >
              {submitting === entry.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Invia
            </button>
          )}
          {(hasBlockers || hasWarnings) && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="text-[10px] p-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors"
              data-testid={`expand-blockers-${entry.id}`}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5 text-[#94A3B8]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />}
            </button>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-[#CBD5E1]" />
        </div>
      </div>

      {/* Expanded blockers/warnings */}
      {expanded && (hasBlockers || hasWarnings) && (
        <div className="border-t border-[#E2E8F0] bg-[#F8F9FA] p-3 space-y-2">
          {hasBlockers && (
            <div>
              <p className="text-[9px] font-semibold text-red-600 uppercase tracking-wider mb-1">Elementi bloccanti</p>
              {entry.blockers.map((b, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px] text-red-700 mb-0.5">
                  <XCircle className="w-2.5 h-2.5 flex-shrink-0" />{b}
                </div>
              ))}
            </div>
          )}
          {hasWarnings && (
            <div>
              <p className="text-[9px] font-semibold text-amber-600 uppercase tracking-wider mb-1">Avvisi</p>
              {entry.warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px] text-amber-700 mb-0.5">
                  <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />{w}
                </div>
              ))}
            </div>
          )}
          {entry.next_action && (
            <div className="flex items-center gap-1.5 mt-1 p-2 bg-white rounded-lg border border-[#E2E8F0]">
              <ArrowRight className="w-3 h-3 text-[#0A192F] flex-shrink-0" />
              <p className="text-[10px] text-[#0F172A] font-medium">{entry.next_action}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SubmissionCenterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await getSubmissionCenter();
      setData(res.data);
    } catch { toast.error('Errore nel caricamento del centro invii'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (practiceId) => {
    setSubmitting(practiceId);
    try {
      const res = await submitPractice(practiceId);
      if (res.data.success) {
        toast.success(res.data.message);
        await loadData();
      } else {
        toast.error(res.data.message || 'Invio non riuscito');
      }
    } catch { toast.error('Errore durante l\'invio'); }
    finally { setSubmitting(null); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A192F]" /></div>;
  if (!data) return null;

  const { sections, counts } = data;

  // Section display order
  const sectionOrder = ['ready_to_submit', 'waiting_approval', 'not_ready', 'in_preparation', 'submitted', 'failed_submission', 'blocked', 'escalated', 'completed', 'rejected'];

  // Tab filters
  const tabs = [
    { key: 'all', label: 'Tutti', count: counts.total },
    { key: 'ready_to_submit', label: 'Pronte', count: counts.ready_to_submit },
    { key: 'waiting_approval', label: 'Approvazione', count: counts.waiting_approval },
    { key: 'action_needed', label: 'Azione Richiesta', count: (counts.not_ready || 0) + (counts.blocked || 0) + (counts.failed_submission || 0) },
    { key: 'done', label: 'Concluse', count: (counts.submitted || 0) + (counts.completed || 0) },
  ];

  const visibleSections = activeTab === 'all' ? sectionOrder :
    activeTab === 'action_needed' ? ['not_ready', 'blocked', 'failed_submission'] :
    activeTab === 'done' ? ['submitted', 'completed'] :
    [activeTab];

  return (
    <div className="space-y-6" data-testid="submission-center">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight mb-1">Centro Invii</h1>
          <p className="text-sm text-[#475569]">Gestione, revisione e invio delle pratiche</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[#475569] hover:bg-[#F8F9FA] transition-colors"
          data-testid="refresh-btn"
        >
          <RefreshCw className="w-3.5 h-3.5" />Aggiorna
        </button>
      </div>

      {/* Summary Strip */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-[#0A192F] text-white shadow-sm'
                : 'bg-white border border-[#E2E8F0] text-[#475569] hover:bg-[#F8F9FA]'
            }`}
            data-testid={`tab-${tab.key}`}
          >
            {tab.label}
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-[#F1F5F9] text-[#475569]'
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: 'Pronte', count: counts.ready_to_submit, color: 'text-emerald-600', Icon: Send },
          { label: 'Approvazione', count: counts.waiting_approval, color: 'text-amber-600', Icon: Lock },
          { label: 'Bloccate', count: (counts.not_ready || 0) + (counts.blocked || 0), color: 'text-red-600', Icon: AlertCircle },
          { label: 'Inviate', count: counts.submitted, color: 'text-[#0A192F]', Icon: ArrowRight },
          { label: 'Completate', count: counts.completed, color: 'text-[#3B82F6]', Icon: CheckCircle },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-[#E2E8F0] p-3 flex items-center gap-2.5">
            <s.Icon className={`w-4 h-4 ${s.color}`} strokeWidth={1.5} />
            <div>
              <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
              <p className="text-[9px] text-[#94A3B8] font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sections */}
      {visibleSections.map(key => {
        const items = sections[key] || [];
        if (items.length === 0) return null;
        const cfg = SECTION_CONFIG[key];
        if (!cfg) return null;
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
                <SubmissionCard
                  key={entry.id}
                  entry={entry}
                  onOpen={(id) => navigate(`/practices/${id}`)}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Empty */}
      {counts.total === 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] text-center py-16">
          <Shield className="w-10 h-10 text-[#CBD5E1] mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="text-base font-semibold text-[#0F172A] mb-1">Nessuna pratica</h3>
          <p className="text-sm text-[#475569]">Crea una pratica per iniziare</p>
        </div>
      )}
    </div>
  );
}
