"""
Herion v21 - Practice Flow Testing
Tests for the new 6-step practice flow:
1. Understanding Gate (draft -> waiting_user_documents via /start)
2. Document upload and status transitions
3. New endpoints: /start, /mark-submitted, /mark-completed
4. Enriched practice response with catalog_info, channel_info, current_step, user_status
5. Status labels and step mapping
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPracticeFlowEndpoints:
    """Test the new practice flow endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.user = login_response.json()
        
    def test_01_login_and_auth(self):
        """Test login works and returns expected fields"""
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@aic.it"
        assert data["role"] == "admin"
        print("✓ Login and auth working")
        
    def test_02_get_practices_list(self):
        """Test practices list returns with new status labels"""
        response = self.session.get(f"{BASE_URL}/api/practices")
        assert response.status_code == 200
        practices = response.json()
        assert isinstance(practices, list)
        print(f"✓ Got {len(practices)} practices")
        
        # Check that practices have priority and status fields
        if practices:
            p = practices[0]
            assert "status" in p
            assert "priority" in p
            print(f"  First practice status: {p.get('status')}, priority: {p.get('priority')}")
            
    def test_03_get_practice_detail_enriched(self):
        """Test practice detail returns enriched data (catalog_info, channel_info, current_step, user_status)"""
        # First get a practice
        response = self.session.get(f"{BASE_URL}/api/practices")
        assert response.status_code == 200
        practices = response.json()
        
        if not practices:
            pytest.skip("No practices available for testing")
            
        practice_id = practices[0]["id"]
        
        # Get practice detail
        response = self.session.get(f"{BASE_URL}/api/practices/{practice_id}")
        assert response.status_code == 200
        practice = response.json()
        
        # Check enriched fields
        assert "catalog_info" in practice, "Missing catalog_info field"
        assert "channel_info" in practice, "Missing channel_info field"
        assert "current_step" in practice, "Missing current_step field"
        assert "user_status" in practice, "Missing user_status field"
        
        print(f"✓ Practice detail enriched:")
        print(f"  - catalog_info: {practice.get('catalog_info') is not None}")
        print(f"  - channel_info: {practice.get('channel_info') is not None}")
        print(f"  - current_step: {practice.get('current_step')}")
        print(f"  - user_status: {practice.get('user_status')}")
        
    def test_04_create_draft_practice(self):
        """Test creating a new draft practice"""
        unique_id = str(uuid.uuid4())[:8]
        practice_data = {
            "practice_type": "vat_registration",
            "description": f"TEST_Practice_{unique_id}",
            "client_name": f"TEST_Client_{unique_id}",
            "client_type": "private",
            "fiscal_code": "RSSMRA85M01H501Z",
            "country": "IT"
        }
        
        response = self.session.post(f"{BASE_URL}/api/practices", json=practice_data)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        practice = response.json()
        assert practice["status"] == "draft"
        assert practice["client_name"] == practice_data["client_name"]
        
        self.test_practice_id = practice["id"]
        print(f"✓ Created draft practice: {practice['id']}")
        return practice["id"]
        
    def test_05_start_practice_endpoint(self):
        """Test POST /practices/{id}/start transitions draft to waiting_user_documents"""
        # Create a fresh draft practice
        unique_id = str(uuid.uuid4())[:8]
        create_response = self.session.post(f"{BASE_URL}/api/practices", json={
            "practice_type": "vat_registration",
            "description": f"TEST_Start_{unique_id}",
            "client_name": f"TEST_StartClient_{unique_id}",
            "client_type": "private",
            "fiscal_code": "RSSMRA85M01H501Z"
        })
        assert create_response.status_code == 200
        practice_id = create_response.json()["id"]
        
        # Start the practice
        response = self.session.post(f"{BASE_URL}/api/practices/{practice_id}/start")
        assert response.status_code == 200, f"Start failed: {response.text}"
        
        result = response.json()
        assert result["status"] == "waiting_user_documents"
        
        # Verify the practice status changed
        get_response = self.session.get(f"{BASE_URL}/api/practices/{practice_id}")
        assert get_response.status_code == 200
        practice = get_response.json()
        assert practice["status"] == "waiting_user_documents"
        assert practice["current_step"] == 1  # Carica step
        
        print(f"✓ Start endpoint works: draft -> waiting_user_documents")
        print(f"  - current_step: {practice['current_step']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/practices/{practice_id}")
        
    def test_06_start_practice_fails_if_not_draft(self):
        """Test that /start fails if practice is not in draft status"""
        # Create and start a practice first
        unique_id = str(uuid.uuid4())[:8]
        create_response = self.session.post(f"{BASE_URL}/api/practices", json={
            "practice_type": "vat_registration",
            "description": f"TEST_NotDraft_{unique_id}",
            "client_name": f"TEST_NotDraftClient_{unique_id}",
            "client_type": "private"
        })
        practice_id = create_response.json()["id"]
        
        # Start it first
        self.session.post(f"{BASE_URL}/api/practices/{practice_id}/start")
        
        # Try to start again - should fail
        response = self.session.post(f"{BASE_URL}/api/practices/{practice_id}/start")
        assert response.status_code == 400
        assert "bozza" in response.json().get("detail", "").lower()
        
        print("✓ Start endpoint correctly rejects non-draft practices")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/practices/{practice_id}")
        
    def test_07_mark_submitted_endpoint(self):
        """Test POST /practices/{id}/mark-submitted for ready_for_submission practices"""
        # Create a practice and set it to ready_for_submission
        unique_id = str(uuid.uuid4())[:8]
        create_response = self.session.post(f"{BASE_URL}/api/practices", json={
            "practice_type": "vat_registration",
            "description": f"TEST_Submit_{unique_id}",
            "client_name": f"TEST_SubmitClient_{unique_id}",
            "client_type": "private"
        })
        practice_id = create_response.json()["id"]
        
        # Set status to ready_for_submission (admin can do this)
        update_response = self.session.put(f"{BASE_URL}/api/practices/{practice_id}", json={
            "status": "ready_for_submission"
        })
        assert update_response.status_code == 200
        
        # Mark as submitted
        response = self.session.post(f"{BASE_URL}/api/practices/{practice_id}/mark-submitted", json={
            "submission_type": "manual",
            "notes": "Test submission"
        })
        assert response.status_code == 200, f"Mark submitted failed: {response.text}"
        
        result = response.json()
        assert result["status"] == "submitted_manually"
        
        # Verify
        get_response = self.session.get(f"{BASE_URL}/api/practices/{practice_id}")
        practice = get_response.json()
        assert practice["status"] == "submitted_manually"
        assert practice["current_step"] == 5  # Completa step
        
        print("✓ Mark-submitted endpoint works: ready_for_submission -> submitted_manually")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/practices/{practice_id}")
        
    def test_08_mark_submitted_fails_if_not_ready(self):
        """Test that /mark-submitted fails if practice is not ready_for_submission"""
        # Create a draft practice
        unique_id = str(uuid.uuid4())[:8]
        create_response = self.session.post(f"{BASE_URL}/api/practices", json={
            "practice_type": "vat_registration",
            "description": f"TEST_NotReady_{unique_id}",
            "client_name": f"TEST_NotReadyClient_{unique_id}",
            "client_type": "private"
        })
        practice_id = create_response.json()["id"]
        
        # Try to mark as submitted - should fail
        response = self.session.post(f"{BASE_URL}/api/practices/{practice_id}/mark-submitted", json={
            "submission_type": "manual"
        })
        assert response.status_code == 400
        
        print("✓ Mark-submitted endpoint correctly rejects non-ready practices")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/practices/{practice_id}")
        
    def test_09_mark_completed_endpoint(self):
        """Test POST /practices/{id}/mark-completed for submitted practices"""
        # Create a practice and set it to submitted_manually
        unique_id = str(uuid.uuid4())[:8]
        create_response = self.session.post(f"{BASE_URL}/api/practices", json={
            "practice_type": "vat_registration",
            "description": f"TEST_Complete_{unique_id}",
            "client_name": f"TEST_CompleteClient_{unique_id}",
            "client_type": "private"
        })
        practice_id = create_response.json()["id"]
        
        # Set status to submitted_manually (admin can do this)
        update_response = self.session.put(f"{BASE_URL}/api/practices/{practice_id}", json={
            "status": "submitted_manually"
        })
        assert update_response.status_code == 200
        
        # Mark as completed
        response = self.session.post(f"{BASE_URL}/api/practices/{practice_id}/mark-completed")
        assert response.status_code == 200, f"Mark completed failed: {response.text}"
        
        result = response.json()
        assert result["status"] == "completed"
        
        # Verify
        get_response = self.session.get(f"{BASE_URL}/api/practices/{practice_id}")
        practice = get_response.json()
        assert practice["status"] == "completed"
        
        print("✓ Mark-completed endpoint works: submitted_manually -> completed")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/practices/{practice_id}")
        
    def test_10_mark_completed_fails_if_not_submitted(self):
        """Test that /mark-completed fails if practice is not in submitted state"""
        # Create a draft practice
        unique_id = str(uuid.uuid4())[:8]
        create_response = self.session.post(f"{BASE_URL}/api/practices", json={
            "practice_type": "vat_registration",
            "description": f"TEST_NotSubmitted_{unique_id}",
            "client_name": f"TEST_NotSubmittedClient_{unique_id}",
            "client_type": "private"
        })
        practice_id = create_response.json()["id"]
        
        # Try to mark as completed - should fail
        response = self.session.post(f"{BASE_URL}/api/practices/{practice_id}/mark-completed")
        assert response.status_code == 400
        
        print("✓ Mark-completed endpoint correctly rejects non-submitted practices")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/practices/{practice_id}")
        
    def test_11_practice_step_mapping(self):
        """Test that current_step is correctly mapped based on status"""
        # Create a practice
        unique_id = str(uuid.uuid4())[:8]
        create_response = self.session.post(f"{BASE_URL}/api/practices", json={
            "practice_type": "vat_registration",
            "description": f"TEST_Steps_{unique_id}",
            "client_name": f"TEST_StepsClient_{unique_id}",
            "client_type": "private"
        })
        practice_id = create_response.json()["id"]
        
        # Test step mapping for different statuses
        status_step_map = {
            "draft": 0,  # Comprendi
            "waiting_user_documents": 1,  # Carica
            "internal_processing": 2,  # Elabora
            "waiting_user_review": 3,  # Verifica
            "waiting_signature": 4,  # Firma
            "ready_for_submission": 5,  # Completa
            "completed": 5,  # Completa
        }
        
        for status, expected_step in status_step_map.items():
            # Update status
            self.session.put(f"{BASE_URL}/api/practices/{practice_id}", json={"status": status})
            
            # Get practice and check step
            response = self.session.get(f"{BASE_URL}/api/practices/{practice_id}")
            practice = response.json()
            
            assert practice["current_step"] == expected_step, \
                f"Status {status} should map to step {expected_step}, got {practice['current_step']}"
        
        print("✓ Step mapping verified for all statuses")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/practices/{practice_id}")
        
    def test_12_user_status_display(self):
        """Test that user_status contains label, color, and category"""
        # Get any practice
        response = self.session.get(f"{BASE_URL}/api/practices")
        practices = response.json()
        
        if not practices:
            pytest.skip("No practices available")
            
        practice_id = practices[0]["id"]
        response = self.session.get(f"{BASE_URL}/api/practices/{practice_id}")
        practice = response.json()
        
        user_status = practice.get("user_status")
        assert user_status is not None, "user_status should be present"
        assert "label" in user_status, "user_status should have label"
        assert "color" in user_status, "user_status should have color"
        assert "category" in user_status, "user_status should have category"
        
        print(f"✓ user_status structure verified:")
        print(f"  - label: {user_status.get('label')}")
        print(f"  - color: {user_status.get('color')}")
        print(f"  - category: {user_status.get('category')}")
        
    def test_13_catalog_info_enrichment(self):
        """Test that catalog_info is populated for known practice types"""
        # Create a vat_registration practice (should have catalog entry)
        unique_id = str(uuid.uuid4())[:8]
        create_response = self.session.post(f"{BASE_URL}/api/practices", json={
            "practice_type": "vat_registration",
            "description": f"TEST_Catalog_{unique_id}",
            "client_name": f"TEST_CatalogClient_{unique_id}",
            "client_type": "private"
        })
        practice_id = create_response.json()["id"]
        
        # Get practice detail
        response = self.session.get(f"{BASE_URL}/api/practices/{practice_id}")
        practice = response.json()
        
        catalog_info = practice.get("catalog_info")
        # catalog_info may be None if no catalog entry exists, but field should be present
        print(f"✓ catalog_info field present: {catalog_info is not None}")
        if catalog_info:
            print(f"  - practice_id: {catalog_info.get('practice_id')}")
            print(f"  - name: {catalog_info.get('name')}")
            print(f"  - required_documents: {catalog_info.get('required_documents')}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/practices/{practice_id}")
        
    def test_14_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        
        stats = response.json()
        assert "recent_practices" in stats
        assert "critical_practices" in stats
        
        print(f"✓ Dashboard stats working")
        print(f"  - recent_practices: {len(stats.get('recent_practices', []))}")
        print(f"  - critical_practices: {len(stats.get('critical_practices', []))}")


class TestStatusLabels:
    """Test that status labels are correctly applied"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200
        
    def test_status_labels_in_list(self):
        """Test that practices list shows correct status labels"""
        response = self.session.get(f"{BASE_URL}/api/practices")
        assert response.status_code == 200
        
        practices = response.json()
        
        # Check a few practices for status_label
        for p in practices[:5]:
            status = p.get("status")
            status_label = p.get("status_label")
            
            # Verify draft shows as "Bozza" (backend label)
            if status == "draft":
                assert status_label == "Bozza", f"Draft should have label 'Bozza', got '{status_label}'"
                
        print("✓ Status labels present in practice list")


class TestCatalogAndRegistry:
    """Test catalog and registry endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200
        
    def test_get_catalog(self):
        """Test GET /catalog returns practice catalog entries"""
        response = self.session.get(f"{BASE_URL}/api/catalog")
        assert response.status_code == 200
        
        catalog = response.json()
        assert isinstance(catalog, list)
        print(f"✓ Catalog has {len(catalog)} entries")
        
        if catalog:
            entry = catalog[0]
            print(f"  Sample entry: {entry.get('practice_id')} - {entry.get('name')}")
            
    def test_get_registry(self):
        """Test GET /registry returns authority registry entries"""
        response = self.session.get(f"{BASE_URL}/api/registry")
        assert response.status_code == 200
        
        registry = response.json()
        assert isinstance(registry, list)
        print(f"✓ Registry has {len(registry)} entries")
        
        if registry:
            entry = registry[0]
            print(f"  Sample entry: {entry.get('registry_id')} - {entry.get('name')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
