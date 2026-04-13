"""
Herion International / Cross-border Intelligence Layer
Provides translation, legalization, apostille guidance and document-origin logic.
"""


def get_international_catalog_entries():
    """Return international/cross-border catalog entries."""
    entries = []

    def build_international(practice_id, name, description, entity_name, action_label, action_desc,
                            form_ref, url, auth_method, user_types, agents, required_docs, doc_specs,
                            proof_type, proof_label, proof_timing, tracking_type, tracking_label,
                            tracking_ref, duration_label, min_days, max_days,
                            url_verified=False, risk_level="basic", user_signs=False,
                            blocking=None, explanation=""):
        return {
            "practice_id": practice_id,
            "name": name,
            "description": description,
            "category": "internazionale",
            "category_label": "Internazionale",
            "procedure_type": "official_procedure",
            "support_level": "guided",
            "user_type": user_types,
            "required_documents": required_docs,
            "document_specs": doc_specs,
            "agents": agents,
            "who_acts": {"herion_prepares": True, "user_submits": True, "user_signs": user_signs, "delegation_possible": False, "entity_response_expected": True},
            "auth_method": auth_method,
            "proof_expected": {"type": proof_type, "label": proof_label, "timing": proof_timing},
            "estimated_duration": {"label": duration_label, "min_days": min_days, "max_days": max_days},
            "risk_level": risk_level,
            "blocking_conditions": blocking or [],
            "escalation_triggers": [],
            "user_explanation": explanation,
            "official_action": {"entity_name": entity_name, "label": action_label, "description": action_desc, "form_reference": form_ref, "requires_user_direct_step": True},
            "destination_type": "public_portal",
            "flow_definition": {
                "target_entity": entity_name,
                "official_entry_point": {"type": "portal" if url else "manual", "url": url, "url_verified": url_verified},
                "expected_release": {"type": proof_type, "label": proof_label, "timing": proof_timing},
                "tracking_mode": {"type": tracking_type, "label": tracking_label, "route_or_reference": tracking_ref},
            },
        }

    def build_internal_intl(practice_id, name, description, agents, explanation="", docs=None, doc_specs=None, approval=False):
        return {
            "practice_id": practice_id,
            "name": name,
            "description": description,
            "category": "internazionale",
            "category_label": "Internazionale",
            "procedure_type": "internal_support",
            "support_level": "full",
            "user_type": ["private", "freelancer", "company", "eu_citizen", "non_eu_citizen"],
            "required_documents": docs or [],
            "document_specs": doc_specs or [],
            "agents": agents,
            "who_acts": {"herion_prepares": True, "user_submits": False, "user_signs": False, "delegation_possible": False, "entity_response_expected": False},
            "auth_method": None,
            "proof_expected": {},
            "estimated_duration": {"label": "Variabile", "min_days": 1, "max_days": 10},
            "risk_level": "basic",
            "blocking_conditions": [],
            "escalation_triggers": [],
            "user_explanation": explanation,
            "official_action": None,
            "destination_type": None,
            "flow_definition": None,
            "requires_approval": approval,
        }

    # Document specs
    DS_ID = {"key": "identity", "name": "Documento di identita", "why_needed": "Per identificazione del richiedente", "format": "PDF o foto", "mandatory": True}
    DS_FOREIGN_DOC = {"key": "foreign_document", "name": "Documento originale in lingua straniera", "why_needed": "Il documento da tradurre o legalizzare", "format": "Originale o copia conforme", "mandatory": True}
    DS_TRANSLATION = {"key": "translation", "name": "Traduzione del documento", "why_needed": "Traduzione necessaria per la procedura", "format": "PDF firmato dal traduttore", "mandatory": True}
    DS_PASSPORT = {"key": "passport", "name": "Passaporto", "why_needed": "Documento di identita per cittadini stranieri", "format": "Copia integrale PDF", "mandatory": True}
    DS_PERMIT = {"key": "permit", "name": "Permesso di soggiorno o ricevuta", "why_needed": "Necessario per cittadini extra-UE", "format": "PDF", "mandatory": True}
    DS_DEGREE = {"key": "degree", "name": "Titolo di studio originale", "why_needed": "Per la procedura di riconoscimento", "format": "Originale con apostille", "mandatory": True}

    # ── OFFICIAL INTERNATIONAL PROCEDURES ──

    entries.append(build_international(
        "TRADUZIONE_GIURATA", "Traduzione giurata / asseverata",
        "Traduzione ufficiale con asseverazione presso il Tribunale per uso in Italia.",
        "Tribunale competente", "Asseverazione traduzione", "Giuramento della traduzione davanti al cancelliere del Tribunale",
        "Verbale di asseverazione", None, None,
        ["private", "freelancer", "company", "eu_citizen", "non_eu_citizen"],
        ["research", "documents", "flow", "advisor"],
        ["identity", "foreign_document"], [DS_ID, DS_FOREIGN_DOC, DS_TRANSLATION],
        "receipt_code", "Verbale di asseverazione con timbro del Tribunale", "immediate",
        "receipt_verification", "Verifica verbale", None,
        "1-5 giorni lavorativi", 1, 5,
        explanation="Ti guidiamo nella preparazione della traduzione giurata. Il traduttore presta giuramento davanti al Tribunale per rendere la traduzione valida per uso ufficiale in Italia."
    ))

    entries.append(build_international(
        "APOSTILLE_DOCUMENTO", "Apostille su documento italiano",
        "Richiesta di apostille su documento italiano per uso all'estero (Convenzione dell'Aia).",
        "Procura della Repubblica / Prefettura", "Richiesta apostille", "Apposizione dell'apostille su documento italiano destinato a Paesi aderenti alla Convenzione dell'Aia",
        "Modulo richiesta apostille", None, None,
        ["private", "freelancer", "company", "eu_citizen"],
        ["research", "documents", "flow", "advisor"],
        ["identity"], [DS_ID, {"key": "document_to_apostille", "name": "Documento da apostillare", "why_needed": "Il documento italiano su cui apporre l'apostille", "format": "Originale", "mandatory": True}],
        "receipt_code", "Documento con apostille apposta", "delayed",
        "receipt_verification", "Verifica apostille", None,
        "5-15 giorni lavorativi", 5, 15,
        explanation="Ti aiutiamo a preparare la richiesta di apostille su un documento italiano per l'uso in Paesi aderenti alla Convenzione dell'Aia."
    ))

    entries.append(build_international(
        "LEGALIZZAZIONE_CONSOLARE", "Legalizzazione consolare",
        "Legalizzazione di documento estero presso il Consolato o l'Ambasciata per uso in Italia.",
        "Consolato / Ambasciata competente", "Legalizzazione documento", "Legalizzazione di documento estero non coperto da apostille per uso in Italia",
        "Richiesta legalizzazione", None, None,
        ["private", "non_eu_citizen"],
        ["research", "documents", "flow", "advisor"],
        ["identity", "foreign_document"], [DS_ID, DS_PASSPORT, DS_FOREIGN_DOC],
        "receipt_code", "Documento legalizzato dal Consolato", "delayed",
        "receipt_verification", "Verifica legalizzazione", None,
        "10-30 giorni lavorativi", 10, 30,
        risk_level="medium",
        explanation="Ti guidiamo nella preparazione della legalizzazione consolare per documenti esteri destinati all'uso in Italia."
    ))

    entries.append(build_international(
        "CF_STRANIERO", "Richiesta codice fiscale per stranieri",
        "Richiesta del codice fiscale italiano per cittadini stranieri.",
        "Agenzia delle Entrate", "Richiesta codice fiscale", "Attribuzione del codice fiscale a cittadini stranieri residenti o non residenti",
        "Modello AA4/8", "https://telematici.agenziaentrate.gov.it", "SPID",
        ["eu_citizen", "non_eu_citizen"],
        ["research", "documents", "flow"],
        ["identity"], [DS_PASSPORT, DS_ID],
        "protocol_number", "Tessera codice fiscale", "delayed",
        "portal_status", "Verifica su cassetto fiscale", "https://telematici.agenziaentrate.gov.it/Abilitazione/Cassetto.jsp",
        "5-15 giorni lavorativi", 5, 15,
        url_verified=True,
        explanation="Ti guidiamo nella richiesta del codice fiscale italiano, necessario per quasi tutte le operazioni fiscali e amministrative in Italia."
    ))

    entries.append(build_international(
        "RICONOSCIMENTO_TITOLO", "Riconoscimento titolo di studio estero",
        "Procedura per il riconoscimento di un titolo di studio conseguito all'estero.",
        "MIUR / Universita competente", "Riconoscimento titolo", "Richiesta di riconoscimento o equipollenza del titolo di studio estero in Italia",
        "Domanda di riconoscimento", None, None,
        ["private", "eu_citizen", "non_eu_citizen"],
        ["intake", "research", "documents", "compliance", "flow", "advisor"],
        ["identity", "foreign_document"], [DS_PASSPORT, DS_DEGREE, DS_TRANSLATION,
            {"key": "diploma_supplement", "name": "Supplemento al diploma / programma studi", "why_needed": "Per la valutazione dell'equivalenza del titolo", "format": "Originale con apostille + traduzione", "mandatory": True}],
        "protocol_number", "Decreto di riconoscimento", "delayed",
        "portal_status", "Verifica stato pratica", None,
        "60-180 giorni lavorativi", 60, 180,
        risk_level="high", user_signs=True,
        blocking=["apostille mancante sul titolo originale", "traduzione giurata mancante"],
        explanation="Ti accompagniamo nella procedura di riconoscimento del titolo di studio estero, raccogliendo e verificando tutta la documentazione necessaria."
    ))

    entries.append(build_international(
        "RICONOSCIMENTO_PROFESSIONALE", "Riconoscimento qualifica professionale estera",
        "Procedura per il riconoscimento di una qualifica professionale conseguita all'estero.",
        "Ministero competente / Ordine professionale", "Riconoscimento qualifica", "Richiesta di riconoscimento della qualifica professionale estera in Italia",
        "Domanda di riconoscimento", None, None,
        ["private", "eu_citizen", "non_eu_citizen"],
        ["intake", "research", "documents", "compliance", "flow", "advisor"],
        ["identity", "foreign_document"], [DS_PASSPORT, DS_DEGREE, DS_TRANSLATION,
            {"key": "professional_cert", "name": "Certificato di abilitazione professionale", "why_needed": "Per dimostrare l'abilitazione nel Paese di origine", "format": "Originale con apostille + traduzione", "mandatory": True}],
        "protocol_number", "Decreto di riconoscimento professionale", "delayed",
        "portal_status", "Verifica stato pratica", None,
        "90-365 giorni lavorativi", 90, 365,
        risk_level="high", user_signs=True,
        blocking=["documentazione professionale incompleta", "traduzione giurata mancante"],
        explanation="Ti guidiamo nella procedura di riconoscimento della qualifica professionale estera in Italia."
    ))

    entries.append(build_international(
        "PERMESSO_SOGGIORNO_SUPPORT", "Supporto preparazione permesso di soggiorno",
        "Supporto alla raccolta documentale per la richiesta o il rinnovo del permesso di soggiorno.",
        "Questura / Sportello Unico Immigrazione", "Preparazione documentale", "Raccolta e verifica della documentazione per la richiesta o il rinnovo del permesso di soggiorno",
        "Kit postale / Portale Questura", None, None,
        ["non_eu_citizen"],
        ["intake", "research", "documents", "compliance", "flow", "advisor"],
        ["identity"], [DS_PASSPORT, DS_PERMIT,
            {"key": "housing_docs", "name": "Documentazione alloggiativa", "why_needed": "Certificato di idoneita alloggiativa o contratto di affitto registrato", "format": "PDF", "mandatory": True},
            {"key": "income_docs", "name": "Documentazione reddituale", "why_needed": "Per dimostrare la capacita economica richiesta", "format": "PDF (busta paga, CU, dichiarazione)", "mandatory": True}],
        "receipt_code", "Ricevuta presentazione istanza", "delayed",
        "portal_status", "Verifica stato pratica", None,
        "30-90 giorni lavorativi", 30, 90,
        risk_level="high",
        blocking=["documentazione alloggiativa mancante", "documentazione reddituale insufficiente"],
        explanation="Ti aiutiamo a raccogliere e verificare tutta la documentazione necessaria per la richiesta o il rinnovo del permesso di soggiorno. Herion non sostituisce il consulente legale per le questioni immigratorie."
    ))

    entries.append(build_international(
        "DICHIARAZIONE_PRESENZA", "Dichiarazione di presenza per cittadini UE",
        "Dichiarazione di presenza per soggiorni superiori a 3 mesi per cittadini dell'Unione Europea.",
        "Comune di residenza", "Dichiarazione di presenza", "Iscrizione anagrafica e dichiarazione di presenza per cittadini UE con soggiorno superiore a 3 mesi",
        "Modulo comunale", None, None,
        ["eu_citizen"],
        ["research", "documents", "flow"],
        ["identity"], [DS_PASSPORT, DS_ID,
            {"key": "eu_docs", "name": "Documentazione di copertura sanitaria e reddito", "why_needed": "Per dimostrare autosufficienza economica e copertura sanitaria", "format": "PDF", "mandatory": True}],
        "protocol_number", "Attestato di iscrizione anagrafica", "delayed",
        "portal_status", "Verifica su anagrafe comunale", None,
        "5-30 giorni lavorativi", 5, 30,
        explanation="Ti guidiamo nella dichiarazione di presenza e nell'iscrizione anagrafica per cittadini UE che soggiornano in Italia per piu di 3 mesi."
    ))

    # ── INTERNAL INTERNATIONAL SUPPORT ──

    entries.append(build_internal_intl(
        "INFO_APOSTILLE_VS_LEGALIZZAZIONE",
        "Orientamento: apostille o legalizzazione?",
        "Guida per capire se serve l'apostille o la legalizzazione consolare per il tuo documento.",
        ["research", "advisor"],
        explanation="Ti aiutiamo a capire quale percorso di validazione serve per il tuo documento: apostille (Convenzione dell'Aia) o legalizzazione consolare (Paesi non aderenti). La scelta dipende dal Paese di origine e dalla destinazione."
    ))

    entries.append(build_internal_intl(
        "INFO_TRADUZIONE_TIPI",
        "Orientamento: traduzione giurata, certificata o semplice?",
        "Guida per capire quale tipo di traduzione serve per il tuo caso specifico.",
        ["research", "advisor"],
        explanation="Ti spieghiamo le differenze tra traduzione giurata (asseverata in Tribunale), traduzione certificata e traduzione semplice. Il tipo necessario dipende dall'ente destinatario e dall'uso previsto del documento."
    ))

    entries.append(build_internal_intl(
        "INFO_DOCUMENTI_ESTERI_ITALIA",
        "Guida documenti esteri per uso in Italia",
        "Panoramica sui requisiti per utilizzare documenti esteri in Italia.",
        ["research", "advisor"],
        explanation="Panoramica sui passaggi che possono essere necessari per utilizzare un documento estero in Italia: traduzione, asseverazione, apostille o legalizzazione. I requisiti variano in base all'ente destinatario."
    ))

    entries.append(build_internal_intl(
        "INFO_DOCUMENTI_ITALIANI_ESTERO",
        "Guida documenti italiani per uso all'estero",
        "Panoramica sui requisiti per utilizzare documenti italiani all'estero.",
        ["research", "advisor"],
        explanation="Panoramica sui passaggi per utilizzare un documento italiano all'estero: apostille, legalizzazione consolare, traduzione. I requisiti dipendono dal Paese di destinazione."
    ))

    entries.append(build_internal_intl(
        "INFO_FISCALITA_STRANIERI",
        "Orientamento fiscalita per stranieri in Italia",
        "Guida alle principali questioni fiscali per cittadini stranieri residenti in Italia.",
        ["research", "advisor"],
        explanation="Orientamento sugli obblighi fiscali per stranieri in Italia: residenza fiscale, codice fiscale, dichiarazione redditi, convenzioni contro la doppia imposizione."
    ))

    return entries


# ── INTERNATIONAL INTELLIGENCE LOGIC ──

EXTENDED_USER_TYPES = {
    "private": {"label": "Privato", "description": "Persona fisica residente in Italia", "is_international": False},
    "freelancer": {"label": "Libero professionista", "description": "Titolare di P.IVA in Italia", "is_international": False},
    "company": {"label": "Azienda", "description": "Societa o impresa in Italia", "is_international": False},
    "eu_citizen": {"label": "Cittadino UE", "description": "Cittadino dell'Unione Europea", "is_international": True},
    "non_eu_citizen": {"label": "Cittadino extra-UE", "description": "Cittadino di Paese non UE", "is_international": True},
}

DOCUMENT_INTENDED_USES = {
    "public_administration": "Pubblica Amministrazione",
    "tribunal": "Tribunale / Ufficio giudiziario",
    "educational_recognition": "Riconoscimento titolo di studio",
    "professional_recognition": "Riconoscimento qualifica professionale",
    "immigration": "Immigrazione / Soggiorno",
    "business_use": "Uso aziendale / commerciale",
    "personal_use": "Uso personale",
}


def get_international_guidance(practice_id, client_type, doc_origin=None, doc_destination=None, intended_use=None):
    """Build international guidance block for pre-start intelligence."""
    user_info = EXTENDED_USER_TYPES.get(client_type, EXTENDED_USER_TYPES["private"])
    is_international_user = user_info.get("is_international", False)

    # Check if procedure is inherently international
    intl_keywords = ["traduzione", "apostille", "legalizzazione", "straniero", "estero", "riconoscimento", "permesso", "presenza", "fiscalita_stranieri", "documenti_esteri", "documenti_italiani"]
    is_intl_procedure = any(kw in practice_id.lower() for kw in intl_keywords)

    # If neither user nor procedure is international, skip
    if not is_international_user and not is_intl_procedure:
        return {"relevant": False}

    guidance = {
        "relevant": True,
        "user_type_label": user_info["label"],
        "is_international_user": is_international_user,
        "is_international_procedure": is_intl_procedure,
    }

    # Translation guidance
    translation_guidance = None
    if is_intl_procedure or is_international_user:
        translation_guidance = {
            "may_need_sworn_translation": is_intl_procedure or intended_use in ("public_administration", "tribunal", "educational_recognition", "professional_recognition"),
            "sworn_translation_label": "Traduzione giurata (asseverata)",
            "sworn_translation_desc": "La traduzione giurata prevede il giuramento del traduttore davanti al Tribunale. E generalmente richiesta per documenti destinati a enti pubblici, tribunali e procedure di riconoscimento.",
            "may_need_certified_translation": intended_use in ("business_use", "personal_use"),
            "certified_translation_label": "Traduzione certificata",
            "certified_translation_desc": "La traduzione certificata e firmata dal traduttore con dichiarazione di fedelta. Puo essere sufficiente per usi non ufficiali.",
            "note": "Il tipo di traduzione necessario dipende dall'ente destinatario. Herion ti orienta, ma la conferma finale spetta all'ente.",
        }

    # Apostille / legalization guidance
    validation_guidance = None
    if is_intl_procedure or is_international_user:
        validation_guidance = {
            "may_need_apostille": True,
            "apostille_label": "Apostille (Convenzione dell'Aia)",
            "apostille_desc": "L'apostille e un timbro di validazione internazionale per documenti destinati a Paesi aderenti alla Convenzione dell'Aia. Viene apposta dalla Procura della Repubblica o dalla Prefettura.",
            "may_need_legalization": client_type == "non_eu_citizen",
            "legalization_label": "Legalizzazione consolare",
            "legalization_desc": "Per documenti provenienti da Paesi non aderenti alla Convenzione dell'Aia, potrebbe essere necessaria la legalizzazione consolare tramite il Consolato o l'Ambasciata competente.",
            "note": "La necessita di apostille o legalizzazione dipende dal Paese di origine del documento e dal Paese di destinazione. Herion ti aiuta a capire il percorso probabile.",
        }

    # Additional requirements for international users
    additional_requirements = []
    if client_type == "non_eu_citizen":
        additional_requirements.append({"label": "Permesso di soggiorno valido o ricevuta di rinnovo", "type": "document", "mandatory": True})
        additional_requirements.append({"label": "Codice fiscale italiano", "type": "precondition", "mandatory": True})
    elif client_type == "eu_citizen":
        additional_requirements.append({"label": "Codice fiscale italiano", "type": "precondition", "mandatory": True})
        additional_requirements.append({"label": "Attestato di iscrizione anagrafica (se soggiorno > 3 mesi)", "type": "document", "mandatory": False})

    guidance["translation"] = translation_guidance
    guidance["validation"] = validation_guidance
    guidance["additional_requirements"] = additional_requirements
    guidance["safety_note"] = "Herion ti orienta sui requisiti probabili, ma l'accettazione finale dei documenti dipende sempre dall'ente destinatario. Ti consigliamo di verificare i requisiti specifici con l'ente prima di procedere."

    return guidance
