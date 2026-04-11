import { HerionBrand } from '@/components/HerionLogo';
import { Mail, MessageCircle, FileText, ExternalLink, HelpCircle } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="space-y-8 max-w-2xl" data-testid="support-page">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Supporto</h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1 leading-relaxed">
          Hai bisogno di aiuto? Siamo qui per te. Trova risposte rapide o contattaci direttamente.
        </p>
      </div>

      {/* Quick help */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Domande Frequenti</p>
        <div className="space-y-2">
          {[
            { q: 'Come creo una nuova pratica?', a: 'Vai su Dashboard e clicca "Nuova Pratica". Compila i dati richiesti e il sistema ti guidera nei passaggi successivi.' },
            { q: 'Cosa significa "In Attesa di Approvazione"?', a: 'Il sistema ha completato l\'analisi della tua pratica. Ora devi verificare il riepilogo e approvare per procedere con l\'invio.' },
            { q: 'Come carico un documento?', a: 'Apri la pratica, nella sezione Documenti clicca "Carica". Seleziona il file e la categoria corretta.' },
            { q: 'Cosa faccio se una pratica e bloccata?', a: 'Le pratiche bloccate hanno un avviso rosso. Leggi il motivo del blocco e segui le indicazioni per risolvere. Se hai dubbi, usa la chat nella pratica.' },
            { q: 'Come funziona la priorita?', a: 'Herion calcola automaticamente la priorita in base a scadenze, stato della pratica e livello di rischio. Le pratiche urgenti appaiono sempre in cima.' },
          ].map((item, i) => (
            <details key={i} className="bg-white rounded-xl border p-4 group" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid={`faq-${i}`}>
              <summary className="flex items-center gap-3 cursor-pointer list-none text-[13px] font-semibold text-[var(--text-primary)]">
                <HelpCircle className="w-4 h-4 text-[#0ABFCF] flex-shrink-0" strokeWidth={1.8} />
                <span className="flex-1">{item.q}</span>
                <span className="text-[var(--text-muted)] text-[12px] group-open:rotate-180 transition-transform">+</span>
              </summary>
              <p className="mt-3 ml-7 text-[12px] text-[var(--text-secondary)] leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Contattaci</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="mailto:support@herion.it" className="bg-white rounded-xl border p-5 flex items-start gap-3 hover:bg-[var(--hover-soft)] transition-colors" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="contact-email">
            <Mail className="w-5 h-5 text-[#0ABFCF] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">Email</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">support@herion.it</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Rispondiamo entro 24 ore</p>
            </div>
          </a>
          <div className="bg-white rounded-xl border p-5 flex items-start gap-3" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="contact-chat">
            <MessageCircle className="w-5 h-5 text-[#0ABFCF] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">Chat nella Pratica</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Apri una pratica e usa "Chiedi a Herion"</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Risposta immediata dall'assistente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Docs */}
      <div className="bg-[var(--bg-soft)] rounded-xl p-5">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-[#0ABFCF]" strokeWidth={1.5} />
          <div>
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">Guida completa</p>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Consulta la guida per scoprire tutte le funzionalita di Herion e come utilizzarle al meglio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
