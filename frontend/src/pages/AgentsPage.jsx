import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getPractices, getAgentsInfo } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  ClipboardList, Calculator, ShieldCheck, FileText, MessageCircle, KeyRound,
  Timer, GitBranch, Activity, Search, Navigation, ShieldAlert, Bot,
  CheckCircle, XCircle, Loader2, Clock, Pause, ArrowRight, ChevronDown, ChevronUp, X, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const AGENT_ICONS = {
  intake: ClipboardList, ledger: Calculator, compliance: ShieldCheck, documents: FileText,
  delegate: KeyRound, deadline: Timer, flow: GitBranch, monitor: Activity, advisor: MessageCircle,
  research: Search, routing: Navigation, guard: ShieldAlert,
};

const AGENT_META = {
  intake: { name: 'Raccolta', branded: 'Herion Intake', role: 'Comprende e classifica la pratica', phase: 'Analisi' },
  ledger: { name: 'Contabilita', branded: 'Herion Ledger', role: 'Gestisce dati contabili e calcoli fiscali', phase: 'Analisi' },
  compliance: { name: 'Conformita', branded: 'Herion Compliance', role: 'Verifica regole e conformita normativa', phase: 'Conformita' },
  documents: { name: 'Documenti', branded: 'Herion Documents', role: 'Gestisce documenti richiesti e generati', phase: 'Documenti' },
  delegate: { name: 'Delega', branded: 'Herion Delegate', role: 'Verifica deleghe e autorizzazioni', phase: 'Documenti' },
  deadline: { name: 'Scadenze', branded: 'Herion Deadline', role: 'Controlla scadenze e tempistiche', phase: 'Esecuzione' },
  flow: { name: 'Flusso', branded: 'Herion Flow', role: 'Gestisce il flusso operativo della pratica', phase: 'Esecuzione' },
  routing: { name: 'Instradamento', branded: 'Herion Routing', role: 'Indirizza al percorso corretto', phase: 'Esecuzione' },
  research: { name: 'Ricerca', branded: 'Herion Research', role: 'Ricerca normative e aggiornamenti', phase: 'Analisi' },
  monitor: { name: 'Monitoraggio', branded: 'Herion Monitor', role: 'Monitora lo stato e segnala anomalie', phase: 'Esecuzione' },
  advisor: { name: 'Spiegazione', branded: 'Herion Advisor', role: 'Spiega risultati in modo semplice', phase: 'Esecuzione' },
  guard: { name: 'Guardia', branded: 'Herion Guard', role: 'Valuta rischi e suggerisce alternative', phase: 'Conformita' },
};

const STATUS_STYLE = {
  completed: { label: 'Completato', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle },
  failed: { label: 'Errore', bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
  error: { label: 'Errore', bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
  running: { label: 'In corso', bg: 'bg-blue-50', text: 'text-blue-700', icon: Loader2 },
  idle: { label: 'Inattivo', bg: 'bg-gray-50', text: 'text-gray-500', icon: Pause },
  waiting: { label: 'In attesa', bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
};

export default function AgentsPage() {
  const { user } = useAuth();
  const [practices, setPractices] = useState([]);
  const [agentsInfo, setAgentsInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([getPractices(), getAgentsInfo()]);
      setPractices(p.data);
      setAgentsInfo(a.data);
    } catch (e) { console.warn('Agents data load failed:', e?.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-5 h-5 animate-spin text-[var(--text-muted)]" /></div>;

  // Build live agent activity from all practice agent_logs
  const allLogs = practices.flatMap(p =>
    (p.agent_logs || []).map(log => ({ ...log, practice_id: p.id, client_name: p.client_name, practice_type: p.practice_type_label }))
  );
  allLogs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

  // Metrics
  const activeAgents = new Set(allLogs.filter(l => l.status === 'running').map(l => l.agent_type)).size;
  const tasksInProgress = allLogs.filter(l => l.status === 'running').length;
  const waitingApproval = practices.filter(p => p.status === 'waiting_approval').length;
  const completedToday = allLogs.filter(l => {
    if (!l.timestamp) return false;
    const d = new Date(l.timestamp);
    const now = new Date();
    return l.status === 'completed' && d.toDateString() === now.toDateString();
  }).length;

  // Build per-agent summary
  const agentSummaries = Object.keys(AGENT_META).map(type => {
    const logs = allLogs.filter(l => l.agent_type === type);
    const latest = logs[0];
    const completed = logs.filter(l => l.status === 'completed').length;
    const failed = logs.filter(l => l.status === 'failed' || l.status === 'error').length;
    let liveStatus = 'idle';
    if (logs.some(l => l.status === 'running')) liveStatus = 'running';
    else if (latest?.status === 'completed') liveStatus = 'completed';
    else if (latest?.status === 'failed' || latest?.status === 'error') liveStatus = 'failed';
    return {
      type,
      ...AGENT_META[type],
      liveStatus,
      latestLog: latest,
      completedCount: completed,
      failedCount: failed,
      totalTasks: logs.length,
      recentLogs: logs.slice(0, 10),
    };
  });

  const openDetail = (agent) => { setSelectedAgent(agent); setDetailOpen(true); };

  return (
    <div className="space-y-6" data-testid="agents-page">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Agenti</h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          12 agenti specializzati lavorano sulle tue pratiche. Qui puoi vedere cosa sta facendo ognuno.
        </p>
      </div>

      {/* ── OVERVIEW METRICS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="agent-metrics">
        {[
          { label: 'Agenti attivi', value: activeAgents, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Attivita in corso', value: tasksInProgress, color: 'text-[#0ABFCF]', bg: 'bg-[var(--bg-soft)]' },
          { label: 'In attesa approvazione', value: waitingApproval, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Completate oggi', value: completedToday, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((m, i) => (
          <div key={i} className={`${m.bg} rounded-xl p-4 border`} style={{ borderColor: 'var(--border-soft)' }} data-testid={`metric-${i}`}>
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-[10px] font-medium text-[var(--text-muted)] mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* ── AGENTS LIST ── */}
      <div className="bg-white rounded-xl border" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="agents-list">
        <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-soft)' }}>
          <Bot className="w-4 h-4 text-[#0ABFCF]" />
          <h2 className="text-[13px] font-bold text-[var(--text-primary)]">Tutti gli Agenti</h2>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
          {agentSummaries.map(agent => {
            const Icon = AGENT_ICONS[agent.type] || Bot;
            const ss = STATUS_STYLE[agent.liveStatus] || STATUS_STYLE.idle;
            const StatusIcon = ss.icon;
            return (
              <button
                key={agent.type}
                onClick={() => openDetail(agent)}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--hover-soft)] transition-colors text-left"
                data-testid={`agent-card-${agent.type}`}
              >
                <div className={`w-10 h-10 rounded-xl ${ss.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${ss.text}`} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-[var(--text-primary)]">{agent.branded}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${ss.bg} ${ss.text}`}>
                      <StatusIcon className={`w-2.5 h-2.5 ${agent.liveStatus === 'running' ? 'animate-spin' : ''}`} strokeWidth={2.5} />
                      {ss.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{agent.role}</p>
                  {agent.latestLog && (
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">
                      Ultimo: {agent.latestLog.practice_type || agent.latestLog.explanation?.substring(0, 50)}
                      {agent.latestLog.timestamp && ` \u00B7 ${format(new Date(agent.latestLog.timestamp), 'dd MMM HH:mm', { locale: it })}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-[11px] font-bold text-[var(--text-primary)]">{agent.totalTasks}</p>
                    <p className="text-[9px] text-[var(--text-muted)]">attivita</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RECENT TASK TIMELINE ── */}
      <div className="bg-white rounded-xl border" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="task-timeline">
        <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-soft)' }}>
          <Clock className="w-4 h-4 text-[var(--text-muted)]" />
          <h2 className="text-[13px] font-bold text-[var(--text-primary)]">Attivita Recenti</h2>
        </div>
        <ScrollArea className="h-[240px]">
          <div className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
            {allLogs.slice(0, 20).map((log, i) => {
              const Icon = AGENT_ICONS[log.agent_type] || Bot;
              const ss = STATUS_STYLE[log.status] || STATUS_STYLE.idle;
              return (
                <div key={i} className="flex items-start gap-3 px-5 py-3" data-testid={`timeline-${i}`}>
                  <div className={`w-7 h-7 rounded-lg ${ss.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon className={`w-3.5 h-3.5 ${ss.text}`} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[var(--text-primary)]">
                      {AGENT_META[log.agent_type]?.branded || log.agent_type}
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">{log.explanation || log.practice_type}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[9px] font-bold ${ss.text}`}>{ss.label}</span>
                      {log.client_name && (
                        <Link to={`/practices/${log.practice_id}`} className="text-[9px] text-[#0ABFCF] hover:underline">{log.client_name}</Link>
                      )}
                    </div>
                  </div>
                  <p className="text-[9px] text-[var(--text-muted)] flex-shrink-0">{log.timestamp ? format(new Date(log.timestamp), 'HH:mm', { locale: it }) : ''}</p>
                </div>
              );
            })}
            {allLogs.length === 0 && (
              <div className="text-center py-12">
                <Bot className="w-7 h-7 text-[var(--text-muted)] mx-auto mb-2 opacity-40" strokeWidth={1.5} />
                <p className="text-[12px] text-[var(--text-secondary)]">Nessuna attivita ancora</p>
                <p className="text-[10px] text-[var(--text-muted)]">Gli agenti si attiveranno quando avvii una pratica</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── APPROVAL QUEUE ── */}
      {waitingApproval > 0 && (
        <div className="bg-white rounded-xl border" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="approval-queue">
          <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-soft)' }}>
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="text-[13px] font-bold text-[var(--text-primary)]">In Attesa di Approvazione</h2>
            <span className="ml-auto text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{waitingApproval}</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
            {practices.filter(p => p.status === 'waiting_approval').map(p => (
              <Link key={p.id} to={`/practices/${p.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-[var(--hover-soft)] transition-colors" data-testid={`approval-${p.id}`}>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{p.client_name}</p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{p.practice_type_label}</p>
                </div>
                <span className="text-[10px] font-semibold text-amber-600">Approva</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── AGENT DETAIL PANEL ── */}
      {detailOpen && selectedAgent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" data-testid="agent-detail-modal">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDetailOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-soft)' }}>
              <div className="flex items-center gap-3">
                {(() => { const Icon = AGENT_ICONS[selectedAgent.type] || Bot; const ss = STATUS_STYLE[selectedAgent.liveStatus] || STATUS_STYLE.idle; return <div className={`w-10 h-10 rounded-xl ${ss.bg} flex items-center justify-center`}><Icon className={`w-5 h-5 ${ss.text}`} strokeWidth={1.5} /></div>; })()}
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--text-primary)]">{selectedAgent.branded}</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">{selectedAgent.role}</p>
                </div>
              </div>
              <button onClick={() => setDetailOpen(false)} className="p-1.5 rounded-lg hover:bg-[var(--hover-soft)]" data-testid="close-detail-btn">
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Agent stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[var(--bg-app)] rounded-xl p-3 text-center border" style={{ borderColor: 'var(--border-soft)' }}>
                  <p className="text-lg font-bold text-[var(--text-primary)]">{selectedAgent.totalTasks}</p>
                  <p className="text-[9px] text-[var(--text-muted)]">Totale</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                  <p className="text-lg font-bold text-emerald-600">{selectedAgent.completedCount}</p>
                  <p className="text-[9px] text-emerald-600">Completate</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
                  <p className="text-lg font-bold text-red-600">{selectedAgent.failedCount}</p>
                  <p className="text-[9px] text-red-600">Errori</p>
                </div>
              </div>

              {/* Info */}
              <div className="bg-[var(--bg-soft)] rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Fase</p>
                <p className="text-[12px] font-semibold text-[var(--text-primary)]">{selectedAgent.phase}</p>
              </div>

              {/* Recent task history */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Cronologia Attivita</p>
                {selectedAgent.recentLogs.length > 0 ? (
                  <div className="space-y-2">
                    {selectedAgent.recentLogs.map((log, i) => {
                      const ss = STATUS_STYLE[log.status] || STATUS_STYLE.idle;
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 bg-[var(--bg-app)] rounded-xl border" style={{ borderColor: 'var(--border-soft)' }} data-testid={`detail-log-${i}`}>
                          <div className={`w-6 h-6 rounded-lg ${ss.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <ss.icon className={`w-3 h-3 ${ss.text} ${log.status === 'running' ? 'animate-spin' : ''}`} strokeWidth={2} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={`text-[9px] font-bold ${ss.text}`}>{ss.label}</span>
                              <span className="text-[9px] text-[var(--text-muted)]">{log.timestamp ? format(new Date(log.timestamp), 'dd MMM HH:mm', { locale: it }) : ''}</span>
                            </div>
                            {log.explanation && <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{log.explanation}</p>}
                            {log.client_name && <Link to={`/practices/${log.practice_id}`} className="text-[9px] text-[#0ABFCF] hover:underline mt-0.5 inline-block">{log.client_name} &rarr;</Link>}
                            {log.output_data && (
                              <details className="mt-1.5">
                                <summary className="text-[9px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)]">Vedi output</summary>
                                <pre className="mt-1 p-2 bg-white rounded-lg text-[9px] text-[var(--text-secondary)] whitespace-pre-wrap max-h-32 overflow-y-auto border" style={{ borderColor: 'var(--border-soft)' }}>
                                  {typeof log.output_data === 'string' ? log.output_data.substring(0, 500) : JSON.stringify(log.output_data, null, 2).substring(0, 500)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-[var(--bg-app)] rounded-xl">
                    <p className="text-[11px] text-[var(--text-muted)]">Nessuna attivita registrata</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Questo agente si attivera quando necessario</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
