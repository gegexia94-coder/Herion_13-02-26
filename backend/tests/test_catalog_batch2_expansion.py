"""
Test Catalog Batch 2 Expansion: 78 → 123 procedures across 6 categories
Tests:
- Total count: 123 procedures
- Category counts: fiscale(30), previdenziale(17), societario(18), lavoro(15), documentale(20), informativo(23)
- No duplicate practice_id values
- New Batch 2 entries exist with correct enriched structure
- url_verified=false for unverified portals
- Pre-start endpoint works for new entries
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCatalogBatch2Expansion:
    """Test catalog expansion from 78 to 123 procedures"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        yield
        self.session.close()
    
    # ═══════════════════════════════════════════════════════════════
    # TOTAL COUNT AND CATEGORY TESTS
    # ═══════════════════════════════════════════════════════════════
    
    def test_catalog_returns_123_procedures(self):
        """GET /api/catalog returns exactly 123 procedures"""
        response = self.session.get(f"{BASE_URL}/api/catalog")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 123, f"Expected 123 procedures, got {len(data)}"
    
    def test_categories_endpoint_returns_6_categories(self):
        """GET /api/catalog/categories returns 6 categories with correct counts"""
        response = self.session.get(f"{BASE_URL}/api/catalog/categories")
        assert response.status_code == 200
        categories = response.json()
        assert len(categories) == 6, f"Expected 6 categories, got {len(categories)}"
        
        # Build category count map
        cat_counts = {cat['id']: cat['procedure_count'] for cat in categories}
        
        # Verify expected counts
        expected = {
            'fiscale': 30,
            'previdenziale': 17,
            'societario': 18,
            'lavoro': 15,
            'documentale': 20,
            'informativo': 23
        }
        
        for cat_id, expected_count in expected.items():
            assert cat_id in cat_counts, f"Category {cat_id} not found"
            assert cat_counts[cat_id] == expected_count, f"Category {cat_id}: expected {expected_count}, got {cat_counts[cat_id]}"
    
    def test_no_duplicate_practice_ids(self):
        """No duplicate practice_id values in the catalog"""
        response = self.session.get(f"{BASE_URL}/api/catalog")
        assert response.status_code == 200
        data = response.json()
        
        practice_ids = [p['practice_id'] for p in data]
        unique_ids = set(practice_ids)
        
        assert len(practice_ids) == len(unique_ids), f"Found {len(practice_ids) - len(unique_ids)} duplicate practice_ids"
    
    # ═══════════════════════════════════════════════════════════════
    # BATCH 2 FISCALE ENTRIES (6 new)
    # ═══════════════════════════════════════════════════════════════
    
    def test_batch2_fiscale_esterometro_exists(self):
        """ESTEROMETRO entry exists with correct structure"""
        response = self.session.get(f"{BASE_URL}/api/catalog/ESTEROMETRO")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'ESTEROMETRO'
        assert data['category'] == 'fiscale'
        assert data['procedure_type'] == 'official_procedure'
        assert 'flow_definition' in data
        assert data['flow_definition'] is not None
    
    def test_batch2_fiscale_isa_affidabilita_exists(self):
        """ISA_AFFIDABILITA entry exists with correct structure"""
        response = self.session.get(f"{BASE_URL}/api/catalog/ISA_AFFIDABILITA")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'ISA_AFFIDABILITA'
        assert data['category'] == 'fiscale'
        assert 'flow_definition' in data
    
    def test_batch2_fiscale_imposta_bollo_efatt_exists(self):
        """IMPOSTA_BOLLO_EFATT entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/IMPOSTA_BOLLO_EFATT")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'IMPOSTA_BOLLO_EFATT'
        assert data['category'] == 'fiscale'
    
    def test_batch2_fiscale_bonus_edilizi_exists(self):
        """BONUS_EDILIZI entry exists with high risk level"""
        response = self.session.get(f"{BASE_URL}/api/catalog/BONUS_EDILIZI")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'BONUS_EDILIZI'
        assert data['category'] == 'fiscale'
        assert data['risk_level'] == 'high'
    
    def test_batch2_fiscale_credito_imposta_rs_exists(self):
        """CREDITO_IMPOSTA_RS entry exists with high risk level"""
        response = self.session.get(f"{BASE_URL}/api/catalog/CREDITO_IMPOSTA_RS")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'CREDITO_IMPOSTA_RS'
        assert data['category'] == 'fiscale'
        assert data['risk_level'] == 'high'
    
    def test_batch2_fiscale_imposta_registro_exists(self):
        """IMPOSTA_REGISTRO entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/IMPOSTA_REGISTRO")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'IMPOSTA_REGISTRO'
        assert data['category'] == 'fiscale'
    
    # ═══════════════════════════════════════════════════════════════
    # BATCH 2 PREVIDENZIALE ENTRIES (5 new)
    # ═══════════════════════════════════════════════════════════════
    
    def test_batch2_previdenziale_riscatto_laurea_exists(self):
        """INPS_RISCATTO_LAUREA entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/INPS_RISCATTO_LAUREA")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'INPS_RISCATTO_LAUREA'
        assert data['category'] == 'previdenziale'
        assert data['risk_level'] == 'high'
    
    def test_batch2_previdenziale_ricongiunzione_exists(self):
        """INPS_RICONGIUNZIONE entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/INPS_RICONGIUNZIONE")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'INPS_RICONGIUNZIONE'
        assert data['category'] == 'previdenziale'
    
    def test_batch2_previdenziale_estratto_conto_exists(self):
        """INPS_ESTRATTO_CONTO entry exists with basic risk"""
        response = self.session.get(f"{BASE_URL}/api/catalog/INPS_ESTRATTO_CONTO")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'INPS_ESTRATTO_CONTO'
        assert data['category'] == 'previdenziale'
        assert data['risk_level'] == 'basic'
    
    def test_batch2_previdenziale_bonus_nido_exists(self):
        """INPS_BONUS_NIDO entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/INPS_BONUS_NIDO")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'INPS_BONUS_NIDO'
        assert data['category'] == 'previdenziale'
    
    def test_batch2_previdenziale_congedo_parentale_exists(self):
        """INPS_CONGEDO_PARENTALE entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/INPS_CONGEDO_PARENTALE")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'INPS_CONGEDO_PARENTALE'
        assert data['category'] == 'previdenziale'
    
    # ═══════════════════════════════════════════════════════════════
    # BATCH 2 SOCIETARIO ENTRIES (5 new)
    # ═══════════════════════════════════════════════════════════════
    
    def test_batch2_societario_vidimazione_libri_exists(self):
        """VIDIMAZIONE_LIBRI entry exists with basic risk"""
        response = self.session.get(f"{BASE_URL}/api/catalog/VIDIMAZIONE_LIBRI")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'VIDIMAZIONE_LIBRI'
        assert data['category'] == 'societario'
        assert data['risk_level'] == 'basic'
    
    def test_batch2_societario_domiciliazione_legale_exists(self):
        """DOMICILIAZIONE_LEGALE entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/DOMICILIAZIONE_LEGALE")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'DOMICILIAZIONE_LEGALE'
        assert data['category'] == 'societario'
    
    def test_batch2_societario_contratto_rete_exists(self):
        """CONTRATTO_RETE entry exists with url_verified=false"""
        response = self.session.get(f"{BASE_URL}/api/catalog/CONTRATTO_RETE")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'CONTRATTO_RETE'
        assert data['category'] == 'societario'
        # Check url_verified in flow_definition
        if data.get('flow_definition') and data['flow_definition'].get('official_entry_point'):
            assert data['flow_definition']['official_entry_point'].get('url_verified') == False
    
    def test_batch2_societario_scioglimento_societa_exists(self):
        """SCIOGLIMENTO_SOCIETA entry exists with high risk"""
        response = self.session.get(f"{BASE_URL}/api/catalog/SCIOGLIMENTO_SOCIETA")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'SCIOGLIMENTO_SOCIETA'
        assert data['category'] == 'societario'
        assert data['risk_level'] == 'high'
    
    def test_batch2_societario_fusione_societaria_exists(self):
        """FUSIONE_SOCIETARIA entry exists with high risk"""
        response = self.session.get(f"{BASE_URL}/api/catalog/FUSIONE_SOCIETARIA")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'FUSIONE_SOCIETARIA'
        assert data['category'] == 'societario'
        assert data['risk_level'] == 'high'
    
    # ═══════════════════════════════════════════════════════════════
    # BATCH 2 LAVORO ENTRIES (10 new)
    # ═══════════════════════════════════════════════════════════════
    
    def test_batch2_lavoro_prospetto_informativo_exists(self):
        """PROSPETTO_INFORMATIVO entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/PROSPETTO_INFORMATIVO")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'PROSPETTO_INFORMATIVO'
        assert data['category'] == 'lavoro'
    
    def test_batch2_lavoro_libro_unico_exists(self):
        """LIBRO_UNICO entry exists with basic risk"""
        response = self.session.get(f"{BASE_URL}/api/catalog/LIBRO_UNICO")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'LIBRO_UNICO'
        assert data['category'] == 'lavoro'
        assert data['risk_level'] == 'basic'
    
    def test_batch2_lavoro_welfare_aziendale_exists(self):
        """WELFARE_AZIENDALE entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/WELFARE_AZIENDALE")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'WELFARE_AZIENDALE'
        assert data['category'] == 'lavoro'
    
    def test_batch2_lavoro_cu_dipendenti_exists(self):
        """CU_DIPENDENTI entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/CU_DIPENDENTI")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'CU_DIPENDENTI'
        assert data['category'] == 'lavoro'
    
    def test_batch2_lavoro_mod_770_sostituti_exists(self):
        """MOD_770_SOSTITUTI entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/MOD_770_SOSTITUTI")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'MOD_770_SOSTITUTI'
        assert data['category'] == 'lavoro'
    
    def test_batch2_lavoro_fringe_benefit_exists(self):
        """FRINGE_BENEFIT entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/FRINGE_BENEFIT")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'FRINGE_BENEFIT'
        assert data['category'] == 'lavoro'
    
    def test_batch2_lavoro_gestione_ferie_exists(self):
        """GESTIONE_FERIE entry exists with basic risk"""
        response = self.session.get(f"{BASE_URL}/api/catalog/GESTIONE_FERIE")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'GESTIONE_FERIE'
        assert data['category'] == 'lavoro'
        assert data['risk_level'] == 'basic'
    
    def test_batch2_lavoro_trasferta_rimborso_exists(self):
        """TRASFERTA_RIMBORSO entry exists with basic risk"""
        response = self.session.get(f"{BASE_URL}/api/catalog/TRASFERTA_RIMBORSO")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'TRASFERTA_RIMBORSO'
        assert data['category'] == 'lavoro'
        assert data['risk_level'] == 'basic'
    
    def test_batch2_lavoro_premio_risultato_exists(self):
        """PREMIO_RISULTATO entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/PREMIO_RISULTATO")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'PREMIO_RISULTATO'
        assert data['category'] == 'lavoro'
    
    def test_batch2_lavoro_cedolino_collaboratore_exists(self):
        """CEDOLINO_COLLABORATORE entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/CEDOLINO_COLLABORATORE")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'CEDOLINO_COLLABORATORE'
        assert data['category'] == 'lavoro'
    
    # ═══════════════════════════════════════════════════════════════
    # BATCH 2 DOCUMENTALE ENTRIES (8 new)
    # ═══════════════════════════════════════════════════════════════
    
    def test_batch2_documentale_conservazione_sost_exists(self):
        """DOC_CONSERVAZIONE_SOST entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/DOC_CONSERVAZIONE_SOST")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'DOC_CONSERVAZIONE_SOST'
        assert data['category'] == 'documentale'
        assert data['procedure_type'] == 'internal_support'
    
    def test_batch2_documentale_marca_temporale_exists(self):
        """DOC_MARCA_TEMPORALE entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/DOC_MARCA_TEMPORALE")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'DOC_MARCA_TEMPORALE'
        assert data['category'] == 'documentale'
    
    def test_batch2_documentale_procura_telematica_exists(self):
        """DOC_PROCURA_TELEMATICA entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/DOC_PROCURA_TELEMATICA")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'DOC_PROCURA_TELEMATICA'
        assert data['category'] == 'documentale'
    
    def test_batch2_documentale_raccolta_consensi_exists(self):
        """DOC_RACCOLTA_CONSENSI entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/DOC_RACCOLTA_CONSENSI")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'DOC_RACCOLTA_CONSENSI'
        assert data['category'] == 'documentale'
    
    def test_batch2_documentale_contratto_servizio_exists(self):
        """DOC_CONTRATTO_SERVIZIO entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/DOC_CONTRATTO_SERVIZIO")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'DOC_CONTRATTO_SERVIZIO'
        assert data['category'] == 'documentale'
    
    def test_batch2_documentale_checklist_annuale_exists(self):
        """DOC_CHECKLIST_ANNUALE entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/DOC_CHECKLIST_ANNUALE")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'DOC_CHECKLIST_ANNUALE'
        assert data['category'] == 'documentale'
    
    def test_batch2_documentale_fascicolo_clienti_exists(self):
        """DOC_FASCICOLO_CLIENTI entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/DOC_FASCICOLO_CLIENTI")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'DOC_FASCICOLO_CLIENTI'
        assert data['category'] == 'documentale'
    
    def test_batch2_documentale_template_fattura_exists(self):
        """DOC_TEMPLATE_FATTURA entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/DOC_TEMPLATE_FATTURA")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'DOC_TEMPLATE_FATTURA'
        assert data['category'] == 'documentale'
    
    # ═══════════════════════════════════════════════════════════════
    # BATCH 2 INFORMATIVO ENTRIES (11 new)
    # ═══════════════════════════════════════════════════════════════
    
    def test_batch2_informativo_contributi_minimi_exists(self):
        """INFO_CONTRIBUTI_MINIMI entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/INFO_CONTRIBUTI_MINIMI")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'INFO_CONTRIBUTI_MINIMI'
        assert data['category'] == 'informativo'
        assert data['procedure_type'] == 'internal_support'
    
    def test_batch2_informativo_deduzioni_exists(self):
        """INFO_DEDUZIONI entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/INFO_DEDUZIONI")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'INFO_DEDUZIONI'
        assert data['category'] == 'informativo'
    
    def test_batch2_informativo_scadenze_trimestrali_exists(self):
        """INFO_SCADENZE_TRIMESTRALI entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/INFO_SCADENZE_TRIMESTRALI")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'INFO_SCADENZE_TRIMESTRALI'
        assert data['category'] == 'informativo'
    
    def test_batch2_informativo_fatturazione_elettronica_exists(self):
        """INFO_FATTURAZIONE_ELETTRONICA entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/INFO_FATTURAZIONE_ELETTRONICA")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'INFO_FATTURAZIONE_ELETTRONICA'
        assert data['category'] == 'informativo'
    
    def test_batch2_informativo_regime_impatriati_exists(self):
        """INFO_REGIME_IMPATRIATI entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/INFO_REGIME_IMPATRIATI")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'INFO_REGIME_IMPATRIATI'
        assert data['category'] == 'informativo'
    
    def test_batch2_informativo_startup_innovativa_exists(self):
        """INFO_STARTUP_INNOVATIVA entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/INFO_STARTUP_INNOVATIVA")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'INFO_STARTUP_INNOVATIVA'
        assert data['category'] == 'informativo'
    
    def test_batch2_informativo_societa_benefit_exists(self):
        """INFO_SOCIETA_BENEFIT entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/INFO_SOCIETA_BENEFIT")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'INFO_SOCIETA_BENEFIT'
        assert data['category'] == 'informativo'
    
    def test_batch2_informativo_obbligo_pec_exists(self):
        """INFO_OBBLIGO_PEC entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/INFO_OBBLIGO_PEC")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'INFO_OBBLIGO_PEC'
        assert data['category'] == 'informativo'
    
    def test_batch2_informativo_antiric_adeguata_exists(self):
        """INFO_ANTIRIC_ADEGUATA entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/INFO_ANTIRIC_ADEGUATA")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'INFO_ANTIRIC_ADEGUATA'
        assert data['category'] == 'informativo'
    
    def test_batch2_informativo_pianificazione_successoria_exists(self):
        """INFO_PIANIFICAZIONE_SUCCESSORIA entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/INFO_PIANIFICAZIONE_SUCCESSORIA")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'INFO_PIANIFICAZIONE_SUCCESSORIA'
        assert data['category'] == 'informativo'
    
    def test_batch2_informativo_lavoro_autonomo_exists(self):
        """INFO_LAVORO_AUTONOMO entry exists"""
        response = self.session.get(f"{BASE_URL}/api/catalog/INFO_LAVORO_AUTONOMO")
        assert response.status_code == 200
        data = response.json()
        assert data['practice_id'] == 'INFO_LAVORO_AUTONOMO'
        assert data['category'] == 'informativo'
    
    # ═══════════════════════════════════════════════════════════════
    # ENRICHED STRUCTURE TESTS
    # ═══════════════════════════════════════════════════════════════
    
    def test_official_procedure_has_flow_definition(self):
        """Official procedures have complete flow_definition"""
        response = self.session.get(f"{BASE_URL}/api/catalog/FUSIONE_SOCIETARIA")
        assert response.status_code == 200
        data = response.json()
        
        # Check flow_definition structure
        assert 'flow_definition' in data
        flow = data['flow_definition']
        assert flow is not None
        assert 'practice_type' in flow
        assert 'target_entity' in flow
        assert 'official_entry_point' in flow
        assert 'expected_release' in flow
        assert 'tracking_mode' in flow
    
    def test_official_procedure_has_who_acts(self):
        """Official procedures have who_acts structure"""
        response = self.session.get(f"{BASE_URL}/api/catalog/FUSIONE_SOCIETARIA")
        assert response.status_code == 200
        data = response.json()
        
        assert 'who_acts' in data
        who_acts = data['who_acts']
        assert 'herion_prepares' in who_acts
        assert 'herion_submits' in who_acts
        assert 'user_submits' in who_acts
        assert 'user_signs' in who_acts
        assert 'delegation_possible' in who_acts
    
    def test_internal_procedure_has_null_flow_definition(self):
        """Internal support procedures have null flow_definition"""
        response = self.session.get(f"{BASE_URL}/api/catalog/INFO_CONTRIBUTI_MINIMI")
        assert response.status_code == 200
        data = response.json()
        
        assert data['procedure_type'] == 'internal_support'
        assert data['flow_definition'] is None
    
    # ═══════════════════════════════════════════════════════════════
    # URL_VERIFIED TESTS
    # ═══════════════════════════════════════════════════════════════
    
    def test_url_verified_false_for_unverified_portals(self):
        """Procedures with unverified portals have url_verified=false"""
        # CONTRATTO_RETE has url_verified=False
        response = self.session.get(f"{BASE_URL}/api/catalog/CONTRATTO_RETE")
        assert response.status_code == 200
        data = response.json()
        
        if data.get('flow_definition') and data['flow_definition'].get('official_entry_point'):
            entry_point = data['flow_definition']['official_entry_point']
            assert entry_point.get('url_verified') == False, "CONTRATTO_RETE should have url_verified=false"
    
    def test_count_url_verified_false_entries(self):
        """Count procedures with url_verified=false (expected ~20)"""
        response = self.session.get(f"{BASE_URL}/api/catalog")
        assert response.status_code == 200
        data = response.json()
        
        unverified_count = 0
        for proc in data:
            if proc.get('flow_definition') and proc['flow_definition'].get('official_entry_point'):
                if proc['flow_definition']['official_entry_point'].get('url_verified') == False:
                    unverified_count += 1
        
        # Expected ~20 unverified URLs
        assert unverified_count >= 15, f"Expected at least 15 unverified URLs, got {unverified_count}"
        print(f"Found {unverified_count} procedures with url_verified=false")
    
    # ═══════════════════════════════════════════════════════════════
    # PRE-START ENDPOINT TESTS
    # ═══════════════════════════════════════════════════════════════
    
    def test_prestart_endpoint_fusione_societaria(self):
        """GET /api/catalog/FUSIONE_SOCIETARIA/pre-start works"""
        response = self.session.get(f"{BASE_URL}/api/catalog/FUSIONE_SOCIETARIA/pre-start?client_type=company")
        assert response.status_code == 200
        data = response.json()
        
        # Check pre-start intelligence blocks
        assert 'orientation' in data
        assert 'checklist' in data
        assert 'auth' in data
        assert 'readiness' in data
        
        # Verify orientation block
        assert data['orientation']['practice_name'] is not None
        assert data['orientation']['category'] == 'societario'
    
    def test_prestart_endpoint_new_batch2_entry(self):
        """Pre-start works for new Batch 2 entries"""
        response = self.session.get(f"{BASE_URL}/api/catalog/ESTEROMETRO/pre-start?client_type=company")
        assert response.status_code == 200
        data = response.json()
        
        assert 'orientation' in data
        assert data['orientation']['practice_name'] is not None
    
    def test_prestart_endpoint_internal_procedure(self):
        """Pre-start works for internal support procedures"""
        response = self.session.get(f"{BASE_URL}/api/catalog/INFO_CONTRIBUTI_MINIMI/pre-start?client_type=freelancer")
        assert response.status_code == 200
        data = response.json()
        
        assert 'orientation' in data
        assert data['orientation']['is_official'] == False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
