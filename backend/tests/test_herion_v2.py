"""
Herion v2.0 Backend API Tests
Tests for: Auth, Profile, Password Reset, Countries, Document Categories, Agents, Practices
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ai-practice-manager.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@aic.it"
ADMIN_PASSWORD = "Admin123!"
TEST_USER_EMAIL = f"test_herion_{int(time.time())}@herion.it"
TEST_USER_PASSWORD = "TestPass123!"


class TestHealthAndRoot:
    """Health check and root endpoint tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health endpoint working")
    
    def test_root_endpoint(self):
        """Test /api/ returns Herion branding"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "Herion" in data["message"]
        assert "Precision" in data["message"]
        print(f"✓ Root endpoint: {data['message']}")


class TestReferenceData:
    """Tests for reference data endpoints"""
    
    def test_get_countries_returns_27_eu_countries(self):
        """Test /api/countries returns 27 EU countries"""
        response = requests.get(f"{BASE_URL}/api/countries")
        assert response.status_code == 200
        countries = response.json()
        assert len(countries) == 27, f"Expected 27 EU countries, got {len(countries)}"
        
        # Verify structure
        assert all("code" in c and "name" in c and "fiscal_id_label" in c for c in countries)
        
        # Verify Italy is present
        italy = next((c for c in countries if c["code"] == "IT"), None)
        assert italy is not None
        assert italy["name"] == "Italia"
        print(f"✓ Countries endpoint returns {len(countries)} EU countries")
    
    def test_get_document_categories_returns_10_categories(self):
        """Test /api/document-categories returns 10 categories"""
        response = requests.get(f"{BASE_URL}/api/document-categories")
        assert response.status_code == 200
        categories = response.json()
        assert len(categories) == 10, f"Expected 10 categories, got {len(categories)}"
        
        # Verify structure
        assert all("key" in c and "label" in c and "description" in c for c in categories)
        
        # Verify expected categories exist
        keys = [c["key"] for c in categories]
        expected_keys = ["identity", "tax_declarations", "vat_documents", "invoices", "other"]
        for key in expected_keys:
            assert key in keys, f"Missing category: {key}"
        print(f"✓ Document categories endpoint returns {len(categories)} categories")


class TestAgentsInfo:
    """Tests for AI agents info endpoint"""
    
    def test_get_agents_info_returns_5_agents(self):
        """Test /api/agents/info returns 5 agents with workflow_steps"""
        response = requests.get(f"{BASE_URL}/api/agents/info")
        assert response.status_code == 200
        data = response.json()
        
        # Verify 5 agents
        assert "agents" in data
        assert len(data["agents"]) == 5, f"Expected 5 agents, got {len(data['agents'])}"
        
        # Verify workflow_steps
        assert "workflow_steps" in data
        expected_steps = ["analysis", "validation", "compliance", "document", "communication"]
        assert data["workflow_steps"] == expected_steps
        
        # Verify agent structure
        for agent in data["agents"]:
            assert "type" in agent
            assert "name" in agent
            assert "description" in agent
            assert "step" in agent
            assert "system_prompt" in agent
        
        # Verify transparency note
        assert "transparency_note" in data
        
        print(f"✓ Agents info returns {len(data['agents'])} agents with workflow: {data['workflow_steps']}")


class TestAuthLogin:
    """Tests for authentication login"""
    
    def test_admin_login_success(self):
        """Test admin login with correct credentials"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        assert "name" in data
        
        # Verify cookies are set
        assert "access_token" in session.cookies or response.cookies.get("access_token")
        print(f"✓ Admin login successful: {data['email']} (role: {data['role']})")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected with 401")


class TestAuthRegistration:
    """Tests for user registration with expanded fields"""
    
    def test_register_new_user_with_all_fields(self):
        """Test registration with all expanded fields"""
        session = requests.Session()
        registration_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "first_name": "Test",
            "last_name": "Herion",
            "phone": "+39 333 1234567",
            "date_of_birth": "1990-01-15",
            "country": "IT",
            "city": "Milano",
            "address": "Via Roma 1",
            "client_type": "private",
            "fiscal_code": "RSSMRA90A15H501Z",
            "privacy_consent": True,
            "terms_consent": True
        }
        
        response = session.post(f"{BASE_URL}/api/auth/register", json=registration_data)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        
        # Verify response
        assert data["email"] == TEST_USER_EMAIL.lower()
        assert data["first_name"] == "Test"
        assert data["last_name"] == "Herion"
        assert data["client_type"] == "private"
        assert data["country"] == "IT"
        
        print(f"✓ User registration successful: {data['email']}")
        return session
    
    def test_register_duplicate_email_fails(self):
        """Test registration with existing email fails"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": ADMIN_EMAIL,
            "password": "TestPass123!",
            "first_name": "Duplicate",
            "last_name": "User",
            "privacy_consent": True,
            "terms_consent": True
        })
        assert response.status_code == 400
        print("✓ Duplicate email registration correctly rejected")


class TestForgotPassword:
    """Tests for forgot password flow"""
    
    def test_forgot_password_endpoint(self):
        """Test /api/auth/forgot-password works"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": ADMIN_EMAIL
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # Should return success message regardless of email existence (security)
        print(f"✓ Forgot password endpoint works: {data['message']}")
    
    def test_forgot_password_nonexistent_email(self):
        """Test forgot password with non-existent email still returns 200 (security)"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent@example.com"
        })
        assert response.status_code == 200
        print("✓ Forgot password correctly handles non-existent email")


class TestResetPassword:
    """Tests for reset password endpoint"""
    
    def test_reset_password_invalid_token(self):
        """Test /api/auth/reset-password with invalid token"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "invalid_token_12345",
            "new_password": "NewPassword123!"
        })
        assert response.status_code == 400
        print("✓ Reset password correctly rejects invalid token")


class TestProfileEndpoints:
    """Tests for profile management endpoints"""
    
    @pytest.fixture
    def authenticated_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_get_profile(self, authenticated_session):
        """Test GET /api/auth/profile returns user data"""
        response = authenticated_session.get(f"{BASE_URL}/api/auth/profile")
        assert response.status_code == 200
        data = response.json()
        
        # Verify profile data
        assert data["email"] == ADMIN_EMAIL
        assert "id" in data
        assert "first_name" in data or "name" in data
        print(f"✓ Profile endpoint returns user data: {data['email']}")
    
    def test_update_profile(self, authenticated_session):
        """Test PUT /api/auth/profile updates user data"""
        update_data = {
            "phone": "+39 333 9999999",
            "city": "Roma",
            "address": "Via Veneto 100"
        }
        
        response = authenticated_session.put(f"{BASE_URL}/api/auth/profile", json=update_data)
        assert response.status_code == 200
        data = response.json()
        
        # Verify update
        assert data.get("phone") == "+39 333 9999999"
        assert data.get("city") == "Roma"
        print("✓ Profile update successful")
        
        # Verify persistence with GET
        get_response = authenticated_session.get(f"{BASE_URL}/api/auth/profile")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data.get("city") == "Roma"
        print("✓ Profile update persisted correctly")


class TestChangePassword:
    """Tests for change password endpoint"""
    
    def test_change_password_wrong_current(self):
        """Test change password with wrong current password"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        response = session.put(f"{BASE_URL}/api/auth/change-password", json={
            "current_password": "WrongPassword123!",
            "new_password": "NewPassword123!"
        })
        assert response.status_code == 400
        print("✓ Change password correctly rejects wrong current password")


class TestPracticesFlow:
    """Tests for practices CRUD operations"""
    
    @pytest.fixture
    def authenticated_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_create_practice(self, authenticated_session):
        """Test creating a new practice"""
        practice_data = {
            "practice_type": "vat_registration",
            "description": "Test practice for API testing",
            "client_name": "Test Client",
            "client_type": "private",
            "fiscal_code": "TSTCLT90A01H501Z",
            "country": "IT"
        }
        
        response = authenticated_session.post(f"{BASE_URL}/api/practices", json=practice_data)
        assert response.status_code == 200
        data = response.json()
        
        # Verify practice created
        assert "id" in data
        assert data["practice_type"] == "vat_registration"
        assert data["client_name"] == "Test Client"
        assert data["status"] == "pending"
        
        print(f"✓ Practice created: {data['id']}")
        return data["id"]
    
    def test_get_practices_list(self, authenticated_session):
        """Test getting practices list"""
        response = authenticated_session.get(f"{BASE_URL}/api/practices")
        assert response.status_code == 200
        practices = response.json()
        assert isinstance(practices, list)
        print(f"✓ Practices list returned {len(practices)} practices")
    
    def test_practice_crud_flow(self, authenticated_session):
        """Test full CRUD flow for practices"""
        # CREATE
        practice_data = {
            "practice_type": "tax_declaration",
            "description": "CRUD test practice",
            "client_name": "CRUD Test Client",
            "client_type": "freelancer",
            "fiscal_code": "CRDTST90A01H501Z",
            "vat_number": "12345678901",
            "country": "IT"
        }
        
        create_response = authenticated_session.post(f"{BASE_URL}/api/practices", json=practice_data)
        assert create_response.status_code == 200
        created = create_response.json()
        practice_id = created["id"]
        print(f"✓ CREATE: Practice {practice_id}")
        
        # READ
        get_response = authenticated_session.get(f"{BASE_URL}/api/practices/{practice_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["id"] == practice_id
        assert fetched["client_name"] == "CRUD Test Client"
        print(f"✓ READ: Practice {practice_id}")
        
        # UPDATE
        update_response = authenticated_session.put(f"{BASE_URL}/api/practices/{practice_id}", json={
            "status": "processing",
            "description": "Updated description"
        })
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["status"] == "processing"
        print(f"✓ UPDATE: Practice status changed to processing")
        
        # DELETE
        delete_response = authenticated_session.delete(f"{BASE_URL}/api/practices/{practice_id}")
        assert delete_response.status_code == 200
        print(f"✓ DELETE: Practice {practice_id}")
        
        # Verify deletion
        verify_response = authenticated_session.get(f"{BASE_URL}/api/practices/{practice_id}")
        assert verify_response.status_code == 404
        print("✓ Verified practice deleted")


class TestDashboardStats:
    """Tests for dashboard stats endpoint"""
    
    def test_dashboard_stats(self):
        """Test /api/dashboard/stats returns stats"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        response = session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Verify stats structure
        assert "total_practices" in data
        assert "pending" in data
        assert "processing" in data
        assert "completed" in data
        assert "unread_notifications" in data
        assert "recent_practices" in data
        
        print(f"✓ Dashboard stats: total={data['total_practices']}, pending={data['pending']}, completed={data['completed']}")


class TestNotifications:
    """Tests for notifications endpoints"""
    
    def test_get_notifications(self):
        """Test /api/notifications returns notifications"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        response = session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        notifications = response.json()
        assert isinstance(notifications, list)
        print(f"✓ Notifications endpoint returns {len(notifications)} notifications")


class TestActivityLogs:
    """Tests for activity logs endpoints"""
    
    def test_get_activity_logs(self):
        """Test /api/activity-logs returns logs"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        response = session.get(f"{BASE_URL}/api/activity-logs")
        assert response.status_code == 200
        logs = response.json()
        assert isinstance(logs, list)
        print(f"✓ Activity logs endpoint returns {len(logs)} logs")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
