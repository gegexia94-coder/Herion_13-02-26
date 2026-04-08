import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPractice, updatePractice, uploadDocument, getPracticeDocuments, executeAgent, getPracticeActivityLogs } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  ArrowLeft,
  Upload,
  Bot,
  Clock,
  CheckCircle,
  AlertCircle,
  History,
  Play,
  Loader2,
  File,
  Download,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

const AGENTS = [
  { type: 'analysis', name: 'Analisi', icon: '🔍', description: 'Analizza la situazione' },
  { type: 'validation', name: 'Validazione', icon: '✓', description: 'Verifica i dati' },
  { type: 'document', name: 'Documenti', icon: '📄', description: 'Estrae informazioni' },
  { type: 'communication', name: 'Comunicazione', icon: '💬', description: 'Spiega lo stato' },
];

const CLIENT_TYPE_LABELS = {
  private: 'Privato',
  freelancer: 'Libero Professionista',
  company: 'Azienda'
};

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

  const loadData = useCallback(async () => {
    try {
      const [practiceRes, docsRes, logsRes] = await Promise.all([
        getPractice(id),
        getPracticeDocuments(id),
        getPracticeActivityLogs(id)
      ]);
      setPractice(practiceRes.data);
      setDocuments(docsRes.data);
      setActivityLogs(logsRes.data);
    } catch (error) {
      console.error('Error loading practice:', error);
      toast.error('Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setShowUploadDialog(true);
  };

  const handleFileUpload = async () => {
    if (!pendingFile) return;
    setShowUploadDialog(false);
    setUploading(true);
    
    try {
      await uploadDocument(id, pendingFile);
      toast.success('Documento caricato', {
        description: 'Il file è stato caricato con successo'
      });
      loadData();
    } catch (error) {
      toast.error('Errore nel caricamento');
    } finally {
      setUploading(false);
      setPendingFile(null);
    }
  };

  const handleStatusChange = async () => {
    const newStatus = showStatusDialog.status;
    setShowStatusDialog({ open: false, status: '' });
    
    try {
      await updatePractice(id, { status: newStatus });
      toast.success('Stato aggiornato', {
        description: 'Lo stato della pratica è stato modificato'
      });
      loadData();
    } catch (error) {
      toast.error('Errore nell\'aggiornamento');
    }
  };

  const handleAgentExecute = async () => {
    setShowAgentDialog(false);
    setAgentLoading(true);
    setAgentResponse(null);
    
    try {
      const response = await executeAgent(selectedAgent, id, { query: agentQuery });
      setAgentResponse(response.data);
      toast.success('Analisi completata', {
        description: 'Herion AI ha elaborato la richiesta'
      });
      loadData();
    } catch (error) {
      toast.error('Errore nell\'elaborazione', {
        description: error.response?.data?.detail || 'Si è verificato un errore'
      });
    } finally {
      setAgentLoading(false);
    }
  };

  const getStatusBadge = (status, label) => {
    const variants = {
      'pending': 'bg-amber-50 text-amber-700 border-amber-200',
      'processing': 'bg-sky-50 text-sky-700 border-sky-200',
      'completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'rejected': 'bg-red-50 text-red-700 border-red-200'
    };
    return <span className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${variants[status] || variants.pending}`}>{label}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F4C5C]"></div>
      </div>
    );
  }

  if (!practice) {
    return (
      <div className="text-center py-16">
        <p className="text-[#5C5C59]">Pratica non trovata</p>
        <Button onClick={() => navigate('/practices')} variant="outline" className="mt-4 rounded-xl">
          Torna alle pratiche
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="practice-detail-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/practices')}
            className="flex items-center gap-2 text-sm text-[#5C5C59] hover:text-[#111110] mb-4 transition-colors"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alle pratiche
          </button>
          <h1 className="text-2xl font-semibold text-[#111110] mb-1">{practice.practice_type_label}</h1>
          <p className="text-sm text-[#5C5C59]">{practice.client_name}</p>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(practice.status, practice.status_label)}
          <Select 
            value={practice.status} 
            onValueChange={(value) => setShowStatusDialog({ open: true, status: value })}
          >
            <SelectTrigger className="w-44 rounded-xl border-[#E5E5E3] h-10" data-testid="status-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="pending">In Attesa</SelectItem>
              <SelectItem value="processing">In Elaborazione</SelectItem>
              <SelectItem value="completed">Completata</SelectItem>
              <SelectItem value="rejected">Rifiutata</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Practice Info */}
          <div className="bg-white rounded-2xl border border-[#E5E5E3]/60 p-6 shadow-sm">
            <h3 className="font-semibold text-[#111110] mb-4">Dettagli Pratica</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {practice.client_type && (
                <div>
                  <p className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider mb-1">Tipo Cliente</p>
                  <p className="text-sm font-medium text-[#111110]">{CLIENT_TYPE_LABELS[practice.client_type] || practice.client_type}</p>
                </div>
              )}
              {practice.fiscal_code && (
                <div>
                  <p className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider mb-1">Codice Fiscale</p>
                  <p className="text-sm font-mono text-[#111110]">{practice.fiscal_code}</p>
                </div>
              )}
              {practice.vat_number && (
                <div>
                  <p className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider mb-1">Partita IVA</p>
                  <p className="text-sm font-mono text-[#111110]">{practice.vat_number}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider mb-1">Data Creazione</p>
                <p className="text-sm text-[#111110]">{format(new Date(practice.created_at), 'dd MMM yyyy, HH:mm', { locale: it })}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider mb-1">Descrizione</p>
              <p className="text-sm text-[#111110]">{practice.description}</p>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-2xl border border-[#E5E5E3]/60 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#111110]">Documenti</h3>
              <label className="cursor-pointer">
                <input 
                  type="file" 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  data-testid="file-input"
                />
                <Button variant="outline" className="rounded-xl" disabled={uploading} asChild>
                  <span>
                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Carica
                  </span>
                </Button>
              </label>
            </div>

            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div 
                    key={doc.id} 
                    className="flex items-center justify-between p-3 border border-[#E5E5E3]/60 rounded-xl hover:bg-[#FAFAFA] transition-colors"
                    data-testid={`document-${doc.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#F5F5F4] flex items-center justify-center">
                        <File className="w-4 h-4 text-[#5C5C59]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#111110]">{doc.original_filename}</p>
                        <p className="text-xs text-[#5C5C59]">
                          {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: it })}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-[#E5E5E3] rounded-xl p-8 text-center">
                <Upload className="w-10 h-10 text-[#A1A19E] mx-auto mb-3" />
                <p className="text-sm text-[#5C5C59]">Nessun documento</p>
                <p className="text-xs text-[#A1A19E] mt-1">Carica documenti per questa pratica</p>
              </div>
            )}
          </div>

          {/* Herion AI */}
          <div className="bg-white rounded-2xl border border-[#E5E5E3]/60 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F4C5C] to-[#1A6B7C] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#5DD9C1]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#111110]">Herion AI</h3>
                <p className="text-xs text-[#5C5C59]">Assistenza intelligente per questa pratica</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {AGENTS.map((agent) => (
                <button
                  key={agent.type}
                  onClick={() => setSelectedAgent(agent.type)}
                  className={`p-3 border rounded-xl text-center transition-all ${
                    selectedAgent === agent.type 
                      ? 'border-[#0F4C5C] bg-[#0F4C5C]/5 ring-1 ring-[#0F4C5C]' 
                      : 'border-[#E5E5E3] hover:border-[#0F4C5C]/50'
                  }`}
                  data-testid={`agent-select-${agent.type}`}
                >
                  <span className="text-xl">{agent.icon}</span>
                  <p className="text-xs font-medium text-[#111110] mt-1">{agent.name}</p>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <Textarea
                placeholder="Descrivi cosa vuoi analizzare..."
                value={agentQuery}
                onChange={(e) => setAgentQuery(e.target.value)}
                className="rounded-xl border-[#E5E5E3] min-h-[80px] resize-none"
                data-testid="agent-query-input"
              />
              <Button
                onClick={() => agentQuery.trim() && setShowAgentDialog(true)}
                disabled={agentLoading || !agentQuery.trim()}
                className="bg-[#0F4C5C] hover:bg-[#0F4C5C]/90 rounded-xl w-full"
                data-testid="execute-agent-btn"
              >
                {agentLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Elaborazione...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Esegui {AGENTS.find(a => a.type === selectedAgent)?.name}
                  </>
                )}
              </Button>
            </div>

            {agentResponse && (
              <div className="mt-4 p-4 bg-[#0F4C5C]/5 border border-[#0F4C5C]/10 rounded-xl" data-testid="agent-response">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-[#111110]">Risposta Herion AI</span>
                </div>
                <div className="font-mono text-sm text-[#111110] whitespace-pre-wrap bg-white p-4 rounded-lg border border-[#E5E5E3]/60">
                  {agentResponse.output}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Activity Log */}
        <div className="bg-white rounded-2xl border border-[#E5E5E3]/60 p-6 shadow-sm h-fit">
          <div className="flex items-center gap-3 mb-4">
            <History className="w-5 h-5 text-[#0F4C5C]" />
            <h3 className="font-semibold text-[#111110]">Attività</h3>
          </div>

          <Tabs defaultValue="all">
            <TabsList className="w-full mb-4 bg-[#F5F5F4] rounded-lg p-1">
              <TabsTrigger value="all" className="flex-1 rounded-md text-xs">Tutto</TabsTrigger>
              <TabsTrigger value="agent" className="flex-1 rounded-md text-xs">AI</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <ScrollArea className="h-[450px]">
                <div className="space-y-3">
                  {practice.agent_logs?.map((log) => (
                    <div key={log.id} className="p-3 border border-[#E5E5E3]/60 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[#111110]">{log.agent_name}</span>
                        {log.status === 'completed' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                        {log.status === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
                      </div>
                      <p className="text-xs text-[#5C5C59]">{log.explanation}</p>
                      <p className="text-[10px] text-[#A1A19E] mt-1">
                        {format(new Date(log.started_at), 'dd MMM, HH:mm', { locale: it })}
                      </p>
                    </div>
                  ))}
                  
                  {activityLogs.map((log) => (
                    <div key={log.id} className="p-3 border border-[#E5E5E3]/60 rounded-xl">
                      <p className="text-sm font-medium text-[#111110] capitalize">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-[#5C5C59] mt-1">{log.explanation}</p>
                      <p className="text-[10px] text-[#A1A19E] mt-1">
                        {format(new Date(log.timestamp), 'dd MMM, HH:mm', { locale: it })}
                      </p>
                    </div>
                  ))}

                  {(!practice.agent_logs?.length && !activityLogs.length) && (
                    <div className="text-center py-8">
                      <Clock className="w-8 h-8 text-[#A1A19E] mx-auto mb-2" />
                      <p className="text-sm text-[#5C5C59]">Nessuna attività</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="agent">
              <ScrollArea className="h-[450px]">
                <div className="space-y-3">
                  {practice.agent_logs?.length > 0 ? (
                    practice.agent_logs.map((log) => (
                      <div key={log.id} className="p-3 border border-[#E5E5E3]/60 rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-[#111110]">{log.agent_name}</span>
                          {log.status === 'completed' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                          {log.status === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
                        </div>
                        <p className="text-xs text-[#5C5C59]">{log.explanation}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Bot className="w-8 h-8 text-[#A1A19E] mx-auto mb-2" />
                      <p className="text-sm text-[#5C5C59]">Nessun agente eseguito</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Status Change Dialog */}
      <AlertDialog open={showStatusDialog.open} onOpenChange={(open) => setShowStatusDialog({ open, status: '' })}>
        <AlertDialogContent className="rounded-2xl border-[#E5E5E3]/60 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-xl font-semibold text-center">Cambia stato pratica</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[#5C5C59]">
              Vuoi cambiare lo stato della pratica? Questa azione verrà registrata nel log attività.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 sm:gap-3">
            <AlertDialogCancel className="rounded-xl border-[#E5E5E3] hover:bg-[#F5F5F4] flex-1">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleStatusChange}
              className="bg-[#0F4C5C] hover:bg-[#0F4C5C]/90 rounded-xl flex-1"
            >
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Agent Execution Dialog */}
      <AlertDialog open={showAgentDialog} onOpenChange={setShowAgentDialog}>
        <AlertDialogContent className="rounded-2xl border-[#E5E5E3]/60 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-xl bg-[#0F4C5C]/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-[#0F4C5C]" />
            </div>
            <AlertDialogTitle className="text-xl font-semibold text-center">Esegui Herion AI</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[#5C5C59]">
              Stai per eseguire l'agente <span className="font-medium text-[#111110]">{AGENTS.find(a => a.type === selectedAgent)?.name}</span>. L'operazione verrà registrata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 sm:gap-3">
            <AlertDialogCancel className="rounded-xl border-[#E5E5E3] hover:bg-[#F5F5F4] flex-1">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleAgentExecute}
              className="bg-[#0F4C5C] hover:bg-[#0F4C5C]/90 rounded-xl flex-1"
            >
              Esegui
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Confirmation Dialog */}
      <AlertDialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <AlertDialogContent className="rounded-2xl border-[#E5E5E3]/60 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-6 h-6 text-sky-600" />
            </div>
            <AlertDialogTitle className="text-xl font-semibold text-center">Carica documento</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[#5C5C59]">
              Vuoi caricare il file <span className="font-medium text-[#111110]">"{pendingFile?.name}"</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 sm:gap-3">
            <AlertDialogCancel className="rounded-xl border-[#E5E5E3] hover:bg-[#F5F5F4] flex-1">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleFileUpload}
              className="bg-[#0F4C5C] hover:bg-[#0F4C5C]/90 rounded-xl flex-1"
            >
              Carica
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
