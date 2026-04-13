"""
Test International/EU/Foreign-user flows with translation/legalization/apostille support
Iteration 40 - Testing international catalog entries and pre-start intelligence
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@aic.it"
ADMIN_PASSWORD = "Admin123!"


class TestInternationalCatalog:
    """Test international catalog entries and categories"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.cookies = login_resp.cookies
    
    def test_catalog_categories_includes_internazionale(self):
        """GET /api/catalog/categories returns 7 categories including 'internazionale'"""
        resp = self.session.get(f"{BASE_URL}/api/catalog/categories", cookies=self.cookies)
        assert resp.status_code == 200
        categories = resp.json()
        
        # Should have 7 categories
        assert len(categories) == 7, f"Expected 7 categories, got {len(categories)}"
        
        # Find internazionale category
        intl_cat = next((c for c in categories if c['id'] == 'internazionale'), None)
        assert intl_cat is not None, "internazionale category not found"
        assert intl_cat['label'] == 'Internazionale'
        assert intl_cat['procedure_count'] == 13, f"Expected 13 procedures, got {intl_cat['procedure_count']}"
        print(f"PASS: internazionale category found with {intl_cat['procedure_count']} procedures")
    
    def test_catalog_total_procedures(self):
        """GET /api/catalog returns 136 total procedures"""
        resp = self.session.get(f"{BASE_URL}/api/catalog", cookies=self.cookies)
        assert resp.status_code == 200
        catalog = resp.json()
        
        assert len(catalog) == 136, f"Expected 136 procedures, got {len(catalog)}"
        print(f"PASS: Catalog has {len(catalog)} total procedures")
    
    def test_international_official_procedures_exist(self):
        """Verify 8 official international procedures exist"""
        resp = self.session.get(f"{BASE_URL}/api/catalog", cookies=self.cookies)
        assert resp.status_code == 200
        catalog = resp.json()
        
        expected_official = [
            "TRADUZIONE_GIURATA",
            "APOSTILLE_DOCUMENTO",
            "LEGALIZZAZIONE_CONSOLARE",
            "CF_STRANIERO",
            "RICONOSCIMENTO_TITOLO",
            "RICONOSCIMENTO_PROFESSIONALE",
            "PERMESSO_SOGGIORNO_SUPPORT",
            "DICHIARAZIONE_PRESENZA"
        ]
        
        for proc_id in expected_official:
            entry = next((c for c in catalog if c['practice_id'] == proc_id), None)
            assert entry is not None, f"Procedure {proc_id} not found"
            assert entry['category'] == 'internazionale', f"{proc_id} should be in internazionale category"
            assert entry['procedure_type'] == 'official_procedure', f"{proc_id} should be official_procedure"
            print(f"PASS: {proc_id} exists as official_procedure in internazionale")
    
    def test_international_internal_entries_exist(self):
        """Verify 5 internal international support entries exist"""
        resp = self.session.get(f"{BASE_URL}/api/catalog", cookies=self.cookies)
        assert resp.status_code == 200
        catalog = resp.json()
        
        expected_internal = [
            "INFO_APOSTILLE_VS_LEGALIZZAZIONE",
            "INFO_TRADUZIONE_TIPI",
            "INFO_DOCUMENTI_ESTERI_ITALIA",
            "INFO_DOCUMENTI_ITALIANI_ESTERO",
            "INFO_FISCALITA_STRANIERI"
        ]
        
        for proc_id in expected_internal:
            entry = next((c for c in catalog if c['practice_id'] == proc_id), None)
            assert entry is not None, f"Internal entry {proc_id} not found"
            assert entry['category'] == 'internazionale', f"{proc_id} should be in internazionale category"
            assert entry['procedure_type'] == 'internal_support', f"{proc_id} should be internal_support"
            print(f"PASS: {proc_id} exists as internal_support in internazionale")


class TestPreStartInternationalGuidance:
    """Test pre-start intelligence with international guidance block"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.cookies = login_resp.cookies
    
    def test_prestart_traduzione_giurata_non_eu_citizen(self):
        """Pre-start for TRADUZIONE_GIURATA with client_type=non_eu_citizen returns international.relevant=true"""
        resp = self.session.get(
            f"{BASE_URL}/api/catalog/TRADUZIONE_GIURATA/pre-start?client_type=non_eu_citizen",
            cookies=self.cookies
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Check international block
        intl = data.get('international', {})
        assert intl.get('relevant') == True, "international.relevant should be True"
        assert intl.get('is_international_user') == True, "is_international_user should be True"
        assert intl.get('is_international_procedure') == True, "is_international_procedure should be True"
        
        # Check translation guidance
        assert intl.get('translation') is not None, "translation guidance should be present"
        assert intl['translation'].get('may_need_sworn_translation') == True
        
        # Check validation guidance
        assert intl.get('validation') is not None, "validation guidance should be present"
        assert intl['validation'].get('may_need_legalization') == True, "non_eu_citizen should have legalization guidance"
        
        # Check safety note
        assert intl.get('safety_note') is not None, "safety_note should be present"
        
        print("PASS: TRADUZIONE_GIURATA pre-start for non_eu_citizen has correct international guidance")
    
    def test_prestart_vat_open_pf_eu_citizen(self):
        """Pre-start for VAT_OPEN_PF with client_type=eu_citizen returns international.relevant=true with additional_requirements"""
        resp = self.session.get(
            f"{BASE_URL}/api/catalog/VAT_OPEN_PF/pre-start?client_type=eu_citizen",
            cookies=self.cookies
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Check international block
        intl = data.get('international', {})
        assert intl.get('relevant') == True, "international.relevant should be True for eu_citizen"
        assert intl.get('is_international_user') == True, "is_international_user should be True"
        
        # Check additional requirements
        add_reqs = intl.get('additional_requirements', [])
        assert len(add_reqs) > 0, "additional_requirements should not be empty"
        
        # Should have codice fiscale requirement
        cf_req = next((r for r in add_reqs if 'codice fiscale' in r.get('label', '').lower()), None)
        assert cf_req is not None, "Should have codice fiscale requirement"
        
        # Should have attestato requirement (optional for EU)
        attestato_req = next((r for r in add_reqs if 'attestato' in r.get('label', '').lower()), None)
        assert attestato_req is not None, "Should have attestato requirement"
        
        print("PASS: VAT_OPEN_PF pre-start for eu_citizen has correct additional_requirements")
    
    def test_prestart_doc_missing_request_private(self):
        """Pre-start for DOC_MISSING_REQUEST with client_type=private returns international.relevant=false"""
        resp = self.session.get(
            f"{BASE_URL}/api/catalog/DOC_MISSING_REQUEST/pre-start?client_type=private",
            cookies=self.cookies
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Check international block
        intl = data.get('international', {})
        assert intl.get('relevant') == False, "international.relevant should be False for private user on non-intl procedure"
        
        print("PASS: DOC_MISSING_REQUEST pre-start for private has international.relevant=false")
    
    def test_prestart_non_eu_citizen_has_legalization_guidance(self):
        """Pre-start for non_eu_citizen includes legalization guidance (may_need_legalization=true)"""
        resp = self.session.get(
            f"{BASE_URL}/api/catalog/LEGALIZZAZIONE_CONSOLARE/pre-start?client_type=non_eu_citizen",
            cookies=self.cookies
        )
        assert resp.status_code == 200
        data = resp.json()
        
        intl = data.get('international', {})
        validation = intl.get('validation', {})
        assert validation.get('may_need_legalization') == True, "non_eu_citizen should have may_need_legalization=true"
        
        print("PASS: non_eu_citizen has legalization guidance")
    
    def test_prestart_eu_citizen_no_legalization_guidance(self):
        """Pre-start for eu_citizen does NOT include legalization guidance (may_need_legalization=false)"""
        resp = self.session.get(
            f"{BASE_URL}/api/catalog/APOSTILLE_DOCUMENTO/pre-start?client_type=eu_citizen",
            cookies=self.cookies
        )
        assert resp.status_code == 200
        data = resp.json()
        
        intl = data.get('international', {})
        validation = intl.get('validation', {})
        assert validation.get('may_need_legalization') == False, "eu_citizen should have may_need_legalization=false"
        
        print("PASS: eu_citizen does NOT have legalization guidance")
    
    def test_prestart_international_safety_note_present(self):
        """Pre-start international block includes safety_note for cross-border procedures"""
        resp = self.session.get(
            f"{BASE_URL}/api/catalog/RICONOSCIMENTO_TITOLO/pre-start?client_type=non_eu_citizen",
            cookies=self.cookies
        )
        assert resp.status_code == 200
        data = resp.json()
        
        intl = data.get('international', {})
        assert intl.get('safety_note') is not None, "safety_note should be present"
        assert len(intl['safety_note']) > 0, "safety_note should not be empty"
        
        print("PASS: International guidance includes safety_note")


class TestExtendedClientTypes:
    """Test extended client types (5 types including EU and non-EU citizens)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.cookies = login_resp.cookies
    
    def test_catalog_entry_supports_all_client_types(self):
        """Verify international procedures support extended client types"""
        resp = self.session.get(f"{BASE_URL}/api/catalog", cookies=self.cookies)
        assert resp.status_code == 200
        catalog = resp.json()
        
        # CF_STRANIERO should support eu_citizen and non_eu_citizen
        cf_entry = next((c for c in catalog if c['practice_id'] == 'CF_STRANIERO'), None)
        assert cf_entry is not None
        user_types = cf_entry.get('user_type', [])
        assert 'eu_citizen' in user_types, "CF_STRANIERO should support eu_citizen"
        assert 'non_eu_citizen' in user_types, "CF_STRANIERO should support non_eu_citizen"
        
        # PERMESSO_SOGGIORNO_SUPPORT should only support non_eu_citizen
        permesso_entry = next((c for c in catalog if c['practice_id'] == 'PERMESSO_SOGGIORNO_SUPPORT'), None)
        assert permesso_entry is not None
        user_types = permesso_entry.get('user_type', [])
        assert 'non_eu_citizen' in user_types, "PERMESSO_SOGGIORNO_SUPPORT should support non_eu_citizen"
        assert 'eu_citizen' not in user_types, "PERMESSO_SOGGIORNO_SUPPORT should NOT support eu_citizen"
        
        # DICHIARAZIONE_PRESENZA should only support eu_citizen
        dichiarazione_entry = next((c for c in catalog if c['practice_id'] == 'DICHIARAZIONE_PRESENZA'), None)
        assert dichiarazione_entry is not None
        user_types = dichiarazione_entry.get('user_type', [])
        assert 'eu_citizen' in user_types, "DICHIARAZIONE_PRESENZA should support eu_citizen"
        
        print("PASS: International procedures have correct client type support")
    
    def test_prestart_filters_by_client_type(self):
        """Verify pre-start shows suitable_for_client_type correctly"""
        # Test non_eu_citizen on PERMESSO_SOGGIORNO_SUPPORT (should be suitable)
        resp = self.session.get(
            f"{BASE_URL}/api/catalog/PERMESSO_SOGGIORNO_SUPPORT/pre-start?client_type=non_eu_citizen",
            cookies=self.cookies
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data['orientation']['suitable_for_client_type'] == True
        
        # Test eu_citizen on PERMESSO_SOGGIORNO_SUPPORT (should NOT be suitable)
        resp = self.session.get(
            f"{BASE_URL}/api/catalog/PERMESSO_SOGGIORNO_SUPPORT/pre-start?client_type=eu_citizen",
            cookies=self.cookies
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data['orientation']['suitable_for_client_type'] == False
        
        print("PASS: Pre-start correctly filters by client type suitability")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
