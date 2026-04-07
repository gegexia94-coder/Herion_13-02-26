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
  FileText, 
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
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

const AGENTS = [
  { type: 'analysis', name: 'Agente di Analisi', icon: '🔍', description: 'Analizza la situazione e determina la pratica necessaria' },
  { type: 'validation', name: 'Agente di Validazione', icon: '✓', description: 'Verifica completezza e correttezza dei dati' },
  { type: 'document', name: 'Agente Documenti', icon: '📄', description: 'Estrae dati dai documenti caricati' },
  { type: 'communication', name: 'Agente Comunicazione', icon: '💬', description: 'Spiega lo stato e i prossimi passi' },
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
      toast.error('Errore nel caricamento della pratica');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadDocument(id, file);
      toast.success('Documento caricato con successo');
      loadData();
    } catch (error) {
      toast.error('Errore nel caricamento del documento');
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updatePractice(id, { status: newStatus });
      toast.success('Stato aggiornato');
      loadData();
    } catch (error) {
      toast.error('Errore nell\'aggiornamento dello stato');
    }
  };

  const handleAgentExecute = async () => {
    if (!agentQuery.trim()) {
      toast.error('Inserisci una richiesta per l\'agente');
      return;
    }

    setAgentLoading(true);
    setAgentResponse(null);
    try {
      const response = await executeAgent(selectedAgent, id, { query: agentQuery });
      setAgentResponse(response.data);
      toast.success('Agente eseguito con successo');
      loadData(); // Refresh to get new agent logs
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nell\'esecuzione dell\'agente');
    } finally {
      setAgentLoading(false);
    }
  };

  const getStatusBadge = (status, label) => {
    const variants = {
      'pending': 'status-pending',
      'processing': 'status-processing',
      'completed': 'status-completed',
      'rejected': 'status-rejected'
    };
    return <span className={`status-tag ${variants[status] || 'status-pending'}`}>{label}</span>;
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
      <div className="text-center py-12">
        <p className="body-text">Pratica non trovata</p>
        <Button onClick={() => navigate('/practices')} variant="outline" className="mt-4">
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
            className="flex items-center gap-2 text-sm text-[#5C5C59] hover:text-[#111110] mb-4"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alle pratiche
          </button>
          <h1 className="heading-2 mb-2">{practice.practice_type_label}</h1>
          <p className="body-text">{practice.client_name}</p>
        </div>
        <div className="flex items-center gap-4">
          {getStatusBadge(practice.status, practice.status_label)}
          <Select value={practice.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-48 border-[#E5E5E3] rounded-sm" data-testid="status-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
        {/* Left Column - Practice Info & Documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Practice Info */}
          <div className="aic-card">
            <h3 className="heading-4 mb-4">Dettagli Pratica</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {practice.client_type && (
                <div>
                  <p className="label-text mb-1">Tipo Cliente</p>
                  <p className="font-medium text-[#111110]">{CLIENT_TYPE_LABELS[practice.client_type] || practice.client_type_label || practice.client_type}</p>
                </div>
              )}
              {practice.fiscal_code && (
                <div>
                  <p className="label-text mb-1">Codice Fiscale</p>
                  <p className="font-mono text-[#111110]">{practice.fiscal_code}</p>
                </div>
              )}
              {practice.vat_number && (
                <div>
                  <p className="label-text mb-1">Partita IVA</p>
                  <p className="font-mono text-[#111110]">{practice.vat_number}</p>
                </div>
              )}
              <div>
                <p className="label-text mb-1">Data Creazione</p>
                <p className="text-[#111110]">{format(new Date(practice.created_at), 'dd MMMM yyyy, HH:mm', { locale: it })}</p>
              </div>
              <div>
                <p className="label-text mb-1">Ultimo Aggiornamento</p>
                <p className="text-[#111110]">{format(new Date(practice.updated_at), 'dd MMMM yyyy, HH:mm', { locale: it })}</p>
              </div>
            </div>
            <div>
              <p className="label-text mb-1">Descrizione</p>
              <p className="text-[#111110]">{practice.description}</p>
            </div>
          </div>

          {/* Documents */}
          <div className="aic-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="heading-4">Documenti</h3>
              <label className="cursor-pointer">
                <input 
                  type="file" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  data-testid="file-input"
                />
                <Button variant="outline" className="rounded-sm" disabled={uploading} asChild>
                  <span>
                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Carica Documento
                  </span>
                </Button>
              </label>
            </div>

            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div 
                    key={doc.id} 
                    className="flex items-center justify-between p-3 border border-[#E5E5E3] rounded-sm"
                    data-testid={`document-${doc.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <File className="w-5 h-5 text-[#5C5C59]" />
                      <div>
                        <p className="text-sm font-medium text-[#111110]">{doc.original_filename}</p>
                        <p className="text-xs text-[#5C5C59]">
                          {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: it })}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="upload-zone">
                <Upload className="w-10 h-10 text-[#A1A19E] mx-auto mb-3" />
                <p className="text-sm text-[#5C5C59]">Nessun documento caricato</p>
                <p className="text-xs text-[#A1A19E] mt-1">Trascina qui i file o clicca per caricare</p>
              </div>
            )}
          </div>

          {/* AI Agents */}
          <div className="aic-card">
            <div className="flex items-center gap-3 mb-4">
              <Bot className="w-5 h-5 text-[#0F4C5C]" />
              <h3 className="heading-4">TaxPilot AI</h3>
            </div>
            
            <p className="text-sm text-[#5C5C59] mb-4">
              Utilizza gli agenti fiscali intelligenti per analizzare, validare e gestire la pratica. Ogni azione viene registrata per completa trasparenza.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {AGENTS.map((agent) => (
                <button
                  key={agent.type}
                  onClick={() => setSelectedAgent(agent.type)}
                  className={`p-3 border rounded-sm text-center transition-all ${
                    selectedAgent === agent.type 
                      ? 'border-[#0F4C5C] bg-[#0F4C5C]/5' 
                      : 'border-[#E5E5E3] hover:border-[#0F4C5C]/50'
                  }`}
                  data-testid={`agent-select-${agent.type}`}
                >
                  <span className="text-2xl">{agent.icon}</span>
                  <p className="text-xs font-medium text-[#111110] mt-1">{agent.name.split(' ')[2] || agent.name.split(' ')[1]}</p>
                </button>
              ))}
            </div>

            <div className="p-4 bg-[#F9F9F8] rounded-sm mb-4">
              <p className="text-sm font-medium text-[#111110] mb-1">
                {AGENTS.find(a => a.type === selectedAgent)?.name}
              </p>
              <p className="text-xs text-[#5C5C59]">
                {AGENTS.find(a => a.type === selectedAgent)?.description}
              </p>
            </div>

            <div className="space-y-4">
              <Textarea
                placeholder="Inserisci la tua richiesta per TaxPilot AI..."
                value={agentQuery}
                onChange={(e) => setAgentQuery(e.target.value)}
                className="border-[#E5E5E3] rounded-sm min-h-[100px]"
                data-testid="agent-query-input"
              />
              <Button
                onClick={handleAgentExecute}
                disabled={agentLoading || !agentQuery.trim()}
                className="bg-[#0F4C5C] hover:bg-[#0F4C5C]/90 rounded-sm"
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
                    Esegui Agente
                  </>
                )}
              </Button>
            </div>

            {/* Agent Response */}
            {agentResponse && (
              <div className="mt-6 p-4 bg-[#0F4C5C]/5 border border-[#0F4C5C]/20 rounded-sm animate-fade-in" data-testid="agent-response">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-[#1A4331]" />
                  <span className="text-sm font-medium text-[#111110]">Risposta TaxPilot AI</span>
                </div>
                <div className="font-mono text-sm text-[#111110] whitespace-pre-wrap bg-white p-4 rounded-sm border border-[#E5E5E3]">
                  {agentResponse.output}
                </div>
                <p className="text-xs text-[#5C5C59] mt-3">
                  <span className="font-medium">Trasparenza:</span> {agentResponse.explanation}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Activity Log */}
        <div className="aic-card h-fit">
          <div className="flex items-center gap-3 mb-4">
            <History className="w-5 h-5 text-[#0F4C5C]" />
            <h3 className="heading-4">Log Attività</h3>
          </div>
          
          <p className="text-xs text-[#5C5C59] mb-4">
            Registro completo di tutte le azioni sulla pratica per totale trasparenza.
          </p>

          <Tabs defaultValue="all">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="all" className="flex-1">Tutto</TabsTrigger>
              <TabsTrigger value="agent" className="flex-1">Agenti AI</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {/* Agent Logs from Practice */}
                  {practice.agent_logs?.map((log, index) => (
                    <div key={log.id} className="relative pl-6 pb-4 border-l-2 border-[#E5E5E3] last:border-0">
                      <div className={`absolute left-[-5px] top-0 w-2 h-2 rounded-full ${log.status === 'completed' ? 'bg-[#1A4331]' : log.status === 'error' ? 'bg-[#E63946]' : 'bg-[#002FA7]'}`} />
                      <div className="text-xs text-[#5C5C59] mb-1">
                        {format(new Date(log.started_at), 'dd MMM, HH:mm', { locale: it })}
                      </div>
                      <p className="text-sm font-medium text-[#111110]">{log.agent_name}</p>
                      <p className="text-xs text-[#5C5C59] mt-1">{log.explanation}</p>
                      {log.output_data && (
                        <details className="mt-2">
                          <summary className="text-xs text-[#001F54] cursor-pointer">Vedi output</summary>
                          <pre className="mt-2 p-2 bg-[#F9F9F8] rounded-sm text-xs font-mono overflow-x-auto">
                            {typeof log.output_data === 'string' ? log.output_data.slice(0, 200) : JSON.stringify(log.output_data, null, 2).slice(0, 200)}...
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}

                  {/* Activity Logs */}
                  {activityLogs.map((log) => (
                    <div key={log.id} className="relative pl-6 pb-4 border-l-2 border-[#E5E5E3] last:border-0">
                      <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-[#E5E5E3]" />
                      <div className="text-xs text-[#5C5C59] mb-1">
                        {format(new Date(log.timestamp), 'dd MMM, HH:mm', { locale: it })}
                      </div>
                      <p className="text-sm font-medium text-[#111110] capitalize">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-[#5C5C59] mt-1">{log.explanation}</p>
                    </div>
                  ))}

                  {(!practice.agent_logs?.length && !activityLogs.length) && (
                    <div className="text-center py-8">
                      <Clock className="w-8 h-8 text-[#A1A19E] mx-auto mb-2" />
                      <p className="text-sm text-[#5C5C59]">Nessuna attività registrata</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="agent">
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {practice.agent_logs?.length > 0 ? (
                    practice.agent_logs.map((log) => (
                      <div key={log.id} className="p-3 border border-[#E5E5E3] rounded-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-[#111110]">{log.agent_name}</span>
                          {log.status === 'completed' && <CheckCircle className="w-4 h-4 text-[#1A4331]" />}
                          {log.status === 'error' && <AlertCircle className="w-4 h-4 text-[#E63946]" />}
                        </div>
                        <p className="text-xs text-[#5C5C59]">{log.explanation}</p>
                        <p className="text-xs text-[#A1A19E] mt-2">
                          {format(new Date(log.started_at), 'dd MMM yyyy, HH:mm', { locale: it })}
                        </p>
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
    </div>
  );
}
