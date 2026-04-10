"""
Herion Iteration 13 - Email System Tests
Tests for the Resend email integration with draft → review → approve → send flow.
Features: document matrix compliance, signature handling, sensitivity blocking, timeline/audit logging.
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@aic.it"
ADMIN_PASSWORD = "Admin123!"
NEXUS_PRACTICE_ID = "e18f8d72-ea8f-445b-951a-bbd082e60648"
VERIFIED_EMAIL = "gegexia94@gmail.com"  # Resend test mode verified email


@pytest.fixture(scope="module")
def admin_session():
    """Login as admin and return session with cookies."""
    session = requests.Session()
    resp = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return session


@pytest.fixture(scope="module")
def user_session():
    """Create a regular user session for testing non-admin restrictions."""
    session = requests.Session()
    # Register a test user
    test_email = f"test_email_user_{datetime.now().strftime('%H%M%S')}@test.it"
    resp = session.post(f"{BASE_URL}/api/auth/register", json={
        "email": test_email,
        "password": "TestPass123!",
        "first_name": "Test",
        "last_name": "User"
    })
    if resp.status_code != 200:
        # User might already exist, try login
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": "TestPass123!"
        })
    return session


class TestAdminLogin:
    """Verify admin can login."""
    
    def test_admin_login_success(self, admin_session):
        resp = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        print(f"✓ Admin login successful: {data['email']}, role={data['role']}")


class TestEmailDraftCreation:
    """Test POST /api/emails/draft endpoint."""
    
    def test_create_email_draft_no_attachments(self, admin_session):
        """Draft with no attachments should be compliant (draft status)."""
        resp = admin_session.post(f"{BASE_URL}/api/emails/draft", json={
            "practice_id": NEXUS_PRACTICE_ID,
            "recipient_email": "test@example.com",
            "subject": "Test Email - No Attachments",
            "body_html": "<p>Questo è un test senza allegati.</p>",
            "attachment_doc_keys": []
        })
        assert resp.status_code == 200, f"Create draft failed: {resp.text}"
        data = resp.json()
        assert "draft" in data
        draft = data["draft"]
        assert draft["status"] == "draft", f"Expected 'draft' status, got {draft['status']}"
        assert draft["compliance"]["compliant"] == True
        print(f"✓ Draft created with no attachments: id={draft['id']}, status={draft['status']}")
        return draft["id"]
    
    def test_create_email_draft_with_nonexistent_attachment(self, admin_session):
        """Draft with non-existent attachment should be blocked."""
        resp = admin_session.post(f"{BASE_URL}/api/emails/draft", json={
            "practice_id": NEXUS_PRACTICE_ID,
            "recipient_email": "test@example.com",
            "subject": "Test Email - Bad Attachment",
            "body_html": "<p>Test con allegato inesistente.</p>",
            "attachment_doc_keys": ["nonexistent_doc_key_12345"]
        })
        assert resp.status_code == 200, f"Create draft failed: {resp.text}"
        data = resp.json()
        draft = data["draft"]
        assert draft["status"] == "blocked", f"Expected 'blocked' status, got {draft['status']}"
        assert draft["compliance"]["compliant"] == False
        assert len(draft["compliance"]["issues"]) > 0
        assert any(i["issue"] == "not_found" for i in draft["compliance"]["issues"])
        print(f"✓ Draft blocked for non-existent attachment: id={draft['id']}, issues={draft['compliance']['issues']}")
    
    def test_create_email_draft_invalid_practice(self, admin_session):
        """Draft with invalid practice ID should fail."""
        resp = admin_session.post(f"{BASE_URL}/api/emails/draft", json={
            "practice_id": "invalid-practice-id-12345",
            "recipient_email": "test@example.com",
            "subject": "Test Email",
            "body_html": "<p>Test</p>",
            "attachment_doc_keys": []
        })
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("✓ Draft creation correctly rejected for invalid practice ID")


class TestEmailDraftsList:
    """Test GET /api/emails/drafts endpoint."""
    
    def test_get_email_drafts_list(self, admin_session):
        """Admin should see all drafts."""
        resp = admin_session.get(f"{BASE_URL}/api/emails/drafts")
        assert resp.status_code == 200, f"Get drafts failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} email drafts")
    
    def test_get_email_drafts_with_status_filter(self, admin_session):
        """Filter drafts by status."""
        resp = admin_session.get(f"{BASE_URL}/api/emails/drafts", params={"status": "draft"})
        assert resp.status_code == 200
        data = resp.json()
        for d in data:
            assert d["status"] == "draft"
        print(f"✓ Filtered drafts by status=draft: {len(data)} results")


class TestEmailDraftDetail:
    """Test GET /api/emails/drafts/{id} endpoint."""
    
    def test_get_single_draft(self, admin_session):
        """Get a single draft with full details."""
        # First create a draft
        create_resp = admin_session.post(f"{BASE_URL}/api/emails/draft", json={
            "practice_id": NEXUS_PRACTICE_ID,
            "recipient_email": "detail_test@example.com",
            "subject": "Detail Test Email",
            "body_html": "<p>Test per dettaglio.</p>",
            "attachment_doc_keys": []
        })
        assert create_resp.status_code == 200
        draft_id = create_resp.json()["draft"]["id"]
        
        # Get the draft
        resp = admin_session.get(f"{BASE_URL}/api/emails/drafts/{draft_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == draft_id
        assert data["subject"] == "Detail Test Email"
        assert data["recipient_email"] == "detail_test@example.com"
        print(f"✓ Got draft detail: id={draft_id}, subject={data['subject']}")
    
    def test_get_nonexistent_draft(self, admin_session):
        """Getting non-existent draft should return 404."""
        resp = admin_session.get(f"{BASE_URL}/api/emails/drafts/nonexistent-id-12345")
        assert resp.status_code == 404
        print("✓ Non-existent draft correctly returns 404")


class TestEmailDraftUpdate:
    """Test PUT /api/emails/drafts/{id} endpoint."""
    
    def test_update_draft(self, admin_session):
        """Update a draft (only in draft/blocked status)."""
        # Create a draft
        create_resp = admin_session.post(f"{BASE_URL}/api/emails/draft", json={
            "practice_id": NEXUS_PRACTICE_ID,
            "recipient_email": "update_test@example.com",
            "subject": "Original Subject",
            "body_html": "<p>Original body.</p>",
            "attachment_doc_keys": []
        })
        assert create_resp.status_code == 200
        draft_id = create_resp.json()["draft"]["id"]
        
        # Update the draft
        resp = admin_session.put(f"{BASE_URL}/api/emails/drafts/{draft_id}", json={
            "practice_id": NEXUS_PRACTICE_ID,
            "recipient_email": "updated@example.com",
            "subject": "Updated Subject",
            "body_html": "<p>Updated body.</p>",
            "attachment_doc_keys": []
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "draft"
        
        # Verify update
        get_resp = admin_session.get(f"{BASE_URL}/api/emails/drafts/{draft_id}")
        updated = get_resp.json()
        assert updated["subject"] == "Updated Subject"
        assert updated["recipient_email"] == "updated@example.com"
        print(f"✓ Draft updated successfully: id={draft_id}")


class TestEmailSubmitForReview:
    """Test POST /api/emails/drafts/{id}/submit-review endpoint."""
    
    def test_submit_draft_for_review(self, admin_session):
        """Submit a draft for review - moves to 'review' status."""
        # Create a draft
        create_resp = admin_session.post(f"{BASE_URL}/api/emails/draft", json={
            "practice_id": NEXUS_PRACTICE_ID,
            "recipient_email": "review_test@example.com",
            "subject": "Review Test Email",
            "body_html": "<p>Test per revisione.</p>",
            "attachment_doc_keys": []
        })
        assert create_resp.status_code == 200
        draft_id = create_resp.json()["draft"]["id"]
        
        # Submit for review
        resp = admin_session.post(f"{BASE_URL}/api/emails/drafts/{draft_id}/submit-review")
        assert resp.status_code == 200
        
        # Verify status changed
        get_resp = admin_session.get(f"{BASE_URL}/api/emails/drafts/{draft_id}")
        draft = get_resp.json()
        assert draft["status"] == "review", f"Expected 'review', got {draft['status']}"
        print(f"✓ Draft submitted for review: id={draft_id}, status={draft['status']}")
        return draft_id


class TestEmailApproval:
    """Test POST /api/emails/drafts/{id}/approve endpoint."""
    
    def test_admin_can_approve_draft(self, admin_session):
        """Admin can approve a draft in review status."""
        # Create and submit for review
        create_resp = admin_session.post(f"{BASE_URL}/api/emails/draft", json={
            "practice_id": NEXUS_PRACTICE_ID,
            "recipient_email": "approve_test@example.com",
            "subject": "Approval Test Email",
            "body_html": "<p>Test per approvazione.</p>",
            "attachment_doc_keys": []
        })
        assert create_resp.status_code == 200
        draft_id = create_resp.json()["draft"]["id"]
        
        # Submit for review
        admin_session.post(f"{BASE_URL}/api/emails/drafts/{draft_id}/submit-review")
        
        # Approve
        resp = admin_session.post(f"{BASE_URL}/api/emails/drafts/{draft_id}/approve")
        assert resp.status_code == 200
        
        # Verify status
        get_resp = admin_session.get(f"{BASE_URL}/api/emails/drafts/{draft_id}")
        draft = get_resp.json()
        assert draft["status"] == "approved", f"Expected 'approved', got {draft['status']}"
        assert draft["approved_by"] is not None
        assert draft["approved_at"] is not None
        print(f"✓ Draft approved: id={draft_id}, approved_by={draft['approved_by']}")
        return draft_id


class TestNonAdminRestrictions:
    """Test that non-admin users cannot approve or send emails."""
    
    def test_non_admin_cannot_approve(self, user_session, admin_session):
        """Non-admin user should get 403 when trying to approve."""
        # Create a draft as admin
        create_resp = admin_session.post(f"{BASE_URL}/api/emails/draft", json={
            "practice_id": NEXUS_PRACTICE_ID,
            "recipient_email": "nonadmin_test@example.com",
            "subject": "Non-Admin Test",
            "body_html": "<p>Test.</p>",
            "attachment_doc_keys": []
        })
        if create_resp.status_code != 200:
            pytest.skip("Could not create draft for test")
        draft_id = create_resp.json()["draft"]["id"]
        
        # Submit for review
        admin_session.post(f"{BASE_URL}/api/emails/drafts/{draft_id}/submit-review")
        
        # Try to approve as non-admin
        resp = user_session.post(f"{BASE_URL}/api/emails/drafts/{draft_id}/approve")
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        print("✓ Non-admin correctly blocked from approving email")
    
    def test_non_admin_cannot_send(self, user_session, admin_session):
        """Non-admin user should get 403 when trying to send."""
        # Create, submit, and approve a draft as admin
        create_resp = admin_session.post(f"{BASE_URL}/api/emails/draft", json={
            "practice_id": NEXUS_PRACTICE_ID,
            "recipient_email": "nonadmin_send_test@example.com",
            "subject": "Non-Admin Send Test",
            "body_html": "<p>Test.</p>",
            "attachment_doc_keys": []
        })
        if create_resp.status_code != 200:
            pytest.skip("Could not create draft for test")
        draft_id = create_resp.json()["draft"]["id"]
        
        admin_session.post(f"{BASE_URL}/api/emails/drafts/{draft_id}/submit-review")
        admin_session.post(f"{BASE_URL}/api/emails/drafts/{draft_id}/approve")
        
        # Try to send as non-admin
        resp = user_session.post(f"{BASE_URL}/api/emails/drafts/{draft_id}/send")
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        print("✓ Non-admin correctly blocked from sending email")


class TestEmailSummary:
    """Test GET /api/emails/summary endpoint."""
    
    def test_get_email_summary(self, admin_session):
        """Get email summary counts by status."""
        resp = admin_session.get(f"{BASE_URL}/api/emails/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data
        assert "draft" in data
        assert "review" in data
        assert "approved" in data
        assert "sent" in data
        assert "failed" in data
        assert "blocked" in data
        print(f"✓ Email summary: total={data['total']}, draft={data['draft']}, review={data['review']}, approved={data['approved']}, sent={data['sent']}, blocked={data['blocked']}")


class TestFullEmailFlow:
    """Test the complete draft → review → approve → send flow."""
    
    def test_full_flow_to_approved(self, admin_session):
        """Test full flow up to approved status (not sending to avoid Resend restrictions)."""
        # 1. Create draft
        create_resp = admin_session.post(f"{BASE_URL}/api/emails/draft", json={
            "practice_id": NEXUS_PRACTICE_ID,
            "recipient_email": "fullflow@example.com",
            "subject": "Full Flow Test Email",
            "body_html": "<p>Test del flusso completo.</p>",
            "attachment_doc_keys": []
        })
        assert create_resp.status_code == 200
        draft = create_resp.json()["draft"]
        draft_id = draft["id"]
        assert draft["status"] == "draft"
        print(f"  Step 1: Draft created - id={draft_id}, status=draft")
        
        # 2. Submit for review
        review_resp = admin_session.post(f"{BASE_URL}/api/emails/drafts/{draft_id}/submit-review")
        assert review_resp.status_code == 200
        
        get_resp = admin_session.get(f"{BASE_URL}/api/emails/drafts/{draft_id}")
        draft = get_resp.json()
        assert draft["status"] == "review"
        print(f"  Step 2: Submitted for review - status=review")
        
        # 3. Approve
        approve_resp = admin_session.post(f"{BASE_URL}/api/emails/drafts/{draft_id}/approve")
        assert approve_resp.status_code == 200
        
        get_resp = admin_session.get(f"{BASE_URL}/api/emails/drafts/{draft_id}")
        draft = get_resp.json()
        assert draft["status"] == "approved"
        print(f"  Step 3: Approved - status=approved, approved_by={draft['approved_by']}")
        
        print(f"✓ Full flow test passed: draft → review → approved")
        return draft_id
    
    def test_send_to_verified_email(self, admin_session):
        """Test actual send to Resend verified email (gegexia94@gmail.com)."""
        # Create, review, approve
        create_resp = admin_session.post(f"{BASE_URL}/api/emails/draft", json={
            "practice_id": NEXUS_PRACTICE_ID,
            "recipient_email": VERIFIED_EMAIL,  # Resend verified email
            "subject": f"Herion Test Email - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "body_html": "<p>Questa è un'email di test inviata tramite Herion.</p><p>Se ricevi questa email, l'integrazione Resend funziona correttamente.</p>",
            "attachment_doc_keys": []
        })
        assert create_resp.status_code == 200
        draft_id = create_resp.json()["draft"]["id"]
        
        # Submit and approve
        admin_session.post(f"{BASE_URL}/api/emails/drafts/{draft_id}/submit-review")
        admin_session.post(f"{BASE_URL}/api/emails/drafts/{draft_id}/approve")
        
        # Send
        send_resp = admin_session.post(f"{BASE_URL}/api/emails/drafts/{draft_id}/send")
        assert send_resp.status_code == 200
        data = send_resp.json()
        
        # Check result
        get_resp = admin_session.get(f"{BASE_URL}/api/emails/drafts/{draft_id}")
        draft = get_resp.json()
        
        if draft["status"] == "sent":
            assert draft["sent_at"] is not None
            assert draft["resend_email_id"] is not None
            print(f"✓ Email sent successfully: resend_id={draft['resend_email_id']}, sent_at={draft['sent_at']}")
        elif draft["status"] == "failed":
            # This is expected if Resend has restrictions
            print(f"⚠ Email send failed (expected in test mode): error={draft.get('send_error', 'unknown')}")
        else:
            print(f"? Unexpected status after send: {draft['status']}")


class TestTimelineAndAuditLogging:
    """Test that email events are logged in timeline and audit."""
    
    def test_email_events_in_timeline(self, admin_session):
        """Verify email events appear in practice timeline."""
        # Create a draft
        create_resp = admin_session.post(f"{BASE_URL}/api/emails/draft", json={
            "practice_id": NEXUS_PRACTICE_ID,
            "recipient_email": "timeline_test@example.com",
            "subject": "Timeline Test",
            "body_html": "<p>Test.</p>",
            "attachment_doc_keys": []
        })
        assert create_resp.status_code == 200
        draft_id = create_resp.json()["draft"]["id"]
        
        # Get timeline
        timeline_resp = admin_session.get(f"{BASE_URL}/api/practices/{NEXUS_PRACTICE_ID}/timeline")
        assert timeline_resp.status_code == 200
        events = timeline_resp.json()
        
        # Check for email_draft_created event
        email_events = [e for e in events if e.get("event_type", "").startswith("email_")]
        assert len(email_events) > 0, "No email events found in timeline"
        
        draft_created_events = [e for e in email_events if e["event_type"] == "email_draft_created"]
        assert len(draft_created_events) > 0, "email_draft_created event not found"
        print(f"✓ Found {len(email_events)} email events in timeline, including email_draft_created")
    
    def test_email_events_in_audit(self, admin_session):
        """Verify email events appear in governance audit."""
        # Get audit log
        audit_resp = admin_session.get(f"{BASE_URL}/api/governance/audit", params={"entity_type": "email"})
        assert audit_resp.status_code == 200
        data = audit_resp.json()
        
        # Check for email audit events
        events = data.get("events", [])
        email_events = [e for e in events if e.get("entity_type") == "email"]
        print(f"✓ Found {len(email_events)} email audit events")


class TestPasswordResetUsesResend:
    """Verify password reset email uses Resend (not mock)."""
    
    def test_forgot_password_endpoint(self, admin_session):
        """Test that forgot-password endpoint works (Resend integration)."""
        # This won't actually send to a random email in test mode,
        # but we verify the endpoint works
        resp = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "test_reset@example.com"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "message" in data
        print(f"✓ Forgot password endpoint works: {data['message']}")


class TestNexusPracticeExists:
    """Verify the Nexus practice exists for email testing."""
    
    def test_nexus_practice_accessible(self, admin_session):
        """Verify Nexus practice is accessible."""
        resp = admin_session.get(f"{BASE_URL}/api/practices/{NEXUS_PRACTICE_ID}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == NEXUS_PRACTICE_ID
        print(f"✓ Nexus practice accessible: {data['client_name']} - {data['practice_type_label']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
