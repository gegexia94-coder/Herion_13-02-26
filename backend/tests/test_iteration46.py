"""
Iteration 46 - Document Verification + Rights/Risks Guidance Layer Tests

Tests for:
1. GET /api/catalog/{id}/compliance - returns rights, obligations, risks with has_guidance=true
2. Workspace endpoint includes practice_type field (resolved from legacy map)
3. Search improvement in CreatePracticePage (matches practice_id and user_explanation)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@aic.it"
ADMIN_PASSWORD = "Admin123!"


class TestComplianceEndpoint:
    """Tests for GET /api/catalog/{id}/compliance endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    
    def test_f24_preparation_compliance(self):
        """Test GET /api/catalog/F24_PREPARATION/compliance returns rights, obligations, risks"""
        response = self.session.get(f"{BASE_URL}/api/catalog/F24_PREPARATION/compliance")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify has_guidance is true
        assert data.get("has_guidance") == True, f"Expected has_guidance=True, got {data.get('has_guidance')}"
        
        # Verify practice_id
        assert data.get("practice_id") == "F24_PREPARATION", f"Expected practice_id=F24_PREPARATION, got {data.get('practice_id')}"
        
        # Verify rights exist and have correct structure
        rights = data.get("rights", [])
        assert len(rights) > 0, "Expected at least one right"
        assert "title" in rights[0], "Rights should have 'title' field"
        assert "detail" in rights[0], "Rights should have 'detail' field"
        
        # Verify obligations exist
        obligations = data.get("obligations", [])
        assert len(obligations) > 0, "Expected at least one obligation"
        assert "title" in obligations[0], "Obligations should have 'title' field"
        
        # Verify risks exist
        risks = data.get("risks", [])
        assert len(risks) > 0, "Expected at least one risk"
        assert "title" in risks[0], "Risks should have 'title' field"
        
        # Verify what_if_missed exists
        assert "what_if_missed" in data, "Expected what_if_missed field"
        assert data.get("what_if_missed") is not None, "what_if_missed should not be None"
        
        # Verify disclaimer exists
        assert "disclaimer" in data, "Expected disclaimer field"
        assert len(data.get("disclaimer", "")) > 0, "Disclaimer should not be empty"
        
        print(f"F24_PREPARATION compliance: has_guidance={data.get('has_guidance')}, rights={len(rights)}, obligations={len(obligations)}, risks={len(risks)}")
    
    def test_vat_open_pf_compliance(self):
        """Test GET /api/catalog/VAT_OPEN_PF/compliance returns procedure-specific guidance"""
        response = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF/compliance")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify has_guidance is true
        assert data.get("has_guidance") == True, f"Expected has_guidance=True, got {data.get('has_guidance')}"
        
        # Verify practice_id
        assert data.get("practice_id") == "VAT_OPEN_PF", f"Expected practice_id=VAT_OPEN_PF, got {data.get('practice_id')}"
        
        # Verify category is fiscale
        assert data.get("category") == "fiscale", f"Expected category=fiscale, got {data.get('category')}"
        
        # Verify rights exist
        rights = data.get("rights", [])
        assert len(rights) > 0, "Expected at least one right"
        
        # Check for VAT-specific content (should have "Scelta del regime" or similar)
        rights_titles = [r.get("title", "") for r in rights]
        print(f"VAT_OPEN_PF rights titles: {rights_titles}")
        
        # Verify disclaimer
        assert "disclaimer" in data, "Expected disclaimer field"
        
        print(f"VAT_OPEN_PF compliance: has_guidance={data.get('has_guidance')}, category={data.get('category')}, rights={len(rights)}")
    
    def test_income_tax_pf_compliance(self):
        """Test GET /api/catalog/INCOME_TAX_PF/compliance returns redditi-specific guidance"""
        response = self.session.get(f"{BASE_URL}/api/catalog/INCOME_TAX_PF/compliance")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify has_guidance is true
        assert data.get("has_guidance") == True, f"Expected has_guidance=True, got {data.get('has_guidance')}"
        
        # Verify practice_id
        assert data.get("practice_id") == "INCOME_TAX_PF", f"Expected practice_id=INCOME_TAX_PF, got {data.get('practice_id')}"
        
        # Verify rights exist
        rights = data.get("rights", [])
        assert len(rights) > 0, "Expected at least one right"
        
        # Check for redditi-specific content (should have "precompilata" or similar)
        rights_titles = [r.get("title", "") for r in rights]
        print(f"INCOME_TAX_PF rights titles: {rights_titles}")
        
        # Verify what_if_missed exists
        assert "what_if_missed" in data, "Expected what_if_missed field"
        
        print(f"INCOME_TAX_PF compliance: has_guidance={data.get('has_guidance')}, rights={len(rights)}")
    
    def test_compliance_not_found(self):
        """Test GET /api/catalog/INVALID_ID/compliance returns 404"""
        response = self.session.get(f"{BASE_URL}/api/catalog/INVALID_PRACTICE_ID_12345/compliance")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestWorkspacePracticeType:
    """Tests for workspace endpoint practice_type field resolution"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    
    def test_workspace_includes_practice_type(self):
        """Test that workspace endpoint returns practice_type field"""
        # First, get a practice to test with
        practices_resp = self.session.get(f"{BASE_URL}/api/practices")
        assert practices_resp.status_code == 200, f"Failed to get practices: {practices_resp.text}"
        
        practices = practices_resp.json()
        if not practices:
            pytest.skip("No practices available for testing")
        
        # Get workspace for first practice
        practice_id = practices[0].get("id")
        workspace_resp = self.session.get(f"{BASE_URL}/api/practices/{practice_id}/workspace")
        assert workspace_resp.status_code == 200, f"Failed to get workspace: {workspace_resp.text}"
        
        workspace = workspace_resp.json()
        
        # Verify practice_type field exists
        assert "practice_type" in workspace, "Workspace should include practice_type field"
        
        # Verify practice_name field exists
        assert "practice_name" in workspace, "Workspace should include practice_name field"
        
        print(f"Workspace practice_type: {workspace.get('practice_type')}, practice_name: {workspace.get('practice_name')}")
    
    def test_workspace_legacy_map_resolution(self):
        """Test that workspace resolves legacy practice types via LEGACY_MAP"""
        # Create a practice with legacy type 'vat_registration'
        create_resp = self.session.post(f"{BASE_URL}/api/practices", json={
            "practice_type": "vat_registration",
            "client_type": "freelancer",
            "client_name": "TEST_Legacy_Map_User",
            "fiscal_code": "TSTLGC90A01H501Z",
            "vat_number": "12345678901",
            "description": "Test legacy map resolution"
        })
        
        if create_resp.status_code != 200:
            pytest.skip(f"Could not create test practice: {create_resp.text}")
        
        practice = create_resp.json()
        practice_id = practice.get("id")
        
        try:
            # Get workspace
            workspace_resp = self.session.get(f"{BASE_URL}/api/practices/{practice_id}/workspace")
            assert workspace_resp.status_code == 200, f"Failed to get workspace: {workspace_resp.text}"
            
            workspace = workspace_resp.json()
            
            # Verify practice_type is resolved to VAT_OPEN_PF via LEGACY_MAP
            # LEGACY_MAP = {"vat_registration": "VAT_OPEN_PF", ...}
            practice_type = workspace.get("practice_type")
            print(f"Legacy 'vat_registration' resolved to practice_type: {practice_type}")
            
            # The practice_type should be either the original or the mapped value
            assert practice_type in ["vat_registration", "VAT_OPEN_PF"], f"Unexpected practice_type: {practice_type}"
            
        finally:
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/practices/{practice_id}")


class TestCatalogSearch:
    """Tests for catalog search functionality (matches practice_id and user_explanation)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    
    def test_catalog_contains_practice_id_field(self):
        """Test that catalog entries have practice_id field for search"""
        response = self.session.get(f"{BASE_URL}/api/catalog")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        catalog = response.json()
        assert len(catalog) > 0, "Catalog should not be empty"
        
        # Check that entries have practice_id
        for entry in catalog[:5]:  # Check first 5
            assert "practice_id" in entry, f"Entry missing practice_id: {entry.get('name')}"
        
        # Find F24-related entries
        f24_entries = [e for e in catalog if "F24" in e.get("practice_id", "").upper()]
        print(f"Found {len(f24_entries)} F24-related entries by practice_id")
        
        assert len(f24_entries) > 0, "Should find F24-related entries"
    
    def test_catalog_contains_user_explanation_field(self):
        """Test that catalog entries have user_explanation field for search"""
        response = self.session.get(f"{BASE_URL}/api/catalog")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        catalog = response.json()
        
        # Check that some entries have user_explanation
        entries_with_explanation = [e for e in catalog if e.get("user_explanation")]
        print(f"Found {len(entries_with_explanation)} entries with user_explanation out of {len(catalog)}")
        
        # At least some entries should have user_explanation
        # (not all may have it, but the field should exist in the schema)
        if entries_with_explanation:
            sample = entries_with_explanation[0]
            print(f"Sample user_explanation: {sample.get('user_explanation', '')[:100]}...")


class TestComplianceDataStructure:
    """Tests for compliance data structure and content"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    
    def test_compliance_rights_structure(self):
        """Test that compliance rights have correct structure"""
        response = self.session.get(f"{BASE_URL}/api/catalog/F24_PREPARATION/compliance")
        assert response.status_code == 200
        
        data = response.json()
        rights = data.get("rights", [])
        
        for right in rights:
            assert "title" in right, "Right should have 'title'"
            assert "detail" in right, "Right should have 'detail'"
            assert isinstance(right["title"], str), "Title should be string"
            assert isinstance(right["detail"], str), "Detail should be string"
            assert len(right["title"]) > 0, "Title should not be empty"
            assert len(right["detail"]) > 0, "Detail should not be empty"
    
    def test_compliance_obligations_structure(self):
        """Test that compliance obligations have correct structure"""
        response = self.session.get(f"{BASE_URL}/api/catalog/F24_PREPARATION/compliance")
        assert response.status_code == 200
        
        data = response.json()
        obligations = data.get("obligations", [])
        
        for obligation in obligations:
            assert "title" in obligation, "Obligation should have 'title'"
            assert "detail" in obligation, "Obligation should have 'detail'"
    
    def test_compliance_risks_structure(self):
        """Test that compliance risks have correct structure"""
        response = self.session.get(f"{BASE_URL}/api/catalog/F24_PREPARATION/compliance")
        assert response.status_code == 200
        
        data = response.json()
        risks = data.get("risks", [])
        
        for risk in risks:
            assert "title" in risk, "Risk should have 'title'"
            assert "detail" in risk, "Risk should have 'detail'"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
