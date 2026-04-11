import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPractice, updatePractice, uploadDocument, getPracticeDocuments,
  orchestrateAgents, sendPracticeChat, getPracticeChatHistory,
  approvePractice, getPracticeTimeline, startPractice,
  markPracticeSubmitted, markPracticeCompleted, downloadPracticePdf,
  getPracticeActivityLogs
} from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  ArrowLeft, Upload, CheckCircle, Play, Loader2, File, Download,
  AlertTriangle, FileDown, Send, Bot, ChevronDown, ChevronUp,
  Lock, Shield, RefreshCw, ExternalLink, Eye, FileText, Pen,
  BookOpen, FolderUp, Cog, ClipboardCheck, PenTool, Flag,
  Circle, XCircle, Info, ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

// ── 6-STEP FLOW DEFINITION ──
const PRACTICE_STEPS = [
  { key: 'understand', label: 'Comprendi', icon: BookOpen, description: 'Capire la pratica' },
  { key: 'upload', label: 'Carica', icon: FolderUp, description: 'Caricare i documenti' },
  { key: 'process', label: 'Elabora', icon: Cog, description: 'Herion analizza' },
  { key: 'review', label: 'Verifica', icon: ClipboardCheck, description: 'Verificare i risultati' },
  { key: 'sign', label: 'Firma', icon: PenTool, description: 'Firmare se necessario' },
  { key: 'complete', label: 'Completa', icon: Flag, description: 'Invio e chiusura' },
];

// ── DOCUMENT CATEGORIES FOR CLARITY ──
const DOC_UPLOAD_CATEGORIES = [
  { key: 'identity', label: 'Identita' }, { key: 'tax_declarations', label: 'Dichiarazioni' },
  { key: 'vat_documents', label: 'IVA' }, { key: 'invoices', label: 'Fatture' },
  { key: 'company_documents', label: 'Societari' }, { key: 'accounting', label: 'Contabili' },
  { key: 'compliance', label: 'Conformita' }, { key: 'payroll', label: 'Lavoro' },
  { key: 'activity', label: 'Attivita' }, { key: 'other', label: 'Altro' },
];

// ── STATUS DISPLAY (user-facing, simple) ──
const STATUS_DISPLAY = {
  draft: { label: 'Non iniziata', color: '#5B6475' },
  waiting_user_documents: { label: 'In attesa dei tuoi documenti', color: '#F59E0B' },
  documents_received: { label: 'Documenti ricevuti', color: '#3B82F6' },
  internal_processing: { label: 'In revisione da Herion', color: '#3B82F6' },
  internal_validation_passed: { label: 'Revisione completata', color: '#10B981' },
  internal_validation_failed: { label: 'Problemi trovati', color: '#EF4444' },
  waiting_user_review: { label: 'In attesa della tua verifica', color: '#F59E0B' },
  waiting_signature: { label: 'In attesa della tua firma', color: '#F59E0B' },
  ready_for_submission: { label: "Pronta per l'invio", color: '#06B6D4' },
  submitted_manually: { label: 'Inviata', color: '#06B6D4' },
  submitted_via_channel: { label: 'Inviata', color: '#06B6D4' },
  waiting_external_response: { label: 'In attesa risposta ente', color: '#8B5CF6' },
  accepted_by_entity: { label: "Accettata dall'ente", color: '#10B981' },
  rejected_by_entity: { label: "Rifiutata dall'ente", color: '#EF4444' },
  completed: { label: 'Completata', color: '#10B981' },
  blocked: { label: 'Bloccata', color: '#EF4444' },
  // Legacy
  pending: { label: 'In attesa', color: '#F59E0B' },
  in_progress: { label: 'In elaborazione', color: '#3B82F6' },
  processing: { label: 'In elaborazione', color: '#3B82F6' },
  waiting_approval: { label: 'In attesa della tua verifica', color: '#F59E0B' },
  approved: { label: 'Approvata', color: '#10B981' },
  submitted: { label: 'Inviata', color: '#06B6D4' },
  escalated: { label: 'Escalation', color: '#EF4444' },
  rejected: { label: 'Rifiutata', color: '#EF4444' },
};

const PRIORITY_BADGE = {
  urgent: { label: 'Urgente', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  high: { label: 'Alta', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  normal: { label: 'Normale', bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-400' },
  low: { label: 'Bassa', bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-300' },
};

// Maps status to step index (0-5)
function getStepIndex(status) {
  const map = {
    draft: 0,
    waiting_user_documents: 1, documents_received: 1,
    internal_processing: 2, in_progress: 2, processing: 2,
    internal_validation_passed: 3, internal_validation_failed: 3,
    waiting_user_review: 3, waiting_approval: 3,
    waiting_signature: 4,
    ready_for_submission: 5, submitted_manually: 5, submitted_via_channel: 5,
    waiting_external_response: 5, accepted_by_entity: 5, rejected_by_entity: 5,
    completed: 5, approved: 5, submitted: 5,
    blocked: -1, escalated: -1, rejected: -1, pending: 1,
  };
  return map[status] ?? 0;
}


export default function PracticeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const chatEndRef = useRef(null);

  const [practice, setPractice] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [orchestrating, setOrchestrating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [uploadCategory, setUploadCategory] = useState('other');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState({ open: false, status: '' });
  const [showAgentLogs, setShowAgentLogs] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [p, d, c, t] = await Promise.all([
        getPractice(id), getPracticeDocuments(id),
        getPracticeChatHistory(id), getPracticeTimeline(id)
      ]);
      setPractice(p.data);
      setDocuments(d.data);
      setChatHistory(c.data.reverse());
      setTimeline(t.data);
    } catch (e) { console.warn('Load failed:', e?.message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── ACTIONS ──
  const handleStart = async () => {
    try {
      await startPractice(id);
      toast.success('Pratica avviata');
      loadData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Errore'); }
  };

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingFile(f);
    setShowUploadDialog(true);
  };

  const handleFileUpload = async () => {
    if (!pendingFile) return;
    setShowUploadDialog(false);
    setUploading(true);
    try {
      await uploadDocument(id, pendingFile, uploadCategory);
      toast.success('Documento caricato');
      loadData();
    } catch { toast.error('Errore nel caricamento'); }
    finally { setUploading(false); setPendingFile(null); setUploadCategory('other'); }
  };

  const handleOrchestrate = async () => {
    setOrchestrating(true);
    try {
      await orchestrateAgents(id, 'Analisi completa della pratica');
      toast.success('Analisi completata');
      loadData();
    } catch (e) { toast.error(e.response?.data?.detail || "Errore nell'elaborazione"); }
    finally { setOrchestrating(false); }
  };

  const handleApprove = async () => {
    setShowApprovalDialog(false);
    setApproving(true);
    try {
      await approvePractice(id);
      toast.success('Pratica approvata');
      loadData();
    } catch (e) { toast.error(e.response?.data?.detail || "Errore nell'approvazione"); }
    finally { setApproving(false); }
  };

  const handleMarkSubmitted = async (type = 'manual') => {
    setShowSubmitDialog(false);
    setSubmitting(true);
    try {
      await markPracticeSubmitted(id, type);
      toast.success('Invio confermato');
      loadData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Errore'); }
    finally { setSubmitting(false); }
  };

  const handleMarkCompleted = async () => {
    try {
      await markPracticeCompleted(id);
      toast.success('Pratica completata');
      loadData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Errore'); }
  };

  const handlePdfDownload = async () => {
    setPdfLoading(true);
    try {
      const response = await downloadPracticePdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Herion_Pratica_${id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF scaricato');
    } catch { toast.error('Errore nel download'); }
    finally { setPdfLoading(false); }
  };

  const handleStatusChange = async () => {
    const s = showStatusDialog.status;
    setShowStatusDialog({ open: false, status: '' });
    try {
      await updatePractice(id, { status: s });
      toast.success('Stato aggiornato');
      loadData();
    } catch { toast.error("Errore nell'aggiornamento"); }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatQuestion.trim() || chatLoading) return;
    const q = chatQuestion.trim();
    setChatQuestion('');
    setChatLoading(true);
    try {
      const res = await sendPracticeChat(id, q);
      setChatHistory(prev => [...prev, res.data]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { toast.error('Errore nella risposta'); }
    finally { setChatLoading(false); }
  };

  // ── DERIVED STATE ──
  const isAdmin = user?.role === 'admin' || user?.role === 'creator';
  const status = practice?.status || 'draft';
  const stepIdx = getStepIndex(status);
  const isBlocked = stepIdx === -1;
  const statusCfg = STATUS_DISPLAY[status] || STATUS_DISPLAY.draft;
  const pCfg = PRIORITY_BADGE[practice?.priority] || PRIORITY_BADGE.normal;
  const catalog = practice?.catalog_info;
  const channel = practice?.channel_info;
  const orchestration = practice?.orchestration_result;

  // Determine what user needs to do now
  const canStart = status === 'draft';
  const canUpload = ['waiting_user_documents', 'documents_received', 'draft'].includes(status);
  const canRunAgents = ['waiting_user_documents', 'documents_received'].includes(status) ||
    (status === 'draft' && documents.length > 0);
  const canApprove = ['waiting_user_review', 'waiting_approval'].includes(status);
  const canSubmit = status === 'ready_for_submission';
  const canComplete = ['submitted_manually', 'submitted_via_channel', 'waiting_external_response'].includes(status);
  const isDone = ['completed', 'accepted_by_entity'].includes(status);

  // Required docs from catalog
  const requiredDocKeys = catalog?.required_documents || [];
  const uploadedCategories = [...new Set(documents.map(d => d.category))];
  const missingDocs = requiredDocKeys.filter(k => !uploadedCategories.includes(k));
  const DOC_KEY_LABELS = {
    identity: 'Documento di identita', tax_declarations: 'Dichiarazioni fiscali',
    vat_documents: 'Documenti IVA', invoices: 'Fatture',
    company_documents: 'Documenti societari', accounting: 'Documenti contabili',
    compliance: 'Conformita', payroll: 'Buste paga', activity: 'Attivita',
    practice_documents: 'Documenti pratica', tax: 'Documenti fiscali',
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-5 h-5 animate-spin text-[var(--text-muted)]" />
    </div>
  );

  if (!practice) return (
    <div className="text-center py-16">
      <p className="text-[var(--text-secondary)]">Pratica non trovata</p>
      <Button onClick={() => navigate('/practices')} variant="outline" className="mt-4 rounded-lg">
        Torna alle pratiche
      </Button>
    </div>
  );

  return (
    <div className="space-y-5" data-testid="practice-detail-page">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <button
            onClick={() => navigate('/practices')}
            className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-2 transition-colors"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-3.5 h-3.5" />Torna alle pratiche
          </button>
          <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
            {practice.practice_type_label}
          </h1>
          <p className="text-[12px] text-[var(--text-secondary)]">
            {practice.client_name} &middot; {practice.country}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${pCfg.bg} ${pCfg.text}`} data-testid="practice-priority-badge">
            <span className={`w-1.5 h-1.5 rounded-full ${pCfg.dot}`} />{pCfg.label}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: statusCfg.color }} data-testid="practice-status-badge">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusCfg.color }} />
            {statusCfg.label}
          </span>
          {isDone && (
            <Button onClick={handlePdfDownload} disabled={pdfLoading} variant="outline" className="rounded-lg text-[11px] h-8 px-3" data-testid="download-pdf-btn">
              {pdfLoading ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <FileDown className="w-3 h-3 mr-1.5" />}PDF
            </Button>
          )}
          {isAdmin && (
            <Select value={status} onValueChange={(v) => setShowStatusDialog({ open: true, status: v })}>
              <SelectTrigger className="w-40 rounded-lg h-8 text-[11px]" style={{ borderColor: 'var(--border-soft)' }} data-testid="status-select"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-lg text-[11px]">
                <SelectItem value="draft">Bozza</SelectItem>
                <SelectItem value="waiting_user_documents">Attesa documenti</SelectItem>
                <SelectItem value="internal_processing">Elaborazione</SelectItem>
                <SelectItem value="waiting_user_review">Attesa verifica</SelectItem>
                <SelectItem value="ready_for_submission">Pronta invio</SelectItem>
                <SelectItem value="completed">Completata</SelectItem>
                <SelectItem value="blocked">Bloccata</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* ── 6-STEP PROGRESS BAR ── */}
      <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="step-progress">
        <div className="flex items-center justify-between gap-1">
          {PRACTICE_STEPS.map((step, idx) => {
            const isDone = stepIdx > idx;
            const isCurrent = stepIdx === idx && !isBlocked;
            const StepIcon = step.icon;
            return (
              <div key={step.key} className="flex items-center flex-1" data-testid={`step-${step.key}`}>
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    isDone ? 'bg-emerald-50 text-emerald-600' :
                    isCurrent ? 'bg-[#0ABFCF]/10 text-[#0ABFCF] ring-2 ring-[#0ABFCF]/30' :
                    'bg-[var(--bg-app)] text-[var(--text-muted)]'
                  }`}>
                    {isDone ? <CheckCircle className="w-4 h-4" strokeWidth={2} /> : <StepIcon className="w-4 h-4" strokeWidth={1.5} />}
                  </div>
                  <p className={`text-[9px] font-semibold mt-1.5 text-center max-w-[60px] leading-tight ${
                    isDone ? 'text-emerald-600' : isCurrent ? 'text-[#0ABFCF]' : 'text-[var(--text-muted)]'
                  }`}>{step.label}</p>
                </div>
                {idx < PRACTICE_STEPS.length - 1 && (
                  <div className={`h-px flex-1 mx-1.5 ${isDone ? 'bg-emerald-300' : 'bg-[var(--border-soft)]'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BLOCKED BANNER ── */}
      {isBlocked && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200" data-testid="blocked-banner">
          <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[12px] font-semibold text-red-800">Pratica bloccata</p>
            <p className="text-[11px] text-red-600 mt-0.5">Questa pratica richiede un intervento prima di procedere. Leggi il riepilogo qui sotto o chiedi a Herion per assistenza.</p>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

        {/* ════ LEFT COLUMN ════ */}
        <div className="space-y-4">

          {/* ── STEP 0: UNDERSTANDING GATE (draft) ── */}
          {canStart && (
            <UnderstandingGate
              practice={practice}
              catalog={catalog}
              channel={channel}
              onStart={handleStart}
            />
          )}

          {/* ── GUIDANCE: What to do now ── */}
          {!canStart && (
            <GuidanceCard status={status} practice={practice} channel={channel} catalog={catalog} missingDocs={missingDocs} docLabels={DOC_KEY_LABELS} />
          )}

          {/* ── DOCUMENTS SECTION ── */}
          {!canStart && (
            <DocumentSection
              documents={documents}
              missingDocs={missingDocs}
              docLabels={DOC_KEY_LABELS}
              canUpload={canUpload}
              uploading={uploading}
              onFileSelect={handleFileSelect}
              catalog={catalog}
            />
          )}

          {/* ── OFFICIAL CHANNEL CARD ── */}
          {!canStart && channel && (
            <ChannelCard channel={channel} catalog={catalog} status={status} />
          )}

          {/* ── AGENT RESULTS / REVIEW ── */}
          {canApprove && orchestration && (
            <div className="bg-white rounded-xl border-2 border-amber-200 p-5" data-testid="review-gate">
              <div className="flex items-center gap-3 mb-4">
                <ClipboardCheck className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-[13px] font-bold text-[var(--text-primary)]">La tua verifica e richiesta</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">Herion ha completato l'analisi. Leggi il riepilogo e approva per procedere.</p>
                </div>
              </div>
              {orchestration.admin_summary && (
                <div className="p-3 bg-[var(--bg-app)] rounded-lg border text-[12px] text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto mb-4" style={{ borderColor: 'var(--border-soft)' }} data-testid="admin-summary">
                  {orchestration.admin_summary}
                </div>
              )}
              <Button
                onClick={() => setShowApprovalDialog(true)}
                disabled={approving}
                className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg h-10 w-full text-[12px] font-semibold"
                data-testid="approve-practice-btn"
              >
                {approving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Approvazione...</> : <><CheckCircle className="w-4 h-4 mr-2" />Approva e Procedi</>}
              </Button>
            </div>
          )}

          {/* ── SUBMISSION ACTION ── */}
          {canSubmit && (
            <div className="bg-white rounded-xl border-2 border-[#0ABFCF]/30 p-5" data-testid="submission-gate">
              <div className="flex items-center gap-3 mb-3">
                <Flag className="w-5 h-5 text-[#0ABFCF]" />
                <div>
                  <p className="text-[13px] font-bold text-[var(--text-primary)]">Pronta per l'invio</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    {channel?.auto_submission === false
                      ? "Devi inviare questa pratica tu stesso all'ente competente."
                      : "La pratica e pronta. Conferma l'invio."
                    }
                  </p>
                </div>
              </div>
              {channel?.portal_url && (
                <a
                  href={channel.portal_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-[var(--bg-soft)] rounded-lg border mb-3 hover:bg-[var(--hover-soft)] transition-colors"
                  style={{ borderColor: 'var(--border-soft)' }}
                  data-testid="portal-link"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#0ABFCF] flex-shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--text-primary)]">{channel.name}</p>
                    <p className="text-[9px] text-[var(--text-muted)] truncate">{channel.portal_url}</p>
                  </div>
                </a>
              )}
              <Button
                onClick={() => setShowSubmitDialog(true)}
                disabled={submitting}
                className="bg-[#0ABFCF] hover:bg-[#09a8b6] rounded-lg h-10 w-full text-[12px] font-semibold text-white"
                data-testid="mark-submitted-btn"
              >
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Confermando...</> : <><Send className="w-4 h-4 mr-2" />Ho inviato la pratica</>}
              </Button>
            </div>
          )}

          {/* ── COMPLETION ACTION ── */}
          {canComplete && (
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="completion-gate">
              <div className="flex items-center gap-3 mb-3">
                <Flag className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-[13px] font-bold text-[var(--text-primary)]">In attesa di conferma</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">Quando l'ente conferma la ricezione o l'accettazione, chiudi la pratica.</p>
                </div>
              </div>
              <Button
                onClick={handleMarkCompleted}
                variant="outline"
                className="rounded-lg h-9 text-[11px] font-semibold"
                data-testid="mark-completed-btn"
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />Conferma completamento
              </Button>
            </div>
          )}

          {/* ── RUN AGENTS ACTION (when documents uploaded) ── */}
          {canRunAgents && documents.length > 0 && !orchestration && (
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="run-agents-card">
              <div className="flex items-center gap-3 mb-3">
                <Cog className="w-5 h-5 text-[var(--text-muted)]" />
                <div>
                  <p className="text-[13px] font-bold text-[var(--text-primary)]">Avvia l'analisi di Herion</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    {missingDocs.length > 0
                      ? `${missingDocs.length} documenti mancanti. Puoi procedere, ma l'analisi potrebbe essere incompleta.`
                      : 'Tutti i documenti richiesti sono presenti. Puoi avviare l\'analisi.'
                    }
                  </p>
                </div>
              </div>
              <Button
                onClick={handleOrchestrate}
                disabled={orchestrating}
                className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg h-10 w-full text-[12px] font-semibold"
                data-testid="run-workflow-btn"
              >
                {orchestrating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analisi in corso...</> : <><Play className="w-4 h-4 mr-2" />Avvia Analisi Herion</>}
              </Button>
            </div>
          )}

          {/* ── AGENT LOGS (collapsed by default) ── */}
          {practice.agent_logs?.length > 0 && (
            <div className="bg-white rounded-xl border" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }}>
              <button
                onClick={() => setShowAgentLogs(!showAgentLogs)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--hover-soft)] transition-colors"
                data-testid="agent-logs-toggle"
              >
                <div className="flex items-center gap-2">
                  <Bot className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <p className="text-[11px] font-bold text-[var(--text-primary)]">Dettaglio attivita agenti</p>
                  <span className="text-[9px] font-bold text-[var(--text-muted)] bg-[var(--bg-app)] px-1.5 py-0.5 rounded-full">{practice.agent_logs.length}</span>
                </div>
                {showAgentLogs ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
              </button>
              {showAgentLogs && (
                <div className="border-t px-5 py-3 space-y-1.5" style={{ borderColor: 'var(--border-soft)' }}>
                  {practice.agent_logs.map((log) => (
                    <div key={log.id} className="flex items-center gap-2.5 py-1.5" data-testid={`agent-log-${log.id}`}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                        log.status === 'completed' ? 'bg-emerald-50' : 'bg-red-50'
                      }`}>
                        {log.status === 'completed'
                          ? <CheckCircle className="w-3 h-3 text-emerald-500" />
                          : <XCircle className="w-3 h-3 text-red-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-[var(--text-primary)]">{log.branded_name || log.agent_type}</p>
                        <p className="text-[9px] text-[var(--text-muted)] truncate">{log.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── COMPLETED STATE ── */}
          {isDone && (
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5 text-center" data-testid="completed-card">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-[14px] font-bold text-emerald-800">Pratica completata</p>
              <p className="text-[11px] text-emerald-600 mt-1">Questa pratica e stata conclusa con successo.</p>
            </div>
          )}
        </div>

        {/* ════ RIGHT COLUMN ════ */}
        <div className="space-y-4">

          {/* ── CHAT ── */}
          <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="practice-chat">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Chiedi a Herion</p>
            </div>
            <ScrollArea className="h-[200px] mb-3">
              <div className="space-y-2 pr-2">
                {chatHistory.length === 0 && !chatLoading && (
                  <div className="text-center py-4">
                    <p className="text-[11px] text-[var(--text-secondary)] mb-1">Hai domande sulla pratica?</p>
                    <p className="text-[10px] text-[var(--text-muted)] mb-3">Chiedi e riceverai una risposta chiara</p>
                    {['Cosa devo fare adesso?', 'Manca qualcosa?', 'Qual e lo stato?'].map((q, i) => (
                      <button key={i} onClick={() => setChatQuestion(q)} className="block w-full text-left text-[11px] text-[var(--text-primary)] p-2.5 bg-[var(--hover-soft)] rounded-lg hover:bg-[#0ABFCF]/10 transition-colors mb-1.5" data-testid={`chat-suggestion-${i}`}>{q}</button>
                    ))}
                  </div>
                )}
                {chatHistory.map(msg => (
                  <div key={msg.id}>
                    <div className="flex justify-end mb-1">
                      <div className="bg-[var(--text-primary)] text-white px-2.5 py-1.5 rounded-lg text-[10px] max-w-[85%]">{msg.question}</div>
                    </div>
                    <div className="flex gap-1.5 mb-1">
                      <div className="w-5 h-5 rounded bg-[#0ABFCF]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-3 h-3 text-[var(--text-secondary)]" />
                      </div>
                      <div className="bg-[var(--bg-app)] border px-2.5 py-1.5 rounded-lg text-[10px] text-[var(--text-primary)] max-w-[85%] whitespace-pre-wrap" style={{ borderColor: 'var(--border-soft)' }}>
                        {msg.answer}
                      </div>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-1.5">
                    <div className="w-5 h-5 rounded bg-[#0ABFCF]/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3 h-3" />
                    </div>
                    <div className="bg-[var(--bg-app)] border px-2.5 py-1.5 rounded-lg" style={{ borderColor: 'var(--border-soft)' }}>
                      <Loader2 className="w-3 h-3 animate-spin text-[var(--text-secondary)]" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>
            <form onSubmit={handleChat} className="flex gap-1.5">
              <Input
                value={chatQuestion}
                onChange={e => setChatQuestion(e.target.value)}
                placeholder="Domanda..."
                className="rounded-lg h-8 text-[10px] flex-1"
                style={{ borderColor: 'var(--border-soft)' }}
                disabled={chatLoading}
                data-testid="chat-input"
              />
              <Button type="submit" size="sm" disabled={chatLoading || !chatQuestion.trim()} className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg h-8 w-8 p-0" data-testid="chat-send-btn">
                <Send className="w-3 h-3" />
              </Button>
            </form>
          </div>

          {/* ── TIMELINE ── */}
          {timeline.length > 0 && (
            <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="practice-timeline">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-3">Cronologia</p>
              <ScrollArea className="h-[180px]">
                <div className="space-y-2">
                  {timeline.map((event) => (
                    <div key={event.id} className="flex items-start gap-2">
                      <Circle className="w-2.5 h-2.5 text-[var(--text-muted)] flex-shrink-0 mt-1" fill="currentColor" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium text-[var(--text-primary)]">{event.event_label}</p>
                        <p className="text-[9px] text-[var(--text-muted)]">{format(new Date(event.timestamp), 'dd MMM, HH:mm', { locale: it })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* ── DIALOGS ── */}
      <AlertDialog open={showStatusDialog.open} onOpenChange={o => setShowStatusDialog({ open: o, status: '' })}>
        <AlertDialogContent className="rounded-xl shadow-xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-center">Cambia stato</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[12px]">Questa azione verra registrata.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-lg flex-1 text-[12px]">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusChange} className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg flex-1 text-[12px]">Conferma</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <AlertDialogContent className="rounded-xl shadow-xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-center">Conferma Approvazione</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[12px]">
              Confermando, autorizzi Herion a procedere con <span className="font-semibold text-[var(--text-primary)]">{practice.practice_type_label}</span> per <span className="font-semibold text-[var(--text-primary)]">{practice.client_name}</span>.
              {channel?.auto_submission === false && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Nota: l'invio ufficiale dovra essere effettuato da te sul portale dell'ente.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-lg flex-1 text-[12px]">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg flex-1 text-[12px]" data-testid="confirm-approve-btn">Approva</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="rounded-xl shadow-xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-center">Conferma Invio</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[12px]">
              Confermi di aver inviato la pratica all'ente competente?
              <span className="block mt-2 text-[var(--text-muted)]">
                Questa azione registra che hai completato l'invio. Non e reversibile.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-lg flex-1 text-[12px]">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleMarkSubmitted('manual')} className="bg-[#0ABFCF] hover:bg-[#09a8b6] rounded-lg flex-1 text-[12px] text-white" data-testid="confirm-submit-btn">Confermo l'invio</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <AlertDialogContent className="rounded-xl shadow-xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-center">Carica documento</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[12px]">
              File: <span className="font-medium text-[var(--text-primary)]">{pendingFile?.name}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Categoria</label>
            <Select value={uploadCategory} onValueChange={setUploadCategory}>
              <SelectTrigger className="rounded-lg h-9 text-[12px] mt-1.5" style={{ borderColor: 'var(--border-soft)' }}><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-lg">
                {DOC_UPLOAD_CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-lg flex-1 text-[12px]">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleFileUpload} className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg flex-1 text-[12px]">Carica</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


// ═══════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════

function UnderstandingGate({ practice, catalog, channel, onStart }) {
  const requiredDocs = catalog?.required_documents || [];
  const DOC_LABELS = {
    identity: 'Documento di identita', tax_declarations: 'Dichiarazioni fiscali',
    vat_documents: 'Documenti IVA', invoices: 'Fatture',
    company_documents: 'Documenti societari', accounting: 'Documenti contabili',
    compliance: 'Conformita', payroll: 'Buste paga', tax: 'Documenti fiscali',
    practice_documents: 'Documenti pratica',
  };

  return (
    <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="understanding-gate">
      <div className="flex items-center gap-3 mb-4">
        <BookOpen className="w-5 h-5 text-[#0ABFCF]" />
        <h2 className="text-[14px] font-bold text-[var(--text-primary)]">Prima di iniziare</h2>
      </div>

      {/* What is this practice */}
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Cos'e questa pratica</p>
        <p className="text-[12px] text-[var(--text-primary)] leading-relaxed">
          {catalog?.user_explanation || practice.description || 'Pratica fiscale/amministrativa.'}
        </p>
      </div>

      {/* Required documents */}
      {requiredDocs.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Documenti necessari</p>
          <div className="space-y-1">
            {requiredDocs.map((doc, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <div className="w-4 h-4 rounded bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-2.5 h-2.5 text-amber-600" />
                </div>
                <p className="text-[11px] text-[var(--text-primary)]">{DOC_LABELS[doc] || doc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How the flow works */}
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Come funziona</p>
        <div className="space-y-1.5">
          {[
            'Carichi i documenti richiesti',
            'Herion analizza e verifica tutto automaticamente',
            'Tu verifichi il risultato e approvi',
            channel?.auto_submission === false
              ? "Invii la pratica all'ente competente"
              : 'La pratica viene completata',
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[var(--bg-app)] text-[9px] font-bold text-[var(--text-muted)] flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <p className="text-[11px] text-[var(--text-secondary)]">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Where it goes */}
      {channel && (
        <div className="mb-5 p-3 bg-[var(--bg-soft)] rounded-lg">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Destinazione</p>
          <p className="text-[11px] font-semibold text-[var(--text-primary)]">{channel.name}</p>
          {channel.required_channel && channel.required_channel !== 'preparation_only' && (
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              Canale: {channel.required_channel === 'official_portal' ? 'Portale ufficiale' : channel.required_channel === 'PEC' ? 'PEC' : channel.required_channel}
            </p>
          )}
          {channel.auto_submission === false && (
            <p className="text-[10px] text-amber-600 font-medium mt-0.5">
              L'invio ufficiale dovra essere effettuato da te.
            </p>
          )}
        </div>
      )}

      {/* CTA */}
      <Button
        onClick={onStart}
        className="bg-[#0ABFCF] hover:bg-[#09a8b6] text-white rounded-xl h-11 w-full text-[13px] font-semibold"
        data-testid="start-practice-btn"
      >
        <Play className="w-4 h-4 mr-2" />Inizia la pratica
      </Button>
    </div>
  );
}


function GuidanceCard({ status, practice, channel, catalog, missingDocs, docLabels }) {
  let title = '';
  let description = '';
  let herionAction = '';
  let isExternal = false;
  let bgClass = 'bg-[var(--bg-soft)]';

  switch (status) {
    case 'waiting_user_documents':
    case 'documents_received':
      title = 'Carica i documenti necessari';
      description = missingDocs.length > 0
        ? `Mancano ${missingDocs.length} documenti: ${missingDocs.map(d => docLabels[d] || d).join(', ')}.`
        : 'Tutti i documenti richiesti sono presenti. Puoi avviare l\'analisi.';
      herionAction = 'Dopo il caricamento, Herion analizze tutto automaticamente.';
      bgClass = missingDocs.length > 0 ? 'bg-amber-50/50' : 'bg-emerald-50/50';
      break;
    case 'internal_processing':
    case 'in_progress':
    case 'processing':
      title = 'Herion sta analizzando la pratica';
      description = 'Gli agenti specializzati stanno verificando documenti, conformita e requisiti.';
      herionAction = 'Al termine, ti chiederemo di verificare il risultato.';
      bgClass = 'bg-blue-50/50';
      break;
    case 'internal_validation_passed':
    case 'waiting_user_review':
    case 'waiting_approval':
      title = 'La tua verifica e richiesta';
      description = 'L\'analisi di Herion e completa. Leggi il riepilogo qui sotto e approva.';
      herionAction = channel?.auto_submission === false
        ? 'Dopo la tua approvazione, dovrai inviare la pratica tu stesso.'
        : 'Dopo la tua approvazione, la pratica sara pronta.';
      bgClass = 'bg-amber-50/50';
      break;
    case 'internal_validation_failed':
      title = 'Problemi trovati durante la verifica';
      description = 'Herion ha riscontrato problemi. Controlla i dettagli e correggi.';
      herionAction = 'Dopo le correzioni, potrai riavviare l\'analisi.';
      bgClass = 'bg-red-50/50';
      break;
    case 'waiting_signature':
      title = 'Firma digitale richiesta';
      description = 'Alcuni documenti richiedono la tua firma digitale prima di procedere.';
      herionAction = 'Dopo la firma, la pratica sara pronta per l\'invio.';
      bgClass = 'bg-amber-50/50';
      break;
    case 'ready_for_submission':
      title = 'Pronta per l\'invio';
      isExternal = channel?.auto_submission === false;
      description = isExternal
        ? 'Devi inviare questa pratica all\'ente competente tu stesso.'
        : 'La pratica e pronta per essere completata.';
      herionAction = isExternal && channel?.portal_url
        ? `Vai su ${channel.name} per completare l'invio.`
        : '';
      bgClass = 'bg-[#0ABFCF]/5';
      break;
    case 'submitted_manually':
    case 'submitted_via_channel':
      title = 'Pratica inviata';
      description = 'Hai confermato l\'invio. In attesa di conferma dall\'ente.';
      herionAction = 'Quando ricevi conferma dall\'ente, puoi chiudere la pratica.';
      bgClass = 'bg-blue-50/50';
      break;
    case 'waiting_external_response':
      title = 'In attesa di risposta dall\'ente';
      description = 'La pratica e stata inviata. Stiamo attendendo la risposta ufficiale.';
      herionAction = 'Quando ricevi la risposta, aggiorna lo stato.';
      bgClass = 'bg-purple-50/50';
      break;
    case 'completed':
    case 'accepted_by_entity':
      return null; // No guidance needed for completed
    case 'blocked':
    case 'escalated':
      title = 'Pratica bloccata';
      description = 'Intervento richiesto. Controlla i dettagli sotto o chiedi a Herion.';
      herionAction = '';
      bgClass = 'bg-red-50/50';
      break;
    default:
      return null;
  }

  return (
    <div className={`${bgClass} rounded-xl px-5 py-4`} data-testid="guidance-card">
      <p className="text-[13px] font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="text-[11px] text-[var(--text-secondary)] mt-1">{description}</p>
      {herionAction && (
        <p className="text-[10px] text-[var(--text-muted)] mt-1.5 flex items-center gap-1.5">
          <ArrowRight className="w-3 h-3 flex-shrink-0" />{herionAction}
        </p>
      )}
    </div>
  );
}


function DocumentSection({ documents, missingDocs, docLabels, canUpload, uploading, onFileSelect, catalog }) {
  const uploadedDocs = documents.filter(d => !d.is_deleted);
  const requiredDocKeys = catalog?.required_documents || [];

  return (
    <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="document-section">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[12px] font-bold text-[var(--text-primary)]">Documenti</p>
        {canUpload && (
          <label className="cursor-pointer">
            <input type="file" onChange={onFileSelect} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.p7m" data-testid="file-input" />
            <Button variant="outline" className="rounded-xl text-[10px] h-7 px-3" style={{ borderColor: 'var(--border-soft)' }} disabled={uploading} asChild>
              <span>{uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}Carica</span>
            </Button>
          </label>
        )}
      </div>

      {/* Missing documents — clear CTAs */}
      {missingDocs.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-bold text-amber-700 mb-1.5">Da caricare ({missingDocs.length})</p>
          <div className="space-y-1">
            {missingDocs.map((doc, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1.5 px-3 bg-amber-50/60 rounded-lg" data-testid={`missing-doc-${doc}`}>
                <Upload className="w-3 h-3 text-amber-500 flex-shrink-0" />
                <p className="text-[11px] text-amber-800 font-medium flex-1">{docLabels[doc] || doc}</p>
                <span className="text-[9px] text-amber-600 font-semibold">Richiesto</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded documents with clarity labels */}
      {uploadedDocs.length > 0 ? (
        <div className="space-y-1">
          {uploadedDocs.map(doc => {
            const isP7m = doc.original_filename?.endsWith('.p7m');
            const isGenerated = doc.source === 'system' || doc.source === 'agent';
            const isSigned = isP7m || doc.signed;
            const needsSignature = doc.needs_signature && !isSigned;
            const catLabel = DOC_UPLOAD_CATEGORIES.find(c => c.key === doc.category)?.label || '';

            let badge = null;
            if (isGenerated) {
              badge = <span className="text-[8px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Generato da Herion</span>;
            } else if (isSigned) {
              badge = (
                <span className="text-[8px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded" title="Documento firmato digitalmente">
                  Firmato {isP7m ? '(p7m)' : ''}
                </span>
              );
            } else if (needsSignature) {
              badge = <span className="text-[8px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">Richiede firma</span>;
            } else {
              badge = <span className="text-[8px] font-bold bg-[var(--bg-soft)] text-[var(--text-muted)] px-1.5 py-0.5 rounded">Ricevuto</span>;
            }

            return (
              <div key={doc.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--hover-soft)] transition-colors" data-testid={`document-${doc.id}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <File className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-[var(--text-primary)] truncate">{doc.original_filename}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {catLabel && <span className="text-[9px] text-[var(--text-muted)]">{catLabel}</span>}
                      {badge}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded"><Download className="w-3 h-3" /></Button>
              </div>
            );
          })}
        </div>
      ) : missingDocs.length === 0 ? (
        <div className="border border-dashed rounded-xl p-5 text-center" style={{ borderColor: 'var(--border-soft)' }}>
          <Upload className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2 opacity-40" strokeWidth={1.5} />
          <p className="text-[12px] text-[var(--text-secondary)] font-medium">Nessun documento ancora</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Carica i documenti per avviare la pratica</p>
        </div>
      ) : null}

      {/* p7m explanation */}
      {uploadedDocs.some(d => d.original_filename?.endsWith('.p7m')) && (
        <div className="mt-3 p-3 bg-[var(--bg-soft)] rounded-lg flex items-start gap-2">
          <Shield className="w-3.5 h-3.5 text-[#0ABFCF] flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-[var(--text-secondary)]">
            I file <strong>.p7m</strong> sono documenti firmati digitalmente. Questa firma garantisce l'autenticita e l'integrita del documento.
          </p>
        </div>
      )}
    </div>
  );
}


function ChannelCard({ channel, catalog, status }) {
  // Don't show for internal-only or draft
  if (!channel || channel.destination_type === 'internal') return null;
  if (['draft'].includes(status)) return null;

  const channelTypeLabel = {
    official_portal: 'Portale ufficiale',
    PEC: 'PEC (Posta Elettronica Certificata)',
    email: 'Email',
    preparation_only: 'Solo preparazione',
    escalation: 'Escalation professionale',
  };

  const authLabels = {
    SPID: 'SPID', CIE: 'CIE (Carta Identita Elettronica)',
    CNS: 'CNS (Carta Nazionale dei Servizi)', Credenziali: 'Credenziali portale',
  };

  // Determine auth method from notes or channel data
  const authNeeded = channel.notes?.includes('SPID') ? 'SPID' :
    channel.notes?.includes('CIE') ? 'CIE' :
    channel.notes?.includes('CNS') ? 'CNS' : null;

  return (
    <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="channel-card">
      <div className="flex items-center gap-2 mb-3">
        <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Canale Ufficiale</p>
      </div>

      <div className="space-y-2.5">
        {/* Entity */}
        <div>
          <p className="text-[13px] font-semibold text-[var(--text-primary)]">{channel.name}</p>
          <p className="text-[10px] text-[var(--text-secondary)]">
            {channel.destination_type === 'tax_authority' ? 'Autorita fiscale' :
             channel.destination_type === 'social_security' ? 'Ente previdenziale' :
             channel.destination_type === 'chamber_registry' ? 'Camera di Commercio' :
             channel.destination_type === 'tax_payment' ? 'Pagamento fiscale' :
             channel.destination_type === 'public_portal' ? 'Portale pubblico' :
             'Ente competente'}
          </p>
        </div>

        {/* Submission method */}
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-[var(--text-muted)] font-medium">Come:</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {channelTypeLabel[channel.required_channel] || channel.required_channel}
          </span>
        </div>

        {/* Who submits */}
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-[var(--text-muted)] font-medium">Chi invia:</span>
          <span className={`font-semibold ${channel.auto_submission ? 'text-emerald-600' : 'text-amber-600'}`}>
            {channel.auto_submission ? 'Herion' : 'Tu'}
          </span>
        </div>

        {/* Authentication */}
        {authNeeded && (
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-[var(--text-muted)] font-medium">Autenticazione:</span>
            <span className="font-semibold text-[var(--text-primary)]">{authLabels[authNeeded] || authNeeded}</span>
          </div>
        )}

        {/* Portal URL */}
        {channel.portal_url && (
          <a
            href={channel.portal_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 bg-[var(--bg-soft)] rounded-lg hover:bg-[var(--hover-soft)] transition-colors"
            data-testid="channel-portal-link"
          >
            <ExternalLink className="w-3 h-3 text-[#0ABFCF] flex-shrink-0" />
            <span className="text-[10px] text-[#0ABFCF] font-medium truncate">Vai al portale ufficiale</span>
          </a>
        )}

        {/* What happens after */}
        {channel.preparation_only && (
          <div className="p-2.5 bg-amber-50/50 rounded-lg">
            <p className="text-[10px] text-amber-700">
              <Info className="w-3 h-3 inline mr-1" />
              Herion prepara la documentazione. L'invio ufficiale va completato sul portale dell'ente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
