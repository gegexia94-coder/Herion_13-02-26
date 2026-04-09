"""
Herion v8 Batch 2 Tests - Deadline Dashboard, Submission Center, Delegation System
Tests for:
1. Deadline Dashboard API (/api/deadlines)
2. Submission Center API (/api/submission-center)
3. Delegation API (PUT /api/practices/{id}/delegation)
4. Readiness API (GET /api/practices/{id}/readiness)
5. Submit API (POST /api/practices/{id}/submit)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CREATOR_EMAIL = "gegexia94@gmail.com"
CREATOR_PASSWORD = "HerionCreator2026!"
ADMIN_EMAIL = "admin@aic.it"
ADMIN_PASSWORD = "Admin123!"


class TestHealthAndAuth:
    """Basic health and authentication tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health endpoint returns healthy status")
    
    def test_creator_login(self):
        """Test creator login works"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CREATOR_EMAIL,
            "password": CREATOR_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("is_creator") == True
        assert data.get("role") == "creator"
        print(f"✓ Creator login works - is_creator={data.get('is_creator')}, role={data.get('role')}")
        return session
    
    def test_admin_login(self):
        """Test admin login works"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("role") == "admin"
        print(f"✓ Admin login works - role={data.get('role')}")
        return session


class TestDeadlineDashboard:
    """Tests for Deadline Dashboard API"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CREATOR_EMAIL,
            "password": CREATOR_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_deadlines_endpoint_exists(self, auth_session):
        """Test GET /api/deadlines endpoint exists and returns data"""
        response = auth_session.get(f"{BASE_URL}/api/deadlines")
        assert response.status_code == 200
        data = response.json()
        assert "sections" in data
        assert "counts" in data
        assert "urgency" in data
        print(f"✓ GET /api/deadlines returns sections, counts, urgency")
    
    def test_deadlines_sections_structure(self, auth_session):
        """Test deadline sections have correct structure"""
        response = auth_session.get(f"{BASE_URL}/api/deadlines")
        assert response.status_code == 200
        data = response.json()
        
        expected_sections = [
            "pending_approvals", "blocked", "escalated", 
            "waiting_delegation", "in_progress", "overdue", "upcoming_actions"
        ]
        
        for section in expected_sections:
            assert section in data["sections"], f"Missing section: {section}"
        
        print(f"✓ Deadline sections contain all expected keys: {expected_sections}")
    
    def test_deadlines_counts_structure(self, auth_session):
        """Test deadline counts have correct structure"""
        response = auth_session.get(f"{BASE_URL}/api/deadlines")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_active" in data["counts"]
        assert isinstance(data["counts"]["total_active"], int)
        print(f"✓ Deadline counts include total_active: {data['counts']['total_active']}")
    
    def test_deadlines_urgency_values(self, auth_session):
        """Test urgency has valid values"""
        response = auth_session.get(f"{BASE_URL}/api/deadlines")
        assert response.status_code == 200
        data = response.json()
        
        assert data["urgency"] in ["normal", "high", "critical"]
        print(f"✓ Deadline urgency is valid: {data['urgency']}")
    
    def test_deadlines_requires_auth(self):
        """Test deadlines endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/deadlines")
        assert response.status_code == 401
        print("✓ GET /api/deadlines requires authentication")


class TestSubmissionCenter:
    """Tests for Submission Center API"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CREATOR_EMAIL,
            "password": CREATOR_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_submission_center_endpoint_exists(self, auth_session):
        """Test GET /api/submission-center endpoint exists"""
        response = auth_session.get(f"{BASE_URL}/api/submission-center")
        assert response.status_code == 200
        data = response.json()
        assert "sections" in data
        assert "counts" in data
        print(f"✓ GET /api/submission-center returns sections and counts")
    
    def test_submission_center_sections_structure(self, auth_session):
        """Test submission center sections have correct structure"""
        response = auth_session.get(f"{BASE_URL}/api/submission-center")
        assert response.status_code == 200
        data = response.json()
        
        expected_sections = [
            "ready_to_submit", "waiting_approval", "not_ready",
            "in_preparation", "submitted", "completed",
            "blocked", "escalated", "failed_submission", "rejected"
        ]
        
        for section in expected_sections:
            assert section in data["sections"], f"Missing section: {section}"
        
        print(f"✓ Submission center sections contain all expected keys")
    
    def test_submission_center_counts_total(self, auth_session):
        """Test submission center counts include total"""
        response = auth_session.get(f"{BASE_URL}/api/submission-center")
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data["counts"]
        assert isinstance(data["counts"]["total"], int)
        print(f"✓ Submission center counts include total: {data['counts']['total']}")
    
    def test_submission_center_requires_auth(self):
        """Test submission center requires authentication"""
        response = requests.get(f"{BASE_URL}/api/submission-center")
        assert response.status_code == 401
        print("✓ GET /api/submission-center requires authentication")


class TestReadinessAPI:
    """Tests for Practice Readiness API"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CREATOR_EMAIL,
            "password": CREATOR_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    @pytest.fixture
    def test_practice(self, auth_session):
        """Create a test practice"""
        response = auth_session.post(f"{BASE_URL}/api/practices", json={
            "practice_type": "vat_registration",
            "description": "Test practice for readiness API",
            "client_name": "TEST_Readiness_Client",
            "client_type": "private",
            "fiscal_code": "TSTCLT80A01H501Z",
            "country": "IT"
        })
        assert response.status_code == 200
        practice = response.json()
        yield practice
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/practices/{practice['id']}")
    
    def test_readiness_endpoint_exists(self, auth_session, test_practice):
        """Test GET /api/practices/{id}/readiness endpoint exists"""
        response = auth_session.get(f"{BASE_URL}/api/practices/{test_practice['id']}/readiness")
        assert response.status_code == 200
        data = response.json()
        assert "practice_id" in data
        assert "readiness_state" in data
        print(f"✓ GET /api/practices/{{id}}/readiness returns readiness_state")
    
    def test_readiness_response_structure(self, auth_session, test_practice):
        """Test readiness response has correct structure"""
        response = auth_session.get(f"{BASE_URL}/api/practices/{test_practice['id']}/readiness")
        assert response.status_code == 200
        data = response.json()
        
        expected_fields = [
            "readiness_state", "is_ready", "blockers", "warnings",
            "missing_items", "delegation_required", "delegation_valid",
            "delegation_status", "approval_required", "approval_status",
            "routing_clear", "document_count"
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Readiness response contains all expected fields")
    
    def test_readiness_blockers_is_list(self, auth_session, test_practice):
        """Test blockers is a list"""
        response = auth_session.get(f"{BASE_URL}/api/practices/{test_practice['id']}/readiness")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data["blockers"], list)
        assert isinstance(data["warnings"], list)
        assert isinstance(data["missing_items"], list)
        print(f"✓ Readiness blockers, warnings, missing_items are lists")
    
    def test_readiness_requires_auth(self):
        """Test readiness endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/practices/fake-id/readiness")
        assert response.status_code == 401
        print("✓ GET /api/practices/{{id}}/readiness requires authentication")


class TestDelegationAPI:
    """Tests for Delegation API"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CREATOR_EMAIL,
            "password": CREATOR_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    @pytest.fixture
    def test_practice(self, auth_session):
        """Create a test practice"""
        response = auth_session.post(f"{BASE_URL}/api/practices", json={
            "practice_type": "vat_registration",
            "description": "Test practice for delegation API",
            "client_name": "TEST_Delegation_Client",
            "client_type": "freelancer",
            "fiscal_code": "TSTDLG80A01H501Z",
            "vat_number": "IT12345678901",
            "country": "IT"
        })
        assert response.status_code == 200
        practice = response.json()
        yield practice
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/practices/{practice['id']}")
    
    def test_delegation_request_action(self, auth_session, test_practice):
        """Test delegation request action"""
        response = auth_session.put(
            f"{BASE_URL}/api/practices/{test_practice['id']}/delegation",
            json={"action": "request", "notes": "Requesting delegation"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "delegation" in data
        assert data["delegation"]["status"] == "requested"
        print(f"✓ PUT /api/practices/{{id}}/delegation with action=request works")
    
    def test_delegation_upload_confirm_action(self, auth_session, test_practice):
        """Test delegation upload_confirm action"""
        # First request
        auth_session.put(
            f"{BASE_URL}/api/practices/{test_practice['id']}/delegation",
            json={"action": "request"}
        )
        # Then upload confirm
        response = auth_session.put(
            f"{BASE_URL}/api/practices/{test_practice['id']}/delegation",
            json={"action": "upload_confirm", "notes": "Document uploaded"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["delegation"]["status"] == "under_review"
        print(f"✓ PUT /api/practices/{{id}}/delegation with action=upload_confirm works")
    
    def test_delegation_verify_action(self, auth_session, test_practice):
        """Test delegation verify action"""
        # Setup: request -> upload_confirm
        auth_session.put(
            f"{BASE_URL}/api/practices/{test_practice['id']}/delegation",
            json={"action": "request"}
        )
        auth_session.put(
            f"{BASE_URL}/api/practices/{test_practice['id']}/delegation",
            json={"action": "upload_confirm"}
        )
        # Verify
        response = auth_session.put(
            f"{BASE_URL}/api/practices/{test_practice['id']}/delegation",
            json={"action": "verify"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["delegation"]["status"] == "valid"
        print(f"✓ PUT /api/practices/{{id}}/delegation with action=verify works")
    
    def test_delegation_reject_action(self, auth_session, test_practice):
        """Test delegation reject action"""
        # Setup: request -> upload_confirm
        auth_session.put(
            f"{BASE_URL}/api/practices/{test_practice['id']}/delegation",
            json={"action": "request"}
        )
        auth_session.put(
            f"{BASE_URL}/api/practices/{test_practice['id']}/delegation",
            json={"action": "upload_confirm"}
        )
        # Reject
        response = auth_session.put(
            f"{BASE_URL}/api/practices/{test_practice['id']}/delegation",
            json={"action": "reject", "notes": "Insufficient documentation"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["delegation"]["status"] == "rejected"
        print(f"✓ PUT /api/practices/{{id}}/delegation with action=reject works")
    
    def test_delegation_reset_action(self, auth_session, test_practice):
        """Test delegation reset action"""
        # Setup: request -> upload_confirm -> reject
        auth_session.put(
            f"{BASE_URL}/api/practices/{test_practice['id']}/delegation",
            json={"action": "request"}
        )
        auth_session.put(
            f"{BASE_URL}/api/practices/{test_practice['id']}/delegation",
            json={"action": "upload_confirm"}
        )
        auth_session.put(
            f"{BASE_URL}/api/practices/{test_practice['id']}/delegation",
            json={"action": "reject", "notes": "Insufficient documentation"}
        )
        # Reset
        response = auth_session.put(
            f"{BASE_URL}/api/practices/{test_practice['id']}/delegation",
            json={"action": "reset"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["delegation"]["status"] == "required"
        print(f"✓ PUT /api/practices/{{id}}/delegation with action=reset works")
    
    def test_delegation_invalid_action(self, auth_session, test_practice):
        """Test delegation with invalid action returns error"""
        response = auth_session.put(
            f"{BASE_URL}/api/practices/{test_practice['id']}/delegation",
            json={"action": "invalid_action"}
        )
        assert response.status_code == 400
        print(f"✓ PUT /api/practices/{{id}}/delegation with invalid action returns 400")
    
    def test_delegation_requires_auth(self):
        """Test delegation endpoint requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/practices/fake-id/delegation",
            json={"action": "request"}
        )
        assert response.status_code == 401
        print("✓ PUT /api/practices/{{id}}/delegation requires authentication")


class TestSubmitAPI:
    """Tests for Practice Submit API"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CREATOR_EMAIL,
            "password": CREATOR_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    @pytest.fixture
    def test_practice(self, auth_session):
        """Create a test practice"""
        response = auth_session.post(f"{BASE_URL}/api/practices", json={
            "practice_type": "vat_registration",
            "description": "Test practice for submit API",
            "client_name": "TEST_Submit_Client",
            "client_type": "private",
            "fiscal_code": "TSTSUB80A01H501Z",
            "country": "IT"
        })
        assert response.status_code == 200
        practice = response.json()
        yield practice
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/practices/{practice['id']}")
    
    def test_submit_endpoint_exists(self, auth_session, test_practice):
        """Test POST /api/practices/{id}/submit endpoint exists"""
        response = auth_session.post(f"{BASE_URL}/api/practices/{test_practice['id']}/submit")
        # Should return 200 with success=false (not ready) or success=true
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "message" in data
        print(f"✓ POST /api/practices/{{id}}/submit endpoint exists and returns success/message")
    
    def test_submit_checks_readiness(self, auth_session, test_practice):
        """Test submit checks readiness before submitting"""
        response = auth_session.post(f"{BASE_URL}/api/practices/{test_practice['id']}/submit")
        assert response.status_code == 200
        data = response.json()
        
        # A new practice should not be ready
        if not data["success"]:
            assert "blockers" in data or "readiness_state" in data
            print(f"✓ Submit checks readiness - practice not ready: {data.get('message')}")
        else:
            print(f"✓ Submit succeeded - practice was ready")
    
    def test_submit_requires_auth(self):
        """Test submit endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/practices/fake-id/submit")
        assert response.status_code == 401
        print("✓ POST /api/practices/{{id}}/submit requires authentication")


class TestNavigation:
    """Tests for navigation items"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CREATOR_EMAIL,
            "password": CREATOR_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_catalog_still_works(self, auth_session):
        """Test catalog endpoint still works"""
        response = auth_session.get(f"{BASE_URL}/api/catalog")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ GET /api/catalog still works - {len(data)} entries")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
