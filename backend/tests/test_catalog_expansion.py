"""
Test Catalog Expansion Batch 1: 35 → 78 procedures
Tests:
- Total procedure count (78)
- Category counts (fiscale:24, previdenziale:12, societario:13, documentale:12, informativo:12, lavoro:5)
- New 'lavoro' category exists with 5 procedures
- New procedures exist in each category
- Full enriched structure for each procedure
- No duplicate practice_id values
- url_verified=false for 11 procedures
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Expected category counts
EXPECTED_CATEGORIES = {
    "fiscale": 24,
    "previdenziale": 12,
    "societario": 13,
    "documentale": 12,
    "informativo": 12,
    "lavoro": 5
}

# New procedures added in Batch 1
NEW_FISCALE_PROCEDURES = [
    "MOD_770", "IRAP_DECLARATION", "RAVVEDIMENTO", "IVA_RIMBORSO",
    "CONTRATTO_LOCAZIONE", "CEDOLARE_SECCA", "IMU_TASI",
    "DICHIARAZIONE_SUCCESSIONE", "INTERPELLO_ADE", "RATEIZZAZIONE_CARTELLE"
]

NEW_PREVIDENZIALE_PROCEDURES = [
    "INPS_UNIEMENS", "INPS_F24_CONTRIB", "INPS_MATERNITA",
    "INPS_NASPI", "INAIL_AUTOLIQ", "INAIL_DENUNCIA", "INPS_COLF_BADANTI"
]

NEW_SOCIETARIO_PROCEDURES = [
    "VAT_OPEN_SOCIETA", "DEPOSITO_BILANCIO", "NOMINA_AMMINISTRATORE",
    "MODIFICA_STATUTO", "CESSIONE_QUOTE", "PEC_OBBLIGATORIA",
    "ISCRIZIONE_REA", "TRASFORMAZIONE_SOCIETARIA"
]

NEW_LAVORO_PROCEDURES = [
    "ASSUNZIONE_DIP", "CESSAZIONE_DIP", "TRASFORMAZIONE_CONTRATTO",
    "BUSTA_PAGA", "CONGUAGLIO_FISCALE"
]

# Procedures with url_verified=false
UNVERIFIED_URL_PROCEDURES = [
    "SUAP_SCIA", "IMU_TASI", "INTERPELLO_ADE", "RATEIZZAZIONE_CARTELLE",
    "INAIL_AUTOLIQ", "INAIL_DENUNCIA", "ASSUNZIONE_DIP", "CESSAZIONE_DIP",
    "TRASFORMAZIONE_CONTRATTO", "BUSTA_PAGA", "CONGUAGLIO_FISCALE"
]


@pytest.fixture(scope="module")
def auth_cookies():
    """Login and get auth cookies"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@aic.it", "password": "Admin123!"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.cookies


@pytest.fixture(scope="module")
def catalog(auth_cookies):
    """Fetch the full catalog"""
    response = requests.get(f"{BASE_URL}/api/catalog", cookies=auth_cookies)
    assert response.status_code == 200, f"Failed to fetch catalog: {response.text}"
    return response.json()


@pytest.fixture(scope="module")
def categories(auth_cookies):
    """Fetch catalog categories"""
    response = requests.get(f"{BASE_URL}/api/catalog/categories", cookies=auth_cookies)
    assert response.status_code == 200, f"Failed to fetch categories: {response.text}"
    return response.json()


class TestCatalogTotalCount:
    """Test total procedure count"""
    
    def test_catalog_returns_78_procedures(self, catalog):
        """GET /api/catalog returns 78 procedures total"""
        assert len(catalog) == 78, f"Expected 78 procedures, got {len(catalog)}"


class TestCategoryCountsFromAPI:
    """Test category counts from /api/catalog/categories"""
    
    def test_categories_endpoint_returns_6_categories(self, categories):
        """GET /api/catalog/categories returns 6 categories"""
        assert len(categories) == 6, f"Expected 6 categories, got {len(categories)}"
    
    def test_fiscale_count_24(self, categories):
        """Fiscale category has 24 procedures"""
        fiscale = next((c for c in categories if c["id"] == "fiscale"), None)
        assert fiscale is not None, "Fiscale category not found"
        assert fiscale["procedure_count"] == 24, f"Expected 24 fiscale, got {fiscale['procedure_count']}"
    
    def test_previdenziale_count_12(self, categories):
        """Previdenziale category has 12 procedures"""
        prev = next((c for c in categories if c["id"] == "previdenziale"), None)
        assert prev is not None, "Previdenziale category not found"
        assert prev["procedure_count"] == 12, f"Expected 12 previdenziale, got {prev['procedure_count']}"
    
    def test_societario_count_13(self, categories):
        """Societario category has 13 procedures"""
        soc = next((c for c in categories if c["id"] == "societario"), None)
        assert soc is not None, "Societario category not found"
        assert soc["procedure_count"] == 13, f"Expected 13 societario, got {soc['procedure_count']}"
    
    def test_documentale_count_12(self, categories):
        """Documentale category has 12 procedures"""
        doc = next((c for c in categories if c["id"] == "documentale"), None)
        assert doc is not None, "Documentale category not found"
        assert doc["procedure_count"] == 12, f"Expected 12 documentale, got {doc['procedure_count']}"
    
    def test_informativo_count_12(self, categories):
        """Informativo category has 12 procedures"""
        info = next((c for c in categories if c["id"] == "informativo"), None)
        assert info is not None, "Informativo category not found"
        assert info["procedure_count"] == 12, f"Expected 12 informativo, got {info['procedure_count']}"
    
    def test_lavoro_count_5(self, categories):
        """Lavoro category has 5 procedures"""
        lavoro = next((c for c in categories if c["id"] == "lavoro"), None)
        assert lavoro is not None, "Lavoro category not found"
        assert lavoro["procedure_count"] == 5, f"Expected 5 lavoro, got {lavoro['procedure_count']}"


class TestLavoroCategory:
    """Test new 'lavoro' category"""
    
    def test_lavoro_category_exists(self, categories):
        """New 'lavoro' category exists"""
        lavoro = next((c for c in categories if c["id"] == "lavoro"), None)
        assert lavoro is not None, "Lavoro category not found"
        assert lavoro["label"] == "Lavoro"
        assert lavoro["is_official"] == True
    
    def test_lavoro_has_5_procedures(self, catalog):
        """Lavoro category has exactly 5 procedures"""
        lavoro_procs = [p for p in catalog if p.get("category") == "lavoro"]
        assert len(lavoro_procs) == 5, f"Expected 5 lavoro procedures, got {len(lavoro_procs)}"
    
    def test_lavoro_procedures_exist(self, catalog):
        """All 5 lavoro procedures exist"""
        catalog_ids = {p["practice_id"] for p in catalog}
        for proc_id in NEW_LAVORO_PROCEDURES:
            assert proc_id in catalog_ids, f"Lavoro procedure {proc_id} not found"


class TestNewFiscaleProcedures:
    """Test new fiscale procedures"""
    
    def test_new_fiscale_procedures_exist(self, catalog):
        """All new fiscale procedures exist"""
        catalog_ids = {p["practice_id"] for p in catalog}
        for proc_id in NEW_FISCALE_PROCEDURES:
            assert proc_id in catalog_ids, f"Fiscale procedure {proc_id} not found"


class TestNewPrevidenzialeProcedures:
    """Test new previdenziale procedures"""
    
    def test_new_previdenziale_procedures_exist(self, catalog):
        """All new previdenziale procedures exist"""
        catalog_ids = {p["practice_id"] for p in catalog}
        for proc_id in NEW_PREVIDENZIALE_PROCEDURES:
            assert proc_id in catalog_ids, f"Previdenziale procedure {proc_id} not found"


class TestNewSocietarioProcedures:
    """Test new societario procedures"""
    
    def test_new_societario_procedures_exist(self, catalog):
        """All new societario procedures exist"""
        catalog_ids = {p["practice_id"] for p in catalog}
        for proc_id in NEW_SOCIETARIO_PROCEDURES:
            assert proc_id in catalog_ids, f"Societario procedure {proc_id} not found"


class TestNoDuplicates:
    """Test no duplicate practice_id values"""
    
    def test_no_duplicate_practice_ids(self, catalog):
        """No duplicate practice_id values across the entire catalog"""
        ids = [p["practice_id"] for p in catalog]
        duplicates = [id for id in ids if ids.count(id) > 1]
        assert len(duplicates) == 0, f"Duplicate practice_ids found: {set(duplicates)}"


class TestEnrichedStructure:
    """Test each procedure has full enriched structure"""
    
    def test_official_procedures_have_full_structure(self, catalog):
        """Official procedures have all required fields"""
        official_procs = [p for p in catalog if p.get("procedure_type") == "official_procedure"]
        
        required_fields = [
            "category", "procedure_type", "official_action", "auth_method",
            "proof_expected", "flow_definition", "who_acts", "estimated_duration",
            "document_specs"
        ]
        
        for proc in official_procs:
            for field in required_fields:
                assert field in proc, f"Procedure {proc['practice_id']} missing field: {field}"
            
            # Check flow_definition structure
            flow = proc.get("flow_definition")
            assert flow is not None, f"Procedure {proc['practice_id']} has no flow_definition"
            assert "official_entry_point" in flow, f"Procedure {proc['practice_id']} missing official_entry_point"
            assert "expected_release" in flow, f"Procedure {proc['practice_id']} missing expected_release"
            assert "tracking_mode" in flow, f"Procedure {proc['practice_id']} missing tracking_mode"
    
    def test_internal_procedures_have_required_fields(self, catalog):
        """Internal support procedures have required fields"""
        internal_procs = [p for p in catalog if p.get("procedure_type") == "internal_support"]
        
        required_fields = ["category", "procedure_type", "who_acts", "estimated_duration"]
        
        for proc in internal_procs:
            for field in required_fields:
                assert field in proc, f"Internal procedure {proc['practice_id']} missing field: {field}"


class TestUrlVerifiedFalse:
    """Test procedures with url_verified=false"""
    
    def test_11_procedures_have_url_verified_false(self, catalog):
        """11 procedures have url_verified=false"""
        unverified = []
        for proc in catalog:
            flow = proc.get("flow_definition")
            if flow:
                entry_point = flow.get("official_entry_point", {})
                if entry_point.get("url_verified") == False:
                    unverified.append(proc["practice_id"])
        
        assert len(unverified) == 11, f"Expected 11 unverified URLs, got {len(unverified)}: {unverified}"
    
    def test_correct_procedures_have_url_verified_false(self, catalog):
        """Correct procedures have url_verified=false"""
        unverified = set()
        for proc in catalog:
            flow = proc.get("flow_definition")
            if flow:
                entry_point = flow.get("official_entry_point", {})
                if entry_point.get("url_verified") == False:
                    unverified.add(proc["practice_id"])
        
        expected = set(UNVERIFIED_URL_PROCEDURES)
        assert unverified == expected, f"Mismatch in unverified URLs. Expected: {expected}, Got: {unverified}"


class TestCatalogByCategory:
    """Test catalog counts by category from actual data"""
    
    def test_category_counts_match_expected(self, catalog):
        """Category counts from catalog data match expected"""
        counts = {}
        for proc in catalog:
            cat = proc.get("category", "unknown")
            counts[cat] = counts.get(cat, 0) + 1
        
        for cat, expected_count in EXPECTED_CATEGORIES.items():
            actual = counts.get(cat, 0)
            assert actual == expected_count, f"Category {cat}: expected {expected_count}, got {actual}"
