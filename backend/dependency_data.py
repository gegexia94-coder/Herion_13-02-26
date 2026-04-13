"""
Herion Dependency & Risk Intelligence Layer
Maps linked obligations, omission risks, and completion integrity for procedures.
"""


def get_dependency_map():
    """Return the full dependency map for all procedures with meaningful links."""
    return {

        # ══════════════════════════════════════
        # COMPANY LIFECYCLE
        # ══════════════════════════════════════

        "COMPANY_FORMATION_SRL": {
            "linked_obligations": [
                {"procedure_code": "VAT_OPEN_SOCIETA", "label": "Apertura P.IVA societa", "type": "mandatory", "why_linked": "La P.IVA e obbligatoria per operare come societa", "when_needed": "during"},
                {"procedure_code": "PEC_OBBLIGATORIA", "label": "Comunicazione PEC obbligatoria", "type": "mandatory", "why_linked": "La PEC e obbligatoria per tutte le societa iscritte", "when_needed": "during"},
                {"procedure_code": "VIDIMAZIONE_LIBRI", "label": "Vidimazione libri sociali", "type": "mandatory", "why_linked": "I libri sociali vanno vidimati dopo la costituzione", "when_needed": "after"},
                {"procedure_code": "SUAP_SCIA", "label": "SCIA per inizio attivita", "type": "conditional", "why_linked": "Necessaria se l'attivita prevede apertura al pubblico o specifici requisiti", "when_needed": "after"},
                {"procedure_code": "INPS_GESTIONE_SEP", "label": "Iscrizione INPS amministratore", "type": "conditional", "why_linked": "Se l'amministratore non ha altra copertura previdenziale", "when_needed": "after"},
            ],
            "risk_if_omitted": [
                {"code": "missing_vat", "label": "Societa senza P.IVA", "severity": "high", "description": "Senza apertura della P.IVA la societa non puo operare ne emettere fatture."},
                {"code": "missing_pec", "label": "PEC non comunicata", "severity": "high", "description": "La mancata comunicazione della PEC comporta sanzioni amministrative."},
                {"code": "missing_books", "label": "Libri sociali non vidimati", "severity": "medium", "description": "L'assenza di vidimazione puo invalidare le delibere assembleari."},
            ],
            "completion_integrity": {
                "is_complete_only_if": ["P.IVA aperta", "PEC comunicata al Registro Imprese", "Libri sociali vidimati", "Eventuale SCIA presentata se richiesta"],
                "common_missing_steps": ["Vidimazione libri sociali", "Iscrizione INPS dell'amministratore"],
            },
        },

        "COMPANY_CLOSURE": {
            "linked_obligations": [
                {"procedure_code": "VAT_CLOSURE_PF", "label": "Chiusura Partita IVA", "type": "mandatory", "why_linked": "La P.IVA deve essere chiusa contestualmente alla chiusura societaria", "when_needed": "during"},
                {"procedure_code": "DEPOSITO_BILANCIO", "label": "Deposito bilancio finale di liquidazione", "type": "mandatory", "why_linked": "Il bilancio finale va depositato per completare la cancellazione", "when_needed": "during"},
                {"procedure_code": "MOD_770", "label": "Dichiarazione 770 finale", "type": "mandatory", "why_linked": "Le ritenute dell'ultimo periodo vanno dichiarate", "when_needed": "after"},
                {"procedure_code": "CU_CERTIFICATION", "label": "Certificazione Unica finale", "type": "conditional", "why_linked": "Se ci sono stati compensi o rapporti nell'ultimo anno", "when_needed": "after"},
                {"procedure_code": "INAIL_AUTOLIQ", "label": "Autoliquidazione INAIL finale", "type": "conditional", "why_linked": "Se la societa aveva dipendenti, serve la chiusura INAIL", "when_needed": "after"},
            ],
            "risk_if_omitted": [
                {"code": "vat_still_open", "label": "P.IVA non chiusa", "severity": "high", "description": "Una P.IVA rimasta aperta genera obblighi dichiarativi e potenziali sanzioni anche dopo la chiusura societaria."},
                {"code": "missing_final_filing", "label": "Dichiarazioni finali mancanti", "severity": "high", "description": "L'omissione delle dichiarazioni finali (770, CU, IVA) puo generare accertamenti e sanzioni."},
                {"code": "incomplete_liquidation", "label": "Liquidazione incompleta", "severity": "high", "description": "Senza il bilancio finale la cancellazione dal Registro non e perfezionata."},
            ],
            "completion_integrity": {
                "is_complete_only_if": ["P.IVA chiusa", "Bilancio finale depositato", "Dichiarazioni fiscali finali presentate", "Posizioni INPS e INAIL chiuse"],
                "common_missing_steps": ["Chiusura P.IVA", "Modello 770 finale", "Autoliquidazione INAIL finale"],
            },
        },

        "SCIOGLIMENTO_SOCIETA": {
            "linked_obligations": [
                {"procedure_code": "COMPANY_CLOSURE", "label": "Chiusura societaria post-liquidazione", "type": "mandatory", "why_linked": "Lo scioglimento avvia la liquidazione; la chiusura la completa", "when_needed": "after"},
                {"procedure_code": "DEPOSITO_BILANCIO", "label": "Bilancio iniziale di liquidazione", "type": "mandatory", "why_linked": "Va depositato il bilancio alla data di scioglimento", "when_needed": "during"},
                {"procedure_code": "NOMINA_AMMINISTRATORE", "label": "Nomina liquidatore", "type": "mandatory", "why_linked": "Il liquidatore deve essere nominato e comunicato al Registro", "when_needed": "during"},
            ],
            "risk_if_omitted": [
                {"code": "no_liquidator", "label": "Liquidatore non nominato", "severity": "high", "description": "Senza liquidatore la procedura di scioglimento non puo procedere."},
                {"code": "missing_balance", "label": "Bilancio di liquidazione mancante", "severity": "high", "description": "Il Registro Imprese richiede il bilancio per completare la procedura."},
            ],
            "completion_integrity": {
                "is_complete_only_if": ["Liquidatore nominato e comunicato", "Bilancio iniziale di liquidazione depositato", "Procedura di chiusura avviata"],
                "common_missing_steps": ["Nomina liquidatore", "Deposito bilancio iniziale di liquidazione"],
            },
        },

        # ══════════════════════════════════════
        # VAT LIFECYCLE
        # ══════════════════════════════════════

        "VAT_OPEN_PF": {
            "linked_obligations": [
                {"procedure_code": "INPS_GESTIONE_SEP", "label": "Iscrizione Gestione Separata INPS", "type": "conditional", "why_linked": "Obbligatoria per liberi professionisti senza altra cassa previdenziale", "when_needed": "after"},
                {"procedure_code": "INPS_ARTIGIANI", "label": "Iscrizione Gestione Artigiani INPS", "type": "conditional", "why_linked": "Obbligatoria se l'attivita rientra nel settore artigianale", "when_needed": "after"},
                {"procedure_code": "INPS_COMMERCIANTI", "label": "Iscrizione Gestione Commercianti INPS", "type": "conditional", "why_linked": "Obbligatoria se l'attivita rientra nel settore commerciale", "when_needed": "after"},
                {"procedure_code": "SUAP_SCIA", "label": "SCIA per inizio attivita", "type": "conditional", "why_linked": "Necessaria per alcune attivita che richiedono autorizzazione", "when_needed": "after"},
                {"procedure_code": "EINVOICING", "label": "Attivazione fatturazione elettronica", "type": "recommended", "why_linked": "La fatturazione elettronica e obbligatoria per quasi tutti i titolari di P.IVA", "when_needed": "after"},
            ],
            "risk_if_omitted": [
                {"code": "missing_inps", "label": "Mancata iscrizione INPS", "severity": "high", "description": "L'omessa iscrizione alla gestione previdenziale competente genera sanzioni e contributi arretrati con interessi."},
                {"code": "missing_einvoice", "label": "Fatturazione elettronica non attiva", "severity": "medium", "description": "L'obbligo di fatturazione elettronica, se non rispettato, comporta sanzioni per ogni fattura non conforme."},
            ],
            "completion_integrity": {
                "is_complete_only_if": ["P.IVA aperta", "Iscrizione INPS alla gestione corretta", "Fatturazione elettronica attivata"],
                "common_missing_steps": ["Iscrizione alla gestione INPS competente", "Attivazione fatturazione elettronica"],
            },
        },

        "VAT_CLOSURE_PF": {
            "linked_obligations": [
                {"procedure_code": "VAT_DECLARATION", "label": "Dichiarazione IVA finale", "type": "mandatory", "why_linked": "La dichiarazione IVA dell'ultimo periodo deve essere presentata", "when_needed": "after"},
                {"procedure_code": "INCOME_TAX_PF", "label": "Dichiarazione redditi finale", "type": "mandatory", "why_linked": "I redditi dell'ultimo periodo di attivita vanno dichiarati", "when_needed": "after"},
                {"procedure_code": "LIPE_QUARTERLY", "label": "Ultima LIPE", "type": "mandatory", "why_linked": "La comunicazione delle liquidazioni IVA dell'ultimo trimestre", "when_needed": "after"},
            ],
            "risk_if_omitted": [
                {"code": "missing_final_vat", "label": "Dichiarazione IVA finale mancante", "severity": "high", "description": "L'omissione della dichiarazione IVA dell'ultimo periodo genera accertamento e sanzioni."},
                {"code": "missing_final_income", "label": "Redditi finali non dichiarati", "severity": "high", "description": "I redditi dell'attivita cessata devono comunque essere dichiarati."},
            ],
            "completion_integrity": {
                "is_complete_only_if": ["P.IVA cessata", "Dichiarazione IVA finale presentata", "Dichiarazione redditi finale presentata", "LIPE ultimo trimestre inviata"],
                "common_missing_steps": ["Dichiarazione IVA finale", "Dichiarazione redditi dell'ultimo periodo"],
            },
        },

        # ══════════════════════════════════════
        # ANNUAL FISCAL CYCLE
        # ══════════════════════════════════════

        "VAT_DECLARATION": {
            "linked_obligations": [
                {"procedure_code": "LIPE_QUARTERLY", "label": "Comunicazioni LIPE trimestrali", "type": "mandatory", "why_linked": "Le LIPE devono essere state inviate per ogni trimestre dell'anno", "when_needed": "before"},
                {"procedure_code": "F24_PREPARATION", "label": "Versamento saldo IVA tramite F24", "type": "mandatory", "why_linked": "Il saldo IVA risultante dalla dichiarazione va versato con F24", "when_needed": "after"},
            ],
            "risk_if_omitted": [
                {"code": "missing_lipe", "label": "LIPE trimestrali mancanti", "severity": "high", "description": "L'omissione delle LIPE genera sanzioni da 500 a 2.000 euro per ogni comunicazione mancante."},
                {"code": "late_vat_payment", "label": "Saldo IVA non versato", "severity": "high", "description": "Il mancato versamento del saldo IVA genera sanzioni e interessi di mora."},
            ],
            "completion_integrity": {
                "is_complete_only_if": ["Tutte le LIPE trimestrali inviate", "Dichiarazione IVA trasmessa", "Saldo IVA versato con F24"],
                "common_missing_steps": ["Versamento saldo IVA con F24"],
            },
        },

        "INCOME_TAX_PF": {
            "linked_obligations": [
                {"procedure_code": "F24_PREPARATION", "label": "Versamento imposte tramite F24", "type": "mandatory", "why_linked": "Saldo e primo acconto IRPEF vanno versati contestualmente", "when_needed": "after"},
                {"procedure_code": "ISA_AFFIDABILITA", "label": "Indici ISA", "type": "conditional", "why_linked": "I contribuenti soggetti a ISA devono allegare i dati alla dichiarazione", "when_needed": "during"},
            ],
            "risk_if_omitted": [
                {"code": "late_tax_payment", "label": "Imposte non versate", "severity": "high", "description": "Il mancato versamento delle imposte genera sanzioni dal 15% al 30% oltre interessi."},
            ],
            "completion_integrity": {
                "is_complete_only_if": ["Dichiarazione trasmessa", "Imposte (saldo + acconto) versate con F24", "ISA compilati se applicabili"],
                "common_missing_steps": ["Versamento F24 saldo e primo acconto"],
            },
        },

        "MOD_770": {
            "linked_obligations": [
                {"procedure_code": "CU_CERTIFICATION", "label": "Certificazioni Uniche", "type": "mandatory", "why_linked": "Le CU devono essere state inviate prima del 770 — i dati devono coincidere", "when_needed": "before"},
                {"procedure_code": "F24_PREPARATION", "label": "Versamento ritenute tramite F24", "type": "mandatory", "why_linked": "Le ritenute operate devono essere state versate mensilmente", "when_needed": "before"},
            ],
            "risk_if_omitted": [
                {"code": "cu_770_mismatch", "label": "Incoerenza CU / 770", "severity": "high", "description": "Se i dati del 770 non coincidono con le CU inviate si generano controlli e sanzioni."},
                {"code": "unpaid_withholdings", "label": "Ritenute non versate", "severity": "high", "description": "L'omesso versamento delle ritenute e un reato penale oltre soglie specifiche."},
            ],
            "completion_integrity": {
                "is_complete_only_if": ["Tutte le CU inviate", "Ritenute versate con F24", "Modello 770 trasmesso"],
                "common_missing_steps": ["Verifica coerenza dati CU-770"],
            },
        },

        # ══════════════════════════════════════
        # EMPLOYMENT LIFECYCLE
        # ══════════════════════════════════════

        "ASSUNZIONE_DIP": {
            "linked_obligations": [
                {"procedure_code": "BUSTA_PAGA", "label": "Elaborazione prima busta paga", "type": "mandatory", "why_linked": "Il cedolino va elaborato dal primo mese di assunzione", "when_needed": "after"},
                {"procedure_code": "INPS_UNIEMENS", "label": "Denuncia UniEmens", "type": "mandatory", "why_linked": "I contributi del nuovo dipendente vanno comunicati mensilmente", "when_needed": "after"},
                {"procedure_code": "LIBRO_UNICO", "label": "Aggiornamento Libro Unico del Lavoro", "type": "mandatory", "why_linked": "Il LUL deve essere aggiornato con il nuovo rapporto di lavoro", "when_needed": "after"},
            ],
            "risk_if_omitted": [
                {"code": "late_communication", "label": "Comunicazione tardiva", "severity": "high", "description": "La comunicazione obbligatoria va inviata entro il giorno precedente l'assunzione. Il ritardo genera sanzioni da 100 a 500 euro."},
                {"code": "missing_lul", "label": "LUL non aggiornato", "severity": "medium", "description": "L'assenza del dipendente nel LUL configura lavoro irregolare."},
            ],
            "completion_integrity": {
                "is_complete_only_if": ["Comunicazione obbligatoria inviata", "Dipendente registrato nel LUL", "Prima busta paga elaborata", "UniEmens del mese inviata"],
                "common_missing_steps": ["Aggiornamento LUL", "Prima denuncia UniEmens"],
            },
        },

        "CESSAZIONE_DIP": {
            "linked_obligations": [
                {"procedure_code": "BUSTA_PAGA", "label": "Ultimo cedolino con TFR", "type": "mandatory", "why_linked": "L'ultimo cedolino deve includere il calcolo e la liquidazione del TFR", "when_needed": "during"},
                {"procedure_code": "CU_DIPENDENTI", "label": "Certificazione Unica", "type": "mandatory", "why_linked": "La CU del dipendente cessato va emessa entro i termini", "when_needed": "after"},
                {"procedure_code": "INPS_UNIEMENS", "label": "UniEmens cessazione", "type": "mandatory", "why_linked": "La cessazione va comunicata anche tramite flusso UniEmens", "when_needed": "after"},
            ],
            "risk_if_omitted": [
                {"code": "late_cessation", "label": "Comunicazione cessazione tardiva", "severity": "high", "description": "La comunicazione va inviata entro 5 giorni dalla cessazione. Il ritardo genera sanzioni."},
                {"code": "missing_tfr", "label": "TFR non liquidato", "severity": "high", "description": "La mancata liquidazione del TFR espone l'azienda a rivendicazioni e sanzioni."},
            ],
            "completion_integrity": {
                "is_complete_only_if": ["Comunicazione cessazione inviata", "Ultimo cedolino con TFR elaborato", "CU emessa", "UniEmens aggiornata"],
                "common_missing_steps": ["Liquidazione TFR nell'ultimo cedolino", "CU del dipendente cessato"],
            },
        },

        # ══════════════════════════════════════
        # PROPERTY / REAL ESTATE
        # ══════════════════════════════════════

        "CONTRATTO_LOCAZIONE": {
            "linked_obligations": [
                {"procedure_code": "CEDOLARE_SECCA", "label": "Opzione cedolare secca", "type": "recommended", "why_linked": "Se applicabile, l'opzione va esercitata contestualmente alla registrazione", "when_needed": "during"},
                {"procedure_code": "IMPOSTA_REGISTRO", "label": "Imposta di registro", "type": "conditional", "why_linked": "Se non si opta per la cedolare secca, l'imposta di registro e dovuta", "when_needed": "during"},
                {"procedure_code": "IMU_TASI", "label": "Verifica IMU", "type": "recommended", "why_linked": "La destinazione dell'immobile puo influenzare il calcolo IMU", "when_needed": "after"},
            ],
            "risk_if_omitted": [
                {"code": "late_registration", "label": "Registrazione tardiva", "severity": "high", "description": "La registrazione va effettuata entro 30 giorni dalla stipula. Il ritardo genera sanzioni."},
                {"code": "missed_cedolare", "label": "Opzione cedolare non esercitata", "severity": "medium", "description": "L'opzione non puo essere recuperata retroattivamente se non esercitata nei termini."},
            ],
            "completion_integrity": {
                "is_complete_only_if": ["Contratto registrato entro 30 giorni", "Opzione cedolare o imposta di registro pagata"],
                "common_missing_steps": ["Valutazione cedolare secca vs regime ordinario"],
            },
        },

        # ══════════════════════════════════════
        # TRANSFORMATION / RESTRUCTURING
        # ══════════════════════════════════════

        "TRASFORMAZIONE_SOCIETARIA": {
            "linked_obligations": [
                {"procedure_code": "ATECO_VARIATION", "label": "Verifica/variazione ATECO", "type": "conditional", "why_linked": "La trasformazione potrebbe richiedere aggiornamento del codice ATECO", "when_needed": "after"},
                {"procedure_code": "COMPANY_VARIATION", "label": "Aggiornamento dati Camera di Commercio", "type": "mandatory", "why_linked": "I dati al Registro Imprese devono riflettere la nuova forma giuridica", "when_needed": "during"},
                {"procedure_code": "VAT_VARIATION_PF", "label": "Variazione dati P.IVA", "type": "mandatory", "why_linked": "La P.IVA deve essere aggiornata con la nuova forma societaria", "when_needed": "during"},
            ],
            "risk_if_omitted": [
                {"code": "registry_mismatch", "label": "Dati Registro non aggiornati", "severity": "high", "description": "L'incoerenza tra forma giuridica e dati al Registro genera irregolarita amministrative."},
                {"code": "vat_mismatch", "label": "P.IVA non aggiornata", "severity": "high", "description": "La P.IVA deve corrispondere alla nuova forma giuridica per evitare problemi con fatturazione e dichiarazioni."},
            ],
            "completion_integrity": {
                "is_complete_only_if": ["Atto di trasformazione depositato", "Dati Registro Imprese aggiornati", "P.IVA variata", "ATECO verificato"],
                "common_missing_steps": ["Variazione P.IVA", "Aggiornamento ATECO se cambia attivita"],
            },
        },

        "FUSIONE_SOCIETARIA": {
            "linked_obligations": [
                {"procedure_code": "DEPOSITO_BILANCIO", "label": "Bilancio di fusione", "type": "mandatory", "why_linked": "Il bilancio delle societa coinvolte deve essere depositato", "when_needed": "during"},
                {"procedure_code": "COMPANY_VARIATION", "label": "Aggiornamento Registro Imprese", "type": "mandatory", "why_linked": "Le iscrizioni devono riflettere l'esito della fusione", "when_needed": "after"},
                {"procedure_code": "VAT_CLOSURE_PF", "label": "Chiusura P.IVA societa incorporata", "type": "conditional", "why_linked": "Se la societa incorporata cessa, la P.IVA va chiusa", "when_needed": "after"},
            ],
            "risk_if_omitted": [
                {"code": "creditor_opposition", "label": "Opposizione creditori non gestita", "severity": "high", "description": "I creditori hanno 60 giorni per opporsi. L'iter deve rispettare questa tempistica."},
                {"code": "incomplete_registry", "label": "Registro Imprese non aggiornato", "severity": "high", "description": "Le iscrizioni incomplete generano irregolarita opponibili ai terzi."},
            ],
            "completion_integrity": {
                "is_complete_only_if": ["Progetto di fusione depositato", "Termine opposizione creditori decorso", "Atto di fusione depositato", "Iscrizioni aggiornate", "P.IVA societa cessata chiusa"],
                "common_missing_steps": ["Chiusura P.IVA societa incorporata", "Aggiornamento iscrizioni al Registro"],
            },
        },

        "CESSIONE_QUOTE": {
            "linked_obligations": [
                {"procedure_code": "IMPOSTA_REGISTRO", "label": "Imposta di registro sulla cessione", "type": "mandatory", "why_linked": "L'atto di cessione e soggetto a imposta di registro", "when_needed": "during"},
                {"procedure_code": "COMPANY_VARIATION", "label": "Aggiornamento compagine sociale", "type": "mandatory", "why_linked": "La nuova compagine deve essere comunicata al Registro Imprese", "when_needed": "after"},
            ],
            "risk_if_omitted": [
                {"code": "missing_registration_tax", "label": "Imposta di registro non versata", "severity": "high", "description": "L'omesso versamento dell'imposta di registro sulla cessione genera sanzioni."},
            ],
            "completion_integrity": {
                "is_complete_only_if": ["Atto di cessione depositato", "Imposta di registro versata", "Compagine sociale aggiornata al Registro"],
                "common_missing_steps": ["Versamento imposta di registro"],
            },
        },

        # ══════════════════════════════════════
        # SOCIAL SECURITY
        # ══════════════════════════════════════

        "INPS_GESTIONE_SEP": {
            "linked_obligations": [
                {"procedure_code": "INPS_F24_CONTRIB", "label": "Versamento contributi con F24", "type": "mandatory", "why_linked": "I contributi vanno versati alle scadenze previste dopo l'iscrizione", "when_needed": "after"},
                {"procedure_code": "INCOME_TAX_PF", "label": "Dichiarazione redditi con quadro RR", "type": "mandatory", "why_linked": "I contributi alla Gestione Separata si calcolano nella dichiarazione redditi", "when_needed": "after"},
            ],
            "risk_if_omitted": [
                {"code": "missing_contributions", "label": "Contributi non versati", "severity": "high", "description": "Il mancato versamento dei contributi genera sanzioni e interessi, e pregiudica la posizione previdenziale."},
            ],
            "completion_integrity": {
                "is_complete_only_if": ["Iscrizione effettuata", "Contributi versati alle scadenze", "Quadro RR compilato in dichiarazione"],
                "common_missing_steps": ["Primo versamento contributi con F24"],
            },
        },

        # ══════════════════════════════════════
        # SUCCESSION / INHERITANCE
        # ══════════════════════════════════════

        "DICHIARAZIONE_SUCCESSIONE": {
            "linked_obligations": [
                {"procedure_code": "IMU_TASI", "label": "Aggiornamento IMU immobili ereditati", "type": "mandatory", "why_linked": "Gli eredi devono versare l'IMU sugli immobili ricevuti dalla data del decesso", "when_needed": "after"},
                {"procedure_code": "IMPOSTA_REGISTRO", "label": "Imposta ipotecaria e catastale", "type": "mandatory", "why_linked": "Le imposte ipotecaria e catastale sono dovute in sede di successione", "when_needed": "during"},
            ],
            "risk_if_omitted": [
                {"code": "late_succession", "label": "Dichiarazione tardiva", "severity": "high", "description": "La dichiarazione va presentata entro 12 mesi dal decesso. Il ritardo genera sanzioni dal 120% al 240% dell'imposta dovuta."},
                {"code": "missing_imu_heirs", "label": "IMU non versata dagli eredi", "severity": "medium", "description": "Gli eredi sono tenuti al versamento IMU dalla data del decesso."},
            ],
            "completion_integrity": {
                "is_complete_only_if": ["Dichiarazione di successione presentata", "Imposte ipotecarie e catastali versate", "IMU aggiornata per immobili ereditati"],
                "common_missing_steps": ["Aggiornamento IMU sugli immobili ereditati"],
            },
        },
    }
