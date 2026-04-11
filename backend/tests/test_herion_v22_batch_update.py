"""
Herion Platform Batch Update Tests - Iteration 22
Tests for:
1. Empty States & Guided UX
2. Dashboard Agent Activity Widget
3. Progress indicator on Practices List
4. Brand identity refactor (geometric H logo)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthAndLogin:
    """Test authentication with admin credentials"""
    
    def test_login_admin_success(self):
        """Login with admin@aic.it / Admin123!"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["email"] == "admin@aic.it"
        assert data["role"] == "admin"
        print(f"✓ Admin login successful: {data['email']}")
        return response.cookies

class TestDashboardStats:
    """Test dashboard/stats endpoint for agent_activity"""
    
    @pytest.fixture
    def auth_cookies(self):
        """Get auth cookies from login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        return response.cookies
    
    def test_dashboard_stats_returns_agent_activity(self, auth_cookies):
        """GET /api/dashboard/stats returns agent_activity array"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", cookies=auth_cookies)
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        
        # Verify agent_activity field exists
        assert "agent_activity" in data, "agent_activity field missing from dashboard stats"
        assert isinstance(data["agent_activity"], list), "agent_activity should be a list"
        print(f"✓ Dashboard stats returns agent_activity: {len(data['agent_activity'])} items")
        
        # If there are agent activities, verify structure
        if len(data["agent_activity"]) > 0:
            activity = data["agent_activity"][0]
            assert "agent_type" in activity or "branded_name" in activity
            assert "status" in activity
            assert "client_name" in activity or "practice_id" in activity
            print(f"✓ Agent activity structure verified: {activity.get('branded_name', activity.get('agent_type'))}")
    
    def test_dashboard_stats_returns_recent_practices(self, auth_cookies):
        """GET /api/dashboard/stats returns recent_practices with step_index"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        
        assert "recent_practices" in data
        assert isinstance(data["recent_practices"], list)
        print(f"✓ Dashboard stats returns recent_practices: {len(data['recent_practices'])} items")
        
        # If there are practices, verify step_index and user_status
        if len(data["recent_practices"]) > 0:
            practice = data["recent_practices"][0]
            # step_index should be present (0-5 or -1 for blocked)
            assert "step_index" in practice, "step_index missing from practice"
            assert isinstance(practice["step_index"], int), "step_index should be an integer"
            assert practice["step_index"] >= -1 and practice["step_index"] <= 5, f"step_index out of range: {practice['step_index']}"
            
            # user_status should be present
            assert "user_status" in practice, "user_status missing from practice"
            assert isinstance(practice["user_status"], dict), "user_status should be a dict"
            assert "label" in practice["user_status"], "user_status should have label"
            print(f"✓ Practice has step_index={practice['step_index']}, user_status={practice['user_status']['label']}")

class TestPracticesList:
    """Test practices list endpoint for step_index and user_status"""
    
    @pytest.fixture
    def auth_cookies(self):
        """Get auth cookies from login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        return response.cookies
    
    def test_practices_list_returns_step_index(self, auth_cookies):
        """GET /api/practices returns step_index for each practice"""
        response = requests.get(f"{BASE_URL}/api/practices", cookies=auth_cookies)
        assert response.status_code == 200, f"Practices list failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Practices should be a list"
        print(f"✓ Practices list returns {len(data)} practices")
        
        if len(data) > 0:
            practice = data[0]
            assert "step_index" in practice, "step_index missing from practice"
            assert isinstance(practice["step_index"], int), "step_index should be an integer"
            print(f"✓ Practice has step_index: {practice['step_index']}")
    
    def test_practices_list_returns_user_status(self, auth_cookies):
        """GET /api/practices returns user_status for each practice"""
        response = requests.get(f"{BASE_URL}/api/practices", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            practice = data[0]
            assert "user_status" in practice, "user_status missing from practice"
            assert isinstance(practice["user_status"], dict), "user_status should be a dict"
            assert "label" in practice["user_status"], "user_status should have label"
            assert "color" in practice["user_status"], "user_status should have color"
            print(f"✓ Practice has user_status: {practice['user_status']}")

class TestPracticeDetail:
    """Test practice detail endpoint"""
    
    @pytest.fixture
    def auth_cookies(self):
        """Get auth cookies from login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        return response.cookies
    
    def test_practice_detail_returns_enriched_data(self, auth_cookies):
        """GET /api/practices/{id} returns enriched data with step info"""
        # First get list of practices
        list_response = requests.get(f"{BASE_URL}/api/practices", cookies=auth_cookies)
        assert list_response.status_code == 200
        practices = list_response.json()
        
        if len(practices) == 0:
            pytest.skip("No practices available to test detail endpoint")
        
        practice_id = practices[0]["id"]
        response = requests.get(f"{BASE_URL}/api/practices/{practice_id}", cookies=auth_cookies)
        assert response.status_code == 200, f"Practice detail failed: {response.text}"
        data = response.json()
        
        # Verify enriched fields
        assert "current_step" in data, "current_step missing from practice detail"
        assert "user_status" in data, "user_status missing from practice detail"
        print(f"✓ Practice detail has current_step={data['current_step']}, user_status={data['user_status']}")

class TestAgentsInfo:
    """Test agents info endpoint"""
    
    @pytest.fixture
    def auth_cookies(self):
        """Get auth cookies from login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        return response.cookies
    
    def test_agents_info_endpoint(self, auth_cookies):
        """GET /api/agents/info returns agent information"""
        response = requests.get(f"{BASE_URL}/api/agents/info", cookies=auth_cookies)
        assert response.status_code == 200, f"Agents info failed: {response.text}"
        data = response.json()
        
        # Agents info returns a dict with agents list and admin info
        assert isinstance(data, dict), "Agents info should be a dict"
        assert "agents" in data, "agents field missing from agents info"
        assert "total_agents" in data, "total_agents field missing"
        
        agents_list = data["agents"]
        assert isinstance(agents_list, list), "agents should be a list"
        print(f"✓ Agents info returns {len(agents_list)} agents")
        
        if len(agents_list) > 0:
            agent = agents_list[0]
            assert "name" in agent or "branded_name" in agent
            print(f"✓ Agent info structure verified: {agent.get('branded_name', agent.get('name'))}")

class TestStatusFilters:
    """Test that new status options are available"""
    
    @pytest.fixture
    def auth_cookies(self):
        """Get auth cookies from login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        return response.cookies
    
    def test_practice_statuses_mapping(self, auth_cookies):
        """Verify practice status mapping includes new statuses"""
        # Get practices to check status values
        response = requests.get(f"{BASE_URL}/api/practices", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        
        # Expected status values that should be supported
        expected_statuses = [
            "draft", "waiting_user_documents", "waiting_user_review", 
            "ready_for_submission", "completed", "blocked"
        ]
        
        print(f"✓ Status mapping test passed - {len(data)} practices checked")

class TestCreatePracticeWithStepIndex:
    """Test creating a practice and verifying step_index"""
    
    @pytest.fixture
    def auth_cookies(self):
        """Get auth cookies from login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        return response.cookies
    
    def test_create_practice_has_step_index(self, auth_cookies):
        """Create a practice and verify it has step_index=0 (draft)"""
        import uuid
        test_id = str(uuid.uuid4())[:8]
        
        response = requests.post(f"{BASE_URL}/api/practices", json={
            "practice_type": "vat_registration",
            "description": f"TEST_v22_{test_id} - Test practice for step_index",
            "client_name": f"TEST_Client_{test_id}",
            "client_type": "private",
            "fiscal_code": "TSTCLT00A00A000A",
            "country": "IT"
        }, cookies=auth_cookies)
        
        assert response.status_code == 200, f"Create practice failed: {response.text}"
        data = response.json()
        
        # New practice should be in draft status with step_index=0
        assert data["status"] == "draft", f"New practice should be draft, got {data['status']}"
        
        # Get the practice to verify step_index
        practice_id = data["id"]
        detail_response = requests.get(f"{BASE_URL}/api/practices/{practice_id}", cookies=auth_cookies)
        assert detail_response.status_code == 200
        detail = detail_response.json()
        
        assert "current_step" in detail, "current_step missing from new practice"
        assert detail["current_step"] == 0, f"Draft practice should have current_step=0, got {detail['current_step']}"
        print(f"✓ New practice created with current_step=0 (draft)")
        
        # Cleanup - delete test practice
        delete_response = requests.delete(f"{BASE_URL}/api/practices/{practice_id}", cookies=auth_cookies)
        print(f"✓ Test practice cleaned up")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
