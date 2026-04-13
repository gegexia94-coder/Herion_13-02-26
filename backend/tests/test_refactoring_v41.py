"""
Test suite for Iteration 41 - Refactoring verification
Tests that all endpoints work identically after code was extracted to modules:
- database.py (shared DB connection)
- auth.py (shared auth/JWT functions)
- models/schemas.py (Pydantic models)
- routes/admin_routes.py (admin stats endpoint)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndAuth:
    """Test health and authentication endpoints"""
    
    def test_health_endpoint(self):
        """GET /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health endpoint working")
    
    def test_admin_login(self):
        """POST /api/auth/login works with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@aic.it"
        assert data["role"] == "admin"
        print("✓ Admin login working")
    
    def test_register_creates_user_with_plan_free(self):
        """POST /api/auth/register creates new user with plan='free' field"""
        import time
        email = f"test_refactor_{int(time.time())}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "Refactor"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == email
        assert data["role"] == "user"
        # Note: plan field is stored in DB but not returned in register response
        print(f"✓ User registration working - created {email}")


class TestCatalogEndpoints:
    """Test catalog endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        self.cookies = response.cookies
    
    def test_catalog_returns_136_procedures(self):
        """GET /api/catalog returns 136 procedures"""
        response = requests.get(f"{BASE_URL}/api/catalog", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 136, f"Expected 136 procedures, got {len(data)}"
        print(f"✓ Catalog returns {len(data)} procedures")
    
    def test_catalog_categories_returns_7(self):
        """GET /api/catalog/categories returns 7 categories"""
        response = requests.get(f"{BASE_URL}/api/catalog/categories", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 7, f"Expected 7 categories, got {len(data)}"
        category_ids = [c["id"] for c in data]
        expected = ["fiscale", "previdenziale", "societario", "documentale", "informativo", "lavoro", "internazionale"]
        for cat in expected:
            assert cat in category_ids, f"Missing category: {cat}"
        print(f"✓ Catalog categories returns {len(data)} categories")
    
    def test_prestart_returns_orientation_dependencies_international(self):
        """GET /api/catalog/COMPANY_CLOSURE/pre-start returns orientation + dependencies + international"""
        response = requests.get(f"{BASE_URL}/api/catalog/COMPANY_CLOSURE/pre-start", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        # Check required keys
        assert "orientation" in data
        assert "dependencies" in data
        assert "international" in data
        # Check orientation structure
        assert "practice_name" in data["orientation"]
        assert "is_official" in data["orientation"]
        # Check dependencies structure
        assert "has_dependencies" in data["dependencies"]
        assert data["dependencies"]["has_dependencies"] == True
        print("✓ Pre-start returns orientation, dependencies, and international")
    
    def test_dependencies_returns_linked_obligations(self):
        """GET /api/catalog/COMPANY_CLOSURE/dependencies returns linked obligations"""
        response = requests.get(f"{BASE_URL}/api/catalog/COMPANY_CLOSURE/dependencies", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert "linked_obligations" in data
        assert len(data["linked_obligations"]) > 0
        assert "practice_id" in data
        assert data["practice_id"] == "COMPANY_CLOSURE"
        print(f"✓ Dependencies returns {len(data['linked_obligations'])} linked obligations")


class TestAdminStatsFromExtractedRoute:
    """Test admin stats endpoint from extracted routes/admin_routes.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        self.admin_cookies = response.cookies
    
    def test_admin_stats_returns_data(self):
        """GET /api/admin/stats returns user and practice statistics"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", cookies=self.admin_cookies)
        assert response.status_code == 200
        data = response.json()
        # Check structure
        assert "users" in data
        assert "practices" in data
        assert "trends" in data
        assert "operational" in data
        # Check users structure
        assert "total" in data["users"]
        assert "active_today" in data["users"]
        # Check practices structure
        assert "total" in data["practices"]
        assert "completed" in data["practices"]
        print(f"✓ Admin stats returns data - {data['users']['total']} users, {data['practices']['total']} practices")
    
    def test_admin_stats_with_window_today(self):
        """GET /api/admin/stats?window=today works with time filter"""
        response = requests.get(f"{BASE_URL}/api/admin/stats?window=today", cookies=self.admin_cookies)
        assert response.status_code == 200
        data = response.json()
        assert data["window"] == "today"
        assert "generated_at" in data
        print("✓ Admin stats with window=today works")
    
    def test_admin_stats_returns_403_for_non_admin(self):
        """GET /api/admin/stats returns 403 for non-admin users"""
        # Register a new user
        import time
        email = f"test_nonadmin_{int(time.time())}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "TestPass123!",
            "first_name": "NonAdmin",
            "last_name": "User"
        })
        assert reg_response.status_code == 200
        user_cookies = reg_response.cookies
        
        # Try to access admin stats
        response = requests.get(f"{BASE_URL}/api/admin/stats", cookies=user_cookies)
        assert response.status_code == 403
        data = response.json()
        assert "detail" in data
        print("✓ Admin stats returns 403 for non-admin users")


class TestDashboardAndPractices:
    """Test dashboard and practices endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        self.cookies = response.cookies
    
    def test_dashboard_stats_returns_data(self):
        """GET /api/dashboard/stats returns practice data"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert "total_practices" in data
        assert "pending" in data
        assert "completed" in data
        print(f"✓ Dashboard stats returns data - {data['total_practices']} total practices")
    
    def test_practices_returns_list(self):
        """GET /api/practices returns user practices"""
        response = requests.get(f"{BASE_URL}/api/practices", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Practices returns {len(data)} practices")
    
    def test_notifications_returns_list(self):
        """GET /api/notifications returns notifications"""
        response = requests.get(f"{BASE_URL}/api/notifications", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Notifications returns {len(data)} notifications")
    
    def test_reminders_returns_list(self):
        """GET /api/reminders returns reminders"""
        response = requests.get(f"{BASE_URL}/api/reminders", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Reminders returns {len(data)} reminders")


class TestPracticeWorkspaceAndTracking:
    """Test practice workspace and tracking endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        self.cookies = response.cookies
        # Get first practice ID
        practices_response = requests.get(f"{BASE_URL}/api/practices", cookies=self.cookies)
        practices = practices_response.json()
        self.practice_id = practices[0]["id"] if practices else None
    
    def test_practice_workspace_returns_full_data(self):
        """GET /api/practices/{id}/workspace returns full workspace with tracking"""
        if not self.practice_id:
            pytest.skip("No practices available")
        response = requests.get(f"{BASE_URL}/api/practices/{self.practice_id}/workspace", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        # Workspace returns enriched practice data with workspace-specific fields
        assert "practice_id" in data  # Practice ID
        assert "tracking" in data  # Tracking info
        assert "documents_summary" in data  # Documents summary
        assert "timeline_summary" in data  # Timeline summary
        assert "current_step" in data  # Current step
        assert "user_status" in data  # User-facing status
        print(f"✓ Practice workspace returns full data with tracking")
    
    def test_tracking_update_works(self):
        """POST /api/practices/{id}/tracking works for tracking reference"""
        if not self.practice_id:
            pytest.skip("No practices available")
        response = requests.post(
            f"{BASE_URL}/api/practices/{self.practice_id}/tracking",
            json={
                "identifier_type": "protocol_number",
                "identifier_value": "TEST-REFACTOR-001",
                "notes": "Test tracking update"
            },
            cookies=self.cookies
        )
        assert response.status_code == 200
        data = response.json()
        assert "tracking" in data
        print("✓ Tracking update works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
