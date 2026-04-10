"""
Herion Iteration 12 Tests - Document Intelligence Layer & Italy-Only Cleanup
Tests:
- Phase A: Italy-only operational cleanup (catalog + registry + routing + governance scoped to Italy)
- Phase B: Full Document Intelligence Layer (document matrix, signature handling, sensitivity levels)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@aic.it"
ADMIN_PASSWORD = "Admin123!"

# Nexus practice ID from seeded data
NEXUS_PRACTICE_ID = "e18f8d72-ea8f-445b-951a-bbd082e60648"


@pytest.fixture(scope="module")
def admin_session():
    """Login as admin and return session with cookies."""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return session


class TestAdminLogin:
    """Verify admin login works."""
    
    def test_admin_login_success(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        print("PASS: Admin login successful")


class TestCatalogItalyScope:
    """Phase A: Verify all catalog entries have country_scope=IT and operational_status."""
    
    def test_catalog_all_entries_have_italy_scope(self, admin_session):
        """GET /api/catalog - all entries should have country_scope=IT."""
        response = admin_session.get(f"{BASE_URL}/api/catalog")
        assert response.status_code == 200
        catalog = response.json()
        assert len(catalog) > 0, "Catalog should not be empty"
        
        for entry in catalog:
            assert entry.get("country_scope") == "IT", f"Entry {entry.get('practice_id')} missing country_scope=IT"
        
        print(f"PASS: All {len(catalog)} catalog entries have country_scope=IT")
    
    def test_catalog_all_entries_have_operational_status(self, admin_session):
        """GET /api/catalog - all entries should have operational_status field."""
        response = admin_session.get(f"{BASE_URL}/api/catalog")
        assert response.status_code == 200
        catalog = response.json()
        
        valid_statuses = ["active_italy_scope", "active_internal", "needs_validation", "future_scope_only", "inactive"]
        
        for entry in catalog:
            status = entry.get("operational_status")
            assert status is not None, f"Entry {entry.get('practice_id')} missing operational_status"
            assert status in valid_statuses, f"Entry {entry.get('practice_id')} has invalid status: {status}"
        
        # Count by status
        status_counts = {}
        for entry in catalog:
            s = entry.get("operational_status")
            status_counts[s] = status_counts.get(s, 0) + 1
        
        print(f"PASS: All catalog entries have valid operational_status: {status_counts}")


class TestRegistryItalyScope:
    """Phase A: Verify all registry entries have registry_status and no 'multi' country."""
    
    def test_registry_all_entries_have_status(self, admin_session):
        """GET /api/registry - all entries should have registry_status field."""
        response = admin_session.get(f"{BASE_URL}/api/registry")
        assert response.status_code == 200
        registry = response.json()
        assert len(registry) > 0, "Registry should not be empty"
        
        for entry in registry:
            assert entry.get("registry_status") is not None, f"Entry {entry.get('registry_id')} missing registry_status"
        
        print(f"PASS: All {len(registry)} registry entries have registry_status")
    
    def test_registry_no_multi_country(self, admin_session):
        """GET /api/registry - no entries should have country='multi'."""
        response = admin_session.get(f"{BASE_URL}/api/registry")
        assert response.status_code == 200
        registry = response.json()
        
        for entry in registry:
            country = entry.get("country", "")
            assert country != "multi", f"Entry {entry.get('registry_id')} still has country='multi'"
            assert country == "IT", f"Entry {entry.get('registry_id')} has non-IT country: {country}"
        
        print(f"PASS: All registry entries have country=IT (no 'multi' left)")


class TestDocumentMatrixAPI:
    """Phase B: Document Intelligence Layer - Matrix endpoints."""
    
    def test_document_matrix_for_nexus_practice(self, admin_session):
        """GET /api/documents/matrix/{practice_id} - returns complete document matrix."""
        response = admin_session.get(f"{BASE_URL}/api/documents/matrix/{NEXUS_PRACTICE_ID}")
        assert response.status_code == 200
        matrix = response.json()
        
        # Verify structure
        assert matrix.get("has_matrix") == True, "Nexus practice should have a matrix"
        assert matrix.get("practice_type") == "COMPANY_CLOSURE", f"Expected COMPANY_CLOSURE, got {matrix.get('practice_type')}"
        assert "required" in matrix
        assert "optional" in matrix
        assert "conditional" in matrix
        assert "expected_outputs" in matrix
        assert "completeness" in matrix
        
        print(f"PASS: Document matrix returned for Nexus practice with all sections")
    
    def test_document_matrix_required_docs_for_company_closure(self, admin_session):
        """COMPANY_CLOSURE should have 6 required documents."""
        response = admin_session.get(f"{BASE_URL}/api/documents/matrix/{NEXUS_PRACTICE_ID}")
        assert response.status_code == 200
        matrix = response.json()
        
        required = matrix.get("required", [])
        assert len(required) == 6, f"Expected 6 required docs, got {len(required)}"
        
        # Check specific required docs
        required_keys = [d["doc_key"] for d in required]
        expected_keys = [
            "atto_costitutivo",
            "bilancio_finale_liquidazione",
            "verbale_approvazione",
            "identity_liquidatore",
            "codice_fiscale_societa",
            "certificato_pendenze"
        ]
        for key in expected_keys:
            assert key in required_keys, f"Missing required doc: {key}"
        
        print(f"PASS: COMPANY_CLOSURE has 6 required docs: {required_keys}")
    
    def test_document_matrix_signature_requirements(self, admin_session):
        """Verify signature requirements are tracked (2 docs need signatures)."""
        response = admin_session.get(f"{BASE_URL}/api/documents/matrix/{NEXUS_PRACTICE_ID}")
        assert response.status_code == 200
        matrix = response.json()
        
        required = matrix.get("required", [])
        signed_required = [d for d in required if d.get("signed_required")]
        
        assert len(signed_required) >= 2, f"Expected at least 2 docs requiring signature, got {len(signed_required)}"
        
        signed_labels = [d["label"] for d in signed_required]
        print(f"PASS: {len(signed_required)} required docs need signatures: {signed_labels}")
    
    def test_document_matrix_conditional_delegation(self, admin_session):
        """Verify conditional delegation document with P7M awareness."""
        response = admin_session.get(f"{BASE_URL}/api/documents/matrix/{NEXUS_PRACTICE_ID}")
        assert response.status_code == 200
        matrix = response.json()
        
        conditional = matrix.get("conditional", [])
        assert len(conditional) >= 1, "Should have at least 1 conditional doc"
        
        # Find delegation doc
        delegation_doc = next((d for d in conditional if "delega" in d.get("doc_key", "").lower()), None)
        assert delegation_doc is not None, "Should have a delegation conditional doc"
        assert delegation_doc.get("condition") == "delegation_required"
        assert "p7m" in delegation_doc.get("formats", []), "Delegation should accept P7M format"
        assert delegation_doc.get("signed_required") == True
        
        print(f"PASS: Conditional delegation doc found with P7M support")
    
    def test_document_matrix_expected_outputs(self, admin_session):
        """COMPANY_CLOSURE should have 4 expected outputs."""
        response = admin_session.get(f"{BASE_URL}/api/documents/matrix/{NEXUS_PRACTICE_ID}")
        assert response.status_code == 200
        matrix = response.json()
        
        outputs = matrix.get("expected_outputs", [])
        assert len(outputs) == 4, f"Expected 4 outputs, got {len(outputs)}"
        
        output_keys = [o["output_key"] for o in outputs]
        expected_outputs = [
            "ricevuta_registroimprese",
            "protocollo_cciaa",
            "attestazione_cancellazione",
            "dossier_finale"
        ]
        for key in expected_outputs:
            assert key in output_keys, f"Missing expected output: {key}"
        
        print(f"PASS: COMPANY_CLOSURE has 4 expected outputs: {output_keys}")
    
    def test_document_matrix_completeness_fields(self, admin_session):
        """Verify completeness section has all required fields."""
        response = admin_session.get(f"{BASE_URL}/api/documents/matrix/{NEXUS_PRACTICE_ID}")
        assert response.status_code == 200
        matrix = response.json()
        
        completeness = matrix.get("completeness", {})
        required_fields = [
            "missing_required",
            "missing_signatures",
            "can_proceed",
            "total_required",
            "uploaded_required"
        ]
        
        for field in required_fields:
            assert field in completeness, f"Missing completeness field: {field}"
        
        print(f"PASS: Completeness section has all required fields: {list(completeness.keys())}")


class TestDocumentMatrixTypes:
    """Phase B: GET /api/documents/matrix-types endpoint."""
    
    def test_matrix_types_returns_all_practice_types(self, admin_session):
        """GET /api/documents/matrix-types - returns all practice types with matrix metadata."""
        response = admin_session.get(f"{BASE_URL}/api/documents/matrix-types")
        assert response.status_code == 200
        types = response.json()
        
        assert len(types) >= 10, f"Expected at least 10 matrix types, got {len(types)}"
        
        # Check structure
        for t in types:
            assert "practice_type" in t
            assert "required_count" in t
            assert "optional_count" in t
            assert "conditional_count" in t
            assert "output_count" in t
            assert "has_signed_docs" in t
        
        # Verify expected types
        type_names = [t["practice_type"] for t in types]
        expected_types = [
            "VAT_OPEN_PF", "VAT_VARIATION_PF", "VAT_CLOSURE_PF",
            "F24_PREPARATION", "F24_WEB", "VAT_DECLARATION",
            "EINVOICING", "INPS_GESTIONE_SEP", "INPS_CASSETTO", "COMPANY_CLOSURE"
        ]
        for expected in expected_types:
            assert expected in type_names, f"Missing matrix type: {expected}"
        
        print(f"PASS: Matrix types endpoint returns {len(types)} types including all 10 expected")


class TestSensitivityLevels:
    """Phase B: GET /api/documents/sensitivity-levels endpoint."""
    
    def test_sensitivity_levels_returns_definitions(self, admin_session):
        """GET /api/documents/sensitivity-levels - returns sensitivity definitions with visibility rules."""
        response = admin_session.get(f"{BASE_URL}/api/documents/sensitivity-levels")
        assert response.status_code == 200
        levels = response.json()
        
        # Check expected levels
        expected_levels = ["standard", "personal", "fiscal", "legal", "confidential"]
        for level in expected_levels:
            assert level in levels, f"Missing sensitivity level: {level}"
        
        # Check structure
        for level_key, config in levels.items():
            assert "label" in config, f"Level {level_key} missing label"
            assert "visibility" in config, f"Level {level_key} missing visibility"
            assert "sending_allowed" in config, f"Level {level_key} missing sending_allowed"
        
        # Verify visibility rules
        assert "creator" in levels["confidential"]["visibility"]
        assert levels["confidential"]["sending_allowed"] == False
        assert levels["legal"]["sending_allowed"] == False
        
        print(f"PASS: Sensitivity levels returned with visibility rules: {list(levels.keys())}")


class TestGuardDocumentMatrixIntegration:
    """Phase B: Guard evaluation now uses Document Matrix for document_completeness dimension."""
    
    def test_guard_includes_document_completeness_dimension(self, admin_session):
        """GET /api/guard/evaluate/{practice_id} - should include document_completeness dimension."""
        response = admin_session.get(f"{BASE_URL}/api/guard/evaluate/{NEXUS_PRACTICE_ID}")
        assert response.status_code == 200
        guard = response.json()
        
        dimensions = guard.get("dimensions", [])
        dim_keys = [d.get("key") for d in dimensions]
        
        assert "document_completeness" in dim_keys, "Guard should have document_completeness dimension"
        
        doc_dim = next((d for d in dimensions if d.get("key") == "document_completeness"), None)
        assert doc_dim is not None
        assert "status" in doc_dim
        assert "detail" in doc_dim
        
        print(f"PASS: Guard evaluation includes document_completeness dimension: {doc_dim}")


class TestCreatorPasswordProtection:
    """Verify creator password is PROTECTED in test_credentials.md."""
    
    def test_creator_password_not_exposed(self):
        """test_credentials.md should show PROTECTED for creator password."""
        with open("/app/memory/test_credentials.md", "r") as f:
            content = f.read()
        
        assert "PROTECTED" in content, "Creator password should be marked as PROTECTED"
        assert "HerionCreator2026!" not in content, "Actual creator password should NOT be in test_credentials.md"
        
        print("PASS: Creator password is PROTECTED in test_credentials.md")


class TestFollowUpSystemStillWorking:
    """Verify follow-up system still works after update."""
    
    def test_follow_ups_endpoint(self, admin_session):
        """GET /api/follow-ups - should return follow-up items."""
        response = admin_session.get(f"{BASE_URL}/api/follow-ups")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Follow-ups endpoint returns {len(data)} items")
    
    def test_follow_ups_summary(self, admin_session):
        """GET /api/follow-ups/summary - should return summary counts."""
        response = admin_session.get(f"{BASE_URL}/api/follow-ups/summary")
        assert response.status_code == 200
        summary = response.json()
        assert "total_open" in summary
        print(f"PASS: Follow-ups summary endpoint works: {summary}")


class TestGuardSystemStillWorking:
    """Verify guard system still works after update."""
    
    def test_guard_evaluate_endpoint(self, admin_session):
        """GET /api/guard/evaluate/{practice_id} - should return guard evaluation."""
        response = admin_session.get(f"{BASE_URL}/api/guard/evaluate/{NEXUS_PRACTICE_ID}")
        assert response.status_code == 200
        guard = response.json()
        
        assert "verdict" in guard
        assert "guard_score" in guard
        assert "dimensions" in guard
        assert "safe_alternatives" in guard
        
        print(f"PASS: Guard evaluation works - verdict: {guard.get('verdict')}, score: {guard.get('guard_score')}")
    
    def test_guard_summary_endpoint(self, admin_session):
        """GET /api/guard/summary - should return guard summary."""
        response = admin_session.get(f"{BASE_URL}/api/guard/summary")
        assert response.status_code == 200
        summary = response.json()
        assert "evaluations" in summary
        print(f"PASS: Guard summary endpoint works")


class TestNexusPracticeExists:
    """Verify Nexus S.r.l. practice is seeded correctly."""
    
    def test_nexus_practice_exists(self, admin_session):
        """GET /api/practices/{id} - Nexus practice should exist."""
        response = admin_session.get(f"{BASE_URL}/api/practices/{NEXUS_PRACTICE_ID}")
        assert response.status_code == 200
        practice = response.json()
        
        assert practice.get("client_name") == "Nexus S.r.l."
        assert practice.get("practice_type") == "COMPANY_CLOSURE"
        assert practice.get("country") == "IT"
        
        print(f"PASS: Nexus S.r.l. practice exists with COMPANY_CLOSURE type")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
