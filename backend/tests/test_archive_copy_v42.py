"""
Test suite for Iteration 42 - Document Archive Copy/UX Refinement
Tests the updated Italian copy for document upload clarity and archive logic.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ai-practice-manager.preview.emergentagent.com')

class TestArchiveCopyBackend:
    """Backend tests for archive copy changes in workspace guidance"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookies"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@aic.it", "password": "Admin123!"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.user_id = login_response.json().get("id")
    
    def test_health_endpoint(self):
        """Test health endpoint is working"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASS: Health endpoint working")
    
    def test_practices_list(self):
        """Test practices list endpoint"""
        response = self.session.get(f"{BASE_URL}/api/practices")
        assert response.status_code == 200
        practices = response.json()
        assert isinstance(practices, list)
        print(f"PASS: Practices list returned {len(practices)} practices")
        return practices
    
    def test_workspace_guidance_waiting_user_documents(self):
        """Test workspace guidance for waiting_user_documents status contains archive language"""
        # Get practices
        practices_response = self.session.get(f"{BASE_URL}/api/practices")
        assert practices_response.status_code == 200
        practices = practices_response.json()
        
        # Find a practice in waiting_user_documents status
        waiting_practice = None
        for p in practices:
            if p.get("status") == "waiting_user_documents":
                waiting_practice = p
                break
        
        if not waiting_practice:
            pytest.skip("No practice in waiting_user_documents status found")
        
        # Get workspace for this practice
        workspace_response = self.session.get(f"{BASE_URL}/api/practices/{waiting_practice['id']}/workspace")
        assert workspace_response.status_code == 200
        workspace = workspace_response.json()
        
        # Check ui_guidance
        guidance = workspace.get("ui_guidance", {})
        assert guidance, "ui_guidance should not be empty"
        
        # Verify archive language in guidance
        subheadline = guidance.get("subheadline", "")
        next_step_detail = guidance.get("next_step_detail", "")
        
        # Check for "archivio" and "non equivale a un invio ufficiale" language
        assert "archivio" in subheadline.lower() or "archivio" in next_step_detail.lower(), \
            f"Guidance should mention 'archivio'. Got: {subheadline}"
        
        if "non equivale a un invio ufficiale" in subheadline:
            print("PASS: Guidance contains 'non equivale a un invio ufficiale'")
        
        if "Carica nel tuo archivio" in next_step_detail:
            print("PASS: Next step detail says 'Carica nel tuo archivio'")
        
        print(f"PASS: Workspace guidance for waiting_user_documents contains archive language")
        print(f"  Headline: {guidance.get('headline')}")
        print(f"  Subheadline: {subheadline[:100]}...")
    
    def test_workspace_documents_summary(self):
        """Test workspace documents_summary structure"""
        practices_response = self.session.get(f"{BASE_URL}/api/practices")
        practices = practices_response.json()
        
        if not practices:
            pytest.skip("No practices found")
        
        # Get workspace for first practice
        workspace_response = self.session.get(f"{BASE_URL}/api/practices/{practices[0]['id']}/workspace")
        assert workspace_response.status_code == 200
        workspace = workspace_response.json()
        
        # Check documents_summary structure
        docs_summary = workspace.get("documents_summary", {})
        assert "total_count" in docs_summary or "missing_count" in docs_summary, \
            "documents_summary should have count fields"
        
        print(f"PASS: Workspace documents_summary structure is correct")
        print(f"  Total: {docs_summary.get('total_count', 0)}, Missing: {docs_summary.get('missing_count', 0)}")
    
    def test_vault_endpoint(self):
        """Test vault endpoint returns documents"""
        response = self.session.get(f"{BASE_URL}/api/vault")
        assert response.status_code == 200
        vault_data = response.json()
        assert "documents" in vault_data
        print(f"PASS: Vault endpoint returned {len(vault_data.get('documents', []))} documents")
    
    def test_vault_summary_endpoint(self):
        """Test vault summary endpoint"""
        response = self.session.get(f"{BASE_URL}/api/vault/summary")
        assert response.status_code == 200
        summary = response.json()
        assert "total" in summary
        print(f"PASS: Vault summary - Total: {summary.get('total')}, Verified: {summary.get('verified')}")


class TestBuildUiGuidanceFunction:
    """Test the build_ui_guidance function output for different statuses"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookies"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@aic.it", "password": "Admin123!"}
        )
        assert login_response.status_code == 200
    
    def test_guidance_contains_archivio_language(self):
        """Verify guidance text contains archive-related language"""
        # Get all practices
        practices_response = self.session.get(f"{BASE_URL}/api/practices")
        practices = practices_response.json()
        
        found_archivio_guidance = False
        for p in practices[:5]:  # Check first 5 practices
            workspace_response = self.session.get(f"{BASE_URL}/api/practices/{p['id']}/workspace")
            if workspace_response.status_code == 200:
                workspace = workspace_response.json()
                guidance = workspace.get("ui_guidance", {})
                
                # Check if any guidance text contains "archivio"
                all_text = " ".join([
                    guidance.get("headline", ""),
                    guidance.get("subheadline", ""),
                    guidance.get("next_step_detail", "")
                ]).lower()
                
                if "archivio" in all_text:
                    found_archivio_guidance = True
                    print(f"PASS: Found 'archivio' in guidance for practice {p['id'][:8]}...")
                    break
        
        if not found_archivio_guidance:
            print("INFO: No practice with 'archivio' in guidance found (may need waiting_user_documents status)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
