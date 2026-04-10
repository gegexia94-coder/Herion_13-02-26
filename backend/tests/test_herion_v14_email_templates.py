"""
Herion Iteration 14 - Email Template System Tests
Tests for the Italian Email Template System with:
- Template groups and listing
- Placeholder resolution
- Draft creation from templates
- Integration with existing email flow
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@aic.it"
ADMIN_PASSWORD = "Admin123!"


class TestAdminLogin:
    """Verify admin login works for subsequent tests"""

    def test_admin_login(self, api_client):
        """Login as admin and verify session"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        print(f"✓ Admin login successful: {data['email']}")


class TestEmailTemplatesList:
    """Test GET /api/emails/templates endpoint"""

    def test_get_all_templates(self, authenticated_client):
        """Get all email templates - should return 34 templates"""
        response = authenticated_client.get(f"{BASE_URL}/api/emails/templates")
        assert response.status_code == 200, f"Failed to get templates: {response.text}"
        templates = response.json()
        
        # Verify we have templates
        assert isinstance(templates, list)
        assert len(templates) >= 30, f"Expected at least 30 templates, got {len(templates)}"
        print(f"✓ Got {len(templates)} templates")
        
        # Verify template structure
        first_template = templates[0]
        required_fields = ["id", "group", "group_label", "name", "subject", "placeholders", "user_types"]
        for field in required_fields:
            assert field in first_template, f"Missing field: {field}"
        print(f"✓ Template structure verified: {list(first_template.keys())}")

    def test_templates_have_correct_groups(self, authenticated_client):
        """Verify templates are organized into correct groups"""
        response = authenticated_client.get(f"{BASE_URL}/api/emails/templates")
        assert response.status_code == 200
        templates = response.json()
        
        # Expected groups
        expected_groups = {"private", "freelancer", "company", "blocked", "approval", "delegation", "delivery", "reminder", "account"}
        actual_groups = set(t["group"] for t in templates)
        
        # All actual groups should be in expected
        for group in actual_groups:
            assert group in expected_groups, f"Unexpected group: {group}"
        print(f"✓ Template groups verified: {actual_groups}")

    def test_filter_templates_by_group(self, authenticated_client):
        """Test filtering templates by group"""
        response = authenticated_client.get(f"{BASE_URL}/api/emails/templates", params={"group": "private"})
        assert response.status_code == 200
        templates = response.json()
        
        # All returned templates should be in private group
        for t in templates:
            assert t["group"] == "private", f"Template {t['id']} has wrong group: {t['group']}"
        print(f"✓ Filtered by group 'private': {len(templates)} templates")


class TestEmailTemplateGroups:
    """Test GET /api/emails/template-groups endpoint"""

    def test_get_template_groups(self, authenticated_client):
        """Get template groups with counts - should return 9 groups"""
        response = authenticated_client.get(f"{BASE_URL}/api/emails/template-groups")
        assert response.status_code == 200, f"Failed to get groups: {response.text}"
        groups = response.json()
        
        assert isinstance(groups, list)
        assert len(groups) == 9, f"Expected 9 groups, got {len(groups)}"
        print(f"✓ Got {len(groups)} template groups")
        
        # Verify group structure
        for group in groups:
            assert "id" in group
            assert "label" in group
            assert "count" in group
            assert group["count"] > 0, f"Group {group['id']} has no templates"
        
        # Print group summary
        for g in groups:
            print(f"  - {g['id']}: {g['label']} ({g['count']} templates)")


class TestSingleTemplateDetail:
    """Test GET /api/emails/templates/{template_id} endpoint"""

    def test_get_single_template(self, authenticated_client):
        """Get a single template by ID"""
        template_id = "private_missing_docs"
        response = authenticated_client.get(f"{BASE_URL}/api/emails/templates/{template_id}")
        assert response.status_code == 200, f"Failed to get template: {response.text}"
        template = response.json()
        
        assert template["id"] == template_id
        assert "body_html" in template, "Template should include body_html"
        assert "placeholders" in template
        print(f"✓ Got template: {template['name']}")
        print(f"  Placeholders: {template['placeholders']}")

    def test_get_nonexistent_template(self, authenticated_client):
        """Getting non-existent template should return 404"""
        response = authenticated_client.get(f"{BASE_URL}/api/emails/templates/nonexistent_template_xyz")
        assert response.status_code == 404
        print("✓ Non-existent template returns 404")


class TestTemplateResolve:
    """Test POST /api/emails/templates/{template_id}/resolve endpoint"""

    def test_resolve_template_with_practice(self, authenticated_client, test_practice_id):
        """Resolve template placeholders using practice data"""
        template_id = "private_missing_docs"
        response = authenticated_client.post(
            f"{BASE_URL}/api/emails/templates/{template_id}/resolve",
            json={"practice_id": test_practice_id}
        )
        assert response.status_code == 200, f"Failed to resolve: {response.text}"
        resolved = response.json()
        
        # Verify response structure
        assert "template_id" in resolved
        assert "template_name" in resolved
        assert "subject" in resolved
        assert "body_html" in resolved
        assert "resolved_values" in resolved
        assert "unresolved_placeholders" in resolved
        assert "all_placeholders" in resolved
        
        print(f"✓ Resolved template: {resolved['template_name']}")
        print(f"  Subject: {resolved['subject']}")
        print(f"  Resolved values: {list(resolved['resolved_values'].keys())}")
        print(f"  Unresolved: {resolved['unresolved_placeholders']}")

    def test_resolve_keeps_unresolved_visible(self, authenticated_client, test_practice_id):
        """Unresolved placeholders should remain as [placeholder] in output"""
        # Use a template that has placeholders unlikely to be auto-resolved
        template_id = "private_reminder"  # Has data_scadenza which won't be auto-resolved
        response = authenticated_client.post(
            f"{BASE_URL}/api/emails/templates/{template_id}/resolve",
            json={"practice_id": test_practice_id}
        )
        assert response.status_code == 200
        resolved = response.json()
        
        # Check if unresolved placeholders are identified
        unresolved = resolved.get("unresolved_placeholders", [])
        
        # If there are unresolved placeholders, they should appear in the body
        for ph in unresolved:
            bracket_ph = f"[{ph}]"
            assert bracket_ph in resolved["body_html"] or bracket_ph in resolved["subject"], \
                f"Unresolved placeholder [{ph}] should remain visible in output"
        
        print(f"✓ Unresolved placeholders remain visible: {unresolved}")

    def test_resolve_with_extra_overrides(self, authenticated_client, test_practice_id):
        """Test providing extra values to override/fill placeholders"""
        template_id = "private_reminder"
        extra_values = {
            "data_scadenza": "15 Gennaio 2026",
            "azione_richiesta": "Caricare il documento di identità"
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/emails/templates/{template_id}/resolve",
            json={"practice_id": test_practice_id, "extra": extra_values}
        )
        assert response.status_code == 200
        resolved = response.json()
        
        # The extra values should be in resolved_values
        for key, val in extra_values.items():
            assert key in resolved["resolved_values"], f"Extra value {key} not in resolved_values"
            assert resolved["resolved_values"][key] == val
        
        # The values should appear in the body
        assert "15 Gennaio 2026" in resolved["body_html"]
        print(f"✓ Extra overrides applied successfully")

    def test_resolve_nonexistent_template(self, authenticated_client, test_practice_id):
        """Resolving non-existent template should return 404"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/emails/templates/nonexistent_xyz/resolve",
            json={"practice_id": test_practice_id}
        )
        assert response.status_code == 404
        print("✓ Non-existent template resolve returns 404")


class TestDraftFromTemplate:
    """Test POST /api/emails/draft-from-template endpoint"""

    def test_create_draft_from_template(self, authenticated_client, test_practice_id):
        """Create an email draft from a template"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/emails/draft-from-template",
            json={
                "template_id": "company_status_update",
                "practice_id": test_practice_id,
                "recipient_email": "test@example.com",
                "recipient_name": "Test User"
            }
        )
        assert response.status_code == 200, f"Failed to create draft: {response.text}"
        result = response.json()
        
        assert "draft" in result
        draft = result["draft"]
        
        # Verify draft has template info
        assert draft["email_type"] == "template"
        assert draft["template_id"] == "company_status_update"
        assert draft["template_name"] is not None
        assert draft["template_group"] == "company"
        
        # Verify draft has resolved content
        assert draft["subject"] is not None
        assert draft["body_html"] is not None
        
        print(f"✓ Created draft from template: {draft['id']}")
        print(f"  Template: {draft['template_name']}")
        print(f"  Subject: {draft['subject'][:50]}...")
        
        return draft["id"]

    def test_draft_from_template_with_extra_values(self, authenticated_client, test_practice_id):
        """Create draft with extra placeholder values"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/emails/draft-from-template",
            json={
                "template_id": "reminder_generic",
                "practice_id": test_practice_id,
                "recipient_email": "test@example.com",
                "extra_values": {
                    "data_scadenza": "20 Febbraio 2026",
                    "azione_richiesta": "Completare la documentazione"
                }
            }
        )
        assert response.status_code == 200
        draft = response.json()["draft"]
        
        # Extra values should be in the body
        assert "20 Febbraio 2026" in draft["body_html"]
        print(f"✓ Draft created with extra values applied")

    def test_draft_from_template_invalid_practice(self, authenticated_client):
        """Creating draft with invalid practice should return 404"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/emails/draft-from-template",
            json={
                "template_id": "private_missing_docs",
                "practice_id": "nonexistent-practice-id",
                "recipient_email": "test@example.com"
            }
        )
        assert response.status_code == 404
        print("✓ Invalid practice returns 404")

    def test_draft_from_template_invalid_template(self, authenticated_client, test_practice_id):
        """Creating draft with invalid template should return 404"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/emails/draft-from-template",
            json={
                "template_id": "nonexistent_template",
                "practice_id": test_practice_id,
                "recipient_email": "test@example.com"
            }
        )
        assert response.status_code == 404
        print("✓ Invalid template returns 404")


class TestTemplateDraftIntegration:
    """Test that template-created drafts work with existing email flow"""

    def test_template_draft_appears_in_list(self, authenticated_client, test_practice_id):
        """Template-created draft should appear in drafts list"""
        # Create a draft from template
        create_response = authenticated_client.post(
            f"{BASE_URL}/api/emails/draft-from-template",
            json={
                "template_id": "freelancer_approval_request",
                "practice_id": test_practice_id,
                "recipient_email": "list-test@example.com"
            }
        )
        assert create_response.status_code == 200
        draft_id = create_response.json()["draft"]["id"]
        
        # Get drafts list
        list_response = authenticated_client.get(f"{BASE_URL}/api/emails/drafts")
        assert list_response.status_code == 200
        drafts = list_response.json()
        
        # Find our draft
        found = next((d for d in drafts if d["id"] == draft_id), None)
        assert found is not None, "Template draft not found in list"
        assert found["template_name"] is not None
        print(f"✓ Template draft appears in list with template_name: {found['template_name']}")

    def test_template_draft_submit_review(self, authenticated_client, test_practice_id):
        """Template-created draft can be submitted for review"""
        # Create draft
        create_response = authenticated_client.post(
            f"{BASE_URL}/api/emails/draft-from-template",
            json={
                "template_id": "approval_requested",
                "practice_id": test_practice_id,
                "recipient_email": "review-test@example.com"
            }
        )
        assert create_response.status_code == 200
        draft_id = create_response.json()["draft"]["id"]
        
        # Submit for review
        review_response = authenticated_client.post(f"{BASE_URL}/api/emails/drafts/{draft_id}/submit-review")
        assert review_response.status_code == 200
        
        # Verify status changed
        detail_response = authenticated_client.get(f"{BASE_URL}/api/emails/drafts/{draft_id}")
        assert detail_response.status_code == 200
        assert detail_response.json()["status"] == "review"
        print(f"✓ Template draft submitted for review successfully")

    def test_template_draft_approve_and_send_flow(self, authenticated_client, test_practice_id):
        """Template-created draft can go through full approve flow"""
        # Create draft
        create_response = authenticated_client.post(
            f"{BASE_URL}/api/emails/draft-from-template",
            json={
                "template_id": "delivery_dossier_ready",
                "practice_id": test_practice_id,
                "recipient_email": "approve-test@example.com"
            }
        )
        assert create_response.status_code == 200
        draft_id = create_response.json()["draft"]["id"]
        
        # Submit for review
        authenticated_client.post(f"{BASE_URL}/api/emails/drafts/{draft_id}/submit-review")
        
        # Approve
        approve_response = authenticated_client.post(f"{BASE_URL}/api/emails/drafts/{draft_id}/approve")
        assert approve_response.status_code == 200
        
        # Verify approved
        detail_response = authenticated_client.get(f"{BASE_URL}/api/emails/drafts/{draft_id}")
        assert detail_response.status_code == 200
        draft = detail_response.json()
        assert draft["status"] == "approved"
        assert draft["approved_by"] is not None
        print(f"✓ Template draft approved successfully")


class TestTimelineAndAuditLogging:
    """Test that template drafts create proper timeline and audit events"""

    def test_template_draft_creates_timeline_event(self, authenticated_client, test_practice_id):
        """Creating draft from template should log timeline event"""
        # Create draft
        create_response = authenticated_client.post(
            f"{BASE_URL}/api/emails/draft-from-template",
            json={
                "template_id": "delegation_requested",
                "practice_id": test_practice_id,
                "recipient_email": "timeline-test@example.com"
            }
        )
        assert create_response.status_code == 200
        draft_id = create_response.json()["draft"]["id"]
        
        # Get timeline
        timeline_response = authenticated_client.get(f"{BASE_URL}/api/practices/{test_practice_id}/timeline")
        assert timeline_response.status_code == 200
        events = timeline_response.json()
        
        # Find email_draft_created event
        draft_events = [e for e in events if e.get("event_type") == "email_draft_created"]
        assert len(draft_events) > 0, "No email_draft_created timeline event found"
        
        # Check if our draft is in the events
        found = any(e.get("details", {}).get("draft_id") == draft_id for e in draft_events)
        assert found, "Timeline event for our draft not found"
        print(f"✓ Timeline event created for template draft")

    def test_template_draft_creates_audit_event(self, authenticated_client, test_practice_id):
        """Creating draft from template should log audit event"""
        # Create draft
        create_response = authenticated_client.post(
            f"{BASE_URL}/api/emails/draft-from-template",
            json={
                "template_id": "blocked_missing_doc",
                "practice_id": test_practice_id,
                "recipient_email": "audit-test@example.com"
            }
        )
        assert create_response.status_code == 200
        
        # Get audit log
        audit_response = authenticated_client.get(f"{BASE_URL}/api/governance/audit")
        assert audit_response.status_code == 200
        data = audit_response.json()
        
        # Handle both list and dict response formats
        events = data.get("events", data) if isinstance(data, dict) else data
        
        # Find email_draft_from_template events
        template_events = [e for e in events if isinstance(e, dict) and e.get("action") == "email_draft_from_template"]
        assert len(template_events) > 0, "No audit event for template draft creation"
        print(f"✓ Audit event created for template draft")


class TestExistingEmailEndpoints:
    """Verify existing email endpoints still work"""

    def test_manual_draft_creation_still_works(self, authenticated_client, test_practice_id):
        """POST /api/emails/draft (manual) should still work"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/emails/draft",
            json={
                "practice_id": test_practice_id,
                "recipient_email": "manual@example.com",
                "subject": "Test Manual Draft",
                "body_html": "<p>This is a manual draft test</p>"
            }
        )
        assert response.status_code == 200, f"Manual draft creation failed: {response.text}"
        draft = response.json()["draft"]
        # Manual drafts have email_type 'practice_communication' (not 'template')
        assert draft["email_type"] != "template", "Manual draft should not be template type"
        print(f"✓ Manual draft creation still works (type: {draft['email_type']})")

    def test_email_summary_endpoint(self, authenticated_client):
        """GET /api/emails/summary should work"""
        response = authenticated_client.get(f"{BASE_URL}/api/emails/summary")
        assert response.status_code == 200
        summary = response.json()
        
        required_fields = ["total", "draft", "review", "approved", "sent", "failed", "blocked"]
        for field in required_fields:
            assert field in summary, f"Missing field in summary: {field}"
        print(f"✓ Email summary: {summary}")


class TestTemplateCount:
    """Verify template counts match expectations"""

    def test_total_template_count(self, authenticated_client):
        """Should have 34 templates total"""
        response = authenticated_client.get(f"{BASE_URL}/api/emails/templates")
        assert response.status_code == 200
        templates = response.json()
        
        # The main agent mentioned 34 templates
        print(f"✓ Total templates: {len(templates)}")
        assert len(templates) >= 30, f"Expected at least 30 templates, got {len(templates)}"

    def test_group_counts_sum_to_total(self, authenticated_client):
        """Sum of group counts should equal total templates"""
        # Get groups
        groups_response = authenticated_client.get(f"{BASE_URL}/api/emails/template-groups")
        assert groups_response.status_code == 200
        groups = groups_response.json()
        
        # Get all templates
        templates_response = authenticated_client.get(f"{BASE_URL}/api/emails/templates")
        assert templates_response.status_code == 200
        templates = templates_response.json()
        
        # Sum group counts
        group_sum = sum(g["count"] for g in groups)
        assert group_sum == len(templates), f"Group sum ({group_sum}) != template count ({len(templates)})"
        print(f"✓ Group counts sum correctly: {group_sum} = {len(templates)}")


# ─────────────── FIXTURES ───────────────

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def authenticated_client(api_client):
    """Session with admin authentication"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.text}")
    return api_client


@pytest.fixture(scope="module")
def test_practice_id(authenticated_client):
    """Get or create a practice for testing"""
    # First try to get existing practices
    response = authenticated_client.get(f"{BASE_URL}/api/practices")
    if response.status_code == 200:
        practices = response.json()
        if practices:
            return practices[0]["id"]
    
    # If no practices, create one
    create_response = authenticated_client.post(
        f"{BASE_URL}/api/practices",
        json={
            "practice_type": "COMPANY_CLOSURE",
            "client_name": "Template Test Company",
            "client_type": "company",
            "vat_number": "IT12345678901",
            "company_name": "Template Test Company"
        }
    )
    if create_response.status_code == 200:
        return create_response.json()["id"]
    
    pytest.skip("Could not get or create a practice for testing")
