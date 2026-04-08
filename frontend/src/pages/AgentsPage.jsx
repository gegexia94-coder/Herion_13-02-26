import { useState, useEffect } from 'react';
import { getAgentsInfo } from '@/services/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Compass, CheckCircle, FileText, MessageCircle, ShieldCheck, Scale, Eye, Sparkles, ArrowRight, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';

const AGENT_ICONS = { analysis: Compass, validation: ShieldCheck, compliance: Scale, document: FileText, communication: MessageCircle };
const AGENT_COLORS = {
  analysis: { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200' },
  validation: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  compliance: { bg: 'bg-[#C6A96B]/10', text: 'text-[#C6A96B]', border: 'border-[#C6A96B]/20' },
  document: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  communication: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' }
};

export default function AgentsPage() {
  const [agentsInfo, setAgentsInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);

  useEffect(() => {
    getAgentsInfo().then(r => { setAgentsInfo(r.data); if (r.data.agents?.length > 0) setSelectedAgent(r.data.agents[0]); }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F4C5C]" /></div>;

  return (
    <div className="space-y-6" data-testid="agents-page">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0F4C5C] flex items-center justify-center"><Sparkles className="w-5 h-5 text-[#5DD9C1]" /></div>
        <div><h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Herion AI</h1><p className="text-xs text-[#475569]">5 agenti specializzati coordinati da Herion Admin</p></div>
      </div>

      {/* Herion Admin Card */}
      {agentsInfo?.admin_agent && (
        <div className="bg-[#0F4C5C] rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-5" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Ccircle cx='20' cy='20' r='1.5'/%3E%3C/g%3E%3C/svg%3E")`}} />
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0"><Bot className="w-6 h-6 text-[#5DD9C1]" /></div>
            <div>
              <h3 className="font-bold text-sm mb-0.5">Herion Admin</h3>
              <p className="text-xs text-white/60">{agentsInfo.admin_agent.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Pipeline */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
        <p className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-4">Flusso di Lavoro Orchestrato</p>
        <div className="flex items-center justify-between gap-1">
          {agentsInfo?.workflow_steps?.map((step, i) => {
            const config = agentsInfo.agents.find(a => a.type === step);
            const Icon = AGENT_ICONS[step] || Compass;
            const colors = AGENT_COLORS[step] || AGENT_COLORS.analysis;
            return (
              <div key={step} className="flex items-center gap-1.5 flex-1">
                <button onClick={() => setSelectedAgent(config)} className="flex flex-col items-center flex-1 min-w-0 p-2 rounded-xl hover:bg-[#F7FAFC] transition-colors cursor-pointer">
                  <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center mb-1.5`}><Icon className={`w-5 h-5 ${colors.text}`} strokeWidth={1.5} /></div>
                  <p className="text-[10px] font-bold text-[#0F172A] text-center">{config?.branded_name?.replace('Herion ', '')}</p>
                  <p className="text-[8px] text-[#475569] text-center">Step {i + 1}</p>
                </button>
                {i < (agentsInfo?.workflow_steps?.length || 0) - 1 && <ArrowRight className="w-3.5 h-3.5 text-[#CBD5E1] flex-shrink-0 mt-[-12px]" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Transparency */}
      <div className="p-4 bg-[#0F4C5C]/[0.03] border border-[#0F4C5C]/10 rounded-2xl flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#0F4C5C]/10 flex items-center justify-center flex-shrink-0"><Eye className="w-4 h-4 text-[#0F4C5C]" strokeWidth={1.5} /></div>
        <div><p className="font-semibold text-[#0F172A] text-sm mb-0.5">Trasparenza Totale</p><p className="text-xs text-[#475569]">{agentsInfo?.transparency_note}</p></div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-2">
          {agentsInfo?.agents?.map(agent => {
            const Icon = AGENT_ICONS[agent.type] || Compass;
            const colors = AGENT_COLORS[agent.type] || AGENT_COLORS.analysis;
            const active = selectedAgent?.type === agent.type;
            return (
              <button key={agent.type} onClick={() => setSelectedAgent(agent)}
                className={`w-full bg-white rounded-2xl border p-4 text-left transition-all duration-200 ${active ? 'border-[#0F4C5C] shadow-md ring-1 ring-[#0F4C5C]' : 'border-[#E2E8F0] hover:border-[#0F4C5C]/30 hover:shadow-sm'}`}
                data-testid={`agent-card-${agent.type}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}><Icon className={`w-5 h-5 ${colors.text}`} strokeWidth={1.5} /></div>
                  <div>
                    <p className="text-xs font-bold text-[#0F4C5C] mb-0.5">{agent.branded_name}</p>
                    <p className="text-[10px] font-medium text-[#0F172A]">Step {agent.step}: {agent.name}</p>
                    <p className="text-[10px] text-[#475569] line-clamp-2 mt-0.5">{agent.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-2">
          {selectedAgent ? (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-[0_4px_20px_rgba(15,23,42,0.04)] sticky top-28" data-testid="agent-detail">
              <div className="flex items-center gap-3 mb-5">
                {(() => { const Icon = AGENT_ICONS[selectedAgent.type] || Compass; const c = AGENT_COLORS[selectedAgent.type] || AGENT_COLORS.analysis; return <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center`}><Icon className={`w-6 h-6 ${c.text}`} strokeWidth={1.5} /></div>; })()}
                <div>
                  <h2 className="text-lg font-bold text-[#0F4C5C]">{selectedAgent.branded_name}</h2>
                  <p className="text-xs text-[#475569]">{selectedAgent.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-3 bg-[#F7FAFC] rounded-xl border border-[#E2E8F0]">
                  <p className="text-[9px] font-semibold text-[#475569] uppercase tracking-wider mb-1">Ruolo</p>
                  <p className="text-xs text-[#0F172A] font-medium">{selectedAgent.name}</p>
                </div>
                <div className="p-3 bg-[#F7FAFC] rounded-xl border border-[#E2E8F0]">
                  <p className="text-[9px] font-semibold text-[#475569] uppercase tracking-wider mb-1">Ordine Esecuzione</p>
                  <p className="text-xs text-[#0F172A] font-medium">Step {selectedAgent.step} di 5</p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-2"><Eye className="w-3.5 h-3.5 text-[#0F4C5C]" /><p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Istruzioni di Sistema</p></div>
                <p className="text-[10px] text-[#475569] mb-2">Le istruzioni che l'agente segue. Nessuna logica nascosta.</p>
                <ScrollArea className="h-[240px]">
                  <div className="p-3 bg-[#F7FAFC] rounded-xl border border-[#E2E8F0]"><pre className="font-mono text-xs text-[#0F172A] whitespace-pre-wrap leading-relaxed">{selectedAgent.system_prompt}</pre></div>
                </ScrollArea>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
