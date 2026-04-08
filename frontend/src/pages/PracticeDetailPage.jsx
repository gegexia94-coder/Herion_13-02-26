import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPractice, updatePractice, uploadDocument, getPracticeDocuments, executeAgent, getPracticeActivityLogs, downloadPracticePdf, orchestrateAgents } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Upload, Clock, CheckCircle, AlertCircle, History, Play, Loader2, File, Download, Sparkles, AlertTriangle, FileDown, Search, ShieldCheck, FileText, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

const AGENTS = [
  { type: 'analysis', name: 'Analisi', icon: Search, step: 1 },
  { type: 'validation', name: 'Validazione', icon: CheckCircle, step: 2 },
  { type: 'compliance', name: 'Conformita', icon: ShieldCheck, step: 3 },
  { type: 'document', name: 'Documenti', icon: FileText, step: 4 },
  { type: 'communication', name: 'Comunicazione', icon: MessageSquare, step: 5 },
];

const DOC_CATEGORIES = [
  { key: 'identity', label: 'Identita' }, { key: 'tax_declarations', label: 'Dichiarazioni' },
  { key: 'vat_documents', label: 'IVA' }, { key: 'invoices', label: 'Fatture' },
  { key: 'company_documents', label: 'Societari' }, { key: 'accounting', label: 'Contabili' },
  { key: 'compliance', label: 'Conformita' }, { key: 'payroll', label: 'Lavoro' },
  { key: 'activity', label: 'Attivita' }, { key: 'other', label: 'Altro' },
];

export default function PracticeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [practice, setPractice] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('analysis');
  const [agentQuery, setAgentQuery] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentResponse, setAgentResponse] = useState(null);
  const [showStatusDialog, setShowStatusDialog] = useState({ open: false, status: '' });
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [uploadCategory, setUploadCategory] = useState('other');
  const [orchestrating, setOrchestrating] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [p, d, l] = await Promise.all([getPractice(id), getPracticeDocuments(id), getPracticeActivityLogs(id)]);
      setPractice(p.data); setDocuments(d.data); setActivityLogs(l.data);
    } catch { toast.error('Errore nel caricamento'); }
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
    setShowAgentDialog(false); setAgentLoading(true); setAgentResponse(null);
    try { const r = await executeAgent(selectedAgent, id, { query: agentQuery }); setAgentResponse(r.data); toast.success('Analisi completata'); loadData(); }
    catch (e) { toast.error("Errore nell'elaborazione", { description: e.response?.data?.detail }); }
    finally { setAgentLoading(false); }
  };

  const handleOrchestrate = async () => {
    setOrchestrating(true);
    try { await orchestrateAgents(id, agentQuery || 'Analisi completa della pratica'); toast.success('Analisi completa terminata'); loadData(); }
    catch (e) { toast.error('Errore nell\'orchestrazione', { description: e.response?.data?.detail }); }
    finally { setOrchestrating(false); }
  };

  const handlePdfDownload = async () => {
    setPdfLoading(true);
    try {
      const response = await downloadPracticePdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `Herion_Pratica_${id.slice(0, 8)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF scaricato');
    } catch (e) { toast.error(e.response?.data?.detail || 'Errore nel download PDF'); }
    finally { setPdfLoading(false); }
  };

  const statusBadge = (status, label) => {
    const v = { pending: 'bg-amber-50 text-amber-700 border-amber-200', processing: 'bg-sky-50 text-sky-700 border-sky-200', completed: 'bg-emerald-50 text-emerald-700 border-emerald-200', rejected: 'bg-red-50 text-red-700 border-red-200' };
    return <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${v[status] || v.pending}`}>{label}</span>;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F4C5C]" /></div>;
  if (!practice) return <div className="text-center py-16"><p className="text-[#475569]">Pratica non trovata</p><Button onClick={() => navigate('/practices')} variant="outline" className="mt-4 rounded-xl">Torna alle pratiche</Button></div>;

  return (
    <div className="space-y-6" data-testid="practice-detail-page">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <button onClick={() => navigate('/practices')} className="flex items-center gap-1.5 text-xs text-[#475569] hover:text-[#0F172A] mb-3 transition-colors" data-testid="back-btn"><ArrowLeft className="w-3.5 h-3.5" />Torna alle pratiche</button>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight mb-0.5">{practice.practice_type_label}</h1>
          <p className="text-sm text-[#475569]">{practice.client_name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {statusBadge(practice.status, practice.status_label)}
          {practice.status === 'completed' && (
            <Button onClick={handlePdfDownload} disabled={pdfLoading} variant="outline" className="rounded-full border-[#E2E8F0] text-sm h-9 px-4" data-testid="download-pdf-btn">
              {pdfLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5 mr-1.5" />}Scarica PDF
            </Button>
          )}
          <Select value={practice.status} onValueChange={(v) => setShowStatusDialog({ open: true, status: v })}>
            <SelectTrigger className="w-40 rounded-full border-[#E2E8F0] h-9 text-xs" data-testid="status-select"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="pending">In Attesa</SelectItem>
              <SelectItem value="processing">In Elaborazione</SelectItem>
              <SelectItem value="completed">Completata</SelectItem>
              <SelectItem value="rejected">Rifiutata</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Practice Info */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-bold text-[#0F172A] mb-4">Dettagli Pratica</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {practice.client_type && <div><p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-0.5">Tipo Cliente</p><p className="text-sm text-[#0F172A]">{practice.client_type_label || practice.client_type}</p></div>}
              {practice.fiscal_code && <div><p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-0.5">Codice Fiscale</p><p className="text-sm font-mono text-[#0F172A]">{practice.fiscal_code}</p></div>}
              {practice.vat_number && <div><p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-0.5">Partita IVA</p><p className="text-sm font-mono text-[#0F172A]">{practice.vat_number}</p></div>}
              {practice.country && <div><p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-0.5">Paese</p><p className="text-sm text-[#0F172A]">{practice.country}</p></div>}
              <div><p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-0.5">Data Creazione</p><p className="text-sm text-[#0F172A]">{format(new Date(practice.created_at), 'dd MMM yyyy, HH:mm', { locale: it })}</p></div>
            </div>
            <div><p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-0.5">Descrizione</p><p className="text-sm text-[#0F172A]">{practice.description}</p></div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#0F172A]">Documenti</h3>
              <label className="cursor-pointer"><input type="file" onChange={handleFileSelect} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" data-testid="file-input" />
                <Button variant="outline" className="rounded-full border-[#E2E8F0] text-xs h-8" disabled={uploading} asChild><span>{uploading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}Carica</span></Button>
              </label>
            </div>
            {documents.length > 0 ? (
              <div className="space-y-2">{documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 border border-[#E2E8F0] rounded-xl hover:bg-[#F7FAFC] transition-colors" data-testid={`document-${doc.id}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center"><File className="w-3.5 h-3.5 text-[#475569]" /></div>
                    <div><p className="text-sm font-medium text-[#0F172A]">{doc.original_filename}</p><p className="text-[10px] text-[#475569]">{doc.category && doc.category !== 'other' ? DOC_CATEGORIES.find(c => c.key === doc.category)?.label : ''} {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: it })}</p></div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg"><Download className="w-3.5 h-3.5" /></Button>
                </div>
              ))}</div>
            ) : (
              <div className="border-2 border-dashed border-[#E2E8F0] rounded-xl p-6 text-center">
                <Upload className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-xs text-[#475569]">Nessun documento</p>
              </div>
            )}
          </div>

          {/* AI Section */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#0F4C5C] flex items-center justify-center"><Sparkles className="w-4.5 h-4.5 text-[#5DD9C1]" /></div>
              <div><h3 className="text-sm font-bold text-[#0F172A]">Herion AI</h3><p className="text-[10px] text-[#475569]">5 agenti specializzati per questa pratica</p></div>
            </div>

            {/* Agent Selector */}
            <div className="grid grid-cols-5 gap-1.5 mb-4">
              {AGENTS.map(a => (
                <button key={a.type} onClick={() => setSelectedAgent(a.type)}
                  className={`p-2.5 border rounded-xl text-center transition-all ${selectedAgent === a.type ? 'border-[#0F4C5C] bg-[#0F4C5C]/[0.03] ring-1 ring-[#0F4C5C]' : 'border-[#E2E8F0] hover:border-[#0F4C5C]/30'}`}
                  data-testid={`agent-select-${a.type}`}>
                  <a.icon className={`w-4 h-4 mx-auto mb-1 ${selectedAgent === a.type ? 'text-[#0F4C5C]' : 'text-[#94A3B8]'}`} strokeWidth={1.5} />
                  <p className="text-[10px] font-medium text-[#0F172A]">{a.name}</p>
                </button>
              ))}
            </div>

            <Textarea placeholder="Descrivi cosa vuoi analizzare..." value={agentQuery} onChange={e => setAgentQuery(e.target.value)} className="rounded-xl border-[#E2E8F0] min-h-[70px] resize-none text-sm mb-3" data-testid="agent-query-input" />

            <div className="flex gap-2">
              <Button onClick={() => agentQuery.trim() && setShowAgentDialog(true)} disabled={agentLoading || !agentQuery.trim()} className="bg-[#0F4C5C] hover:bg-[#0b3844] rounded-xl flex-1 text-xs" data-testid="execute-agent-btn">
                {agentLoading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Elaborazione...</> : <><Play className="w-3.5 h-3.5 mr-1.5" />Esegui {AGENTS.find(a => a.type === selectedAgent)?.name}</>}
              </Button>
              <Button onClick={handleOrchestrate} disabled={orchestrating} variant="outline" className="rounded-xl border-[#5DD9C1] text-[#0F4C5C] text-xs hover:bg-[#5DD9C1]/10" data-testid="orchestrate-btn">
                {orchestrating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}Analisi Completa
              </Button>
            </div>

            {agentResponse && (
              <div className="mt-4 p-4 bg-[#0F4C5C]/[0.03] border border-[#0F4C5C]/10 rounded-xl" data-testid="agent-response">
                <div className="flex items-center gap-1.5 mb-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /><span className="text-xs font-semibold text-[#0F172A]">Risposta Herion AI</span></div>
                <div className="text-sm text-[#0F172A] whitespace-pre-wrap bg-white p-3 rounded-lg border border-[#E2E8F0]">{agentResponse.output}</div>
              </div>
            )}

            {/* Orchestration Result */}
            {practice.orchestration_result && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-[#0F172A]">Risultato Analisi Completa</p>
                {practice.orchestration_result.steps?.map((step, i) => (
                  <details key={i} className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                    <summary className="flex items-center gap-2 p-3 cursor-pointer hover:bg-[#F7FAFC] text-sm">
                      {step.status === 'completed' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                      <span className="font-medium text-[#0F172A]">Step {step.step}: {step.agent_name}</span>
                      <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full ${step.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{step.status === 'completed' ? 'Completato' : 'Errore'}</span>
                    </summary>
                    <div className="px-3 pb-3 text-sm text-[#475569] whitespace-pre-wrap border-t border-[#E2E8F0] pt-2">{step.output_data}</div>
                  </details>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] h-fit">
          <div className="flex items-center gap-2 mb-4"><History className="w-4 h-4 text-[#0F4C5C]" /><h3 className="text-sm font-bold text-[#0F172A]">Attivita</h3></div>
          <Tabs defaultValue="all">
            <TabsList className="w-full mb-3 bg-[#F1F5F9] rounded-lg p-0.5"><TabsTrigger value="all" className="flex-1 rounded-md text-[10px]">Tutto</TabsTrigger><TabsTrigger value="agent" className="flex-1 rounded-md text-[10px]">AI</TabsTrigger></TabsList>
            <TabsContent value="all">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {practice.agent_logs?.map(log => (
                    <div key={log.id} className="p-2.5 border border-[#E2E8F0] rounded-xl">
                      <div className="flex items-center justify-between mb-0.5"><span className="text-xs font-medium text-[#0F172A]">{log.agent_name}</span>{log.status === 'completed' ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <AlertCircle className="w-3 h-3 text-red-500" />}</div>
                      <p className="text-[10px] text-[#475569]">{log.explanation}</p>
                      <p className="text-[9px] text-[#94A3B8] mt-0.5">{format(new Date(log.started_at), 'dd MMM, HH:mm', { locale: it })}</p>
                    </div>
                  ))}
                  {activityLogs.map(log => (
                    <div key={log.id} className="p-2.5 border border-[#E2E8F0] rounded-xl">
                      <p className="text-xs font-medium text-[#0F172A] capitalize">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-[#475569] mt-0.5">{log.explanation}</p>
                      <p className="text-[9px] text-[#94A3B8] mt-0.5">{format(new Date(log.timestamp), 'dd MMM, HH:mm', { locale: it })}</p>
                    </div>
                  ))}
                  {(!practice.agent_logs?.length && !activityLogs.length) && <div className="text-center py-6"><Clock className="w-6 h-6 text-[#CBD5E1] mx-auto mb-1" /><p className="text-xs text-[#475569]">Nessuna attivita</p></div>}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="agent">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {practice.agent_logs?.length > 0 ? practice.agent_logs.map(log => (
                    <div key={log.id} className="p-2.5 border border-[#E2E8F0] rounded-xl">
                      <div className="flex items-center justify-between mb-0.5"><span className="text-xs font-medium text-[#0F172A]">{log.agent_name}</span>{log.status === 'completed' ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <AlertCircle className="w-3 h-3 text-red-500" />}</div>
                      <p className="text-[10px] text-[#475569]">{log.explanation}</p>
                    </div>
                  )) : <div className="text-center py-6"><Sparkles className="w-6 h-6 text-[#CBD5E1] mx-auto mb-1" /><p className="text-xs text-[#475569]">Nessun agente eseguito</p></div>}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialogs */}
      <AlertDialog open={showStatusDialog.open} onOpenChange={o => setShowStatusDialog({ open: o, status: '' })}>
        <AlertDialogContent className="rounded-2xl border-[#E2E8F0] shadow-2xl max-w-sm">
          <AlertDialogHeader>
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-3"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
            <AlertDialogTitle className="text-lg font-bold text-center">Cambia stato</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[#475569] text-sm">Questa azione verra registrata nel log.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2"><AlertDialogCancel className="rounded-xl border-[#E2E8F0] flex-1 text-sm">Annulla</AlertDialogCancel><AlertDialogAction onClick={handleStatusChange} className="bg-[#0F4C5C] hover:bg-[#0b3844] rounded-xl flex-1 text-sm">Conferma</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showAgentDialog} onOpenChange={setShowAgentDialog}>
        <AlertDialogContent className="rounded-2xl border-[#E2E8F0] shadow-2xl max-w-sm">
          <AlertDialogHeader>
            <div className="w-11 h-11 rounded-xl bg-[#0F4C5C]/10 flex items-center justify-center mx-auto mb-3"><Sparkles className="w-5 h-5 text-[#0F4C5C]" /></div>
            <AlertDialogTitle className="text-lg font-bold text-center">Esegui Herion AI</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[#475569] text-sm">Agente: <span className="font-medium text-[#0F172A]">{AGENTS.find(a => a.type === selectedAgent)?.name}</span></AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2"><AlertDialogCancel className="rounded-xl border-[#E2E8F0] flex-1 text-sm">Annulla</AlertDialogCancel><AlertDialogAction onClick={handleAgentExecute} className="bg-[#0F4C5C] hover:bg-[#0b3844] rounded-xl flex-1 text-sm">Esegui</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <AlertDialogContent className="rounded-2xl border-[#E2E8F0] shadow-2xl max-w-sm">
          <AlertDialogHeader>
            <div className="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center mx-auto mb-3"><Upload className="w-5 h-5 text-sky-600" /></div>
            <AlertDialogTitle className="text-lg font-bold text-center">Carica documento</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[#475569] text-sm">File: <span className="font-medium text-[#0F172A]">{pendingFile?.name}</span></AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Categoria</label>
            <Select value={uploadCategory} onValueChange={setUploadCategory}>
              <SelectTrigger className="rounded-xl border-[#E2E8F0] h-10 text-sm mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">{DOC_CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <AlertDialogFooter className="gap-2"><AlertDialogCancel className="rounded-xl border-[#E2E8F0] flex-1 text-sm">Annulla</AlertDialogCancel><AlertDialogAction onClick={handleFileUpload} className="bg-[#0F4C5C] hover:bg-[#0b3844] rounded-xl flex-1 text-sm">Carica</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
