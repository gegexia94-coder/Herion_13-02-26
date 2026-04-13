import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { consulenzaTriage, consulenzaRefine } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  MessageCircle, Send, ArrowRight, Sparkles, Shield,
  ChevronRight, RefreshCw, AlertTriangle, CheckCircle2,
  HelpCircle, Loader2, FileText, Compass
} from 'lucide-react';

const CONFIDENCE_CFG = {
  high: { label: 'Alta corrispondenza', color: '#10B981', bg: 'bg-emerald-50', icon: CheckCircle2 },
  medium: { label: 'Possibile corrispondenza', color: '#F59E0B', bg: 'bg-amber-50', icon: HelpCircle },
  low: { label: 'Da valutare', color: '#94A3B8', bg: 'bg-slate-50', icon: AlertTriangle },
};

function SuggestionCard({ suggestion, onStart }) {
  const conf = CONFIDENCE_CFG[suggestion.confidence] || CONFIDENCE_CFG.medium;
  const ConfIcon = conf.icon;

  return (
    <div
      className="bg-white rounded-2xl border p-5 transition-all duration-200 hover:shadow-md group"
      style={{ borderColor: 'var(--border-soft)' }}
      data-testid={`suggestion-card-${suggestion.practice_id}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-[15px] font-semibold text-[var(--text-primary)] leading-snug">
            {suggestion.name}
          </h4>
          <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
            {suggestion.category}
          </span>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ${conf.bg}`}
          style={{ color: conf.color }}
          data-testid={`confidence-${suggestion.practice_id}`}
        >
          <ConfIcon className="w-3 h-3" />
          {conf.label}
        </div>
      </div>

      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-4">
        {suggestion.why}
      </p>

      {suggestion.next_step_hint && (
        <p className="text-[12px] text-[var(--text-muted)] mb-4 flex items-start gap-1.5">
          <Compass className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#0ABFCF]" />
          <span><strong>Prossimo passo:</strong> {suggestion.next_step_hint}</span>
        </p>
      )}

      <Button
        onClick={() => onStart(suggestion.practice_id)}
        className="w-full rounded-xl text-[13px] font-medium gap-2 transition-all"
        style={{ background: '#0ABFCF', color: '#fff' }}
        data-testid={`start-practice-${suggestion.practice_id}`}
      >
        <FileText className="w-4 h-4" />
        Avvia questa procedura
        <ArrowRight className="w-3.5 h-3.5 ml-auto" />
      </Button>
    </div>
  );
}

function MessageBubble({ role, children }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`} data-testid={`msg-${role}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
          isUser
            ? 'bg-[#0ABFCF] text-white rounded-br-md'
            : 'bg-[var(--bg-soft)] text-[var(--text-primary)] rounded-bl-md'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export default function ConsulenzaRapidaPage() {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [followUp, setFollowUp] = useState('');
  const [phase, setPhase] = useState('input'); // input | results
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation]);

  const handleTriage = async () => {
    if (!description.trim() || description.trim().length < 10) {
      toast.error('Descrivi la tua situazione con almeno qualche dettaglio.');
      return;
    }
    setLoading(true);
    try {
      const res = await consulenzaTriage(description.trim());
      const data = res.data;
      setSessionId(data.session_id);
      setConversation([
        { role: 'user', text: description.trim() },
        { role: 'assistant', response: data.response }
      ]);
      setPhase('results');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Errore durante l\'analisi. Riprova.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!followUp.trim() || !sessionId) return;
    setLoading(true);
    const text = followUp.trim();
    setFollowUp('');
    setConversation(prev => [...prev, { role: 'user', text }]);
    try {
      const res = await consulenzaRefine(sessionId, text);
      setConversation(prev => [...prev, { role: 'assistant', response: res.data.response }]);
    } catch (err) {
      toast.error('Errore durante il chiarimento. Riprova.');
      setConversation(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleStartPractice = (practiceId) => {
    navigate(`/practices/new?type=${practiceId}`);
  };

  const handleReset = () => {
    setDescription('');
    setSessionId(null);
    setConversation([]);
    setFollowUp('');
    setPhase('input');
  };

  // ─── INPUT PHASE ───
  if (phase === 'input') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8" data-testid="consulenza-page">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #0ABFCF 0%, #C4D9FF 100%)' }}>
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-2">
            Consulenza rapida
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
            Descrivi la tua situazione e Herion ti indichera la procedura piu adatta.
            Nessuna azione automatica — solo orientamento chiaro.
          </p>
        </div>

        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-soft)' }}>
          <label className="block text-[13px] font-semibold text-[var(--text-primary)] mb-2">
            Racconta la tua situazione
          </label>
          <p className="text-[12px] text-[var(--text-muted)] mb-3">
            Scrivi in italiano, con parole semplici. Ad esempio: "Devo aprire la partita IVA come freelancer" oppure "Ho ricevuto una cartella esattoriale e non so cosa fare".
          </p>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrivi qui la tua situazione..."
            className="min-h-[120px] rounded-xl border-[var(--border-soft)] text-[14px] resize-none focus:ring-[#0ABFCF] focus:border-[#0ABFCF]"
            data-testid="consulenza-input"
          />
          <div className="flex items-center justify-between mt-4">
            <span className="text-[11px] text-[var(--text-muted)]">
              {description.length > 0 ? `${description.length} caratteri` : ''}
            </span>
            <Button
              onClick={handleTriage}
              disabled={loading || description.trim().length < 10}
              className="rounded-xl gap-2 px-6 text-[13px] font-medium"
              style={{ background: '#0ABFCF', color: '#fff' }}
              data-testid="consulenza-submit"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Analizza la mia situazione
            </Button>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-[var(--bg-soft)]">
          <Shield className="w-4 h-4 text-[#0ABFCF] mt-0.5 shrink-0" />
          <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
            <strong>Trasparenza:</strong> Herion ti suggerisce la procedura piu adatta in base al catalogo ufficiale.
            Non si tratta di consulenza legale o fiscale definitiva. I risultati servono come orientamento per guidarti nella direzione giusta.
          </p>
        </div>
      </div>
    );
  }

  // ─── RESULTS PHASE ───
  const lastAssistant = [...conversation].reverse().find(m => m.role === 'assistant');
  const lastResponse = lastAssistant?.response || {};
  const suggestions = lastResponse.suggestions || [];
  const isClarification = lastResponse.type === 'clarification';

  return (
    <div className="max-w-3xl mx-auto px-4 py-6" data-testid="consulenza-results">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0ABFCF 0%, #C4D9FF 100%)' }}>
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Consulenza rapida</h2>
            <p className="text-[11px] text-[var(--text-muted)]">Orientamento personalizzato</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="rounded-xl gap-1.5 text-[12px]"
          data-testid="consulenza-reset"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Nuova consulenza
        </Button>
      </div>

      {/* Conversation */}
      <div
        ref={scrollRef}
        className="bg-white rounded-2xl border p-5 mb-4 max-h-[400px] overflow-y-auto"
        style={{ borderColor: 'var(--border-soft)' }}
        data-testid="consulenza-conversation"
      >
        {conversation.map((msg, i) => {
          if (msg.role === 'user') {
            return <MessageBubble key={i} role="user">{msg.text}</MessageBubble>;
          }
          const resp = msg.response || {};
          return (
            <MessageBubble key={i} role="assistant">
              {resp.message || 'Analizzo la tua situazione...'}
            </MessageBubble>
          );
        })}
        {loading && (
          <MessageBubble role="assistant">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#0ABFCF]" />
              <span className="text-[var(--text-muted)]">Sto analizzando...</span>
            </div>
          </MessageBubble>
        )}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && !isClarification && (
        <div className="mb-4" data-testid="suggestions-list">
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0ABFCF]" />
            Procedure suggerite
          </h3>
          <div className="grid gap-3">
            {suggestions.map((s) => (
              <SuggestionCard key={s.practice_id} suggestion={s} onStart={handleStartPractice} />
            ))}
          </div>
          {lastResponse.disclaimer && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-amber-50 text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <p className="text-[11px] leading-relaxed">{lastResponse.disclaimer}</p>
            </div>
          )}
        </div>
      )}

      {/* Clarification prompt */}
      {isClarification && lastResponse.clarification_question && (
        <div className="mb-4 p-4 rounded-xl bg-[var(--bg-soft)] border" style={{ borderColor: 'var(--border-soft)' }}
          data-testid="clarification-prompt">
          <p className="text-[13px] text-[var(--text-primary)] font-medium flex items-center gap-2 mb-1">
            <HelpCircle className="w-4 h-4 text-[#0ABFCF]" />
            Herion ha bisogno di un chiarimento
          </p>
          <p className="text-[12px] text-[var(--text-secondary)]">{lastResponse.clarification_question}</p>
        </div>
      )}

      {/* Follow-up input */}
      <div className="bg-white rounded-2xl border p-4 flex gap-2 items-end"
        style={{ borderColor: 'var(--border-soft)' }}
        data-testid="followup-section"
      >
        <Textarea
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          placeholder={isClarification ? "Rispondi al chiarimento..." : "Hai bisogno di ulteriori dettagli? Scrivi qui..."}
          className="min-h-[44px] max-h-[100px] rounded-xl border-[var(--border-soft)] text-[13px] resize-none flex-1"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRefine(); } }}
          data-testid="followup-input"
        />
        <Button
          onClick={handleRefine}
          disabled={loading || !followUp.trim()}
          className="rounded-xl shrink-0 h-[44px] w-[44px] p-0"
          style={{ background: '#0ABFCF', color: '#fff' }}
          data-testid="followup-submit"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {/* Transparency footer */}
      <div className="mt-4 flex items-start gap-2.5 px-1">
        <Shield className="w-3.5 h-3.5 text-[var(--text-muted)] mt-0.5 shrink-0" />
        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          Orientamento basato sul catalogo Herion. Cliccando "Avvia questa procedura" verrai guidato
          attraverso i requisiti e la preparazione prima di qualsiasi azione ufficiale.
        </p>
      </div>
    </div>
  );
}
