import { useState, useEffect } from 'react';
import { getGovernanceDashboard, getGovernanceAudit } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Shield, ShieldAlert, Lock, AlertTriangle, CheckCircle, XCircle,
  AlertCircle, Activity, ChevronRight, FileText, Clock, ArrowRight,
  Eye, Ban, Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

const SEVERITY_CONFIG = {
  info: { label: 'Info', color: 'text-[#94A3B8]', bg: 'bg-[#F1F5F9]', dot: 'bg-[#94A3B8]' },
  low: { label: 'Basso', color: 'text-sky-600', bg: 'bg-sky-50', dot: 'bg-sky-500' },
  warning: { label: 'Avviso', color: 'text-yellow-600', bg: 'bg-yellow-50', dot: 'bg-yellow-500' },
  medium: { label: 'Medio', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  high: { label: 'Alto', color: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  critical: { label: 'Critico', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
};

const ACTION_LABELS = {
  governance_check_submit: 'Verifica invio',
  governance_check_approve: 'Verifica approvazione',
  governance_denied_submit: 'Invio negato',
  governance_denied_approve: 'Approvazione negata',
  submission_blocked_by_governance: 'Invio bloccato',
  submission_escalated_by_governance: 'Invio escalato',
  approval_granted: 'Approvazione concessa',
  approval_denied_permission: 'Approvazione negata',
  delegation_requested: 'Delega richiesta',
  delegation_verified: 'Delega verificata',
  delegation_rejected: 'Delega rifiutata',
};

const DECISION_CONFIG = {
  allowed: { label: 'Consentito', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  blocked: { label: 'Bloccato', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  escalation_required: { label: 'Escalation', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
};

export default function GovernanceDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [auditEvents, setAuditEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [dRes, aRes] = await Promise.all([
        getGovernanceDashboard(),
        getGovernanceAudit({ limit: 50 })
      ]);
      setDashboard(dRes.data);
      setAuditEvents(aRes.data.events || []);
    } catch (e) { console.warn('Governance fetch failed:', e?.message); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A192F]" /></div>;
  if (!dashboard) return null;

  const tabs = [
    { key: 'overview', label: 'Panoramica' },
    { key: 'audit', label: 'Registro Audit' },
    { key: 'rules', label: 'Regole' },
    { key: 'permissions', label: 'Permessi' },
  ];

  return (
    <div className="space-y-6" data-testid="governance-dashboard">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight mb-1">Governance</h1>
        <p className="text-sm text-[#475569]">Controllo, regole e tracciabilita della piattaforma</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F1F5F9] p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === tab.key ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#475569] hover:text-[#0F172A]'}`}
            data-testid={`tab-${tab.key}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Decisioni Bloccate', value: dashboard.blocked_decisions, Icon: Ban, color: 'text-red-600' },
              { label: 'Escalation', value: dashboard.escalation_decisions, Icon: AlertTriangle, color: 'text-amber-600' },
              { label: 'Permessi Negati', value: dashboard.denied_permissions, Icon: Lock, color: 'text-orange-600' },
              { label: 'Pratiche Bloccate', value: dashboard.blocked_practices, Icon: XCircle, color: 'text-red-700' },
            ].map(m => (
              <div key={m.label} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-2 mb-2">
                  <m.Icon className={`w-4 h-4 ${m.color}`} strokeWidth={1.5} />
                  <span className="text-[10px] font-medium text-[#475569]">{m.label}</span>
                </div>
                <p className={`text-2xl font-bold ${m.value > 0 ? m.color : 'text-[#CBD5E1]'}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Severity Distribution */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-bold text-[#0F172A] mb-3">Distribuzione per Gravita</h3>
            <div className="flex gap-2">
              {Object.entries(dashboard.severity_counts || {}).map(([sev, count]) => {
                const cfg = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.info;
                return (
                  <div key={sev} className={`flex-1 rounded-xl p-3 ${cfg.bg} border border-transparent`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className={`text-[10px] font-medium ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <p className={`text-lg font-bold ${cfg.color}`}>{count}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Events */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-bold text-[#0F172A] mb-3">Eventi Recenti</h3>
            <ScrollArea className="h-[280px]">
              <div className="space-y-2">
                {(dashboard.recent_events || []).map(ev => {
                  const sev = SEVERITY_CONFIG[ev.severity] || SEVERITY_CONFIG.info;
                  const decision = ev.details?.final_decision;
                  const decCfg = decision ? DECISION_CONFIG[decision] : null;
                  return (
                    <div key={ev.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F8F9FA] transition-colors cursor-pointer"
                      onClick={() => ev.practice_id && navigate(`/practices/${ev.practice_id}`)} data-testid={`audit-event-${ev.id}`}>
                      <div className={`w-2 h-2 rounded-full ${sev.dot} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#0F172A] truncate">{ACTION_LABELS[ev.action] || ev.action}</p>
                        <p className="text-[9px] text-[#94A3B8]">
                          {ev.actor_role} &middot; {ev.practice_id ? `Pratica ${ev.practice_id.slice(0, 8)}` : 'Sistema'}
                          {ev.reason && <> &middot; {ev.reason.slice(0, 60)}</>}
                        </p>
                      </div>
                      {decCfg && (
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${decCfg.bg} ${decCfg.color} flex items-center gap-0.5`}>
                          <decCfg.icon className="w-2.5 h-2.5" />{decCfg.label}
                        </span>
                      )}
                      <span className="text-[9px] text-[#94A3B8] flex-shrink-0">
                        {format(new Date(ev.timestamp), 'dd/MM HH:mm', { locale: it })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Audit Tab */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-[#0A192F]" />
            <h3 className="text-sm font-bold text-[#0F172A]">Registro Audit Completo</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569]">{auditEvents.length} eventi</span>
          </div>
          <ScrollArea className="h-[500px]">
            <div className="space-y-1.5">
              {auditEvents.map(ev => {
                const sev = SEVERITY_CONFIG[ev.severity] || SEVERITY_CONFIG.info;
                return (
                  <div key={ev.id} className="flex items-start gap-3 p-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F8F9FA] transition-colors" data-testid={`full-audit-${ev.id}`}>
                    <div className={`w-2 h-2 rounded-full ${sev.dot} flex-shrink-0 mt-1.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-medium text-[#0F172A]">{ACTION_LABELS[ev.action] || ev.action}</p>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${sev.bg} ${sev.color}`}>{sev.label}</span>
                      </div>
                      <p className="text-[10px] text-[#475569]">
                        <span className="font-medium">{ev.actor_role}</span>
                        {ev.practice_id && <> &middot; <span className="font-mono">{ev.practice_id.slice(0, 8)}</span></>}
                        {ev.target_type && <> &middot; {ev.target_type}</>}
                      </p>
                      {ev.reason && <p className="text-[10px] text-[#94A3B8] mt-0.5">{ev.reason}</p>}
                      {ev.previous_state && ev.new_state && (
                        <p className="text-[9px] text-[#94A3B8] mt-0.5">{ev.previous_state} <ArrowRight className="w-2.5 h-2.5 inline" /> {ev.new_state}</p>
                      )}
                    </div>
                    <span className="text-[9px] text-[#94A3B8] flex-shrink-0">{format(new Date(ev.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: it })}</span>
                  </div>
                );
              })}
              {auditEvents.length === 0 && (
                <div className="text-center py-12">
                  <Shield className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                  <p className="text-sm text-[#475569]">Nessun evento di governance registrato</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <h3 className="text-sm font-bold text-[#0F172A]">Regole Non Negoziabili</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">{dashboard.non_negotiable_rules?.length || 0}</span>
            </div>
            <div className="space-y-2">
              {(dashboard.non_negotiable_rules || []).map(rule => {
                const sev = SEVERITY_CONFIG[rule.severity] || SEVERITY_CONFIG.high;
                return (
                  <div key={rule.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0]" data-testid={`rule-${rule.id}`}>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${sev.bg} ${sev.color}`}>{rule.id}</span>
                    <p className="text-xs text-[#0F172A] flex-1">{rule.description}</p>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${sev.bg} ${sev.color}`}>{sev.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-[#0F172A]">Trigger Fail-Safe</h3>
            </div>
            <div className="space-y-2">
              {Object.entries(dashboard.fail_safe_triggers || {}).map(([key, trigger]) => {
                const sev = SEVERITY_CONFIG[trigger.stop_level] || SEVERITY_CONFIG.medium;
                return (
                  <div key={key} className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0]">
                    <AlertTriangle className={`w-3.5 h-3.5 ${sev.color} flex-shrink-0`} />
                    <p className="text-xs text-[#0F172A] flex-1">{trigger.description}</p>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${sev.bg} ${sev.color}`}>{sev.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-[#0A192F]" />
            <h3 className="text-sm font-bold text-[#0F172A]">Matrice dei Permessi</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="permissions-table">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  <th className="text-left py-2.5 px-3 font-semibold text-[#475569] text-[10px] uppercase tracking-wider">Azione</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-[#475569] text-[10px] uppercase tracking-wider">Utente</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-[#475569] text-[10px] uppercase tracking-wider">Admin</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-[#475569] text-[10px] uppercase tracking-wider">Creator</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(dashboard.permissions_matrix || {}).map(([action, roles]) => (
                  <tr key={action} className="border-b border-[#F1F5F9] hover:bg-[#F8F9FA] transition-colors">
                    <td className="py-2 px-3 text-[#0F172A] font-medium">{action.replace(/_/g, ' ')}</td>
                    {['user', 'admin', 'creator'].map(role => (
                      <td key={role} className="text-center py-2 px-3">
                        {roles[role] ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
