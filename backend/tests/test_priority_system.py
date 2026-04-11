"""
Test suite for the Priority System feature.
Tests: priority fields in API responses, sorting by priority, dashboard stats with priority.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@aic.it"
ADMIN_PASSWORD = "Admin123!"

# Known practice ID with escalated/urgent status
URGENT_PRACTICE_ID = "b50d4f78-5295-4119-a361-8aec381fee43"


class TestPrioritySystemAuth:
    """Authentication tests for priority system"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create a requests session with cookies"""
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_session(self, session):
        """Login and return authenticated session"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["email"] == ADMIN_EMAIL
        print(f"Login successful for {ADMIN_EMAIL}")
        return session


class TestPracticesListPriority(TestPrioritySystemAuth):
    """Test GET /api/practices returns priority fields and sorts by priority"""
    
    def test_practices_list_returns_priority_fields(self, auth_session):
        """Verify each practice has priority and priority_label fields"""
        response = auth_session.get(f"{BASE_URL}/api/practices")
        assert response.status_code == 200, f"Failed to get practices: {response.text}"
        
        practices = response.json()
        assert isinstance(practices, list), "Response should be a list"
        
        if len(practices) == 0:
            pytest.skip("No practices found in database")
        
        # Check first 5 practices for priority fields
        for i, practice in enumerate(practices[:5]):
            assert "priority" in practice, f"Practice {i} missing 'priority' field"
            assert "priority_label" in practice, f"Practice {i} missing 'priority_label' field"
            assert practice["priority"] in ["urgent", "high", "normal", "low"], \
                f"Practice {i} has invalid priority: {practice['priority']}"
            print(f"Practice {i}: priority={practice['priority']}, label={practice['priority_label']}")
        
        print(f"PASS: All {min(5, len(practices))} practices have priority and priority_label fields")
    
    def test_practices_sorted_by_priority(self, auth_session):
        """Verify practices are sorted by priority (urgent first, then high, normal, low)"""
        response = auth_session.get(f"{BASE_URL}/api/practices")
        assert response.status_code == 200
        
        practices = response.json()
        if len(practices) < 2:
            pytest.skip("Need at least 2 practices to test sorting")
        
        priority_order = {"urgent": 0, "high": 1, "normal": 2, "low": 3}
        
        # Check that practices are sorted by priority
        for i in range(len(practices) - 1):
            current_priority = priority_order.get(practices[i].get("priority", "normal"), 2)
            next_priority = priority_order.get(practices[i+1].get("priority", "normal"), 2)
            assert current_priority <= next_priority, \
                f"Practices not sorted by priority: {practices[i]['priority']} should come before {practices[i+1]['priority']}"
        
        print(f"PASS: {len(practices)} practices are correctly sorted by priority")


class TestSinglePracticePriority(TestPrioritySystemAuth):
    """Test GET /api/practices/{id} returns priority fields"""
    
    def test_single_practice_has_priority_fields(self, auth_session):
        """Verify single practice endpoint returns priority and priority_label"""
        # First get list to find a practice ID
        list_response = auth_session.get(f"{BASE_URL}/api/practices")
        assert list_response.status_code == 200
        
        practices = list_response.json()
        if len(practices) == 0:
            pytest.skip("No practices found")
        
        practice_id = practices[0]["id"]
        
        # Get single practice
        response = auth_session.get(f"{BASE_URL}/api/practices/{practice_id}")
        assert response.status_code == 200, f"Failed to get practice: {response.text}"
        
        practice = response.json()
        assert "priority" in practice, "Single practice missing 'priority' field"
        assert "priority_label" in practice, "Single practice missing 'priority_label' field"
        assert practice["priority"] in ["urgent", "high", "normal", "low"]
        
        print(f"PASS: Single practice {practice_id[:8]}... has priority={practice['priority']}, label={practice['priority_label']}")
    
    def test_urgent_practice_has_correct_priority(self, auth_session):
        """Test the known urgent/escalated practice has correct priority"""
        response = auth_session.get(f"{BASE_URL}/api/practices/{URGENT_PRACTICE_ID}")
        
        if response.status_code == 404:
            pytest.skip(f"Urgent practice {URGENT_PRACTICE_ID} not found")
        
        assert response.status_code == 200, f"Failed to get urgent practice: {response.text}"
        
        practice = response.json()
        assert "priority" in practice
        assert "priority_label" in practice
        
        # Escalated practices should be urgent
        if practice.get("status") == "escalated":
            assert practice["priority"] == "urgent", \
                f"Escalated practice should have urgent priority, got {practice['priority']}"
            print(f"PASS: Escalated practice has urgent priority")
        else:
            print(f"Practice status is {practice.get('status')}, priority is {practice['priority']}")


class TestDashboardStatsPriority(TestPrioritySystemAuth):
    """Test GET /api/dashboard/stats returns priority fields"""
    
    def test_dashboard_stats_recent_practices_have_priority(self, auth_session):
        """Verify recent_practices in dashboard stats have priority fields"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200, f"Failed to get dashboard stats: {response.text}"
        
        stats = response.json()
        assert "recent_practices" in stats, "Dashboard stats missing 'recent_practices'"
        
        recent = stats["recent_practices"]
        if len(recent) == 0:
            pytest.skip("No recent practices in dashboard")
        
        for i, practice in enumerate(recent[:5]):
            assert "priority" in practice, f"Recent practice {i} missing 'priority'"
            assert "priority_label" in practice, f"Recent practice {i} missing 'priority_label'"
            print(f"Recent practice {i}: priority={practice['priority']}, label={practice['priority_label']}")
        
        print(f"PASS: Dashboard recent_practices have priority fields")
    
    def test_dashboard_stats_critical_practices_have_priority(self, auth_session):
        """Verify critical_practices in dashboard stats have priority fields"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        
        stats = response.json()
        assert "critical_practices" in stats, "Dashboard stats missing 'critical_practices'"
        
        critical = stats["critical_practices"]
        if len(critical) == 0:
            print("No critical practices found (this is OK if no urgent/high priority practices exist)")
            return
        
        for i, practice in enumerate(critical[:5]):
            assert "priority" in practice, f"Critical practice {i} missing 'priority'"
            assert "priority_label" in practice, f"Critical practice {i} missing 'priority_label'"
            # Critical practices should be urgent or high
            assert practice["priority"] in ["urgent", "high"], \
                f"Critical practice {i} has unexpected priority: {practice['priority']}"
            print(f"Critical practice {i}: priority={practice['priority']}, label={practice['priority_label']}")
        
        print(f"PASS: Dashboard critical_practices have priority fields and correct priorities")
    
    def test_dashboard_stats_critical_practices_sorted_by_priority(self, auth_session):
        """Verify critical_practices are sorted by priority (urgent first)"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        
        stats = response.json()
        critical = stats.get("critical_practices", [])
        
        if len(critical) < 2:
            pytest.skip("Need at least 2 critical practices to test sorting")
        
        priority_order = {"urgent": 0, "high": 1, "normal": 2, "low": 3}
        
        for i in range(len(critical) - 1):
            current = priority_order.get(critical[i].get("priority", "normal"), 2)
            next_p = priority_order.get(critical[i+1].get("priority", "normal"), 2)
            assert current <= next_p, \
                f"Critical practices not sorted: {critical[i]['priority']} should come before {critical[i+1]['priority']}"
        
        print(f"PASS: Critical practices are sorted by priority")


class TestPriorityLabels(TestPrioritySystemAuth):
    """Test priority labels are in Italian"""
    
    def test_priority_labels_are_italian(self, auth_session):
        """Verify priority labels are in Italian (Urgente, Alta, Normale, Bassa)"""
        response = auth_session.get(f"{BASE_URL}/api/practices")
        assert response.status_code == 200
        
        practices = response.json()
        if len(practices) == 0:
            pytest.skip("No practices found")
        
        expected_labels = {
            "urgent": "Urgente",
            "high": "Alta",
            "normal": "Normale",
            "low": "Bassa"
        }
        
        for practice in practices[:10]:
            priority = practice.get("priority")
            label = practice.get("priority_label")
            
            if priority in expected_labels:
                assert label == expected_labels[priority], \
                    f"Priority '{priority}' should have label '{expected_labels[priority]}', got '{label}'"
        
        print(f"PASS: Priority labels are correctly in Italian")


class TestWaitingApprovalPractices(TestPrioritySystemAuth):
    """Test practices with waiting_approval status"""
    
    def test_waiting_approval_practices_exist(self, auth_session):
        """Check if waiting_approval practices exist and have priority"""
        response = auth_session.get(f"{BASE_URL}/api/practices")
        assert response.status_code == 200
        
        practices = response.json()
        waiting = [p for p in practices if p.get("status") == "waiting_approval"]
        
        if len(waiting) == 0:
            print("No waiting_approval practices found (this may be expected)")
            return
        
        for i, practice in enumerate(waiting[:3]):
            assert "priority" in practice
            assert "priority_label" in practice
            # waiting_approval should have at least high priority
            assert practice["priority"] in ["urgent", "high"], \
                f"Waiting approval practice should have high/urgent priority, got {practice['priority']}"
            print(f"Waiting approval practice {i}: priority={practice['priority']}")
        
        print(f"PASS: Found {len(waiting)} waiting_approval practices with correct priority")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
