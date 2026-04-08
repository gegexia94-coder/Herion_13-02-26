"""
Herion v3.0 Backend API Tests - Branded Agents, Reminders, Practice Chat
Tests for: Branded agent names, Smart reminders, Practice Q&A chat
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ai-practice-manager.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@aic.it"
ADMIN_PASSWORD = "Admin123!"


class TestBrandedAgentsInfo:
    """Tests for branded agent names in /api/agents/info"""
    
    def test_agents_info_has_branded_names(self):
        """Test /api/agents/info returns agents with branded_name and icon_key"""
        response = requests.get(f"{BASE_URL}/api/agents/info")
        assert response.status_code == 200
        data = response.json()
        
        # Verify 5 agents
        assert "agents" in data
        assert len(data["agents"]) == 5
        
        # Verify each agent has branded_name and icon_key
        expected_branded = {
            "analysis": "Herion Compass",
            "validation": "Herion Shield",
            "compliance": "Herion Rules",
            "document": "Herion Docs",
            "communication": "Herion Voice"
        }
        
        for agent in data["agents"]:
            assert "branded_name" in agent, f"Agent {agent['type']} missing branded_name"
            assert "icon_key" in agent, f"Agent {agent['type']} missing icon_key"
            
            # Verify correct branded name
            expected = expected_branded.get(agent["type"])
            assert agent["branded_name"] == expected, f"Expected {expected}, got {agent['branded_name']}"
        
        print(f"✓ All 5 agents have correct branded names: {[a['branded_name'] for a in data['agents']]}")
    
    def test_agents_info_has_admin_agent(self):
        """Test /api/agents/info returns admin_agent object"""
        response = requests.get(f"{BASE_URL}/api/agents/info")
        assert response.status_code == 200
        data = response.json()
        
        # Verify admin_agent exists
        assert "admin_agent" in data, "Missing admin_agent in response"
        admin = data["admin_agent"]
        
        assert admin["name"] == "Herion Admin"
        assert "icon_key" in admin
        assert "description" in admin
        
        print(f"✓ Admin agent present: {admin['name']} - {admin['description'][:50]}...")


class TestSmartReminders:
    """Tests for smart reminders/announcements endpoints"""
    
    def test_get_reminders_returns_seeded_data(self):
        """Test GET /api/reminders returns seeded reminders (4 items)"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        response = session.get(f"{BASE_URL}/api/reminders")
        assert response.status_code == 200
        reminders = response.json()
        
        assert isinstance(reminders, list)
        assert len(reminders) >= 4, f"Expected at least 4 seeded reminders, got {len(reminders)}"
        
        # Verify reminder structure
        for r in reminders:
            assert "id" in r
            assert "title" in r
            assert "content" in r
            assert "category" in r
            assert "category_label" in r
            assert "priority" in r
        
        # Check for expected seeded reminders
        titles = [r["title"] for r in reminders]
        assert any("IVA" in t for t in titles), "Missing IVA reminder"
        assert any("Documenti" in t for t in titles), "Missing documents reminder"
        
        print(f"✓ Reminders endpoint returns {len(reminders)} reminders")
        for r in reminders[:4]:
            print(f"  - {r['title']} ({r['category_label']}, priority: {r['priority']})")
    
    def test_get_reminder_categories(self):
        """Test GET /api/reminders/categories returns categories"""
        response = requests.get(f"{BASE_URL}/api/reminders/categories")
        assert response.status_code == 200
        categories = response.json()
        
        assert isinstance(categories, list)
        assert len(categories) >= 6
        
        # Verify expected categories
        keys = [c["key"] for c in categories]
        expected = ["deadlines", "declarations", "vat_reminders", "document_preparation", "country_notices", "platform_updates"]
        for key in expected:
            assert key in keys, f"Missing category: {key}"
        
        print(f"✓ Reminder categories: {[c['key'] for c in categories]}")
    
    def test_admin_can_create_reminder(self):
        """Test POST /api/reminders - admin can create reminders"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        reminder_data = {
            "title": "TEST_Reminder_" + str(int(time.time())),
            "content": "This is a test reminder created by automated tests",
            "category": "platform_updates",
            "priority": "normal",
            "active": True
        }
        
        response = session.post(f"{BASE_URL}/api/reminders", json=reminder_data)
        assert response.status_code == 200
        created = response.json()
        
        assert created["title"] == reminder_data["title"]
        assert created["content"] == reminder_data["content"]
        assert created["category"] == "platform_updates"
        assert created["category_label"] == "Aggiornamenti Piattaforma"
        assert "id" in created
        
        print(f"✓ Admin created reminder: {created['title']}")
        return created["id"]
    
    def test_admin_can_delete_reminder(self):
        """Test DELETE /api/reminders/{id} - admin can delete reminders"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        # First create a reminder to delete
        reminder_data = {
            "title": "TEST_ToDelete_" + str(int(time.time())),
            "content": "This reminder will be deleted",
            "category": "platform_updates",
            "priority": "low",
            "active": True
        }
        
        create_response = session.post(f"{BASE_URL}/api/reminders", json=reminder_data)
        assert create_response.status_code == 200
        reminder_id = create_response.json()["id"]
        
        # Now delete it
        delete_response = session.delete(f"{BASE_URL}/api/reminders/{reminder_id}")
        assert delete_response.status_code == 200
        
        print(f"✓ Admin deleted reminder: {reminder_id}")
    
    def test_non_admin_cannot_create_reminder(self):
        """Test POST /api/reminders - non-admin users cannot create reminders"""
        # Register a new non-admin user
        session = requests.Session()
        test_email = f"test_nonadmin_{int(time.time())}@test.it"
        
        reg_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "User",
            "privacy_consent": True,
            "terms_consent": True
        })
        assert reg_response.status_code == 200
        
        # Try to create reminder as non-admin
        reminder_data = {
            "title": "Unauthorized Reminder",
            "content": "This should fail",
            "category": "platform_updates",
            "priority": "normal"
        }
        
        response = session.post(f"{BASE_URL}/api/reminders", json=reminder_data)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        print("✓ Non-admin correctly rejected from creating reminders (403)")


class TestPracticeChat:
    """Tests for practice Q&A chat with Herion Admin"""
    
    @pytest.fixture
    def authenticated_session_with_practice(self):
        """Get authenticated session and create a test practice"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        # Create a test practice
        practice_data = {
            "practice_type": "vat_registration",
            "description": "Test practice for chat testing",
            "client_name": "Chat Test Client",
            "client_type": "private",
            "fiscal_code": "CHTCLT90A01H501Z",
            "country": "IT"
        }
        
        response = session.post(f"{BASE_URL}/api/practices", json=practice_data)
        assert response.status_code == 200
        practice_id = response.json()["id"]
        
        return session, practice_id
    
    def test_send_practice_chat_question(self, authenticated_session_with_practice):
        """Test POST /api/practices/{id}/chat - sends question, gets AI response"""
        session, practice_id = authenticated_session_with_practice
        
        chat_data = {"question": "Qual e lo stato attuale di questa pratica?"}
        
        response = session.post(f"{BASE_URL}/api/practices/{practice_id}/chat", json=chat_data)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert "question" in data
        assert "answer" in data
        assert "answered_by" in data
        assert "timestamp" in data
        
        # Verify answered by Herion Admin
        assert data["answered_by"] == "Herion Admin"
        assert data["question"] == chat_data["question"]
        assert len(data["answer"]) > 0
        
        print(f"✓ Practice chat working - Question: '{chat_data['question'][:30]}...'")
        print(f"  Answer from {data['answered_by']}: '{data['answer'][:100]}...'")
        
        # Cleanup - delete practice
        session.delete(f"{BASE_URL}/api/practices/{practice_id}")
    
    def test_get_practice_chat_history(self, authenticated_session_with_practice):
        """Test GET /api/practices/{id}/chat - returns chat history"""
        session, practice_id = authenticated_session_with_practice
        
        # First send a chat message
        chat_data = {"question": "Test question for history"}
        session.post(f"{BASE_URL}/api/practices/{practice_id}/chat", json=chat_data)
        
        # Now get chat history
        response = session.get(f"{BASE_URL}/api/practices/{practice_id}/chat")
        assert response.status_code == 200
        history = response.json()
        
        assert isinstance(history, list)
        assert len(history) >= 1
        
        # Verify history entry structure
        entry = history[0]
        assert "id" in entry
        assert "question" in entry
        assert "answer" in entry
        assert "answered_by" in entry
        
        print(f"✓ Practice chat history returns {len(history)} entries")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/practices/{practice_id}")
    
    def test_chat_requires_authentication(self):
        """Test practice chat requires authentication"""
        response = requests.post(f"{BASE_URL}/api/practices/fake-id/chat", json={
            "question": "Test"
        })
        assert response.status_code == 401
        print("✓ Practice chat correctly requires authentication")


class TestOrchestrationWithBrandedNames:
    """Tests for orchestration returning branded agent names"""
    
    def test_orchestration_returns_branded_names(self):
        """Test orchestration results include branded_name for each step"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        # Create a practice
        practice_data = {
            "practice_type": "tax_declaration",
            "description": "Test for orchestration branded names",
            "client_name": "Orch Test Client",
            "client_type": "private",
            "fiscal_code": "ORCTST90A01H501Z",
            "country": "IT"
        }
        
        create_response = session.post(f"{BASE_URL}/api/practices", json=practice_data)
        assert create_response.status_code == 200
        practice_id = create_response.json()["id"]
        
        # Run orchestration (this may take time due to AI calls)
        print("  Running orchestration (this may take 30-60 seconds)...")
        orch_response = session.post(f"{BASE_URL}/api/agents/orchestrate", json={
            "practice_id": practice_id,
            "query": "Analisi rapida"
        }, timeout=120)
        
        assert orch_response.status_code == 200
        result = orch_response.json()
        
        # Verify orchestration result structure
        assert "id" in result
        assert "steps" in result
        assert len(result["steps"]) == 5
        
        # Verify each step has branded_name
        expected_branded = ["Herion Compass", "Herion Shield", "Herion Rules", "Herion Docs", "Herion Voice"]
        for i, step in enumerate(result["steps"]):
            assert "branded_name" in step, f"Step {i} missing branded_name"
            assert step["branded_name"] == expected_branded[i], f"Step {i} has wrong branded_name"
            assert "icon_key" in step
        
        print(f"✓ Orchestration completed with branded names: {[s['branded_name'] for s in result['steps']]}")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/practices/{practice_id}")


class TestAgentExecutionWithBrandedNames:
    """Tests for single agent execution returning branded names"""
    
    def test_agent_execute_returns_branded_name(self):
        """Test /api/agents/execute returns branded_name in response"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        # Create a practice
        practice_data = {
            "practice_type": "vat_registration",
            "description": "Test for agent branded name",
            "client_name": "Agent Test Client",
            "client_type": "private",
            "fiscal_code": "AGTTST90A01H501Z",
            "country": "IT"
        }
        
        create_response = session.post(f"{BASE_URL}/api/practices", json=practice_data)
        assert create_response.status_code == 200
        practice_id = create_response.json()["id"]
        
        # Execute single agent
        print("  Executing single agent (Herion Compass)...")
        agent_response = session.post(f"{BASE_URL}/api/agents/execute", json={
            "agent_type": "analysis",
            "practice_id": practice_id,
            "input_data": {"query": "Analisi rapida"}
        }, timeout=60)
        
        assert agent_response.status_code == 200
        result = agent_response.json()
        
        # Verify branded_name in response
        assert "branded_name" in result
        assert result["branded_name"] == "Herion Compass"
        assert "icon_key" in result
        assert result["icon_key"] == "compass"
        
        print(f"✓ Agent execution returns branded_name: {result['branded_name']}")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/practices/{practice_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
