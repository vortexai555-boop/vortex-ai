"""VORTEX AI - Premium AI SaaS Platform Backend."""
import os
import uuid
import logging
import asyncio
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import jwt
import httpx
import bcrypt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Cookie, Header
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel, Field, EmailStr

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_ALG = os.environ.get("JWT_ALG", "HS256")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@vortex.ai")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "VortexAdmin@2026")

FREE_CREDITS = 100
PRO_CREDITS = 2000
ENTERPRISE_CREDITS = 99999

CHAT_MODEL = ("anthropic", "claude-sonnet-4-5-20250929")
IMAGE_MODEL = "gemini-3.1-flash-image-preview"

app = FastAPI(title="VORTEX AI")
api = APIRouter(prefix="/api")


class SignupIn(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ForgotIn(BaseModel):
    email: EmailStr

class ResetIn(BaseModel):
    token: str
    password: str

class ChatMessageIn(BaseModel):
    conversation_id: Optional[str] = None
    message: str
    tool: str = "chat"

class RenameIn(BaseModel):
    title: str

class ImageGenIn(BaseModel):
    prompt: str
    aspect_ratio: str = "1:1"
    count: int = 1

class LogoGenIn(BaseModel):
    brand: str
    industry: str
    style: str = "modern minimal"
    count: int = 3

class ContentIn(BaseModel):
    template: str
    topic: str
    tone: str = "professional"

class CodeIn(BaseModel):
    language: str
    task: str

class BusinessIn(BaseModel):
    mode: str
    input: str

class WebsiteIn(BaseModel):
    description: str
    site_type: str = "landing"


def now_utc() -> datetime: return datetime.now(timezone.utc)
def new_id(prefix: str = "id") -> str: return f"{prefix}_{uuid.uuid4().hex[:16]}"

def hash_pw(pw: str) -> str: return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
def verify_pw(pw: str, hashed: str) -> bool:
    try: return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception: return False

def make_jwt(user_id: str) -> str:
    payload = {"sub": user_id, "iat": int(now_utc().timestamp()), "exp": int((now_utc() + timedelta(days=7)).timestamp())}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def decode_jwt(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return payload.get("sub")
    except Exception:
        return None

async def get_current_user(request: Request, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)) -> Dict[str, Any]:
    user_id: Optional[str] = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user_id = decode_jwt(token)
        if not user_id:
            sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
            if sess:
                exp = sess["expires_at"]
                if isinstance(exp, str): exp = datetime.fromisoformat(exp)
                if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
                if exp >= now_utc(): user_id = sess["user_id"]
    if not user_id and session_token:
        sess = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if sess:
            exp = sess["expires_at"]
            if isinstance(exp, str): exp = datetime.fromisoformat(exp)
            if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
            if exp >= now_utc(): user_id = sess["user_id"]
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def require_credits(user: Dict[str, Any], cost: int = 1):
    if user.get("credits", 0) < cost:
        raise HTTPException(status_code=402, detail="Out of credits. Upgrade your plan.")

async def deduct_credits(user_id: str, cost: int = 1):
    await db.users.update_one({"user_id": user_id}, {"$inc": {"credits": -cost}})

async def log_activity(user_id: str, kind: str, summary: str):
    await db.activity.insert_one({
        "id": new_id("act"), "user_id": user_id, "kind": kind,
        "summary": summary[:200], "created_at": now_utc().isoformat(),
    })


def detect_image_mime(b64: str) -> str:
    """Detect mime type from base64-encoded image's signature prefix."""
    if not b64:
        return "image/png"
    # JPEG bytes (0xFF 0xD8 0xFF) -> base64 starts with "/9j/"
    if b64.startswith("/9j/"):
        return "image/jpeg"
    # PNG bytes (0x89 0x50 0x4E 0x47) -> base64 starts with "iVBOR"
    if b64.startswith("iVBOR"):
        return "image/png"
    # WebP (RIFF) -> "UklGR"
    if b64.startswith("UklGR"):
        return "image/webp"
    return "image/png"


async def llm_complete(system: str, user_text: str, session_id: Optional[str] = None) -> str:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id or new_id("sess"), system_message=system).with_model(*CHAT_MODEL)
    return await chat.send_message(UserMessage(text=user_text))

async def gen_image(prompt: str) -> Optional[str]:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=new_id("img"), system_message="You are a world class image generator.").with_model("gemini", IMAGE_MODEL).with_params(modalities=["image", "text"])
        _text, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
        if images and len(images) > 0:
            return images[0]["data"]
    except Exception as e:
        logger.exception("image gen failed: %s", e)
    return None


# ---- Auth: JWT ----
@api.post("/auth/signup")
async def signup(data: SignupIn):
    if await db.users.find_one({"email": data.email.lower()}, {"_id": 0}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = new_id("user")
    doc = {
        "user_id": user_id, "email": data.email.lower(), "name": data.name,
        "password_hash": hash_pw(data.password), "picture": None, "plan": "free",
        "credits": FREE_CREDITS, "role": "user", "provider": "jwt",
        "created_at": now_utc().isoformat(),
    }
    await db.users.insert_one(doc)
    token = make_jwt(user_id)
    return {"token": token, "user": {k: v for k, v in doc.items() if k not in ("password_hash", "_id")}}

@api.post("/auth/login")
async def login(data: LoginIn):
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if not user or not user.get("password_hash") or not verify_pw(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = make_jwt(user["user_id"])
    user.pop("password_hash", None)
    return {"token": token, "user": user}

@api.post("/auth/forgot")
async def forgot(data: ForgotIn):
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if user:
        token = new_id("reset")
        await db.password_resets.insert_one({
            "token": token, "user_id": user["user_id"],
            "expires_at": (now_utc() + timedelta(hours=1)).isoformat(),
        })
        return {"ok": True, "reset_token": token}
    return {"ok": True}

@api.post("/auth/reset")
async def reset(data: ResetIn):
    rec = await db.password_resets.find_one({"token": data.token}, {"_id": 0})
    if not rec: raise HTTPException(status_code=400, detail="Invalid token")
    exp = datetime.fromisoformat(rec["expires_at"]).replace(tzinfo=timezone.utc)
    if exp < now_utc(): raise HTTPException(status_code=400, detail="Token expired")
    await db.users.update_one({"user_id": rec["user_id"]}, {"$set": {"password_hash": hash_pw(data.password)}})
    await db.password_resets.delete_one({"token": data.token})
    return {"ok": True}

# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@api.post("/auth/google-session")
async def google_session(response: Response, x_session_id: Optional[str] = Header(None)):
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Missing X-Session-ID")
    async with httpx.AsyncClient(timeout=10) as hc:
        r = await hc.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data", headers={"X-Session-ID": x_session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    data = r.json()
    email = data["email"].lower()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": data["name"], "picture": data.get("picture")}})
    else:
        user_id = new_id("user")
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": data["name"],
            "picture": data.get("picture"), "plan": "free", "credits": FREE_CREDITS,
            "role": "user", "provider": "google", "created_at": now_utc().isoformat(),
        })
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": data["session_token"],
        "expires_at": (now_utc() + timedelta(days=7)).isoformat(),
        "created_at": now_utc().isoformat(),
    })
    response.set_cookie(key="session_token", value=data["session_token"], httponly=True, secure=True, samesite="none", max_age=7*24*60*60, path="/")
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return {"user": user, "session_token": data["session_token"]}

@api.get("/auth/me")
async def me(user=Depends(get_current_user)): return user

@api.post("/auth/logout")
async def logout(response: Response, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    token = None
    if authorization and authorization.startswith("Bearer "): token = authorization.split(" ", 1)[1]
    if session_token: token = session_token
    if token: await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


SYSTEM_PROMPTS = {
    "chat": "You are VORTEX AI Assistant — a brilliant, friendly, helpful AI. Be concise, clear, and impressive.",
    "code": "You are VORTEX Code — an expert software engineer. Return clean, production-ready code in fenced markdown code blocks and brief explanations.",
    "content": "You are VORTEX Content — a world-class copywriter and SEO expert. Produce engaging, well-formatted content.",
    "business": "You are VORTEX Business — a senior business consultant. Produce structured, actionable, market-aware strategies.",
    "website": "You are VORTEX Web — an expert frontend engineer. When asked, output a SINGLE complete HTML file with inline CSS+JS in a ```html code block.",
}

@api.get("/conversations")
async def list_conversations(user=Depends(get_current_user)):
    return await db.conversations.find({"user_id": user["user_id"]}, {"_id": 0, "messages": 0}).sort("updated_at", -1).to_list(200)

@api.get("/conversations/{cid}")
async def get_conversation(cid: str, user=Depends(get_current_user)):
    doc = await db.conversations.find_one({"id": cid, "user_id": user["user_id"]}, {"_id": 0})
    if not doc: raise HTTPException(status_code=404, detail="Not found")
    return doc

@api.delete("/conversations/{cid}")
async def delete_conversation(cid: str, user=Depends(get_current_user)):
    await db.conversations.delete_one({"id": cid, "user_id": user["user_id"]})
    return {"ok": True}

@api.patch("/conversations/{cid}")
async def rename_conversation(cid: str, body: RenameIn, user=Depends(get_current_user)):
    await db.conversations.update_one({"id": cid, "user_id": user["user_id"]}, {"$set": {"title": body.title, "updated_at": now_utc().isoformat()}})
    return {"ok": True}

@api.post("/chat/send")
async def chat_send(body: ChatMessageIn, user=Depends(get_current_user)):
    await require_credits(user, 1)
    tool = body.tool if body.tool in SYSTEM_PROMPTS else "chat"
    system = SYSTEM_PROMPTS[tool]
    cid = body.conversation_id
    if not cid:
        cid = new_id("conv")
        await db.conversations.insert_one({
            "id": cid, "user_id": user["user_id"], "title": body.message[:60], "tool": tool,
            "messages": [], "created_at": now_utc().isoformat(), "updated_at": now_utc().isoformat(),
        })
    user_msg = {"role": "user", "content": body.message, "ts": now_utc().isoformat()}
    await db.conversations.update_one({"id": cid, "user_id": user["user_id"]}, {"$push": {"messages": user_msg}, "$set": {"updated_at": now_utc().isoformat()}})
    conv = await db.conversations.find_one({"id": cid, "user_id": user["user_id"]}, {"_id": 0})
    history = conv.get("messages", [])[-20:]
    transcript = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in history[:-1]])
    prompt = (transcript + "\n\nUSER: " + body.message) if transcript else body.message
    try:
        reply = await llm_complete(system, prompt, session_id=cid)
    except Exception as e:
        logger.exception("LLM error")
        raise HTTPException(status_code=500, detail=f"LLM error: {str(e)[:200]}")
    ai_msg = {"role": "assistant", "content": reply, "ts": now_utc().isoformat()}
    await db.conversations.update_one({"id": cid, "user_id": user["user_id"]}, {"$push": {"messages": ai_msg}, "$set": {"updated_at": now_utc().isoformat()}})
    await deduct_credits(user["user_id"], 1)
    await log_activity(user["user_id"], tool, body.message[:120])
    return {"conversation_id": cid, "reply": reply}


ASPECT_HINTS = {"1:1": "square 1:1", "16:9": "wide cinematic 16:9", "9:16": "vertical portrait 9:16", "4:3": "classic 4:3"}

@api.post("/images/generate")
async def images_generate(body: ImageGenIn, user=Depends(get_current_user)):
    n = max(1, min(body.count, 4))
    await require_credits(user, n * 2)
    hint = ASPECT_HINTS.get(body.aspect_ratio, "square 1:1")
    full_prompt = f"{body.prompt}. Style: ultra detailed, photorealistic, professional, {hint} aspect ratio. High resolution, cinematic lighting."
    results = await asyncio.gather(*[gen_image(full_prompt) for _ in range(n)])
    items = []
    for data in results:
        if not data: continue
        rec = {"id": new_id("img"), "user_id": user["user_id"], "prompt": body.prompt, "aspect_ratio": body.aspect_ratio, "data": data, "mime": detect_image_mime(data), "created_at": now_utc().isoformat()}
        await db.images.insert_one(rec.copy())
        items.append({k: v for k, v in rec.items() if k != "user_id"})
    await deduct_credits(user["user_id"], n * 2)
    await log_activity(user["user_id"], "image", body.prompt[:120])
    if not items: raise HTTPException(status_code=500, detail="Image generation failed")
    return {"images": items}

@api.get("/images")
async def list_images(user=Depends(get_current_user)):
    return await db.images.find({"user_id": user["user_id"]}, {"_id": 0, "user_id": 0}).sort("created_at", -1).limit(60).to_list(60)


@api.post("/logos/generate")
async def logos_generate(body: LogoGenIn, user=Depends(get_current_user)):
    n = max(1, min(body.count, 4))
    await require_credits(user, n * 2)
    prompts = [
        f"Premium logo design for brand '{body.brand}' in the {body.industry} industry. Style: {body.style}. Vector-style, clean, professional, on solid background, centered composition. Variation {i+1}: distinctive concept."
        for i in range(n)
    ]
    results = await asyncio.gather(*[gen_image(p) for p in prompts])
    items = []
    for data in results:
        if not data: continue
        rec = {"id": new_id("logo"), "user_id": user["user_id"], "brand": body.brand, "industry": body.industry, "data": data, "mime": detect_image_mime(data), "created_at": now_utc().isoformat()}
        await db.logos.insert_one(rec.copy())
        items.append({k: v for k, v in rec.items() if k != "user_id"})
    await deduct_credits(user["user_id"], n * 2)
    await log_activity(user["user_id"], "logo", f"{body.brand} ({body.industry})")
    if not items: raise HTTPException(status_code=500, detail="Logo generation failed")
    return {"logos": items}


CONTENT_TEMPLATES = {
    "blog": "Write a complete, SEO-optimized blog post (~700 words) with H2/H3 headings about: {topic}. Tone: {tone}.",
    "product": "Write a compelling product description (~150 words) for: {topic}. Include features, benefits, and a CTA. Tone: {tone}.",
    "ad": "Write 5 high-converting ad copy variants (each <= 80 chars headline + 90 char body) for: {topic}. Tone: {tone}.",
    "social": "Write 7 engaging social media captions (with relevant emojis & hashtags) for: {topic}. Tone: {tone}.",
    "seo": "Generate an SEO content brief for: {topic}. Include: title tag, meta description, 8 H2 outline, 12 LSI keywords. Tone: {tone}.",
}

@api.post("/content/generate")
async def content_generate(body: ContentIn, user=Depends(get_current_user)):
    await require_credits(user, 1)
    tpl = CONTENT_TEMPLATES.get(body.template)
    if not tpl: raise HTTPException(status_code=400, detail="Unknown template")
    out = await llm_complete(SYSTEM_PROMPTS["content"], tpl.format(topic=body.topic, tone=body.tone))
    await deduct_credits(user["user_id"], 1)
    await log_activity(user["user_id"], "content", f"{body.template}: {body.topic[:80]}")
    return {"output": out}


@api.post("/code/generate")
async def code_generate(body: CodeIn, user=Depends(get_current_user)):
    await require_credits(user, 1)
    prompt = f"Write production-quality {body.language} code for the following task:\n\n{body.task}\n\nReturn the code in a fenced ```{body.language.lower()} block, then a short explanation."
    out = await llm_complete(SYSTEM_PROMPTS["code"], prompt)
    await deduct_credits(user["user_id"], 1)
    await log_activity(user["user_id"], "code", f"{body.language}: {body.task[:80]}")
    return {"output": out}


BUSINESS_PROMPTS = {
    "idea": "Generate 5 innovative, market-validated startup ideas around: {input}. For each include: name, 1-line pitch, target market, monetization, why-now.",
    "marketing": "Build a comprehensive 90-day marketing plan for: {input}. Cover positioning, channels, content calendar themes, KPIs.",
    "sales": "Write a high-converting sales script (cold call + follow-up email) for: {input}. Include objection handling.",
    "name": "Generate 12 brandable business names for: {input}. Include rationale, domain feasibility hint, and tagline.",
    "strategy": "Provide a strategic SWOT + recommended 3 moves for: {input}. Be specific and tactical.",
}

@api.post("/business/generate")
async def business_generate(body: BusinessIn, user=Depends(get_current_user)):
    await require_credits(user, 1)
    tpl = BUSINESS_PROMPTS.get(body.mode)
    if not tpl: raise HTTPException(status_code=400, detail="Unknown business mode")
    out = await llm_complete(SYSTEM_PROMPTS["business"], tpl.format(input=body.input))
    await deduct_credits(user["user_id"], 1)
    await log_activity(user["user_id"], "business", f"{body.mode}: {body.input[:80]}")
    return {"output": out}


@api.post("/website/generate")
async def website_generate(body: WebsiteIn, user=Depends(get_current_user)):
    """Kick off website generation as a background task. Returns a job id immediately."""
    await require_credits(user, 3)
    job_id = new_id("job")
    job = {
        "id": job_id,
        "user_id": user["user_id"],
        "status": "pending",
        "description": body.description,
        "site_type": body.site_type,
        "created_at": now_utc().isoformat(),
    }
    await db.website_jobs.insert_one(job.copy())
    # Reserve credits up front so concurrent requests can't double-spend
    await deduct_credits(user["user_id"], 3)
    asyncio.create_task(_run_website_job(job_id, user["user_id"], body.description, body.site_type))
    return {"job_id": job_id, "status": "pending"}


async def _run_website_job(job_id: str, user_id: str, description: str, site_type: str):
    prompt = (
        f"Build a beautiful, modern, fully responsive {site_type} website as a SINGLE self-contained HTML file. "
        f"Requirements: {description}. Use inline CSS and JS. Include header, hero, features, CTA, footer. "
        f"Return ONLY the HTML inside a ```html fenced block."
    )
    try:
        out = await llm_complete(SYSTEM_PROMPTS["website"], prompt)
        html = out
        if "```html" in out:
            html = out.split("```html", 1)[1].split("```", 1)[0].strip()
        elif "```" in out:
            html = out.split("```", 1)[1].split("```", 1)[0].strip()
        site_id = new_id("site")
        rec = {
            "id": site_id, "user_id": user_id, "description": description,
            "site_type": site_type, "html": html, "created_at": now_utc().isoformat(),
        }
        await db.websites.insert_one(rec.copy())
        await db.website_jobs.update_one(
            {"id": job_id},
            {"$set": {"status": "done", "site_id": site_id, "html": html, "completed_at": now_utc().isoformat()}},
        )
        await log_activity(user_id, "website", description[:120])
    except Exception as e:
        logger.exception("website job failed: %s", e)
        await db.website_jobs.update_one(
            {"id": job_id},
            {"$set": {"status": "error", "error": str(e)[:300], "completed_at": now_utc().isoformat()}},
        )
        # Refund credits on failure
        await db.users.update_one({"user_id": user_id}, {"$inc": {"credits": 3}})


@api.get("/website/jobs/{job_id}")
async def website_job_status(job_id: str, user=Depends(get_current_user)):
    job = await db.website_jobs.find_one(
        {"id": job_id, "user_id": user["user_id"]},
        {"_id": 0, "user_id": 0},
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@api.get("/website")
async def list_websites(user=Depends(get_current_user)):
    return await db.websites.find({"user_id": user["user_id"]}, {"_id": 0, "user_id": 0}).sort("created_at", -1).limit(40).to_list(40)


@api.get("/dashboard/summary")
async def dashboard_summary(user=Depends(get_current_user)):
    acts = await db.activity.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(8).to_list(8)
    last = await db.activity.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    counts: Dict[str, int] = {}
    for a in last:
        counts[a["kind"]] = counts.get(a["kind"], 0) + 1
    return {
        "credits": user.get("credits", 0),
        "plan": user.get("plan", "free"),
        "activity": acts,
        "usage_by_tool": [{"name": k, "value": v} for k, v in counts.items()],
        "stats": {
            "images": await db.images.count_documents({"user_id": user["user_id"]}),
            "conversations": await db.conversations.count_documents({"user_id": user["user_id"]}),
            "websites": await db.websites.count_documents({"user_id": user["user_id"]}),
        },
    }


@api.post("/billing/upgrade")
async def billing_upgrade(plan: str, user=Depends(get_current_user)):
    plan = plan.lower()
    credits = {"free": FREE_CREDITS, "pro": PRO_CREDITS, "enterprise": ENTERPRISE_CREDITS}.get(plan)
    if credits is None: raise HTTPException(status_code=400, detail="Invalid plan")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"plan": plan, "credits": credits}})
    return {"ok": True, "plan": plan, "credits": credits}


async def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user

@api.get("/admin/users")
async def admin_users(_=Depends(require_admin)):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).limit(200).to_list(200)

@api.get("/admin/stats")
async def admin_stats(_=Depends(require_admin)):
    total_users = await db.users.count_documents({})
    pro_users = await db.users.count_documents({"plan": "pro"})
    ent_users = await db.users.count_documents({"plan": "enterprise"})
    activity = await db.activity.find({}, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)
    daily: Dict[str, int] = {}
    for a in activity:
        d = a["created_at"][:10]
        daily[d] = daily.get(d, 0) + 1
    chart = [{"day": k, "actions": v} for k, v in sorted(daily.items())][-14:]
    return {
        "total_users": total_users, "pro_users": pro_users, "enterprise_users": ent_users,
        "total_conversations": await db.conversations.count_documents({}),
        "total_images": await db.images.count_documents({}),
        "total_websites": await db.websites.count_documents({}),
        "monthly_revenue_estimate": pro_users * 29 + ent_users * 99,
        "chart": chart,
    }

@api.patch("/admin/users/{uid}/credits")
async def admin_set_credits(uid: str, credits: int, _=Depends(require_admin)):
    await db.users.update_one({"user_id": uid}, {"$set": {"credits": credits}})
    return {"ok": True}


@api.get("/")
async def root(): return {"app": "VORTEX AI", "ok": True}


@app.on_event("startup")
async def seed_admin():
    existing = await db.users.find_one({"email": ADMIN_EMAIL.lower()}, {"_id": 0})
    if not existing:
        await db.users.insert_one({
            "user_id": new_id("user"), "email": ADMIN_EMAIL.lower(), "name": "Vortex Admin",
            "password_hash": hash_pw(ADMIN_PASSWORD), "picture": None, "plan": "enterprise",
            "credits": ENTERPRISE_CREDITS, "role": "admin", "provider": "jwt",
            "created_at": now_utc().isoformat(),
        })
        logger.info("Seeded admin user: %s", ADMIN_EMAIL)
    else:
        # Ensure admin has admin role
        if existing.get("role") != "admin":
            await db.users.update_one({"email": ADMIN_EMAIL.lower()}, {"$set": {"role": "admin"}})

@app.on_event("shutdown")
async def shutdown_db():
    client.close()

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
