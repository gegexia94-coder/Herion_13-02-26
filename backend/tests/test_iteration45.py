"""
Iteration 45 Backend Tests
Testing: Practice Chat API, Consulenza Triage API, Navigation consistency
Uses session cookies for authentication (httpOnly cookies)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ai-practice-manager.preview.emergentagent.com')


@pytest.fixture(scope="module")
def auth_session():
    """Create authenticated session with cookies"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@aic.it",
        "password": "Admin123!"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "email" in data, "Login should return user data"
    print(f"✓ Logged in as {data['email']}")
    return session


class TestAuth:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test admin login"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aic.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert data["email"] == "admin@aic.it"
        print(f"✓ Login successful for {data['email']}")


class TestPracticeChat:
    """Practice-specific AI chat tests"""
    
    @pytest.fixture(scope="class")
    def practice_id(self, auth_session):
        """Get a practice ID for testing"""
        response = auth_session.get(f"{BASE_URL}/api/practices")
        assert response.status_code == 200
        practices = response.json()
        assert len(practices) > 0, "No practices found"
        return practices[0]["id"]
    
    def test_practice_chat_endpoint_exists(self, auth_session, practice_id):
        """Test that POST /api/practices/{id}/chat endpoint exists"""
        response = auth_session.post(
            f"{BASE_URL}/api/practices/{practice_id}/chat",
            json={"question": "Cosa devo fare adesso?"}
        )
        # Should not be 404 or 405
        assert response.status_code not in [404, 405], f"Endpoint not found: {response.status_code}"
        print(f"✓ Practice chat endpoint exists, status: {response.status_code}")
    
    def test_practice_chat_returns_contextual_response(self, auth_session, practice_id):
        """Test that practice chat returns a contextual AI response"""
        response = auth_session.post(
            f"{BASE_URL}/api/practices/{practice_id}/chat",
            json={"question": "Quali documenti mancano per questa pratica?"}
        )
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        
        # Check response structure
        assert "id" in data, "Response should have id"
        assert "question" in data, "Response should have question"
        assert "answer" in data, "Response should have answer"
        
        # Answer should not be empty
        assert len(data["answer"]) > 0, "Answer should not be empty"
        print(f"✓ Practice chat returned contextual response: {data['answer'][:100]}...")
    
    def test_practice_chat_history_endpoint(self, auth_session, practice_id):
        """Test GET /api/practices/{id}/chat returns chat history"""
        response = auth_session.get(f"{BASE_URL}/api/practices/{practice_id}/chat")
        assert response.status_code == 200, f"Get chat history failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Chat history should be a list"
        print(f"✓ Practice chat history endpoint works, {len(data)} messages")


class TestConsulenzaRapida:
    """Consulenza Rapida (AI triage) tests"""
    
    def test_consulenza_triage_endpoint_exists(self, auth_session):
        """Test that POST /api/consulenza/triage endpoint exists"""
        response = auth_session.post(
            f"{BASE_URL}/api/consulenza/triage",
            json={"description": "Devo aprire la partita IVA come freelancer"}
        )
        # Should not be 404 or 405
        assert response.status_code not in [404, 405], f"Endpoint not found: {response.status_code}"
        print(f"✓ Consulenza triage endpoint exists, status: {response.status_code}")
    
    def test_consulenza_triage_maps_to_catalog(self, auth_session):
        """Test that consulenza triage maps user query to catalog procedures"""
        response = auth_session.post(
            f"{BASE_URL}/api/consulenza/triage",
            json={"description": "Devo aprire la partita IVA come freelancer nel settore IT"}
        )
        assert response.status_code == 200, f"Triage failed: {response.text}"
        data = response.json()
        
        # Check response structure
        assert "session_id" in data, "Response should have session_id"
        assert "response" in data, "Response should have response object"
        
        resp = data["response"]
        assert "type" in resp, "Response should have type"
        assert "message" in resp, "Response should have message"
        
        # Should have suggestions or clarification
        if resp["type"] == "suggestions":
            assert "suggestions" in resp, "Should have suggestions"
            assert len(resp["suggestions"]) > 0, "Should have at least one suggestion"
            
            # Check suggestion structure
            suggestion = resp["suggestions"][0]
            assert "practice_id" in suggestion, "Suggestion should have practice_id"
            assert "name" in suggestion, "Suggestion should have name"
            assert "confidence" in suggestion, "Suggestion should have confidence"
            
            print(f"✓ Consulenza mapped query to {len(resp['suggestions'])} procedures")
            for s in resp["suggestions"]:
                print(f"  - {s['name']} ({s['confidence']})")
        else:
            # Clarification type
            assert "clarification_question" in resp, "Should have clarification_question"
            print(f"✓ Consulenza requested clarification: {resp['clarification_question']}")
    
    def test_consulenza_refine_endpoint(self, auth_session):
        """Test that POST /api/consulenza/refine endpoint works"""
        # First, create a session
        triage_response = auth_session.post(
            f"{BASE_URL}/api/consulenza/triage",
            json={"description": "Ho bisogno di aiuto con le tasse"}
        )
        assert triage_response.status_code == 200
        session_id = triage_response.json()["session_id"]
        
        # Now refine
        refine_response = auth_session.post(
            f"{BASE_URL}/api/consulenza/refine",
            json={
                "session_id": session_id,
                "follow_up": "Sono un libero professionista con partita IVA"
            }
        )
        assert refine_response.status_code == 200, f"Refine failed: {refine_response.text}"
        data = refine_response.json()
        assert "response" in data, "Refine should return response"
        print(f"✓ Consulenza refine endpoint works")


class TestPracticeWorkspace:
    """Practice workspace and guidance tests"""
    
    @pytest.fixture(scope="class")
    def practice_id(self, auth_session):
        """Get a practice ID for testing"""
        response = auth_session.get(f"{BASE_URL}/api/practices")
        assert response.status_code == 200
        practices = response.json()
        assert len(practices) > 0, "No practices found"
        return practices[0]["id"]
    
    def test_practice_workspace_endpoint(self, auth_session, practice_id):
        """Test GET /api/practices/{id}/workspace returns workspace data"""
        response = auth_session.get(f"{BASE_URL}/api/practices/{practice_id}/workspace")
        assert response.status_code == 200, f"Workspace failed: {response.text}"
        data = response.json()
        
        # Check workspace structure
        assert "current_step" in data or "user_status" in data, "Workspace should have step or status info"
        print(f"✓ Practice workspace endpoint works")
        
        # Check for documents_summary (used for missing docs hint)
        if "documents_summary" in data:
            docs = data["documents_summary"]
            print(f"  - Documents summary: {docs}")
        
        # Check for ui_guidance (used for guidance card)
        if "ui_guidance" in data:
            guidance = data["ui_guidance"]
            print(f"  - UI guidance: {guidance.get('headline', 'N/A')}")


class TestDashboardStats:
    """Dashboard statistics tests"""
    
    def test_dashboard_stats_endpoint(self, auth_session):
        """Test GET /api/dashboard/stats returns stats"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        
        # Check for recent_practices (used in dashboard)
        assert "recent_practices" in data, "Should have recent_practices"
        print(f"✓ Dashboard stats endpoint works, {len(data.get('recent_practices', []))} recent practices")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
