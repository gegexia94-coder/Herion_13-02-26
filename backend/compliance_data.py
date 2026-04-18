"""
Herion Compliance & Rights Guidance Data.
Rights, obligations, risks, and sanctions for procedure categories.
This is orientation and guidance — not final legal authority.
"""


def get_compliance_guidance(practice_id: str, category: str) -> dict:
    """Return compliance guidance for a procedure based on its ID and category."""

    # Category-level base guidance
    category_guidance = CATEGORY_COMPLIANCE.get(category, {})

    # Procedure-specific overrides
    specific = PROCEDURE_COMPLIANCE.get(practice_id)

    if specific:
        return {
            "has_guidance": True,
            "practice_id": practice_id,
            "category": category,
            **specific,
            "disclaimer": DISCLAIMER,
        }

    if category_guidance:
        return {
            "has_guidance": True,
            "practice_id": practice_id,
            "category": category,
            **category_guidance,
            "disclaimer": DISCLAIMER,
        }

    return {"has_guidance": False, "practice_id": practice_id, "category": category}


DISCLAIMER = (
    "Le informazioni fornite hanno carattere orientativo e divulgativo. "
    "Non costituiscono consulenza legale o fiscale vincolante. "
    "Per decisioni specifiche, consulta un professionista abilitato o l'ente competente."
)


CATEGORY_COMPLIANCE = {
    "fiscale": {
        "rights": [
            {"title": "Accesso al cassetto fiscale", "detail": "Hai diritto a consultare in qualsiasi momento la tua posizione fiscale tramite il portale dell'Agenzia delle Entrate."},
            {"title": "Rateizzazione", "detail": "In caso di importi rilevanti, puoi richiedere la rateizzazione del pagamento secondo le condizioni previste dalla legge."},
            {"title": "Rimborso crediti", "detail": "Se risulta un credito d'imposta a tuo favore, hai diritto a chiederne il rimborso o l'utilizzo in compensazione."},
            {"title": "Autotutela", "detail": "Puoi presentare un'istanza di autotutela se ritieni che un atto dell'ente contenga errori."},
        ],
        "obligations": [
            {"title": "Rispetto delle scadenze", "detail": "Le dichiarazioni e i versamenti hanno scadenze precise. Il mancato rispetto comporta sanzioni."},
            {"title": "Conservazione documenti", "detail": "I documenti fiscali devono essere conservati per almeno 5 anni dalla data di presentazione della dichiarazione."},
            {"title": "Veridicita dei dati", "detail": "I dati dichiarati devono essere completi e veritieri. Dichiarazioni false comportano responsabilita penali."},
        ],
        "risks": [
            {"title": "Sanzioni per ritardo", "detail": "Il versamento tardivo comporta una sanzione del 30% sull'importo, riducibile con ravvedimento operoso."},
            {"title": "Interessi di mora", "detail": "Oltre alle sanzioni, si applicano interessi legali calcolati dal giorno di scadenza."},
            {"title": "Accertamento", "detail": "In caso di incongruenze, l'Agenzia delle Entrate puo avviare un accertamento fiscale."},
        ],
        "what_if_missed": "Se salti una scadenza fiscale, puoi regolarizzare la posizione con il ravvedimento operoso, pagando sanzioni ridotte. Prima intervieni, meno paghi.",
    },
    "previdenziale": {
        "rights": [
            {"title": "Estratto conto contributivo", "detail": "Puoi verificare in ogni momento i contributi versati tramite il portale INPS."},
            {"title": "Ricongiunzione e riscatto", "detail": "Hai diritto a ricongiunzione o riscatto di periodi contributivi mancanti."},
            {"title": "Pensione e prestazioni", "detail": "Al raggiungimento dei requisiti, hai diritto alle prestazioni previdenziali maturate."},
        ],
        "obligations": [
            {"title": "Versamento contributi", "detail": "I contributi previdenziali sono obbligatori e vanno versati nelle scadenze previste."},
            {"title": "Comunicazioni obbligatorie", "detail": "Eventuali variazioni della posizione lavorativa vanno comunicate tempestivamente."},
        ],
        "risks": [
            {"title": "Sanzioni per omesso versamento", "detail": "L'omesso versamento dei contributi comporta sanzioni civili e, nei casi gravi, conseguenze penali."},
            {"title": "Perdita di copertura", "detail": "Periodi senza contributi possono creare buchi nella copertura previdenziale."},
        ],
        "what_if_missed": "Contributi non versati possono essere regolarizzati, ma con sanzioni crescenti. La tempestivita riduce gli importi dovuti.",
    },
    "societario": {
        "rights": [
            {"title": "Visura camerale", "detail": "Puoi consultare e richiedere la visura camerale della tua societa in qualsiasi momento."},
            {"title": "Modifica atti", "detail": "Hai diritto a modificare statuto e atti costitutivi secondo le procedure previste."},
        ],
        "obligations": [
            {"title": "Deposito bilancio", "detail": "Il bilancio annuale deve essere depositato entro i termini di legge presso la Camera di Commercio."},
            {"title": "Aggiornamento Registro Imprese", "detail": "Ogni variazione societaria rilevante deve essere comunicata al Registro Imprese."},
            {"title": "Adempimenti antiriciclaggio", "detail": "Le societa devono rispettare gli obblighi previsti dalla normativa antiriciclaggio."},
        ],
        "risks": [
            {"title": "Sanzioni per deposito tardivo", "detail": "Il bilancio depositato oltre il termine comporta sanzioni amministrative da 274 a 549 euro."},
            {"title": "Cancellazione d'ufficio", "detail": "In caso di prolungata inattivita o inadempienza, la societa puo essere cancellata d'ufficio."},
        ],
        "what_if_missed": "Adempimenti societari mancati possono essere regolarizzati, ma con sanzioni e possibili conseguenze sulla governance aziendale.",
    },
    "lavoro": {
        "rights": [
            {"title": "Contratto e retribuzione", "detail": "Ogni lavoratore ha diritto a un contratto regolare e alla retribuzione nei termini previsti."},
            {"title": "Contributi e TFR", "detail": "Il datore di lavoro deve versare contributi e accantonare il TFR per ogni dipendente."},
        ],
        "obligations": [
            {"title": "Comunicazioni obbligatorie", "detail": "Assunzioni, cessazioni e trasformazioni vanno comunicate entro i termini di legge."},
            {"title": "UniEmens mensile", "detail": "Il flusso UniEmens deve essere trasmesso mensilmente all'INPS."},
            {"title": "Sicurezza sul lavoro", "detail": "Il datore di lavoro deve garantire condizioni di sicurezza conformi alla normativa."},
        ],
        "risks": [
            {"title": "Sanzioni per lavoro irregolare", "detail": "L'impiego non regolare comporta sanzioni amministrative molto elevate e responsabilita penali."},
            {"title": "Sanzioni contributive", "detail": "Il mancato versamento dei contributi del lavoratore comporta responsabilita civile e penale."},
        ],
        "what_if_missed": "Irregolarita nel rapporto di lavoro possono essere sanate, ma con costi significativi. La prevenzione e sempre meno onerosa della regolarizzazione.",
    },
}


PROCEDURE_COMPLIANCE = {
    "INCOME_TAX_PF": {
        "rights": [
            {"title": "Accesso alla precompilata", "detail": "Puoi consultare e modificare la dichiarazione precompilata dall'Agenzia delle Entrate."},
            {"title": "Detrazioni e deduzioni", "detail": "Hai diritto a tutte le detrazioni e deduzioni previste dalla legge per la tua situazione."},
            {"title": "Rimborso", "detail": "Se dalla dichiarazione risulta un credito, hai diritto al rimborso o alla compensazione."},
        ],
        "obligations": [
            {"title": "Presentazione entro i termini", "detail": "La dichiarazione dei redditi va presentata entro il 30 novembre dell'anno successivo."},
            {"title": "Completezza", "detail": "Tutti i redditi percepiti nell'anno devono essere dichiarati, inclusi quelli esteri."},
        ],
        "risks": [
            {"title": "Omessa dichiarazione", "detail": "La mancata presentazione comporta una sanzione dal 120% al 240% delle imposte dovute."},
            {"title": "Dichiarazione infedele", "detail": "Dati errati o incompleti comportano sanzioni dal 90% al 180% della maggiore imposta dovuta."},
        ],
        "what_if_missed": "Puoi presentare la dichiarazione tardivamente entro 90 giorni dalla scadenza con sanzione ridotta. Oltre, le sanzioni aumentano significativamente.",
    },
    "F24_PREPARATION": {
        "rights": [
            {"title": "Compensazione", "detail": "Puoi utilizzare crediti d'imposta in compensazione con altri debiti tramite F24."},
            {"title": "Verifica importi", "detail": "Hai diritto a verificare la correttezza degli importi prima del pagamento."},
        ],
        "obligations": [
            {"title": "Pagamento entro la scadenza", "detail": "Il modello F24 deve essere pagato entro la data di scadenza del tributo specifico."},
            {"title": "Codici tributo corretti", "detail": "I codici tributo e i periodi di riferimento devono essere compilati correttamente."},
        ],
        "risks": [
            {"title": "Versamento insufficiente", "detail": "Un importo errato genera un debito residuo con sanzioni e interessi."},
            {"title": "Ritardo nel pagamento", "detail": "Il ritardo comporta sanzione del 30%, riducibile con ravvedimento operoso."},
        ],
        "what_if_missed": "Un F24 non pagato puo essere regolarizzato con il ravvedimento operoso. Entro 14 giorni la sanzione e dello 0,1% al giorno.",
    },
    "VAT_OPEN_PF": {
        "rights": [
            {"title": "Scelta del regime", "detail": "Puoi scegliere il regime fiscale piu adatto (ordinario, forfettario, ecc.)."},
            {"title": "Codice ATECO", "detail": "Hai diritto a scegliere il codice ATECO corrispondente alla tua attivita."},
        ],
        "obligations": [
            {"title": "Comunicazione apertura", "detail": "L'apertura della P.IVA deve essere comunicata all'Agenzia delle Entrate entro 30 giorni dall'inizio attivita."},
            {"title": "Fatturazione", "detail": "Dal momento dell'apertura, devi emettere fattura per ogni operazione imponibile."},
        ],
        "risks": [
            {"title": "Apertura tardiva", "detail": "Aprire la P.IVA dopo l'inizio dell'attivita comporta una sanzione da 500 a 2.000 euro."},
            {"title": "Regime errato", "detail": "La scelta di un regime non idoneo puo comportare adempimenti aggiuntivi imprevisti."},
        ],
        "what_if_missed": "L'apertura tardiva e sanabile con ravvedimento. E importante regolarizzare il prima possibile per evitare cumulo di sanzioni.",
    },
}
