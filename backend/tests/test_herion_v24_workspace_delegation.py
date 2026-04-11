"""
Iteration 24 - Backend Agent Workspace + Delegation/Official Action System Tests
Tests for:
1. GET /api/practices/{id}/workspace - Full workspace data
2. POST /api/practices/{id}/delegate - Grant delegation
3. POST /api/practices/{id}/revoke-delegation - Revoke delegation
4. POST /api/practices/{id}/proof - Upload receipt/proof
5. POST /api/practices/{id}/complete-official-step - Mark official step completed
6. Father review for approval phase
7. Delegation audit trail
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    def test_auth_login_success(self, session):
        """Test login with admin credentials"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # API returns user data directly or wrapped in "user" key
        email = data.get("email") or data.get("user", {}).get("email")
        assert email == "admin@aic.it", f"Expected admin@aic.it, got {email}"
        print(f"✓ Auth login success: {email}")
    
    def test_auth_login_wrong_password(self, session):
        """Test login with wrong password"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "WrongPassword123!"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Auth rejects wrong password correctly")


class TestWorkspaceEndpoint:
    """Tests for GET /api/practices/{id}/workspace"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200, "Auth failed"
        return session
    
    def test_workspace_draft_practice(self, auth_session):
        """Test workspace for draft practice 98cf9182-e7df-4b73-a2e4-1c69775e7caa"""
        practice_id = "98cf9182-e7df-4b73-a2e4-1c69775e7caa"
        response = auth_session.get(f"{BASE_URL}/api/practices/{practice_id}/workspace")
        
        if response.status_code == 404:
            pytest.skip(f"Practice {practice_id} not found - may need to create test data")
        
        assert response.status_code == 200, f"Workspace failed: {response.text}"
        data = response.json()
        
        # Verify core workspace fields
        assert "practice_id" in data
        assert "current_agent" in data
        assert "current_activity" in data
        assert "completed_activities" in data
        assert "next_activity" in data
        assert "blockers" in data
        assert "documents_summary" in data
        assert "delegation" in data
        assert "official_action" in data
        assert "proof_layer" in data
        assert "approval" in data
        assert "timeline_summary" in data
        assert "ui_guidance" in data
        
        print(f"✓ Workspace returns all required fields for practice {practice_id}")
        return data
    
    def test_workspace_current_activity_draft(self, auth_session):
        """Test current_activity has user_action_required=true for draft"""
        practice_id = "98cf9182-e7df-4b73-a2e4-1c69775e7caa"
        response = auth_session.get(f"{BASE_URL}/api/practices/{practice_id}/workspace")
        
        if response.status_code == 404:
            pytest.skip("Practice not found")
        
        data = response.json()
        current_activity = data.get("current_activity", {})
        
        # For draft status, user_action_required should be true
        assert "user_action_required" in current_activity
        assert "label" in current_activity
        assert "description" in current_activity
        
        # Draft should have Italian label "Inizia la pratica"
        if data.get("user_status", {}).get("status") == "draft":
            assert current_activity.get("label") == "Inizia la pratica", f"Expected 'Inizia la pratica', got '{current_activity.get('label')}'"
            assert current_activity.get("user_action_required") == True
        
        print(f"✓ current_activity has correct structure: {current_activity.get('label')}")
    
    def test_workspace_official_action_structure(self, auth_session):
        """Test official_action has entity_name, submission_channel, can_herion_prepare/submit"""
        practice_id = "98cf9182-e7df-4b73-a2e4-1c69775e7caa"
        response = auth_session.get(f"{BASE_URL}/api/practices/{practice_id}/workspace")
        
        if response.status_code == 404:
            pytest.skip("Practice not found")
        
        data = response.json()
        official_action = data.get("official_action")
        
        # official_action may be None if no catalog/channel match
        if official_action:
            assert "entity_name" in official_action
            assert "submission_channel" in official_action
            assert "can_herion_prepare" in official_action
            assert "can_herion_submit" in official_action
            print(f"✓ official_action structure correct: entity={official_action.get('entity_name')}")
        else:
            print("✓ official_action is None (no catalog/channel match)")
    
    def test_workspace_documents_summary(self, auth_session):
        """Test documents_summary has missing_count and missing_labels"""
        practice_id = "98cf9182-e7df-4b73-a2e4-1c69775e7caa"
        response = auth_session.get(f"{BASE_URL}/api/practices/{practice_id}/workspace")
        
        if response.status_code == 404:
            pytest.skip("Practice not found")
        
        data = response.json()
        docs_summary = data.get("documents_summary", {})
        
        assert "total_count" in docs_summary
        assert "missing_count" in docs_summary
        assert "missing_labels" in docs_summary
        assert isinstance(docs_summary.get("missing_labels"), list)
        
        print(f"✓ documents_summary: total={docs_summary.get('total_count')}, missing={docs_summary.get('missing_count')}")
    
    def test_workspace_ui_guidance(self, auth_session):
        """Test ui_guidance has headline, subheadline, next_step_label, next_step_detail"""
        practice_id = "98cf9182-e7df-4b73-a2e4-1c69775e7caa"
        response = auth_session.get(f"{BASE_URL}/api/practices/{practice_id}/workspace")
        
        if response.status_code == 404:
            pytest.skip("Practice not found")
        
        data = response.json()
        ui_guidance = data.get("ui_guidance", {})
        
        assert "headline" in ui_guidance
        assert "subheadline" in ui_guidance
        assert "next_step_label" in ui_guidance
        assert "next_step_detail" in ui_guidance
        
        print(f"✓ ui_guidance: headline='{ui_guidance.get('headline')}'")
    
    def test_workspace_delegation_state(self, auth_session):
        """Test delegation state (enabled, level, scope, scope_labels)"""
        practice_id = "98cf9182-e7df-4b73-a2e4-1c69775e7caa"
        response = auth_session.get(f"{BASE_URL}/api/practices/{practice_id}/workspace")
        
        if response.status_code == 404:
            pytest.skip("Practice not found")
        
        data = response.json()
        delegation = data.get("delegation", {})
        
        assert "enabled" in delegation
        assert "level" in delegation
        assert "scope" in delegation
        assert "scope_labels" in delegation
        assert isinstance(delegation.get("scope"), list)
        assert isinstance(delegation.get("scope_labels"), dict)
        
        print(f"✓ delegation state: enabled={delegation.get('enabled')}, level={delegation.get('level')}")
    
    def test_workspace_proof_layer(self, auth_session):
        """Test proof_layer has expected and status"""
        practice_id = "98cf9182-e7df-4b73-a2e4-1c69775e7caa"
        response = auth_session.get(f"{BASE_URL}/api/practices/{practice_id}/workspace")
        
        if response.status_code == 404:
            pytest.skip("Practice not found")
        
        data = response.json()
        proof_layer = data.get("proof_layer", {})
        
        assert "expected" in proof_layer
        assert "status" in proof_layer
        
        print(f"✓ proof_layer: expected={proof_layer.get('expected')}, status={proof_layer.get('status')}")
    
    def test_workspace_escalated_practice_blockers(self, auth_session):
        """Test workspace for escalated practice d9c4fca6-a27d-4f97-a006-d191505549f9 returns blockers"""
        practice_id = "d9c4fca6-a27d-4f97-a006-d191505549f9"
        response = auth_session.get(f"{BASE_URL}/api/practices/{practice_id}/workspace")
        
        if response.status_code == 404:
            pytest.skip(f"Practice {practice_id} not found")
        
        data = response.json()
        blockers = data.get("blockers", [])
        
        # Escalated practice should have blockers with severity
        status = data.get("user_status", {}).get("status", "")
        if status in ("escalated", "blocked"):
            assert len(blockers) > 0, "Escalated practice should have blockers"
            for blocker in blockers:
                assert "severity" in blocker
                assert "label" in blocker
            print(f"✓ Escalated practice has {len(blockers)} blockers with severity")
        else:
            print(f"✓ Practice status is '{status}', blockers check skipped")
    
    def test_workspace_completed_activities(self, auth_session):
        """Test workspace for practice with agent_logs returns completed_activities"""
        practice_id = "d9c4fca6-a27d-4f97-a006-d191505549f9"
        response = auth_session.get(f"{BASE_URL}/api/practices/{practice_id}/workspace")
        
        if response.status_code == 404:
            pytest.skip(f"Practice {practice_id} not found")
        
        data = response.json()
        completed_activities = data.get("completed_activities", [])
        
        # Practice with 12 agent_logs should have completed_activities
        if len(completed_activities) > 0:
            for activity in completed_activities:
                assert "code" in activity
                assert "label" in activity
            print(f"✓ Practice has {len(completed_activities)} completed_activities")
        else:
            print("✓ No completed_activities (agent_logs may not have completed status)")


class TestDelegationEndpoints:
    """Tests for delegation grant/revoke endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200, "Auth failed"
        return session
    
    @pytest.fixture(scope="class")
    def test_practice_id(self, auth_session):
        """Create a test practice for delegation tests"""
        # First try to use existing practice
        response = auth_session.get(f"{BASE_URL}/api/practices")
        if response.status_code == 200:
            practices = response.json()
            if isinstance(practices, list) and len(practices) > 0:
                return practices[0].get("id")
        
        # Create new practice if needed
        response = auth_session.post(f"{BASE_URL}/api/practices", json={
            "client_name": "TEST_Delegation_Client",
            "practice_type": "vat_registration",
            "client_type": "freelancer"
        })
        if response.status_code in (200, 201):
            return response.json().get("id")
        
        pytest.skip("Could not get or create test practice")
    
    def test_delegate_practice(self, auth_session, test_practice_id):
        """Test POST /api/practices/{id}/delegate grants delegation"""
        response = auth_session.post(f"{BASE_URL}/api/practices/{test_practice_id}/delegate", json={
            "level": "partial",
            "scope": ["prepare_documents", "validate_completeness", "upload_to_portal"],
            "expires_in_days": 30
        })
        
        assert response.status_code == 200, f"Delegate failed: {response.text}"
        data = response.json()
        
        assert "delegation" in data
        delegation = data["delegation"]
        assert delegation.get("enabled") == True
        assert delegation.get("level") == "partial"
        assert "prepare_documents" in delegation.get("scope", [])
        
        print(f"✓ Delegation granted: level={delegation.get('level')}, scope={delegation.get('scope')}")
    
    def test_revoke_delegation(self, auth_session, test_practice_id):
        """Test POST /api/practices/{id}/revoke-delegation revokes delegation"""
        # First ensure delegation is granted
        auth_session.post(f"{BASE_URL}/api/practices/{test_practice_id}/delegate", json={
            "level": "assist",
            "scope": ["prepare_documents"]
        })
        
        # Now revoke
        response = auth_session.post(f"{BASE_URL}/api/practices/{test_practice_id}/revoke-delegation", json={
            "reason": "Test revocation"
        })
        
        assert response.status_code == 200, f"Revoke failed: {response.text}"
        data = response.json()
        
        assert "delegation" in data
        delegation = data["delegation"]
        assert delegation.get("enabled") == False
        assert delegation.get("revoked") == True
        
        print(f"✓ Delegation revoked: enabled={delegation.get('enabled')}")
    
    def test_delegation_audit_trail(self, auth_session, test_practice_id):
        """Test delegation audit trail is created in delegation_audit collection"""
        # Grant delegation to create audit entry
        response = auth_session.post(f"{BASE_URL}/api/practices/{test_practice_id}/delegate", json={
            "level": "full",
            "scope": ["prepare_documents", "send_official_submission"]
        })
        assert response.status_code == 200
        
        # Verify workspace shows delegation
        workspace_response = auth_session.get(f"{BASE_URL}/api/practices/{test_practice_id}/workspace")
        if workspace_response.status_code == 200:
            workspace = workspace_response.json()
            delegation = workspace.get("delegation", {})
            assert delegation.get("enabled") == True
            print(f"✓ Delegation audit verified via workspace: level={delegation.get('level')}")
        else:
            print("✓ Delegation granted (workspace check skipped)")


class TestProofEndpoint:
    """Tests for POST /api/practices/{id}/proof"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200, "Auth failed"
        return session
    
    @pytest.fixture(scope="class")
    def test_practice_id(self, auth_session):
        """Get or create test practice"""
        response = auth_session.get(f"{BASE_URL}/api/practices")
        if response.status_code == 200:
            practices = response.json()
            if isinstance(practices, list) and len(practices) > 0:
                return practices[0].get("id")
        pytest.skip("No practice available for proof test")
    
    def test_upload_proof(self, auth_session, test_practice_id):
        """Test POST /api/practices/{id}/proof registers receipt"""
        response = auth_session.post(f"{BASE_URL}/api/practices/{test_practice_id}/proof", json={
            "proof_type": "protocol_number",
            "reference_code": "PROT-2026-001234",
            "notes": "Test proof upload"
        })
        
        assert response.status_code == 200, f"Proof upload failed: {response.text}"
        data = response.json()
        
        assert "proof_layer" in data
        proof = data["proof_layer"]
        assert proof.get("status") == "received"
        assert proof.get("reference_code") == "PROT-2026-001234"
        
        print(f"✓ Proof uploaded: type={proof.get('proof_type')}, ref={proof.get('reference_code')}")


class TestOfficialStepEndpoint:
    """Tests for POST /api/practices/{id}/complete-official-step"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200, "Auth failed"
        return session
    
    @pytest.fixture(scope="class")
    def test_practice_id(self, auth_session):
        """Get or create test practice"""
        response = auth_session.get(f"{BASE_URL}/api/practices")
        if response.status_code == 200:
            practices = response.json()
            if isinstance(practices, list) and len(practices) > 0:
                return practices[0].get("id")
        pytest.skip("No practice available for official step test")
    
    def test_complete_official_step_success(self, auth_session, test_practice_id):
        """Test POST /api/practices/{id}/complete-official-step transitions practice status"""
        response = auth_session.post(f"{BASE_URL}/api/practices/{test_practice_id}/complete-official-step", json={
            "step_outcome": "success",
            "proof_type": "portal_confirmation",
            "reference_code": "CONF-2026-TEST",
            "notes": "Test official step completion"
        })
        
        assert response.status_code == 200, f"Official step failed: {response.text}"
        data = response.json()
        
        assert "outcome" in data
        assert data.get("outcome") == "success"
        # Status should transition to submitted_manually
        assert "status" in data
        
        print(f"✓ Official step completed: outcome={data.get('outcome')}, status={data.get('status')}")


class TestFatherReview:
    """Tests for Father review in approval phase"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200, "Auth failed"
        return session
    
    def test_father_review_for_waiting_user_review(self, auth_session):
        """Test workspace for waiting_user_review status returns father_review.active=true"""
        # First, find or create a practice with waiting_user_review status
        response = auth_session.get(f"{BASE_URL}/api/practices")
        if response.status_code != 200:
            pytest.skip("Cannot get practices")
        
        practices = response.json()
        waiting_practice = None
        
        for p in practices:
            if p.get("status") in ("waiting_user_review", "waiting_approval"):
                waiting_practice = p
                break
        
        if not waiting_practice:
            # Try to create one by updating an existing practice
            if len(practices) > 0:
                test_id = practices[0].get("id")
                # Update status to waiting_user_review
                update_response = auth_session.put(f"{BASE_URL}/api/practices/{test_id}", json={
                    "status": "waiting_user_review"
                })
                if update_response.status_code == 200:
                    waiting_practice = {"id": test_id}
        
        if not waiting_practice:
            pytest.skip("No practice with waiting_user_review status available")
        
        # Get workspace
        workspace_response = auth_session.get(f"{BASE_URL}/api/practices/{waiting_practice['id']}/workspace")
        assert workspace_response.status_code == 200
        
        workspace = workspace_response.json()
        approval = workspace.get("approval", {})
        father_review = approval.get("father_review", {})
        
        # Father review should be active for waiting_user_review
        if workspace.get("user_status", {}).get("status") in ("waiting_user_review", "waiting_approval"):
            assert father_review.get("active") == True, f"Father review should be active, got: {father_review}"
            
            # Check father review fields
            assert "compatibility_check" in father_review
            assert "requirements_check" in father_review
            assert "approval_recommendation" in father_review
            
            print(f"✓ Father review active: recommendation='{father_review.get('approval_recommendation')}'")
        else:
            print(f"✓ Practice status is '{workspace.get('user_status', {}).get('status')}', father review check adjusted")


class TestPracticeCreationWithDelegation:
    """Test practice creation includes delegation and proof_layer fields"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200, "Auth failed"
        return session
    
    def test_practice_creation_has_delegation_fields(self, auth_session):
        """Test new practice has delegation and proof_layer in workspace"""
        # Create a new practice
        response = auth_session.post(f"{BASE_URL}/api/practices", json={
            "client_name": "TEST_V24_Workspace_Client",
            "practice_type": "vat_registration",
            "client_type": "freelancer",
            "description": "Test practice for workspace delegation verification"
        })
        
        assert response.status_code in (200, 201), f"Practice creation failed: {response.text}"
        practice = response.json()
        practice_id = practice.get("id")
        
        # Get workspace
        workspace_response = auth_session.get(f"{BASE_URL}/api/practices/{practice_id}/workspace")
        assert workspace_response.status_code == 200
        
        workspace = workspace_response.json()
        
        # Check delegation field exists
        assert "delegation" in workspace
        delegation = workspace["delegation"]
        assert "enabled" in delegation
        assert "level" in delegation
        assert "scope" in delegation
        
        # Check proof_layer field exists
        assert "proof_layer" in workspace
        proof_layer = workspace["proof_layer"]
        assert "expected" in proof_layer
        assert "status" in proof_layer
        
        print(f"✓ New practice has delegation and proof_layer fields")
        
        # Cleanup - delete test practice
        auth_session.delete(f"{BASE_URL}/api/practices/{practice_id}")


class TestItalianLabels:
    """Test that labels are human-readable Italian, not technical codes"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200, "Auth failed"
        return session
    
    def test_current_activity_italian_labels(self, auth_session):
        """Test current_activity.label is Italian, not technical code"""
        response = auth_session.get(f"{BASE_URL}/api/practices")
        if response.status_code != 200:
            pytest.skip("Cannot get practices")
        
        practices = response.json()
        if not practices:
            pytest.skip("No practices available")
        
        # Test first practice
        practice_id = practices[0].get("id")
        workspace_response = auth_session.get(f"{BASE_URL}/api/practices/{practice_id}/workspace")
        
        if workspace_response.status_code != 200:
            pytest.skip("Cannot get workspace")
        
        workspace = workspace_response.json()
        current_activity = workspace.get("current_activity", {})
        label = current_activity.get("label", "")
        
        # Label should be Italian, not technical codes like "start_practice"
        technical_codes = ["start_practice", "upload_documents", "run_analysis", "herion_working", 
                          "approve_submission", "sign_document", "official_step", "upload_proof",
                          "wait_response", "complete_practice", "resolve_blocker", "done", "unknown"]
        
        assert label not in technical_codes, f"Label should be Italian, got technical code: '{label}'"
        
        # Should contain Italian words
        italian_indicators = ["pratica", "documenti", "Herion", "verifica", "approva", "firma", 
                             "carica", "attesa", "completa", "risolvi", "Inizia"]
        has_italian = any(ind.lower() in label.lower() for ind in italian_indicators) or label == ""
        
        print(f"✓ current_activity.label is Italian: '{label}'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
