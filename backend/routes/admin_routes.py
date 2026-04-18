"""Admin statistics routes for Herion."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from database import db
from auth import get_current_user

router = APIRouter()


@router.get("/admin/stats")
async def get_admin_statistics(window: str = "30d", user: dict = Depends(get_current_user)):
    """Full statistics dashboard for admin/creator — product intelligence."""
    if user.get("role") != "creator" and not user.get("is_creator"):
        raise HTTPException(status_code=403, detail="Accesso riservato al creatore")

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



@router.get("/creator/father")
async def get_father_intelligence(user: dict = Depends(get_current_user)):
    """Father Agent intelligence — creator-only operational analysis."""
    if user.get("role") != "creator" and not user.get("is_creator"):
        raise HTTPException(status_code=403, detail="Accesso riservato al creatore")

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = (now - timedelta(days=7)).isoformat()

    # ── CORE COUNTS ──
    total_users = await db.users.count_documents({"role": {"$ne": "admin"}})
    total_practices = await db.practices.count_documents({})
    practices_active = await db.practices.count_documents({"status": {"$nin": ["completed", "accepted_by_entity", "rejected_by_entity", "draft"]}})
    practices_blocked = await db.practices.count_documents({"status": {"$in": ["blocked", "escalated", "internal_validation_failed"]}})
    practices_waiting_docs = await db.practices.count_documents({"status": "waiting_user_documents"})
    practices_draft = await db.practices.count_documents({"status": "draft"})
    practices_completed = await db.practices.count_documents({"status": {"$in": ["completed", "accepted_by_entity"]}})
    practices_waiting_ext = await db.practices.count_documents({"status": {"$in": ["waiting_external_response", "submitted_manually", "submitted_via_channel"]}})

    # ── STALLED PRACTICES (no activity in 7+ days) ──
    stalled = []
    async for p in db.practices.find(
        {"status": {"$nin": ["completed", "accepted_by_entity", "rejected_by_entity", "draft"]}, "updated_at": {"$lt": week_ago}},
        {"_id": 0, "id": 1, "client_name": 1, "practice_type_label": 1, "status": 1, "updated_at": 1}
    ).sort("updated_at", 1).limit(10):
        days_idle = (now - datetime.fromisoformat(p.get("updated_at", now.isoformat()).replace("Z", "+00:00"))).days
        stalled.append({**p, "days_idle": days_idle})

    # ── ABANDONED FLOWS (draft for 3+ days, never started) ──
    three_days_ago = (now - timedelta(days=3)).isoformat()
    abandoned_drafts = await db.practices.count_documents({"status": "draft", "created_at": {"$lt": three_days_ago}})

    # ── USERS WHO REGISTERED BUT NEVER CREATED A PRACTICE ──
    users_with_practices = set(await db.practices.distinct("user_id"))
    all_user_ids = []
    async for u in db.users.find({"role": {"$ne": "admin"}}, {"_id": 1, "created_at": 1}):
        all_user_ids.append({"id": str(u["_id"]), "created_at": u.get("created_at", "")})
    never_started_count = len([u for u in all_user_ids if u["id"] not in users_with_practices])

    # ── TOP BLOCKED PROCEDURE TYPES ──
    blocked_pipeline = [
        {"$match": {"status": {"$in": ["blocked", "escalated", "internal_validation_failed", "waiting_user_documents"]}}},
        {"$group": {"_id": "$practice_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]
    friction_points = []
    async for doc in db.practices.aggregate(blocked_pipeline):
        cat = await db.practice_catalog.find_one({"practice_id": doc["_id"]}, {"_id": 0, "name": 1})
        friction_points.append({
            "procedure": cat.get("name", doc["_id"]) if cat else doc["_id"],
            "practice_type": doc["_id"],
            "stuck_count": doc["count"],
        })

    # ── MOST USED PROCEDURES ──
    usage_pipeline = [
        {"$match": {"practice_type": {"$exists": True}}},
        {"$group": {"_id": "$practice_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]
    top_used = []
    async for doc in db.practices.aggregate(usage_pipeline):
        cat = await db.practice_catalog.find_one({"practice_id": doc["_id"]}, {"_id": 0, "name": 1})
        top_used.append({
            "procedure": cat.get("name", doc["_id"]) if cat else doc["_id"],
            "count": doc["count"],
        })

    # ── CONSULENZA SESSIONS (last 7d) ──
    consulenza_count = await db.consulenza_sessions.count_documents({"created_at": {"$gte": week_ago}})

    # ── ACTIVITY TREND (last 7 days) ──
    daily_actions = []
    for i in range(6, -1, -1):
        day = today_start - timedelta(days=i)
        day_end = day + timedelta(days=1)
        count = await db.activity_logs.count_documents({"timestamp": {"$gte": day.isoformat(), "$lt": day_end.isoformat()}})
        daily_actions.append({"date": day.strftime("%a %d"), "count": count})

    # ── BUILD FATHER INSIGHTS (prioritized) ──
    insights = []

    # Critical: blocked practices
    if practices_blocked > 0:
        insights.append({
            "priority": "critical",
            "signal": f"{practices_blocked} {'pratica bloccata' if practices_blocked == 1 else 'pratiche bloccate'}",
            "explanation": "Queste pratiche hanno raggiunto uno stato di errore o escalation e richiedono intervento diretto.",
            "action": "Controlla le pratiche bloccate e identifica la causa del blocco.",
            "link": "/practices?filter=blocked",
        })

    # High: practices waiting for user documents
    if practices_waiting_docs > 0:
        insights.append({
            "priority": "high",
            "signal": f"{practices_waiting_docs} {'pratica in attesa' if practices_waiting_docs == 1 else 'pratiche in attesa'} di documenti",
            "explanation": "Gli utenti non hanno ancora caricato i documenti richiesti. Questo e il collo di bottiglia piu comune.",
            "action": "Valuta se le richieste documentali sono chiare o se serve semplificare il processo.",
            "link": "/practices?filter=waiting_docs",
        })

    # High: stalled practices
    if len(stalled) > 0:
        insights.append({
            "priority": "high",
            "signal": f"{len(stalled)} {'pratica ferma' if len(stalled) == 1 else 'pratiche ferme'} da piu di 7 giorni",
            "explanation": f"La pratica piu vecchia e ferma da {stalled[0]['days_idle']} giorni. Possibile confusione dell'utente o blocco tecnico.",
            "action": "Verifica se gli utenti hanno bisogno di supporto o se il flusso ha un problema.",
            "link": "/practices",
        })

    # Medium: abandoned drafts
    if abandoned_drafts > 0:
        insights.append({
            "priority": "medium",
            "signal": f"{abandoned_drafts} {'bozza abbandonata' if abandoned_drafts == 1 else 'bozze abbandonate'} da 3+ giorni",
            "explanation": "Utenti che hanno iniziato a creare una pratica ma non l'hanno mai avviata. Possibile frizione nella fase di preparazione.",
            "action": "Controlla se il flusso di creazione pratica e troppo complesso o mancano indicazioni.",
        })

    # Medium: users who never started
    if never_started_count > 0 and total_users > 0:
        pct = round(never_started_count / len(all_user_ids) * 100)
        insights.append({
            "priority": "medium",
            "signal": f"{never_started_count} utenti registrati non hanno mai creato una pratica ({pct}%)",
            "explanation": "Questi utenti si sono registrati ma non hanno trovato il percorso giusto o hanno perso interesse.",
            "action": "Valuta se la dashboard iniziale guida abbastanza verso la prima azione.",
        })

    # Info: consulenza usage
    if consulenza_count > 0:
        insights.append({
            "priority": "info",
            "signal": f"{consulenza_count} consulenze rapide negli ultimi 7 giorni",
            "explanation": "La Consulenza Rapida sta venendo utilizzata. Questo indica che gli utenti cercano orientamento.",
            "action": "Verifica che le consulenze portino effettivamente a pratiche avviate.",
        })

    # Info: completion rate
    total_non_draft = total_practices - practices_draft
    if total_non_draft > 0:
        completion_rate = round(practices_completed / total_non_draft * 100, 1)
        insights.append({
            "priority": "info",
            "signal": f"Tasso di completamento: {completion_rate}%",
            "explanation": f"{practices_completed} pratiche completate su {total_non_draft} avviate.",
            "action": "Obiettivo: portare il tasso sopra il 60% migliorando i punti di frizione.",
        })

    return {
        "generated_at": now.isoformat(),
        "health": {
            "total_users": total_users,
            "total_practices": total_practices,
            "active": practices_active,
            "blocked": practices_blocked,
            "waiting_docs": practices_waiting_docs,
            "waiting_external": practices_waiting_ext,
            "completed": practices_completed,
            "draft": practices_draft,
            "stalled_7d": len(stalled),
            "abandoned_drafts": abandoned_drafts,
            "never_started_users": never_started_count,
            "consulenza_7d": consulenza_count,
        },
        "insights": insights,
        "friction_points": friction_points,
        "top_used": top_used,
        "stalled_practices": stalled[:5],
        "daily_activity": daily_actions,
    }
