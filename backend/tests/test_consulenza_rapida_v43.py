"""
Test suite for Consulenza Rapida AI Triage feature (Iteration 43)
Tests:
- POST /api/consulenza/triage - AI-powered procedure suggestions
- POST /api/consulenza/refine - Follow-up refinement
- GET /api/consulenza/sessions - Session history
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@aic.it"
ADMIN_PASSWORD = "Admin123!"


class TestConsulenzaRapidaBackend:
    """Test suite for Consulenza Rapida endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth cookies
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.user = login_response.json()
        yield
        # Cleanup - logout
        self.session.post(f"{BASE_URL}/api/auth/logout")
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✓ Health check passed")
    
    def test_triage_endpoint_requires_auth(self):
        """Test that triage endpoint requires authentication"""
        # Use a fresh session without auth
        fresh_session = requests.Session()
        response = fresh_session.post(
            f"{BASE_URL}/api/consulenza/triage",
            json={"description": "Test description for triage"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Triage endpoint requires authentication")
    
    def test_triage_validation_short_description(self):
        """Test that triage rejects descriptions shorter than 10 chars"""
        response = self.session.post(
            f"{BASE_URL}/api/consulenza/triage",
            json={"description": "short"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"✓ Short description rejected: {data['detail']}")
    
    def test_triage_validation_empty_description(self):
        """Test that triage rejects empty descriptions"""
        response = self.session.post(
            f"{BASE_URL}/api/consulenza/triage",
            json={"description": ""}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Empty description rejected")
    
    def test_triage_success_vat_opening(self):
        """Test successful triage for VAT opening scenario"""
        description = "Voglio aprire la partita IVA come libero professionista per lavorare come consulente informatico"
        
        response = self.session.post(
            f"{BASE_URL}/api/consulenza/triage",
            json={"description": description},
            timeout=30  # AI responses may take time
        )
        
        assert response.status_code == 200, f"Triage failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "session_id" in data, "Missing session_id in response"
        assert "response" in data, "Missing response in response"
        
        ai_response = data["response"]
        assert "type" in ai_response, "Missing type in AI response"
        assert ai_response["type"] in ["suggestions", "clarification"], f"Invalid type: {ai_response['type']}"
        assert "message" in ai_response, "Missing message in AI response"
        
        if ai_response["type"] == "suggestions":
            assert "suggestions" in ai_response, "Missing suggestions array"
            assert isinstance(ai_response["suggestions"], list), "Suggestions should be a list"
            # Should have 1-3 suggestions
            assert 0 <= len(ai_response["suggestions"]) <= 3, f"Expected 0-3 suggestions, got {len(ai_response['suggestions'])}"
            
            # Validate suggestion structure
            for suggestion in ai_response["suggestions"]:
                assert "practice_id" in suggestion, "Missing practice_id in suggestion"
                assert "name" in suggestion, "Missing name in suggestion"
                assert "why" in suggestion, "Missing why in suggestion"
                assert "confidence" in suggestion, "Missing confidence in suggestion"
                assert suggestion["confidence"] in ["high", "medium", "low"], f"Invalid confidence: {suggestion['confidence']}"
        
        print(f"✓ Triage success - session_id: {data['session_id']}")
        print(f"  Type: {ai_response['type']}")
        print(f"  Message: {ai_response['message'][:100]}...")
        if ai_response.get("suggestions"):
            print(f"  Suggestions: {len(ai_response['suggestions'])}")
            for s in ai_response["suggestions"]:
                print(f"    - {s['name']} ({s['practice_id']}) - {s['confidence']}")
        
        return data["session_id"]
    
    def test_triage_success_tax_declaration(self):
        """Test successful triage for tax declaration scenario"""
        description = "Devo fare la dichiarazione dei redditi per l'anno scorso, sono un dipendente con un appartamento in affitto"
        
        response = self.session.post(
            f"{BASE_URL}/api/consulenza/triage",
            json={"description": description},
            timeout=30
        )
        
        assert response.status_code == 200, f"Triage failed: {response.text}"
        data = response.json()
        assert "session_id" in data
        assert "response" in data
        print(f"✓ Tax declaration triage success - session_id: {data['session_id']}")
        return data["session_id"]
    
    def test_refine_endpoint_requires_auth(self):
        """Test that refine endpoint requires authentication"""
        fresh_session = requests.Session()
        response = fresh_session.post(
            f"{BASE_URL}/api/consulenza/refine",
            json={"session_id": "test-session", "follow_up": "More details"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Refine endpoint requires authentication")
    
    def test_refine_invalid_session(self):
        """Test refine with invalid session_id"""
        response = self.session.post(
            f"{BASE_URL}/api/consulenza/refine",
            json={"session_id": "invalid-session-id-12345", "follow_up": "More details about my situation"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Refine with invalid session rejected")
    
    def test_refine_success(self):
        """Test successful refinement flow"""
        # First create a triage session
        triage_response = self.session.post(
            f"{BASE_URL}/api/consulenza/triage",
            json={"description": "Ho bisogno di aiuto con questioni fiscali per la mia attività"},
            timeout=30
        )
        assert triage_response.status_code == 200, f"Triage failed: {triage_response.text}"
        session_id = triage_response.json()["session_id"]
        
        # Now refine with follow-up
        refine_response = self.session.post(
            f"{BASE_URL}/api/consulenza/refine",
            json={
                "session_id": session_id,
                "follow_up": "Sono un libero professionista con partita IVA già aperta, devo pagare le tasse trimestrali"
            },
            timeout=30
        )
        
        assert refine_response.status_code == 200, f"Refine failed: {refine_response.text}"
        data = refine_response.json()
        
        assert "session_id" in data
        assert data["session_id"] == session_id, "Session ID should match"
        assert "response" in data
        
        ai_response = data["response"]
        assert "type" in ai_response
        assert "message" in ai_response
        
        print(f"✓ Refine success - session_id: {session_id}")
        print(f"  Type: {ai_response['type']}")
        print(f"  Message: {ai_response['message'][:100]}...")
    
    def test_sessions_endpoint_requires_auth(self):
        """Test that sessions endpoint requires authentication"""
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/consulenza/sessions")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Sessions endpoint requires authentication")
    
    def test_sessions_list(self):
        """Test getting session history"""
        # First create a session
        self.session.post(
            f"{BASE_URL}/api/consulenza/triage",
            json={"description": "Test session for history check - apertura partita IVA"},
            timeout=30
        )
        
        # Get sessions
        response = self.session.get(f"{BASE_URL}/api/consulenza/sessions")
        assert response.status_code == 200, f"Sessions list failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Sessions should be a list"
        
        if len(data) > 0:
            session = data[0]
            assert "session_id" in session, "Missing session_id"
            assert "status" in session, "Missing status"
            assert "created_at" in session, "Missing created_at"
            assert "preview" in session, "Missing preview"
        
        print(f"✓ Sessions list success - found {len(data)} sessions")
        for s in data[:3]:
            print(f"  - {s['session_id']}: {s.get('preview', '')[:50]}...")
    
    def test_triage_ambiguous_situation(self):
        """Test triage with ambiguous situation that might need clarification"""
        description = "Ho un problema con le tasse"
        
        response = self.session.post(
            f"{BASE_URL}/api/consulenza/triage",
            json={"description": description},
            timeout=30
        )
        
        assert response.status_code == 200, f"Triage failed: {response.text}"
        data = response.json()
        
        ai_response = data["response"]
        # Could be either suggestions or clarification
        assert ai_response["type"] in ["suggestions", "clarification"]
        
        if ai_response["type"] == "clarification":
            assert "clarification_question" in ai_response
            print(f"✓ Ambiguous triage - AI asked for clarification: {ai_response['clarification_question']}")
        else:
            print(f"✓ Ambiguous triage - AI provided {len(ai_response.get('suggestions', []))} suggestions")
    
    def test_catalog_endpoint_for_suggestions(self):
        """Test that catalog endpoint works (used by triage for validation)"""
        response = self.session.get(f"{BASE_URL}/api/catalog")
        assert response.status_code == 200, f"Catalog failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Catalog should be a list"
        assert len(data) > 0, "Catalog should have entries"
        
        # Check structure
        entry = data[0]
        assert "practice_id" in entry, "Missing practice_id in catalog entry"
        assert "name" in entry, "Missing name in catalog entry"
        
        print(f"✓ Catalog endpoint works - {len(data)} procedures available")


class TestConsulenzaRapidaIntegration:
    """Integration tests for full Consulenza flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        yield
        self.session.post(f"{BASE_URL}/api/auth/logout")
    
    def test_full_consultation_flow(self):
        """Test complete consultation flow: triage -> refine -> check sessions"""
        # Step 1: Initial triage
        print("\n--- Step 1: Initial Triage ---")
        triage_response = self.session.post(
            f"{BASE_URL}/api/consulenza/triage",
            json={"description": "Devo chiudere la mia partita IVA perché ho trovato un lavoro dipendente"},
            timeout=30
        )
        assert triage_response.status_code == 200
        triage_data = triage_response.json()
        session_id = triage_data["session_id"]
        print(f"Session created: {session_id}")
        print(f"AI response type: {triage_data['response']['type']}")
        
        # Step 2: Refine with more details
        print("\n--- Step 2: Refinement ---")
        refine_response = self.session.post(
            f"{BASE_URL}/api/consulenza/refine",
            json={
                "session_id": session_id,
                "follow_up": "Sono iscritto alla gestione separata INPS e ho anche una posizione INAIL aperta"
            },
            timeout=30
        )
        assert refine_response.status_code == 200
        refine_data = refine_response.json()
        print(f"Refinement response type: {refine_data['response']['type']}")
        
        # Step 3: Check session appears in history
        print("\n--- Step 3: Verify Session History ---")
        sessions_response = self.session.get(f"{BASE_URL}/api/consulenza/sessions")
        assert sessions_response.status_code == 200
        sessions = sessions_response.json()
        
        session_ids = [s["session_id"] for s in sessions]
        assert session_id in session_ids, f"Session {session_id} not found in history"
        print(f"✓ Session found in history")
        
        print("\n✓ Full consultation flow completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
