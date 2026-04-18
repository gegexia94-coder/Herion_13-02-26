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
  const isWeak = suggestion.confidence === 'low';
  const isMedium = suggestion.confidence === 'medium';

  return (
    <div
      className={`rounded-2xl border p-5 transition-all duration-200 group ${
        isWeak ? 'bg-slate-50/60 border-dashed' : 'bg-white hover:shadow-md'
      }`}
      style={{ borderColor: isWeak ? '#CBD5E1' : 'var(--border-soft)' }}
      data-testid={`suggestion-card-${suggestion.practice_id}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className={`text-[15px] font-semibold leading-snug ${isWeak ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
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

      <p className={`text-[13px] leading-relaxed mb-4 ${isWeak ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>
        {suggestion.why}
      </p>

      {suggestion.next_step_hint && (
        <p className="text-[12px] text-[var(--text-muted)] mb-4 flex items-start gap-1.5">
          <Compass className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#0ABFCF]" />
          <span><strong>Prossimo passo:</strong> {suggestion.next_step_hint}</span>
        </p>
      )}

      {isWeak && (
        <p className="text-[11px] text-slate-500 mb-3 flex items-start gap-1.5 italic">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          Corrispondenza incerta — ti consigliamo di approfondire prima di procedere.
        </p>
      )}

      <Button
        onClick={() => onStart(suggestion.practice_id)}
        variant={isWeak ? 'outline' : 'default'}
        className={`w-full rounded-xl text-[13px] font-medium gap-2 transition-all ${
          isWeak
            ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
            : isMedium
              ? ''
              : ''
        }`}
        style={isWeak ? {} : { background: isMedium ? '#F59E0B' : '#0ABFCF', color: '#fff' }}
        data-testid={`start-practice-${suggestion.practice_id}`}
      >
        <FileText className="w-4 h-4" />
        {isWeak ? 'Esplora i requisiti' : isMedium ? 'Verifica questa procedura' : 'Avvia questa procedura'}
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
              {loading ? 'Analisi in corso...' : 'Analizza la mia situazione'}
            </Button>
          </div>

          {/* Loading reassurance */}
          {loading && (
            <div className="mt-4 flex items-center gap-3 p-3.5 rounded-xl bg-[#0ABFCF]/5 border border-[#0ABFCF]/15 animate-fade-in" data-testid="consulenza-loading-msg">
              <Loader2 className="w-4 h-4 animate-spin text-[#0ABFCF] shrink-0" />
              <p className="text-[12px] text-[var(--text-secondary)]">
                Herion sta analizzando la tua situazione e cercando il percorso piu adatto per te...
              </p>
            </div>
          )}
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
  const highestConfidence = suggestions.reduce((best, s) => {
    const order = { high: 3, medium: 2, low: 1 };
    return (order[s.confidence] || 0) > (order[best] || 0) ? s.confidence : best;
  }, 'low');
  const hasWeakConfidence = suggestions.length > 0 && highestConfidence !== 'high';

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
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
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

      {/* Refinement encouragement — when confidence is not fully high */}
      {(isClarification || hasWeakConfidence) && (
        <div className={`mb-3 p-3.5 rounded-xl border flex items-start gap-3 ${
          isClarification
            ? 'bg-sky-50 border-sky-200'
            : 'bg-amber-50/70 border-amber-200'
        }`} data-testid="refine-encouragement">
          <MessageCircle className={`w-4 h-4 mt-0.5 shrink-0 ${isClarification ? 'text-sky-500' : 'text-amber-500'}`} />
          <div>
            <p className={`text-[12px] font-semibold ${isClarification ? 'text-sky-800' : 'text-amber-800'}`}>
              {isClarification
                ? 'Rispondi qui sotto per ricevere suggerimenti piu precisi'
                : 'I risultati non sono del tutto certi — vuoi approfondire?'}
            </p>
            <p className={`text-[11px] mt-0.5 ${isClarification ? 'text-sky-700' : 'text-amber-700'}`}>
              {isClarification
                ? 'Herion ti ha chiesto un dettaglio per orientarti meglio. Piu contesto dai, piu preciso sara il suggerimento.'
                : 'Aggiungi dettagli sulla tua situazione qui sotto. Herion rielaborera i suggerimenti con informazioni piu complete.'}
            </p>
          </div>
        </div>
      )}

      {/* Follow-up input */}
      <div className={`rounded-2xl border p-4 flex gap-2 items-end bg-white ${
        isClarification
          ? 'ring-2 ring-sky-300 ring-offset-1'
          : hasWeakConfidence
            ? 'ring-2 ring-amber-300 ring-offset-1'
            : ''
      }`}
        style={{ borderColor: 'var(--border-soft)' }}
        data-testid="followup-section"
      >
        <Textarea
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          placeholder={isClarification
            ? "Rispondi al chiarimento di Herion..."
            : hasWeakConfidence
              ? "Aggiungi dettagli per risultati piu precisi..."
              : "Hai bisogno di ulteriori dettagli? Scrivi qui..."
          }
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
