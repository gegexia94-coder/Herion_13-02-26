import requests
import sys
import json
from datetime import datetime

class AICAPITester:
    def __init__(self, base_url="https://ai-practice-manager.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for file uploads
                    test_headers.pop('Content-Type', None)
                    response = self.session.post(url, files=files, headers=test_headers)
                else:
                    response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@aic.it", "password": "Admin123!"}
        )
        if success and 'id' in response:
            self.user_id = response['id']
            print(f"   Admin ID: {self.user_id}")
            return True
        return False

    def test_user_registration(self):
        """Test user registration"""
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@test.it"
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": "TestPass123!",
                "name": "Test User"
            }
        )
        return success

    def test_get_current_user(self):
        """Test get current user"""
        return self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_dashboard_stats(self):
        """Test dashboard stats"""
        return self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)

    def test_create_practice_private(self):
        """Test creating a practice for private client (no VAT)"""
        success, response = self.run_test(
            "Create Practice - Private Client",
            "POST",
            "practices",
            200,
            data={
                "practice_type": "tax_declaration",
                "description": "Test tax declaration for private client",
                "client_name": "Mario Rossi",
                "client_type": "private",
                "fiscal_code": "RSSMRA80A01H501Z",
                "additional_data": {"test": "data"}
            }
        )
        if success and 'id' in response:
            self.practice_id_private = response['id']
            print(f"   Private Practice ID: {self.practice_id_private}")
            # Verify client type is correctly stored
            if response.get('client_type') == 'private' and response.get('client_type_label') == 'Privato':
                print(f"   ✅ Client type correctly set: {response.get('client_type_label')}")
                return True
            else:
                print(f"   ❌ Client type mismatch: {response.get('client_type_label')}")
        return False

    def test_create_practice_freelancer(self):
        """Test creating a practice for freelancer (with VAT)"""
        success, response = self.run_test(
            "Create Practice - Freelancer",
            "POST",
            "practices",
            200,
            data={
                "practice_type": "vat_registration",
                "description": "Test VAT registration for freelancer",
                "client_name": "Giulia Bianchi",
                "client_type": "freelancer",
                "fiscal_code": "BNCGLI85M01H501Z",
                "vat_number": "12345678901",
                "additional_data": {"test": "data"}
            }
        )
        if success and 'id' in response:
            self.practice_id_freelancer = response['id']
            print(f"   Freelancer Practice ID: {self.practice_id_freelancer}")
            # Verify client type and VAT number
            if (response.get('client_type') == 'freelancer' and 
                response.get('client_type_label') == 'Libero Professionista' and
                response.get('vat_number') == '12345678901'):
                print(f"   ✅ Client type correctly set: {response.get('client_type_label')}")
                print(f"   ✅ VAT number correctly stored: {response.get('vat_number')}")
                return True
            else:
                print(f"   ❌ Client type or VAT mismatch")
        return False

    def test_create_practice_company(self):
        """Test creating a practice for company (with VAT)"""
        success, response = self.run_test(
            "Create Practice - Company",
            "POST",
            "practices",
            200,
            data={
                "practice_type": "vat_registration",
                "description": "Test VAT registration for company",
                "client_name": "Rossi S.r.l.",
                "client_type": "company",
                "fiscal_code": "RSSSRL80A01H501Z",
                "vat_number": "98765432109",
                "additional_data": {"test": "data"}
            }
        )
        if success and 'id' in response:
            self.practice_id_company = response['id']
            print(f"   Company Practice ID: {self.practice_id_company}")
            # Verify client type and VAT number
            if (response.get('client_type') == 'company' and 
                response.get('client_type_label') == 'Azienda' and
                response.get('vat_number') == '98765432109'):
                print(f"   ✅ Client type correctly set: {response.get('client_type_label')}")
                print(f"   ✅ VAT number correctly stored: {response.get('vat_number')}")
                return True
            else:
                print(f"   ❌ Client type or VAT mismatch")
        return False

    def test_get_practices(self):
        """Test getting practices list"""
        return self.run_test("Get Practices", "GET", "practices", 200)

    def test_get_practice_detail(self):
        """Test getting practice detail"""
        if hasattr(self, 'practice_id_private'):
            return self.run_test("Get Practice Detail - Private", "GET", f"practices/{self.practice_id_private}", 200)
        return False

    def test_update_practice(self):
        """Test updating a practice"""
        if hasattr(self, 'practice_id_freelancer'):
            return self.run_test(
                "Update Practice",
                "PUT",
                f"practices/{self.practice_id_freelancer}",
                200,
                data={
                    "status": "processing",
                    "description": "Updated description"
                }
            )
        return False

    def test_herion_branding(self):
        """Test Herion branding in API responses"""
        success, response = self.run_test("Herion API Root", "GET", "", 200)
        if success:
            message = response.get('message', '')
            if 'Herion' in message and 'Precision. Control. Confidence.' in message:
                print(f"   ✅ Herion branding found in API: {message}")
                return True
            else:
                print(f"   ❌ Herion branding not found. Got: {message}")
        return False

    def test_agents_branding(self):
        """Test Herion AI branding in agents"""
        success, response = self.run_test("Agents Info - Herion Branding", "GET", "agents/info", 200)
        if success:
            agents = response.get('agents', [])
            transparency_note = response.get('transparency_note', '')
            
            # Check if agents have Herion branding
            herion_found = False
            for agent in agents:
                system_prompt = agent.get('system_prompt', '')  # Changed from 'system_message' to 'system_prompt'
                if 'Herion' in system_prompt and 'Assistente AI' in system_prompt:
                    herion_found = True
                    print(f"   ✅ Herion branding found in {agent.get('name')} agent")
                    break
            
            if herion_found:
                return True
            else:
                print(f"   ❌ Herion branding not found in agent system prompts")
        return False

    def test_execute_agent(self):
        """Test executing an AI agent"""
        if hasattr(self, 'practice_id_freelancer'):
            success, response = self.run_test(
                "Execute Analysis Agent",
                "POST",
                "agents/execute",
                200,
                data={
                    "agent_type": "analysis",
                    "practice_id": self.practice_id_freelancer,
                    "input_data": {
                        "query": "Analizza questa pratica di apertura partita IVA"
                    }
                }
            )
            if success:
                print(f"   Agent Response: {response.get('output', 'No output')[:100]}...")
            return success
        return False

    def test_activity_logs(self):
        """Test getting activity logs"""
        return self.run_test("Activity Logs", "GET", "activity-logs", 200)

    def test_notifications(self):
        """Test getting notifications"""
        return self.run_test("Notifications", "GET", "notifications", 200)

    def test_document_upload(self):
        """Test document upload"""
        if hasattr(self, 'practice_id_company'):
            # Create a test file
            test_content = b"Test document content"
            files = {'file': ('test.txt', test_content, 'text/plain')}
            
            success, response = self.run_test(
                "Document Upload",
                "POST",
                f"documents/upload/{self.practice_id_company}",
                200,
                files=files
            )
            if success and 'id' in response:
                self.document_id = response['id']
                print(f"   Document ID: {self.document_id}")
                return True
            return False
        return False

    def test_get_practice_documents(self):
        """Test getting practice documents"""
        if hasattr(self, 'practice_id_company'):
            return self.run_test("Get Practice Documents", "GET", f"documents/practice/{self.practice_id_company}", 200)
        return False

    def test_logout(self):
        """Test logout"""
        return self.run_test("Logout", "POST", "auth/logout", 200)

def main():
    print("🚀 Starting Herion API Testing...")
    tester = AICAPITester()

    # Test sequence
    tests = [
        ("Health Check", tester.test_health_check),
        ("Herion API Branding", tester.test_herion_branding),
        ("Admin Login", tester.test_admin_login),
        ("Get Current User", tester.test_get_current_user),
        ("Dashboard Stats", tester.test_dashboard_stats),
        ("User Registration", tester.test_user_registration),
        ("Create Practice - Private Client", tester.test_create_practice_private),
        ("Create Practice - Freelancer", tester.test_create_practice_freelancer),
        ("Create Practice - Company", tester.test_create_practice_company),
        ("Get Practices", tester.test_get_practices),
        ("Get Practice Detail", tester.test_get_practice_detail),
        ("Update Practice", tester.test_update_practice),
        ("Agents Info - Herion Branding", tester.test_agents_branding),
        ("Execute Agent", tester.test_execute_agent),
        ("Activity Logs", tester.test_activity_logs),
        ("Notifications", tester.test_notifications),
        ("Document Upload", tester.test_document_upload),
        ("Get Practice Documents", tester.test_get_practice_documents),
        ("Logout", tester.test_logout)
    ]

    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            success = test_func()
            if not success:
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)

    # Print results
    print(f"\n📊 Test Results:")
    print(f"   Tests run: {tester.tests_run}")
    print(f"   Tests passed: {tester.tests_passed}")
    print(f"   Tests failed: {len(failed_tests)}")
    print(f"   Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print(f"\n✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())