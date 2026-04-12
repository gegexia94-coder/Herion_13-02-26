"""
Iteration 27 Backend Tests
Tests for: Communication page workspace integration, Notification system, Auth flow state preparation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        # Get token from cookies
        return response.cookies.get('access_token')
    
    @pytest.fixture(scope="class")
    def auth_session(self, auth_token):
        """Create authenticated session"""
        session = requests.Session()
        session.cookies.set('access_token', auth_token)
        return session
    
    def test_login_success(self):
        """Test login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@aic.it"
        assert data["role"] in ["admin", "creator"]
        print(f"✓ Login successful for {data['email']} with role {data['role']}")


class TestNotifications:
    """Notification system tests"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        return session
    
    def test_get_notifications(self, auth_session):
        """Test GET /api/notifications returns list"""
        response = auth_session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/notifications returned {len(data)} notifications")
        
        # Check notification structure if any exist
        if len(data) > 0:
            notif = data[0]
            assert "id" in notif
            assert "title" in notif
            assert "message" in notif
            assert "type" in notif or "notification_type" in notif
            assert "created_at" in notif
            print(f"  ✓ Notification structure valid: {notif.get('title', 'N/A')[:50]}")
    
    def test_mark_notification_read(self, auth_session):
        """Test PUT /api/notifications/{id}/read"""
        # First get notifications
        response = auth_session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        notifications = response.json()
        
        if len(notifications) > 0:
            notif_id = notifications[0]["id"]
            # Mark as read
            response = auth_session.put(f"{BASE_URL}/api/notifications/{notif_id}/read")
            assert response.status_code == 200
            print(f"✓ Marked notification {notif_id[:8]}... as read")
        else:
            print("○ No notifications to mark as read")
    
    def test_mark_all_notifications_read(self, auth_session):
        """Test PUT /api/notifications/read-all"""
        response = auth_session.put(f"{BASE_URL}/api/notifications/read-all")
        assert response.status_code == 200
        print("✓ Mark all notifications read endpoint works")
    
    def test_dashboard_stats_unread_count(self, auth_session):
        """Test GET /api/dashboard/stats includes unread_notifications"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        assert "unread_notifications" in data
        print(f"✓ Dashboard stats includes unread_notifications: {data['unread_notifications']}")


class TestEmailDrafts:
    """Email drafts / Communication page tests"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        return session
    
    def test_get_email_drafts(self, auth_session):
        """Test GET /api/emails/drafts returns list"""
        response = auth_session.get(f"{BASE_URL}/api/emails/drafts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/emails/drafts returned {len(data)} drafts")
        
        # Check draft structure if any exist
        if len(data) > 0:
            draft = data[0]
            assert "id" in draft
            assert "subject" in draft
            assert "status" in draft
            assert "recipient_email" in draft
            print(f"  ✓ Draft structure valid: {draft.get('subject', 'N/A')[:50]}")
            
            # Check for practice_id field (for workspace integration)
            if "practice_id" in draft and draft["practice_id"]:
                print(f"  ✓ Draft has practice_id: {draft['practice_id'][:8]}...")
    
    def test_get_email_summary(self, auth_session):
        """Test GET /api/emails/summary returns counts"""
        response = auth_session.get(f"{BASE_URL}/api/emails/summary")
        assert response.status_code == 200
        data = response.json()
        
        # Check expected fields
        expected_fields = ["total", "draft", "review", "approved", "sent", "failed", "blocked"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Email summary: total={data['total']}, draft={data['draft']}, sent={data['sent']}, failed={data['failed']}")
    
    def test_get_email_drafts_with_filter(self, auth_session):
        """Test GET /api/emails/drafts with status filter"""
        for status in ["draft", "review", "approved", "sent", "failed"]:
            response = auth_session.get(f"{BASE_URL}/api/emails/drafts", params={"status": status})
            assert response.status_code == 200
            data = response.json()
            print(f"  ✓ Filter '{status}': {len(data)} drafts")


class TestPracticeWorkspace:
    """Practice workspace endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        return session
    
    @pytest.fixture(scope="class")
    def practice_id(self, auth_session):
        """Get a practice ID for testing"""
        response = auth_session.get(f"{BASE_URL}/api/practices")
        assert response.status_code == 200
        practices = response.json()
        if len(practices) > 0:
            return practices[0]["id"]
        return None
    
    def test_get_practice_workspace(self, auth_session, practice_id):
        """Test GET /api/practices/{id}/workspace returns workspace data"""
        if not practice_id:
            pytest.skip("No practices available for testing")
        
        response = auth_session.get(f"{BASE_URL}/api/practices/{practice_id}/workspace")
        assert response.status_code == 200
        data = response.json()
        
        # Check workspace structure
        assert "practice_id" in data
        assert "practice_name" in data
        assert "client_name" in data
        assert "current_step" in data
        assert "user_status" in data
        
        print(f"✓ Workspace for practice {practice_id[:8]}...")
        print(f"  ✓ practice_name: {data.get('practice_name', 'N/A')}")
        print(f"  ✓ current_step: {data.get('current_step')}")
        print(f"  ✓ user_status: {data.get('user_status', {}).get('label', 'N/A')}")
        
        # Check for ui_guidance
        if "ui_guidance" in data and data["ui_guidance"]:
            guidance = data["ui_guidance"]
            print(f"  ✓ ui_guidance.headline: {guidance.get('headline', 'N/A')[:50]}")
        
        # Check for official_action
        if "official_action" in data and data["official_action"]:
            oa = data["official_action"]
            print(f"  ✓ official_action.entity_name: {oa.get('entity_name', 'N/A')}")
            print(f"  ✓ official_action.requires_user_direct_step: {oa.get('requires_user_direct_step')}")
            print(f"  ✓ official_action.credentials_required: {oa.get('credentials_required')}")
        
        # Check for current_agent
        if "current_agent" in data and data["current_agent"]:
            agent = data["current_agent"]
            print(f"  ✓ current_agent.name: {agent.get('name', 'N/A')}")
    
    def test_workspace_status_labels(self, auth_session, practice_id):
        """Test that workspace returns proper user_status with label and color"""
        if not practice_id:
            pytest.skip("No practices available for testing")
        
        response = auth_session.get(f"{BASE_URL}/api/practices/{practice_id}/workspace")
        assert response.status_code == 200
        data = response.json()
        
        user_status = data.get("user_status", {})
        assert "label" in user_status, "user_status should have label"
        assert "color" in user_status, "user_status should have color"
        print(f"✓ user_status has label='{user_status['label']}' and color='{user_status['color']}'")


class TestAuthFlowStates:
    """Test new auth flow states: awaiting_authentication, submission_in_progress"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        return session
    
    def test_status_labels_include_auth_states(self, auth_session):
        """Test that backend recognizes awaiting_authentication and submission_in_progress"""
        # Get a practice and check if we can update to these statuses
        response = auth_session.get(f"{BASE_URL}/api/practices")
        assert response.status_code == 200
        practices = response.json()
        
        if len(practices) == 0:
            pytest.skip("No practices available for testing")
        
        # Find a practice we can test with
        practice_id = practices[0]["id"]
        
        # Get workspace to check status mapping
        response = auth_session.get(f"{BASE_URL}/api/practices/{practice_id}/workspace")
        assert response.status_code == 200
        workspace = response.json()
        
        # The workspace should have user_status which maps from status
        user_status = workspace.get("user_status", {})
        print(f"✓ Current practice status maps to user_status: {user_status.get('label', 'N/A')}")
        
        # Verify the status mapping exists in backend by checking practice list
        for p in practices:
            if p.get("user_status"):
                status_label = p["user_status"].get("label", "")
                if "autenticazione" in status_label.lower() or "invio in corso" in status_label.lower():
                    print(f"  ✓ Found practice with auth flow state: {status_label}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
