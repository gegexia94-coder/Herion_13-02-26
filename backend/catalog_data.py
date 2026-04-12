"""
Herion Practice Catalog — Definitive Foundation
38 procedures across 5 categories with universal flow model.
Each official procedure includes: flow_definition, official_entry_point,
expected_release, tracking_mode, and real entity URLs.
"""


def build_internal(pid, name, desc, category, agents, docs=None, doc_specs=None, approval=False, explanation=""):
    """Helper for internal support procedures (no official action, no entity)."""
    return {
        "practice_id": pid,
        "name": name,
        "description": desc,
        "category": category,
        "category_label": {"informativo": "Informativo", "documentale": "Documentale"}[category],
        "procedure_type": "internal_support",
        "user_type": ["private", "freelancer", "company"],
        "country_scope": "IT",
        "operational_status": "active_internal",
        "scope_note": "Servizio interno di piattaforma.",
        "risk_level": "basic",
        "support_level": "supported",
        "expected_channel": "email",
        "destination_type": "user_communication",
        "required_documents": docs or [],
        "document_specs": doc_specs or [],
        "official_action": None,
        "flow_definition": None,
        "who_acts": {
            "herion_prepares": True,
            "herion_submits": category == "informativo",
            "user_submits": False,
            "user_signs": False,
            "delegation_possible": False,
            "entity_response_expected": False,
        },
        "auth_method": None,
        "proof_expected": None,
        "estimated_duration": {"label": "Immediato", "min_days": 0, "max_days": 1},
        "delegation_required": False,
        "approval_required": approval,
        "agents": agents,
        "blocking_conditions": [],
        "escalation_conditions": [],
        "next_step": "Prossima azione",
        "user_explanation": explanation or desc,
    }


def build_official(
    pid, name, desc, category, entity_name, action_code, action_label, action_desc,
    form_ref, entry_url, auth_method, user_type, agents,
    docs, doc_specs,
    proof_type, proof_label, proof_timing,
    tracking_type, tracking_label, tracking_ref,
    duration_label, min_days, max_days,
    herion_submits=False, user_signs=False, delegation_possible=False,
    delegation_required=False, risk_level="medium",
    blocking=None, escalation=None, explanation="",
    url_verified=True, destination_type="tax_authority",
):
    """Helper for official procedures with full flow model."""
    return {
        "practice_id": pid,
        "name": name,
        "description": desc,
        "category": category,
        "category_label": {"fiscale": "Fiscale", "previdenziale": "Previdenziale", "societario": "Societario"}[category],
        "procedure_type": "official_procedure",
        "user_type": user_type,
        "country_scope": "IT",
        "operational_status": "active_italy_scope",
        "scope_note": f"Procedura ufficiale. Ente: {entity_name}.",
        "risk_level": risk_level,
        "support_level": "supported",
        "expected_channel": "official_portal",
        "destination_type": destination_type,
        "required_documents": docs,
        "document_specs": doc_specs,
        "official_action": {
            "code": action_code,
            "label": action_label,
            "description": action_desc,
            "entity_name": entity_name,
            "form_reference": form_ref,
        },
        "flow_definition": {
            "practice_type": pid,
            "target_entity": entity_name,
            "target_direction": action_label,
            "user_action_required": not herion_submits,
            "document_collection_required": len(docs) > 0,
            "document_verification_required": len(docs) > 0,
            "official_entry_point": {
                "type": "portal" if entry_url else "manual_upload",
                "label": f"Portale {entity_name} - {action_label}",
                "url": entry_url,
                "url_verified": url_verified,
                "auth_required": auth_method is not None,
                "auth_method": auth_method,
            },
            "expected_release": {
                "type": proof_type,
                "label": proof_label,
                "timing": proof_timing,
            },
            "tracking_mode": {
                "type": tracking_type,
                "label": tracking_label,
                "route_or_reference": tracking_ref,
            },
        },
        "who_acts": {
            "herion_prepares": True,
            "herion_submits": herion_submits,
            "user_submits": not herion_submits,
            "user_signs": user_signs,
            "delegation_possible": delegation_possible,
            "entity_response_expected": True,
        },
        "auth_method": auth_method,
        "proof_expected": {
            "type": proof_type,
            "timing": proof_timing,
            "label": proof_label,
            "optional": False,
        },
        "estimated_duration": {"label": duration_label, "min_days": min_days, "max_days": max_days},
        "delegation_required": delegation_required,
        "approval_required": True,
        "agents": agents,
        "blocking_conditions": blocking or [],
        "escalation_conditions": escalation or [],
        "next_step": f"Preparazione {action_label.lower()}",
        "user_explanation": explanation or desc,
    }


# ── DOCUMENT SPEC HELPERS ──
DS_ID = {"key": "identity", "name": "Documento di identita", "why_needed": "Obbligatorio per identificazione presso l'ente", "format": "PDF o immagine (fronte/retro)", "mandatory": True}
DS_CF = {"key": "tax_declarations", "name": "Codice fiscale / tessera sanitaria", "why_needed": "Per associare la pratica al codice fiscale", "format": "PDF o immagine", "mandatory": True}
DS_PIVA = {"key": "tax_declarations", "name": "Partita IVA attiva", "why_needed": "Numero P.IVA attivo necessario per la procedura", "format": "Visura o certificato P.IVA", "mandatory": True}
DS_ACCOUNTING = {"key": "accounting", "name": "Dati contabili / importi", "why_needed": "Per calcolare correttamente codici tributo e importi", "format": "PDF o foglio di calcolo", "mandatory": True}
DS_VAT_REGS = {"key": "vat_documents", "name": "Registri IVA", "why_needed": "Base per il calcolo IVA a debito/credito", "format": "PDF o export contabile", "mandatory": True}
DS_INVOICES = {"key": "invoices", "name": "Fatture emesse e ricevute", "why_needed": "Per la riconciliazione con i registri", "format": "PDF o XML", "mandatory": True}
DS_COMPANY = {"key": "company_documents", "name": "Visura camerale e atto costitutivo", "why_needed": "Per verificare lo stato della societa", "format": "PDF", "mandatory": True}
DS_BALANCE = {"key": "accounting", "name": "Bilancio", "why_needed": "Per la verifica della situazione patrimoniale", "format": "PDF firmato", "mandatory": True}
DS_TAX = {"key": "tax", "name": "Certificazione debiti tributari", "why_needed": "Per confermare l'assenza di debiti verso l'erario", "format": "PDF", "mandatory": True}
DS_COMPLIANCE = {"key": "compliance", "name": "Dichiarazione di conformita", "why_needed": "Per attestare il rispetto degli obblighi di legge", "format": "PDF firmato", "mandatory": True}
DS_PAYROLL = {"key": "payroll", "name": "Dati retributivi dipendenti", "why_needed": "Per il calcolo dei contributi e delle certificazioni", "format": "PDF o foglio di calcolo", "mandatory": True}

# Real official URLs (verified where possible)
URL_ADE_TELEMATICI = "https://telematici.agenziaentrate.gov.it"
URL_ADE_FISCONLINE = "https://telematici.agenziaentrate.gov.it/Abilitazione/Fisconline.jsp"
URL_ADE_CASSETTO = "https://telematici.agenziaentrate.gov.it/Abilitazione/Cassetto.jsp"
URL_ADE_F24WEB = "https://telematici.agenziaentrate.gov.it/F24web"
URL_ADE_FATTURE = "https://ivaservizi.agenziaentrate.gov.it/portale/"
URL_ADE_PRECOMPILATA = "https://infoprecompilata.agenziaentrate.gov.it"
URL_ADE_REDDITI = "https://telematici.agenziaentrate.gov.it/Abilitazione/ReddOnLine.jsp"
URL_INPS_SERVIZI = "https://www.inps.it/prestazioni-servizi"
URL_INPS_MYINPS = "https://myinps2.inps.it"
URL_REGISTRO_IMPRESE = "https://www.registroimprese.it"
URL_COMUNICA_STARWEB = "https://starweb.infocamere.it"
URL_SUAP = None  # Varies by municipality
URL_AGENZIA_DOGANE = "https://www.adm.gov.it"


def get_catalog_entries():
    """Return all 38 catalog entries."""
    entries = []

    # ══════════════════════════════════════
    # INFORMATIVO (internal support) — 4
    # ══════════════════════════════════════
    entries.append(build_internal("INFO_FISCAL_GENERIC", "Richiesta informazioni fiscali generiche", "Richiesta di chiarimenti su adempimenti fiscali di base.", "informativo", ["intake", "research", "advisor"], explanation="Richiesta di informazioni fiscali di base. Herion raccoglie la domanda e fornisce indicazioni chiare."))
    entries.append(build_internal("INFO_REGIME_FORFETTARIO", "Informazioni regime forfettario", "Chiarimenti su requisiti, limiti e vantaggi del regime forfettario.", "informativo", ["research", "advisor"], explanation="Spiegazione chiara del regime forfettario: requisiti, limiti di fatturato, aliquote e vantaggi."))
    entries.append(build_internal("PRACTICE_FOLLOWUP", "Promemoria e follow-up pratica", "Promemoria sullo stato di avanzamento di una pratica.", "informativo", ["monitor", "deadline", "advisor"], explanation="Ricevi aggiornamenti e promemoria sullo stato della tua pratica."))
    entries.append(build_internal("STATUS_UPDATE", "Aggiornamento stato pratica", "Comunicazione di aggiornamento sullo stato della pratica.", "informativo", ["monitor", "advisor"], explanation="Ricevi un riepilogo aggiornato sullo stato della tua pratica."))

    # ══════════════════════════════════════
    # DOCUMENTALE (internal support) — 7
    # ══════════════════════════════════════
    entries.append(build_internal("DOC_MISSING_REQUEST", "Richiesta documenti mancanti", "Notifica all'utente sui documenti necessari per procedere.", "documentale", ["documents", "flow", "advisor"], explanation="Ti indichiamo quali documenti servono per completare la tua pratica."))
    entries.append(build_internal("DOC_PRELIMINARY_SEND", "Invio documenti preliminari", "Invio di documentazione preliminare a un destinatario.", "documentale", ["documents", "routing", "advisor"], docs=["identity"], doc_specs=[DS_ID], approval=True, explanation="Preparazione e invio della documentazione preliminare."))
    entries.append(build_internal("BLOCKED_RECOVERY", "Recupero pratica bloccata", "Recupero di una pratica in stato bloccato.", "documentale", ["flow", "monitor", "documents"], explanation="Identifichiamo cosa blocca la pratica e ti guidiamo nella risoluzione."))
    entries.append(build_internal("DOSSIER_DELIVERY", "Consegna dossier finale", "Consegna del fascicolo completo della pratica.", "documentale", ["documents", "advisor"], approval=True, explanation="Il fascicolo completo della pratica viene preparato e consegnato."))
    entries.append(build_internal("DOC_COMPLETENESS", "Verifica completezza documenti", "Controllo che tutti i documenti necessari siano presenti.", "documentale", ["documents", "flow"], explanation="Verifichiamo che tutti i documenti necessari siano stati caricati."))
    entries.append(build_internal("USER_APPROVAL_REQ", "Richiesta approvazione utente", "Richiesta di approvazione esplicita prima di procedere.", "documentale", ["flow", "monitor"], approval=True, explanation="Prima di procedere, ti chiediamo di verificare e approvare il riepilogo."))
    entries.append(build_internal("PDF_REPORT_DELIVERY", "Consegna PDF/report finale", "Generazione e consegna del report PDF finale.", "documentale", ["documents", "advisor"], explanation="Il report finale della pratica viene generato e messo a disposizione."))

    # ══════════════════════════════════════
    # FISCALE (official procedures) — 14
    # ══════════════════════════════════════
    entries.append(build_official("VAT_OPEN_PF", "Apertura Partita IVA persone fisiche", "Preparazione della pratica di apertura P.IVA per individui e freelance.", "fiscale", "Agenzia delle Entrate", "apertura_partita_iva_pf", "Apertura Partita IVA", "Invio del modello AA9/12 all'Agenzia delle Entrate per l'apertura della Partita IVA", "Modello AA9/12", URL_ADE_FISCONLINE, "SPID", ["freelancer"], ["intake", "research", "routing", "documents", "flow"], ["identity", "tax_declarations"], [DS_ID, DS_CF], "protocol_number", "Numero di protocollo rilasciato dal portale", "immediate", "portal_status", "Verifica stato sul portale AdE", URL_ADE_CASSETTO, "3-5 giorni lavorativi", 3, 5, blocking=["documenti identita mancanti", "codice fiscale mancante"], escalation=["struttura societaria complessa"], explanation="Ti guidiamo nella preparazione della pratica di apertura P.IVA. Herion prepara il modello AA9/12, tu lo invii sul portale con SPID."))

    entries.append(build_official("VAT_VARIATION_PF", "Variazione Partita IVA persone fisiche", "Modifica dei dati della partita IVA per persone fisiche.", "fiscale", "Agenzia delle Entrate", "variazione_partita_iva_pf", "Variazione dati Partita IVA", "Invio variazione tramite modello AA9/12", "Modello AA9/12", URL_ADE_FISCONLINE, "SPID", ["freelancer"], ["research", "routing", "documents", "flow"], ["identity"], [DS_ID], "protocol_number", "Numero di protocollo della variazione", "immediate", "portal_status", "Verifica stato sul cassetto fiscale", URL_ADE_CASSETTO, "2-4 giorni lavorativi", 2, 4, blocking=["partita IVA non attiva"], explanation="Preparazione della variazione dei dati della tua P.IVA."))

    entries.append(build_official("VAT_CLOSURE_PF", "Chiusura Partita IVA persone fisiche", "Chiusura della partita IVA.", "fiscale", "Agenzia delle Entrate", "chiusura_partita_iva_pf", "Chiusura Partita IVA", "Invio della cessazione tramite modello AA9/12", "Modello AA9/12", URL_ADE_FISCONLINE, "SPID", ["freelancer"], ["research", "routing", "documents", "flow", "delegate"], ["identity", "tax_declarations"], [DS_ID, DS_CF], "protocol_number", "Numero di protocollo della cessazione", "immediate", "portal_status", "Verifica stato cassetto fiscale", URL_ADE_CASSETTO, "5-10 giorni lavorativi", 5, 10, delegation_possible=True, blocking=["debiti pendenti non verificati"], escalation=["pendenze fiscali complesse"], explanation="Ti guidiamo nella chiusura della P.IVA, verificando pendenze e requisiti."))

    entries.append(build_official("F24_PREPARATION", "Preparazione e validazione F24", "Compilazione e verifica del modello F24.", "fiscale", "Agenzia delle Entrate", "compilazione_f24", "Compilazione modello F24", "Preparazione del modello F24 per pagamento imposte, contributi e tributi", "Modello F24", URL_ADE_F24WEB, "SPID", ["private", "freelancer", "company"], ["ledger", "documents", "compliance", "advisor"], ["accounting"], [DS_ACCOUNTING], "payment_receipt", "Quietanza di pagamento F24", "immediate", "receipt_verification", "Verifica quietanza", URL_ADE_CASSETTO, "1-2 giorni lavorativi", 1, 2, destination_type="tax_payment", blocking=["dati contabili insufficienti"], explanation="Prepariamo e verifichiamo il modello F24 per i tuoi pagamenti fiscali."))

    entries.append(build_official("F24_WEB", "Supporto F24 Web", "Compilazione F24 tramite portale web.", "fiscale", "Agenzia delle Entrate", "invio_f24_web", "Invio F24 tramite portale web", "Compilazione e invio del modello F24 tramite servizio F24 Web", "F24 Web", URL_ADE_F24WEB, "SPID", ["private", "freelancer", "company"], ["routing", "research", "ledger", "flow"], ["accounting"], [DS_ACCOUNTING], "portal_confirmation", "Conferma invio dal portale F24 Web", "immediate", "portal_status", "Verifica sul portale F24 Web", URL_ADE_F24WEB, "1-2 giorni lavorativi", 1, 2, destination_type="tax_payment", explanation="Ti guidiamo nell'uso del portale F24 Web. Herion prepara i dati, tu compili e invii."))

    entries.append(build_official("VAT_DECLARATION", "Dichiarazione IVA annuale", "Preparazione e invio della dichiarazione IVA.", "fiscale", "Agenzia delle Entrate", "invio_dichiarazione_iva", "Invio dichiarazione IVA", "Invio della dichiarazione IVA annuale tramite il portale", "Dichiarazione IVA annuale", URL_ADE_TELEMATICI, "SPID", ["freelancer", "company"], ["research", "documents", "compliance", "flow"], ["vat_documents", "invoices", "accounting"], [DS_VAT_REGS, DS_INVOICES, DS_ACCOUNTING], "protocol_number", "Ricevuta telematica AdE", "delayed", "portal_status", "Verifica ricevuta nel cassetto fiscale", URL_ADE_CASSETTO, "5-10 giorni lavorativi", 5, 10, user_signs=True, delegation_possible=True, blocking=["registri IVA incompleti"], escalation=["operazioni intracomunitarie complesse"], explanation="Prepariamo la tua dichiarazione IVA verificando registri e documenti. Tu la firmi e la invii."))

    entries.append(build_official("EINVOICING", "Fatturazione elettronica SDI", "Emissione e gestione fatture elettroniche tramite SDI.", "fiscale", "Agenzia delle Entrate (SDI)", "emissione_fattura_elettronica", "Emissione fattura elettronica via SDI", "Generazione e invio della fattura tramite il Sistema di Interscambio", "Formato FatturaPA / FatturaB2B", URL_ADE_FATTURE, "SPID", ["freelancer", "company"], ["research", "routing", "documents", "advisor"], ["invoices"], [DS_INVOICES], "portal_confirmation", "Notifica di esito dal SDI", "delayed", "portal_status", "Verifica esito su Fatture e Corrispettivi", URL_ADE_FATTURE, "1-3 giorni lavorativi", 1, 3, delegation_possible=True, explanation="Ti supportiamo nella gestione della fatturazione elettronica tramite SDI."))

    entries.append(build_official("INCOME_TAX_PF", "Dichiarazione Redditi PF", "Compilazione e invio del Modello Redditi Persone Fisiche.", "fiscale", "Agenzia delle Entrate", "invio_redditi_pf", "Invio Modello Redditi PF", "Compilazione e trasmissione telematica del Modello Redditi Persone Fisiche", "Modello Redditi PF", URL_ADE_REDDITI, "SPID", ["freelancer"], ["research", "ledger", "documents", "compliance", "flow"], ["identity", "tax_declarations", "accounting"], [DS_ID, DS_CF, DS_ACCOUNTING], "protocol_number", "Ricevuta telematica dichiarazione redditi", "delayed", "portal_status", "Verifica ricevuta nel cassetto fiscale", URL_ADE_CASSETTO, "10-20 giorni lavorativi", 10, 20, user_signs=True, delegation_possible=True, blocking=["dati reddituali incompleti"], escalation=["redditi esteri", "plusvalenze complesse"], explanation="Prepariamo la tua dichiarazione dei redditi. Herion compila, tu verifichi e invii."))

    entries.append(build_official("INCOME_TAX_730", "Dichiarazione 730 precompilata", "Accesso e invio della dichiarazione 730 precompilata.", "fiscale", "Agenzia delle Entrate", "invio_730_precompilata", "Invio 730 precompilata", "Accesso alla dichiarazione 730 precompilata e trasmissione telematica", "Modello 730", URL_ADE_PRECOMPILATA, "SPID", ["private", "freelancer"], ["research", "advisor", "documents"], ["identity"], [DS_ID], "protocol_number", "Ricevuta invio 730 precompilata", "immediate", "portal_status", "Verifica stato su precompilata", URL_ADE_PRECOMPILATA, "1-5 giorni lavorativi", 1, 5, explanation="Ti guidiamo nell'accesso e invio della 730 precompilata. Herion verifica, tu invii con SPID."))

    entries.append(build_official("LIPE_QUARTERLY", "Comunicazione Liquidazioni IVA (LIPE)", "Invio trimestrale delle liquidazioni periodiche IVA.", "fiscale", "Agenzia delle Entrate", "invio_lipe", "Comunicazione LIPE trimestrale", "Trasmissione telematica delle liquidazioni periodiche IVA", "Comunicazione LIPE", URL_ADE_TELEMATICI, "SPID", ["freelancer", "company"], ["ledger", "compliance", "documents", "flow"], ["vat_documents", "accounting"], [DS_VAT_REGS, DS_ACCOUNTING], "protocol_number", "Ricevuta telematica LIPE", "delayed", "portal_status", "Verifica ricevuta nel cassetto fiscale", URL_ADE_CASSETTO, "3-7 giorni lavorativi", 3, 7, user_signs=True, delegation_possible=True, blocking=["registri IVA del trimestre incompleti"], explanation="Prepariamo la comunicazione trimestrale delle liquidazioni IVA (LIPE)."))

    entries.append(build_official("CU_CERTIFICATION", "Certificazione Unica (CU)", "Preparazione e invio della Certificazione Unica.", "fiscale", "Agenzia delle Entrate", "invio_certificazione_unica", "Invio Certificazione Unica", "Compilazione e trasmissione della CU per redditi di lavoro dipendente e assimilati", "Certificazione Unica (CU)", URL_ADE_TELEMATICI, "SPID", ["company"], ["documents", "compliance", "ledger", "flow"], ["payroll", "accounting"], [DS_PAYROLL, DS_ACCOUNTING], "protocol_number", "Ricevuta telematica CU", "delayed", "portal_status", "Verifica ricevuta nel cassetto fiscale", URL_ADE_CASSETTO, "5-15 giorni lavorativi", 5, 15, user_signs=True, delegation_possible=True, blocking=["dati retributivi mancanti"], explanation="Prepariamo la Certificazione Unica (CU) per i tuoi dipendenti o collaboratori."))

    entries.append(build_official("INTRASTAT", "Modelli Intrastat", "Preparazione e invio dei modelli Intrastat per operazioni intracomunitarie.", "fiscale", "Agenzia delle Dogane", "invio_intrastat", "Invio modelli Intrastat", "Trasmissione telematica dei modelli Intrastat per cessioni/acquisti intracomunitari", "Modelli INTRA", URL_AGENZIA_DOGANE, "SPID", ["freelancer", "company"], ["research", "ledger", "documents", "compliance"], ["invoices", "vat_documents"], [DS_INVOICES, DS_VAT_REGS], "protocol_number", "Ricevuta telematica Intrastat", "delayed", "portal_status", "Verifica su portale Dogane", URL_AGENZIA_DOGANE, "3-10 giorni lavorativi", 3, 10, user_signs=True, delegation_possible=True, blocking=["fatture intracomunitarie incomplete"], escalation=["operazioni triangolari complesse"], explanation="Prepariamo i modelli Intrastat per le tue operazioni intracomunitarie."))

    entries.append(build_official("CASSETTO_FISCALE", "Consultazione cassetto fiscale", "Accesso e consultazione del cassetto fiscale.", "fiscale", "Agenzia delle Entrate", "consultazione_cassetto_fiscale", "Consultazione cassetto fiscale", "Accesso al cassetto fiscale per verifica dichiarazioni, versamenti e comunicazioni", None, URL_ADE_CASSETTO, "SPID", ["private", "freelancer", "company"], ["research", "advisor", "monitor"], [], [], "portal_confirmation", "Visualizzazione dati nel cassetto fiscale", "immediate", "portal_status", "Consultazione diretta sul portale", URL_ADE_CASSETTO, "Immediato (accesso online)", 0, 1, risk_level="basic", explanation="Ti aiutiamo a consultare e comprendere il tuo cassetto fiscale."))

    entries.append(build_official("VISURA_CAMERALE", "Richiesta visura camerale", "Richiesta e scaricamento della visura camerale.", "fiscale", "Camera di Commercio", "richiesta_visura", "Richiesta visura camerale", "Accesso al Registro Imprese per ottenere la visura camerale aggiornata", None, URL_REGISTRO_IMPRESE, None, ["freelancer", "company"], ["research", "documents"], [], [], "receipt_pdf", "Visura camerale scaricata", "immediate", "receipt_verification", "Verifica su Registro Imprese", URL_REGISTRO_IMPRESE, "Immediato", 0, 1, risk_level="basic", destination_type="chamber_registry", explanation="Ti aiutiamo a ottenere la visura camerale aggiornata dal Registro Imprese."))

    # ══════════════════════════════════════
    # PREVIDENZIALE (official procedures) — 5
    # ══════════════════════════════════════
    entries.append(build_official("INPS_GESTIONE_SEP", "Iscrizione Gestione Separata INPS", "Iscrizione alla Gestione Separata INPS per liberi professionisti.", "previdenziale", "INPS", "iscrizione_gestione_separata", "Iscrizione Gestione Separata", "Iscrizione alla Gestione Separata per liberi professionisti senza cassa", "Modulo iscrizione online", URL_INPS_SERVIZI, "SPID", ["freelancer"], ["research", "routing", "documents", "flow"], ["identity", "tax_declarations"], [DS_ID, DS_PIVA], "protocol_number", "Conferma iscrizione dall'area riservata INPS", "immediate", "portal_status", "Verifica su MyINPS", URL_INPS_MYINPS, "3-7 giorni lavorativi", 3, 7, destination_type="social_security", blocking=["partita IVA non attiva"], explanation="Ti guidiamo nell'iscrizione alla Gestione Separata INPS."))

    entries.append(build_official("INPS_CASSETTO", "Consultazione cassetto previdenziale", "Consultazione del cassetto previdenziale INPS.", "previdenziale", "INPS", "consultazione_cassetto_previdenziale", "Consultazione cassetto previdenziale", "Accesso al cassetto previdenziale sul portale INPS", None, URL_INPS_MYINPS, "SPID", ["freelancer"], ["research", "routing", "advisor", "monitor"], [], [], "portal_confirmation", "Visualizzazione dati previdenziali", "immediate", "portal_status", "Consultazione su MyINPS", URL_INPS_MYINPS, "Immediato (accesso online)", 0, 1, risk_level="basic", destination_type="social_security", explanation="Ti aiutiamo a consultare e comprendere il tuo cassetto previdenziale INPS."))

    entries.append(build_official("INPS_DURC", "Richiesta DURC", "Richiesta del Documento Unico di Regolarita Contributiva.", "previdenziale", "INPS", "richiesta_durc", "Richiesta DURC online", "Richiesta del DURC tramite il portale INPS per attestare la regolarita contributiva", None, URL_INPS_SERVIZI, "SPID", ["freelancer", "company"], ["research", "documents", "flow"], ["identity"], [DS_ID], "receipt_pdf", "DURC in formato PDF", "delayed", "portal_status", "Verifica stato richiesta su MyINPS", URL_INPS_MYINPS, "5-15 giorni lavorativi", 5, 15, destination_type="social_security", blocking=["irregolarita contributive"], explanation="Ti guidiamo nella richiesta del DURC per attestare la tua regolarita contributiva."))

    entries.append(build_official("INPS_ARTIGIANI", "Iscrizione Gestione Artigiani INPS", "Iscrizione alla Gestione Artigiani presso INPS.", "previdenziale", "INPS", "iscrizione_gestione_artigiani", "Iscrizione Gestione Artigiani", "Iscrizione alla gestione previdenziale per artigiani", "Modulo iscrizione artigiani", URL_INPS_SERVIZI, "SPID", ["freelancer"], ["research", "routing", "documents", "flow"], ["identity", "tax_declarations", "company_documents"], [DS_ID, DS_PIVA, DS_COMPANY], "protocol_number", "Conferma iscrizione Gestione Artigiani", "delayed", "portal_status", "Verifica su MyINPS", URL_INPS_MYINPS, "5-10 giorni lavorativi", 5, 10, destination_type="social_security", blocking=["iscrizione Camera di Commercio mancante"], explanation="Ti guidiamo nell'iscrizione alla Gestione Artigiani INPS."))

    entries.append(build_official("INPS_COMMERCIANTI", "Iscrizione Gestione Commercianti INPS", "Iscrizione alla Gestione Commercianti presso INPS.", "previdenziale", "INPS", "iscrizione_gestione_commercianti", "Iscrizione Gestione Commercianti", "Iscrizione alla gestione previdenziale per commercianti", "Modulo iscrizione commercianti", URL_INPS_SERVIZI, "SPID", ["freelancer", "company"], ["research", "routing", "documents", "flow"], ["identity", "tax_declarations", "company_documents"], [DS_ID, DS_PIVA, DS_COMPANY], "protocol_number", "Conferma iscrizione Gestione Commercianti", "delayed", "portal_status", "Verifica su MyINPS", URL_INPS_MYINPS, "5-10 giorni lavorativi", 5, 10, destination_type="social_security", blocking=["iscrizione Camera di Commercio mancante"], explanation="Ti guidiamo nell'iscrizione alla Gestione Commercianti INPS."))

    # ══════════════════════════════════════
    # SOCIETARIO (official procedures) — 5
    # ══════════════════════════════════════
    entries.append(build_official("COMPANY_CLOSURE", "Chiusura societaria post-liquidazione", "Gestione completa della chiusura societaria dopo liquidazione.", "societario", "Camera di Commercio", "cancellazione_registro_imprese", "Cancellazione dal Registro delle Imprese", "Deposito della domanda di cancellazione presso la Camera di Commercio", "Modulo S3 / ComUnica", URL_COMUNICA_STARWEB, "SPID", ["company"], ["intake", "research", "deadline", "flow", "routing", "delegate", "documents", "compliance", "ledger"], ["company_documents", "accounting", "identity", "tax", "compliance"], [DS_COMPANY, DS_BALANCE, DS_ID, DS_TAX, DS_COMPLIANCE], "protocol_number", "Numero protocollo Registro delle Imprese", "delayed", "portal_status", "Verifica stato su Registro Imprese", URL_REGISTRO_IMPRESE, "10-30 giorni lavorativi", 10, 30, user_signs=True, delegation_possible=True, delegation_required=True, destination_type="chamber_registry", blocking=["liquidazione non completata", "bilancio finale non approvato"], escalation=["contenziosi pendenti"], explanation="Herion prepara il percorso di chiusura post-liquidazione. Verifichiamo requisiti, raccogliamo documenti e prepariamo il dossier."))

    entries.append(build_official("COMPANY_FORMATION_SRL", "Costituzione SRL", "Avvio del processo di costituzione di una SRL.", "societario", "Camera di Commercio", "iscrizione_srl", "Iscrizione SRL al Registro Imprese", "Deposito dell'atto costitutivo e iscrizione al Registro delle Imprese", "ComUnica / Atto notarile", URL_COMUNICA_STARWEB, "SPID", ["company"], ["intake", "research", "documents", "compliance", "flow", "routing"], ["company_documents", "identity", "accounting"], [DS_COMPANY, DS_ID, {"key": "accounting", "name": "Capitale sociale versato", "why_needed": "Prova del versamento del capitale sociale", "format": "Bonifico o attestazione bancaria", "mandatory": True}], "protocol_number", "Numero iscrizione Registro Imprese", "delayed", "portal_status", "Verifica su Registro Imprese", URL_REGISTRO_IMPRESE, "15-30 giorni lavorativi", 15, 30, user_signs=True, delegation_possible=True, delegation_required=True, destination_type="chamber_registry", blocking=["atto notarile mancante", "capitale non versato"], escalation=["struttura societaria complessa"], explanation="Ti accompagniamo nella costituzione della SRL, dalla preparazione dei documenti all'iscrizione al Registro Imprese."))

    entries.append(build_official("COMPANY_VARIATION", "Variazione dati Camera di Commercio", "Modifica dei dati aziendali presso il Registro Imprese.", "societario", "Camera di Commercio", "variazione_registro_imprese", "Variazione dati Registro Imprese", "Deposito della pratica di variazione dati presso la Camera di Commercio", "ComUnica", URL_COMUNICA_STARWEB, "SPID", ["company"], ["research", "documents", "flow", "routing"], ["company_documents", "identity"], [DS_COMPANY, DS_ID], "protocol_number", "Numero protocollo variazione", "delayed", "portal_status", "Verifica su Registro Imprese", URL_REGISTRO_IMPRESE, "5-15 giorni lavorativi", 5, 15, destination_type="chamber_registry", explanation="Prepariamo la variazione dei dati aziendali presso la Camera di Commercio."))

    entries.append(build_official("SUAP_SCIA", "SCIA - Segnalazione Certificata Inizio Attivita", "Presentazione della SCIA allo sportello SUAP del Comune.", "societario", "SUAP / Comune", "presentazione_scia", "Presentazione SCIA", "Presentazione della Segnalazione Certificata di Inizio Attivita allo sportello SUAP", "Modulo SCIA", URL_SUAP, "SPID", ["freelancer", "company"], ["research", "documents", "compliance", "flow"], ["identity", "company_documents"], [DS_ID, DS_COMPANY], "protocol_number", "Numero protocollo SCIA", "immediate", "portal_status", "Verifica stato sul portale SUAP", None, "1-5 giorni lavorativi", 1, 5, destination_type="public_portal", url_verified=False, blocking=["requisiti tecnici non verificati"], explanation="Ti guidiamo nella presentazione della SCIA allo sportello SUAP del tuo Comune."))

    entries.append(build_official("ATECO_VARIATION", "Variazione codice ATECO", "Modifica del codice attivita economica (ATECO).", "societario", "Camera di Commercio / Agenzia delle Entrate", "variazione_ateco", "Variazione codice ATECO", "Comunicazione di variazione del codice ATECO tramite ComUnica e portale AdE", "ComUnica + AA9/12", URL_COMUNICA_STARWEB, "SPID", ["freelancer", "company"], ["research", "routing", "documents", "flow"], ["identity"], [DS_ID], "protocol_number", "Numero protocollo variazione ATECO", "delayed", "portal_status", "Verifica su Registro Imprese e cassetto fiscale", URL_REGISTRO_IMPRESE, "5-10 giorni lavorativi", 5, 10, destination_type="chamber_registry", explanation="Prepariamo la variazione del codice ATECO presso Camera di Commercio e Agenzia delle Entrate."))

    return entries
