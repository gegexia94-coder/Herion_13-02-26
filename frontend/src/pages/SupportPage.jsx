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
            { q: 'Come creo una nuova pratica?', a: 'Vai su Dashboard e clicca "Nuova Pratica". Herion ti spieghera cosa serve e ti guidera passo dopo passo.' },
            { q: 'Cosa fa Herion esattamente?', a: 'Herion raccoglie i tuoi documenti, verifica che siano completi, prepara il dossier e ti guida verso il portale ufficiale per l\'invio. Non firma al posto tuo e non invia senza la tua approvazione.' },
            { q: 'Devo inviare io la pratica all\'ente?', a: 'Dipende dalla pratica. Herion ti dice chiaramente se l\'invio va fatto da te (es. tramite SPID sul portale dell\'Agenzia delle Entrate) oppure se puo essere completato direttamente.' },
            { q: 'Come carico un documento?', a: 'Apri la pratica, troverai la lista dei documenti richiesti con l\'etichetta "Da caricare". Clicca "Carica" e seleziona il file.' },
            { q: 'Cosa faccio se una pratica e bloccata?', a: 'Le pratiche bloccate mostrano un avviso con la causa del problema. Segui le indicazioni o chiedi a Herion dalla chat nella pratica per capire come procedere.' },
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
