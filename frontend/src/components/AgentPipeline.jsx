import { useState } from 'react';
import {
  ClipboardList, Calculator, ShieldCheck, FileText, KeyRound, Timer,
  GitBranch, Navigation, Search, Activity, MessageCircle, ShieldAlert,
  CheckCircle, XCircle, Loader2, Circle, Play, Lock, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const PIPELINE_AGENTS = [
  { type: 'intake', name: 'Raccolta', branded: 'Herion Intake', icon: ClipboardList, color: '#0EA5E9' },
  { type: 'ledger', name: 'Contabilita', branded: 'Herion Ledger', icon: Calculator, color: '#6366F1' },
  { type: 'compliance', name: 'Conformita', branded: 'Herion Compliance', icon: ShieldCheck, color: '#F59E0B' },
  { type: 'documents', name: 'Documenti', branded: 'Herion Documents', icon: FileText, color: '#10B981' },
  { type: 'delegate', name: 'Delega', branded: 'Herion Delegate', icon: KeyRound, color: '#8B5CF6' },
  { type: 'deadline', name: 'Scadenze', branded: 'Herion Deadline', icon: Timer, color: '#EF4444' },
  { type: 'flow', name: 'Flusso', branded: 'Herion Flow', icon: GitBranch, color: '#06B6D4' },
  { type: 'routing', name: 'Instradamento', branded: 'Herion Routing', icon: Navigation, color: '#14B8A6' },
  { type: 'research', name: 'Ricerca', branded: 'Herion Research', icon: Search, color: '#A855F7' },
  { type: 'monitor', name: 'Monitoraggio', branded: 'Herion Monitor', icon: Activity, color: '#F97316' },
  { type: 'advisor', name: 'Spiegazione', branded: 'Herion Advisor', icon: MessageCircle, color: '#7C3AED' },
  { type: 'guard', name: 'Guardia', branded: 'Herion Guard', icon: ShieldAlert, color: '#DC2626' },
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

const STATE_STYLES = {
  not_started: { ring: 'ring-[#E2E8F0]', bg: 'bg-[#F8F9FA]', iconColor: 'text-[#CBD5E1]', label: 'Non avviato', labelColor: 'text-[#94A3B8]' },
  in_progress: { ring: 'ring-[#3B82F6]', bg: 'bg-[#EFF6FF]', iconColor: 'text-[#3B82F6]', label: 'In esecuzione', labelColor: 'text-[#3B82F6]' },
  completed: { ring: 'ring-[#10B981]', bg: 'bg-[#ECFDF5]', iconColor: 'text-[#10B981]', label: 'Completato', labelColor: 'text-[#10B981]' },
  failed: { ring: 'ring-[#EF4444]', bg: 'bg-[#FEF2F2]', iconColor: 'text-[#EF4444]', label: 'Errore', labelColor: 'text-[#EF4444]' },
  waiting_approval: { ring: 'ring-[#F59E0B]', bg: 'bg-[#FFFBEB]', iconColor: 'text-[#F59E0B]', label: 'Approvazione', labelColor: 'text-[#F59E0B]' },
};

function ConnectorLine({ fromState, toState }) {
  const isActive = fromState === 'completed';
  const isFailed = fromState === 'failed';
  return (
    <div className="flex items-center flex-shrink-0 w-5 sm:w-7 lg:w-9">
      <div className={`h-0.5 w-full rounded-full transition-all duration-500 ${
        isFailed ? 'bg-[#FCA5A5]' : isActive ? 'bg-[#10B981]' : 'bg-[#E2E8F0]'
      }`} />
    </div>
  );
}

function AgentNode({ agent, state, log, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const style = STATE_STYLES[state];
  const Icon = agent.icon;

  return (
    <div className="relative flex flex-col items-center group" data-testid={`pipeline-node-${agent.type}`}>
      {/* Node circle */}
      <button
        onClick={() => log && setExpanded(!expanded)}
        className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${style.bg} ring-2 ${style.ring} flex items-center justify-center transition-all duration-300 ${
          log ? 'cursor-pointer hover:scale-110' : 'cursor-default'
        } ${state === 'in_progress' ? 'animate-pulse' : ''}`}
        data-testid={`pipeline-node-btn-${agent.type}`}
      >
        {state === 'completed' && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#10B981] flex items-center justify-center shadow-sm">
            <CheckCircle className="w-3 h-3 text-white" strokeWidth={2.5} />
          </div>
        )}
        {state === 'failed' && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#EF4444] flex items-center justify-center shadow-sm">
            <XCircle className="w-3 h-3 text-white" strokeWidth={2.5} />
          </div>
        )}
        {state === 'in_progress' && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#3B82F6] flex items-center justify-center shadow-sm">
            <Loader2 className="w-3 h-3 text-white animate-spin" strokeWidth={2.5} />
          </div>
        )}
        <Icon className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${style.iconColor} transition-colors`} strokeWidth={1.5} />
      </button>

      {/* Label */}
      <p className={`text-[8px] sm:text-[9px] font-semibold mt-1.5 text-center leading-tight max-w-[56px] ${style.labelColor}`}>
        {agent.name}
      </p>

      {/* Expanded output popover */}
      {expanded && log && (
        <div className="absolute top-full mt-2 z-30 w-72 sm:w-80 bg-white rounded-xl border border-[#E2E8F0] shadow-xl p-3 text-left"
          data-testid={`pipeline-popover-${agent.type}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon className="w-3.5 h-3.5" style={{ color: agent.color }} strokeWidth={1.5} />
              <span className="text-xs font-bold text-[#0F172A]">{agent.branded}</span>
            </div>
            <button onClick={() => setExpanded(false)} className="p-0.5 rounded hover:bg-[#F1F5F9]">
              <ChevronUp className="w-3.5 h-3.5 text-[#94A3B8]" />
            </button>
          </div>
          <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-block mb-2 ${
            state === 'completed' ? 'bg-emerald-50 text-emerald-700' :
            state === 'failed' ? 'bg-red-50 text-red-700' : 'bg-sky-50 text-sky-700'
          }`}>{style.label}</div>
          {log.output_data && (
            <div className="p-2.5 bg-[#F8F9FA] rounded-lg text-[11px] text-[#334155] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto border border-[#E2E8F0]">
              {typeof log.output_data === 'string' ? log.output_data.substring(0, 800) : JSON.stringify(log.output_data, null, 2).substring(0, 800)}
              {(typeof log.output_data === 'string' ? log.output_data.length : JSON.stringify(log.output_data).length) > 800 && (
                <span className="text-[#94A3B8]">... (troncato)</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AgentPipeline({ practice, onRunWorkflow, onApprove, orchestrating, approving }) {
  const agentLogs = practice?.agent_logs || [];
  const status = practice?.status || 'draft';
  const canRun = practice && !['approved', 'submitted', 'completed'].includes(status);
  const isWaiting = status === 'waiting_approval';
  const hasRun = agentLogs.length > 0;

  const completedCount = PIPELINE_AGENTS.filter(a => getAgentState(a.type, agentLogs, status) === 'completed').length;
  const failedCount = PIPELINE_AGENTS.filter(a => getAgentState(a.type, agentLogs, status) === 'failed').length;
  const totalAgents = PIPELINE_AGENTS.length;

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_4px_20px_rgba(15,23,42,0.04)] overflow-hidden" data-testid="agent-pipeline">
      {/* Header */}
      <div className="p-5 pb-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0A192F] flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-[#3B82F6]" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Pipeline degli Agenti</h3>
              <p className="text-[10px] text-[#475569]">
                {hasRun
                  ? `${completedCount}/${totalAgents} completati${failedCount > 0 ? ` \u00B7 ${failedCount} errori` : ''}`
                  : '12 agenti specializzati pronti per l\'esecuzione'
                }
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          {hasRun && (
            <div className="flex items-center gap-2" data-testid="pipeline-progress">
              <div className="w-24 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${failedCount > 0 ? 'bg-[#F59E0B]' : 'bg-[#10B981]'}`}
                  style={{ width: `${(completedCount / totalAgents) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-[#0F172A]">{Math.round((completedCount / totalAgents) * 100)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline visualization */}
      <div className="px-5 pt-4 pb-3 overflow-x-auto">
        <div className="flex items-start justify-center min-w-[640px] lg:min-w-0">
          {PIPELINE_AGENTS.map((agent, idx) => {
            const state = isWaiting && getAgentState(agent.type, agentLogs, status) === 'completed'
              ? 'completed'
              : getAgentState(agent.type, agentLogs, status);
            const log = agentLogs.find(l => l.agent_type === agent.type);
            const isLast = idx === PIPELINE_AGENTS.length - 1;
            const nextAgent = PIPELINE_AGENTS[idx + 1];
            const nextState = nextAgent ? getAgentState(nextAgent.type, agentLogs, status) : null;

            return (
              <div key={agent.type} className="flex items-start">
                <AgentNode agent={agent} state={state} log={log} isLast={isLast} />
                {!isLast && <div className="mt-4 sm:mt-[18px]"><ConnectorLine fromState={state} toState={nextState} /></div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action bar */}
      <div className="px-5 pb-5 pt-2 border-t border-[#F1F5F9]">
        <div className="flex items-center gap-2.5">
          {canRun && (
            <Button
              onClick={onRunWorkflow}
              disabled={orchestrating}
              className="bg-[#0A192F] hover:bg-[#0B243B] rounded-xl h-10 px-5 text-xs font-semibold flex-1 sm:flex-none"
              data-testid="pipeline-run-btn"
            >
              {orchestrating ? (
                <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Esecuzione in corso...</>
              ) : (
                <><Play className="w-3.5 h-3.5 mr-2" />{hasRun ? 'Riesegui Pipeline' : 'Avvia Pipeline'}</>
              )}
            </Button>
          )}
          {isWaiting && (
            <Button
              onClick={onApprove}
              disabled={approving}
              variant="outline"
              className="rounded-xl h-10 px-5 text-xs font-semibold border-[#10B981] text-[#10B981] hover:bg-[#ECFDF5] flex-1 sm:flex-none"
              data-testid="pipeline-approve-btn"
            >
              {approving ? (
                <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Approvazione...</>
              ) : (
                <><Lock className="w-3.5 h-3.5 mr-2" />Approva Pratica</>
              )}
            </Button>
          )}
          {!canRun && !isWaiting && (
            <p className="text-[10px] text-[#94A3B8] italic">
              {status === 'completed' ? 'Pratica completata con successo' :
               status === 'submitted' ? 'Pratica inviata' :
               status === 'approved' ? 'Pratica approvata' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
