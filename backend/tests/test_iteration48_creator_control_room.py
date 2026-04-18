"""
Iteration 48 - Creator Control Room / Father Agent Tests
Tests the new Creator Control Room feature with Father Agent intelligence endpoint.
Features tested:
- GET /api/creator/father returns real intelligence data for creator user
- GET /api/creator/father returns 403 for admin user
- Response structure validation (health, insights, friction_points, top_used, stalled_practices, daily_activity)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCreatorFatherEndpoint:
    """Tests for the /api/creator/father endpoint"""
    
    @pytest.fixture(scope="class")
    def creator_session(self):
        """Login as creator and return session with auth cookie"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as creator
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "gegexia94@gmail.com",
            "password": "Creator2026!"
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Creator login failed: {login_response.status_code} - {login_response.text}")
        
        return session
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as admin and return session with auth cookie"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code} - {login_response.text}")
        
        return session
    
    def test_father_endpoint_returns_200_for_creator(self, creator_session):
        """Creator user should get 200 from /api/creator/father"""
        response = creator_session.get(f"{BASE_URL}/api/creator/father")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Creator gets 200 from /api/creator/father")
    
    def test_father_endpoint_returns_403_for_admin(self, admin_session):
        """Admin user should get 403 from /api/creator/father"""
        response = admin_session.get(f"{BASE_URL}/api/creator/father")
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data
        assert "creatore" in data["detail"].lower() or "creator" in data["detail"].lower()
        print(f"✓ Admin gets 403 from /api/creator/father with message: {data['detail']}")
    
    def test_father_response_has_health_section(self, creator_session):
        """Father response should have health section with required metrics"""
        response = creator_session.get(f"{BASE_URL}/api/creator/father")
        assert response.status_code == 200
        
        data = response.json()
        assert "health" in data, "Response missing 'health' section"
        
        health = data["health"]
        required_health_fields = [
            "total_users", "total_practices", "active", "blocked",
            "waiting_docs", "waiting_external", "completed", "draft",
            "stalled_7d", "abandoned_drafts", "never_started_users"
        ]
        
        for field in required_health_fields:
            assert field in health, f"Health section missing '{field}'"
            assert isinstance(health[field], int), f"Health '{field}' should be int, got {type(health[field])}"
        
        print(f"✓ Health section has all required fields: {list(health.keys())}")
        print(f"  - total_users: {health['total_users']}")
        print(f"  - active: {health['active']}")
        print(f"  - blocked: {health['blocked']}")
        print(f"  - completed: {health['completed']}")
    
    def test_father_response_has_insights_array(self, creator_session):
        """Father response should have insights array with prioritized cards"""
        response = creator_session.get(f"{BASE_URL}/api/creator/father")
        assert response.status_code == 200
        
        data = response.json()
        assert "insights" in data, "Response missing 'insights' section"
        assert isinstance(data["insights"], list), "Insights should be a list"
        
        # Check insight structure if any exist
        for insight in data["insights"]:
            assert "priority" in insight, "Insight missing 'priority'"
            assert insight["priority"] in ["critical", "high", "medium", "info"], f"Invalid priority: {insight['priority']}"
            assert "signal" in insight, "Insight missing 'signal'"
            assert "explanation" in insight, "Insight missing 'explanation'"
            assert "action" in insight, "Insight missing 'action'"
        
        print(f"✓ Insights array has {len(data['insights'])} items")
        for ins in data["insights"][:3]:  # Show first 3
            print(f"  - [{ins['priority'].upper()}] {ins['signal'][:50]}...")
    
    def test_father_response_has_friction_points(self, creator_session):
        """Father response should have friction_points array"""
        response = creator_session.get(f"{BASE_URL}/api/creator/father")
        assert response.status_code == 200
        
        data = response.json()
        assert "friction_points" in data, "Response missing 'friction_points' section"
        assert isinstance(data["friction_points"], list), "friction_points should be a list"
        
        # Check structure if any exist
        for fp in data["friction_points"]:
            assert "procedure" in fp, "Friction point missing 'procedure'"
            assert "stuck_count" in fp, "Friction point missing 'stuck_count'"
        
        print(f"✓ Friction points array has {len(data['friction_points'])} items")
    
    def test_father_response_has_top_used(self, creator_session):
        """Father response should have top_used array"""
        response = creator_session.get(f"{BASE_URL}/api/creator/father")
        assert response.status_code == 200
        
        data = response.json()
        assert "top_used" in data, "Response missing 'top_used' section"
        assert isinstance(data["top_used"], list), "top_used should be a list"
        
        # Check structure if any exist
        for tu in data["top_used"]:
            assert "procedure" in tu, "Top used missing 'procedure'"
            assert "count" in tu, "Top used missing 'count'"
        
        print(f"✓ Top used procedures array has {len(data['top_used'])} items")
    
    def test_father_response_has_stalled_practices(self, creator_session):
        """Father response should have stalled_practices array"""
        response = creator_session.get(f"{BASE_URL}/api/creator/father")
        assert response.status_code == 200
        
        data = response.json()
        assert "stalled_practices" in data, "Response missing 'stalled_practices' section"
        assert isinstance(data["stalled_practices"], list), "stalled_practices should be a list"
        
        # Check structure if any exist
        for sp in data["stalled_practices"]:
            assert "days_idle" in sp, "Stalled practice missing 'days_idle'"
        
        print(f"✓ Stalled practices array has {len(data['stalled_practices'])} items")
    
    def test_father_response_has_daily_activity(self, creator_session):
        """Father response should have daily_activity array with 7 days"""
        response = creator_session.get(f"{BASE_URL}/api/creator/father")
        assert response.status_code == 200
        
        data = response.json()
        assert "daily_activity" in data, "Response missing 'daily_activity' section"
        assert isinstance(data["daily_activity"], list), "daily_activity should be a list"
        assert len(data["daily_activity"]) == 7, f"Expected 7 days, got {len(data['daily_activity'])}"
        
        # Check structure
        for day in data["daily_activity"]:
            assert "date" in day, "Daily activity missing 'date'"
            assert "count" in day, "Daily activity missing 'count'"
        
        print(f"✓ Daily activity has 7 days: {[d['date'] for d in data['daily_activity']]}")
    
    def test_father_response_has_generated_at(self, creator_session):
        """Father response should have generated_at timestamp"""
        response = creator_session.get(f"{BASE_URL}/api/creator/father")
        assert response.status_code == 200
        
        data = response.json()
        assert "generated_at" in data, "Response missing 'generated_at'"
        assert isinstance(data["generated_at"], str), "generated_at should be string"
        
        print(f"✓ Response generated at: {data['generated_at']}")


class TestAdminStatsEndpointAccess:
    """Verify admin/stats endpoint also returns 403 for admin (from iteration 47)"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as admin and return session with auth cookie"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
        
        return session
    
    def test_admin_stats_returns_403_for_admin(self, admin_session):
        """Admin user should get 403 from /api/admin/stats"""
        response = admin_session.get(f"{BASE_URL}/api/admin/stats")
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print(f"✓ Admin gets 403 from /api/admin/stats")


class TestUnauthenticatedAccess:
    """Test that unauthenticated users cannot access creator endpoints"""
    
    def test_father_endpoint_requires_auth(self):
        """Unauthenticated request to /api/creator/father should fail"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/creator/father")
        
        # Should get 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Unauthenticated request to /api/creator/father returns {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
