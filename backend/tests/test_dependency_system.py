"""
Test suite for Herion Dependency & Risk Safeguard System
Tests the dependency endpoints and data structure for procedures.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@aic.it"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code}")
    cookies = response.cookies
    return cookies


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session."""
    session = requests.Session()
    session.cookies.update(auth_token)
    session.headers.update({"Content-Type": "application/json"})
    return session


# ═══════════════════════════════════════════════════════════════════════════════
# DEPENDENCY ENDPOINT TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestDependencyEndpoints:
    """Test GET /api/catalog/{id}/dependencies endpoint."""

    def test_company_closure_dependencies(self, api_client):
        """COMPANY_CLOSURE should have has_dependencies=true with 5 linked obligations and 3 high risks."""
        response = api_client.get(f"{BASE_URL}/api/catalog/COMPANY_CLOSURE/dependencies")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["has_dependencies"] == True, "COMPANY_CLOSURE should have dependencies"
        assert data["practice_id"] == "COMPANY_CLOSURE"
        
        # Verify 5 linked obligations
        linked_obligations = data.get("linked_obligations", [])
        assert len(linked_obligations) == 5, f"Expected 5 linked obligations, got {len(linked_obligations)}"
        
        # Verify 3 high risks
        risks = data.get("risk_if_omitted", [])
        high_risks = [r for r in risks if r.get("severity") == "high"]
        assert len(high_risks) == 3, f"Expected 3 high risks, got {len(high_risks)}"
        
        # Verify mandatory_links and high_risks counts
        assert data.get("mandatory_links", 0) >= 3, "Should have at least 3 mandatory links"
        assert data.get("high_risks", 0) == 3, f"Expected high_risks=3, got {data.get('high_risks')}"
        
        # Verify completion_integrity exists
        assert data.get("completion_integrity") is not None, "Should have completion_integrity"
        assert "is_complete_only_if" in data["completion_integrity"]
        assert "common_missing_steps" in data["completion_integrity"]
        print("PASS: COMPANY_CLOSURE dependencies verified - 5 obligations, 3 high risks")

    def test_company_formation_srl_dependencies(self, api_client):
        """COMPANY_FORMATION_SRL should have mandatory and conditional obligations."""
        response = api_client.get(f"{BASE_URL}/api/catalog/COMPANY_FORMATION_SRL/dependencies")
        assert response.status_code == 200
        
        data = response.json()
        assert data["has_dependencies"] == True
        
        linked_obligations = data.get("linked_obligations", [])
        assert len(linked_obligations) >= 4, f"Expected at least 4 obligations, got {len(linked_obligations)}"
        
        # Check for mandatory and conditional types
        types = [ob.get("type") for ob in linked_obligations]
        assert "mandatory" in types, "Should have mandatory obligations"
        assert "conditional" in types, "Should have conditional obligations"
        
        # Verify specific obligations exist
        labels = [ob.get("label") for ob in linked_obligations]
        assert any("P.IVA" in label for label in labels), "Should have VAT-related obligation"
        assert any("PEC" in label for label in labels), "Should have PEC obligation"
        print("PASS: COMPANY_FORMATION_SRL dependencies verified - mandatory and conditional obligations")

    def test_vat_open_pf_dependencies(self, api_client):
        """VAT_OPEN_PF should have INPS and EINVOICING links."""
        response = api_client.get(f"{BASE_URL}/api/catalog/VAT_OPEN_PF/dependencies")
        assert response.status_code == 200
        
        data = response.json()
        assert data["has_dependencies"] == True
        
        linked_obligations = data.get("linked_obligations", [])
        
        # Check for INPS-related obligations
        inps_found = any("INPS" in ob.get("label", "") or "INPS" in ob.get("procedure_code", "") 
                        for ob in linked_obligations)
        assert inps_found, "Should have INPS-related obligation"
        
        # Check for EINVOICING
        einvoice_found = any("fatturazione" in ob.get("label", "").lower() or 
                           "EINVOICING" in ob.get("procedure_code", "")
                           for ob in linked_obligations)
        assert einvoice_found, "Should have EINVOICING obligation"
        print("PASS: VAT_OPEN_PF dependencies verified - INPS and EINVOICING links")

    def test_doc_missing_request_no_dependencies(self, api_client):
        """DOC_MISSING_REQUEST (internal procedure) should return has_dependencies=false."""
        response = api_client.get(f"{BASE_URL}/api/catalog/DOC_MISSING_REQUEST/dependencies")
        assert response.status_code == 200
        
        data = response.json()
        assert data["has_dependencies"] == False, "Internal procedure should have no dependencies"
        assert data.get("linked_obligations", []) == [], "Should have empty linked_obligations"
        assert data.get("risk_if_omitted", []) == [], "Should have empty risk_if_omitted"
        print("PASS: DOC_MISSING_REQUEST has no dependencies (internal procedure)")

    def test_assunzione_dip_dependencies(self, api_client):
        """ASSUNZIONE_DIP should have busta paga, UniEmens, LUL obligations."""
        response = api_client.get(f"{BASE_URL}/api/catalog/ASSUNZIONE_DIP/dependencies")
        assert response.status_code == 200
        
        data = response.json()
        assert data["has_dependencies"] == True
        
        linked_obligations = data.get("linked_obligations", [])
        labels = [ob.get("label", "").lower() for ob in linked_obligations]
        codes = [ob.get("procedure_code", "") for ob in linked_obligations]
        
        # Check for busta paga
        busta_paga_found = any("busta paga" in label or "BUSTA_PAGA" in code 
                              for label, code in zip(labels, codes))
        assert busta_paga_found, "Should have busta paga obligation"
        
        # Check for UniEmens
        uniemens_found = any("uniemens" in label or "UNIEMENS" in code 
                           for label, code in zip(labels, codes))
        assert uniemens_found, "Should have UniEmens obligation"
        
        # Check for LUL (Libro Unico del Lavoro)
        lul_found = any("libro unico" in label or "LIBRO_UNICO" in code 
                       for label, code in zip(labels, codes))
        assert lul_found, "Should have LUL obligation"
        print("PASS: ASSUNZIONE_DIP dependencies verified - busta paga, UniEmens, LUL")

    def test_dichiarazione_successione_dependencies(self, api_client):
        """DICHIARAZIONE_SUCCESSIONE should have IMU and imposta di registro links."""
        response = api_client.get(f"{BASE_URL}/api/catalog/DICHIARAZIONE_SUCCESSIONE/dependencies")
        assert response.status_code == 200
        
        data = response.json()
        assert data["has_dependencies"] == True
        
        linked_obligations = data.get("linked_obligations", [])
        labels = [ob.get("label", "").lower() for ob in linked_obligations]
        codes = [ob.get("procedure_code", "") for ob in linked_obligations]
        
        # Check for IMU
        imu_found = any("imu" in label or "IMU" in code 
                       for label, code in zip(labels, codes))
        assert imu_found, "Should have IMU obligation"
        
        # Check for imposta di registro
        registro_found = any("imposta" in label and ("registro" in label or "catastale" in label or "ipotecaria" in label)
                           or "IMPOSTA_REGISTRO" in code
                           for label, code in zip(labels, codes))
        assert registro_found, "Should have imposta di registro/ipotecaria/catastale obligation"
        print("PASS: DICHIARAZIONE_SUCCESSIONE dependencies verified - IMU and imposta links")


class TestDependencyStructure:
    """Test the structure of dependency responses."""

    def test_dependency_response_structure(self, api_client):
        """Verify dependency endpoint returns correct structure."""
        response = api_client.get(f"{BASE_URL}/api/catalog/COMPANY_CLOSURE/dependencies")
        assert response.status_code == 200
        
        data = response.json()
        
        # Required fields
        assert "has_dependencies" in data
        assert "linked_obligations" in data
        assert "risk_if_omitted" in data
        assert "completion_integrity" in data
        assert "mandatory_links" in data
        assert "high_risks" in data
        assert "practice_id" in data
        assert "practice_name" in data
        
        # Verify linked_obligations structure
        if data["linked_obligations"]:
            ob = data["linked_obligations"][0]
            assert "procedure_code" in ob
            assert "label" in ob
            assert "type" in ob  # mandatory/recommended/conditional
            assert "why_linked" in ob
            assert "when_needed" in ob  # before/during/after
        
        # Verify risk_if_omitted structure
        if data["risk_if_omitted"]:
            risk = data["risk_if_omitted"][0]
            assert "code" in risk
            assert "label" in risk
            assert "severity" in risk  # high/medium/low
            assert "description" in risk
        
        # Verify completion_integrity structure
        if data["completion_integrity"]:
            ci = data["completion_integrity"]
            assert "is_complete_only_if" in ci
            assert "common_missing_steps" in ci
        print("PASS: Dependency response structure verified")

    def test_obligation_types_valid(self, api_client):
        """Verify obligation types are mandatory/recommended/conditional."""
        response = api_client.get(f"{BASE_URL}/api/catalog/COMPANY_FORMATION_SRL/dependencies")
        assert response.status_code == 200
        
        data = response.json()
        valid_types = {"mandatory", "recommended", "conditional"}
        
        for ob in data.get("linked_obligations", []):
            assert ob.get("type") in valid_types, f"Invalid type: {ob.get('type')}"
        print("PASS: All obligation types are valid (mandatory/recommended/conditional)")

    def test_risk_severities_valid(self, api_client):
        """Verify risk severities are high/medium/low."""
        response = api_client.get(f"{BASE_URL}/api/catalog/COMPANY_CLOSURE/dependencies")
        assert response.status_code == 200
        
        data = response.json()
        valid_severities = {"high", "medium", "low"}
        
        for risk in data.get("risk_if_omitted", []):
            assert risk.get("severity") in valid_severities, f"Invalid severity: {risk.get('severity')}"
        print("PASS: All risk severities are valid (high/medium/low)")

    def test_when_needed_values_valid(self, api_client):
        """Verify when_needed values are before/during/after."""
        response = api_client.get(f"{BASE_URL}/api/catalog/VAT_DECLARATION/dependencies")
        assert response.status_code == 200
        
        data = response.json()
        valid_when = {"before", "during", "after"}
        
        for ob in data.get("linked_obligations", []):
            assert ob.get("when_needed") in valid_when, f"Invalid when_needed: {ob.get('when_needed')}"
        print("PASS: All when_needed values are valid (before/during/after)")


class TestPreStartDependencies:
    """Test that pre-start endpoint includes dependencies block."""

    def test_prestart_includes_dependencies(self, api_client):
        """Pre-start endpoint should include dependencies block."""
        response = api_client.get(f"{BASE_URL}/api/catalog/COMPANY_CLOSURE/pre-start?client_type=company")
        assert response.status_code == 200
        
        data = response.json()
        assert "dependencies" in data, "Pre-start should include dependencies block"
        
        deps = data["dependencies"]
        assert "has_dependencies" in deps
        assert deps["has_dependencies"] == True
        assert "linked_obligations" in deps
        assert "risk_if_omitted" in deps
        assert "completion_integrity" in deps
        print("PASS: Pre-start endpoint includes dependencies block")

    def test_prestart_no_dependencies_procedure(self, api_client):
        """Pre-start for procedure without dependencies should return has_dependencies=false."""
        # Use an internal procedure that doesn't have dependencies
        response = api_client.get(f"{BASE_URL}/api/catalog/DOC_MISSING_REQUEST/pre-start?client_type=private")
        assert response.status_code == 200
        
        data = response.json()
        assert "dependencies" in data
        assert data["dependencies"]["has_dependencies"] == False
        print("PASS: Pre-start for internal procedure shows no dependencies")


class TestAllDependencyProcedures:
    """Test all 15+ procedures that should have dependency data."""

    PROCEDURES_WITH_DEPS = [
        "COMPANY_FORMATION_SRL",
        "COMPANY_CLOSURE",
        "SCIOGLIMENTO_SOCIETA",
        "VAT_OPEN_PF",
        "VAT_CLOSURE_PF",
        "VAT_DECLARATION",
        "INCOME_TAX_PF",
        "MOD_770",
        "ASSUNZIONE_DIP",
        "CESSAZIONE_DIP",
        "CONTRATTO_LOCAZIONE",
        "TRASFORMAZIONE_SOCIETARIA",
        "FUSIONE_SOCIETARIA",
        "CESSIONE_QUOTE",
        "INPS_GESTIONE_SEP",
        "DICHIARAZIONE_SUCCESSIONE",
    ]

    @pytest.mark.parametrize("procedure_id", PROCEDURES_WITH_DEPS)
    def test_procedure_has_dependencies(self, api_client, procedure_id):
        """Each procedure in the dependency map should return has_dependencies=true."""
        response = api_client.get(f"{BASE_URL}/api/catalog/{procedure_id}/dependencies")
        assert response.status_code == 200, f"{procedure_id}: Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["has_dependencies"] == True, f"{procedure_id} should have dependencies"
        assert len(data.get("linked_obligations", [])) > 0, f"{procedure_id} should have linked obligations"
        print(f"PASS: {procedure_id} has dependencies")


class TestProceduresWithoutDependencies:
    """Test that procedures not in dependency map return has_dependencies=false."""

    PROCEDURES_WITHOUT_DEPS = [
        "DOC_MISSING_REQUEST",
        "INFO_CONTRIBUTI_MINIMI",
    ]

    @pytest.mark.parametrize("procedure_id", PROCEDURES_WITHOUT_DEPS)
    def test_procedure_no_dependencies(self, api_client, procedure_id):
        """Procedures not in dependency map should return has_dependencies=false."""
        response = api_client.get(f"{BASE_URL}/api/catalog/{procedure_id}/dependencies")
        assert response.status_code == 200, f"{procedure_id}: Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["has_dependencies"] == False, f"{procedure_id} should NOT have dependencies"
        print(f"PASS: {procedure_id} correctly has no dependencies")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
