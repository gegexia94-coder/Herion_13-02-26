"""
Herion v3.0 - Controlled Execution Platform Tests
Tests for 9 specialist agents + admin, approval flow, timeline, and role-based visibility
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@aic.it"
ADMIN_PASSWORD = "Admin123!"
TEST_USER_EMAIL = f"test_user_{uuid.uuid4().hex[:8]}@herion.it"
TEST_USER_PASSWORD = "TestPass123!"


class TestHealthAndBasics:
    """Basic health and connectivity tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("PASS: Health endpoint returns healthy status")
    
    def test_root_endpoint(self):
        """Test root endpoint shows Herion branding"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "Herion" in data.get("message", "")
        print("PASS: Root endpoint shows Herion branding")


class TestAdminLogin:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with correct credentials"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("email") == ADMIN_EMAIL
        assert data.get("role") == "admin"
        print(f"PASS: Admin login successful - role: {data.get('role')}")
        return session
    
    def test_admin_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "WrongPassword123!"
        })
        assert response.status_code == 401
        print("PASS: Invalid credentials correctly rejected with 401")


class TestAgentsInfo:
    """Tests for /api/agents/info endpoint - 9 specialist agents + admin"""
    
    @pytest.fixture
    def admin_session(self):
        """Get authenticated admin session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    @pytest.fixture
    def user_session(self):
        """Get authenticated regular user session"""
        session = requests.Session()
        # First register a new user
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "first_name": "Test",
            "last_name": "User"
        })
        if response.status_code == 400:  # User already exists
            response = session.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            })
        assert response.status_code in [200, 201]
        return session
    
    def test_agents_info_returns_9_specialists(self, admin_session):
        """Test that /api/agents/info returns 9 specialist agents"""
        response = admin_session.get(f"{BASE_URL}/api/agents/info")
        assert response.status_code == 200
        data = response.json()
        
        agents = data.get("agents", [])
        assert len(agents) == 9, f"Expected 9 agents, got {len(agents)}"
        
        # Verify expected agent types
        expected_types = ["intake", "ledger", "compliance", "documents", "delegate", "deadline", "flow", "monitor", "advisor"]
        actual_types = [a.get("type") for a in agents]
        for expected in expected_types:
            assert expected in actual_types, f"Missing agent type: {expected}"
        
        print(f"PASS: /api/agents/info returns 9 specialist agents: {actual_types}")
    
    def test_agents_info_has_admin_agent(self, admin_session):
        """Test that /api/agents/info includes admin agent info"""
        response = admin_session.get(f"{BASE_URL}/api/agents/info")
        assert response.status_code == 200
        data = response.json()
        
        admin_agent = data.get("admin_agent")
        assert admin_agent is not None, "admin_agent should be present"
        assert "Herion Admin" in admin_agent.get("name", "")
        
        print(f"PASS: Admin agent present: {admin_agent.get('name')}")
    
    def test_agents_info_correct_pipeline_order(self, admin_session):
        """Test that workflow_steps has correct pipeline order"""
        response = admin_session.get(f"{BASE_URL}/api/agents/info")
        assert response.status_code == 200
        data = response.json()
        
        workflow_steps = data.get("workflow_steps", [])
        expected_order = ["intake", "ledger", "compliance", "documents", "delegate", "deadline", "flow", "monitor", "advisor"]
        assert workflow_steps == expected_order, f"Pipeline order mismatch: {workflow_steps}"
        
        print(f"PASS: Pipeline order correct: {workflow_steps}")
    
    def test_agents_info_total_count(self, admin_session):
        """Test that total_agents is 10 (9 specialists + 1 admin)"""
        response = admin_session.get(f"{BASE_URL}/api/agents/info")
        assert response.status_code == 200
        data = response.json()
        
        total = data.get("total_agents")
        assert total == 10, f"Expected 10 total agents, got {total}"
        
        print(f"PASS: Total agents count is 10")
    
    def test_admin_sees_system_prompts(self, admin_session):
        """Test that admin user can see system_prompt in agents"""
        response = admin_session.get(f"{BASE_URL}/api/agents/info")
        assert response.status_code == 200
        data = response.json()
        
        agents = data.get("agents", [])
        # Admin should see system_prompt
        for agent in agents:
            assert "system_prompt" in agent, f"Admin should see system_prompt for {agent.get('type')}"
        
        # Admin should also see admin_prompt
        assert "admin_prompt" in data, "Admin should see admin_prompt"
        
        print("PASS: Admin can see system_prompt for all agents")
    
    def test_non_admin_cannot_see_system_prompts(self, user_session):
        """Test that non-admin user cannot see system_prompt"""
        response = user_session.get(f"{BASE_URL}/api/agents/info")
        assert response.status_code == 200
        data = response.json()
        
        agents = data.get("agents", [])
        # Non-admin should NOT see system_prompt
        for agent in agents:
            assert "system_prompt" not in agent, f"Non-admin should NOT see system_prompt for {agent.get('type')}"
        
        # Non-admin should NOT see admin_prompt
        assert "admin_prompt" not in data, "Non-admin should NOT see admin_prompt"
        
        print("PASS: Non-admin cannot see system_prompt (role-based visibility working)")


class TestPracticeCreation:
    """Tests for practice creation with new status model"""
    
    @pytest.fixture
    def admin_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_create_practice_has_draft_status(self, admin_session):
        """Test that new practice is created with 'draft' status"""
        practice_data = {
            "practice_type": "vat_registration",
            "description": "Test practice for controlled execution",
            "client_name": "Test Client",
            "client_type": "private",
            "fiscal_code": "TSTCLT80A01H501Z"
        }
        
        response = admin_session.post(f"{BASE_URL}/api/practices", json=practice_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("status") == "draft", f"Expected 'draft' status, got {data.get('status')}"
        assert data.get("status_label") == "Bozza"
        
        print(f"PASS: Practice created with 'draft' status - ID: {data.get('id')}")
        return data.get("id")
    
    def test_practice_has_new_fields(self, admin_session):
        """Test that practice has new controlled execution fields"""
        practice_data = {
            "practice_type": "tax_declaration",
            "description": "Test practice fields",
            "client_name": "Field Test Client",
            "client_type": "freelancer",
            "fiscal_code": "FLDTST80A01H501Z",
            "vat_number": "IT12345678901"
        }
        
        response = admin_session.post(f"{BASE_URL}/api/practices", json=practice_data)
        assert response.status_code == 200
        data = response.json()
        
        # Check new fields exist
        assert "orchestration_result" in data
        assert "risk_level" in data
        assert "delegation_status" in data
        assert "approval_snapshot_id" in data
        assert "approved_at" in data
        assert "submitted_at" in data
        assert "completed_at" in data
        
        print("PASS: Practice has all new controlled execution fields")


class TestPracticeTimeline:
    """Tests for practice timeline endpoint"""
    
    @pytest.fixture
    def admin_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_timeline_endpoint_exists(self, admin_session):
        """Test that timeline endpoint exists and returns data"""
        # First create a practice
        practice_data = {
            "practice_type": "f24_payment",
            "description": "Timeline test practice",
            "client_name": "Timeline Client",
            "client_type": "private"
        }
        create_response = admin_session.post(f"{BASE_URL}/api/practices", json=practice_data)
        assert create_response.status_code == 200
        practice_id = create_response.json().get("id")
        
        # Get timeline
        response = admin_session.get(f"{BASE_URL}/api/practices/{practice_id}/timeline")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list), "Timeline should be a list"
        assert len(data) >= 1, "Timeline should have at least one event (practice_created)"
        
        # Check first event is practice_created
        first_event = data[0]
        assert first_event.get("event_type") == "practice_created"
        assert "timestamp" in first_event
        
        print(f"PASS: Timeline endpoint returns {len(data)} events")
    
    def test_timeline_has_chronological_events(self, admin_session):
        """Test that timeline events are in chronological order"""
        # Create a practice
        practice_data = {
            "practice_type": "inps_registration",
            "description": "Chronological test",
            "client_name": "Chrono Client",
            "client_type": "private"
        }
        create_response = admin_session.post(f"{BASE_URL}/api/practices", json=practice_data)
        practice_id = create_response.json().get("id")
        
        # Get timeline
        response = admin_session.get(f"{BASE_URL}/api/practices/{practice_id}/timeline")
        data = response.json()
        
        # Verify chronological order
        timestamps = [e.get("timestamp") for e in data]
        assert timestamps == sorted(timestamps), "Timeline events should be in chronological order"
        
        print("PASS: Timeline events are in chronological order")


class TestApprovalFlow:
    """Tests for the approval endpoint and flow"""
    
    @pytest.fixture
    def admin_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_approve_endpoint_exists(self, admin_session):
        """Test that approve endpoint exists"""
        # Create a practice
        practice_data = {
            "practice_type": "vat_registration",
            "description": "Approval test practice",
            "client_name": "Approval Client",
            "client_type": "private"
        }
        create_response = admin_session.post(f"{BASE_URL}/api/practices", json=practice_data)
        practice_id = create_response.json().get("id")
        
        # Try to approve (should fail because status is 'draft', not 'waiting_approval')
        response = admin_session.post(f"{BASE_URL}/api/practices/{practice_id}/approve")
        assert response.status_code == 400, "Should reject approval for non-waiting_approval status"
        
        print("PASS: Approve endpoint exists and validates status")
    
    def test_approve_requires_waiting_approval_status(self, admin_session):
        """Test that approval only works when status is 'waiting_approval'"""
        # Create a practice
        practice_data = {
            "practice_type": "tax_declaration",
            "description": "Status validation test",
            "client_name": "Status Client",
            "client_type": "private"
        }
        create_response = admin_session.post(f"{BASE_URL}/api/practices", json=practice_data)
        practice_id = create_response.json().get("id")
        
        # Try to approve draft practice
        response = admin_session.post(f"{BASE_URL}/api/practices/{practice_id}/approve")
        assert response.status_code == 400
        assert "approvazione" in response.json().get("detail", "").lower() or "approval" in response.json().get("detail", "").lower()
        
        print("PASS: Approval correctly requires 'waiting_approval' status")
    
    def test_manual_status_update_to_waiting_approval(self, admin_session):
        """Test that we can manually update status to waiting_approval for testing"""
        # Create a practice
        practice_data = {
            "practice_type": "accounting_setup",
            "description": "Manual status update test",
            "client_name": "Manual Client",
            "client_type": "company",
            "vat_number": "IT98765432109",
            "fiscal_code": "MNCLT80A01H501Z"
        }
        create_response = admin_session.post(f"{BASE_URL}/api/practices", json=practice_data)
        practice_id = create_response.json().get("id")
        
        # Update status to waiting_approval
        update_response = admin_session.put(f"{BASE_URL}/api/practices/{practice_id}", json={
            "status": "waiting_approval"
        })
        assert update_response.status_code == 200
        
        # Verify status was updated
        get_response = admin_session.get(f"{BASE_URL}/api/practices/{practice_id}")
        assert get_response.json().get("status") == "waiting_approval"
        
        print("PASS: Can manually update status to waiting_approval")
        return practice_id
    
    def test_approve_creates_snapshot_and_completes(self, admin_session):
        """Test full approval flow: waiting_approval -> approved -> submitted -> completed"""
        # Create a practice
        practice_data = {
            "practice_type": "company_formation",
            "description": "Full approval flow test",
            "client_name": "Full Flow Client",
            "client_type": "company",
            "vat_number": "IT11223344556",
            "fiscal_code": "FFLCLT80A01H501Z"
        }
        create_response = admin_session.post(f"{BASE_URL}/api/practices", json=practice_data)
        practice_id = create_response.json().get("id")
        
        # Set up mock orchestration result and status
        update_response = admin_session.put(f"{BASE_URL}/api/practices/{practice_id}", json={
            "status": "waiting_approval",
            "additional_data": {
                "orchestration_result": {
                    "admin_summary": "Test summary",
                    "risk_level": "low",
                    "delegation_status": "authorized",
                    "agents_used": ["Herion Intake", "Herion Ledger"]
                }
            }
        })
        assert update_response.status_code == 200
        
        # Now approve
        approve_response = admin_session.post(f"{BASE_URL}/api/practices/{practice_id}/approve")
        assert approve_response.status_code == 200
        approve_data = approve_response.json()
        
        # Verify response
        assert "approval_snapshot" in approve_data
        assert approve_data.get("final_status") == "completed"
        assert approve_data.get("transitions") == ["waiting_approval", "approved", "submitted", "completed"]
        
        # Verify practice is now completed
        get_response = admin_session.get(f"{BASE_URL}/api/practices/{practice_id}")
        assert get_response.json().get("status") == "completed"
        
        print("PASS: Full approval flow works: waiting_approval -> approved -> submitted -> completed")


class TestStatusBadges:
    """Tests for all new status values"""
    
    @pytest.fixture
    def admin_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_all_status_values_accepted(self, admin_session):
        """Test that all new status values are accepted by the update endpoint"""
        # Create a practice
        practice_data = {
            "practice_type": "other",
            "description": "Status test practice",
            "client_name": "Status Test Client",
            "client_type": "private"
        }
        create_response = admin_session.post(f"{BASE_URL}/api/practices", json=practice_data)
        practice_id = create_response.json().get("id")
        
        # Test each status
        statuses = ["draft", "in_progress", "waiting_approval", "blocked", "escalated"]
        for status in statuses:
            update_response = admin_session.put(f"{BASE_URL}/api/practices/{practice_id}", json={
                "status": status
            })
            assert update_response.status_code == 200, f"Failed to set status to {status}"
            
            get_response = admin_session.get(f"{BASE_URL}/api/practices/{practice_id}")
            assert get_response.json().get("status") == status
        
        print(f"PASS: All status values accepted: {statuses}")


class TestOldPracticesCompatibility:
    """Tests for backward compatibility with old 'pending' status"""
    
    @pytest.fixture
    def admin_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_pending_status_still_works(self, admin_session):
        """Test that old 'pending' status is still supported"""
        # Create a practice
        practice_data = {
            "practice_type": "vat_closure",
            "description": "Pending status test",
            "client_name": "Pending Client",
            "client_type": "private"
        }
        create_response = admin_session.post(f"{BASE_URL}/api/practices", json=practice_data)
        practice_id = create_response.json().get("id")
        
        # Update to pending status
        update_response = admin_session.put(f"{BASE_URL}/api/practices/{practice_id}", json={
            "status": "pending"
        })
        assert update_response.status_code == 200
        
        # Verify it's set
        get_response = admin_session.get(f"{BASE_URL}/api/practices/{practice_id}")
        assert get_response.json().get("status") == "pending"
        
        print("PASS: Old 'pending' status still works for backward compatibility")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
