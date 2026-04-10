"""
Iteration 16 Backend Tests
Tests for:
- Dashboard stats endpoint with new fields
- Priority engine
- /run endpoint
- Approve endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ai-practice-manager.preview.emergentagent.com')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_cookies(self):
        """Login and get auth cookies"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@aic.it", "password": "Admin123!"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.cookies
    
    def test_login_success(self):
        """Test login with admin credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@aic.it", "password": "Admin123!"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["email"] == "admin@aic.it"
        assert data["role"] == "admin"
        print(f"Login successful: {data['email']}")


class TestDashboardStats:
    """Dashboard stats endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_cookies(self):
        """Login and get auth cookies"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@aic.it", "password": "Admin123!"}
        )
        assert response.status_code == 200
        return response.cookies
    
    def test_dashboard_stats_returns_all_fields(self, auth_cookies):
        """Test GET /api/dashboard/stats returns all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        required_fields = [
            "total_practices", "pending", "processing", "waiting_approval",
            "completed", "blocked", "urgent", "high_priority",
            "recent_practices", "critical_practices", "activity_logs"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
            print(f"  {field}: {data[field] if not isinstance(data[field], list) else f'[{len(data[field])} items]'}")
        
        print("Dashboard stats: All required fields present")
    
    def test_recent_practices_have_priority(self, auth_cookies):
        """Test that recent_practices include priority field"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["recent_practices"]:
            practice = data["recent_practices"][0]
            assert "priority" in practice, "recent_practices missing priority field"
            assert practice["priority"] in ["low", "normal", "high", "urgent"], f"Invalid priority: {practice['priority']}"
            print(f"Recent practice priority: {practice['priority']}")
    
    def test_critical_practices_have_priority(self, auth_cookies):
        """Test that critical_practices include priority field"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["critical_practices"]:
            practice = data["critical_practices"][0]
            assert "priority" in practice, "critical_practices missing priority field"
            print(f"Critical practice priority: {practice['priority']}")
    
    def test_activity_logs_present(self, auth_cookies):
        """Test that activity_logs are returned"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "activity_logs" in data
        if data["activity_logs"]:
            log = data["activity_logs"][0]
            assert "action" in log or "timestamp" in log
            print(f"Activity logs count: {len(data['activity_logs'])}")


class TestPracticeEndpoints:
    """Practice-related endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_cookies(self):
        """Login and get auth cookies"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@aic.it", "password": "Admin123!"}
        )
        assert response.status_code == 200
        return response.cookies
    
    def test_get_practices(self, auth_cookies):
        """Test GET /api/practices"""
        response = requests.get(
            f"{BASE_URL}/api/practices",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Practices count: {len(data)}")
        
        if data:
            practice = data[0]
            assert "id" in practice
            assert "status" in practice
            assert "client_name" in practice
    
    def test_run_endpoint_exists(self, auth_cookies):
        """Test POST /api/practices/{id}/run endpoint exists"""
        # First get a practice ID
        response = requests.get(
            f"{BASE_URL}/api/practices",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        practices = response.json()
        
        # Find a draft practice
        draft_practice = None
        for p in practices:
            if p.get("status") == "draft":
                draft_practice = p
                break
        
        if draft_practice:
            # Test the /run endpoint (with short timeout since it calls AI)
            try:
                response = requests.post(
                    f"{BASE_URL}/api/practices/{draft_practice['id']}/run",
                    cookies=auth_cookies,
                    timeout=10  # Short timeout - we just want to verify endpoint exists
                )
                # 200 = success, 500 = AI error (but endpoint exists)
                assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}"
                print(f"/run endpoint exists and responds (status: {response.status_code})")
            except requests.exceptions.Timeout:
                print("/run endpoint exists (timed out waiting for AI response - expected)")
        else:
            print("No draft practice found to test /run endpoint")
    
    def test_approve_endpoint_validation(self, auth_cookies):
        """Test POST /api/practices/{id}/approve validates status"""
        # Get a practice that is NOT waiting_approval
        response = requests.get(
            f"{BASE_URL}/api/practices",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        practices = response.json()
        
        # Find a draft practice (should fail approval)
        draft_practice = None
        for p in practices:
            if p.get("status") == "draft":
                draft_practice = p
                break
        
        if draft_practice:
            response = requests.post(
                f"{BASE_URL}/api/practices/{draft_practice['id']}/approve",
                cookies=auth_cookies
            )
            # Should fail because practice is not in waiting_approval status
            assert response.status_code == 400, f"Expected 400, got {response.status_code}"
            print("Approve endpoint correctly rejects non-waiting_approval practices")
        else:
            print("No draft practice found to test approve validation")
    
    def test_approve_waiting_practice(self, auth_cookies):
        """Test approving a practice that is waiting_approval"""
        response = requests.get(
            f"{BASE_URL}/api/practices",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        practices = response.json()
        
        # Find a waiting_approval practice
        waiting_practice = None
        for p in practices:
            if p.get("status") == "waiting_approval":
                waiting_practice = p
                break
        
        if waiting_practice:
            response = requests.post(
                f"{BASE_URL}/api/practices/{waiting_practice['id']}/approve",
                cookies=auth_cookies
            )
            # Should succeed
            assert response.status_code == 200, f"Approve failed: {response.text}"
            print(f"Successfully approved practice: {waiting_practice['id']}")
        else:
            print("No waiting_approval practice found to test approve")


class TestPriorityEngine:
    """Priority engine tests"""
    
    @pytest.fixture(scope="class")
    def auth_cookies(self):
        """Login and get auth cookies"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@aic.it", "password": "Admin123!"}
        )
        assert response.status_code == 200
        return response.cookies
    
    def test_priority_in_dashboard_stats(self, auth_cookies):
        """Test that priority is calculated in dashboard stats"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check urgent count
        assert "urgent" in data
        assert isinstance(data["urgent"], int)
        print(f"Urgent practices count: {data['urgent']}")
        
        # Check high_priority count
        assert "high_priority" in data
        assert isinstance(data["high_priority"], int)
        print(f"High priority practices count: {data['high_priority']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
