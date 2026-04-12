"""
Test Catalog Expansion from 20 to 35 procedures with universal flow model.
Tests the new entries and flow_definition structure.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@aic.it"
ADMIN_PASSWORD = "Admin123!"


class TestCatalogExpansion:
    """Test catalog expansion to 35 entries with universal flow model."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token."""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.user = login_response.json()
        # Cookies are automatically stored in session
    
    def test_catalog_returns_35_entries(self):
        """GET /api/catalog returns 35 entries."""
        response = self.session.get(f"{BASE_URL}/api/catalog")
        assert response.status_code == 200, f"Catalog fetch failed: {response.text}"
        entries = response.json()
        assert isinstance(entries, list), "Catalog should return a list"
        assert len(entries) == 35, f"Expected 35 entries, got {len(entries)}"
        print(f"✓ Catalog returns {len(entries)} entries")
    
    def test_catalog_categories_returns_5_categories(self):
        """GET /api/catalog/categories returns 5 categories with correct counts."""
        response = self.session.get(f"{BASE_URL}/api/catalog/categories")
        assert response.status_code == 200, f"Categories fetch failed: {response.text}"
        categories = response.json()
        assert isinstance(categories, list), "Categories should return a list"
        assert len(categories) == 5, f"Expected 5 categories, got {len(categories)}"
        
        # Build a dict for easy lookup
        cat_dict = {c["id"]: c for c in categories}
        
        # Verify expected counts
        expected_counts = {
            "fiscale": 14,
            "previdenziale": 5,
            "societario": 5,
            "documentale": 7,
            "informativo": 4
        }
        
        for cat_id, expected_count in expected_counts.items():
            assert cat_id in cat_dict, f"Category {cat_id} not found"
            actual_count = cat_dict[cat_id].get("procedure_count", 0)
            assert actual_count == expected_count, f"Category {cat_id}: expected {expected_count}, got {actual_count}"
            print(f"✓ Category {cat_id}: {actual_count} procedures")
    
    def test_income_tax_pf_exists_with_flow_definition(self):
        """INCOME_TAX_PF exists with category=fiscale, official_action, flow_definition."""
        response = self.session.get(f"{BASE_URL}/api/catalog/INCOME_TAX_PF")
        assert response.status_code == 200, f"INCOME_TAX_PF not found: {response.text}"
        entry = response.json()
        
        # Verify basic fields
        assert entry["practice_id"] == "INCOME_TAX_PF"
        assert entry["category"] == "fiscale"
        assert entry["procedure_type"] == "official_procedure"
        
        # Verify official_action exists
        assert "official_action" in entry, "official_action missing"
        assert entry["official_action"] is not None, "official_action should not be None"
        
        # Verify flow_definition exists
        assert "flow_definition" in entry, "flow_definition missing"
        assert entry["flow_definition"] is not None, "flow_definition should not be None"
        
        print(f"✓ INCOME_TAX_PF exists with category=fiscale, official_action, flow_definition")
    
    def test_income_tax_pf_flow_definition_official_entry_point(self):
        """INCOME_TAX_PF has flow_definition.official_entry_point with real URL and auth_method=SPID."""
        response = self.session.get(f"{BASE_URL}/api/catalog/INCOME_TAX_PF")
        assert response.status_code == 200
        entry = response.json()
        
        flow_def = entry.get("flow_definition", {})
        assert flow_def is not None, "flow_definition is None"
        
        entry_point = flow_def.get("official_entry_point", {})
        assert entry_point is not None, "official_entry_point is None"
        
        # Verify URL exists and is a real URL
        url = entry_point.get("url")
        assert url is not None, "official_entry_point.url is None"
        assert url.startswith("https://"), f"URL should start with https://, got: {url}"
        assert "agenziaentrate" in url.lower(), f"URL should be AdE portal, got: {url}"
        
        # Verify auth_method is SPID
        auth_method = entry_point.get("auth_method")
        assert auth_method == "SPID", f"Expected auth_method=SPID, got: {auth_method}"
        
        print(f"✓ INCOME_TAX_PF has official_entry_point with URL={url} and auth_method=SPID")
    
    def test_income_tax_pf_flow_definition_expected_release(self):
        """INCOME_TAX_PF has flow_definition.expected_release with type=protocol_number, timing=delayed."""
        response = self.session.get(f"{BASE_URL}/api/catalog/INCOME_TAX_PF")
        assert response.status_code == 200
        entry = response.json()
        
        flow_def = entry.get("flow_definition", {})
        expected_release = flow_def.get("expected_release", {})
        assert expected_release is not None, "expected_release is None"
        
        release_type = expected_release.get("type")
        assert release_type == "protocol_number", f"Expected type=protocol_number, got: {release_type}"
        
        timing = expected_release.get("timing")
        assert timing == "delayed", f"Expected timing=delayed, got: {timing}"
        
        print(f"✓ INCOME_TAX_PF has expected_release with type=protocol_number, timing=delayed")
    
    def test_income_tax_pf_flow_definition_tracking_mode(self):
        """INCOME_TAX_PF has flow_definition.tracking_mode with type=portal_status."""
        response = self.session.get(f"{BASE_URL}/api/catalog/INCOME_TAX_PF")
        assert response.status_code == 200
        entry = response.json()
        
        flow_def = entry.get("flow_definition", {})
        tracking_mode = flow_def.get("tracking_mode", {})
        assert tracking_mode is not None, "tracking_mode is None"
        
        tracking_type = tracking_mode.get("type")
        assert tracking_type == "portal_status", f"Expected type=portal_status, got: {tracking_type}"
        
        print(f"✓ INCOME_TAX_PF has tracking_mode with type=portal_status")
    
    def test_inps_durc_exists_with_previdenziale(self):
        """INPS_DURC exists with category=previdenziale."""
        response = self.session.get(f"{BASE_URL}/api/catalog/INPS_DURC")
        assert response.status_code == 200, f"INPS_DURC not found: {response.text}"
        entry = response.json()
        
        assert entry["practice_id"] == "INPS_DURC"
        assert entry["category"] == "previdenziale"
        assert entry["procedure_type"] == "official_procedure"
        
        print(f"✓ INPS_DURC exists with category=previdenziale")
    
    def test_company_formation_srl_exists_with_delegation_required(self):
        """COMPANY_FORMATION_SRL exists with category=societario, delegation_required=true."""
        response = self.session.get(f"{BASE_URL}/api/catalog/COMPANY_FORMATION_SRL")
        assert response.status_code == 200, f"COMPANY_FORMATION_SRL not found: {response.text}"
        entry = response.json()
        
        assert entry["practice_id"] == "COMPANY_FORMATION_SRL"
        assert entry["category"] == "societario"
        assert entry["delegation_required"] == True, f"Expected delegation_required=True, got: {entry.get('delegation_required')}"
        
        print(f"✓ COMPANY_FORMATION_SRL exists with category=societario, delegation_required=true")
    
    def test_suap_scia_has_url_verified_false(self):
        """SUAP_SCIA has url_verified=false in flow_definition."""
        response = self.session.get(f"{BASE_URL}/api/catalog/SUAP_SCIA")
        assert response.status_code == 200, f"SUAP_SCIA not found: {response.text}"
        entry = response.json()
        
        assert entry["practice_id"] == "SUAP_SCIA"
        
        flow_def = entry.get("flow_definition", {})
        assert flow_def is not None, "flow_definition is None"
        
        entry_point = flow_def.get("official_entry_point", {})
        url_verified = entry_point.get("url_verified")
        assert url_verified == False, f"Expected url_verified=False, got: {url_verified}"
        
        print(f"✓ SUAP_SCIA has url_verified=false in flow_definition")
    
    def test_internal_entries_have_flow_definition_none(self):
        """Internal entries (STATUS_UPDATE) have flow_definition=None."""
        response = self.session.get(f"{BASE_URL}/api/catalog/STATUS_UPDATE")
        assert response.status_code == 200, f"STATUS_UPDATE not found: {response.text}"
        entry = response.json()
        
        assert entry["practice_id"] == "STATUS_UPDATE"
        assert entry["procedure_type"] == "internal_support"
        assert entry["flow_definition"] is None, f"Expected flow_definition=None for internal entry, got: {entry.get('flow_definition')}"
        
        print(f"✓ STATUS_UPDATE (internal) has flow_definition=None")
    
    def test_new_entries_exist(self):
        """Verify all new entries exist in catalog."""
        new_entries = [
            "INCOME_TAX_PF",
            "INCOME_TAX_730",
            "LIPE_QUARTERLY",
            "CU_CERTIFICATION",
            "INTRASTAT",
            "CASSETTO_FISCALE",
            "VISURA_CAMERALE",
            "INFO_REGIME_FORFETTARIO",
            "INPS_DURC",
            "INPS_ARTIGIANI",
            "INPS_COMMERCIANTI",
            "COMPANY_FORMATION_SRL",
            "COMPANY_VARIATION",
            "SUAP_SCIA",
            "ATECO_VARIATION"
        ]
        
        for entry_id in new_entries:
            response = self.session.get(f"{BASE_URL}/api/catalog/{entry_id}")
            assert response.status_code == 200, f"Entry {entry_id} not found"
            entry = response.json()
            assert entry["practice_id"] == entry_id
            print(f"✓ {entry_id} exists")
    
    def test_search_by_inps_returns_inps_entries(self):
        """Search by 'INPS' returns all INPS-related entries."""
        response = self.session.get(f"{BASE_URL}/api/catalog")
        assert response.status_code == 200
        entries = response.json()
        
        # Filter entries that have INPS in name or entity
        inps_entries = [
            e for e in entries 
            if "INPS" in e.get("name", "").upper() 
            or (e.get("official_action") and "INPS" in e.get("official_action", {}).get("entity_name", "").upper())
        ]
        
        # Should have at least 5 INPS entries (INPS_GESTIONE_SEP, INPS_CASSETTO, INPS_DURC, INPS_ARTIGIANI, INPS_COMMERCIANTI)
        assert len(inps_entries) >= 5, f"Expected at least 5 INPS entries, got {len(inps_entries)}"
        
        inps_ids = [e["practice_id"] for e in inps_entries]
        print(f"✓ Found {len(inps_entries)} INPS-related entries: {inps_ids}")


class TestCatalogFlowDefinitionStructure:
    """Test the universal flow model structure for official procedures."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token."""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
    
    def test_all_official_procedures_have_flow_definition(self):
        """All official_procedure entries have flow_definition with required fields."""
        response = self.session.get(f"{BASE_URL}/api/catalog")
        assert response.status_code == 200
        entries = response.json()
        
        official_entries = [e for e in entries if e.get("procedure_type") == "official_procedure"]
        
        for entry in official_entries:
            flow_def = entry.get("flow_definition")
            assert flow_def is not None, f"{entry['practice_id']}: flow_definition is None"
            
            # Check required fields
            assert "official_entry_point" in flow_def, f"{entry['practice_id']}: missing official_entry_point"
            assert "expected_release" in flow_def, f"{entry['practice_id']}: missing expected_release"
            assert "tracking_mode" in flow_def, f"{entry['practice_id']}: missing tracking_mode"
            
            # Check official_entry_point structure
            entry_point = flow_def["official_entry_point"]
            assert "type" in entry_point, f"{entry['practice_id']}: missing entry_point.type"
            assert "auth_method" in entry_point, f"{entry['practice_id']}: missing entry_point.auth_method"
            
            # Check expected_release structure
            expected_release = flow_def["expected_release"]
            assert "type" in expected_release, f"{entry['practice_id']}: missing expected_release.type"
            assert "timing" in expected_release, f"{entry['practice_id']}: missing expected_release.timing"
            
            # Check tracking_mode structure
            tracking_mode = flow_def["tracking_mode"]
            assert "type" in tracking_mode, f"{entry['practice_id']}: missing tracking_mode.type"
        
        print(f"✓ All {len(official_entries)} official procedures have valid flow_definition")
    
    def test_all_internal_procedures_have_no_flow_definition(self):
        """All internal_support entries have flow_definition=None."""
        response = self.session.get(f"{BASE_URL}/api/catalog")
        assert response.status_code == 200
        entries = response.json()
        
        internal_entries = [e for e in entries if e.get("procedure_type") == "internal_support"]
        
        for entry in internal_entries:
            flow_def = entry.get("flow_definition")
            assert flow_def is None, f"{entry['practice_id']}: internal entry should have flow_definition=None, got: {flow_def}"
        
        print(f"✓ All {len(internal_entries)} internal procedures have flow_definition=None")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
