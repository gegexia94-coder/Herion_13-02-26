"""Admin statistics routes for Herion."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from database import db
from auth import get_current_user

router = APIRouter()


@router.get("/admin/stats")
async def get_admin_statistics(window: str = "30d", user: dict = Depends(get_current_user)):
    """Full statistics dashboard for admin/creator — product intelligence."""
    if user.get("role") not in ["admin", "creator"]:
        raise HTTPException(status_code=403, detail="Accesso riservato all'amministratore")

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)

    window_map = {
        "today": today_start.isoformat(),
        "7d": (now - timedelta(days=7)).isoformat(),
        "30d": (now - timedelta(days=30)).isoformat(),
        "all": "2020-01-01T00:00:00",
    }
    window_start = window_map.get(window, window_map["30d"])

    # ── USER METRICS ──
    total_users = await db.users.count_documents({"role": {"$ne": "admin"}})
    new_today = await db.users.count_documents({"created_at": {"$gte": today_start.isoformat()}, "role": {"$ne": "admin"}})
    new_this_week = await db.users.count_documents({"created_at": {"$gte": week_start.isoformat()}, "role": {"$ne": "admin"}})
    new_this_month = await db.users.count_documents({"created_at": {"$gte": month_start.isoformat()}, "role": {"$ne": "admin"}})

    active_today_ids = await db.activity_logs.distinct("user_id", {"timestamp": {"$gte": today_start.isoformat()}})
    active_week_ids = await db.activity_logs.distinct("user_id", {"timestamp": {"$gte": week_start.isoformat()}})
    active_month_ids = await db.activity_logs.distinct("user_id", {"timestamp": {"$gte": month_start.isoformat()}})
    active_today = len(active_today_ids)
    active_this_week = len(active_week_ids)
    active_this_month = len(active_month_ids)

    all_active_30d = await db.activity_logs.distinct("user_id", {"timestamp": {"$gte": (now - timedelta(days=30)).isoformat()}})
    all_user_ids = []
    async for u in db.users.find({"role": {"$ne": "admin"}}, {"_id": 1}):
        all_user_ids.append(str(u["_id"]))
    inactive_users = len([uid for uid in all_user_ids if uid not in all_active_30d])

    users_with_practices = await db.practices.distinct("user_id")
    users_with_completed = await db.practices.distinct("user_id", {"status": {"$in": ["completed", "accepted_by_entity"]}})
    never_started = len([uid for uid in all_user_ids if uid not in users_with_practices])
    started_not_completed = len([uid for uid in users_with_practices if uid not in users_with_completed and uid not in all_active_30d])
    used_then_stopped = len([uid for uid in users_with_completed if uid not in all_active_30d])

    # ── PRACTICE METRICS ──
    total_practices = await db.practices.count_documents({})
    practices_created_window = await db.practices.count_documents({"created_at": {"$gte": window_start}})
    practices_active = await db.practices.count_documents({"status": {"$nin": ["completed", "accepted_by_entity", "rejected_by_entity"]}})
    practices_completed = await db.practices.count_documents({"status": {"$in": ["completed", "accepted_by_entity"]}})
    practices_blocked = await db.practices.count_documents({"status": {"$in": ["blocked", "escalated", "internal_validation_failed", "rejected_by_entity"]}})
    practices_waiting = await db.practices.count_documents({"status": {"$in": ["waiting_external_response", "submitted_manually", "submitted_via_channel"]}})
    practices_draft = await db.practices.count_documents({"status": "draft"})

    total_non_draft = total_practices - practices_draft
    completion_rate = round((practices_completed / total_non_draft * 100) if total_non_draft > 0 else 0, 1)

    avg_completion_days = None
    completed_docs = await db.practices.find(
        {"status": {"$in": ["completed", "accepted_by_entity"]}, "created_at": {"$exists": True}, "updated_at": {"$exists": True}},
        {"_id": 0, "created_at": 1, "updated_at": 1}
    ).to_list(500)
    if completed_docs:
        durations = []
        for doc in completed_docs:
            try:
                start = datetime.fromisoformat(doc["created_at"].replace("Z", "+00:00"))
                end = datetime.fromisoformat(doc["updated_at"].replace("Z", "+00:00"))
                durations.append((end - start).days)
            except (ValueError, TypeError):
                pass
        if durations:
            avg_completion_days = round(sum(durations) / len(durations), 1)

    # ── USAGE TRENDS ──
    daily_trend = []
    for i in range(13, -1, -1):
        day = (today_start - timedelta(days=i))
        day_end = day + timedelta(days=1)
        count = await db.activity_logs.count_documents({"timestamp": {"$gte": day.isoformat(), "$lt": day_end.isoformat()}})
        daily_trend.append({"date": day.strftime("%d/%m"), "actions": count})

    weekly_trend = []
    for i in range(7, -1, -1):
        wk_start = week_start - timedelta(weeks=i)
        wk_end = wk_start + timedelta(weeks=1)
        count = await db.activity_logs.count_documents({"timestamp": {"$gte": wk_start.isoformat(), "$lt": wk_end.isoformat()}})
        weekly_trend.append({"week": wk_start.strftime("W%V"), "actions": count})

    # ── OPERATIONAL INSIGHTS ──
    category_pipeline = [
        {"$match": {"practice_type": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": "$practice_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    top_procedures = []
    async for doc in db.practices.aggregate(category_pipeline):
        catalog_entry = await db.practice_catalog.find_one({"practice_id": doc["_id"]}, {"_id": 0, "name": 1, "category_label": 1})
        top_procedures.append({
            "practice_type": doc["_id"],
            "name": catalog_entry.get("name", doc["_id"]) if catalog_entry else doc["_id"],
            "category": catalog_entry.get("category_label", "") if catalog_entry else "",
            "count": doc["count"],
        })

    blocked_pipeline = [
        {"$match": {"status": {"$in": ["blocked", "escalated", "internal_validation_failed"]}}},
        {"$group": {"_id": "$practice_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]
    most_blocked = []
    async for doc in db.practices.aggregate(blocked_pipeline):
        catalog_entry = await db.practice_catalog.find_one({"practice_id": doc["_id"]}, {"_id": 0, "name": 1})
        most_blocked.append({
            "practice_type": doc["_id"],
            "name": catalog_entry.get("name", doc["_id"]) if catalog_entry else doc["_id"],
            "count": doc["count"],
        })

    status_pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    status_dist = {}
    async for doc in db.practices.aggregate(status_pipeline):
        status_dist[doc["_id"]] = doc["count"]

    return {
        "window": window,
        "generated_at": now.isoformat(),
        "users": {
            "total": total_users,
            "new_today": new_today,
            "new_this_week": new_this_week,
            "new_this_month": new_this_month,
            "active_today": active_today,
            "active_this_week": active_this_week,
            "active_this_month": active_this_month,
            "inactive_30d": inactive_users,
            "segments": {"never_started": never_started, "started_then_dropped": started_not_completed, "used_then_stopped": used_then_stopped},
        },
        "practices": {
            "total": total_practices,
            "created_in_window": practices_created_window,
            "active": practices_active,
            "completed": practices_completed,
            "blocked": practices_blocked,
            "waiting_official": practices_waiting,
            "draft": practices_draft,
            "completion_rate": completion_rate,
            "avg_completion_days": avg_completion_days,
            "status_distribution": status_dist,
        },
        "trends": {"daily": daily_trend, "weekly": weekly_trend},
        "operational": {"top_procedures": top_procedures, "most_blocked": most_blocked},
    }
