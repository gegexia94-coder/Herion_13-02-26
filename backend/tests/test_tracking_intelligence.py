"""
Test suite for Tracking & Status Intelligence Layer
Tests tracking endpoints, workspace tracking block, and proof auto-population
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTrackingIntelligence:
    """Tests for Tracking & Status Intelligence Layer"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.user = login_response.json()
        
        # Get practices to find test practice
        practices_response = self.session.get(f"{BASE_URL}/api/practices")
        assert practices_response.status_code == 200
        self.practices = practices_response.json()
        
        # First practice has tracking data (d9c4fca6-a27d-4f97-a006-d191505549f9)
        self.practice_with_tracking = None
        self.practice_without_tracking = None
        
        for p in self.practices:
            if p.get("id") == "d9c4fca6-a27d-4f97-a006-d191505549f9":
                self.practice_with_tracking = p
            elif not self.practice_without_tracking:
                self.practice_without_tracking = p
        
        yield
    
    # ========================
    # WORKSPACE TRACKING BLOCK TESTS
    # ========================
    
    def test_workspace_returns_tracking_block(self):
        """GET /api/practices/{id}/workspace returns tracking intelligence block"""
        if not self.practice_with_tracking:
            pytest.skip("No practice with tracking found")
        
        response = self.session.get(f"{BASE_URL}/api/practices/{self.practice_with_tracking['id']}/workspace")
        assert response.status_code == 200, f"Workspace failed: {response.text}"
        
        data = response.json()
        assert "tracking" in data, "Workspace should contain tracking block"
        
        tracking = data["tracking"]
        # Verify all required fields exist
        required_fields = [
            "has_reference", "tracked_state", "tracked_state_label",
            "status_explanation", "next_expected_step", "mini_timeline"
        ]
        for field in required_fields:
            assert field in tracking, f"Tracking block missing field: {field}"
        
        print(f"Tracking block fields: {list(tracking.keys())}")
    
    def test_workspace_tracking_with_reference(self):
        """Workspace tracking block shows reference details when available"""
        if not self.practice_with_tracking:
            pytest.skip("No practice with tracking found")
        
        response = self.session.get(f"{BASE_URL}/api/practices/{self.practice_with_tracking['id']}/workspace")
        assert response.status_code == 200
        
        tracking = response.json()["tracking"]
        
        # Practice d9c4fca6 has protocol_number 2026-PROT-00451
        assert tracking["has_reference"] == True, "Practice should have reference"
        assert tracking["identifier_type"] == "protocol_number"
        assert tracking["identifier_value"] == "2026-PROT-00451"
        assert tracking["identifier_type_label"] is not None
        assert tracking["tracked_state"] == "verified"
        assert tracking["tracked_state_label"] is not None
        
        print(f"Reference: {tracking['identifier_type_label']} = {tracking['identifier_value']}")
        print(f"State: {tracking['tracked_state_label']}")
    
    def test_workspace_tracking_without_reference(self):
        """Workspace tracking block shows not_available state when no reference"""
        if not self.practice_without_tracking:
            pytest.skip("No practice without tracking found")
        
        response = self.session.get(f"{BASE_URL}/api/practices/{self.practice_without_tracking['id']}/workspace")
        assert response.status_code == 200
        
        tracking = response.json()["tracking"]
        
        # Should show not_available or pending state
        assert tracking["has_reference"] == False or tracking["tracked_state"] in ["not_available", "pending_acquisition"]
        assert tracking["status_explanation"] is not None
        
        print(f"State without reference: {tracking['tracked_state']}")
    
    def test_workspace_tracking_mini_timeline(self):
        """Workspace tracking block includes mini_timeline milestones"""
        if not self.practice_with_tracking:
            pytest.skip("No practice with tracking found")
        
        response = self.session.get(f"{BASE_URL}/api/practices/{self.practice_with_tracking['id']}/workspace")
        assert response.status_code == 200
        
        tracking = response.json()["tracking"]
        
        assert "mini_timeline" in tracking
        assert isinstance(tracking["mini_timeline"], list)
        assert len(tracking["mini_timeline"]) > 0
        
        # Each milestone should have key, label, status
        for milestone in tracking["mini_timeline"]:
            assert "key" in milestone
            assert "label" in milestone
            assert "status" in milestone
            assert milestone["status"] in ["done", "current", "pending"]
        
        print(f"Mini timeline: {[m['label'] for m in tracking['mini_timeline']]}")
    
    def test_workspace_tracking_entity_info(self):
        """Workspace tracking block includes entity information from catalog"""
        if not self.practice_with_tracking:
            pytest.skip("No practice with tracking found")
        
        response = self.session.get(f"{BASE_URL}/api/practices/{self.practice_with_tracking['id']}/workspace")
        assert response.status_code == 200
        
        tracking = response.json()["tracking"]
        
        # Entity info comes from catalog
        if tracking.get("entity_name"):
            assert isinstance(tracking["entity_name"], str)
            print(f"Entity name: {tracking['entity_name']}")
        
        if tracking.get("entity_state"):
            assert tracking.get("entity_state_label") is not None
            print(f"Entity state: {tracking['entity_state']} - {tracking['entity_state_label']}")
    
    # ========================
    # TRACKING ENDPOINT TESTS
    # ========================
    
    def test_get_tracking_status(self):
        """GET /api/practices/{id}/tracking returns full tracking intelligence"""
        if not self.practice_with_tracking:
            pytest.skip("No practice with tracking found")
        
        response = self.session.get(f"{BASE_URL}/api/practices/{self.practice_with_tracking['id']}/tracking")
        assert response.status_code == 200, f"Get tracking failed: {response.text}"
        
        tracking = response.json()
        
        # Verify structure matches workspace tracking block
        assert "has_reference" in tracking
        assert "tracked_state" in tracking
        assert "tracked_state_label" in tracking
        assert "status_explanation" in tracking
        assert "next_expected_step" in tracking
        
        print(f"Tracking status: {tracking['tracked_state_label']}")
    
    def test_add_tracking_reference(self):
        """POST /api/practices/{id}/tracking - Add tracking reference"""
        # Create a new practice for this test
        create_response = self.session.post(f"{BASE_URL}/api/practices", json={
            "practice_type": "VAT_REGISTRATION",
            "client_name": "TEST_Tracking_Client",
            "country": "Italia",
            "description": "Test practice for tracking"
        })
        assert create_response.status_code in [200, 201], f"Create practice failed: {create_response.text}"
        new_practice = create_response.json()
        practice_id = new_practice["id"]
        
        try:
            # Add tracking reference
            tracking_response = self.session.post(f"{BASE_URL}/api/practices/{practice_id}/tracking", json={
                "identifier_type": "protocol_number",
                "identifier_value": "TEST-2026-PROT-99999"
            })
            assert tracking_response.status_code == 200, f"Add tracking failed: {tracking_response.text}"
            
            result = tracking_response.json()
            assert "tracking" in result
            assert result["tracking"]["identifier_type"] == "protocol_number"
            assert result["tracking"]["identifier_value"] == "TEST-2026-PROT-99999"
            assert result["tracking"]["tracked_state"] == "acquired"
            
            # Verify via GET
            get_response = self.session.get(f"{BASE_URL}/api/practices/{practice_id}/tracking")
            assert get_response.status_code == 200
            tracking = get_response.json()
            assert tracking["has_reference"] == True
            assert tracking["identifier_value"] == "TEST-2026-PROT-99999"
            
            print(f"Added tracking reference: {result['tracking']['identifier_type_label']} = {result['tracking']['identifier_value']}")
        finally:
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/practices/{practice_id}")
    
    def test_add_tracking_reference_invalid_type(self):
        """POST /api/practices/{id}/tracking - Invalid identifier type returns 400"""
        if not self.practice_without_tracking:
            pytest.skip("No practice without tracking found")
        
        response = self.session.post(f"{BASE_URL}/api/practices/{self.practice_without_tracking['id']}/tracking", json={
            "identifier_type": "invalid_type",
            "identifier_value": "TEST-VALUE"
        })
        assert response.status_code == 400, f"Should return 400 for invalid type: {response.text}"
    
    def test_verify_tracking(self):
        """POST /api/practices/{id}/tracking/verify - Verify tracking"""
        # Create a new practice and add tracking
        create_response = self.session.post(f"{BASE_URL}/api/practices", json={
            "practice_type": "VAT_REGISTRATION",
            "client_name": "TEST_Verify_Tracking",
            "country": "Italia",
            "description": "Test practice for verify tracking"
        })
        assert create_response.status_code in [200, 201]
        practice_id = create_response.json()["id"]
        
        try:
            # Add tracking reference first
            self.session.post(f"{BASE_URL}/api/practices/{practice_id}/tracking", json={
                "identifier_type": "protocol_number",
                "identifier_value": "TEST-2026-VERIFY-001"
            })
            
            # Verify tracking
            verify_response = self.session.post(f"{BASE_URL}/api/practices/{practice_id}/tracking/verify", json={
                "verification_outcome": "confirmed",
                "entity_state": "processing",
                "notes": "Verified by test"
            })
            assert verify_response.status_code == 200, f"Verify tracking failed: {verify_response.text}"
            
            result = verify_response.json()
            assert "tracking" in result
            tracking = result["tracking"]
            assert tracking["tracked_state"] == "verified"
            assert tracking["entity_state"] == "processing"
            assert tracking["verification_summary"] is not None
            
            print(f"Verified tracking: state={tracking['tracked_state']}, entity_state={tracking['entity_state']}")
        finally:
            self.session.delete(f"{BASE_URL}/api/practices/{practice_id}")
    
    def test_verify_tracking_integration_requested(self):
        """POST /api/practices/{id}/tracking/verify - Integration requested outcome"""
        create_response = self.session.post(f"{BASE_URL}/api/practices", json={
            "practice_type": "VAT_REGISTRATION",
            "client_name": "TEST_Integration_Request",
            "country": "Italia",
            "description": "Test practice for integration request"
        })
        assert create_response.status_code in [200, 201]
        practice_id = create_response.json()["id"]
        
        try:
            # Add tracking reference
            self.session.post(f"{BASE_URL}/api/practices/{practice_id}/tracking", json={
                "identifier_type": "protocol_number",
                "identifier_value": "TEST-2026-INT-001"
            })
            
            # Verify with integration_requested
            verify_response = self.session.post(f"{BASE_URL}/api/practices/{practice_id}/tracking/verify", json={
                "verification_outcome": "integration_requested",
                "entity_state": "waiting_integration",
                "notes": "Entity requires additional documents"
            })
            assert verify_response.status_code == 200
            
            tracking = verify_response.json()["tracking"]
            assert tracking["tracked_state"] == "integration_requested"
            assert tracking["user_action_required"] == True
            
            print(f"Integration requested: user_action_required={tracking['user_action_required']}")
        finally:
            self.session.delete(f"{BASE_URL}/api/practices/{practice_id}")
    
    # ========================
    # PROOF AUTO-POPULATION TESTS
    # ========================
    
    def test_proof_upload_auto_populates_tracking(self):
        """POST /api/practices/{id}/proof auto-populates tracking when reference_code provided"""
        create_response = self.session.post(f"{BASE_URL}/api/practices", json={
            "practice_type": "VAT_REGISTRATION",
            "client_name": "TEST_Proof_AutoPopulate",
            "country": "Italia",
            "description": "Test practice for proof auto-populate"
        })
        assert create_response.status_code in [200, 201]
        practice_id = create_response.json()["id"]
        
        try:
            # Upload proof with reference_code
            proof_response = self.session.post(f"{BASE_URL}/api/practices/{practice_id}/proof", json={
                "proof_type": "protocol_number",
                "reference_code": "TEST-2026-AUTO-001",
                "notes": "Auto-populate test"
            })
            assert proof_response.status_code == 200, f"Proof upload failed: {proof_response.text}"
            
            # Verify tracking was auto-populated
            tracking_response = self.session.get(f"{BASE_URL}/api/practices/{practice_id}/tracking")
            assert tracking_response.status_code == 200
            
            tracking = tracking_response.json()
            assert tracking["has_reference"] == True
            assert tracking["identifier_value"] == "TEST-2026-AUTO-001"
            assert tracking["tracked_state"] == "acquired"
            
            print(f"Proof auto-populated tracking: {tracking['identifier_value']}")
        finally:
            self.session.delete(f"{BASE_URL}/api/practices/{practice_id}")
    
    def test_proof_upload_different_types_mapping(self):
        """Proof types map to correct tracking identifier types"""
        create_response = self.session.post(f"{BASE_URL}/api/practices", json={
            "practice_type": "VAT_REGISTRATION",
            "client_name": "TEST_Proof_Mapping",
            "country": "Italia",
            "description": "Test practice for proof mapping"
        })
        assert create_response.status_code in [200, 201]
        practice_id = create_response.json()["id"]
        
        try:
            # Upload PEC delivery proof
            proof_response = self.session.post(f"{BASE_URL}/api/practices/{practice_id}/proof", json={
                "proof_type": "pec_delivery",
                "reference_code": "PEC-2026-TEST-001"
            })
            assert proof_response.status_code == 200
            
            # Verify tracking type is pec_reference
            tracking = self.session.get(f"{BASE_URL}/api/practices/{practice_id}/tracking").json()
            assert tracking["identifier_type"] == "pec_reference"
            
            print(f"PEC proof mapped to: {tracking['identifier_type']}")
        finally:
            self.session.delete(f"{BASE_URL}/api/practices/{practice_id}")
    
    # ========================
    # TRACKING IDENTIFIER TYPES TESTS
    # ========================
    
    def test_all_tracking_identifier_types(self):
        """Test all valid tracking identifier types"""
        valid_types = [
            "domus_number", "protocol_number", "practice_number",
            "pec_reference", "receipt_code", "submission_reference", "payment_reference"
        ]
        
        for id_type in valid_types:
            create_response = self.session.post(f"{BASE_URL}/api/practices", json={
                "practice_type": "VAT_REGISTRATION",
                "client_name": f"TEST_Type_{id_type}",
                "country": "Italia",
                "description": f"Test practice for type {id_type}"
            })
            assert create_response.status_code in [200, 201]
            practice_id = create_response.json()["id"]
            
            try:
                response = self.session.post(f"{BASE_URL}/api/practices/{practice_id}/tracking", json={
                    "identifier_type": id_type,
                    "identifier_value": f"TEST-{id_type.upper()}-001"
                })
                assert response.status_code == 200, f"Failed for type {id_type}: {response.text}"
                
                result = response.json()
                assert result["tracking"]["identifier_type"] == id_type
                assert result["tracking"]["identifier_type_label"] is not None
                
                print(f"Type {id_type}: label={result['tracking']['identifier_type_label']}")
            finally:
                self.session.delete(f"{BASE_URL}/api/practices/{practice_id}")
    
    # ========================
    # VERIFICATION HISTORY TESTS
    # ========================
    
    def test_verification_history_tracked(self):
        """Verification history is tracked in tracking block"""
        create_response = self.session.post(f"{BASE_URL}/api/practices", json={
            "practice_type": "VAT_REGISTRATION",
            "client_name": "TEST_History",
            "country": "Italia",
            "description": "Test practice for history"
        })
        assert create_response.status_code in [200, 201]
        practice_id = create_response.json()["id"]
        
        try:
            # Add tracking
            self.session.post(f"{BASE_URL}/api/practices/{practice_id}/tracking", json={
                "identifier_type": "protocol_number",
                "identifier_value": "TEST-HISTORY-001"
            })
            
            # Verify multiple times
            self.session.post(f"{BASE_URL}/api/practices/{practice_id}/tracking/verify", json={
                "verification_outcome": "confirmed",
                "entity_state": "received"
            })
            
            self.session.post(f"{BASE_URL}/api/practices/{practice_id}/tracking/verify", json={
                "verification_outcome": "changed",
                "entity_state": "processing"
            })
            
            # Check verification count
            tracking = self.session.get(f"{BASE_URL}/api/practices/{practice_id}/tracking").json()
            assert tracking["verification_count"] >= 2
            assert tracking["verification_summary"] is not None
            
            print(f"Verification count: {tracking['verification_count']}")
        finally:
            self.session.delete(f"{BASE_URL}/api/practices/{practice_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
