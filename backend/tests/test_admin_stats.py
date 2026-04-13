"""
Test Admin Statistics Dashboard - Iteration 39
Tests for GET /api/admin/stats endpoint and user plan fields
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@aic.it"
ADMIN_PASSWORD = "Admin123!"


class TestAdminStatsEndpoint:
    """Tests for GET /api/admin/stats endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        self.admin_user = login_resp.json()
        yield
        # Logout
        self.session.post(f"{BASE_URL}/api/auth/logout")
    
    def test_admin_stats_returns_200(self):
        """GET /api/admin/stats returns 200 for admin"""
        resp = self.session.get(f"{BASE_URL}/api/admin/stats")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "users" in data
        assert "practices" in data
        assert "trends" in data
        assert "operational" in data
        print("✓ Admin stats endpoint returns 200 with full data structure")
    
    def test_admin_stats_window_today(self):
        """GET /api/admin/stats?window=today filters by today"""
        resp = self.session.get(f"{BASE_URL}/api/admin/stats?window=today")
        assert resp.status_code == 200
        data = resp.json()
        assert data["window"] == "today"
        print("✓ Window=today filter works")
    
    def test_admin_stats_window_7d(self):
        """GET /api/admin/stats?window=7d filters by 7 days"""
        resp = self.session.get(f"{BASE_URL}/api/admin/stats?window=7d")
        assert resp.status_code == 200
        data = resp.json()
        assert data["window"] == "7d"
        print("✓ Window=7d filter works")
    
    def test_admin_stats_window_30d(self):
        """GET /api/admin/stats?window=30d filters by 30 days"""
        resp = self.session.get(f"{BASE_URL}/api/admin/stats?window=30d")
        assert resp.status_code == 200
        data = resp.json()
        assert data["window"] == "30d"
        print("✓ Window=30d filter works")
    
    def test_admin_stats_window_all(self):
        """GET /api/admin/stats?window=all returns all-time data"""
        resp = self.session.get(f"{BASE_URL}/api/admin/stats?window=all")
        assert resp.status_code == 200
        data = resp.json()
        assert data["window"] == "all"
        print("✓ Window=all filter works")
    
    def test_admin_stats_users_block(self):
        """Stats response includes users.total, users.new_today, users.active_today, users.inactive_30d"""
        resp = self.session.get(f"{BASE_URL}/api/admin/stats")
        assert resp.status_code == 200
        data = resp.json()
        users = data["users"]
        
        # Check required fields
        assert "total" in users, "Missing users.total"
        assert "new_today" in users, "Missing users.new_today"
        assert "active_today" in users, "Missing users.active_today"
        assert "inactive_30d" in users, "Missing users.inactive_30d"
        assert "new_this_week" in users, "Missing users.new_this_week"
        assert "new_this_month" in users, "Missing users.new_this_month"
        assert "active_this_week" in users, "Missing users.active_this_week"
        assert "active_this_month" in users, "Missing users.active_this_month"
        
        # Validate types
        assert isinstance(users["total"], int)
        assert isinstance(users["new_today"], int)
        assert isinstance(users["active_today"], int)
        assert isinstance(users["inactive_30d"], int)
        
        print(f"✓ Users block complete: total={users['total']}, new_today={users['new_today']}, active_today={users['active_today']}, inactive_30d={users['inactive_30d']}")
    
    def test_admin_stats_user_segments(self):
        """Stats response includes users.segments (never_started, started_then_dropped, used_then_stopped)"""
        resp = self.session.get(f"{BASE_URL}/api/admin/stats")
        assert resp.status_code == 200
        data = resp.json()
        segments = data["users"]["segments"]
        
        assert "never_started" in segments, "Missing segments.never_started"
        assert "started_then_dropped" in segments, "Missing segments.started_then_dropped"
        assert "used_then_stopped" in segments, "Missing segments.used_then_stopped"
        
        assert isinstance(segments["never_started"], int)
        assert isinstance(segments["started_then_dropped"], int)
        assert isinstance(segments["used_then_stopped"], int)
        
        print(f"✓ User segments: never_started={segments['never_started']}, started_then_dropped={segments['started_then_dropped']}, used_then_stopped={segments['used_then_stopped']}")
    
    def test_admin_stats_practices_block(self):
        """Stats response includes practices.total, practices.active, practices.completed, practices.blocked, practices.completion_rate"""
        resp = self.session.get(f"{BASE_URL}/api/admin/stats")
        assert resp.status_code == 200
        data = resp.json()
        practices = data["practices"]
        
        assert "total" in practices, "Missing practices.total"
        assert "active" in practices, "Missing practices.active"
        assert "completed" in practices, "Missing practices.completed"
        assert "blocked" in practices, "Missing practices.blocked"
        assert "completion_rate" in practices, "Missing practices.completion_rate"
        assert "draft" in practices, "Missing practices.draft"
        assert "waiting_official" in practices, "Missing practices.waiting_official"
        assert "created_in_window" in practices, "Missing practices.created_in_window"
        assert "status_distribution" in practices, "Missing practices.status_distribution"
        
        print(f"✓ Practices block: total={practices['total']}, active={practices['active']}, completed={practices['completed']}, blocked={practices['blocked']}, completion_rate={practices['completion_rate']}%")
    
    def test_admin_stats_trends_block(self):
        """Stats response includes trends.daily (14 data points) and trends.weekly (8 data points)"""
        resp = self.session.get(f"{BASE_URL}/api/admin/stats")
        assert resp.status_code == 200
        data = resp.json()
        trends = data["trends"]
        
        assert "daily" in trends, "Missing trends.daily"
        assert "weekly" in trends, "Missing trends.weekly"
        
        # Verify daily has 14 data points
        assert len(trends["daily"]) == 14, f"Expected 14 daily data points, got {len(trends['daily'])}"
        for point in trends["daily"]:
            assert "date" in point
            assert "actions" in point
        
        # Verify weekly has 8 data points
        assert len(trends["weekly"]) == 8, f"Expected 8 weekly data points, got {len(trends['weekly'])}"
        for point in trends["weekly"]:
            assert "week" in point
            assert "actions" in point
        
        print(f"✓ Trends block: {len(trends['daily'])} daily points, {len(trends['weekly'])} weekly points")
    
    def test_admin_stats_operational_block(self):
        """Stats response includes operational.top_procedures and operational.most_blocked"""
        resp = self.session.get(f"{BASE_URL}/api/admin/stats")
        assert resp.status_code == 200
        data = resp.json()
        operational = data["operational"]
        
        assert "top_procedures" in operational, "Missing operational.top_procedures"
        assert "most_blocked" in operational, "Missing operational.most_blocked"
        
        assert isinstance(operational["top_procedures"], list)
        assert isinstance(operational["most_blocked"], list)
        
        # Verify structure of top_procedures if any exist
        if operational["top_procedures"]:
            proc = operational["top_procedures"][0]
            assert "practice_type" in proc
            assert "name" in proc
            assert "count" in proc
        
        print(f"✓ Operational block: {len(operational['top_procedures'])} top procedures, {len(operational['most_blocked'])} blocked procedures")


class TestAdminStatsAccessControl:
    """Tests for admin stats access control"""
    
    def test_admin_stats_403_for_non_admin(self):
        """Admin stats endpoint returns 403 for non-admin users"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Register a regular user
        test_email = f"test_user_{uuid.uuid4().hex[:8]}@test.com"
        reg_resp = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "User"
        })
        assert reg_resp.status_code == 200, f"Registration failed: {reg_resp.text}"
        
        # Try to access admin stats
        stats_resp = session.get(f"{BASE_URL}/api/admin/stats")
        assert stats_resp.status_code == 403, f"Expected 403 for non-admin, got {stats_resp.status_code}"
        
        # Cleanup - logout
        session.post(f"{BASE_URL}/api/auth/logout")
        print("✓ Non-admin user correctly gets 403 on admin stats")
    
    def test_admin_stats_401_for_unauthenticated(self):
        """Admin stats endpoint returns 401 for unauthenticated requests"""
        session = requests.Session()
        resp = session.get(f"{BASE_URL}/api/admin/stats")
        assert resp.status_code == 401, f"Expected 401 for unauthenticated, got {resp.status_code}"
        print("✓ Unauthenticated request correctly gets 401")


class TestUserPlanFields:
    """Tests for user plan fields on registration"""
    
    def test_new_user_has_plan_fields(self):
        """New user registration creates user with plan='free' and plan_status='active' fields"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Register a new user
        test_email = f"test_plan_{uuid.uuid4().hex[:8]}@test.com"
        reg_resp = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123!",
            "first_name": "Plan",
            "last_name": "Test"
        })
        assert reg_resp.status_code == 200, f"Registration failed: {reg_resp.text}"
        
        # Get user profile to check plan fields
        profile_resp = session.get(f"{BASE_URL}/api/auth/profile")
        assert profile_resp.status_code == 200
        user = profile_resp.json()
        
        # Verify plan fields
        assert user.get("plan") == "free", f"Expected plan='free', got {user.get('plan')}"
        assert user.get("plan_status") == "active", f"Expected plan_status='active', got {user.get('plan_status')}"
        
        # Cleanup
        session.post(f"{BASE_URL}/api/auth/logout")
        print(f"✓ New user has plan='free' and plan_status='active'")


class TestAdminStatsDataIntegrity:
    """Tests for data integrity in admin stats"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200
        yield
        self.session.post(f"{BASE_URL}/api/auth/logout")
    
    def test_stats_generated_at_timestamp(self):
        """Stats response includes generated_at timestamp"""
        resp = self.session.get(f"{BASE_URL}/api/admin/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "generated_at" in data
        assert "window" in data
        print(f"✓ Stats generated at: {data['generated_at']}")
    
    def test_stats_numbers_are_non_negative(self):
        """All numeric values in stats are non-negative"""
        resp = self.session.get(f"{BASE_URL}/api/admin/stats")
        assert resp.status_code == 200
        data = resp.json()
        
        # Check users
        for key, val in data["users"].items():
            if isinstance(val, int):
                assert val >= 0, f"users.{key} is negative: {val}"
            elif isinstance(val, dict):
                for k, v in val.items():
                    if isinstance(v, int):
                        assert v >= 0, f"users.{key}.{k} is negative: {v}"
        
        # Check practices
        for key, val in data["practices"].items():
            if isinstance(val, (int, float)):
                assert val >= 0, f"practices.{key} is negative: {val}"
        
        print("✓ All numeric values are non-negative")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
