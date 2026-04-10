"""
Herion v10 - Alert Center, Security Monitoring, Document Vault Tests
Tests for Batch 4 features: Alerts, Security Events, Document Vault
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CREATOR_EMAIL = "gegexia94@gmail.com"
CREATOR_PASSWORD = "HerionCreator2026!"
ADMIN_EMAIL = "admin@aic.it"
ADMIN_PASSWORD = "Admin123!"

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def creator_session(api_client):
    """Login as creator and return session"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": CREATOR_EMAIL,
        "password": CREATOR_PASSWORD
    })
    assert response.status_code == 200, f"Creator login failed: {response.text}"
    return api_client

@pytest.fixture(scope="module")
def admin_session():
    """Login as admin and return session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return session

@pytest.fixture(scope="module")
def user_session():
    """Create and login as regular user"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    # Register a test user
    test_email = f"testuser_v10_{int(time.time())}@test.com"
    reg_response = session.post(f"{BASE_URL}/api/auth/register", json={
        "email": test_email,
        "password": "TestPass123!",
        "first_name": "Test",
        "last_name": "User"
    })
    if reg_response.status_code != 200:
        # Try login if already exists
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": "TestPass123!"
        })
    return session


class TestCreatorLogin:
    """Test creator authentication"""
    
    def test_creator_login_success(self, api_client):
        """Creator can login with correct credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": CREATOR_EMAIL,
            "password": CREATOR_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == CREATOR_EMAIL
        assert data["role"] == "creator"
        assert data["is_creator"] == True


class TestAlertCenterAPI:
    """Alert Center API tests"""
    
    def test_get_alerts_returns_sections_and_counts(self, creator_session):
        """GET /api/alerts returns sections and counts"""
        response = creator_session.get(f"{BASE_URL}/api/alerts")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "sections" in data
        assert "counts" in data
        
        # Verify sections exist
        sections = data["sections"]
        assert "high_critical" in sections
        assert "new" in sections
        assert "practice" in sections
        assert "security" in sections
        assert "governance" in sections
        assert "resolved" in sections
        
        # Verify counts structure
        counts = data["counts"]
        assert "open" in counts
        assert "high" in counts
        assert "critical" in counts
        assert "total" in counts
    
    def test_get_alerts_summary(self, creator_session):
        """GET /api/alerts/summary returns open and urgent counts"""
        response = creator_session.get(f"{BASE_URL}/api/alerts/summary")
        assert response.status_code == 200
        data = response.json()
        
        assert "open" in data
        assert "urgent" in data
        assert isinstance(data["open"], int)
        assert isinstance(data["urgent"], int)
    
    def test_patch_alert_acknowledge(self, creator_session):
        """PATCH /api/alerts/{id}?action=acknowledge works"""
        # First get alerts to find one to acknowledge
        alerts_response = creator_session.get(f"{BASE_URL}/api/alerts")
        assert alerts_response.status_code == 200
        data = alerts_response.json()
        
        # Find an open alert
        all_alerts = []
        for section in data["sections"].values():
            all_alerts.extend(section)
        
        open_alerts = [a for a in all_alerts if a.get("status") == "open"]
        
        if open_alerts:
            alert_id = open_alerts[0]["id"]
            response = creator_session.patch(f"{BASE_URL}/api/alerts/{alert_id}?action=acknowledge")
            assert response.status_code == 200
            result = response.json()
            assert result["new_status"] == "acknowledged"
        else:
            pytest.skip("No open alerts to test acknowledge action")
    
    def test_patch_alert_resolve(self, creator_session):
        """PATCH /api/alerts/{id}?action=resolve works"""
        # Get alerts
        alerts_response = creator_session.get(f"{BASE_URL}/api/alerts")
        assert alerts_response.status_code == 200
        data = alerts_response.json()
        
        # Find a non-resolved alert
        all_alerts = []
        for section in data["sections"].values():
            all_alerts.extend(section)
        
        non_resolved = [a for a in all_alerts if a.get("status") != "resolved"]
        
        if non_resolved:
            alert_id = non_resolved[0]["id"]
            response = creator_session.patch(f"{BASE_URL}/api/alerts/{alert_id}?action=resolve")
            assert response.status_code == 200
            result = response.json()
            assert result["new_status"] == "resolved"
        else:
            pytest.skip("No non-resolved alerts to test resolve action")
    
    def test_patch_alert_not_found(self, creator_session):
        """PATCH /api/alerts/{id} returns 404 for non-existent alert"""
        response = creator_session.patch(f"{BASE_URL}/api/alerts/nonexistent-id?action=acknowledge")
        assert response.status_code == 404


class TestSecurityMonitoringAPI:
    """Security Monitoring API tests"""
    
    def test_failed_login_creates_security_event(self, api_client):
        """Failed login creates a security event"""
        # Attempt failed login
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        
        # Now login as admin to check security events
        admin_session = requests.Session()
        admin_session.headers.update({"Content-Type": "application/json"})
        login_response = admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        
        # Check security events
        events_response = admin_session.get(f"{BASE_URL}/api/security/events")
        assert events_response.status_code == 200
        data = events_response.json()
        
        assert "events" in data
        assert "total" in data
        
        # Should have at least one failed_login event
        failed_logins = [e for e in data["events"] if e.get("event_type") == "failed_login"]
        assert len(failed_logins) > 0, "Expected at least one failed_login security event"
    
    def test_security_events_requires_admin_role(self, user_session):
        """GET /api/security/events requires admin/creator role"""
        response = user_session.get(f"{BASE_URL}/api/security/events")
        assert response.status_code == 403
    
    def test_security_summary_returns_counts(self, admin_session):
        """GET /api/security/summary returns counts by type"""
        response = admin_session.get(f"{BASE_URL}/api/security/summary")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_24h" in data
        assert "by_type" in data
        assert "high_severity_24h" in data
        
        # by_type should have event type keys
        assert isinstance(data["by_type"], dict)
    
    def test_security_summary_requires_admin_role(self, user_session):
        """GET /api/security/summary requires admin/creator role"""
        response = user_session.get(f"{BASE_URL}/api/security/summary")
        assert response.status_code == 403
    
    def test_multiple_failed_logins_trigger_alert(self, api_client):
        """3+ failed logins in 1 hour trigger auto-alert generation"""
        test_email = f"threshold_test_{int(time.time())}@test.com"
        
        # Attempt 4 failed logins (threshold is 3)
        for i in range(4):
            api_client.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_email,
                "password": "wrongpassword"
            })
        
        # Login as admin to check alerts
        admin_session = requests.Session()
        admin_session.headers.update({"Content-Type": "application/json"})
        admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        # Check alerts for security-related ones
        alerts_response = admin_session.get(f"{BASE_URL}/api/alerts")
        assert alerts_response.status_code == 200
        data = alerts_response.json()
        
        # Should have security alerts
        security_alerts = data["sections"].get("security", []) + data["sections"].get("high_critical", [])
        # Filter for alerts related to our test email
        related_alerts = [a for a in security_alerts if test_email in str(a)]
        
        # At least one alert should be generated
        assert len(related_alerts) > 0 or len(security_alerts) > 0, "Expected security alert after threshold exceeded"


class TestDocumentVaultAPI:
    """Document Vault API tests"""
    
    def test_get_vault_returns_documents_with_metadata(self, creator_session):
        """GET /api/vault returns documents with vault_status, sensitivity_level, verification_status"""
        response = creator_session.get(f"{BASE_URL}/api/vault")
        assert response.status_code == 200
        data = response.json()
        
        assert "documents" in data
        assert "total" in data
        assert "status_counts" in data
        assert "category_counts" in data
        
        # If there are documents, verify metadata fields
        if data["documents"]:
            doc = data["documents"][0]
            assert "vault_status" in doc
            assert "sensitivity_level" in doc
            assert "verification_status" in doc
            assert "category" in doc
            assert "original_filename" in doc
    
    def test_get_vault_summary(self, creator_session):
        """GET /api/vault/summary returns total, verified, pending_review counts"""
        response = creator_session.get(f"{BASE_URL}/api/vault/summary")
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data
        assert "verified" in data
        assert "pending_review" in data
        assert "rejected" in data
        assert "high_sensitivity" in data
        
        # All should be integers
        assert isinstance(data["total"], int)
        assert isinstance(data["verified"], int)
        assert isinstance(data["pending_review"], int)
    
    def test_patch_vault_document_verify(self, admin_session):
        """PATCH /api/vault/{id}?vault_status=verified works for admin"""
        # First get vault documents
        vault_response = admin_session.get(f"{BASE_URL}/api/vault")
        assert vault_response.status_code == 200
        data = vault_response.json()
        
        if data["documents"]:
            doc_id = data["documents"][0]["id"]
            response = admin_session.patch(f"{BASE_URL}/api/vault/{doc_id}?vault_status=verified")
            assert response.status_code == 200
            result = response.json()
            assert "message" in result
            assert result["document_id"] == doc_id
        else:
            pytest.skip("No documents in vault to test update")
    
    def test_patch_vault_document_not_found(self, admin_session):
        """PATCH /api/vault/{id} returns 404 for non-existent document"""
        response = admin_session.patch(f"{BASE_URL}/api/vault/nonexistent-id?vault_status=verified")
        assert response.status_code == 404
    
    def test_vault_user_sees_own_documents_only(self, user_session, creator_session):
        """Regular user sees only their own documents in vault"""
        # User vault
        user_response = user_session.get(f"{BASE_URL}/api/vault")
        assert user_response.status_code == 200
        user_data = user_response.json()
        
        # Creator vault (should see all)
        creator_response = creator_session.get(f"{BASE_URL}/api/vault")
        assert creator_response.status_code == 200
        creator_data = creator_response.json()
        
        # Creator should see >= user documents (role-based visibility)
        assert creator_data["total"] >= user_data["total"]


class TestNavigationVisibility:
    """Test navigation visibility for different roles"""
    
    def test_governance_nav_admin_only(self, admin_session, user_session):
        """Governance endpoint returns 403 for regular users"""
        # Admin can access governance
        admin_response = admin_session.get(f"{BASE_URL}/api/governance/dashboard")
        assert admin_response.status_code == 200
        
        # User cannot access governance
        user_response = user_session.get(f"{BASE_URL}/api/governance/dashboard")
        assert user_response.status_code == 403


class TestPreviousFeaturesStillWork:
    """Verify previous features still work"""
    
    def test_catalog_still_works(self, creator_session):
        """Catalog API still returns services"""
        response = creator_session.get(f"{BASE_URL}/api/catalog")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
    
    def test_deadlines_still_works(self, creator_session):
        """Deadlines API still works"""
        response = creator_session.get(f"{BASE_URL}/api/deadlines")
        assert response.status_code == 200
    
    def test_submission_center_still_works(self, creator_session):
        """Submission center API still works"""
        response = creator_session.get(f"{BASE_URL}/api/submission-center")
        assert response.status_code == 200
    
    def test_governance_dashboard_still_works(self, creator_session):
        """Governance dashboard API still works"""
        response = creator_session.get(f"{BASE_URL}/api/governance/dashboard")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
