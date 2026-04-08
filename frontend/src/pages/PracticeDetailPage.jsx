import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPractice, updatePractice, uploadDocument, getPracticeDocuments, executeAgent, getPracticeActivityLogs, downloadPracticePdf, orchestrateAgents, sendPracticeChat, getPracticeChatHistory } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Upload, Clock, CheckCircle, AlertCircle, History, Play, Loader2, File, Download, Sparkles, AlertTriangle, FileDown, Compass, ShieldCheck, Scale, FileText, MessageCircle, Send, Bot, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

const BRANDED_AGENTS = [
  { type: 'analysis', branded: 'Herion Compass', name: 'Analisi', icon: Compass, step: 1, color: 'text-sky-600', bg: 'bg-sky-50' },
  { type: 'validation', branded: 'Herion Shield', name: 'Validazione', icon: ShieldCheck, step: 2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { type: 'compliance', branded: 'Herion Rules', name: 'Conformita', icon: Scale, step: 3, color: 'text-[#C6A96B]', bg: 'bg-[#C6A96B]/10' },
  { type: 'document', branded: 'Herion Docs', name: 'Documenti', icon: FileText, step: 4, color: 'text-amber-600', bg: 'bg-amber-50' },
  { type: 'communication', branded: 'Herion Voice', name: 'Comunicazione', icon: MessageCircle, step: 5, color: 'text-violet-600', bg: 'bg-violet-50' },
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
  const chatEndRef = useRef(null);
  const [practice, setPractice] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('analysis');
  const [agentQuery, setAgentQuery] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState({ open: false, status: '' });
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [uploadCategory, setUploadCategory] = useState('other');
  const [orchestrating, setOrchestrating] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState({});

  const loadData = useCallback(async () => {
    try {
      const [p, d, l, c] = await Promise.all([getPractice(id), getPracticeDocuments(id), getPracticeActivityLogs(id), getPracticeChatHistory(id)]);
      setPractice(p.data); setDocuments(d.data); setActivityLogs(l.data); setChatHistory(c.data.reverse());
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

  const statusBadge = (status, label) => {
    const v = { pending: 'bg-amber-50 text-amber-700 border-amber-200', processing: 'bg-sky-50 text-sky-700 border-sky-200', completed: 'bg-emerald-50 text-emerald-700 border-emerald-200', rejected: 'bg-red-50 text-red-700 border-red-200' };
    return <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${v[status] || v.pending}`}>{label}</span>;
  };

  const getAgentConfig = (type) => BRANDED_AGENTS.find(a => a.type === type) || BRANDED_AGENTS[0];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F4C5C]" /></div>;
  if (!practice) return <div className="text-center py-16"><p className="text-[#475569]">Pratica non trovata</p><Button onClick={() => navigate('/practices')} variant="outline" className="mt-4 rounded-xl">Torna alle pratiche</Button></div>;

  return (
    <div className="space-y-5" data-testid="practice-detail-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <button onClick={() => navigate('/practices')} className="flex items-center gap-1.5 text-xs text-[#475569] hover:text-[#0F172A] mb-3 transition-colors" data-testid="back-btn"><ArrowLeft className="w-3.5 h-3.5" />Torna alle pratiche</button>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight mb-0.5">{practice.practice_type_label}</h1>
          <p className="text-sm text-[#475569]">{practice.client_name} &middot; {practice.country}</p>
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
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-bold text-[#0F172A] mb-3">Dettagli Pratica</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {practice.client_type && <div><p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-0.5">Tipo Cliente</p><p className="text-sm text-[#0F172A]">{practice.client_type_label}</p></div>}
              {practice.fiscal_code && <div><p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-0.5">Codice Fiscale</p><p className="text-sm font-mono text-[#0F172A]">{practice.fiscal_code}</p></div>}
              {practice.vat_number && <div><p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-0.5">Partita IVA</p><p className="text-sm font-mono text-[#0F172A]">{practice.vat_number}</p></div>}
              <div><p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-0.5">Data Creazione</p><p className="text-sm text-[#0F172A]">{format(new Date(practice.created_at), 'dd MMM yyyy, HH:mm', { locale: it })}</p></div>
            </div>
            <div><p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-0.5">Descrizione</p><p className="text-sm text-[#0F172A]">{practice.description}</p></div>
          </div>

          {/* Agent Activity Panel */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]" data-testid="agent-activity-panel">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#0F4C5C] flex items-center justify-center"><Bot className="w-4.5 h-4.5 text-[#5DD9C1]" /></div>
              <div><h3 className="text-sm font-bold text-[#0F172A]">Attivita degli Agenti</h3><p className="text-[10px] text-[#475569]">Cronologia trasparente di ogni azione AI su questa pratica</p></div>
            </div>

            {practice.agent_logs?.length > 0 ? (
              <div className="space-y-2">
                {practice.agent_logs.map((log) => {
                  const ac = getAgentConfig(log.agent_type);
                  const Icon = ac.icon;
                  const isExpanded = expandedLogs[log.id];
                  return (
                    <div key={log.id} className="border border-[#E2E8F0] rounded-xl overflow-hidden transition-all" data-testid={`agent-log-${log.id}`}>
                      <button onClick={() => toggleLog(log.id)} className="w-full flex items-center gap-3 p-3 hover:bg-[#F7FAFC] transition-colors text-left">
                        <div className={`w-8 h-8 rounded-lg ${ac.bg} flex items-center justify-center flex-shrink-0`}><Icon className={`w-4 h-4 ${ac.color}`} strokeWidth={1.5} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#0F172A]">{log.branded_name || ac.branded}</span>
                            <span className="text-[9px] text-[#475569]">Step {log.step}</span>
                          </div>
                          <p className="text-[10px] text-[#475569] truncate">{log.explanation}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {log.status === 'completed' ? <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">Completato</span>
                            : log.status === 'failed' || log.status === 'error' ? <span className="text-[9px] px-1.5 py-0.5 bg-red-50 text-red-700 rounded-full font-medium">Errore</span>
                            : <span className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium">In corso</span>}
                          <span className="text-[9px] text-[#94A3B8]">{log.started_at ? format(new Date(log.started_at), 'dd/MM HH:mm') : ''}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#94A3B8]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />}
                        </div>
                      </button>
                      {isExpanded && log.output_data && (
                        <div className="px-3 pb-3 border-t border-[#E2E8F0]">
                          <div className="mt-2 p-3 bg-[#F7FAFC] rounded-lg text-sm text-[#0F172A] whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">{typeof log.output_data === 'string' ? log.output_data : JSON.stringify(log.output_data, null, 2)}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border-2 border-dashed border-[#E2E8F0] rounded-xl p-6 text-center">
                <Sparkles className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-xs text-[#475569]">Nessun agente ha ancora lavorato su questa pratica</p>
              </div>
            )}
          </div>

          {/* Herion AI - Execute Section */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#0F4C5C] flex items-center justify-center"><Sparkles className="w-4.5 h-4.5 text-[#5DD9C1]" /></div>
              <div><h3 className="text-sm font-bold text-[#0F172A]">Esegui Herion AI</h3><p className="text-[10px] text-[#475569]">Seleziona un agente o avvia l'analisi completa</p></div>
            </div>
            <div className="grid grid-cols-5 gap-1.5 mb-3">
              {BRANDED_AGENTS.map(a => (
                <button key={a.type} onClick={() => setSelectedAgent(a.type)}
                  className={`p-2.5 border rounded-xl text-center transition-all ${selectedAgent === a.type ? 'border-[#0F4C5C] bg-[#0F4C5C]/[0.03] ring-1 ring-[#0F4C5C]' : 'border-[#E2E8F0] hover:border-[#0F4C5C]/30'}`}
                  data-testid={`agent-select-${a.type}`}>
                  <a.icon className={`w-4 h-4 mx-auto mb-1 ${selectedAgent === a.type ? 'text-[#0F4C5C]' : 'text-[#94A3B8]'}`} strokeWidth={1.5} />
                  <p className="text-[9px] font-semibold text-[#0F172A]">{a.branded.replace('Herion ', '')}</p>
                </button>
              ))}
            </div>
            <Textarea placeholder="Descrivi cosa vuoi analizzare..." value={agentQuery} onChange={e => setAgentQuery(e.target.value)} className="rounded-xl border-[#E2E8F0] min-h-[60px] resize-none text-sm mb-3" data-testid="agent-query-input" />
            <div className="flex gap-2">
              <Button onClick={() => agentQuery.trim() && setShowAgentDialog(true)} disabled={agentLoading || !agentQuery.trim()} className="bg-[#0F4C5C] hover:bg-[#0b3844] rounded-xl flex-1 text-xs" data-testid="execute-agent-btn">
                {agentLoading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Elaborazione...</> : <><Play className="w-3.5 h-3.5 mr-1.5" />Esegui {BRANDED_AGENTS.find(a => a.type === selectedAgent)?.branded}</>}
              </Button>
              <Button onClick={handleOrchestrate} disabled={orchestrating} variant="outline" className="rounded-xl border-[#5DD9C1] text-[#0F4C5C] text-xs hover:bg-[#5DD9C1]/10" data-testid="orchestrate-btn">
                {orchestrating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}Analisi Completa
              </Button>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#0F172A]">Documenti</h3>
              <label className="cursor-pointer"><input type="file" onChange={handleFileSelect} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" data-testid="file-input" />
                <Button variant="outline" className="rounded-full border-[#E2E8F0] text-xs h-8" disabled={uploading} asChild><span>{uploading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}Carica</span></Button>
              </label>
            </div>
            {documents.length > 0 ? (
              <div className="space-y-1.5">{documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-2.5 border border-[#E2E8F0] rounded-xl hover:bg-[#F7FAFC] transition-colors" data-testid={`document-${doc.id}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#F1F5F9] flex items-center justify-center"><File className="w-3 h-3 text-[#475569]" /></div>
                    <div><p className="text-xs font-medium text-[#0F172A]">{doc.original_filename}</p><p className="text-[9px] text-[#475569]">{DOC_CATEGORIES.find(c => c.key === doc.category)?.label || ''} &middot; {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: it })}</p></div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg"><Download className="w-3 h-3" /></Button>
                </div>
              ))}</div>
            ) : (
              <div className="border-2 border-dashed border-[#E2E8F0] rounded-xl p-5 text-center">
                <Upload className="w-7 h-7 text-[#CBD5E1] mx-auto mb-1.5" strokeWidth={1.5} /><p className="text-xs text-[#475569]">Nessun documento</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Q&A Chat + Activity */}
        <div className="space-y-5">
          {/* Herion Admin Q&A Chat */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]" data-testid="practice-chat">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#0F4C5C] flex items-center justify-center"><Bot className="w-4.5 h-4.5 text-[#5DD9C1]" /></div>
              <div><h3 className="text-sm font-bold text-[#0F172A]">Chiedi a Herion Admin</h3><p className="text-[10px] text-[#475569]">Domande sulla pratica</p></div>
            </div>

            <ScrollArea className="h-[280px] mb-3">
              <div className="space-y-2.5 pr-2">
                {chatHistory.length === 0 && !chatLoading && (
                  <div className="text-center py-6">
                    <Bot className="w-7 h-7 text-[#CBD5E1] mx-auto mb-2" />
                    <p className="text-xs text-[#475569] mb-2">Chiedi qualsiasi cosa su questa pratica</p>
                    <div className="space-y-1">
                      {['Qual e lo stato attuale?', 'Quali documenti mancano?', 'Qual e il prossimo passo?'].map((q, i) => (
                        <button key={i} onClick={() => setChatQuestion(q)} className="block w-full text-left text-[10px] text-[#0F4C5C] p-2 bg-[#0F4C5C]/[0.03] rounded-lg hover:bg-[#0F4C5C]/[0.06] transition-colors" data-testid={`chat-suggestion-${i}`}>{q}</button>
                      ))}
                    </div>
                  </div>
                )}
                {chatHistory.map(msg => (
                  <div key={msg.id}>
                    <div className="flex justify-end mb-1"><div className="bg-[#0F4C5C] text-white px-3 py-2 rounded-xl rounded-br-md text-xs max-w-[85%]">{msg.question}</div></div>
                    <div className="flex gap-2 mb-1">
                      <div className="w-6 h-6 rounded-md bg-[#5DD9C1]/15 flex items-center justify-center flex-shrink-0 mt-0.5"><Bot className="w-3 h-3 text-[#0F4C5C]" /></div>
                      <div className="bg-[#F7FAFC] border border-[#E2E8F0] px-3 py-2 rounded-xl rounded-bl-md text-xs text-[#0F172A] max-w-[85%] whitespace-pre-wrap">
                        <p className="text-[9px] font-semibold text-[#0F4C5C] mb-1">{msg.answered_by}</p>
                        {msg.answer}
                      </div>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-2"><div className="w-6 h-6 rounded-md bg-[#5DD9C1]/15 flex items-center justify-center flex-shrink-0"><Bot className="w-3 h-3 text-[#0F4C5C]" /></div>
                    <div className="bg-[#F7FAFC] border border-[#E2E8F0] px-3 py-2 rounded-xl text-xs"><Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F4C5C]" /></div></div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            <form onSubmit={handleChat} className="flex gap-2">
              <Input value={chatQuestion} onChange={e => setChatQuestion(e.target.value)} placeholder="Fai una domanda..." className="rounded-xl border-[#E2E8F0] h-9 text-xs flex-1" disabled={chatLoading} data-testid="chat-input" />
              <Button type="submit" size="sm" disabled={chatLoading || !chatQuestion.trim()} className="bg-[#0F4C5C] hover:bg-[#0b3844] rounded-xl h-9 w-9 p-0" data-testid="chat-send-btn"><Send className="w-3.5 h-3.5" /></Button>
            </form>
          </div>

          {/* Activity Log */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2 mb-3"><History className="w-4 h-4 text-[#0F4C5C]" /><h3 className="text-sm font-bold text-[#0F172A]">Registro Attivita</h3></div>
            <ScrollArea className="h-[250px]">
              <div className="space-y-1.5">
                {activityLogs.length > 0 ? activityLogs.map(log => (
                  <div key={log.id} className="p-2 border border-[#E2E8F0] rounded-lg">
                    <p className="text-[10px] font-medium text-[#0F172A] capitalize">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-[9px] text-[#94A3B8] mt-0.5">{format(new Date(log.timestamp), 'dd MMM, HH:mm', { locale: it })}</p>
                  </div>
                )) : <div className="text-center py-6"><Clock className="w-6 h-6 text-[#CBD5E1] mx-auto mb-1" /><p className="text-xs text-[#475569]">Nessuna attivita</p></div>}
              </div>
            </ScrollArea>
          </div>
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
            <AlertDialogDescription className="text-center text-[#475569] text-sm">Agente: <span className="font-medium text-[#0F172A]">{BRANDED_AGENTS.find(a => a.type === selectedAgent)?.branded}</span></AlertDialogDescription>
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
