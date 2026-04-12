"""
Iteration 29 - Catalog Foundation System Tests
Tests for:
- GET /api/catalog/categories - returns 5 categories with procedure counts
- Enriched catalog entries with new fields (category, procedure_type, official_action, who_acts, auth_method, proof_expected, estimated_duration, document_specs)
- Specific entries: VAT_OPEN_PF, STATUS_UPDATE, COMPANY_CLOSURE, VAT_DECLARATION
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@aic.it"
ADMIN_PASSWORD = "Admin123!"


class TestCatalogFoundation:
    """Tests for the catalog foundation system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get session with auth cookies"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth cookies
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        print(f"✓ Login successful as {ADMIN_EMAIL}")
        yield
        # Cleanup: logout
        self.session.post(f"{BASE_URL}/api/auth/logout")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST: GET /api/catalog/categories
    # ═══════════════════════════════════════════════════════════════
    
    def test_catalog_categories_returns_5_categories(self):
        """GET /api/catalog/categories returns 5 categories"""
        response = self.session.get(f"{BASE_URL}/api/catalog/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        categories = response.json()
        assert isinstance(categories, list), "Response should be a list"
        assert len(categories) == 5, f"Expected 5 categories, got {len(categories)}"
        
        # Verify category IDs
        category_ids = [cat["id"] for cat in categories]
        expected_ids = ["fiscale", "previdenziale", "societario", "documentale", "informativo"]
        for expected_id in expected_ids:
            assert expected_id in category_ids, f"Missing category: {expected_id}"
        
        print(f"✓ GET /api/catalog/categories returns 5 categories: {category_ids}")
    
    def test_catalog_categories_have_procedure_counts(self):
        """Categories have procedure_count field with correct values"""
        response = self.session.get(f"{BASE_URL}/api/catalog/categories")
        assert response.status_code == 200
        
        categories = response.json()
        categories_dict = {cat["id"]: cat for cat in categories}
        
        # Expected counts: fiscale=7, previdenziale=2, societario=1, documentale=7, informativo=3
        expected_counts = {
            "fiscale": 7,
            "previdenziale": 2,
            "societario": 1,
            "documentale": 7,
            "informativo": 3
        }
        
        for cat_id, expected_count in expected_counts.items():
            assert cat_id in categories_dict, f"Missing category: {cat_id}"
            actual_count = categories_dict[cat_id].get("procedure_count")
            assert actual_count == expected_count, f"Category {cat_id}: expected {expected_count} procedures, got {actual_count}"
            print(f"✓ Category {cat_id}: {actual_count} procedures (expected {expected_count})")
        
        # Verify total = 20
        total = sum(cat.get("procedure_count", 0) for cat in categories)
        assert total == 20, f"Expected total 20 procedures, got {total}"
        print(f"✓ Total procedures: {total}")
    
    def test_category_fiscale_is_official(self):
        """Category fiscale has is_official=true"""
        response = self.session.get(f"{BASE_URL}/api/catalog/categories")
        assert response.status_code == 200
        
        categories = response.json()
        fiscale = next((cat for cat in categories if cat["id"] == "fiscale"), None)
        assert fiscale is not None, "Category fiscale not found"
        assert fiscale.get("is_official") == True, f"fiscale.is_official should be True, got {fiscale.get('is_official')}"
        print(f"✓ Category fiscale has is_official=True")
    
    def test_category_documentale_is_not_official(self):
        """Category documentale has is_official=false"""
        response = self.session.get(f"{BASE_URL}/api/catalog/categories")
        assert response.status_code == 200
        
        categories = response.json()
        documentale = next((cat for cat in categories if cat["id"] == "documentale"), None)
        assert documentale is not None, "Category documentale not found"
        assert documentale.get("is_official") == False, f"documentale.is_official should be False, got {documentale.get('is_official')}"
        print(f"✓ Category documentale has is_official=False")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST: GET /api/catalog/VAT_OPEN_PF - Enriched fields
    # ═══════════════════════════════════════════════════════════════
    
    def test_vat_open_pf_has_enriched_fields(self):
        """GET /api/catalog/VAT_OPEN_PF returns enriched fields"""
        response = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        entry = response.json()
        
        # Check all required enriched fields exist
        required_fields = ["category", "procedure_type", "official_action", "who_acts", "auth_method", "proof_expected", "estimated_duration", "document_specs"]
        for field in required_fields:
            assert field in entry, f"Missing field: {field}"
        
        print(f"✓ VAT_OPEN_PF has all enriched fields: {required_fields}")
    
    def test_vat_open_pf_category_and_procedure_type(self):
        """VAT_OPEN_PF: category=fiscale, procedure_type=official_procedure"""
        response = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF")
        assert response.status_code == 200
        
        entry = response.json()
        assert entry.get("category") == "fiscale", f"Expected category=fiscale, got {entry.get('category')}"
        assert entry.get("procedure_type") == "official_procedure", f"Expected procedure_type=official_procedure, got {entry.get('procedure_type')}"
        print(f"✓ VAT_OPEN_PF: category={entry.get('category')}, procedure_type={entry.get('procedure_type')}")
    
    def test_vat_open_pf_official_action(self):
        """VAT_OPEN_PF: official_action has code, label, entity_name, form_reference"""
        response = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF")
        assert response.status_code == 200
        
        entry = response.json()
        official_action = entry.get("official_action")
        assert official_action is not None, "official_action should not be None"
        
        required_keys = ["code", "label", "entity_name", "form_reference"]
        for key in required_keys:
            assert key in official_action, f"official_action missing key: {key}"
            assert official_action[key] is not None, f"official_action.{key} should not be None"
        
        print(f"✓ VAT_OPEN_PF official_action: code={official_action.get('code')}, label={official_action.get('label')}, entity_name={official_action.get('entity_name')}, form_reference={official_action.get('form_reference')}")
    
    def test_vat_open_pf_who_acts(self):
        """VAT_OPEN_PF: who_acts has herion_prepares=true, user_submits=true, delegation_possible=false"""
        response = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF")
        assert response.status_code == 200
        
        entry = response.json()
        who_acts = entry.get("who_acts")
        assert who_acts is not None, "who_acts should not be None"
        
        assert who_acts.get("herion_prepares") == True, f"Expected herion_prepares=True, got {who_acts.get('herion_prepares')}"
        assert who_acts.get("user_submits") == True, f"Expected user_submits=True, got {who_acts.get('user_submits')}"
        assert who_acts.get("delegation_possible") == False, f"Expected delegation_possible=False, got {who_acts.get('delegation_possible')}"
        
        print(f"✓ VAT_OPEN_PF who_acts: herion_prepares={who_acts.get('herion_prepares')}, user_submits={who_acts.get('user_submits')}, delegation_possible={who_acts.get('delegation_possible')}")
    
    def test_vat_open_pf_auth_method(self):
        """VAT_OPEN_PF: auth_method=SPID"""
        response = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF")
        assert response.status_code == 200
        
        entry = response.json()
        assert entry.get("auth_method") == "SPID", f"Expected auth_method=SPID, got {entry.get('auth_method')}"
        print(f"✓ VAT_OPEN_PF auth_method={entry.get('auth_method')}")
    
    def test_vat_open_pf_proof_expected(self):
        """VAT_OPEN_PF: proof_expected has type=protocol_number, timing=immediate, optional=false"""
        response = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF")
        assert response.status_code == 200
        
        entry = response.json()
        proof_expected = entry.get("proof_expected")
        assert proof_expected is not None, "proof_expected should not be None"
        
        assert proof_expected.get("type") == "protocol_number", f"Expected type=protocol_number, got {proof_expected.get('type')}"
        assert proof_expected.get("timing") == "immediate", f"Expected timing=immediate, got {proof_expected.get('timing')}"
        assert proof_expected.get("optional") == False, f"Expected optional=False, got {proof_expected.get('optional')}"
        
        print(f"✓ VAT_OPEN_PF proof_expected: type={proof_expected.get('type')}, timing={proof_expected.get('timing')}, optional={proof_expected.get('optional')}")
    
    def test_vat_open_pf_estimated_duration(self):
        """VAT_OPEN_PF: estimated_duration has label, min_days, max_days"""
        response = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF")
        assert response.status_code == 200
        
        entry = response.json()
        estimated_duration = entry.get("estimated_duration")
        assert estimated_duration is not None, "estimated_duration should not be None"
        
        required_keys = ["label", "min_days", "max_days"]
        for key in required_keys:
            assert key in estimated_duration, f"estimated_duration missing key: {key}"
        
        print(f"✓ VAT_OPEN_PF estimated_duration: label={estimated_duration.get('label')}, min_days={estimated_duration.get('min_days')}, max_days={estimated_duration.get('max_days')}")
    
    def test_vat_open_pf_document_specs(self):
        """VAT_OPEN_PF: document_specs has 2 items with key, name, why_needed, format, mandatory"""
        response = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF")
        assert response.status_code == 200
        
        entry = response.json()
        document_specs = entry.get("document_specs")
        assert document_specs is not None, "document_specs should not be None"
        assert isinstance(document_specs, list), "document_specs should be a list"
        assert len(document_specs) == 2, f"Expected 2 document_specs, got {len(document_specs)}"
        
        required_keys = ["key", "name", "why_needed", "format", "mandatory"]
        for i, doc in enumerate(document_specs):
            for key in required_keys:
                assert key in doc, f"document_specs[{i}] missing key: {key}"
        
        print(f"✓ VAT_OPEN_PF document_specs: {len(document_specs)} items with all required fields")
        for doc in document_specs:
            print(f"  - {doc.get('key')}: {doc.get('name')} (mandatory={doc.get('mandatory')})")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST: GET /api/catalog/STATUS_UPDATE - Internal support
    # ═══════════════════════════════════════════════════════════════
    
    def test_status_update_category_and_procedure_type(self):
        """STATUS_UPDATE: category=informativo, procedure_type=internal_support"""
        response = self.session.get(f"{BASE_URL}/api/catalog/STATUS_UPDATE")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        entry = response.json()
        assert entry.get("category") == "informativo", f"Expected category=informativo, got {entry.get('category')}"
        assert entry.get("procedure_type") == "internal_support", f"Expected procedure_type=internal_support, got {entry.get('procedure_type')}"
        print(f"✓ STATUS_UPDATE: category={entry.get('category')}, procedure_type={entry.get('procedure_type')}")
    
    def test_status_update_no_official_action(self):
        """STATUS_UPDATE: official_action=None, auth_method=None, proof_expected=None"""
        response = self.session.get(f"{BASE_URL}/api/catalog/STATUS_UPDATE")
        assert response.status_code == 200
        
        entry = response.json()
        assert entry.get("official_action") is None, f"Expected official_action=None, got {entry.get('official_action')}"
        assert entry.get("auth_method") is None, f"Expected auth_method=None, got {entry.get('auth_method')}"
        assert entry.get("proof_expected") is None, f"Expected proof_expected=None, got {entry.get('proof_expected')}"
        print(f"✓ STATUS_UPDATE: official_action=None, auth_method=None, proof_expected=None")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST: GET /api/catalog/COMPANY_CLOSURE - Complex official procedure
    # ═══════════════════════════════════════════════════════════════
    
    def test_company_closure_category_and_procedure_type(self):
        """COMPANY_CLOSURE: category=societario, procedure_type=official_procedure"""
        response = self.session.get(f"{BASE_URL}/api/catalog/COMPANY_CLOSURE")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        entry = response.json()
        assert entry.get("category") == "societario", f"Expected category=societario, got {entry.get('category')}"
        assert entry.get("procedure_type") == "official_procedure", f"Expected procedure_type=official_procedure, got {entry.get('procedure_type')}"
        print(f"✓ COMPANY_CLOSURE: category={entry.get('category')}, procedure_type={entry.get('procedure_type')}")
    
    def test_company_closure_delegation_required(self):
        """COMPANY_CLOSURE: delegation_required=true"""
        response = self.session.get(f"{BASE_URL}/api/catalog/COMPANY_CLOSURE")
        assert response.status_code == 200
        
        entry = response.json()
        assert entry.get("delegation_required") == True, f"Expected delegation_required=True, got {entry.get('delegation_required')}"
        print(f"✓ COMPANY_CLOSURE: delegation_required={entry.get('delegation_required')}")
    
    def test_company_closure_document_specs(self):
        """COMPANY_CLOSURE: has 5 document_specs with why_needed for each"""
        response = self.session.get(f"{BASE_URL}/api/catalog/COMPANY_CLOSURE")
        assert response.status_code == 200
        
        entry = response.json()
        document_specs = entry.get("document_specs")
        assert document_specs is not None, "document_specs should not be None"
        assert isinstance(document_specs, list), "document_specs should be a list"
        assert len(document_specs) == 5, f"Expected 5 document_specs, got {len(document_specs)}"
        
        for i, doc in enumerate(document_specs):
            assert "why_needed" in doc, f"document_specs[{i}] missing why_needed"
            assert doc["why_needed"] is not None and len(doc["why_needed"]) > 0, f"document_specs[{i}].why_needed should not be empty"
        
        print(f"✓ COMPANY_CLOSURE document_specs: {len(document_specs)} items, all with why_needed")
        for doc in document_specs:
            print(f"  - {doc.get('key')}: {doc.get('name')}")
            print(f"    why_needed: {doc.get('why_needed')[:50]}...")
    
    def test_company_closure_proof_expected_timing_delayed(self):
        """COMPANY_CLOSURE: proof_expected timing=delayed"""
        response = self.session.get(f"{BASE_URL}/api/catalog/COMPANY_CLOSURE")
        assert response.status_code == 200
        
        entry = response.json()
        proof_expected = entry.get("proof_expected")
        assert proof_expected is not None, "proof_expected should not be None"
        assert proof_expected.get("timing") == "delayed", f"Expected timing=delayed, got {proof_expected.get('timing')}"
        print(f"✓ COMPANY_CLOSURE proof_expected: timing={proof_expected.get('timing')}")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST: GET /api/catalog - All entries
    # ═══════════════════════════════════════════════════════════════
    
    def test_catalog_returns_all_20_entries(self):
        """GET /api/catalog returns all 20 entries"""
        response = self.session.get(f"{BASE_URL}/api/catalog")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        entries = response.json()
        assert isinstance(entries, list), "Response should be a list"
        assert len(entries) == 20, f"Expected 20 entries, got {len(entries)}"
        
        # List all practice_ids
        practice_ids = [e.get("practice_id") for e in entries]
        print(f"✓ GET /api/catalog returns {len(entries)} entries")
        print(f"  Practice IDs: {practice_ids}")
    
    # ═══════════════════════════════════════════════════════════════
    # TEST: VAT_DECLARATION - who_acts with user_signs and delegation_possible
    # ═══════════════════════════════════════════════════════════════
    
    def test_vat_declaration_who_acts(self):
        """VAT_DECLARATION: who_acts has user_signs=true, delegation_possible=true"""
        response = self.session.get(f"{BASE_URL}/api/catalog/VAT_DECLARATION")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        entry = response.json()
        who_acts = entry.get("who_acts")
        assert who_acts is not None, "who_acts should not be None"
        
        assert who_acts.get("user_signs") == True, f"Expected user_signs=True, got {who_acts.get('user_signs')}"
        assert who_acts.get("delegation_possible") == True, f"Expected delegation_possible=True, got {who_acts.get('delegation_possible')}"
        
        print(f"✓ VAT_DECLARATION who_acts: user_signs={who_acts.get('user_signs')}, delegation_possible={who_acts.get('delegation_possible')}")


class TestCatalogCategoriesStructure:
    """Additional tests for category structure"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get session with auth cookies"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        yield
        self.session.post(f"{BASE_URL}/api/auth/logout")
    
    def test_all_categories_have_required_fields(self):
        """All categories have id, label, description, icon, is_official, procedure_count"""
        response = self.session.get(f"{BASE_URL}/api/catalog/categories")
        assert response.status_code == 200
        
        categories = response.json()
        required_fields = ["id", "label", "description", "icon", "is_official", "procedure_count"]
        
        for cat in categories:
            for field in required_fields:
                assert field in cat, f"Category {cat.get('id')} missing field: {field}"
        
        print(f"✓ All {len(categories)} categories have required fields: {required_fields}")
    
    def test_official_categories(self):
        """fiscale, previdenziale, societario are official; documentale, informativo are not"""
        response = self.session.get(f"{BASE_URL}/api/catalog/categories")
        assert response.status_code == 200
        
        categories = response.json()
        categories_dict = {cat["id"]: cat for cat in categories}
        
        official_expected = {
            "fiscale": True,
            "previdenziale": True,
            "societario": True,
            "documentale": False,
            "informativo": False
        }
        
        for cat_id, expected_official in official_expected.items():
            actual = categories_dict[cat_id].get("is_official")
            assert actual == expected_official, f"Category {cat_id}: expected is_official={expected_official}, got {actual}"
            print(f"✓ Category {cat_id}: is_official={actual}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
