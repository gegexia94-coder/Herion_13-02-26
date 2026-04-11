import copy
import re
from dataclasses import dataclass
from typing import Any

from bson import ObjectId


def _get_value(document: dict, field: str) -> Any:
    value = document
    for part in field.split("."):
        if isinstance(value, dict) and part in value:
            value = value[part]
        else:
            return None
    return value


def _set_value(document: dict, field: str, value: Any) -> None:
    parts = field.split(".")
    target = document
    for part in parts[:-1]:
        next_value = target.get(part)
        if not isinstance(next_value, dict):
            next_value = {}
            target[part] = next_value
        target = next_value
    target[parts[-1]] = value


def _values_equal(left: Any, right: Any) -> bool:
    if isinstance(left, ObjectId):
        left = str(left)
    if isinstance(right, ObjectId):
        right = str(right)
    return left == right


def _matches_operator(actual: Any, operator: str, expected: Any) -> bool:
    if operator == "$in":
        if isinstance(actual, list):
            return any(_values_equal(item, candidate) for item in actual for candidate in expected)
        return any(_values_equal(actual, candidate) for candidate in expected)
    if operator == "$nin":
        if isinstance(actual, list):
            return all(not _values_equal(item, candidate) for item in actual for candidate in expected)
        return all(not _values_equal(actual, candidate) for candidate in expected)
    if operator == "$ne":
        if isinstance(actual, list):
            return all(not _values_equal(item, expected) for item in actual)
        return not _values_equal(actual, expected)
    if operator == "$gt":
        return actual is not None and actual > expected
    if operator == "$gte":
        return actual is not None and actual >= expected
    if operator == "$lt":
        return actual is not None and actual < expected
    if operator == "$lte":
        return actual is not None and actual <= expected
    if operator == "$regex":
        if actual is None:
            return False
        return re.search(expected, str(actual)) is not None
    return False


def matches_query(document: dict, query: dict | None) -> bool:
    if not query:
        return True

    for key, expected in query.items():
        if key == "$or":
            if not any(matches_query(document, clause) for clause in expected):
                return False
            continue
        if key == "$and":
            if not all(matches_query(document, clause) for clause in expected):
                return False
            continue

        actual = _get_value(document, key)

        if isinstance(expected, dict):
            if not all(_matches_operator(actual, operator, operator_value) for operator, operator_value in expected.items()):
                return False
            continue

        if isinstance(actual, list):
            if not any(_values_equal(item, expected) for item in actual):
                return False
            continue

        if not _values_equal(actual, expected):
            return False

    return True


def apply_projection(document: dict, projection: dict | None) -> dict:
    if not projection:
        return copy.deepcopy(document)

    include_fields = [field for field, flag in projection.items() if field != "_id" and flag]
    if include_fields:
        projected = {}
        for field in include_fields:
            value = _get_value(document, field)
            if value is not None:
                _set_value(projected, field, copy.deepcopy(value))
        if projection.get("_id", 1) and "_id" in document:
            projected["_id"] = copy.deepcopy(document["_id"])
        return projected

    projected = copy.deepcopy(document)
    for field, flag in projection.items():
        if flag:
            continue
        if field in projected:
            projected.pop(field, None)
    return projected


def _sort_key(value: Any) -> tuple[int, Any]:
    if value is None:
        return (1, "")
    if isinstance(value, ObjectId):
        return (0, str(value))
    return (0, value)


@dataclass
class FakeInsertOneResult:
    inserted_id: ObjectId


@dataclass
class FakeInsertManyResult:
    inserted_ids: list[ObjectId]


@dataclass
class FakeUpdateResult:
    matched_count: int
    modified_count: int


@dataclass
class FakeDeleteResult:
    deleted_count: int


class FakeCursor:
    def __init__(self, documents: list[dict], projection: dict | None = None):
        self._documents = [copy.deepcopy(doc) for doc in documents]
        self._projection = projection
        self._sorts: list[tuple[str, int]] = []
        self._limit: int | None = None

    def sort(self, field: str, direction: int):
        self._sorts.append((field, direction))
        return self

    def limit(self, value: int):
        self._limit = value
        return self

    async def to_list(self, length: int):
        documents = self._documents[:]
        for field, direction in reversed(self._sorts):
            documents.sort(key=lambda item: _sort_key(_get_value(item, field)), reverse=direction < 0)

        if self._limit is not None:
            documents = documents[: self._limit]

        documents = documents[:length]
        return [apply_projection(doc, self._projection) for doc in documents]


class FakeCollection:
    def __init__(self):
        self._documents: list[dict] = []

    async def create_index(self, *args, **kwargs):
        return None

    async def insert_one(self, document: dict):
        stored = copy.deepcopy(document)
        stored.setdefault("_id", ObjectId())
        self._documents.append(stored)
        return FakeInsertOneResult(inserted_id=stored["_id"])

    async def insert_many(self, documents: list[dict]):
        inserted_ids = []
        for document in documents:
            stored = copy.deepcopy(document)
            stored.setdefault("_id", ObjectId())
            inserted_ids.append(stored["_id"])
            self._documents.append(stored)
        return FakeInsertManyResult(inserted_ids=inserted_ids)

    async def find_one(self, query: dict | None = None, projection: dict | None = None):
        for document in self._documents:
            if matches_query(document, query):
                return apply_projection(document, projection)
        return None

    def find(self, query: dict | None = None, projection: dict | None = None):
        matches = [document for document in self._documents if matches_query(document, query)]
        return FakeCursor(matches, projection=projection)

    async def update_one(self, query: dict, update: dict):
        for document in self._documents:
            if matches_query(document, query):
                _apply_update(document, update)
                return FakeUpdateResult(matched_count=1, modified_count=1)
        return FakeUpdateResult(matched_count=0, modified_count=0)

    async def update_many(self, query: dict, update: dict):
        matched = 0
        for document in self._documents:
            if matches_query(document, query):
                matched += 1
                _apply_update(document, update)
        return FakeUpdateResult(matched_count=matched, modified_count=matched)

    async def delete_one(self, query: dict):
        for index, document in enumerate(self._documents):
            if matches_query(document, query):
                self._documents.pop(index)
                return FakeDeleteResult(deleted_count=1)
        return FakeDeleteResult(deleted_count=0)

    async def count_documents(self, query: dict | None = None):
        return sum(1 for document in self._documents if matches_query(document, query))


def _apply_update(document: dict, update: dict) -> None:
    for operator, changes in update.items():
        if operator == "$set":
            for field, value in changes.items():
                _set_value(document, field, copy.deepcopy(value))
        elif operator == "$push":
            for field, value in changes.items():
                items = _get_value(document, field)
                if not isinstance(items, list):
                    items = []
                    _set_value(document, field, items)
                items.append(copy.deepcopy(value))
        else:
            raise NotImplementedError(f"Unsupported update operator in local dev DB: {operator}")


class FakeDatabase:
    def __init__(self):
        self._collections: dict[str, FakeCollection] = {}

    def __getattr__(self, name: str):
        if name.startswith("_"):
            raise AttributeError(name)
        if name not in self._collections:
            self._collections[name] = FakeCollection()
        return self._collections[name]


class FakeMongoClient:
    def close(self):
        return None
