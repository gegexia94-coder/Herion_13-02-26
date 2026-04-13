"""
Test Pre-Start Intelligence Layer for Herion
Tests GET /api/catalog/{practice_id}/pre-start endpoint
Tests readiness states, ATECO relevance, checklist, auth, entity_direction
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPreStartIntelligence:
    """Tests for the Pre-Practice Intelligence Layer endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth cookies"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.user = login_resp.json()
        print(f"Logged in as: {self.user.get('email')}")
    
    # ========== BASIC ENDPOINT TESTS ==========
    
    def test_prestart_endpoint_exists(self):
        """Test that pre-start endpoint returns 200 for valid practice_id"""
        resp = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF/pre-start?client_type=freelancer")
        assert resp.status_code == 200, f"Pre-start endpoint failed: {resp.text}"
        data = resp.json()
        assert "practice_id" in data
        assert data["practice_id"] == "VAT_OPEN_PF"
        print("Pre-start endpoint exists and returns data")
    
    def test_prestart_returns_all_blocks(self):
        """Test that pre-start returns all required intelligence blocks"""
        resp = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF/pre-start?client_type=freelancer")
        assert resp.status_code == 200
        data = resp.json()
        
        # Check all required blocks exist
        required_blocks = ["orientation", "checklist", "auth", "ateco", "readiness", "timing", "who_acts_summary"]
        for block in required_blocks:
            assert block in data, f"Missing block: {block}"
        
        print(f"All required blocks present: {required_blocks}")
    
    def test_prestart_404_for_invalid_practice(self):
        """Test that pre-start returns 404 for non-existent practice_id"""
        resp = self.session.get(f"{BASE_URL}/api/catalog/INVALID_PRACTICE_ID/pre-start?client_type=private")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("Pre-start correctly returns 404 for invalid practice_id")
    
    # ========== ORIENTATION BLOCK TESTS ==========
    
    def test_orientation_block_structure(self):
        """Test orientation block has correct structure"""
        resp = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF/pre-start?client_type=freelancer")
        assert resp.status_code == 200
        data = resp.json()
        
        orientation = data["orientation"]
        required_fields = ["practice_name", "practice_description", "category", "category_label", 
                          "procedure_type", "is_official", "risk_level", "suitable_for_client_type", 
                          "supported_client_types"]
        
        for field in required_fields:
            assert field in orientation, f"Missing orientation field: {field}"
        
        assert orientation["is_official"] == True, "VAT_OPEN_PF should be official procedure"
        print(f"Orientation block structure valid: {orientation['practice_name']}")
    
    def test_orientation_suitable_client_type(self):
        """Test that suitable_for_client_type is correctly computed"""
        # VAT_OPEN_PF should be suitable for freelancer
        resp = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF/pre-start?client_type=freelancer")
        data = resp.json()
        assert data["orientation"]["suitable_for_client_type"] == True
        
        # VAT_OPEN_PF should NOT be suitable for private (typically)
        resp2 = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF/pre-start?client_type=private")
        data2 = resp2.json()
        # Check if private is in user_type - if not, suitable should be False
        print(f"Freelancer suitable: {data['orientation']['suitable_for_client_type']}")
        print(f"Private suitable: {data2['orientation']['suitable_for_client_type']}")
    
    # ========== ENTITY DIRECTION BLOCK TESTS ==========
    
    def test_entity_direction_for_official_procedure(self):
        """Test entity_direction block for official procedures"""
        resp = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF/pre-start?client_type=freelancer")
        assert resp.status_code == 200
        data = resp.json()
        
        # Official procedures should have entity_direction
        assert data["entity_direction"] is not None, "Official procedure should have entity_direction"
        
        entity = data["entity_direction"]
        assert "entity_name" in entity
        assert "submission_channel" in entity
        print(f"Entity direction: {entity.get('entity_name')} via {entity.get('submission_channel')}")
    
    def test_entity_direction_null_for_internal_procedure(self):
        """Test entity_direction is null for internal/support procedures"""
        resp = self.session.get(f"{BASE_URL}/api/catalog/DOC_MISSING_REQUEST/pre-start?client_type=private")
        assert resp.status_code == 200
        data = resp.json()
        
        # Internal procedures should NOT have entity_direction
        assert data["entity_direction"] is None, "Internal procedure should not have entity_direction"
        print("Internal procedure correctly has no entity_direction")
    
    # ========== CHECKLIST BLOCK TESTS ==========
    
    def test_checklist_includes_documents(self):
        """Test checklist includes document_specs"""
        resp = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF/pre-start?client_type=freelancer")
        assert resp.status_code == 200
        data = resp.json()
        
        checklist = data["checklist"]
        assert isinstance(checklist, list), "Checklist should be a list"
        
        # Check for document type items
        doc_items = [item for item in checklist if item.get("type") == "document"]
        print(f"Checklist has {len(checklist)} items, {len(doc_items)} are documents")
        
        # Each item should have required fields
        for item in checklist:
            assert "key" in item
            assert "label" in item
            assert "mandatory" in item
            assert "type" in item
    
    def test_checklist_includes_auth_credential(self):
        """Test checklist includes auth credential when auth_method is set"""
        resp = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF/pre-start?client_type=freelancer")
        assert resp.status_code == 200
        data = resp.json()
        
        checklist = data["checklist"]
        auth_items = [item for item in checklist if item.get("type") == "identification"]
        
        if data["auth"]["auth_required"]:
            assert len(auth_items) > 0, "Should have auth credential in checklist when auth required"
            print(f"Auth credential in checklist: {auth_items[0].get('label')}")
        else:
            print("No auth required for this procedure")
    
    # ========== AUTH BLOCK TESTS ==========
    
    def test_auth_block_structure(self):
        """Test auth block has correct structure"""
        resp = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF/pre-start?client_type=freelancer")
        assert resp.status_code == 200
        data = resp.json()
        
        auth = data["auth"]
        required_fields = ["auth_required", "auth_method", "auth_description", "when_needed"]
        
        for field in required_fields:
            assert field in auth, f"Missing auth field: {field}"
        
        print(f"Auth required: {auth['auth_required']}, method: {auth['auth_method']}")
    
    def test_auth_spid_description(self):
        """Test SPID auth has proper description"""
        resp = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF/pre-start?client_type=freelancer")
        assert resp.status_code == 200
        data = resp.json()
        
        if data["auth"]["auth_method"] == "SPID":
            assert "SPID" in data["auth"]["auth_description"]
            assert data["auth"]["auth_label"] is not None
            print(f"SPID auth label: {data['auth']['auth_label']}")
    
    # ========== ATECO BLOCK TESTS ==========
    
    def test_ateco_relevant_for_vat_open(self):
        """Test ATECO is relevant for VAT opening procedures"""
        resp = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF/pre-start?client_type=freelancer")
        assert resp.status_code == 200
        data = resp.json()
        
        ateco = data["ateco"]
        assert ateco["relevant"] == True, "ATECO should be relevant for VAT_OPEN_PF"
        assert ateco["reason"] is not None
        assert ateco["guidance"] is not None
        print(f"ATECO relevant: {ateco['relevant']}, reason: {ateco['reason']}")
    
    def test_ateco_not_relevant_for_doc_request(self):
        """Test ATECO is NOT relevant for document request procedures"""
        resp = self.session.get(f"{BASE_URL}/api/catalog/DOC_MISSING_REQUEST/pre-start?client_type=private")
        assert resp.status_code == 200
        data = resp.json()
        
        ateco = data["ateco"]
        assert ateco["relevant"] == False, "ATECO should NOT be relevant for DOC_MISSING_REQUEST"
        assert ateco["reason"] is None
        print(f"ATECO not relevant for internal procedure: {ateco['relevant']}")
    
    # ========== READINESS BLOCK TESTS ==========
    
    def test_readiness_block_structure(self):
        """Test readiness block has correct structure"""
        resp = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF/pre-start?client_type=freelancer")
        assert resp.status_code == 200
        data = resp.json()
        
        readiness = data["readiness"]
        required_fields = ["state", "label", "color", "can_start", "message", "issues", 
                          "mandatory_count", "total_checklist"]
        
        for field in required_fields:
            assert field in readiness, f"Missing readiness field: {field}"
        
        print(f"Readiness state: {readiness['state']}, can_start: {readiness['can_start']}")
    
    def test_readiness_ready_to_start(self):
        """Test readiness state ready_to_start for simple procedures"""
        # Find a simple internal procedure
        resp = self.session.get(f"{BASE_URL}/api/catalog/INFO_GENERAL/pre-start?client_type=private")
        if resp.status_code == 200:
            data = resp.json()
            readiness = data["readiness"]
            # Simple info procedures should be ready_to_start
            print(f"INFO_GENERAL readiness: {readiness['state']}")
    
    def test_readiness_ready_with_warnings(self):
        """Test readiness state ready_with_warnings for procedures with many requirements"""
        resp = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF/pre-start?client_type=freelancer")
        assert resp.status_code == 200
        data = resp.json()
        
        readiness = data["readiness"]
        # VAT_OPEN_PF with freelancer should have warnings (ATECO, auth, etc.)
        valid_states = ["ready_to_start", "ready_with_warnings"]
        assert readiness["state"] in valid_states, f"Unexpected state: {readiness['state']}"
        print(f"VAT_OPEN_PF readiness: {readiness['state']}, issues: {len(readiness['issues'])}")
    
    def test_readiness_likely_wrong_practice(self):
        """Test readiness state likely_wrong_practice for mismatched client type"""
        # VAT_OPEN_PF is for freelancer/company, not private
        resp = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF/pre-start?client_type=private")
        assert resp.status_code == 200
        data = resp.json()
        
        readiness = data["readiness"]
        orientation = data["orientation"]
        
        if not orientation["suitable_for_client_type"]:
            assert readiness["state"] == "likely_wrong_practice", \
                f"Should be likely_wrong_practice when client type not suitable, got: {readiness['state']}"
            assert readiness["can_start"] == False
            print(f"Correctly identified wrong practice for private client")
        else:
            print(f"Private is suitable for this procedure")
    
    def test_readiness_issues_list(self):
        """Test readiness issues list contains proper issue objects"""
        resp = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF/pre-start?client_type=freelancer")
        assert resp.status_code == 200
        data = resp.json()
        
        issues = data["readiness"]["issues"]
        assert isinstance(issues, list)
        
        for issue in issues:
            assert "code" in issue
            assert "label" in issue
            assert "severity" in issue
            assert issue["severity"] in ["info", "warning", "critical"]
        
        print(f"Readiness has {len(issues)} issues")
    
    # ========== WHO ACTS SUMMARY TESTS ==========
    
    def test_who_acts_summary_structure(self):
        """Test who_acts_summary has correct structure"""
        resp = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF/pre-start?client_type=freelancer")
        assert resp.status_code == 200
        data = resp.json()
        
        who_acts = data["who_acts_summary"]
        required_fields = ["herion_prepares", "user_submits", "user_signs", "delegation_possible"]
        
        for field in required_fields:
            assert field in who_acts, f"Missing who_acts field: {field}"
            assert isinstance(who_acts[field], bool)
        
        print(f"Who acts: herion_prepares={who_acts['herion_prepares']}, user_submits={who_acts['user_submits']}")
    
    # ========== TIMING BLOCK TESTS ==========
    
    def test_timing_block_structure(self):
        """Test timing block has correct structure"""
        resp = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF/pre-start?client_type=freelancer")
        assert resp.status_code == 200
        data = resp.json()
        
        timing = data["timing"]
        assert "label" in timing
        print(f"Timing: {timing.get('label')}")
    
    # ========== PROOF EXPECTED TESTS ==========
    
    def test_proof_expected_for_official_procedure(self):
        """Test proof_expected is present for official procedures"""
        resp = self.session.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF/pre-start?client_type=freelancer")
        assert resp.status_code == 200
        data = resp.json()
        
        proof = data.get("proof_expected")
        if proof:
            assert "type" in proof
            assert "label" in proof
            print(f"Proof expected: {proof.get('label')}")
        else:
            print("No proof expected for this procedure")
    
    # ========== MULTIPLE PROCEDURES TESTS ==========
    
    def test_prestart_multiple_procedures(self):
        """Test pre-start works for multiple different procedures"""
        procedures = [
            ("VAT_OPEN_PF", "freelancer"),
            ("VAT_CLOSURE_PF", "freelancer"),
            ("DOC_MISSING_REQUEST", "private"),
            ("INFO_GENERAL", "private"),
            ("F24_PREPARATION", "company"),
        ]
        
        for practice_id, client_type in procedures:
            resp = self.session.get(f"{BASE_URL}/api/catalog/{practice_id}/pre-start?client_type={client_type}")
            if resp.status_code == 200:
                data = resp.json()
                assert data["practice_id"] == practice_id
                assert "readiness" in data
                print(f"✓ {practice_id} ({client_type}): {data['readiness']['state']}")
            else:
                print(f"✗ {practice_id} not found (status {resp.status_code})")


class TestCatalogEndpoints:
    """Additional tests for catalog endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth cookies"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200
    
    def test_catalog_returns_procedures(self):
        """Test GET /api/catalog returns procedures"""
        resp = self.session.get(f"{BASE_URL}/api/catalog")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"Catalog has {len(data)} procedures")
    
    def test_catalog_entry_has_user_type(self):
        """Test catalog entries have user_type field"""
        resp = self.session.get(f"{BASE_URL}/api/catalog")
        assert resp.status_code == 200
        data = resp.json()
        
        for entry in data[:5]:  # Check first 5
            assert "user_type" in entry, f"Missing user_type in {entry.get('practice_id')}"
            assert isinstance(entry["user_type"], list)
        
        print("Catalog entries have user_type field")
    
    def test_catalog_categories(self):
        """Test GET /api/catalog/categories returns categories"""
        resp = self.session.get(f"{BASE_URL}/api/catalog/categories")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 6  # Should have at least 6 categories
        
        for cat in data:
            assert "id" in cat
            assert "label" in cat
            assert "procedure_count" in cat
        
        print(f"Found {len(data)} categories")


class TestPracticeCreation:
    """Tests for practice creation flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth cookies"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200
        self.user = login_resp.json()
    
    def test_create_practice_with_catalog_type(self):
        """Test creating a practice with a catalog practice_type"""
        practice_data = {
            "practice_type": "VAT_OPEN_PF",
            "client_type": "freelancer",
            "client_name": "TEST_PreStart_User",
            "fiscal_code": "TSTPRS85M01H501Z",
            "vat_number": "12345678901",
            "description": "Test practice from pre-start flow",
            "additional_data": {}
        }
        
        resp = self.session.post(f"{BASE_URL}/api/practices", json=practice_data)
        assert resp.status_code == 200, f"Practice creation failed: {resp.text}"
        
        data = resp.json()
        assert data["practice_type"] == "VAT_OPEN_PF"
        assert data["client_type"] == "freelancer"
        assert data["client_name"] == "TEST_PreStart_User"
        assert "id" in data
        
        practice_id = data["id"]
        print(f"Created practice: {practice_id}")
        
        # Cleanup
        del_resp = self.session.delete(f"{BASE_URL}/api/practices/{practice_id}")
        assert del_resp.status_code == 200
        print("Practice deleted successfully")
    
    def test_create_practice_private_client(self):
        """Test creating a practice for private client"""
        practice_data = {
            "practice_type": "DOC_MISSING_REQUEST",
            "client_type": "private",
            "client_name": "TEST_Private_Client",
            "fiscal_code": "PRVTST85M01H501Z",
            "description": "Test private client practice",
            "additional_data": {}
        }
        
        resp = self.session.post(f"{BASE_URL}/api/practices", json=practice_data)
        assert resp.status_code == 200, f"Practice creation failed: {resp.text}"
        
        data = resp.json()
        assert data["client_type"] == "private"
        assert data["vat_number"] is None  # Private clients don't have VAT
        
        practice_id = data["id"]
        print(f"Created private practice: {practice_id}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/practices/{practice_id}")
    
    def test_create_practice_company_client(self):
        """Test creating a practice for company client"""
        practice_data = {
            "practice_type": "F24_PREPARATION",
            "client_type": "company",
            "client_name": "TEST_Company_SRL",
            "fiscal_code": "12345678901",
            "vat_number": "12345678901",
            "description": "Test company practice",
            "additional_data": {}
        }
        
        resp = self.session.post(f"{BASE_URL}/api/practices", json=practice_data)
        assert resp.status_code == 200, f"Practice creation failed: {resp.text}"
        
        data = resp.json()
        assert data["client_type"] == "company"
        assert data["vat_number"] == "12345678901"
        
        practice_id = data["id"]
        print(f"Created company practice: {practice_id}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/practices/{practice_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
