import { useState } from 'react';
import {
  ClipboardList, Calculator, ShieldCheck, FileText, KeyRound, Timer,
  GitBranch, Navigation, Search, Activity, MessageCircle, ShieldAlert,
  CheckCircle, XCircle, Loader2, Play, Lock, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const PIPELINE_AGENTS = [
  { type: 'intake', name: 'Raccolta', branded: 'Herion Intake', icon: ClipboardList },
  { type: 'ledger', name: 'Contabilita', branded: 'Herion Ledger', icon: Calculator },
  { type: 'compliance', name: 'Conformita', branded: 'Herion Compliance', icon: ShieldCheck },
  { type: 'documents', name: 'Documenti', branded: 'Herion Documents', icon: FileText },
  { type: 'delegate', name: 'Delega', branded: 'Herion Delegate', icon: KeyRound },
  { type: 'deadline', name: 'Scadenze', branded: 'Herion Deadline', icon: Timer },
  { type: 'flow', name: 'Flusso', branded: 'Herion Flow', icon: GitBranch },
  { type: 'routing', name: 'Instradamento', branded: 'Herion Routing', icon: Navigation },
  { type: 'research', name: 'Ricerca', branded: 'Herion Research', icon: Search },
  { type: 'monitor', name: 'Monitoraggio', branded: 'Herion Monitor', icon: Activity },
  { type: 'advisor', name: 'Spiegazione', branded: 'Herion Advisor', icon: MessageCircle },
  { type: 'guard', name: 'Guardia', branded: 'Herion Guard', icon: ShieldAlert },
];

function getAgentState(agentType, agentLogs, practiceStatus) {
  const log = agentLogs?.find(l => l.agent_type === agentType);
  if (!log) {
    if (practiceStatus === 'in_progress' || practiceStatus === 'processing') {
      const completedTypes = (agentLogs || []).filter(l => l.status === 'completed' || l.status === 'failed').map(l => l.agent_type);
      const pipelineIdx = PIPELINE_AGENTS.findIndex(a => a.type === agentType);
      const lastCompletedIdx = PIPELINE_AGENTS.reduce((max, a, i) => completedTypes.includes(a.type) ? Math.max(max, i) : max, -1);
      if (pipelineIdx === lastCompletedIdx + 1) return 'in_progress';
    }
    return 'not_started';
  }
  if (log.status === 'completed') return 'completed';
  if (log.status === 'failed' || log.status === 'error') return 'failed';
  if (log.status === 'running') return 'in_progress';
  return 'not_started';
}

function AgentNode({ agent, state, log }) {
  const [showDetail, setShowDetail] = useState(false);
  const Icon = agent.icon;

  const stateStyle = {
    not_started: 'bg-[var(--bg-app)] border-[var(--border-soft)] text-[var(--text-muted)]',
    in_progress: 'bg-blue-50 border-blue-200 text-blue-600',
    completed: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    failed: 'bg-red-50 border-red-200 text-red-500',
  };

  return (
    <div className="relative flex flex-col items-center" data-testid={`pipeline-node-${agent.type}`}>
      <button
        onClick={() => log && setShowDetail(!showDetail)}
        className={`relative w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-200 ${stateStyle[state] || stateStyle.not_started} ${log ? 'cursor-pointer hover:scale-105' : 'cursor-default'} ${state === 'in_progress' ? 'animate-pulse' : ''}`}
        data-testid={`pipeline-node-btn-${agent.type}`}
      >
        {state === 'completed' && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center"><CheckCircle className="w-2.5 h-2.5 text-white" strokeWidth={3} /></div>}
        {state === 'failed' && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center"><XCircle className="w-2.5 h-2.5 text-white" strokeWidth={3} /></div>}
        {state === 'in_progress' && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center"><Loader2 className="w-2.5 h-2.5 text-white animate-spin" strokeWidth={3} /></div>}
        <Icon className="w-4 h-4" strokeWidth={1.5} />
      </button>
      <p className={`text-[8px] font-semibold mt-1 text-center max-w-[50px] leading-tight ${state === 'not_started' ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>{agent.name}</p>

      {showDetail && log && (
        <div className="absolute top-full mt-2 z-30 w-72 bg-white rounded-xl border shadow-lg p-3 text-left" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-soft)' }} data-testid={`pipeline-popover-${agent.type}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[var(--text-primary)]">{agent.branded}</span>
            <button onClick={() => setShowDetail(false)} className="p-0.5 rounded hover:bg-[var(--hover-soft)]"><ChevronUp className="w-3 h-3 text-[var(--text-muted)]" /></button>
          </div>
          {log.output_data && (
            <div className="p-2 bg-[var(--bg-app)] rounded-lg text-[10px] text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto border" style={{ borderColor: 'var(--border-soft)' }}>
              {typeof log.output_data === 'string' ? log.output_data.substring(0, 600) : JSON.stringify(log.output_data, null, 2).substring(0, 600)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AgentPipeline({ practice, onRunWorkflow, onApprove, orchestrating, approving }) {
  const [expanded, setExpanded] = useState(false);
  const agentLogs = practice?.agent_logs || [];
  const status = practice?.status || 'draft';
  const canRun = practice && !['approved', 'submitted', 'completed'].includes(status);
  const isWaiting = status === 'waiting_approval';
  const hasRun = agentLogs.length > 0;

  const completedCount = PIPELINE_AGENTS.filter(a => getAgentState(a.type, agentLogs, status) === 'completed').length;
  const failedCount = PIPELINE_AGENTS.filter(a => getAgentState(a.type, agentLogs, status) === 'failed').length;
  const totalAgents = PIPELINE_AGENTS.length;
  const pct = Math.round((completedCount / totalAgents) * 100);

  return (
    <div className="bg-white rounded-xl border" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="agent-pipeline">
      {/* Compact summary header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--hover-soft)] transition-colors text-left"
        data-testid="pipeline-toggle"
      >
        <div className="flex items-center gap-3">
          <GitBranch className="w-4 h-4 text-[var(--text-muted)]" strokeWidth={1.5} />
          <div>
            <p className="text-[12px] font-semibold text-[var(--text-primary)]">Pipeline Agenti</p>
            <p className="text-[10px] text-[var(--text-muted)]">
              {hasRun ? `${completedCount}/${totalAgents} completati${failedCount > 0 ? ` \u00B7 ${failedCount} errori` : ''}` : '12 agenti pronti'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasRun && (
            <div className="flex items-center gap-2" data-testid="pipeline-progress">
              <div className="w-16 h-1.5 bg-[var(--bg-app)] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${failedCount > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10px] font-bold text-[var(--text-primary)]">{pct}%</span>
            </div>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
        </div>
      </button>

      {/* Expanded pipeline detail */}
      {expanded && (
        <div className="border-t px-5 py-4" style={{ borderColor: 'var(--border-soft)' }}>
          {/* Pipeline nodes */}
          <div className="overflow-x-auto pb-2">
            <div className="flex items-start gap-1 min-w-[580px] lg:min-w-0 justify-center">
              {PIPELINE_AGENTS.map((agent, idx) => {
                const state = getAgentState(agent.type, agentLogs, status);
                const log = agentLogs.find(l => l.agent_type === agent.type);
                const isLast = idx === PIPELINE_AGENTS.length - 1;
                return (
                  <div key={agent.type} className="flex items-start">
                    <AgentNode agent={agent} state={state} log={log} />
                    {!isLast && (
                      <div className="mt-4 w-3 sm:w-5 flex items-center">
                        <div className={`h-px w-full ${state === 'completed' ? 'bg-emerald-300' : state === 'failed' ? 'bg-red-200' : 'bg-[var(--border-soft)]'}`} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-soft)' }}>
            {canRun && (
              <Button onClick={onRunWorkflow} disabled={orchestrating} className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg h-9 px-5 text-[11px] font-semibold" data-testid="pipeline-run-btn">
                {orchestrating ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Esecuzione...</> : <><Play className="w-3.5 h-3.5 mr-2" />{hasRun ? 'Riesegui' : 'Avvia Pipeline'}</>}
              </Button>
            )}
            {isWaiting && (
              <Button onClick={onApprove} disabled={approving} variant="outline" className="rounded-lg h-9 px-5 text-[11px] font-semibold border-emerald-200 text-emerald-700 hover:bg-emerald-50" data-testid="pipeline-approve-btn">
                {approving ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Approvazione...</> : <><Lock className="w-3.5 h-3.5 mr-2" />Approva</>}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
