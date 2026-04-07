import { useState, useEffect } from 'react';
import { getAgentsInfo } from '@/services/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Search,
  CheckCircle,
  FileText,
  MessageSquare,
  Shield,
  Eye
} from 'lucide-react';

const AGENT_ICONS = {
  analysis: Search,
  validation: CheckCircle,
  document: FileText,
  communication: MessageSquare
};

const AGENT_COLORS = {
  analysis: '#0F4C5C',
  validation: '#1A4331',
  document: '#D4A373',
  communication: '#5DD9C1'
};

export default function AgentsPage() {
  const [agentsInfo, setAgentsInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);

  useEffect(() => {
    loadAgentsInfo();
  }, []);

  const loadAgentsInfo = async () => {
    try {
      const response = await getAgentsInfo();
      setAgentsInfo(response.data);
      if (response.data.agents?.length > 0) {
        setSelectedAgent(response.data.agents[0]);
      }
    } catch (error) {
      console.error('Error loading agents info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F4C5C]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="agents-page">
      {/* Header */}
      <div>
        <h1 className="heading-2 mb-2">TaxPilot AI</h1>
        <p className="body-text">
          Scopri come funzionano gli agenti fiscali intelligenti. Ogni agente è trasparente e ogni azione viene registrata.
        </p>
      </div>

      {/* Transparency Notice */}
      <div className="p-4 bg-[#0F4C5C]/5 border border-[#0F4C5C]/20 rounded-sm">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-[#0F4C5C] mt-0.5" />
          <div>
            <p className="font-medium text-[#111110] mb-1">Trasparenza Totale</p>
            <p className="text-sm text-[#5C5C59]">
              {agentsInfo?.transparency_note || 'Tutti gli agenti AI sono completamente trasparenti. Ogni azione viene registrata con input e output completi.'}
            </p>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agents List */}
        <div className="space-y-4">
          {agentsInfo?.agents?.map((agent) => {
            const IconComponent = AGENT_ICONS[agent.type] || Bot;
            const color = AGENT_COLORS[agent.type] || '#0F4C5C';
            const isSelected = selectedAgent?.type === agent.type;

            return (
              <button
                key={agent.type}
                onClick={() => setSelectedAgent(agent)}
                className={`w-full aic-card text-left transition-all ${isSelected ? 'border-[#0F4C5C] shadow-md' : ''}`}
                data-testid={`agent-card-${agent.type}`}
              >
                <div className="flex items-start gap-4">
                  <div 
                    className="w-12 h-12 rounded-sm flex items-center justify-center"
                    style={{ backgroundColor: `${color}10` }}
                  >
                    <IconComponent className="w-6 h-6" style={{ color }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-[#111110] mb-1">{agent.name}</h3>
                    <p className="text-sm text-[#5C5C59] line-clamp-2">{agent.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Agent Details */}
        <div className="lg:col-span-2">
          {selectedAgent ? (
            <div className="aic-card animate-fade-in" data-testid="agent-detail">
              <div className="flex items-center gap-4 mb-6">
                {(() => {
                  const IconComponent = AGENT_ICONS[selectedAgent.type] || Bot;
                  const color = AGENT_COLORS[selectedAgent.type] || '#0F4C5C';
                  return (
                    <div 
                      className="w-16 h-16 rounded-sm flex items-center justify-center"
                      style={{ backgroundColor: `${color}10` }}
                    >
                      <IconComponent className="w-8 h-8" style={{ color }} />
                    </div>
                  );
                })()}
                <div>
                  <h2 className="heading-3">{selectedAgent.name}</h2>
                  <p className="body-text">{selectedAgent.description}</p>
                </div>
              </div>

              {/* System Prompt (Transparency) */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-[#0F4C5C]" />
                  <h4 className="text-sm font-semibold text-[#111110] uppercase tracking-wider">
                    Istruzioni di Sistema (System Prompt)
                  </h4>
                </div>
                <p className="text-xs text-[#5C5C59] mb-3">
                  Queste sono le istruzioni esatte che l'agente segue. Nessuna logica nascosta.
                </p>
                <ScrollArea className="h-[300px]">
                  <div className="p-4 bg-[#F9F9F8] rounded-sm border border-[#E5E5E3]">
                    <pre className="font-mono text-sm text-[#111110] whitespace-pre-wrap">
                      {selectedAgent.system_prompt}
                    </pre>
                  </div>
                </ScrollArea>
              </div>

              {/* How It Works */}
              <div>
                <h4 className="text-sm font-semibold text-[#111110] uppercase tracking-wider mb-3">
                  Come Funziona
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-[#F9F9F8] rounded-sm">
                    <div className="w-6 h-6 rounded-full bg-[#0F4C5C] text-white flex items-center justify-center text-xs font-bold">1</div>
                    <div>
                      <p className="text-sm font-medium text-[#111110]">Input</p>
                      <p className="text-xs text-[#5C5C59]">Riceve i dati della pratica e la tua richiesta</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-[#F9F9F8] rounded-sm">
                    <div className="w-6 h-6 rounded-full bg-[#0F4C5C] text-white flex items-center justify-center text-xs font-bold">2</div>
                    <div>
                      <p className="text-sm font-medium text-[#111110]">Elaborazione</p>
                      <p className="text-xs text-[#5C5C59]">Analizza i dati seguendo le istruzioni di sistema</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-[#F9F9F8] rounded-sm">
                    <div className="w-6 h-6 rounded-full bg-[#0F4C5C] text-white flex items-center justify-center text-xs font-bold">3</div>
                    <div>
                      <p className="text-sm font-medium text-[#111110]">Output</p>
                      <p className="text-xs text-[#5C5C59]">Fornisce una risposta strutturata e spiegazione</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-[#F9F9F8] rounded-sm">
                    <div className="w-6 h-6 rounded-full bg-[#1A4331] text-white flex items-center justify-center text-xs font-bold">✓</div>
                    <div>
                      <p className="text-sm font-medium text-[#111110]">Registrazione</p>
                      <p className="text-xs text-[#5C5C59]">Ogni azione viene registrata nel log attività</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="aic-card text-center py-12">
              <Bot className="w-12 h-12 text-[#A1A19E] mx-auto mb-4" />
              <p className="body-text">Seleziona un agente per vedere i dettagli</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
