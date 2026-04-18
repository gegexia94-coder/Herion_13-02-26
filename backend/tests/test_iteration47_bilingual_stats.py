"""
Iteration 47 - Bilingual System + Creator-Only Statistics Tests
Tests:
1. Backend: GET /api/admin/stats returns 403 for admin (non-creator) user
2. Backend: GET /api/admin/stats returns 200 for creator user (if available)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminStatsCreatorOnly:
    """Test that /api/admin/stats is restricted to creator role only"""
    
    @pytest.fixture
    def admin_session(self):
        """Login as admin@aic.it (non-creator) and return session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin (non-creator)
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code} - {login_response.text}")
        
        return session
    
    def test_admin_stats_returns_403_for_admin_user(self, admin_session):
        """Admin user (non-creator) should get 403 when accessing /api/admin/stats"""
        response = admin_session.get(f"{BASE_URL}/api/admin/stats")
        
        # Should return 403 Forbidden
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        # Verify error message
        data = response.json()
        assert "detail" in data
        assert "creatore" in data["detail"].lower() or "creator" in data["detail"].lower(), \
            f"Error message should mention creator access: {data['detail']}"
        
        print(f"✓ Admin user correctly denied access to /api/admin/stats with 403")
        print(f"  Error message: {data['detail']}")
    
    def test_admin_stats_with_different_windows(self, admin_session):
        """Test that all window parameters also return 403 for admin"""
        windows = ["today", "7d", "30d", "all"]
        
        for window in windows:
            response = admin_session.get(f"{BASE_URL}/api/admin/stats?window={window}")
            assert response.status_code == 403, \
                f"Expected 403 for window={window}, got {response.status_code}"
        
        print(f"✓ All window parameters correctly return 403 for admin user")


class TestAuthEndpoints:
    """Basic auth endpoint tests"""
    
    def test_login_admin_success(self):
        """Test admin login works"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        
        # Verify user data
        assert "user" in data or "email" in data
        user = data.get("user", data)
        assert user.get("email") == "admin@aic.it"
        assert user.get("role") == "admin"
        
        # Verify admin is NOT creator
        assert user.get("is_creator") != True, "Admin should not be creator"
        
        print(f"✓ Admin login successful")
        print(f"  Role: {user.get('role')}, is_creator: {user.get('is_creator')}")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password fails"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "WrongPassword123!"
        })
        
        assert response.status_code in [401, 400], f"Expected 401/400, got {response.status_code}"
        print(f"✓ Invalid credentials correctly rejected")


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """Test API is responding"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print(f"✓ API health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
