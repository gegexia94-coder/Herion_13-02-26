"""
Herion v7 - Catalog, WorkflowStepper, Personal Greeting Tests
Tests for:
1. Catalog page API - GET /api/catalog returns 20 entries
2. Registry API - GET /api/registry returns entries
3. Practice list API - GET /api/practices
4. Auth - Creator and Admin login
5. Dashboard stats API
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

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
        """Test root endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("PASS: Root endpoint accessible")


class TestCreatorAuth:
    """Creator account authentication tests"""
    
    def test_creator_login(self):
        """Test creator login with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "gegexia94@gmail.com", "password": "HerionCreator2026!"}
        )
        assert response.status_code == 200, f"Creator login failed: {response.text}"
        data = response.json()
        assert data.get("is_creator") == True, "Creator should have is_creator=true"
        assert data.get("creator_uuid") == "HERION-CREATOR-001", "Creator UUID mismatch"
        assert data.get("role") == "creator", "Creator role mismatch"
        print(f"PASS: Creator login works - is_creator={data.get('is_creator')}, creator_uuid={data.get('creator_uuid')}")
        return response.cookies
    
    def test_creator_blocked_from_registration(self):
        """Test creator email is blocked from public registration"""
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": "gegexia94@gmail.com",
                "password": "TestPassword123!",
                "first_name": "Test",
                "last_name": "User"
            }
        )
        assert response.status_code == 400, "Creator email should be blocked from registration"
        print("PASS: Creator email blocked from public registration")


class TestAdminAuth:
    """Admin account authentication tests"""
    
    def test_admin_login(self):
        """Test admin login with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@aic.it", "password": "Admin123!"}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert data.get("role") == "admin", "Admin role mismatch"
        assert data.get("is_creator") == False or data.get("is_creator") is None, "Admin should not be creator"
        print(f"PASS: Admin login works - role={data.get('role')}")
        return response.cookies
    
    def test_invalid_credentials_rejected(self):
        """Test invalid credentials are rejected"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@email.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401, "Invalid credentials should return 401"
        print("PASS: Invalid credentials rejected with 401")


class TestCatalogAPI:
    """Practice Catalog API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin to get auth cookies"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@aic.it", "password": "Admin123!"}
        )
        self.cookies = response.cookies
    
    def test_catalog_returns_entries(self):
        """Test GET /api/catalog returns 20 catalog entries"""
        response = requests.get(f"{BASE_URL}/api/catalog", cookies=self.cookies)
        assert response.status_code == 200, f"Catalog API failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Catalog should return a list"
        assert len(data) == 20, f"Expected 20 catalog entries, got {len(data)}"
        print(f"PASS: GET /api/catalog returns {len(data)} entries")
        
        # Verify catalog entry structure
        if len(data) > 0:
            entry = data[0]
            assert "practice_id" in entry, "Catalog entry should have practice_id"
            assert "name" in entry, "Catalog entry should have name"
            assert "description" in entry, "Catalog entry should have description"
            assert "risk_level" in entry, "Catalog entry should have risk_level"
            print(f"PASS: Catalog entry structure verified - sample: {entry.get('practice_id')}")
    
    def test_catalog_requires_auth(self):
        """Test catalog endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/catalog")
        assert response.status_code == 401, "Catalog should require authentication"
        print("PASS: Catalog requires authentication")
    
    def test_catalog_has_risk_levels(self):
        """Test catalog entries have valid risk levels (basic/medium)"""
        response = requests.get(f"{BASE_URL}/api/catalog", cookies=self.cookies)
        data = response.json()
        risk_levels = set(entry.get("risk_level") for entry in data)
        assert "basic" in risk_levels or "medium" in risk_levels, "Catalog should have basic or medium risk levels"
        print(f"PASS: Catalog has risk levels: {risk_levels}")
    
    def test_catalog_has_user_types(self):
        """Test catalog entries have user_type arrays"""
        response = requests.get(f"{BASE_URL}/api/catalog", cookies=self.cookies)
        data = response.json()
        user_types_found = set()
        for entry in data:
            if entry.get("user_type"):
                user_types_found.update(entry.get("user_type"))
        assert len(user_types_found) > 0, "Catalog should have user types"
        print(f"PASS: Catalog has user types: {user_types_found}")


class TestRegistryAPI:
    """Authority Registry API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin to get auth cookies"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@aic.it", "password": "Admin123!"}
        )
        self.cookies = response.cookies
    
    def test_registry_returns_entries(self):
        """Test GET /api/registry returns entries"""
        response = requests.get(f"{BASE_URL}/api/registry", cookies=self.cookies)
        assert response.status_code == 200, f"Registry API failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Registry should return a list"
        assert len(data) >= 14, f"Expected at least 14 registry entries, got {len(data)}"
        print(f"PASS: GET /api/registry returns {len(data)} entries")
    
    def test_registry_requires_auth(self):
        """Test registry endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/registry")
        assert response.status_code == 401, "Registry should require authentication"
        print("PASS: Registry requires authentication")


class TestPracticesAPI:
    """Practices API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin to get auth cookies"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@aic.it", "password": "Admin123!"}
        )
        self.cookies = response.cookies
    
    def test_practices_list(self):
        """Test GET /api/practices returns list"""
        response = requests.get(f"{BASE_URL}/api/practices", cookies=self.cookies)
        assert response.status_code == 200, f"Practices API failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Practices should return a list"
        print(f"PASS: GET /api/practices returns {len(data)} practices")
    
    def test_create_and_get_practice(self):
        """Test creating and retrieving a practice"""
        # Create practice
        create_response = requests.post(
            f"{BASE_URL}/api/practices",
            json={
                "practice_type": "vat_registration",
                "description": "Test practice for catalog testing",
                "client_name": "Test Client",
                "client_type": "private",
                "fiscal_code": "TSTCLT80A01H501Z",
                "country": "IT"
            },
            cookies=self.cookies
        )
        assert create_response.status_code == 200, f"Create practice failed: {create_response.text}"
        practice = create_response.json()
        practice_id = practice.get("id")
        assert practice_id, "Practice should have an ID"
        print(f"PASS: Created practice with ID: {practice_id}")
        
        # Get practice
        get_response = requests.get(f"{BASE_URL}/api/practices/{practice_id}", cookies=self.cookies)
        assert get_response.status_code == 200, f"Get practice failed: {get_response.text}"
        fetched = get_response.json()
        assert fetched.get("id") == practice_id, "Practice ID mismatch"
        assert fetched.get("status") == "draft", "New practice should be in draft status"
        print(f"PASS: Retrieved practice - status={fetched.get('status')}")
        
        # Cleanup - delete practice
        delete_response = requests.delete(f"{BASE_URL}/api/practices/{practice_id}", cookies=self.cookies)
        assert delete_response.status_code == 200, f"Delete practice failed: {delete_response.text}"
        print("PASS: Practice deleted successfully")


class TestDashboardAPI:
    """Dashboard API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin to get auth cookies"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@aic.it", "password": "Admin123!"}
        )
        self.cookies = response.cookies
    
    def test_dashboard_stats(self):
        """Test GET /api/dashboard/stats returns stats"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", cookies=self.cookies)
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        assert "total_practices" in data, "Dashboard should have total_practices"
        print(f"PASS: Dashboard stats - total_practices={data.get('total_practices')}")


class TestAgentsAPI:
    """Agents API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin to get auth cookies"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@aic.it", "password": "Admin123!"}
        )
        self.cookies = response.cookies
    
    def test_agents_info(self):
        """Test GET /api/agents/info returns agent information"""
        response = requests.get(f"{BASE_URL}/api/agents/info", cookies=self.cookies)
        assert response.status_code == 200, f"Agents info failed: {response.text}"
        data = response.json()
        assert "agents" in data, "Should have agents list"
        assert "admin_agent" in data, "Should have admin_agent (Father Agent)"
        assert data.get("admin_agent", {}).get("name") == "Herion Father Agent", "Admin agent should be Father Agent"
        print(f"PASS: Agents info - {len(data.get('agents', []))} agents, admin={data.get('admin_agent', {}).get('name')}")


class TestProfileAPI:
    """Profile API tests"""
    
    def test_creator_profile_has_creator_fields(self):
        """Test creator profile has is_creator and creator_uuid fields"""
        # Login as creator
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "gegexia94@gmail.com", "password": "HerionCreator2026!"}
        )
        cookies = login_response.cookies
        
        # Get profile
        profile_response = requests.get(f"{BASE_URL}/api/auth/profile", cookies=cookies)
        assert profile_response.status_code == 200, f"Profile failed: {profile_response.text}"
        data = profile_response.json()
        assert data.get("is_creator") == True, "Creator profile should have is_creator=true"
        assert data.get("creator_uuid") == "HERION-CREATOR-001", "Creator profile should have creator_uuid"
        print(f"PASS: Creator profile has is_creator={data.get('is_creator')}, creator_uuid={data.get('creator_uuid')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
