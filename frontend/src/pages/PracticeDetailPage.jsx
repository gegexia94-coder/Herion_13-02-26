import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPractice, updatePractice, uploadDocument, getPracticeDocuments,
  orchestrateAgents, sendPracticeChat, getPracticeChatHistory,
  approvePractice, startPractice, markPracticeSubmitted, markPracticeCompleted,
  downloadPracticePdf, getPracticeWorkspace, delegatePractice,
  revokeDelegation, uploadProof, completeOfficialStep,
  updateTracking, verifyTracking, getProcedureDependencies, getProcedureCompliance
} from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  ArrowLeft, Upload, CheckCircle, Play, Loader2, File, Download,
  FileDown, Send, Bot, ChevronDown, ChevronUp, Shield, RefreshCw,
  ExternalLink, FileText, BookOpen, FolderUp, Cog, ClipboardCheck,
  PenTool, Flag, Circle, XCircle, Info, Lock, Eye, AlertTriangle,
  UserCheck, Key, Receipt, ArrowRight, Copy, Search, Building2,
  Clock, ShieldCheck, Hourglass, MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

const PRACTICE_STEPS = [
  { key: 'understand', label: 'Comprendi', icon: BookOpen },
  { key: 'upload', label: 'Carica', icon: FolderUp },
  { key: 'process', label: 'Elabora', icon: Cog },
  { key: 'review', label: 'Verifica', icon: ClipboardCheck },
  { key: 'sign', label: 'Firma', icon: PenTool },
  { key: 'complete', label: 'Completa', icon: Flag },
];

const DOC_UPLOAD_CATEGORIES = [
  { key: 'identity', label: 'Identita' }, { key: 'tax_declarations', label: 'Dichiarazioni' },
  { key: 'vat_documents', label: 'IVA' }, { key: 'invoices', label: 'Fatture' },
  { key: 'company_documents', label: 'Societari' }, { key: 'accounting', label: 'Contabili' },
  { key: 'compliance', label: 'Conformita' }, { key: 'payroll', label: 'Lavoro' },
  { key: 'activity', label: 'Attivita' }, { key: 'other', label: 'Altro' },
];

const PRIORITY_BADGE = {
  urgent: { label: 'Urgente', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  high: { label: 'Alta', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  normal: { label: 'Normale', bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-400' },
  low: { label: 'Bassa', bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-300' },
};

const DELEGATION_LEVEL_LABELS = {
  assist: { label: 'Assistenza', desc: 'Herion prepara, tu invii', color: 'text-sky-600', bg: 'bg-sky-50' },
  partial: { label: 'Parziale', desc: 'Herion puo agire in parte per tuo conto', color: 'text-amber-600', bg: 'bg-amber-50' },
  full: { label: 'Completa', desc: 'Herion puo agire per tuo conto dove consentito', color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

export default function PracticeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const chatEndRef = useRef(null);

  // Core state: workspace is the source of truth
  const [practice, setPractice] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
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
  const [showDelegateDialog, setShowDelegateDialog] = useState(false);
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState({ open: false, status: '' });
  const [showAgentLogs, setShowAgentLogs] = useState(false);
  const [delegateLevel, setDelegateLevel] = useState('assist');
  const [proofType, setProofType] = useState('protocol_number');
  const [proofCode, setProofCode] = useState('');
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);
  const [trackingIdType, setTrackingIdType] = useState('protocol_number');
  const [trackingIdValue, setTrackingIdValue] = useState('');
  const [deps, setDeps] = useState(null);
  const [compliance, setCompliance] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [p, w, d, c] = await Promise.all([
        getPractice(id), getPracticeWorkspace(id),
        getPracticeDocuments(id), getPracticeChatHistory(id),
      ]);
      setPractice(p.data);
      setWorkspace(w.data);
      setDocuments(d.data);
      setChatHistory(c.data.reverse());
      // Load dependencies if practice has a type
      const pType = w.data?.practice_type || p.data?.practice_type;
      if (pType) {
        try { const depRes = await getProcedureDependencies(pType); setDeps(depRes.data); } catch { /* no deps */ }
        try { const compRes = await getProcedureCompliance(pType); setCompliance(compRes.data); } catch { /* no compliance */ }
      }
    } catch (e) { console.warn('Load failed:', e?.message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── ACTIONS ──
  const handleStart = async () => {
    try { await startPractice(id); toast.success('Pratica avviata'); loadData(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Errore'); }
  };
  const handleFileSelect = (e) => { const f = e.target.files?.[0]; if (f) { setPendingFile(f); setShowUploadDialog(true); } };
  const handleFileUpload = async () => {
    if (!pendingFile) return; setShowUploadDialog(false); setUploading(true);
    try { await uploadDocument(id, pendingFile, uploadCategory); toast.success('Documento salvato nel tuo archivio'); loadData(); }
    catch { toast.error('Errore nel caricamento'); }
    finally { setUploading(false); setPendingFile(null); setUploadCategory('other'); }
  };
  const handleOrchestrate = async () => {
    setOrchestrating(true);
    try { await orchestrateAgents(id, 'Analisi completa della pratica'); toast.success('Analisi completata'); loadData(); }
    catch (e) { toast.error(e.response?.data?.detail || "Errore nell'elaborazione"); }
    finally { setOrchestrating(false); }
  };
  const handleApprove = async () => {
    setShowApprovalDialog(false); setApproving(true);
    try { await approvePractice(id); toast.success('Pratica approvata'); loadData(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Errore'); }
    finally { setApproving(false); }
  };
  const handleMarkSubmitted = async (type = 'manual') => {
    setShowSubmitDialog(false); setSubmitting(true);
    try { await markPracticeSubmitted(id, type); toast.success('Invio confermato'); loadData(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Errore'); }
    finally { setSubmitting(false); }
  };
  const handleMarkCompleted = async () => {
    try { await markPracticeCompleted(id); toast.success('Pratica completata'); loadData(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Errore'); }
  };
  const handleDelegate = async () => {
    setShowDelegateDialog(false);
    try {
      const scopes = delegateLevel === 'full'
        ? ['prepare_documents', 'validate_completeness', 'upload_to_portal', 'send_official_submission', 'download_receipt', 'monitor_response']
        : delegateLevel === 'partial'
        ? ['prepare_documents', 'validate_completeness', 'upload_to_portal', 'monitor_response']
        : ['prepare_documents', 'validate_completeness'];
      await delegatePractice(id, { level: delegateLevel, scope: scopes });
      toast.success('Delega concessa'); loadData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Errore'); }
  };
  const handleRevokeDelegation = async () => {
    try { await revokeDelegation(id); toast.success('Delega revocata'); loadData(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Errore'); }
  };
  const handleUploadProof = async () => {
    setShowProofDialog(false);
    try { await uploadProof(id, { proof_type: proofType, reference_code: proofCode || null }); toast.success('Ricevuta registrata'); loadData(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Errore'); }
    finally { setProofCode(''); }
  };
  const handleOfficialStepComplete = async () => {
    try { await completeOfficialStep(id, { step_outcome: 'success' }); toast.success('Passaggio completato'); loadData(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Errore'); }
  };
  const handleAddTrackingReference = async () => {
    if (!trackingIdValue.trim()) return;
    setShowTrackingDialog(false);
    try {
      await updateTracking(id, { identifier_type: trackingIdType, identifier_value: trackingIdValue.trim() });
      toast.success('Riferimento acquisito');
      setTrackingIdValue('');
      loadData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Errore nel salvataggio del riferimento'); }
  };
  const handleCopyReference = (value) => {
    navigator.clipboard.writeText(value);
    toast.success('Riferimento copiato');
  };
  const handlePdfDownload = async () => {
    setPdfLoading(true);
    try {
      const response = await downloadPracticePdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `Herion_Pratica_${id.slice(0, 8)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url); toast.success('PDF scaricato');
    } catch { toast.error('Errore nel download'); }
    finally { setPdfLoading(false); }
  };
  const handleStatusChange = async () => {
    const s = showStatusDialog.status; setShowStatusDialog({ open: false, status: '' });
    try { await updatePractice(id, { status: s }); toast.success('Stato aggiornato'); loadData(); }
    catch { toast.error("Errore nell'aggiornamento"); }
  };
  const handleChat = async (e) => {
    e.preventDefault(); if (!chatQuestion.trim() || chatLoading) return;
    const q = chatQuestion.trim(); setChatQuestion(''); setChatLoading(true);
    try {
      const res = await sendPracticeChat(id, q);
      setChatHistory(prev => [...prev, res.data]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { toast.error('Errore nella risposta'); }
    finally { setChatLoading(false); }
  };

  // ── DERIVED STATE (from workspace) ──
  const isAdmin = user?.role === 'admin' || user?.role === 'creator';
  const status = practice?.status || 'draft';
  const ws = workspace || {};
  const stepIdx = ws.current_step ?? 0;
  const isBlocked = stepIdx === -1;
  const statusCfg = ws.user_status || { label: 'Non iniziata', color: '#5B6475' };
  const pCfg = PRIORITY_BADGE[practice?.priority] || PRIORITY_BADGE.normal;
  const guidance = ws.ui_guidance || {};
  const activity = ws.current_activity || {};
  const approval = ws.approval || {};
  const father = approval.father_review || {};
  const delegation = ws.delegation || {};
  const officialAction = ws.official_action;
  const proofLayer = ws.proof_layer || {};
  const trackingIntel = ws.tracking || {};
  const docsSummary = ws.documents_summary || {};
  const blockers = ws.blockers || [];
  const completedActivities = ws.completed_activities || [];

  const canStart = status === 'draft';
  const canUpload = ['waiting_user_documents', 'documents_received', 'draft'].includes(status);
  const canRunAgents = ['waiting_user_documents', 'documents_received'].includes(status) && documents.length > 0 && !practice?.orchestration_result;
  const canApprove = approval.needed;
  const canSubmit = status === 'ready_for_submission';
  const canComplete = ['submitted_manually', 'submitted_via_channel', 'waiting_external_response'].includes(status);
  const isDone = ['completed', 'accepted_by_entity'].includes(status);

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-5 h-5 animate-spin text-[var(--text-muted)]" /></div>;
  if (!practice) return (
    <div className="text-center py-16">
      <p className="text-[var(--text-secondary)]">Pratica non trovata</p>
      <Button onClick={() => navigate('/practices')} variant="outline" className="mt-4 rounded-lg">Torna alle pratiche</Button>
    </div>
  );

  return (
    <div className="space-y-5" data-testid="practice-detail-page">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <button onClick={() => navigate('/practices')} className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-2 transition-colors" data-testid="back-btn">
            <ArrowLeft className="w-3.5 h-3.5" />Torna alle pratiche
          </button>
          <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight truncate">{practice.practice_type_label}</h1>
          <p className="text-[12px] text-[var(--text-secondary)] truncate">{practice.client_name} &middot; {practice.country}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${pCfg.bg} ${pCfg.text}`} data-testid="practice-priority-badge">
            <span className={`w-1.5 h-1.5 rounded-full ${pCfg.dot}`} />{pCfg.label}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: statusCfg.color }} data-testid="practice-status-badge">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusCfg.color }} />{statusCfg.label}
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
                {['draft','waiting_user_documents','internal_processing','waiting_user_review','ready_for_submission','completed','blocked'].map(s => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* ── 6-STEP PROGRESS BAR ── */}
      <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="step-progress">
        <div className="flex items-center justify-between gap-1">
          {PRACTICE_STEPS.map((step, idx) => {
            // For blocked practices, show how far they got before blocking
            const effectiveStep = isBlocked ? Math.max(0, ...completedActivities.map(() => 2)) : stepIdx;
            const done = effectiveStep > idx;
            const current = !isBlocked && stepIdx === idx;
            const blocked = isBlocked && idx === effectiveStep;
            const StepIcon = step.icon;
            return (
              <div key={step.key} className="flex items-center flex-1" data-testid={`step-${step.key}`}>
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    blocked ? 'bg-red-50 text-red-500 ring-2 ring-red-200' :
                    done ? 'bg-emerald-50 text-emerald-600' :
                    current ? 'bg-[#0ABFCF]/10 text-[#0ABFCF] ring-2 ring-[#0ABFCF]/30' :
                    'bg-[var(--bg-app)] text-[var(--text-muted)]'
                  }`}>
                    {blocked ? <XCircle className="w-4 h-4" strokeWidth={2} /> :
                     done ? <CheckCircle className="w-4 h-4" strokeWidth={2} /> :
                     <StepIcon className="w-4 h-4" strokeWidth={1.5} />}
                  </div>
                  <p className={`text-[9px] font-semibold mt-1.5 text-center max-w-[60px] leading-tight ${
                    blocked ? 'text-red-500' :
                    done ? 'text-emerald-600' :
                    current ? 'text-[#0ABFCF]' :
                    'text-[var(--text-muted)]'
                  }`}>{step.label}</p>
                </div>
                {idx < 5 && <div className={`h-px flex-1 mx-1.5 ${done && !blocked ? 'bg-emerald-300' : 'bg-[var(--border-soft)]'}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BLOCKERS ── */}
      {blockers.length > 0 && (
        <div className="space-y-2" data-testid="blockers-section">
          {blockers.map((b, i) => (
            <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${b.severity === 'high' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`} data-testid={`blocker-${i}`}>
              <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${b.severity === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
              <div>
                <p className={`text-[12px] font-semibold ${b.severity === 'high' ? 'text-red-800' : 'text-amber-800'}`}>{b.label}</p>
                <p className={`text-[11px] mt-0.5 ${b.severity === 'high' ? 'text-red-600' : 'text-amber-600'}`}>{b.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-4">

          {/* ── UNDERSTANDING GATE (draft) ── */}
          {canStart && <UnderstandingGate practice={practice} workspace={ws} onStart={handleStart} />}

          {/* ── COMPLETION EXPERIENCE ── */}
          {isDone && (
            <div className="rounded-xl overflow-hidden animate-fade-in animate-completion-pulse" data-testid="completion-card">
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-50/30 px-5 py-5 border border-emerald-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-bold text-emerald-800">Pratica completata</p>
                    <p className="text-[12px] text-emerald-700 mt-1 leading-relaxed">
                      {practice.practice_type_label} per {practice.client_name} e stata completata con successo.
                    </p>
                    <div className="mt-3 space-y-1.5">
                      {practice.tracking?.reference_id && (
                        <div className="flex items-center gap-2 text-[11px] text-emerald-700">
                          <FileText className="w-3 h-3" />
                          <span className="font-medium">Riferimento:</span> <span className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded">{practice.tracking.reference_id}</span>
                        </div>
                      )}
                      {practice.tracking?.entity_state && (
                        <div className="flex items-center gap-2 text-[11px] text-emerald-700">
                          <Eye className="w-3 h-3" />
                          <span className="font-medium">Stato ente:</span> {practice.tracking.entity_state}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-emerald-700">
                        <Clock className="w-3 h-3" />
                        <span className="font-medium">Completata il:</span> {practice.updated_at ? new Date(practice.updated_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-emerald-200/50">
                      <p className="text-[10px] text-emerald-600 leading-relaxed">
                        I documenti archiviati restano disponibili nel tuo Vault. Se in futuro dovesse servire un riferimento o una verifica, tutto e conservato.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* ── UI GUIDANCE from workspace ── */}
          {!canStart && guidance.headline && !isDone && (
            <div className={`rounded-xl px-5 py-4 ${isBlocked ? 'bg-red-50/40' : activity.user_action_required ? 'bg-amber-50/40' : isDone ? 'bg-emerald-50/40' : 'bg-blue-50/30'}`} data-testid="guidance-card">
              {/* Who acts now — most important info */}
              <div className="flex items-center gap-2 mb-2">
                {activity.user_action_required ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700" data-testid="guidance-label">
                    <Eye className="w-3 h-3" />Richiede la tua azione
                  </span>
                ) : activity.code === 'herion_working' ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-blue-100 text-blue-600" data-testid="guidance-label">
                    <Cog className="w-3 h-3" />Herion sta lavorando
                  </span>
                ) : activity.code === 'wait_response' ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-purple-100 text-purple-600" data-testid="guidance-label">
                    <ExternalLink className="w-3 h-3" />In attesa dall'ente
                  </span>
                ) : null}
              </div>

              {/* Main headline */}
              <p className="text-[14px] font-bold text-[var(--text-primary)] leading-tight">{guidance.headline}</p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-1 leading-relaxed">{guidance.subheadline}</p>

              {/* Status-specific reinforcement for waiting_user_documents */}
              {status === 'waiting_user_documents' && docsSummary.missing_count > 0 && (
                <div className="mt-3 p-3 bg-white/80 rounded-lg border border-amber-200/60" data-testid="missing-docs-hint">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Documenti mancanti: {docsSummary.missing_count}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Carica i documenti richiesti qui sotto per sbloccare il passaggio successivo. Herion li verifichera automaticamente.
                  </p>
                </div>
              )}

              {/* Next action — bold and clear */}
              {guidance.next_step_label && guidance.next_step_detail && (
                <div className="mt-3 p-3 bg-white/60 rounded-lg border border-white/80">
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">{guidance.next_step_label}</p>
                  <p className="text-[12px] font-semibold text-[var(--text-primary)]">{guidance.next_step_detail}</p>
                </div>
              )}

              {/* What Herion already completed */}
              {completedActivities.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {completedActivities.slice(-3).map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[9px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                      <CheckCircle className="w-2.5 h-2.5" />{a.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── OFFICIAL STEP CARD ── */}
          {officialAction && !canStart && <OfficialStepCard action={officialAction} proof={proofLayer} status={status} delegation={delegation} onOfficialStepComplete={handleOfficialStepComplete} onShowProofDialog={() => setShowProofDialog(true)} />}

          {/* ── TRACKING & STATUS INTELLIGENCE CARD ── */}
          {!canStart && <TrackingCard tracking={trackingIntel} status={status} onAddReference={() => setShowTrackingDialog(true)} onCopyReference={handleCopyReference} />}

          {/* ── DEPENDENCY & RISK CARD ── */}
          {deps?.has_dependencies && <PracticeDependencyCard deps={deps} />}

          {/* ── TUTELA E CONFORMITA ── */}
          {compliance?.has_guidance && <ComplianceCard compliance={compliance} />}

          {/* ── FATHER REVIEW / APPROVAL GATE ── */}
          {canApprove && father.active && (
            <div className="bg-white rounded-xl border-2 border-amber-200 p-5 space-y-3" data-testid="father-review-gate">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-[13px] font-bold text-[var(--text-primary)]">Verifica del Supervisore Herion</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">Herion ha effettuato una verifica completa prima della tua approvazione.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { label: 'Compatibilita', value: father.compatibility_check, icon: CheckCircle },
                  { label: 'Requisiti', value: father.requirements_check, icon: ClipboardCheck },
                  { label: 'Documenti', value: father.document_received_check, icon: FileText },
                  { label: 'Ente', value: father.entity_validation_check, icon: ExternalLink },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 bg-[var(--bg-soft)] rounded-lg">
                    <item.icon className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{item.label}</p>
                      <p className="text-[10px] text-[var(--text-primary)] leading-relaxed">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-[var(--bg-soft)] rounded-lg space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${father.approval_recommendation?.includes('consigliata') ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`} data-testid="approval-recommendation">{father.approval_recommendation}</span>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)]">{father.summary_for_user}</p>
                <div className="flex gap-4 text-[9px] text-[var(--text-muted)]">
                  <span>{father.estimated_opening_time}</span>
                  <span>{father.estimated_closing_time}</span>
                </div>
                <p className="text-[9px] text-[var(--text-muted)]">{father.path_summary}</p>
                <p className="text-[9px] text-[var(--text-muted)]">{father.goal_summary}</p>
              </div>

              <Button onClick={() => setShowApprovalDialog(true)} disabled={approving} className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg h-10 w-full text-[12px] font-semibold" data-testid="approve-practice-btn">
                {approving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Approvazione...</> : <><CheckCircle className="w-4 h-4 mr-2" />Approva e Procedi</>}
              </Button>
            </div>
          )}

          {/* ── SIMPLE APPROVAL (no father review data) ── */}
          {canApprove && !father.active && (
            <div className="bg-white rounded-xl border-2 border-amber-200 p-5" data-testid="simple-approval-gate">
              <div className="flex items-center gap-3 mb-3">
                <ClipboardCheck className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-[13px] font-bold text-[var(--text-primary)]">La tua verifica e richiesta</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">Leggi il riepilogo e approva per procedere.</p>
                </div>
              </div>
              <Button onClick={() => setShowApprovalDialog(true)} disabled={approving} className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg h-10 w-full text-[12px] font-semibold" data-testid="approve-practice-btn">
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
                  <p className="text-[10px] text-[var(--text-secondary)]">{officialAction?.requires_user_direct_step ? "Conferma dopo aver completato l'invio sul portale ufficiale." : "Conferma per completare."}</p>
                </div>
              </div>
              <Button onClick={() => setShowSubmitDialog(true)} disabled={submitting} className="bg-[#0ABFCF] hover:bg-[#09a8b6] rounded-lg h-10 w-full text-[12px] font-semibold text-white" data-testid="mark-submitted-btn">
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
                  <p className="text-[10px] text-[var(--text-secondary)]">Quando l'ente conferma, chiudi la pratica.</p>
                </div>
              </div>
              <Button onClick={handleMarkCompleted} variant="outline" className="rounded-lg h-9 text-[11px] font-semibold" data-testid="mark-completed-btn">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />Conferma completamento
              </Button>
            </div>
          )}

          {/* ── RUN AGENTS ── */}
          {canRunAgents && (
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="run-agents-card">
              <div className="flex items-center gap-3 mb-3">
                <Cog className="w-5 h-5 text-[var(--text-muted)]" />
                <div>
                  <p className="text-[13px] font-bold text-[var(--text-primary)]">Avvia l'analisi di Herion</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">{docsSummary.missing_count > 0 ? `${docsSummary.missing_count} documenti mancanti. L'analisi potrebbe essere incompleta.` : 'Documenti presenti. Puoi avviare l\'analisi.'}</p>
                </div>
              </div>
              <Button onClick={handleOrchestrate} disabled={orchestrating} className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg h-10 w-full text-[12px] font-semibold" data-testid="run-workflow-btn">
                {orchestrating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analisi in corso...</> : <><Play className="w-4 h-4 mr-2" />Avvia Analisi Herion</>}
              </Button>
            </div>
          )}

          {/* ── DOCUMENTS ── */}
          {!canStart && <DocumentSection documents={documents} docsSummary={docsSummary} canUpload={canUpload} uploading={uploading} onFileSelect={handleFileSelect} />}

          {/* ── DELEGATION ── */}
          {!canStart && !isDone && (
            <DelegationSection delegation={delegation} officialAction={officialAction} onDelegate={() => setShowDelegateDialog(true)} onRevoke={handleRevokeDelegation} />
          )}

          {/* ── AGENT LOGS ── */}
          {completedActivities.length > 0 && (
            <div className="bg-white rounded-xl border" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }}>
              <button onClick={() => setShowAgentLogs(!showAgentLogs)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--hover-soft)] transition-colors" data-testid="agent-logs-toggle">
                <div className="flex items-center gap-2">
                  <Bot className="w-3.5 h-3.5 text-[#0ABFCF]" />
                  <p className="text-[11px] font-bold text-[var(--text-primary)]">Cosa ha fatto Herion</p>
                  <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Preparato da Herion</span>
                </div>
                {showAgentLogs ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
              </button>
              {showAgentLogs && (
                <div className="border-t px-5 py-3 space-y-2" style={{ borderColor: 'var(--border-soft)' }}>
                  {completedActivities.map((a, i) => (
                    <div key={i} className="flex items-center gap-2.5 py-1.5">
                      <div className="w-5 h-5 rounded bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-[var(--text-primary)]">{a.label}</p>
                        {a.completed_at && <p className="text-[9px] text-[var(--text-muted)]">{format(new Date(a.completed_at), 'dd MMM HH:mm', { locale: it })}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── COMPLETED ── */}
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
          {/* ── CURRENT AGENT ── */}
          {ws.current_agent && (
            <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="current-agent-card">
              <div className="flex items-center gap-2 mb-2.5">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${ws.current_agent.status === 'in_progress' ? 'bg-blue-50' : ws.current_agent.status === 'completed' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                  <Bot className={`w-3.5 h-3.5 ${ws.current_agent.status === 'in_progress' ? 'text-blue-500' : ws.current_agent.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-[var(--text-primary)]">{ws.current_agent.name}</p>
                  <p className="text-[9px] text-[var(--text-muted)]">{ws.current_agent.title}</p>
                </div>
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${ws.current_agent.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : ws.current_agent.status === 'in_progress' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                  {ws.current_agent.status === 'completed' ? 'Completato' : ws.current_agent.status === 'in_progress' ? 'In corso' : 'In attesa'}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{ws.current_agent.message}</p>
            </div>
          )}

          {/* ── CHAT ── */}
          {/* ── PRACTICE-SPECIFIC AI SUPPORT ── */}
          <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="practice-chat">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#0ABFCF]/10 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-[#0ABFCF]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[var(--text-primary)]">Chiedi a Herion</p>
                  <p className="text-[8px] text-[#0ABFCF] font-medium">Supporto su questa pratica</p>
                </div>
              </div>
              <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full" data-testid="chat-context-badge">Contesto attivo</span>
            </div>
            <p className="text-[9px] text-[var(--text-muted)] mb-3 pl-8">Herion conosce lo stato, i documenti e le azioni di questa pratica.</p>
            <ScrollArea className="h-[180px] mb-3">
              <div className="space-y-2 pr-2">
                {chatHistory.length === 0 && !chatLoading && (
                  <div className="py-3">
                    <p className="text-[10px] text-[var(--text-secondary)] mb-2 font-medium">Domande frequenti per questa fase:</p>
                    {(status === 'waiting_user_documents' ? [
                      'Quali documenti mancano?',
                      'Cosa succede dopo il caricamento?',
                      'Posso procedere senza tutti i documenti?'
                    ] : status === 'ready_for_submission' ? [
                      'Come procedo con l\'invio?',
                      'Cosa devo verificare prima?',
                      'Dove invio la pratica?'
                    ] : ['Cosa devo fare adesso?', 'Qual e lo stato attuale?', 'Manca qualcosa per procedere?']).map((q, i) => (
                      <button key={i} onClick={() => setChatQuestion(q)} className="block w-full text-left text-[10px] text-[var(--text-primary)] p-2.5 bg-[var(--hover-soft)] rounded-lg hover:bg-[#0ABFCF]/10 transition-colors mb-1.5" data-testid={`chat-suggestion-${i}`}>{q}</button>
                    ))}
                  </div>
                )}
                {chatHistory.map(msg => (
                  <div key={msg.id}>
                    <div className="flex justify-end mb-1"><div className="bg-[var(--text-primary)] text-white px-2.5 py-1.5 rounded-lg text-[10px] max-w-[85%]">{msg.question}</div></div>
                    <div className="flex gap-1.5 mb-1">
                      <div className="w-5 h-5 rounded bg-[#0ABFCF]/10 flex items-center justify-center flex-shrink-0 mt-0.5"><Bot className="w-3 h-3 text-[#0ABFCF]" /></div>
                      <div className="bg-[var(--bg-app)] border px-2.5 py-1.5 rounded-lg text-[10px] text-[var(--text-primary)] max-w-[85%] whitespace-pre-wrap" style={{ borderColor: 'var(--border-soft)' }}>{msg.answer}</div>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-1.5">
                    <div className="w-5 h-5 rounded bg-[#0ABFCF]/10 flex items-center justify-center flex-shrink-0"><Bot className="w-3 h-3 text-[#0ABFCF]" /></div>
                    <div className="bg-[var(--bg-app)] border px-3 py-2 rounded-lg" style={{ borderColor: 'var(--border-soft)' }}>
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin text-[#0ABFCF]" />
                        <span className="text-[9px] text-[var(--text-muted)]">Herion sta analizzando la pratica...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>
            <form onSubmit={handleChat} className="flex gap-1.5">
              <Input value={chatQuestion} onChange={e => setChatQuestion(e.target.value)} placeholder="Chiedi qualcosa su questa pratica..." className="rounded-lg h-8 text-[10px] flex-1" style={{ borderColor: 'var(--border-soft)' }} disabled={chatLoading} data-testid="chat-input" />
              <Button type="submit" size="sm" disabled={chatLoading || !chatQuestion.trim()} className="bg-[#0ABFCF] hover:bg-[#09a8b6] rounded-lg h-8 w-8 p-0" data-testid="chat-send-btn"><Send className="w-3 h-3 text-white" /></Button>
            </form>
          </div>

          {/* ── TIMELINE ── */}
          {ws.timeline_summary?.length > 0 && (
            <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="practice-timeline">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-3">Cronologia</p>
              <ScrollArea className="h-[160px]">
                <div className="space-y-2">
                  {ws.timeline_summary.map((event, i) => {
                    // Clean up raw event labels
                    const label = event.event
                      ?.replace(/_completed/g, ' completato')
                      ?.replace(/_/g, ' ')
                      ?.replace(/^guard /, 'Protezione ')
                      ?.replace(/^advisor /, 'Analisi ')
                      ?.replace(/^monitor /, 'Monitoraggio ')
                      ?.replace(/^intake /, 'Raccolta ')
                      || event.event;
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <Circle className={`w-2.5 h-2.5 flex-shrink-0 mt-1 ${event.type === 'success' ? 'text-emerald-500' : event.type === 'error' ? 'text-red-500' : event.type === 'warning' ? 'text-amber-500' : 'text-[var(--text-muted)]'}`} fill="currentColor" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium text-[var(--text-primary)] capitalize">{label}</p>
                          {event.time && <p className="text-[9px] text-[var(--text-muted)]">{format(new Date(event.time), 'dd MMM, HH:mm', { locale: it })}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* ── DIALOGS ── */}
      <AlertDialog open={showStatusDialog.open} onOpenChange={o => setShowStatusDialog({ open: o, status: '' })}>
        <AlertDialogContent className="rounded-xl shadow-xl max-w-sm"><AlertDialogHeader><AlertDialogTitle className="text-base font-bold text-center">Cambia stato</AlertDialogTitle><AlertDialogDescription className="text-center text-[12px]">Questa azione verra registrata.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-2"><AlertDialogCancel className="rounded-lg flex-1 text-[12px]">Annulla</AlertDialogCancel><AlertDialogAction onClick={handleStatusChange} className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg flex-1 text-[12px]">Conferma</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <AlertDialogContent className="rounded-xl shadow-xl max-w-md"><AlertDialogHeader><AlertDialogTitle className="text-base font-bold text-center">Conferma Approvazione</AlertDialogTitle><AlertDialogDescription className="text-center text-[12px]">Confermando, autorizzi Herion a procedere con <span className="font-semibold text-[var(--text-primary)]">{practice.practice_type_label}</span>.{officialAction?.requires_user_direct_step && <span className="block mt-2 text-amber-600 font-medium">L'invio ufficiale dovra essere fatto da te.</span>}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-2"><AlertDialogCancel className="rounded-lg flex-1 text-[12px]">Annulla</AlertDialogCancel><AlertDialogAction onClick={handleApprove} className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg flex-1 text-[12px]" data-testid="confirm-approve-btn">Approva</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="rounded-xl shadow-xl max-w-md"><AlertDialogHeader><AlertDialogTitle className="text-base font-bold text-center">Conferma Invio</AlertDialogTitle><AlertDialogDescription className="text-center text-[12px]">Confermi di aver inviato la pratica all'ente?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-2"><AlertDialogCancel className="rounded-lg flex-1 text-[12px]">Annulla</AlertDialogCancel><AlertDialogAction onClick={() => handleMarkSubmitted('manual')} className="bg-[#0ABFCF] hover:bg-[#09a8b6] rounded-lg flex-1 text-[12px] text-white" data-testid="confirm-submit-btn">Confermo l'invio</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <AlertDialogContent className="rounded-xl shadow-xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-center">Carica nel tuo archivio</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[12px]">File: <span className="font-medium text-[var(--text-primary)]">{pendingFile?.name}</span></AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2 space-y-3">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Categoria</label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger className="rounded-lg h-9 text-[12px] mt-1.5" style={{ borderColor: 'var(--border-soft)' }}><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-lg">{DOC_UPLOAD_CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-start gap-2 p-2 bg-blue-50/30 rounded-lg">
              <Info className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-[8px] text-blue-600/70 leading-relaxed">Il documento sara salvato nel tuo archivio personale per la preparazione. Non verra inviato all'ente.</p>
            </div>
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-lg flex-1 text-[12px]">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleFileUpload} className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg flex-1 text-[12px]" data-testid="confirm-upload-btn">Salva in archivio</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDelegateDialog} onOpenChange={setShowDelegateDialog}>
        <AlertDialogContent className="rounded-xl shadow-xl max-w-md">
          <AlertDialogHeader><AlertDialogTitle className="text-base font-bold text-center">Concedi delega a Herion</AlertDialogTitle><AlertDialogDescription className="text-center text-[12px]">Scegli il livello di delega. Puoi revocarla in qualsiasi momento.</AlertDialogDescription></AlertDialogHeader>
          <div className="px-6 pb-2 space-y-2">
            {Object.entries(DELEGATION_LEVEL_LABELS).map(([key, cfg]) => (
              <button key={key} onClick={() => setDelegateLevel(key)} className={`w-full p-3 rounded-lg border text-left transition-colors ${delegateLevel === key ? 'border-[#0ABFCF] bg-[#0ABFCF]/5' : 'border-[var(--border-soft)] hover:bg-[var(--hover-soft)]'}`} data-testid={`delegate-level-${key}`}>
                <p className={`text-[12px] font-semibold ${cfg.color}`}>{cfg.label}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{cfg.desc}</p>
              </button>
            ))}
          </div>
          <AlertDialogFooter className="gap-2"><AlertDialogCancel className="rounded-lg flex-1 text-[12px]">Annulla</AlertDialogCancel><AlertDialogAction onClick={handleDelegate} className="bg-[#0ABFCF] hover:bg-[#09a8b6] rounded-lg flex-1 text-[12px] text-white" data-testid="confirm-delegate-btn">Concedi delega</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showProofDialog} onOpenChange={setShowProofDialog}>
        <AlertDialogContent className="rounded-xl shadow-xl max-w-sm">
          <AlertDialogHeader><AlertDialogTitle className="text-base font-bold text-center">Registra ricevuta</AlertDialogTitle><AlertDialogDescription className="text-center text-[12px]">Inserisci il numero di protocollo o il riferimento della ricevuta.</AlertDialogDescription></AlertDialogHeader>
          <div className="px-6 pb-2 space-y-3">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Tipo</label>
              <Select value={proofType} onValueChange={setProofType}>
                <SelectTrigger className="rounded-lg h-9 text-[12px] mt-1" style={{ borderColor: 'var(--border-soft)' }}><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="protocol_number">Numero protocollo</SelectItem>
                  <SelectItem value="receipt_pdf">Ricevuta PDF</SelectItem>
                  <SelectItem value="pec_delivery">Consegna PEC</SelectItem>
                  <SelectItem value="portal_confirmation">Conferma portale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Codice/Riferimento</label>
              <Input value={proofCode} onChange={e => setProofCode(e.target.value)} placeholder="Es. 2026-PROT-12345" className="rounded-lg h-9 text-[12px] mt-1" style={{ borderColor: 'var(--border-soft)' }} data-testid="proof-code-input" />
            </div>
          </div>
          <AlertDialogFooter className="gap-2"><AlertDialogCancel className="rounded-lg flex-1 text-[12px]">Annulla</AlertDialogCancel><AlertDialogAction onClick={handleUploadProof} className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg flex-1 text-[12px]" data-testid="confirm-proof-btn">Registra</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── TRACKING REFERENCE DIALOG ── */}
      <AlertDialog open={showTrackingDialog} onOpenChange={setShowTrackingDialog}>
        <AlertDialogContent className="rounded-xl shadow-xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-center">Inserisci riferimento ufficiale</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[12px]">Inserisci il riferimento ricevuto dall'ente (protocollo, DOMUS, ricevuta, PEC).</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2 space-y-3">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Tipo riferimento</label>
              <Select value={trackingIdType} onValueChange={setTrackingIdType}>
                <SelectTrigger className="rounded-lg h-9 text-[12px] mt-1" style={{ borderColor: 'var(--border-soft)' }} data-testid="tracking-type-select"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="protocol_number">Numero di protocollo</SelectItem>
                  <SelectItem value="domus_number">Numero DOMUS</SelectItem>
                  <SelectItem value="practice_number">Numero pratica</SelectItem>
                  <SelectItem value="pec_reference">Riferimento PEC</SelectItem>
                  <SelectItem value="receipt_code">Codice ricevuta</SelectItem>
                  <SelectItem value="submission_reference">Riferimento invio ufficiale</SelectItem>
                  <SelectItem value="payment_reference">Riferimento pagamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Valore</label>
              <Input value={trackingIdValue} onChange={e => setTrackingIdValue(e.target.value)} placeholder="Es. 2026-PROT-00451" className="rounded-lg h-9 text-[12px] mt-1" style={{ borderColor: 'var(--border-soft)' }} data-testid="tracking-value-input" />
            </div>
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-lg flex-1 text-[12px]">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddTrackingReference} disabled={!trackingIdValue.trim()} className="bg-[#0ABFCF] hover:bg-[#09a8b6] rounded-lg flex-1 text-[12px] text-white" data-testid="confirm-tracking-btn">Acquisisci riferimento</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


// ═══════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════

function UnderstandingGate({ practice, workspace, onStart }) {
  const oa = workspace.official_action;
  const ds = workspace.documents_summary || {};
  return (
    <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="understanding-gate">
      <div className="flex items-center gap-3 mb-4">
        <BookOpen className="w-5 h-5 text-[#0ABFCF]" />
        <h2 className="text-[14px] font-bold text-[var(--text-primary)]">Prima di iniziare</h2>
      </div>

      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Di cosa si tratta</p>
        <p className="text-[12px] text-[var(--text-primary)] leading-relaxed">{oa?.action_description || practice.description || 'Pratica fiscale/amministrativa.'}</p>
      </div>

      {ds.missing_labels?.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Documenti che ti servono</p>
          <div className="space-y-1">
            {ds.missing_labels.map((doc, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <div className="w-4 h-4 rounded bg-amber-50 flex items-center justify-center flex-shrink-0"><FileText className="w-2.5 h-2.5 text-amber-600" /></div>
                <p className="text-[11px] text-[var(--text-primary)]">{doc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Cosa fara Herion per te</p>
        <div className="space-y-1.5">
          {[
            { text: 'Raccoglie e organizza i tuoi documenti', who: 'Herion' },
            { text: 'Verifica completezza e conformita', who: 'Herion' },
            { text: 'Tu verifichi il risultato e approvi', who: 'Tu' },
            oa?.requires_user_direct_step ? { text: "Invii la pratica all'ente con le tue credenziali", who: 'Tu' } : { text: 'La pratica viene completata', who: 'Herion' },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${step.who === 'Tu' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{step.who}</span>
              <p className="text-[11px] text-[var(--text-secondary)]">{step.text}</p>
            </div>
          ))}
        </div>
      </div>

      {oa && (
        <div className="mb-5 p-3 bg-[var(--bg-soft)] rounded-lg">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Ente di destinazione</p>
          <p className="text-[11px] font-semibold text-[var(--text-primary)]">{oa.entity_name}</p>
          {oa.submission_channel !== 'unknown' && <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Canale: {oa.submission_channel === 'official_portal' ? 'Portale ufficiale' : oa.submission_channel === 'PEC' ? 'PEC' : oa.submission_channel}</p>}
          {oa.requires_user_direct_step && <p className="text-[10px] text-amber-600 font-medium mt-1">L'invio ufficiale va fatto da te. Herion prepara tutto, tu invii.</p>}
        </div>
      )}

      <Button onClick={onStart} className="bg-[#0ABFCF] hover:bg-[#09a8b6] text-white rounded-xl h-11 w-full text-[13px] font-semibold" data-testid="start-practice-btn">
        <Play className="w-4 h-4 mr-2" />Inizia la pratica
      </Button>
    </div>
  );
}


function OfficialStepCard({ action, proof, status, delegation, onOfficialStepComplete, onShowProofDialog }) {
  if (!action) return null;
  const isReady = status === 'ready_for_submission';
  const isSubmitted = ['submitted_manually', 'submitted_via_channel', 'waiting_external_response'].includes(status);
  const needsProof = isSubmitted && proof.expected && proof.status === 'missing';

  const whoActsNow = () => {
    if (action.can_herion_submit && delegation.enabled && delegation.level === 'full') return { label: 'Herion con delega', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (action.requires_user_direct_step) return { label: 'Tu', color: 'text-amber-600', bg: 'bg-amber-50' };
    if (action.can_herion_submit) return { label: 'Herion', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    return { label: 'Tu', color: 'text-amber-600', bg: 'bg-amber-50' };
  };
  const actor = whoActsNow();

  return (
    <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="official-step-card">
      <div className="flex items-center gap-2 mb-3">
        <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Passaggio Ufficiale</p>
      </div>

      <div className="space-y-3">
        {/* Entity + Action */}
        <div>
          <p className="text-[13px] font-semibold text-[var(--text-primary)]">{action.entity_name}</p>
          <p className="text-[11px] text-[var(--text-secondary)]">{action.action_label}</p>
        </div>

        {/* WHO ACTS NOW — most prominent element */}
        <div className={`flex items-center gap-3 p-3 rounded-lg ${actor.bg}`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${actor.label === 'Tu' ? 'bg-amber-200/50' : 'bg-emerald-200/50'}`}>
            {actor.label === 'Tu' ? <Eye className={`w-4 h-4 ${actor.color}`} /> : <Bot className={`w-4 h-4 ${actor.color}`} />}
          </div>
          <div>
            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Chi agisce ora</p>
            <p className={`text-[13px] font-bold ${actor.color}`}>{actor.label}</p>
          </div>
        </div>

        {/* Key details */}
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <span className="text-[var(--text-muted)]">Canale: </span>
            <span className="font-semibold text-[var(--text-primary)]">{action.submission_channel === 'official_portal' ? 'Portale ufficiale' : action.submission_channel === 'PEC' ? 'PEC' : action.submission_channel}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Herion prepara: </span>
            <span className="font-semibold text-emerald-600">{action.can_herion_prepare ? 'Si' : 'No'}</span>
          </div>
          {action.credentials_required && (
            <div className="flex items-center gap-1 col-span-2">
              <Key className="w-3 h-3 text-amber-500" />
              <span className="text-amber-600 font-medium">Credenziali personali richieste (es. SPID)</span>
            </div>
          )}
        </div>

        {/* Portal link + Auth CTA */}
        {action.portal_url && (
          <a href={action.portal_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5 bg-[var(--bg-soft)] rounded-lg hover:bg-[var(--hover-soft)] transition-colors" data-testid="portal-link">
            <ExternalLink className="w-3 h-3 text-[#0ABFCF] flex-shrink-0" />
            <span className="text-[10px] text-[#0ABFCF] font-medium truncate">Vai al portale ufficiale</span>
          </a>
        )}

        {/* Auth-ready CTA for ready_for_submission */}
        {isReady && action.requires_user_direct_step && action.credentials_required && (
          <div className="space-y-2">
            <div className="p-2.5 bg-purple-50/50 rounded-lg">
              <p className="text-[10px] text-purple-700 font-medium flex items-center gap-1.5">
                <Lock className="w-3 h-3 flex-shrink-0" />
                Questo passaggio avviene sul portale ufficiale dell'ente
              </p>
              <p className="text-[9px] text-purple-600 mt-0.5">
                Dopo l'accesso potrai completare l'invio. Herion non conserva le tue credenziali.
              </p>
            </div>
            <Button
              onClick={onOfficialStepComplete}
              className="bg-[#0ABFCF] hover:bg-[#09a8b6] text-white rounded-lg h-10 w-full text-[11px] font-semibold"
              data-testid="auth-step-btn"
            >
              <Key className="w-3.5 h-3.5 mr-2" />Accedi e continua
            </Button>
          </div>
        )}

        {/* Proof / Receipt status */}
        {proof.expected && (
          <div className={`p-2.5 rounded-lg ${proof.status === 'received' || proof.status === 'verified' ? 'bg-emerald-50' : 'bg-amber-50/50'}`}>
            <div className="flex items-center gap-2">
              <Receipt className={`w-3.5 h-3.5 ${proof.status === 'received' || proof.status === 'verified' ? 'text-emerald-500' : 'text-amber-500'}`} />
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-[var(--text-primary)]">
                  {proof.status === 'received' ? 'Ricevuta registrata' : proof.status === 'verified' ? 'Ricevuta verificata' : 'Ricevuta attesa'}
                </p>
                {proof.reference_code && <p className="text-[9px] text-[var(--text-muted)]">Rif: {proof.reference_code}</p>}
                {proof.proof_type_label && <p className="text-[9px] text-[var(--text-muted)]">{proof.proof_type_label}</p>}
              </div>
              {needsProof && <Button variant="outline" size="sm" className="h-6 text-[9px] px-2 rounded" onClick={onShowProofDialog} data-testid="upload-proof-btn">Carica</Button>}
            </div>
          </div>
        )}

        {/* Security note */}
        <p className="text-[9px] text-[var(--text-muted)] flex items-center gap-1">
          <Lock className="w-3 h-3 flex-shrink-0" />Herion non conserva le tue credenziali. L'accesso al portale avviene sempre sotto il tuo controllo.
        </p>
      </div>
    </div>
  );
}


function ComplianceCard({ compliance }) {
  const [expanded, setExpanded] = useState(false);
  const rights = compliance.rights || [];
  const obligations = compliance.obligations || [];
  const risks = compliance.risks || [];
  const whatIfMissed = compliance.what_if_missed;

  return (
    <div className="bg-white rounded-xl border" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="compliance-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--hover-soft)] transition-colors"
        data-testid="compliance-toggle"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#0ABFCF]" />
          <div className="text-left">
            <p className="text-[11px] font-bold text-[var(--text-primary)]">Tutela e conformita</p>
            <p className="text-[9px] text-[var(--text-muted)]">Diritti, obblighi e rischi per questa procedura</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
      </button>

      {expanded && (
        <div className="border-t px-5 py-4 space-y-4" style={{ borderColor: 'var(--border-soft)' }}>
          {/* Rights */}
          {rights.length > 0 && (
            <div data-testid="compliance-rights">
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3" />I tuoi diritti
              </p>
              <div className="space-y-1.5">
                {rights.map((r, i) => (
                  <div key={i} className="p-2.5 bg-emerald-50/50 rounded-lg">
                    <p className="text-[10px] font-semibold text-emerald-800">{r.title}</p>
                    <p className="text-[9px] text-emerald-700/80 mt-0.5 leading-relaxed">{r.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Obligations */}
          {obligations.length > 0 && (
            <div data-testid="compliance-obligations">
              <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ClipboardCheck className="w-3 h-3" />I tuoi obblighi
              </p>
              <div className="space-y-1.5">
                {obligations.map((o, i) => (
                  <div key={i} className="p-2.5 bg-blue-50/50 rounded-lg">
                    <p className="text-[10px] font-semibold text-blue-800">{o.title}</p>
                    <p className="text-[9px] text-blue-700/80 mt-0.5 leading-relaxed">{o.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risks */}
          {risks.length > 0 && (
            <div data-testid="compliance-risks">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />Rischi e sanzioni
              </p>
              <div className="space-y-1.5">
                {risks.map((r, i) => (
                  <div key={i} className="p-2.5 bg-amber-50/50 rounded-lg">
                    <p className="text-[10px] font-semibold text-amber-800">{r.title}</p>
                    <p className="text-[9px] text-amber-700/80 mt-0.5 leading-relaxed">{r.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What happens if missed */}
          {whatIfMissed && (
            <div className="p-3 bg-[var(--bg-soft)] rounded-lg" data-testid="compliance-what-if">
              <p className="text-[10px] font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                <Info className="w-3 h-3 text-[#0ABFCF]" />Cosa succede se salto un passaggio?
              </p>
              <p className="text-[9px] text-[var(--text-secondary)] leading-relaxed">{whatIfMissed}</p>
            </div>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 pt-1" data-testid="compliance-disclaimer">
            <Shield className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
            <p className="text-[8px] text-[var(--text-muted)] leading-relaxed italic">{compliance.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  );
}



function DocumentSection({ documents, docsSummary, canUpload, uploading, onFileSelect }) {
  const uploadedDocs = documents.filter(d => !d.is_deleted);
  return (
    <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="document-section">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-[12px] font-bold text-[var(--text-primary)]">Archivio documenti</p>
          <p className="text-[9px] text-[var(--text-muted)] mt-0.5">I documenti caricati restano nel tuo archivio personale</p>
        </div>
        {canUpload && (
          <label className="cursor-pointer">
            <input type="file" onChange={onFileSelect} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.p7m" data-testid="file-input" />
            <Button variant="outline" className="rounded-xl text-[10px] h-7 px-3" style={{ borderColor: 'var(--border-soft)' }} disabled={uploading} asChild>
              <span>{uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}Carica</span>
            </Button>
          </label>
        )}
      </div>

      {/* Archive clarification banner */}
      <div className="flex items-start gap-2 p-2.5 bg-blue-50/30 rounded-lg mb-3 border border-blue-100/50" data-testid="archive-clarification">
        <Info className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-[9px] text-blue-600/70 leading-relaxed">Caricare un documento qui significa conservarlo nel tuo archivio Herion per la preparazione della pratica. Non equivale a un invio ufficiale all'ente.</p>
      </div>

      {/* Missing docs from workspace */}
      {docsSummary.missing_count > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-bold text-amber-700 mb-1.5">Da caricare per preparare la pratica ({docsSummary.missing_count})</p>
          <div className="space-y-1">
            {(docsSummary.missing_labels || []).map((label, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1.5 px-3 bg-amber-50/60 rounded-lg" data-testid={`missing-doc-${i}`}>
                <Upload className="w-3 h-3 text-amber-500 flex-shrink-0" />
                <p className="text-[11px] text-amber-800 font-medium flex-1">{label}</p>
                <span className="text-[9px] text-amber-600 font-semibold">Richiesto</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded docs */}
      {uploadedDocs.length > 0 ? (
        <div className="space-y-1">
          {uploadedDocs.map(doc => {
            const isP7m = doc.original_filename?.endsWith('.p7m');
            const isGenerated = doc.source === 'system' || doc.source === 'agent';
            const isSigned = isP7m || doc.signed;
            const needsSig = doc.needs_signature && !isSigned;
            let badge = isGenerated ? <span className="text-[8px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Generato da Herion</span>
              : isSigned ? <span className="text-[8px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">Firmato {isP7m ? '(p7m)' : ''}</span>
              : needsSig ? <span className="text-[8px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">Richiede firma</span>
              : <span className="text-[8px] font-bold bg-[var(--bg-soft)] text-[var(--text-muted)] px-1.5 py-0.5 rounded">In archivio</span>;
            return (
              <div key={doc.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--hover-soft)] transition-colors" data-testid={`document-${doc.id}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <File className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-[var(--text-primary)] truncate">{doc.original_filename}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {badge}
                      <span className="text-[7px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5" data-testid={`doc-ai-badge-${doc.id}`}>
                        <Lock className="w-2 h-2" />Solo AI
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded"><Download className="w-3 h-3" /></Button>
              </div>
            );
          })}
        </div>
      ) : docsSummary.missing_count === 0 ? (
        <div className="border border-dashed rounded-xl p-5 text-center" style={{ borderColor: 'var(--border-soft)' }}>
          <Upload className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2 opacity-40" strokeWidth={1.5} />
          <p className="text-[12px] text-[var(--text-secondary)] font-medium">Nessun documento nel tuo archivio</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Carica i documenti per iniziare a preparare la pratica</p>
        </div>
      ) : null}

      {uploadedDocs.some(d => d.original_filename?.endsWith('.p7m')) && (
        <div className="mt-3 p-3 bg-[var(--bg-soft)] rounded-lg flex items-start gap-2">
          <Shield className="w-3.5 h-3.5 text-[#0ABFCF] flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-[var(--text-secondary)]">I file <strong>.p7m</strong> sono firmati digitalmente. La firma garantisce autenticita e integrita.</p>
        </div>
      )}

      {/* Data sovereignty & access transparency */}
      {uploadedDocs.length > 0 && (
        <div className="mt-3 p-3 bg-[var(--bg-app)] rounded-lg space-y-2" data-testid="doc-sovereignty">
          <div className="flex items-start gap-2">
            <Lock className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[9px] font-semibold text-[var(--text-primary)]">Privacy dei tuoi documenti</p>
              <p className="text-[8px] text-[var(--text-muted)] leading-relaxed">I file vengono elaborati in modalita automatizzata. I dati necessari alla pratica vengono estratti senza visualizzazione del contenuto originale da parte di operatori.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 pl-5">
            <span className="text-[7px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Crittografia AES-256</span>
            <span className="text-[7px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Conforme GDPR</span>
            <span className="text-[7px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">Dati in UE</span>
          </div>
        </div>
      )}
    </div>
  );
}



// ═══════════════════════════════════════

// ═══════════════════════════════════════
// DEPENDENCY & RISK CARD (Practice Detail)
// ═══════════════════════════════════════

const DEP_TYPE_STYLES = {
  mandatory: { bg: 'bg-red-50', text: 'text-red-700', label: 'Obbligatorio', dot: 'bg-red-400' },
  recommended: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Consigliato', dot: 'bg-blue-400' },
  conditional: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Condizionale', dot: 'bg-amber-400' },
};
const DEP_TIMING = { before: 'Prima', during: 'Contestuale', after: 'Dopo' };
const DEP_RISK_STYLES = {
  high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
  low: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100' },
};

function PracticeDependencyCard({ deps }) {
  const [expanded, setExpanded] = useState(false);
  if (!deps?.has_dependencies) return null;
  const { linked_obligations, risk_if_omitted, completion_integrity, mandatory_links, high_risks } = deps;

  return (
    <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="practice-dependency-card">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left px-5 py-3.5 flex items-center gap-3 bg-orange-50/30 border-b border-orange-100 hover:bg-orange-50/50 transition-colors" data-testid="dependency-toggle">
        <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" strokeWidth={1.5} />
        <div className="flex-1">
          <p className="text-[11px] font-bold text-orange-800">Passaggi collegati e rischi</p>
          <p className="text-[9px] text-orange-600/60 mt-0.5">{mandatory_links} obbligatori, {high_risks} rischi alti</p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-orange-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="px-5 py-4 space-y-3">
          {linked_obligations.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1.5">Cosa non dimenticare</p>
              {linked_obligations.map((ob, i) => {
                const st = DEP_TYPE_STYLES[ob.type] || DEP_TYPE_STYLES.recommended;
                return (
                  <div key={i} className={`flex items-start gap-2 p-2 rounded-lg mb-1 ${st.bg}`} data-testid={`dep-obligation-${i}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${st.dot} flex-shrink-0 mt-1.5`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-[10px] font-semibold ${st.text}`}>{ob.label}</p>
                        <span className={`text-[7px] font-bold ${st.text} opacity-60`}>{st.label}</span>
                        <span className="text-[7px] text-[var(--text-muted)] ml-auto">{DEP_TIMING[ob.when_needed]}</span>
                      </div>
                      <p className="text-[9px] text-[var(--text-secondary)] mt-0.5">{ob.why_linked}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {risk_if_omitted.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1.5">Rischi da evitare</p>
              {risk_if_omitted.map((risk, i) => {
                const rs = DEP_RISK_STYLES[risk.severity] || DEP_RISK_STYLES.medium;
                return (
                  <div key={i} className={`p-2 rounded-lg border mb-1 ${rs.bg} ${rs.border}`} data-testid={`dep-risk-${i}`}>
                    <p className={`text-[9px] font-bold ${rs.text}`}>{risk.label}</p>
                    <p className="text-[9px] text-[var(--text-secondary)] mt-0.5">{risk.description}</p>
                  </div>
                );
              })}
            </div>
          )}
          {completion_integrity && (
            <div className="p-2.5 bg-[var(--bg-app)] rounded-lg" data-testid="dep-completion">
              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Percorso completo</p>
              {completion_integrity.is_complete_only_if?.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 mb-0.5">
                  <Circle className="w-2 h-2 text-[var(--text-muted)]" />
                  <p className="text-[9px] text-[var(--text-primary)]">{item}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// TRACKING CARD — STATUS INTELLIGENCE
// ═══════════════════════════════════════

const TRACKING_STATE_STYLES = {
  waiting: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' },
  active: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  confirmed: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  external: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
  action_required: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  completed: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  blocked: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
};

const MILESTONE_STYLES = {
  done: { bg: 'bg-emerald-500', text: 'text-emerald-600', line: 'bg-emerald-300' },
  current: { bg: 'bg-blue-500', text: 'text-blue-600', line: 'bg-blue-200' },
  pending: { bg: 'bg-slate-200', text: 'text-slate-400', line: 'bg-slate-200' },
  blocked: { bg: 'bg-red-500', text: 'text-red-600', line: 'bg-red-200' },
};

function TrackingCard({ tracking, status, onAddReference, onCopyReference }) {
  if (!tracking) return null;

  const t = tracking;
  const stateStyle = TRACKING_STATE_STYLES[t.tracked_state_category] || TRACKING_STATE_STYLES.waiting;
  const hasRef = t.has_reference;
  const isPostSubmission = ['submitted_manually', 'submitted_via_channel', 'waiting_external_response', 'completed', 'accepted_by_entity'].includes(status);
  const showTrackingPrompt = isPostSubmission && !hasRef;

  return (
    <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="tracking-card">

      {/* ── TOP BLOCK: Current Tracked State ── */}
      <div className={`px-5 py-4 ${stateStyle.bg} border-b ${stateStyle.border}`}>
        <div className="flex items-center gap-2 mb-1.5">
          <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)]" strokeWidth={1.5} />
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Stato monitoraggio</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${stateStyle.dot} flex-shrink-0`} />
          <p className={`text-[15px] font-bold ${stateStyle.text}`} data-testid="tracking-state-label">{t.tracked_state_label}</p>
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 leading-relaxed" data-testid="tracking-explanation">{t.status_explanation}</p>
      </div>

      <div className="px-5 py-4 space-y-4">

        {/* ── TRACKING REFERENCE BLOCK ── */}
        {hasRef ? (
          <div className="space-y-2" data-testid="tracking-reference-block">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Riferimento ufficiale</p>
            <div className="flex items-center gap-3 p-3 bg-[var(--bg-soft)] rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{t.identifier_type_label}</p>
                <p className="text-[14px] font-bold text-[var(--text-primary)] mt-0.5 font-mono tracking-wide" data-testid="tracking-reference-value">{t.identifier_value}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${stateStyle.bg} ${stateStyle.text}`}>{t.tracked_state_label}</span>
                <button onClick={() => onCopyReference(t.identifier_value)} className="w-7 h-7 rounded-lg flex items-center justify-center bg-white border hover:bg-[var(--hover-soft)] transition-colors" style={{ borderColor: 'var(--border-soft)' }} data-testid="copy-reference-btn" title="Copia riferimento">
                  <Copy className="w-3 h-3 text-[var(--text-muted)]" />
                </button>
              </div>
            </div>
          </div>
        ) : showTrackingPrompt ? (
          <div className="space-y-2" data-testid="tracking-prompt-block">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Riferimento ufficiale</p>
            <div className="p-4 border border-dashed rounded-lg text-center" style={{ borderColor: 'var(--border-soft)' }}>
              <Clock className="w-5 h-5 text-[var(--text-muted)] mx-auto mb-2 opacity-50" strokeWidth={1.5} />
              <p className="text-[11px] text-[var(--text-secondary)] font-medium">Riferimento ufficiale non ancora disponibile</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Appena disponibile, lo useremo per seguire lo stato del procedimento.</p>
              {t.expected_identifier?.type_label && (
                <p className="text-[9px] text-[var(--text-muted)] mt-2">Riferimento atteso: <span className="font-semibold">{t.expected_identifier.type_label}</span>{t.expected_timing?.is_immediate ? ' (rilascio immediato)' : ' (rilascio differito)'}</p>
              )}
              <Button variant="outline" className="mt-3 rounded-lg h-8 text-[10px] px-4" onClick={onAddReference} data-testid="add-tracking-reference-btn">
                <ArrowRight className="w-3 h-3 mr-1.5" />Inserisci riferimento
              </Button>
            </div>
          </div>
        ) : t.expected_identifier?.type_label ? (
          <div className="space-y-1" data-testid="tracking-expected-block">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Riferimento atteso</p>
            <p className="text-[11px] text-[var(--text-secondary)]">{t.expected_identifier.type_label}{t.expected_timing?.is_immediate ? ' — rilascio immediato dopo l\'invio' : ' — rilascio differito'}</p>
          </div>
        ) : null}

        {/* ── HERION VERIFICATION BLOCK ── */}
        {t.verification_summary && (
          <div className="space-y-1.5" data-testid="tracking-verification-block">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Verifica Herion</p>
            <div className="flex items-start gap-2.5 p-3 bg-[var(--bg-soft)] rounded-lg">
              <ShieldCheck className="w-4 h-4 text-[#0ABFCF] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-[var(--text-primary)]">{t.verification_summary.label}</p>
                {t.verification_summary.notes && (
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{t.verification_summary.notes}</p>
                )}
                {t.last_verified_at && (
                  <p className="text-[9px] text-[var(--text-muted)] mt-1">Ultimo controllo: {format(new Date(t.last_verified_at), 'dd MMM yyyy, HH:mm', { locale: it })}</p>
                )}
              </div>
              {t.verification_count > 0 && (
                <span className="text-[8px] font-bold bg-[#0ABFCF]/10 text-[#0ABFCF] px-2 py-0.5 rounded-full flex-shrink-0">{t.verification_count} {t.verification_count === 1 ? 'verifica' : 'verifiche'}</span>
              )}
            </div>
          </div>
        )}

        {/* ── EXTERNAL ENTITY STATE BLOCK ── */}
        {t.entity_name && t.entity_state !== 'unknown' && (
          <div className="space-y-1.5" data-testid="tracking-entity-block">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Stato ente</p>
            <div className="flex items-center gap-3 p-3 bg-purple-50/40 rounded-lg">
              <Building2 className="w-4 h-4 text-purple-500 flex-shrink-0" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-[var(--text-primary)]">{t.entity_name}</p>
                <p className="text-[10px] text-purple-600 mt-0.5">{t.entity_state_label}</p>
              </div>
            </div>
          </div>
        )}

        {t.entity_name && t.entity_state === 'unknown' && hasRef && (
          <div className="space-y-1.5" data-testid="tracking-entity-unknown-block">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Stato ente</p>
            <div className="flex items-center gap-3 p-2.5 rounded-lg">
              <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" strokeWidth={1.5} />
              <p className="text-[10px] text-[var(--text-muted)]">{t.entity_name} — lo stato dettagliato non e ancora disponibile</p>
            </div>
          </div>
        )}

        {/* ── NEXT STEP BLOCK ── */}
        {t.next_expected_step && (
          <div className={`p-3.5 rounded-lg ${t.user_action_required ? 'bg-amber-50/60 border border-amber-200' : 'bg-blue-50/40'}`} data-testid="tracking-next-step">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-1 text-[var(--text-muted)]">{t.user_action_required ? 'Serve il tuo intervento' : 'Cosa succede adesso'}</p>
            <p className={`text-[12px] font-medium leading-relaxed ${t.user_action_required ? 'text-amber-800' : 'text-[var(--text-primary)]'}`}>{t.next_expected_step}</p>
            {t.user_action_required && !hasRef && isPostSubmission && (
              <Button className="mt-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg h-8 text-[10px] px-4" onClick={onAddReference} data-testid="tracking-action-btn">
                <ArrowRight className="w-3 h-3 mr-1.5" />Inserisci riferimento
              </Button>
            )}
          </div>
        )}

        {/* ── MINI TIMELINE ── */}
        {t.mini_timeline?.length > 0 && (
          <div className="pt-1" data-testid="tracking-mini-timeline">
            <div className="flex items-center justify-between">
              {t.mini_timeline.map((m, i) => {
                const ms = MILESTONE_STYLES[m.status] || MILESTONE_STYLES.pending;
                return (
                  <div key={m.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${ms.bg} flex-shrink-0`} />
                      <p className={`text-[8px] font-semibold mt-1 text-center max-w-[65px] leading-tight ${ms.text}`}>{m.label}</p>
                    </div>
                    {i < t.mini_timeline.length - 1 && (
                      <div className={`h-px flex-1 mx-1 ${ms.line}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TRACKING ROUTE LINK ── */}
        {t.tracking_route && hasRef && (
          <a href={t.tracking_route} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-[var(--bg-soft)] rounded-lg hover:bg-[var(--hover-soft)] transition-colors" data-testid="tracking-route-link">
            <Search className="w-3 h-3 text-[#0ABFCF] flex-shrink-0" />
            <span className="text-[10px] text-[#0ABFCF] font-medium truncate">Verifica stato sul portale ufficiale</span>
          </a>
        )}
      </div>
    </div>
  );
}


function DelegationSection({ delegation, officialAction, onDelegate, onRevoke }) {
  const isActive = delegation.enabled;
  const levelCfg = DELEGATION_LEVEL_LABELS[delegation.level] || DELEGATION_LEVEL_LABELS.assist;

  return (
    <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="delegation-section">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <UserCheck className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Delega</p>
        </div>
        {isActive ? (
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${levelCfg.bg} ${levelCfg.color}`}>{levelCfg.label}</span>
        ) : (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Non attiva</span>
        )}
      </div>

      {isActive ? (
        <div className="space-y-2.5">
          <p className="text-[11px] text-[var(--text-secondary)]">{levelCfg.desc}</p>

          {/* Scope labels */}
          <div className="flex flex-wrap gap-1">
            {Object.entries(delegation.scope_labels || {}).map(([key, label]) => (
              <span key={key} className="text-[9px] bg-[var(--bg-soft)] text-[var(--text-primary)] px-2 py-0.5 rounded-full font-medium">{label}</span>
            ))}
          </div>

          {/* What still needs user */}
          {officialAction?.requires_user_direct_step && (
            <p className="text-[10px] text-amber-600 flex items-center gap-1">
              <Info className="w-3 h-3 flex-shrink-0" />L'invio ufficiale richiede la tua azione diretta
            </p>
          )}

          <div className="flex items-center justify-between">
            <p className="text-[9px] text-[var(--text-muted)]">
              {delegation.granted_at && `Concessa il ${format(new Date(delegation.granted_at), 'dd MMM yyyy', { locale: it })}`}
            </p>
            <Button variant="outline" size="sm" className="h-7 text-[10px] px-3 rounded-lg text-red-500 border-red-200 hover:bg-red-50" onClick={onRevoke} data-testid="revoke-delegation-btn">Revoca</Button>
          </div>

          <p className="text-[9px] text-[var(--text-muted)] flex items-center gap-1">
            <Lock className="w-2.5 h-2.5 flex-shrink-0" />Ogni azione delegata e tracciata. Puoi revocare in qualsiasi momento.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <p className="text-[11px] text-[var(--text-secondary)]">Concedi a Herion la delega per agire per tuo conto su questa pratica.</p>
          <div className="text-[10px] text-[var(--text-muted)] space-y-1">
            <p>Con la delega, Herion puo:</p>
            <p className="pl-2">- Preparare e monitorare la pratica</p>
            <p className="pl-2">- Richiedere documenti mancanti</p>
            <p className="pl-2">- Segnalarti i passaggi che richiedono la tua azione</p>
          </div>
          <Button variant="outline" className="rounded-lg h-9 text-[11px] font-semibold w-full" onClick={onDelegate} data-testid="grant-delegation-btn">
            <UserCheck className="w-3.5 h-3.5 mr-1.5" />Concedi delega
          </Button>
        </div>
      )}
    </div>
  );
}
