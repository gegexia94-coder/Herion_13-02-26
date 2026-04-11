import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getPractice, updatePractice, uploadDocument, getPracticeDocuments, executeAgent, getPracticeActivityLogs, downloadPracticePdf, orchestrateAgents, sendPracticeChat, getPracticeChatHistory, approvePractice, getPracticeTimeline, updateDelegation, getPracticeReadiness, getGuardEvaluation, getDocumentMatrix } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Upload, Clock, CheckCircle, Play, Loader2, File, Download, Sparkles, AlertTriangle, FileDown, ClipboardList, Calculator, ShieldCheck, FileText, MessageCircle, Send, Bot, ChevronDown, ChevronUp, KeyRound, Timer, GitBranch, Activity, ShieldAlert, CircleDot, CheckCircle2, XCircle, ArrowRight, Lock, Circle, Shield, RefreshCw } from 'lucide-react';
import { AgentPipeline } from '@/components/AgentPipeline';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

const BRANDED_AGENTS = [
  { type: 'intake', branded: 'Herion Intake', name: 'Raccolta', icon: ClipboardList, step: 1 },
  { type: 'ledger', branded: 'Herion Ledger', name: 'Contabilita', icon: Calculator, step: 2 },
  { type: 'compliance', branded: 'Herion Compliance', name: 'Conformita', icon: ShieldCheck, step: 3 },
  { type: 'documents', branded: 'Herion Documents', name: 'Documenti', icon: FileText, step: 4 },
  { type: 'delegate', branded: 'Herion Delegate', name: 'Delega', icon: KeyRound, step: 5 },
  { type: 'deadline', branded: 'Herion Deadline', name: 'Scadenze', icon: Timer, step: 6 },
  { type: 'flow', branded: 'Herion Flow', name: 'Flusso', icon: GitBranch, step: 7 },
  { type: 'monitor', branded: 'Herion Monitor', name: 'Monitoraggio', icon: Activity, step: 8 },
  { type: 'advisor', branded: 'Herion Advisor', name: 'Spiegazione', icon: MessageCircle, step: 9 },
];

const DOC_CATEGORIES = [
  { key: 'identity', label: 'Identita' }, { key: 'tax_declarations', label: 'Dichiarazioni' },
  { key: 'vat_documents', label: 'IVA' }, { key: 'invoices', label: 'Fatture' },
  { key: 'company_documents', label: 'Societari' }, { key: 'accounting', label: 'Contabili' },
  { key: 'compliance', label: 'Conformita' }, { key: 'payroll', label: 'Lavoro' },
  { key: 'activity', label: 'Attivita' }, { key: 'other', label: 'Altro' },
];

const STATUS_MAP = {
  draft: { label: 'Bozza', color: '#5B6475' },
  pending: { label: 'In Attesa', color: '#F59E0B' },
  in_progress: { label: 'In Elaborazione', color: '#3B82F6' },
  processing: { label: 'In Elaborazione', color: '#3B82F6' },
  waiting_approval: { label: 'Approvazione', color: '#F59E0B' },
  approved: { label: 'Approvata', color: '#10B981' },
  submitted: { label: 'Inviata', color: '#06B6D4' },
  completed: { label: 'Completata', color: '#10B981' },
  blocked: { label: 'Bloccata', color: '#EF4444' },
  escalated: { label: 'Escalation', color: '#EF4444' },
  rejected: { label: 'Rifiutata', color: '#EF4444' },
};

const WORKFLOW_STEPS = [
  { key: 'draft', label: 'Dati Ricevuti', icon: ClipboardList },
  { key: 'in_progress', label: 'In Elaborazione', icon: GitBranch },
  { key: 'waiting_approval', label: 'Approvazione', icon: Lock },
  { key: 'approved', label: 'Approvata', icon: CheckCircle2 },
  { key: 'submitted', label: 'Inviata', icon: ArrowRight },
  { key: 'completed', label: 'Completata', icon: CheckCircle },
];

const STATUS_ORDER = { draft: 0, pending: 0, data_collection: 0, in_progress: 1, processing: 1, waiting_approval: 2, approved: 3, submitted: 4, completed: 5, blocked: -1, escalated: -1, rejected: -1 };

const TIMELINE_ICONS = {
  practice_created: CircleDot, orchestration_started: Play, intake_completed: ClipboardList,
  ledger_completed: Calculator, compliance_completed: ShieldCheck, documents_completed: FileText,
  delegate_completed: KeyRound, deadline_completed: Timer, flow_completed: GitBranch,
  monitor_completed: Activity, advisor_completed: MessageCircle, risk_evaluated: ShieldAlert,
  waiting_approval: Lock, approved: CheckCircle2, submitted: ArrowRight, completed: CheckCircle,
  blocked: XCircle, escalated: AlertTriangle, status_changed: CircleDot,
  guard_evaluated: Shield, guard_cleared: CheckCircle, guard_guarded: AlertTriangle, guard_blocked: XCircle,
  follow_up_created: Clock, follow_up_resolved: CheckCircle,
};


export default function PracticeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const chatEndRef = useRef(null);
  const [practice, setPractice] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('intake');
  const [agentQuery, setAgentQuery] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState({ open: false, status: '' });
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [uploadCategory, setUploadCategory] = useState('other');
  const [orchestrating, setOrchestrating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState({});
  const [readiness, setReadiness] = useState(null);
  const [guardResult, setGuardResult] = useState(null);
  const [docMatrix, setDocMatrix] = useState(null);
  const [showActivity, setShowActivity] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [p, d, l, c, t] = await Promise.all([
        getPractice(id), getPracticeDocuments(id), getPracticeActivityLogs(id),
        getPracticeChatHistory(id), getPracticeTimeline(id)
      ]);
      setPractice(p.data); setDocuments(d.data); setActivityLogs(l.data);
      setChatHistory(c.data.reverse()); setTimeline(t.data);
      try { const r = await getPracticeReadiness(id); setReadiness(r.data); } catch {}
      try { const g = await getGuardEvaluation(id); setGuardResult(g.data); } catch {}
      try { const dm = await getDocumentMatrix(id); setDocMatrix(dm.data); } catch {}
    } catch (e) { console.warn('Practice detail fetch failed:', e?.message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleFileSelect = (e) => { const f = e.target.files?.[0]; if (!f) return; setPendingFile(f); setShowUploadDialog(true); };
  const handleFileUpload = async () => {
    if (!pendingFile) return; setShowUploadDialog(false); setUploading(true);
    try { await uploadDocument(id, pendingFile, uploadCategory); toast.success('Documento caricato'); loadData(); }
    catch { toast.error('Errore nel caricamento'); }
    finally { setUploading(false); setPendingFile(null); setUploadCategory('other'); }
  };
  const handleStatusChange = async () => {
    const s = showStatusDialog.status; setShowStatusDialog({ open: false, status: '' });
    try { await updatePractice(id, { status: s }); toast.success('Stato aggiornato'); loadData(); }
    catch { toast.error("Errore nell'aggiornamento"); }
  };
  const handleAgentExecute = async () => {
    setShowAgentDialog(false); setAgentLoading(true);
    try { await executeAgent(selectedAgent, id, { query: agentQuery }); toast.success('Analisi completata'); loadData(); }
    catch (e) { toast.error("Errore nell'elaborazione", { description: e.response?.data?.detail }); }
    finally { setAgentLoading(false); }
  };
  const handleOrchestrate = async () => {
    setOrchestrating(true);
    try { await orchestrateAgents(id, agentQuery || 'Analisi completa della pratica'); toast.success('Analisi completa terminata'); loadData(); }
    catch (e) { toast.error("Errore nell'orchestrazione", { description: e.response?.data?.detail }); }
    finally { setOrchestrating(false); }
  };
  const handleApprove = async () => {
    setShowApprovalDialog(false); setApproving(true);
    try { await approvePractice(id); toast.success('Pratica approvata'); loadData(); }
    catch (e) { toast.error("Errore nell'approvazione", { description: e.response?.data?.detail }); }
    finally { setApproving(false); }
  };
  const handlePdfDownload = async () => {
    setPdfLoading(true);
    try {
      const response = await downloadPracticePdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `Herion_Pratica_${id.slice(0, 8)}.pdf`; document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url); toast.success('PDF scaricato');
    } catch (e) { toast.error(e.response?.data?.detail || 'Errore nel download PDF'); }
    finally { setPdfLoading(false); }
  };
  const handleDelegation = async (action, notes) => {
    try { await updateDelegation(id, { action, notes }); toast.success('Delega aggiornata'); loadData(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Errore'); }
  };
  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatQuestion.trim() || chatLoading) return;
    const q = chatQuestion.trim(); setChatQuestion(''); setChatLoading(true);
    try {
      const res = await sendPracticeChat(id, q);
      setChatHistory(prev => [...prev, res.data]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) { toast.error("Errore nella risposta", { description: e.response?.data?.detail }); }
    finally { setChatLoading(false); }
  };

  const toggleLog = (logId) => setExpandedLogs(prev => ({ ...prev, [logId]: !prev[logId] }));
  const getAgentConfig = (type) => BRANDED_AGENTS.find(a => a.type === type) || BRANDED_AGENTS[0];

  const isAdmin = user?.role === 'admin';
  const canOrchestrate = practice && !['approved', 'submitted', 'completed'].includes(practice.status);
  const isWaitingApproval = practice?.status === 'waiting_approval';
  const orchestration = practice?.orchestration_result;
  const currentIdx = STATUS_ORDER[practice?.status] ?? 0;
  const isAbnormal = ['blocked', 'escalated', 'rejected'].includes(practice?.status);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--text-primary)]" /></div>;
  if (!practice) return <div className="text-center py-16"><p className="text-[var(--text-secondary)]">Pratica non trovata</p><Button onClick={() => navigate('/practices')} variant="outline" className="mt-4 rounded-lg">Torna alle pratiche</Button></div>;

  const statusCfg = STATUS_MAP[practice.status] || STATUS_MAP.draft;

  return (
    <div className="space-y-5" data-testid="practice-detail-page">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <button onClick={() => navigate('/practices')} className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-2 transition-colors" data-testid="back-btn">
            <ArrowLeft className="w-3.5 h-3.5" />Torna alle pratiche
          </button>
          <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">{practice.practice_type_label}</h1>
          <p className="text-[12px] text-[var(--text-secondary)]">{practice.client_name} &middot; {practice.country}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: statusCfg.color }} data-testid="practice-status-badge">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusCfg.color }} />
            {statusCfg.label}
          </span>
          {practice.status === 'completed' && (
            <Button onClick={handlePdfDownload} disabled={pdfLoading} variant="outline" className="rounded-lg text-[11px] h-8 px-3" style={{ borderColor: 'var(--border-soft)' }} data-testid="download-pdf-btn">
              {pdfLoading ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <FileDown className="w-3 h-3 mr-1.5" />}PDF
            </Button>
          )}
          {isAdmin && (
            <Select value={practice.status} onValueChange={(v) => setShowStatusDialog({ open: true, status: v })}>
              <SelectTrigger className="w-36 rounded-lg h-8 text-[11px]" style={{ borderColor: 'var(--border-soft)' }} data-testid="status-select"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="draft">Bozza</SelectItem>
                <SelectItem value="in_progress">In Elaborazione</SelectItem>
                <SelectItem value="waiting_approval">Approvazione</SelectItem>
                <SelectItem value="completed">Completata</SelectItem>
                <SelectItem value="blocked">Bloccata</SelectItem>
                <SelectItem value="rejected">Rifiutata</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* ── MAIN ACTION (dynamic based on state) ── */}
      {isWaitingApproval && orchestration && (
        <div className="bg-white rounded-xl border-2 border-amber-200 p-5" data-testid="approval-gate">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-[13px] font-bold text-[var(--text-primary)]">Approvazione Richiesta</p>
              <p className="text-[10px] text-[var(--text-secondary)]">Verifica il riepilogo e approva per procedere</p>
            </div>
          </div>
          {orchestration.admin_summary && (
            <div className="p-3 bg-[var(--bg-app)] rounded-lg border text-[12px] text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto mb-4" style={{ borderColor: 'var(--border-soft)' }} data-testid="admin-summary">
              {orchestration.admin_summary}
            </div>
          )}
          <Button onClick={() => setShowApprovalDialog(true)} disabled={approving} className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg h-10 w-full text-[12px] font-semibold" data-testid="approve-practice-btn">
            {approving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Approvazione...</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Approva e Procedi</>}
          </Button>
        </div>
      )}

      {isAbnormal && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${practice.status === 'escalated' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`} data-testid="abnormal-status-banner">
          {practice.status === 'escalated' ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
          <div>
            <p className={`text-[12px] font-semibold ${practice.status === 'escalated' ? 'text-amber-800' : 'text-red-800'}`}>
              {practice.status === 'blocked' ? 'Pratica Bloccata' : practice.status === 'escalated' ? 'Escalation in Corso' : 'Pratica Rifiutata'}
            </p>
            <p className={`text-[10px] ${practice.status === 'escalated' ? 'text-amber-600' : 'text-red-600'}`}>
              {practice.status === 'blocked' ? 'Intervento richiesto per procedere' : practice.status === 'escalated' ? 'Revisione professionale in corso' : 'Rifiutata, azione richiesta'}
            </p>
          </div>
        </div>
      )}

      {/* ── 2 COLUMN LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

        {/* ════ LEFT COLUMN (70%) ════ */}
        <div className="space-y-4">

          {/* Status Timeline */}
          <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="workflow-stepper">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-4">Stato della Pratica</p>
            <div className="flex items-center justify-between gap-1">
              {WORKFLOW_STEPS.map((step, idx) => {
                const isDone = currentIdx > idx;
                const isCurrent = currentIdx === idx && !isAbnormal;
                const StepIcon = step.icon;
                return (
                  <div key={step.key} className="flex items-center flex-1" data-testid={`step-${step.key}`}>
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                        isDone ? 'bg-emerald-50 text-emerald-600' :
                        isCurrent ? 'bg-[var(--surface-accent-1)]/30 text-[var(--text-primary)] ring-2 ring-[var(--surface-accent-1)]' :
                        'bg-[var(--bg-app)] text-[var(--text-muted)]'
                      }`}>
                        {isDone ? <CheckCircle className="w-4 h-4" strokeWidth={2} /> : <StepIcon className="w-3.5 h-3.5" strokeWidth={1.5} />}
                      </div>
                      <p className={`text-[8px] font-semibold mt-1 text-center max-w-[60px] ${isDone || isCurrent ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{step.label}</p>
                    </div>
                    {idx < WORKFLOW_STEPS.length - 1 && (
                      <div className={`h-px flex-1 mx-1.5 ${isDone ? 'bg-emerald-300' : 'bg-[var(--border-soft)]'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agent Pipeline (collapsible) */}
          <AgentPipeline
            practice={practice}
            onRunWorkflow={handleOrchestrate}
            onApprove={() => setShowApprovalDialog(true)}
            orchestrating={orchestrating}
            approving={approving}
          />

          {/* Documents */}
          <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-bold text-[var(--text-primary)]">Documenti</p>
              <label className="cursor-pointer">
                <input type="file" onChange={handleFileSelect} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" data-testid="file-input" />
                <Button variant="outline" className="rounded-lg text-[10px] h-7 px-3" style={{ borderColor: 'var(--border-soft)' }} disabled={uploading} asChild>
                  <span>{uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}Carica</span>
                </Button>
              </label>
            </div>
            {documents.length > 0 ? (
              <div className="space-y-1">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--hover-soft)] transition-colors" data-testid={`document-${doc.id}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <File className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-[var(--text-primary)] truncate">{doc.original_filename}</p>
                        <p className="text-[9px] text-[var(--text-muted)]">{DOC_CATEGORIES.find(c => c.key === doc.category)?.label || ''} &middot; {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: it })}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded"><Download className="w-3 h-3" /></Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed rounded-lg p-5 text-center" style={{ borderColor: 'var(--border-soft)' }}>
                <Upload className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-1.5 opacity-40" strokeWidth={1.5} />
                <p className="text-[11px] text-[var(--text-muted)]">Nessun documento</p>
              </div>
            )}
          </div>

          {/* Agent Logs (expandable) */}
          {practice.agent_logs?.length > 0 && (
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="agent-activity-panel">
              <p className="text-[12px] font-bold text-[var(--text-primary)] mb-3">Attivita degli Agenti</p>
              <div className="space-y-1.5">
                {practice.agent_logs.map((log) => {
                  const ac = getAgentConfig(log.agent_type);
                  const Icon = ac.icon;
                  const isExpanded = expandedLogs[log.id];
                  return (
                    <div key={log.id} className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border-soft)' }} data-testid={`agent-log-${log.id}`}>
                      <button onClick={() => toggleLog(log.id)} className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[var(--hover-soft)] transition-colors text-left">
                        <Icon className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" strokeWidth={1.5} />
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-semibold text-[var(--text-primary)]">{log.branded_name || ac.branded}</span>
                          <p className="text-[9px] text-[var(--text-muted)] truncate">{log.explanation}</p>
                        </div>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${log.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : log.status === 'failed' || log.status === 'error' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                          {log.status === 'completed' ? 'OK' : log.status === 'failed' || log.status === 'error' ? 'Err' : '...'}
                        </span>
                        {isExpanded ? <ChevronUp className="w-3 h-3 text-[var(--text-muted)]" /> : <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />}
                      </button>
                      {isExpanded && log.output_data && (
                        <div className="px-3 pb-3 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                          <div className="mt-2 p-2.5 bg-[var(--bg-app)] rounded-lg text-[11px] text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                            {typeof log.output_data === 'string' ? log.output_data : JSON.stringify(log.output_data, null, 2)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ════ RIGHT COLUMN (30%) ════ */}
        <div className="space-y-4">

          {/* Blockers (only real blockers) */}
          {readiness && readiness.blockers?.length > 0 && (
            <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="readiness-panel">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-red-600 mb-2">Elementi Bloccanti</p>
              {readiness.blockers.map((b, i) => (
                <div key={i} className="flex items-start gap-2 text-[10px] text-red-700 mb-1.5">
                  <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" /><span>{b}</span>
                </div>
              ))}
            </div>
          )}

          {/* AI Suggestions (Guard — max 3) */}
          {guardResult && guardResult.safe_alternatives?.length > 0 && (
            <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="guard-panel">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Suggerimenti AI</p>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ml-auto ${
                  guardResult.verdict === 'cleared' ? 'bg-emerald-50 text-emerald-600' :
                  guardResult.verdict === 'guarded' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                }`} data-testid="guard-verdict">{guardResult.verdict_label}</span>
              </div>
              <div className="space-y-2">
                {guardResult.safe_alternatives.slice(0, 3).map((alt, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-[var(--bg-app)] border" style={{ borderColor: 'var(--border-soft)' }} data-testid={`guard-alt-${i}`}>
                    <p className="text-[10px] font-semibold text-[var(--text-primary)]">{alt.label}</p>
                    <p className="text-[9px] text-[var(--text-secondary)] mt-0.5">{alt.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Q&A Chat */}
          <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="practice-chat">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Chiedi a Herion</p>
            </div>
            <ScrollArea className="h-[200px] mb-3">
              <div className="space-y-2 pr-2">
                {chatHistory.length === 0 && !chatLoading && (
                  <div className="text-center py-4">
                    <p className="text-[10px] text-[var(--text-muted)] mb-2">Fai una domanda sulla pratica</p>
                    {['Stato attuale?', 'Documenti mancanti?', 'Prossimo passo?'].map((q, i) => (
                      <button key={i} onClick={() => setChatQuestion(q)} className="block w-full text-left text-[10px] text-[var(--text-primary)] p-2 bg-[var(--hover-soft)] rounded-lg hover:bg-[var(--surface-accent-1)]/20 transition-colors mb-1" data-testid={`chat-suggestion-${i}`}>{q}</button>
                    ))}
                  </div>
                )}
                {chatHistory.map(msg => (
                  <div key={msg.id}>
                    <div className="flex justify-end mb-1"><div className="bg-[var(--text-primary)] text-white px-2.5 py-1.5 rounded-lg text-[10px] max-w-[85%]">{msg.question}</div></div>
                    <div className="flex gap-1.5 mb-1">
                      <div className="w-5 h-5 rounded bg-[var(--surface-accent-1)]/20 flex items-center justify-center flex-shrink-0 mt-0.5"><Bot className="w-3 h-3 text-[var(--text-secondary)]" /></div>
                      <div className="bg-[var(--bg-app)] border px-2.5 py-1.5 rounded-lg text-[10px] text-[var(--text-primary)] max-w-[85%] whitespace-pre-wrap" style={{ borderColor: 'var(--border-soft)' }}>
                        <p className="text-[8px] font-bold text-[var(--text-muted)] mb-0.5">{msg.answered_by}</p>
                        {msg.answer}
                      </div>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-1.5"><div className="w-5 h-5 rounded bg-[var(--surface-accent-1)]/20 flex items-center justify-center flex-shrink-0"><Bot className="w-3 h-3" /></div>
                    <div className="bg-[var(--bg-app)] border px-2.5 py-1.5 rounded-lg text-[10px]" style={{ borderColor: 'var(--border-soft)' }}><Loader2 className="w-3 h-3 animate-spin text-[var(--text-secondary)]" /></div></div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>
            <form onSubmit={handleChat} className="flex gap-1.5">
              <Input value={chatQuestion} onChange={e => setChatQuestion(e.target.value)} placeholder="Domanda..." className="rounded-lg h-8 text-[10px] flex-1" style={{ borderColor: 'var(--border-soft)' }} disabled={chatLoading} data-testid="chat-input" />
              <Button type="submit" size="sm" disabled={chatLoading || !chatQuestion.trim()} className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg h-8 w-8 p-0" data-testid="chat-send-btn"><Send className="w-3 h-3" /></Button>
            </form>
          </div>

          {/* Timeline */}
          {timeline.length > 0 && (
            <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="practice-timeline">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-3">Cronologia</p>
              <ScrollArea className="h-[180px]">
                <div className="space-y-2">
                  {timeline.map((event, i) => {
                    const Icon = TIMELINE_ICONS[event.event_type] || CircleDot;
                    return (
                      <div key={event.id} className="flex items-start gap-2">
                        <Icon className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium text-[var(--text-primary)]">{event.event_label}</p>
                          <p className="text-[9px] text-[var(--text-muted)]">{format(new Date(event.timestamp), 'dd MMM, HH:mm', { locale: it })}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Activity Log (collapsed by default) */}
          <div className="bg-white rounded-xl border" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }}>
            <button onClick={() => setShowActivity(!showActivity)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--hover-soft)] transition-colors" data-testid="activity-toggle">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Registro Attivita</p>
              {showActivity ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
            </button>
            {showActivity && (
              <div className="border-t px-4 pb-3" style={{ borderColor: 'var(--border-soft)' }}>
                <ScrollArea className="h-[160px] mt-2">
                  {activityLogs.length > 0 ? activityLogs.map(log => (
                    <div key={log.id} className="py-1.5">
                      <p className="text-[10px] font-medium text-[var(--text-primary)] capitalize">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-[9px] text-[var(--text-muted)]">{format(new Date(log.timestamp), 'dd MMM, HH:mm', { locale: it })}</p>
                    </div>
                  )) : <p className="text-[10px] text-[var(--text-muted)] text-center py-4">Nessuna attivita</p>}
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── DIALOGS ── */}
      <AlertDialog open={showStatusDialog.open} onOpenChange={o => setShowStatusDialog({ open: o, status: '' })}>
        <AlertDialogContent className="rounded-xl shadow-xl max-w-sm" style={{ borderColor: 'var(--border-soft)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-center">Cambia stato</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[var(--text-secondary)] text-[12px]">Questa azione verra registrata.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2"><AlertDialogCancel className="rounded-lg flex-1 text-[12px]">Annulla</AlertDialogCancel><AlertDialogAction onClick={handleStatusChange} className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg flex-1 text-[12px]">Conferma</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showAgentDialog} onOpenChange={setShowAgentDialog}>
        <AlertDialogContent className="rounded-xl shadow-xl max-w-sm" style={{ borderColor: 'var(--border-soft)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-center">Esegui Agente</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[var(--text-secondary)] text-[12px]">Agente: <span className="font-medium">{BRANDED_AGENTS.find(a => a.type === selectedAgent)?.branded}</span></AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2"><AlertDialogCancel className="rounded-lg flex-1 text-[12px]">Annulla</AlertDialogCancel><AlertDialogAction onClick={handleAgentExecute} className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg flex-1 text-[12px]">Esegui</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <AlertDialogContent className="rounded-xl shadow-xl max-w-md" style={{ borderColor: 'var(--border-soft)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-center">Conferma Approvazione</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[var(--text-secondary)] text-[12px]">
              Confermando, autorizzi l'invio della pratica <span className="font-semibold text-[var(--text-primary)]">{practice.practice_type_label}</span> per <span className="font-semibold text-[var(--text-primary)]">{practice.client_name}</span>. Azione non reversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-lg flex-1 text-[12px]">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg flex-1 text-[12px]" data-testid="confirm-approve-btn">Approva</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <AlertDialogContent className="rounded-xl shadow-xl max-w-sm" style={{ borderColor: 'var(--border-soft)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-center">Carica documento</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[var(--text-secondary)] text-[12px]">File: <span className="font-medium text-[var(--text-primary)]">{pendingFile?.name}</span></AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Categoria</label>
            <Select value={uploadCategory} onValueChange={setUploadCategory}>
              <SelectTrigger className="rounded-lg h-9 text-[12px] mt-1.5" style={{ borderColor: 'var(--border-soft)' }}><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-lg">{DOC_CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <AlertDialogFooter className="gap-2"><AlertDialogCancel className="rounded-lg flex-1 text-[12px]">Annulla</AlertDialogCancel><AlertDialogAction onClick={handleFileUpload} className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg flex-1 text-[12px]">Carica</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
