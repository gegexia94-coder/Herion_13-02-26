import { useState } from 'react';
import {
  ClipboardList, Calculator, ShieldCheck, FileText, KeyRound, Timer,
  GitBranch, Navigation, Search, Activity, MessageCircle, ShieldAlert,
  CheckCircle, XCircle, Loader2, Play, Lock, ChevronDown, ChevronUp, X, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const PHASES = [
  {
    name: 'Analisi',
    agents: [
      { type: 'intake', name: 'Raccolta', icon: ClipboardList },
      { type: 'ledger', name: 'Contabilita', icon: Calculator },
      { type: 'research', name: 'Ricerca', icon: Search },
    ]
  },
  {
    name: 'Conformita',
    agents: [
      { type: 'compliance', name: 'Conformita', icon: ShieldCheck },
      { type: 'guard', name: 'Guardia', icon: ShieldAlert },
    ]
  },
  {
    name: 'Documenti',
    agents: [
      { type: 'documents', name: 'Documenti', icon: FileText },
      { type: 'delegate', name: 'Delega', icon: KeyRound },
    ]
  },
  {
    name: 'Esecuzione',
    agents: [
      { type: 'deadline', name: 'Scadenze', icon: Timer },
      { type: 'flow', name: 'Flusso', icon: GitBranch },
      { type: 'routing', name: 'Instradamento', icon: Navigation },
      { type: 'monitor', name: 'Monitoraggio', icon: Activity },
      { type: 'advisor', name: 'Spiegazione', icon: MessageCircle },
    ]
  },
];

const ALL_AGENTS = PHASES.flatMap(p => p.agents);

function getAgentState(agentType, agentLogs, practiceStatus) {
  const log = agentLogs?.find(l => l.agent_type === agentType);
  if (!log) {
    if (practiceStatus === 'in_progress' || practiceStatus === 'processing') {
      const completedTypes = (agentLogs || []).filter(l => l.status === 'completed' || l.status === 'failed').map(l => l.agent_type);
      const idx = ALL_AGENTS.findIndex(a => a.type === agentType);
      const lastIdx = ALL_AGENTS.reduce((max, a, i) => completedTypes.includes(a.type) ? Math.max(max, i) : max, -1);
      if (idx === lastIdx + 1) return 'running';
    }
    return 'pending';
  }
  if (log.status === 'completed') return 'completed';
  if (log.status === 'failed' || log.status === 'error') return 'failed';
  if (log.status === 'running') return 'running';
  return 'pending';
}

function getActiveAgent(agentLogs, status) {
  if (!agentLogs?.length && (status === 'draft' || status === 'pending')) return null;
  for (const agent of ALL_AGENTS) {
    const state = getAgentState(agent.type, agentLogs, status);
    if (state === 'running') return { ...agent, state: 'running' };
  }
  const lastLog = agentLogs?.[agentLogs.length - 1];
  if (lastLog) {
    const cfg = ALL_AGENTS.find(a => a.type === lastLog.agent_type);
    return cfg ? { ...cfg, state: lastLog.status } : null;
  }
  return null;
}

function getStatusMessage(practice) {
  const status = practice?.status;
  const hasLogs = practice?.agent_logs?.length > 0;
  if (status === 'draft') return 'Pratica pronta per essere elaborata. Avvia il workflow per iniziare.';
  if (status === 'waiting_approval') return 'L\'analisi e completata. Verifica il riepilogo e approva per procedere.';
  if (status === 'completed') return 'Pratica completata con successo.';
  if (status === 'blocked') return 'Pratica bloccata. Verifica il motivo e risolvi per continuare.';
  if (status === 'escalated') return 'Pratica in escalation. Richiede revisione professionale.';
  if (hasLogs) return 'Il sistema sta elaborando la tua pratica.';
  return 'Pratica in elaborazione.';
}

function getNextStep(practice) {
  const status = practice?.status;
  if (status === 'draft') return 'Clicca "Avvia Pipeline" per iniziare';
  if (status === 'waiting_approval') return 'Clicca "Approva" per procedere';
  if (status === 'blocked') return 'Risolvi il problema indicato sopra';
  if (status === 'completed') return null;
  const active = getActiveAgent(practice?.agent_logs, status);
  if (active) {
    const idx = ALL_AGENTS.findIndex(a => a.type === active.type);
    const next = ALL_AGENTS[idx + 1];
    if (next) return `Prossimo: ${next.name}`;
  }
  return 'Attendere il completamento';
}

export function AgentPipeline({ practice, onRunWorkflow, onApprove, orchestrating, approving }) {
  const [modalOpen, setModalOpen] = useState(false);
  const agentLogs = practice?.agent_logs || [];
  const status = practice?.status || 'draft';
  const canRun = practice && !['approved', 'submitted', 'completed'].includes(status);
  const isWaiting = status === 'waiting_approval';
  const hasRun = agentLogs.length > 0;

  const completedCount = ALL_AGENTS.filter(a => getAgentState(a.type, agentLogs, status) === 'completed').length;
  const failedCount = ALL_AGENTS.filter(a => getAgentState(a.type, agentLogs, status) === 'failed').length;
  const totalAgents = ALL_AGENTS.length;
  const pct = Math.round((completedCount / totalAgents) * 100);
  const activeAgent = getActiveAgent(agentLogs, status);
  const statusMsg = getStatusMessage(practice);
  const nextStep = getNextStep(practice);

  return (
    <>
      {/* ── COMPACT SUMMARY (always visible) ── */}
      <div className="bg-white rounded-xl border" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="agent-pipeline">
        <div className="px-5 py-4">
          {/* Status message */}
          <p className="text-[13px] text-[var(--text-primary)] leading-relaxed mb-3" data-testid="pipeline-status-msg">{statusMsg}</p>

          {/* Active agent indicator */}
          {activeAgent && (
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeAgent.state === 'running' ? 'bg-blue-50 text-blue-600' : activeAgent.state === 'completed' ? 'bg-emerald-50 text-emerald-600' : activeAgent.state === 'failed' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'}`}>
                {activeAgent.state === 'running' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <activeAgent.icon className="w-3.5 h-3.5" strokeWidth={1.5} />}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[var(--text-primary)]">
                  {activeAgent.state === 'running' ? `${activeAgent.name} in esecuzione` : `Ultimo: ${activeAgent.name}`}
                </p>
                {nextStep && <p className="text-[10px] text-[var(--text-muted)]">{nextStep}</p>}
              </div>
            </div>
          )}

          {/* Progress bar */}
          {hasRun && (
            <div className="flex items-center gap-3 mb-3" data-testid="pipeline-progress">
              <div className="flex-1 h-2 bg-[var(--bg-app)] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${failedCount > 0 ? 'bg-amber-400' : 'bg-[#0ABFCF]'}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[11px] font-bold text-[var(--text-primary)] w-10 text-right">{pct}%</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {canRun && (
              <Button onClick={onRunWorkflow} disabled={orchestrating} className="bg-[#0ABFCF] hover:bg-[#09a8b6] text-white rounded-xl h-10 px-5 text-[12px] font-semibold" data-testid="pipeline-run-btn">
                {orchestrating ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Esecuzione...</> : <><Play className="w-3.5 h-3.5 mr-2" />{hasRun ? 'Riesegui' : 'Avvia Pipeline'}</>}
              </Button>
            )}
            {isWaiting && (
              <Button onClick={onApprove} disabled={approving} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-5 text-[12px] font-semibold" data-testid="pipeline-approve-btn">
                {approving ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Approvazione...</> : <><CheckCircle className="w-3.5 h-3.5 mr-2" />Approva</>}
              </Button>
            )}
            {hasRun && (
              <Button variant="outline" onClick={() => setModalOpen(true)} className="rounded-xl h-10 px-4 text-[12px] font-semibold text-[var(--text-secondary)]" style={{ borderColor: 'var(--border-soft)' }} data-testid="view-agents-btn">
                <Eye className="w-3.5 h-3.5 mr-2" />Attivita Agenti
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── AGENT DETAIL MODAL ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" data-testid="agents-modal">
          <div className="absolute inset-0 bg-black/30" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" style={{ borderColor: 'var(--border-soft)' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-soft)' }}>
              <div>
                <h3 className="text-[15px] font-bold text-[var(--text-primary)]">Attivita degli Agenti</h3>
                <p className="text-[11px] text-[var(--text-muted)]">{completedCount}/{totalAgents} completati{failedCount > 0 ? ` \u00B7 ${failedCount} errori` : ''}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-[var(--hover-soft)]" data-testid="close-modal-btn">
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Phases */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {PHASES.map(phase => (
                <div key={phase.name}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">{phase.name}</p>
                  <div className="space-y-1.5">
                    {phase.agents.map(agent => {
                      const state = getAgentState(agent.type, agentLogs, status);
                      const log = agentLogs.find(l => l.agent_type === agent.type);
                      const Icon = agent.icon;
                      return (
                        <div key={agent.type} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-app)]" data-testid={`modal-agent-${agent.type}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            state === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                            state === 'failed' ? 'bg-red-50 text-red-500' :
                            state === 'running' ? 'bg-blue-50 text-blue-600' :
                            'bg-gray-100 text-gray-400'
                          }`}>
                            {state === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> :
                             state === 'completed' ? <CheckCircle className="w-4 h-4" strokeWidth={2} /> :
                             state === 'failed' ? <XCircle className="w-4 h-4" strokeWidth={2} /> :
                             <Icon className="w-4 h-4" strokeWidth={1.5} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-[12px] font-semibold text-[var(--text-primary)]">{agent.name}</p>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                state === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                                state === 'failed' ? 'bg-red-50 text-red-600' :
                                state === 'running' ? 'bg-blue-50 text-blue-600' :
                                'bg-gray-100 text-gray-400'
                              }`}>
                                {state === 'completed' ? 'Completato' : state === 'failed' ? 'Errore' : state === 'running' ? 'In corso' : 'In attesa'}
                              </span>
                            </div>
                            {log?.explanation && (
                              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">{log.explanation}</p>
                            )}
                            {state === 'running' && (
                              <p className="text-[10px] text-blue-600 mt-0.5">Sta elaborando in questo momento...</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
