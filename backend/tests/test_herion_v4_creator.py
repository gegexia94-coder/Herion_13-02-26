"""
Herion v4.0 - Creator Control Room, Father Agent, Practice Catalog, Authority Registry Tests
Tests for:
1. Public Welcome page (no auth required)
2. Creator login and auto-redirect
3. Admin login (should NOT redirect to /creator)
4. Creator Control Room access
5. Practice Catalog (20 entries)
6. Authority Registry (14+ entries)
7. Agents info (12 total: 11 specialists + Father Agent)
8. Registration blocking for Creator email
9. Profile/Settings page
10. Status badges for all statuses
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
CREATOR_EMAIL = "gegexia94@gmail.com"
CREATOR_PASSWORD = "HerionCreator2026!"
ADMIN_EMAIL = "admin@aic.it"
ADMIN_PASSWORD = "Admin123!"


class TestHealthAndBasics:
    """Basic health and root endpoint tests"""
    
    def test_health_endpoint(self):
        """Health endpoint should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health endpoint returns healthy status")
    
    def test_root_endpoint(self):
        """Root endpoint should show Herion branding"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        print("✓ Root endpoint accessible")


class TestCreatorAuth:
    """Creator authentication and access tests"""
    
    def test_creator_login_success(self):
        """Creator should be able to login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CREATOR_EMAIL,
            "password": CREATOR_PASSWORD
        })
        assert response.status_code == 200, f"Creator login failed: {response.text}"
        data = response.json()
        
        # Verify creator-specific fields
        assert data.get("email") == CREATOR_EMAIL.lower()
        assert data.get("is_creator") == True, "is_creator should be True"
        assert data.get("creator_uuid") == "HERION-CREATOR-001", f"Expected HERION-CREATOR-001, got {data.get('creator_uuid')}"
        assert data.get("role") == "creator", f"Expected role 'creator', got {data.get('role')}"
        print(f"✓ Creator login successful: {data.get('email')}, is_creator={data.get('is_creator')}, creator_uuid={data.get('creator_uuid')}")
        return response.cookies
    
    def test_creator_email_blocked_from_registration(self):
        """Creator email should be blocked from public registration"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": CREATOR_EMAIL,
            "password": "SomePassword123!",
            "first_name": "Test",
            "last_name": "User"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "non disponibile" in data.get("detail", "").lower() or "registrazione" in data.get("detail", "").lower(), f"Expected registration blocked message, got: {data}"
        print(f"✓ Creator email correctly blocked from registration: {data.get('detail')}")


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Admin should be able to login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        
        # Verify admin fields
        assert data.get("email") == ADMIN_EMAIL.lower()
        assert data.get("role") == "admin", f"Expected role 'admin', got {data.get('role')}"
        assert data.get("is_creator") != True, "Admin should NOT have is_creator=True"
        print(f"✓ Admin login successful: {data.get('email')}, role={data.get('role')}, is_creator={data.get('is_creator')}")
        return response.cookies
    
    def test_invalid_credentials_rejected(self):
        """Invalid credentials should be rejected"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")


class TestPracticeCatalog:
    """Practice Catalog tests - should have 20 entries"""
    
    @pytest.fixture
    def auth_cookies(self):
        """Get auth cookies from admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.cookies
    
    def test_catalog_returns_20_entries(self, auth_cookies):
        """GET /api/catalog should return 20 practice catalog entries"""
        response = requests.get(f"{BASE_URL}/api/catalog", cookies=auth_cookies)
        assert response.status_code == 200, f"Catalog request failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Catalog should return a list"
        assert len(data) >= 20, f"Expected at least 20 catalog entries, got {len(data)}"
        
        # Verify structure of first entry
        if len(data) > 0:
            entry = data[0]
            assert "practice_id" in entry, "Catalog entry should have practice_id"
            print(f"✓ Catalog has {len(data)} entries, first entry practice_id: {entry.get('practice_id')}")
        
        # Check for expected practice_ids
        practice_ids = [e.get("practice_id") for e in data]
        expected_ids = ["VAT_OPEN_PF", "F24_PREPARATION", "INFO_FISCAL_GENERIC"]
        found_ids = [pid for pid in expected_ids if pid in practice_ids]
        print(f"✓ Found expected practice_ids: {found_ids}")
        
        return data
    
    def test_catalog_requires_auth(self):
        """Catalog endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/catalog")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Catalog correctly requires authentication")


class TestAuthorityRegistry:
    """Authority Registry tests - should have 14+ entries"""
    
    @pytest.fixture
    def auth_cookies(self):
        """Get auth cookies from admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.cookies
    
    def test_registry_returns_14_plus_entries(self, auth_cookies):
        """GET /api/registry should return 14+ authority registry entries"""
        response = requests.get(f"{BASE_URL}/api/registry", cookies=auth_cookies)
        assert response.status_code == 200, f"Registry request failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Registry should return a list"
        assert len(data) >= 14, f"Expected at least 14 registry entries, got {len(data)}"
        
        # Verify structure of first entry
        if len(data) > 0:
            entry = data[0]
            assert "registry_id" in entry, "Registry entry should have registry_id"
            print(f"✓ Registry has {len(data)} entries, first entry registry_id: {entry.get('registry_id')}")
        
        # Check for expected registry_ids
        registry_ids = [e.get("registry_id") for e in data]
        expected_ids = ["AE_VAT_OPEN_PF", "INPS_GESTIONE_SEP"]
        found_ids = [rid for rid in expected_ids if rid in registry_ids]
        print(f"✓ Found expected registry_ids: {found_ids}")
        
        return data
    
    def test_registry_requires_auth(self):
        """Registry endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/registry")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Registry correctly requires authentication")


class TestAgentsInfo:
    """Agents info tests - should have 12 total agents (11 specialists + Father Agent)"""
    
    @pytest.fixture
    def auth_cookies(self):
        """Get auth cookies from admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.cookies
    
    def test_agents_info_returns_12_agents(self, auth_cookies):
        """GET /api/agents/info should return 12 total agents"""
        response = requests.get(f"{BASE_URL}/api/agents/info", cookies=auth_cookies)
        assert response.status_code == 200, f"Agents info request failed: {response.text}"
        data = response.json()
        
        # Check total_agents count
        total_agents = data.get("total_agents")
        assert total_agents == 12, f"Expected 12 total agents, got {total_agents}"
        
        # Check agents list
        agents = data.get("agents", [])
        assert len(agents) == 11, f"Expected 11 specialist agents, got {len(agents)}"
        
        # Check admin_agent (Father Agent)
        admin_agent = data.get("admin_agent", {})
        assert admin_agent.get("name") == "Herion Father Agent", f"Expected 'Herion Father Agent', got {admin_agent.get('name')}"
        
        print(f"✓ Agents info: {total_agents} total agents, {len(agents)} specialists")
        print(f"✓ Father Agent name: {admin_agent.get('name')}")
        
        return data
    
    def test_agents_pipeline_has_11_steps(self, auth_cookies):
        """Workflow steps should have 11 specialist agents"""
        response = requests.get(f"{BASE_URL}/api/agents/info", cookies=auth_cookies)
        data = response.json()
        
        workflow_steps = data.get("workflow_steps", [])
        assert len(workflow_steps) == 11, f"Expected 11 workflow steps, got {len(workflow_steps)}"
        
        # Check for research and routing agents
        assert "research" in workflow_steps, "Pipeline should include 'research' agent"
        assert "routing" in workflow_steps, "Pipeline should include 'routing' agent"
        
        print(f"✓ Pipeline has {len(workflow_steps)} steps: {workflow_steps}")
        
        return workflow_steps
    
    def test_father_agent_not_herion_admin(self, auth_cookies):
        """Father Agent should be labeled 'Herion Father Agent' not 'Herion Admin'"""
        response = requests.get(f"{BASE_URL}/api/agents/info", cookies=auth_cookies)
        data = response.json()
        
        admin_agent = data.get("admin_agent", {})
        name = admin_agent.get("name", "")
        
        assert "Father" in name, f"Expected 'Father' in admin agent name, got: {name}"
        assert name != "Herion Admin", f"Admin agent should NOT be 'Herion Admin', got: {name}"
        
        print(f"✓ Father Agent correctly named: {name}")


class TestProfileSettings:
    """Profile/Settings page tests"""
    
    @pytest.fixture
    def auth_cookies(self):
        """Get auth cookies from admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.cookies
    
    def test_profile_endpoint_returns_user_info(self, auth_cookies):
        """GET /api/auth/profile should return user info"""
        response = requests.get(f"{BASE_URL}/api/auth/profile", cookies=auth_cookies)
        assert response.status_code == 200, f"Profile request failed: {response.text}"
        data = response.json()
        
        assert "email" in data, "Profile should include email"
        assert "role" in data, "Profile should include role"
        print(f"✓ Profile endpoint returns user info: {data.get('email')}, role={data.get('role')}")
        
        return data
    
    def test_profile_update_works(self, auth_cookies):
        """PUT /api/auth/profile should update user info"""
        # Update profile
        update_data = {
            "phone": "+39 123 456 7890",
            "city": "Roma"
        }
        response = requests.put(f"{BASE_URL}/api/auth/profile", json=update_data, cookies=auth_cookies)
        assert response.status_code == 200, f"Profile update failed: {response.text}"
        
        # Verify update
        data = response.json()
        assert data.get("phone") == update_data["phone"], f"Phone not updated: {data.get('phone')}"
        assert data.get("city") == update_data["city"], f"City not updated: {data.get('city')}"
        
        print(f"✓ Profile update works: phone={data.get('phone')}, city={data.get('city')}")


class TestCreatorProfile:
    """Creator-specific profile tests"""
    
    @pytest.fixture
    def creator_cookies(self):
        """Get auth cookies from creator login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CREATOR_EMAIL,
            "password": CREATOR_PASSWORD
        })
        return response.cookies
    
    def test_creator_profile_has_creator_fields(self, creator_cookies):
        """Creator profile should have is_creator and creator_uuid"""
        response = requests.get(f"{BASE_URL}/api/auth/profile", cookies=creator_cookies)
        assert response.status_code == 200, f"Creator profile request failed: {response.text}"
        data = response.json()
        
        assert data.get("is_creator") == True, f"Expected is_creator=True, got {data.get('is_creator')}"
        assert data.get("creator_uuid") == "HERION-CREATOR-001", f"Expected HERION-CREATOR-001, got {data.get('creator_uuid')}"
        assert data.get("role") == "creator", f"Expected role='creator', got {data.get('role')}"
        
        print(f"✓ Creator profile has correct fields: is_creator={data.get('is_creator')}, creator_uuid={data.get('creator_uuid')}")


class TestStatusBadges:
    """Status badges tests - all statuses should be supported"""
    
    @pytest.fixture
    def auth_cookies(self):
        """Get auth cookies from admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.cookies
    
    def test_practice_status_update_all_statuses(self, auth_cookies):
        """Practice should support all status values"""
        # Create a practice first
        practice_data = {
            "practice_type": "vat_registration",
            "description": "Test practice for status testing",
            "client_name": "Test Client",
            "client_type": "private"
        }
        create_response = requests.post(f"{BASE_URL}/api/practices", json=practice_data, cookies=auth_cookies)
        assert create_response.status_code == 200, f"Practice creation failed: {create_response.text}"
        practice = create_response.json()
        practice_id = practice.get("id")
        
        # Test all status values
        statuses_to_test = ["draft", "waiting_approval", "blocked", "escalated", "in_progress"]
        
        for status in statuses_to_test:
            update_response = requests.put(
                f"{BASE_URL}/api/practices/{practice_id}",
                json={"status": status},
                cookies=auth_cookies
            )
            assert update_response.status_code == 200, f"Status update to '{status}' failed: {update_response.text}"
            updated = update_response.json()
            assert updated.get("status") == status, f"Expected status '{status}', got {updated.get('status')}"
            print(f"✓ Status '{status}' works, label: {updated.get('status_label')}")
        
        # Cleanup - delete the test practice
        requests.delete(f"{BASE_URL}/api/practices/{practice_id}", cookies=auth_cookies)
        print("✓ All status values work correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
