"""
Herion Batch 5 Testing - Guard, Follow-Up, Template Instance
Tests for:
1. GET /api/guard/evaluate/{practice_id} - Guard evaluation with dimensions and alternatives
2. GET /api/guard/summary - Summary of guard evaluations
3. GET /api/follow-ups - Follow-up items with urgency states
4. GET /api/follow-ups/summary - Follow-up counts
5. PATCH /api/follow-ups/{id} - Resolve follow-up (admin only)
6. POST /api/practices/from-template - Create practice from template
7. Nexus S.r.l. practice seeded from COMPANY_CLOSURE template
8. Governance call includes guard result
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminLogin:
    """Test admin login to get session cookies"""
    
    def test_admin_login(self):
        """Login as admin to get auth cookies"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@aic.it", "password": "Admin123!"}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert data["role"] == "admin"
        assert "admin@aic.it" in data["email"]
        print(f"Admin login successful: {data['email']}")
        # Store cookies for subsequent tests
        TestAdminLogin.cookies = response.cookies
        TestAdminLogin.user_id = data["id"]


class TestGuardEvaluationAPI:
    """Test Herion Guard evaluation endpoints"""
    
    def test_guard_evaluate_returns_verdict_and_dimensions(self):
        """GET /api/guard/evaluate/{practice_id} returns verdict, dimensions, score, safe_alternatives"""
        # First get a practice to evaluate
        response = requests.get(
            f"{BASE_URL}/api/practices",
            cookies=TestAdminLogin.cookies
        )
        assert response.status_code == 200
        practices = response.json()
        assert len(practices) > 0, "No practices found to evaluate"
        
        practice_id = practices[0]["id"]
        
        # Call guard evaluation
        response = requests.get(
            f"{BASE_URL}/api/guard/evaluate/{practice_id}",
            cookies=TestAdminLogin.cookies
        )
        assert response.status_code == 200, f"Guard evaluate failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "verdict" in data, "Missing verdict in guard response"
        assert "verdict_label" in data, "Missing verdict_label"
        assert "guard_score" in data, "Missing guard_score"
        assert "dimensions" in data, "Missing dimensions"
        assert "safe_alternatives" in data, "Missing safe_alternatives"
        assert "can_proceed" in data, "Missing can_proceed"
        
        # Verify verdict is one of expected values
        assert data["verdict"] in ["cleared", "guarded", "hard_blocked"], f"Unexpected verdict: {data['verdict']}"
        
        # Verify dimensions structure
        assert isinstance(data["dimensions"], list), "Dimensions should be a list"
        if len(data["dimensions"]) > 0:
            dim = data["dimensions"][0]
            assert "key" in dim, "Dimension missing key"
            assert "label" in dim, "Dimension missing label"
            assert "status" in dim, "Dimension missing status"
            assert "detail" in dim, "Dimension missing detail"
        
        # Verify guard_score is a number 0-100
        assert isinstance(data["guard_score"], (int, float)), "guard_score should be numeric"
        assert 0 <= data["guard_score"] <= 100, f"guard_score out of range: {data['guard_score']}"
        
        print(f"Guard evaluation: verdict={data['verdict']}, score={data['guard_score']}%, dimensions={len(data['dimensions'])}")
    
    def test_guard_summary_returns_evaluations(self):
        """GET /api/guard/summary returns summary of guard evaluations"""
        response = requests.get(
            f"{BASE_URL}/api/guard/summary",
            cookies=TestAdminLogin.cookies
        )
        assert response.status_code == 200, f"Guard summary failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "evaluations" in data, "Missing evaluations in summary"
        
        # Verify summary counts are at top level
        assert "cleared" in data, "Missing cleared count"
        assert "guarded" in data, "Missing guarded count"
        assert "blocked" in data, "Missing blocked count"
        assert "total_evaluated" in data, "Missing total_evaluated count"
        
        print(f"Guard summary: cleared={data['cleared']}, guarded={data['guarded']}, blocked={data['blocked']}, total={data['total_evaluated']}")


class TestFollowUpAPI:
    """Test Follow-Up System endpoints"""
    
    def test_get_follow_ups_returns_items(self):
        """GET /api/follow-ups returns follow-up items with urgency states"""
        response = requests.get(
            f"{BASE_URL}/api/follow-ups",
            cookies=TestAdminLogin.cookies
        )
        assert response.status_code == 200, f"Get follow-ups failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Follow-ups should be a list"
        
        if len(data) > 0:
            item = data[0]
            # Verify item structure
            assert "id" in item, "Follow-up missing id"
            assert "practice_id" in item, "Follow-up missing practice_id"
            assert "label" in item, "Follow-up missing label"
            assert "description" in item, "Follow-up missing description"
            assert "urgency" in item, "Follow-up missing urgency"
            assert "status" in item, "Follow-up missing status"
            
            # Verify urgency is valid
            assert item["urgency"] in ["pending", "overdue", "critical", "resolved"], f"Invalid urgency: {item['urgency']}"
            
            print(f"Follow-up item: {item['label']}, urgency={item['urgency']}, status={item['status']}")
        else:
            print("No follow-up items found (this is OK if no active practices)")
    
    def test_get_follow_ups_with_status_filter(self):
        """GET /api/follow-ups?status=open filters by status"""
        response = requests.get(
            f"{BASE_URL}/api/follow-ups?status=open",
            cookies=TestAdminLogin.cookies
        )
        assert response.status_code == 200
        data = response.json()
        
        # All items should have status=open
        for item in data:
            assert item["status"] == "open", f"Expected status=open, got {item['status']}"
        
        print(f"Open follow-ups: {len(data)}")
    
    def test_get_follow_ups_summary(self):
        """GET /api/follow-ups/summary returns counts"""
        response = requests.get(
            f"{BASE_URL}/api/follow-ups/summary",
            cookies=TestAdminLogin.cookies
        )
        assert response.status_code == 200, f"Follow-ups summary failed: {response.text}"
        data = response.json()
        
        # Verify summary structure
        assert "total_open" in data, "Missing total_open"
        assert "pending" in data, "Missing pending"
        assert "overdue" in data, "Missing overdue"
        assert "critical" in data, "Missing critical"
        assert "resolved" in data, "Missing resolved"
        
        # All counts should be non-negative integers
        for key in ["total_open", "pending", "overdue", "critical", "resolved"]:
            assert isinstance(data[key], int), f"{key} should be int"
            assert data[key] >= 0, f"{key} should be non-negative"
        
        print(f"Follow-up summary: open={data['total_open']}, pending={data['pending']}, overdue={data['overdue']}, critical={data['critical']}, resolved={data['resolved']}")
    
    def test_resolve_follow_up_admin_only(self):
        """PATCH /api/follow-ups/{id} resolves a follow-up (admin only)"""
        # First get an open follow-up
        response = requests.get(
            f"{BASE_URL}/api/follow-ups?status=open",
            cookies=TestAdminLogin.cookies
        )
        assert response.status_code == 200
        items = response.json()
        
        if len(items) == 0:
            pytest.skip("No open follow-ups to resolve")
        
        follow_up_id = items[0]["id"]
        
        # Resolve it
        response = requests.patch(
            f"{BASE_URL}/api/follow-ups/{follow_up_id}",
            cookies=TestAdminLogin.cookies
        )
        assert response.status_code == 200, f"Resolve follow-up failed: {response.text}"
        data = response.json()
        
        assert "message" in data, "Missing message in response"
        assert "id" in data, "Missing id in response"
        assert data["id"] == follow_up_id
        
        print(f"Follow-up resolved: {follow_up_id}")


class TestTemplateInstanceAPI:
    """Test practice creation from template"""
    
    def test_create_practice_from_template(self):
        """POST /api/practices/from-template creates practice from catalog template"""
        # Use COMPANY_CLOSURE template
        payload = {
            "template_id": "COMPANY_CLOSURE",
            "client_name": "TEST_Template_Company S.r.l.",
            "client_type": "company",
            "country": "IT",
            "fiscal_code": "TSTCMP00A00H000X",
            "vat_number": "IT12345678901",
            "company_name": "TEST_Template_Company S.r.l.",
            "description": "Test practice created from COMPANY_CLOSURE template",
            "notes": "Automated test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/practices/from-template",
            json=payload,
            cookies=TestAdminLogin.cookies
        )
        assert response.status_code == 200, f"Create from template failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "message" in data, "Missing message"
        assert "practice" in data, "Missing practice"
        
        practice = data["practice"]
        assert practice["client_name"] == payload["client_name"]
        assert practice["template_source"] == "COMPANY_CLOSURE"
        assert practice["status"] == "draft"
        
        # Verify template metadata was copied
        assert "template_workflow_steps" in practice, "Missing template_workflow_steps"
        assert "template_readiness_criteria" in practice, "Missing template_readiness_criteria"
        assert "blocking_conditions" in practice, "Missing blocking_conditions"
        assert "assigned_agents" in practice, "Missing assigned_agents"
        
        print(f"Practice created from template: {practice['id']}, type={practice['practice_type_label']}")
        
        # Store for cleanup
        TestTemplateInstanceAPI.created_practice_id = practice["id"]
    
    def test_template_not_found_returns_404(self):
        """POST /api/practices/from-template with invalid template returns 404"""
        payload = {
            "template_id": "NONEXISTENT_TEMPLATE",
            "client_name": "Test Client",
            "client_type": "company"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/practices/from-template",
            json=payload,
            cookies=TestAdminLogin.cookies
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Template not found correctly returns 404")


class TestNexusPracticeSeeded:
    """Test that Nexus S.r.l. practice was seeded from COMPANY_CLOSURE template"""
    
    def test_nexus_practice_exists(self):
        """Nexus S.r.l. practice exists in DB seeded from COMPANY_CLOSURE template"""
        response = requests.get(
            f"{BASE_URL}/api/practices",
            cookies=TestAdminLogin.cookies
        )
        assert response.status_code == 200
        practices = response.json()
        
        # Find Nexus S.r.l. practice
        nexus_practice = None
        for p in practices:
            if p.get("client_name") == "Nexus S.r.l.":
                nexus_practice = p
                break
        
        assert nexus_practice is not None, "Nexus S.r.l. practice not found in database"
        
        # Verify it was created from COMPANY_CLOSURE template
        assert nexus_practice.get("template_source") == "COMPANY_CLOSURE", f"Expected template_source=COMPANY_CLOSURE, got {nexus_practice.get('template_source')}"
        assert nexus_practice.get("practice_type") == "COMPANY_CLOSURE"
        assert nexus_practice.get("client_type") == "company"
        assert nexus_practice.get("country") == "IT"
        
        print(f"Nexus S.r.l. practice found: id={nexus_practice['id']}, template={nexus_practice['template_source']}")
        
        # Store for guard test
        TestNexusPracticeSeeded.nexus_id = nexus_practice["id"]
    
    def test_nexus_guard_evaluation(self):
        """Guard evaluation works on Nexus S.r.l. practice"""
        if not hasattr(TestNexusPracticeSeeded, 'nexus_id'):
            pytest.skip("Nexus practice not found")
        
        response = requests.get(
            f"{BASE_URL}/api/guard/evaluate/{TestNexusPracticeSeeded.nexus_id}",
            cookies=TestAdminLogin.cookies
        )
        assert response.status_code == 200, f"Guard evaluate on Nexus failed: {response.text}"
        data = response.json()
        
        assert "verdict" in data
        assert "dimensions" in data
        assert "safe_alternatives" in data
        
        print(f"Nexus guard evaluation: verdict={data['verdict']}, score={data['guard_score']}%")


class TestGovernanceIncludesGuard:
    """Test that governance call includes guard result"""
    
    def test_governance_check_includes_guard(self):
        """GET /api/governance/check/{practice_id} includes guard result"""
        # Get a practice
        response = requests.get(
            f"{BASE_URL}/api/practices",
            cookies=TestAdminLogin.cookies
        )
        assert response.status_code == 200
        practices = response.json()
        
        if len(practices) == 0:
            pytest.skip("No practices to test governance")
        
        practice_id = practices[0]["id"]
        
        # Call governance check
        response = requests.get(
            f"{BASE_URL}/api/governance/check/{practice_id}?action=submit",
            cookies=TestAdminLogin.cookies
        )
        assert response.status_code == 200, f"Governance check failed: {response.text}"
        data = response.json()
        
        # Verify guard is included (key is 'guard' not 'guard_result')
        assert "guard" in data, "Missing guard in governance response"
        
        guard = data["guard"]
        assert "verdict" in guard, "Guard result missing verdict"
        assert "guard_score" in guard, "Guard result missing guard_score"
        assert "dimensions" in guard, "Guard result missing dimensions"
        
        print(f"Governance includes guard: verdict={guard['verdict']}, score={guard['guard_score']}%")


class TestCreatorPasswordProtection:
    """Test that creator password is not exposed"""
    
    def test_test_credentials_shows_protected(self):
        """Creator password in test_credentials.md shows PROTECTED, not actual password"""
        # Read the test_credentials.md file
        import os
        creds_path = "/app/memory/test_credentials.md"
        
        assert os.path.exists(creds_path), "test_credentials.md not found"
        
        with open(creds_path, 'r') as f:
            content = f.read()
        
        # Check that creator password is marked as PROTECTED
        assert "PROTECTED" in content, "Creator password should be marked as PROTECTED"
        
        # Check that the actual password is NOT in the file
        # The actual password from previous tests was "HerionCreator2026!"
        assert "HerionCreator2026!" not in content, "Actual creator password should NOT be in test_credentials.md"
        
        print("Creator password correctly marked as PROTECTED in test_credentials.md")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_practices(self):
        """Delete TEST_ prefixed practices"""
        response = requests.get(
            f"{BASE_URL}/api/practices",
            cookies=TestAdminLogin.cookies
        )
        if response.status_code != 200:
            return
        
        practices = response.json()
        deleted = 0
        for p in practices:
            if p.get("client_name", "").startswith("TEST_"):
                del_response = requests.delete(
                    f"{BASE_URL}/api/practices/{p['id']}",
                    cookies=TestAdminLogin.cookies
                )
                if del_response.status_code in [200, 204]:
                    deleted += 1
        
        print(f"Cleaned up {deleted} test practices")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
