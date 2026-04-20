const translations = {
  // ─── LANGUAGE SWITCHER ───
  lang_label: { it: 'IT', en: 'EN' },

  // ─── REGISTER — STEP NAMES ───
  reg_title: { it: 'Crea il tuo account', en: 'Create your account' },
  reg_subtitle: { it: 'Il tuo commercialista digitale ti aspetta', en: 'Your digital accountant is waiting for you' },
  reg_step1_name: { it: 'Dati personali', en: 'Personal info' },
  reg_step2_name: { it: 'Profilo fiscale', en: 'Fiscal profile' },
  reg_step3_name: { it: 'Sicurezza', en: 'Security' },
  reg_step1_msg: { it: 'Iniziamo — pochi dati essenziali', en: "Let's start — just the essentials" },
  reg_step2_msg: { it: 'Sei a meta strada per semplificare le tue tasse!', en: "You're halfway to simplifying your taxes!" },
  reg_step3_msg: { it: 'Ultimo passaggio — proteggi il tuo account', en: 'Last step — secure your account' },

  // ─── REGISTER — STEP 1 FIELDS ───
  reg_first_name: { it: 'Nome', en: 'First name' },
  reg_last_name: { it: 'Cognome', en: 'Last name' },
  reg_email: { it: 'Email', en: 'Email' },
  reg_phone: { it: 'Telefono', en: 'Phone' },
  reg_dob: { it: 'Data di nascita', en: 'Date of birth' },
  reg_ph_first_name: { it: 'Mario', en: 'John' },
  reg_ph_last_name: { it: 'Rossi', en: 'Smith' },
  reg_ph_email: { it: 'mario.rossi@esempio.it', en: 'john.smith@example.com' },
  reg_ph_phone: { it: '+39 333 1234567', en: '+39 333 1234567' },

  // ─── REGISTER — STEP 2 FIELDS ───
  reg_section_residence: { it: 'Residenza', en: 'Residence' },
  reg_country: { it: 'Paese', en: 'Country' },
  reg_city: { it: 'Citta', en: 'City' },
  reg_address: { it: 'Indirizzo', en: 'Address' },
  reg_ph_city: { it: 'Milano', en: 'Milan' },
  reg_ph_address: { it: 'Via Roma 1', en: '1 Roma Street' },
  reg_select_placeholder: { it: 'Seleziona', en: 'Select' },
  reg_section_client_type: { it: 'Tipo di cliente', en: 'Client type' },
  reg_section_fiscal: { it: 'Dati fiscali', en: 'Fiscal data' },
  reg_vat_number: { it: 'Partita IVA', en: 'VAT number' },
  reg_company_name: { it: 'Ragione sociale', en: 'Company name' },
  reg_fiscal_code: { it: 'Codice fiscale', en: 'Fiscal code' },
  reg_ph_vat: { it: '12345678901', en: '12345678901' },
  reg_ph_company: { it: 'Herion S.r.l.', en: 'Herion S.r.l.' },
  reg_ph_fiscal: { it: 'RSSMRA85M01H501Z', en: 'RSSMRA85M01H501Z' },

  // ─── CLIENT TYPES ───
  client_private: { it: 'Privato', en: 'Individual' },
  client_private_desc: { it: 'Persona fisica', en: 'Private citizen' },
  client_freelancer: { it: 'Professionista', en: 'Freelancer' },
  client_freelancer_desc: { it: 'Lavoratore autonomo', en: 'Self-employed' },
  client_company: { it: 'Azienda', en: 'Company' },
  client_company_desc: { it: 'Societa o impresa', en: 'Business or corporation' },

  // ─── CLIENT TYPE ADVANTAGES ───
  adv_private: {
    it: 'Dichiarazioni, 730, IMU, successioni — tutto gestito con chiarezza.',
    en: 'Tax returns, property taxes, inheritances — all managed with clarity.'
  },
  adv_freelancer: {
    it: 'Gestione IVA, F24, contributi INPS e regime forfettario inclusi.',
    en: 'VAT management, tax payments, social security and flat-rate regime included.'
  },
  adv_company: {
    it: 'Bilancio, visure, adempimenti societari e comunicazioni al Registro Imprese.',
    en: 'Financial statements, company filings, and business registry communications.'
  },

  // ─── TOOLTIPS ───
  tip_fiscal_code: {
    it: 'Il codice fiscale e composto da 16 caratteri alfanumerici. Lo trovi sulla tessera sanitaria o sul sito dell\'Agenzia delle Entrate.',
    en: 'The fiscal code is a 16-character alphanumeric code. You can find it on your health card or the Revenue Agency website.'
  },
  tip_vat: {
    it: 'Il numero di Partita IVA e composto da 11 cifre. Lo trovi sul certificato di attribuzione o nella visura camerale.',
    en: 'The VAT number is an 11-digit code. You can find it on your registration certificate or chamber of commerce extract.'
  },
  tip_address: {
    it: 'L\'indirizzo di residenza o sede legale. Serve per la corretta associazione della posizione fiscale.',
    en: 'Your residence or registered office address. Required for correct fiscal positioning.'
  },

  // ─── REGISTER — STEP 3 FIELDS ───
  reg_section_security: { it: 'Sicurezza', en: 'Security' },
  reg_password: { it: 'Password', en: 'Password' },
  reg_confirm_password: { it: 'Conferma password', en: 'Confirm password' },
  reg_ph_password: { it: 'Min. 8 caratteri', en: 'Min. 8 characters' },
  reg_ph_confirm: { it: 'Ripeti la password', en: 'Repeat password' },
  reg_privacy: {
    it: "Accetto l'informativa privacy",
    en: 'I accept the privacy policy'
  },
  reg_terms: {
    it: 'Accetto i termini di servizio',
    en: 'I accept the terms of service'
  },

  // ─── TRUST BADGES ───
  trust_encryption: { it: 'Crittografia AES-256', en: 'AES-256 Encryption' },
  trust_gdpr: { it: 'Conforme GDPR', en: 'GDPR Compliant' },
  trust_eu: { it: 'Dati residenti in UE', en: 'EU Data Residency' },
  trust_social_proof: {
    it: 'Gia scelto da oltre 500 professionisti per eliminare lo stress burocratico.',
    en: 'Already chosen by 500+ professionals to eliminate bureaucratic stress.'
  },
  trust_human: {
    it: "L'AI di Herion e supervisionata da esperti contabili reali. Non sarai mai solo.",
    en: "Herion's AI is supervised by real accounting experts. You'll never be alone."
  },

  // ─── REGISTER BUTTONS ───
  reg_next: { it: 'Continua', en: 'Continue' },
  reg_back: { it: 'Indietro', en: 'Back' },
  reg_submit: { it: 'Crea account', en: 'Create account' },
  reg_submitting: { it: 'Creazione in corso...', en: 'Creating...' },
  reg_has_account: { it: 'Hai gia un account?', en: 'Already have an account?' },
  reg_login_link: { it: 'Accedi', en: 'Log in' },

  // ─── VALIDATION ERRORS ───
  err_required_first_name: { it: 'Il nome e obbligatorio', en: 'First name is required' },
  err_required_last_name: { it: 'Il cognome e obbligatorio', en: 'Last name is required' },
  err_required_email: { it: "L'email e obbligatoria", en: 'Email is required' },
  err_invalid_email: { it: 'Email non valida', en: 'Invalid email' },
  err_required_phone: { it: 'Il telefono e obbligatorio', en: 'Phone is required' },
  err_required_dob: { it: 'La data di nascita e obbligatoria', en: 'Date of birth is required' },
  err_required_country: { it: 'Il paese e obbligatorio', en: 'Country is required' },
  err_required_city: { it: 'La citta e obbligatoria', en: 'City is required' },
  err_required_address: { it: "L'indirizzo e obbligatorio", en: 'Address is required' },
  err_required_client_type: { it: 'Seleziona il tipo di cliente', en: 'Select your client type' },
  err_required_vat: { it: 'La Partita IVA e obbligatoria', en: 'VAT number is required' },
  err_required_company: { it: 'La ragione sociale e obbligatoria', en: 'Company name is required' },
  err_required_fiscal: { it: 'Il codice fiscale e obbligatorio', en: 'Fiscal code is required' },
  err_required_password: { it: 'La password e obbligatoria', en: 'Password is required' },
  err_password_min: { it: 'Minimo 8 caratteri', en: 'Minimum 8 characters' },
  err_password_mismatch: { it: 'Le password non corrispondono', en: 'Passwords do not match' },
  err_required_privacy: { it: "Accetta l'informativa privacy", en: 'Accept the privacy policy' },
  err_required_terms: { it: 'Accetta i termini di servizio', en: 'Accept the terms of service' },
  err_fix_form: { it: 'Correggi gli errori nel modulo', en: 'Fix the errors in the form' },
  reg_success: { it: 'Account creato!', en: 'Account created!' },

  // ─── LOGIN PAGE ───
  login_title: { it: 'Accedi', en: 'Log in' },
  login_subtitle: { it: 'Inserisci le tue credenziali per continuare', en: 'Enter your credentials to continue' },
  login_email: { it: 'Email', en: 'Email' },
  login_password: { it: 'Password', en: 'Password' },
  login_ph_email: { it: 'nome@esempio.it', en: 'name@example.com' },
  login_ph_password: { it: 'La tua password', en: 'Your password' },
  login_forgot: { it: 'Password dimenticata?', en: 'Forgot password?' },
  login_submit: { it: 'Accedi', en: 'Log in' },
  login_submitting: { it: 'Accesso...', en: 'Logging in...' },
  login_no_account: { it: 'Non hai un account?', en: "Don't have an account?" },
  login_register_link: { it: 'Registrati', en: 'Sign up' },

  // ─── WELCOME PAGE ───
  welcome_badge: { it: 'Commercialista digitale', en: 'Digital accountant' },
  welcome_hero_title_1: { it: 'Gestisci pratiche fiscali', en: 'Manage tax procedures' },
  welcome_hero_title_2: { it: 'con piu chiarezza e meno stress.', en: 'with more clarity and less stress.' },
  welcome_hero_desc: {
    it: 'Herion ti accompagna dalla preparazione dei documenti fino al completamento ufficiale. Sai sempre cosa sta succedendo, cosa devi fare e cosa viene dopo.',
    en: 'Herion guides you from document preparation to official completion. You always know what is happening, what you need to do, and what comes next.'
  },
  welcome_cta_start: { it: 'Inizia ora — e gratis', en: "Start now — it's free" },
  welcome_cta_how: { it: 'Come funziona', en: 'How it works' },
  welcome_nav_login: { it: 'Accedi', en: 'Log in' },
  welcome_nav_register: { it: 'Inizia ora', en: 'Get started' },

  // ─── EMPTY STATES ───
  empty_dashboard_title: {
    it: 'Il tuo commercialista digitale e pronto',
    en: 'Your digital accountant is ready'
  },
  empty_dashboard_desc: {
    it: 'Non sai da dove iniziare? Prova la Consulenza rapida oppure crea la tua prima pratica. Herion ti guida passo dopo passo.',
    en: "Not sure where to start? Try Quick Consultation or create your first practice. Herion guides you step by step."
  },
  empty_dashboard_cta: { it: 'Crea la prima pratica', en: 'Create your first practice' },
  empty_dashboard_consult: { it: 'Consulenza rapida', en: 'Quick consultation' },
  empty_practices_title: { it: 'Nessuna pratica ancora', en: 'No practices yet' },
  empty_practices_desc: {
    it: 'Inizia la tua prima pratica in 2 minuti. Herion ti guidera dalla raccolta documenti fino al completamento.',
    en: 'Start your first practice in 2 minutes. Herion will guide you from document collection to completion.'
  },
  empty_practices_cta: { it: 'Crea la prima pratica', en: 'Create your first practice' },
  empty_filter_title: { it: 'Nessun risultato', en: 'No results' },
  empty_filter_desc: {
    it: 'Prova a cambiare i filtri o il termine di ricerca.',
    en: 'Try changing the filters or search term.'
  },

  // ─── SIDEBAR / NAVIGATION ───
  nav_dashboard: { it: 'Dashboard', en: 'Dashboard' },
  nav_dashboard_hint: { it: 'Panoramica e azioni rapide', en: 'Overview and quick actions' },
  nav_practices: { it: 'Pratiche', en: 'Practices' },
  nav_practices_hint: { it: 'Le tue pratiche attive', en: 'Your active practices' },
  nav_consulenza: { it: 'Consulenza', en: 'Consultation' },
  nav_consulenza_hint: { it: 'Orientamento rapido con AI', en: 'Quick AI guidance' },
  nav_services: { it: 'Servizi', en: 'Services' },
  nav_services_hint: { it: 'Aree operative', en: 'Operational areas' },
  nav_catalog: { it: 'Catalogo', en: 'Catalog' },
  nav_catalog_hint: { it: 'Tutte le procedure', en: 'All procedures' },
  nav_vault: { it: 'Documenti', en: 'Documents' },
  nav_vault_hint: { it: 'Archivio documenti', en: 'Document archive' },
  nav_agents: { it: 'Attivita AI', en: 'AI Activity' },
  nav_agents_hint: { it: 'Azioni degli agenti', en: 'Agent actions' },
  nav_email: { it: 'Messaggi', en: 'Messages' },
  nav_email_hint: { it: 'Email e comunicazioni', en: 'Emails and communications' },
  nav_search: { it: 'Ricerca', en: 'Search' },
  nav_search_hint: { it: 'Cerca pratiche e documenti', en: 'Search practices and documents' },
  nav_support: { it: 'Supporto', en: 'Support' },
  nav_support_hint: { it: 'Aiuto e contatti', en: 'Help and contacts' },
  nav_stats: { it: 'Statistiche', en: 'Statistics' },
  nav_stats_hint: { it: 'Metriche e analisi', en: 'Metrics and analytics' },

  // ─── USER MENU ───
  user_profile: { it: 'Profilo', en: 'Profile' },
  user_settings: { it: 'Impostazioni', en: 'Settings' },
  user_language: { it: 'Lingua', en: 'Language' },
  user_control_room: { it: 'Control Room', en: 'Control Room' },
  user_logout: { it: 'Esci', en: 'Log out' },
  user_logout_confirm_title: { it: 'Conferma uscita', en: 'Confirm logout' },
  user_logout_confirm_desc: { it: 'Vuoi uscire dal tuo account Herion?', en: 'Do you want to log out of your Herion account?' },
  user_logout_cancel: { it: 'Annulla', en: 'Cancel' },
  user_logout_action: { it: 'Esci', en: 'Log out' },

  // ─── DASHBOARD ───
  dash_quick_consulenza: { it: 'Consulenza', en: 'Consultation' },
  dash_quick_consulenza_hint: { it: 'Orientamento rapido con AI', en: 'Quick AI guidance' },
  dash_quick_new: { it: 'Nuova pratica', en: 'New practice' },
  dash_quick_new_hint: { it: 'Preparazione guidata', en: 'Guided setup' },
  dash_quick_services: { it: 'Servizi', en: 'Services' },
  dash_quick_services_hint: { it: 'Aree operative', en: 'Operational areas' },
  dash_quick_messages: { it: 'Messaggi', en: 'Messages' },
  dash_quick_messages_hint: { it: 'Email e comunicazioni', en: 'Emails and communications' },
  dash_your_practices: { it: 'Le tue pratiche', en: 'Your practices' },
  dash_view_all: { it: 'Vedi tutte', en: 'View all' },
  dash_active: { it: 'Attive', en: 'Active' },
  dash_completed: { it: 'Completate', en: 'Completed' },
  dash_attention: { it: 'Serve il tuo intervento', en: 'Needs your action' },
  dash_herion_following: { it: 'Herion sta seguendo', en: 'Herion is tracking' },
  dash_agent_activity: { it: 'Attivita di Herion', en: 'Herion activity' },
  dash_details: { it: 'Dettagli', en: 'Details' },

  // ─── PROFILE / SETTINGS ───
  profile_title: { it: 'Profilo e impostazioni', en: 'Profile and settings' },
  profile_personal: { it: 'Informazioni personali', en: 'Personal information' },
  profile_security: { it: 'Sicurezza', en: 'Security' },
  profile_preferences: { it: 'Preferenze', en: 'Preferences' },
  profile_language_label: { it: 'Lingua dell\'interfaccia', en: 'Interface language' },
  profile_language_desc: { it: 'Scegli la lingua dell\'interfaccia di Herion', en: 'Choose the Herion interface language' },
  profile_save: { it: 'Salva', en: 'Save' },
  profile_saving: { it: 'Salvataggio...', en: 'Saving...' },
  profile_saved: { it: 'Profilo aggiornato', en: 'Profile updated' },
  profile_pw_current: { it: 'Password attuale', en: 'Current password' },
  profile_pw_new: { it: 'Nuova password', en: 'New password' },
  profile_pw_confirm: { it: 'Conferma password', en: 'Confirm password' },
  profile_pw_change: { it: 'Cambia password', en: 'Change password' },
  profile_pw_changed: { it: 'Password aggiornata', en: 'Password updated' },
  profile_role: { it: 'Ruolo', en: 'Role' },
  profile_client_type: { it: 'Tipo cliente', en: 'Client type' },

  // ─── STATS ACCESS ───
  stats_access_denied: { it: 'Accesso riservato al fondatore', en: 'Founder access only' },
};

export function t(key, lang = 'it') {
  const entry = translations[key];
  if (!entry) return key;
  return entry[lang] || entry['it'] || key;
}

export default translations;
