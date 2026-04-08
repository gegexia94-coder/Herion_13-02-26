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
  Eye,
  Sparkles
} from 'lucide-react';

const AGENT_ICONS = {
  analysis: Search,
  validation: CheckCircle,
  document: FileText,
  communication: MessageSquare
};

const AGENT_COLORS = {
  analysis: { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200' },
  validation: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  document: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  communication: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' }
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
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F4C5C] to-[#1A6B7C] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#5DD9C1]" />
          </div>
          <h1 className="text-2xl font-semibold text-[#111110]">Herion AI</h1>
        </div>
        <p className="text-sm text-[#5C5C59]">
          Assistenti intelligenti per le tue pratiche fiscali. Trasparenza totale su ogni operazione.
        </p>
      </div>

      {/* Transparency Notice */}
      <div className="p-5 bg-[#0F4C5C]/5 border border-[#0F4C5C]/10 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#0F4C5C]/10 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-[#0F4C5C]" />
          </div>
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
        <div className="space-y-3">
          {agentsInfo?.agents?.map((agent) => {
            const IconComponent = AGENT_ICONS[agent.type] || Bot;
            const colors = AGENT_COLORS[agent.type] || AGENT_COLORS.analysis;
            const isSelected = selectedAgent?.type === agent.type;

            return (
              <button
                key={agent.type}
                onClick={() => setSelectedAgent(agent)}
                className={`w-full bg-white rounded-2xl border p-5 text-left transition-all duration-200 ${
                  isSelected 
                    ? 'border-[#0F4C5C] shadow-lg shadow-[#0F4C5C]/10 ring-1 ring-[#0F4C5C]' 
                    : 'border-[#E5E5E3]/60 hover:border-[#0F4C5C]/30 hover:shadow-md'
                }`}
                data-testid={`agent-card-${agent.type}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
                    <IconComponent className={`w-6 h-6 ${colors.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
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
            <div className="bg-white rounded-2xl border border-[#E5E5E3]/60 p-6 shadow-sm" data-testid="agent-detail">
              <div className="flex items-center gap-4 mb-6">
                {(() => {
                  const IconComponent = AGENT_ICONS[selectedAgent.type] || Bot;
                  const colors = AGENT_COLORS[selectedAgent.type] || AGENT_COLORS.analysis;
                  return (
                    <div className={`w-14 h-14 rounded-xl ${colors.bg} flex items-center justify-center`}>
                      <IconComponent className={`w-7 h-7 ${colors.text}`} />
                    </div>
                  );
                })()}
                <div>
                  <h2 className="text-xl font-semibold text-[#111110]">{selectedAgent.name}</h2>
                  <p className="text-sm text-[#5C5C59]">{selectedAgent.description}</p>
                </div>
              </div>

              {/* System Prompt (Transparency) */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-[#0F4C5C]" />
                  <h4 className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider">
                    Istruzioni di Sistema
                  </h4>
                </div>
                <p className="text-xs text-[#5C5C59] mb-3">
                  Queste sono le istruzioni esatte che l'agente segue. Nessuna logica nascosta.
                </p>
                <ScrollArea className="h-[280px]">
                  <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E5E3]/60">
                    <pre className="font-mono text-sm text-[#111110] whitespace-pre-wrap leading-relaxed">
                      {selectedAgent.system_prompt}
                    </pre>
                  </div>
                </ScrollArea>
              </div>

              {/* How It Works */}
              <div>
                <h4 className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider mb-4">
                  Come Funziona
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 p-4 bg-[#FAFAFA] rounded-xl">
                    <div className="w-7 h-7 rounded-lg bg-[#0F4C5C] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                    <div>
                      <p className="text-sm font-medium text-[#111110]">Input</p>
                      <p className="text-xs text-[#5C5C59]">Riceve i dati della pratica</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-[#FAFAFA] rounded-xl">
                    <div className="w-7 h-7 rounded-lg bg-[#0F4C5C] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                    <div>
                      <p className="text-sm font-medium text-[#111110]">Analisi</p>
                      <p className="text-xs text-[#5C5C59]">Elabora le informazioni</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-[#FAFAFA] rounded-xl">
                    <div className="w-7 h-7 rounded-lg bg-[#0F4C5C] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                    <div>
                      <p className="text-sm font-medium text-[#111110]">Output</p>
                      <p className="text-xs text-[#5C5C59]">Fornisce una risposta</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-[#FAFAFA] rounded-xl">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">✓</div>
                    <div>
                      <p className="text-sm font-medium text-[#111110]">Log</p>
                      <p className="text-xs text-[#5C5C59]">Tutto viene registrato</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E5E3]/60 text-center py-16">
              <Bot className="w-12 h-12 text-[#A1A19E] mx-auto mb-4" />
              <p className="text-sm text-[#5C5C59]">Seleziona un agente per vedere i dettagli</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
