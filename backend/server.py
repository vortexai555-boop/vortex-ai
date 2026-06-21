"""GREXO AI - Premium AI SaaS Platform Backend."""

import os
import uuid
import logging
import asyncio
from pathlib import Path
from duckduckgo_search import DDGS
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
from google import genai
from google.genai import types
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
ai_client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY", "")
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_ALG = os.environ.get("JWT_ALG", "HS256")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@grexo.ai")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "GrexoAdmin@2026")

FREE_CREDITS = 100
PRO_CREDITS = 2000
ENTERPRISE_CREDITS = 99999

CHAT_MODEL = ("anthropic", "claude-sonnet-4-5-20250929")
IMAGE_MODEL = "imagen-4.0-fast-generate-001"

app = FastAPI(title="GREXO AI")
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
    web_search: bool = False
    files: Optional[List[Dict[str, str]]] = None # list of {"mime": "...", "data": "base64"}

class CalcIn(BaseModel):
    expression: str

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

class ProductivityIn(BaseModel):
    tool_id: str
    prompt: Optional[str] = ""
    input_text: Optional[str] = ""
    file_data: Optional[str] = None
    file_mime: Optional[str] = None

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
    files: Optional[List[Dict[str, str]]] = None


def now_utc() -> datetime: return datetime.now(timezone.utc)
def new_id(prefix: str = "id") -> str: return f"{prefix}_{uuid.uuid4().hex[:16]}"

def hash_pw(pw: str) -> str: return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
def verify_pw(pw: str, hashed: str) -> bool:
    try: return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception: return False

def make_jwt(user_id: str) -> str:
    payload = {"sub": user_id, "iat": int(now_utc().timestamp()), "exp": int((now_utc() + timedelta(days=36500)).timestamp())}
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

    should_update = True
    last_active = user.get("last_active_at")
    if last_active:
        last_active_dt = datetime.fromisoformat(last_active)
        if last_active_dt.tzinfo is None:
            last_active_dt = last_active_dt.replace(tzinfo=timezone.utc)
        if now_utc() - last_active_dt > timedelta(days=15):
            raise HTTPException(status_code=401, detail="Session expired due to inactivity")
        if now_utc() - last_active_dt < timedelta(hours=1):
            should_update = False

    if should_update:
        now_str = now_utc().isoformat()
        await db.users.update_one({"user_id": user_id}, {"$set": {"last_active_at": now_str}})
        user["last_active_at"] = now_str

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
    messages = [
        {"role": "system", "content": f"{system}\nCurrent year is 2026. Current date is June 2026."},
        {"role": "user", "content": user_text}
    ]
    return await generate_text_free(messages)


async def generate_text_free(messages: list) -> str:
    try:
        import httpx
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post("https://text.pollinations.ai/openai", json={
                "messages": messages,
                "model": "openai"
            })
            if resp.status_code == 200:
                data = resp.json()
                if "choices" in data and len(data["choices"]) > 0:
                    msg = data["choices"][0].get("message", {})
                    return msg.get("content", str(data))
            return resp.text
    except Exception as e:
        logger.exception("Free text generation failed: %s", e)
        raise e

from duckduckgo_search import DDGS

async def web_search(query: str):
    try:
        def _search():
            from duckduckgo_search import DDGS
            with DDGS() as ddgs:
                return list(ddgs.text(query, max_results=5))
        return await asyncio.to_thread(_search)
    except Exception as e:
        logger.exception("search failed: %s", e)
        return []


async def gen_image(prompt: str, aspect_ratio: str = "1:1", files_data: list = None):
    try:
        final_prompt = prompt
        
        if files_data:
            # We don't have free multimodal reading available.
            # So we will just use the text generator to enhance the prompt
            try:
                enhance_prompt = f"The user wants to generate an image based on: '{prompt}'. They attached files but we cannot read them in the free tier. Please write a highly detailed visual description to fulfill their request textually. Respond ONLY with the final descriptive image generation prompt."
                final_prompt = await generate_text_free([{"role": "user", "content": enhance_prompt}])
            except Exception as e:
                logger.warning(f"Failed to enhance prompt: {e}")

        import urllib.parse
        import random
        import httpx
        import base64
        
        width, height = 1024, 1024
        if aspect_ratio == "16:9":
            width, height = 1024, 576
        elif aspect_ratio == "9:16":
            width, height = 576, 1024
        elif aspect_ratio == "4:3":
            width, height = 1024, 768
        elif aspect_ratio == "3:4":
            width, height = 768, 1024
        elif aspect_ratio == "2:3":
            width, height = 682, 1024

        prompt_val = final_prompt[:1500]
        if not prompt_val.strip():
            prompt_val = "A cool aesthetic abstract image"
            
        encoded_prompt = urllib.parse.quote(prompt_val)
        seed = random.randint(1, 100000000)
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&seed={seed}&nologo=true"
        
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=60.0)
            if resp.status_code == 200:
                return base64.b64encode(resp.content).decode("utf-8")
                
        return None

    except Exception as e:
        logger.exception("Image generation failed: %s", e)
        error_str = str(e)
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            raise Exception("API rate limit exceeded. Please wait a minute and try again.")
        raise e

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
        "expires_at": (now_utc() + timedelta(days=36500)).isoformat(),
        "created_at": now_utc().isoformat(),
    })
    response.set_cookie(key="session_token", value=data["session_token"], httponly=True, secure=True, samesite="none", max_age=36500*24*60*60, path="/")
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
    "chat": "You are GREXO AI Assistant — a brilliant, friendly, helpful AI. Be concise, clear, and impressive.",
    "code": "You are GREXO Code — an expert software engineer. Return clean, production-ready code in fenced markdown code blocks and brief explanations.",
    "content": "You are GREXO Content — a world-class copywriter and SEO expert. Produce engaging, well-formatted content.",
    "business": "You are GREXO Business — a senior business consultant. Produce structured, actionable, market-aware strategies.",
    "website": "You are GREXO Web — an expert frontend engineer. When asked, output a SINGLE complete HTML file with inline CSS+JS in a ```html code block.",
    "calculator": "Calculator"
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

import re

@api.post("/chat/send")
async def chat_send(
    body: ChatMessageIn,
    user=Depends(get_current_user)
):
    await require_credits(user, 1)

    # Calculator mode
    if body.tool == "calculator":
        try:
            expression = body.message.strip()

            if not re.match(r"^[0-9+\-*/().\s]+$", expression):
                raise ValueError("Invalid expression")

            result = eval(
                expression,
                {"__builtins__": {}},
                {}
            )

            return {
                "conversation_id": body.conversation_id,
                "reply": str(result)
            }

        except Exception as e:
            return {
                "conversation_id": body.conversation_id,
                "reply": f"Calculator Error: {str(e)}"
            }

    tool = body.tool if body.tool in SYSTEM_PROMPTS else "chat"
    system = SYSTEM_PROMPTS[tool]

    cid = body.conversation_id

    if not cid:
        cid = new_id("conv")

        await db.conversations.insert_one({
            "id": cid,
            "user_id": user["user_id"],
            "title": body.message[:60],
            "tool": tool,
            "messages": [],
            "created_at": now_utc().isoformat(),
            "updated_at": now_utc().isoformat(),
        })

    user_msg = {
        "role": "user",
        "content": body.message,
        "ts": now_utc().isoformat()
    }

    await db.conversations.update_one(
        {"id": cid, "user_id": user["user_id"]},
        {
            "$push": {"messages": user_msg},
            "$set": {"updated_at": now_utc().isoformat()}
        }
    )

    conv = await db.conversations.find_one(
        {"id": cid, "user_id": user["user_id"]},
        {"_id": 0}
    )

    history = conv.get("messages", [])[-20:]

    transcript = "\n".join(
        [f"{m['role'].upper()}: {m.get('content', '')}" for m in history[:-1]]
    )

    current_date_info = "\n\nIMPORTANT: The current year and month is June 2026. Therefore, events from 2024, 2025, and 2026 are NOT in the future. You MUST use search tools to answer questions realistically about current events, net worths, and timelines up to June 2026 without claiming you don't have future data."
    
    try:
        messages_openai = [
            {"role": "system", "content": system + current_date_info}
        ]
        for m in history[:-1]:
            messages_openai.append({
                "role": "user" if m["role"] == "user" else "assistant",
                "content": m.get("content", "")
            })
            
        user_content_parts = []
        
        main_message = body.message
        if body.web_search:
            try:
                results = await web_search(body.message)
                if results:
                    search_context = "Recent relevant web search results:\n" + "\n".join([f"- {r.get('title')}: {r.get('body')}" for r in results])
                    main_message = f"{body.message}\n\n{search_context}\n\nPlease use the above search results to inform your answer if they are relevant."
            except Exception as e:
                logger.error("Web search failed: %s", e)
                
        user_content_parts.append({"type": "text", "text": main_message})

        if body.files:
            for file in body.files:
                b64_data = file["data"]
                if "," in b64_data:
                    full_data_uri = b64_data
                else:
                    mime = file.get("mime", "application/octet-stream")
                    full_data_uri = f"data:{mime};base64,{b64_data}"
                user_content_parts.append({
                    "type": "image_url",
                    "image_url": {"url": full_data_uri}
                })
        
        messages_openai.append({"role": "user", "content": user_content_parts})

        reply = await generate_text_free(messages_openai)

        if not reply:
            reply = "No response from model."

    except Exception as e:
        logger.exception("Text generation error: %s", e)
        error_str = str(e)
        reply = f"Error: {error_str}"

    assistant_msg = {
        "role": "assistant",
        "content": reply,
        "ts": now_utc().isoformat()
    }

    await db.conversations.update_one(
        {"id": cid, "user_id": user["user_id"]},
        {
            "$push": {"messages": assistant_msg},
            "$set": {
                "updated_at": now_utc().isoformat()
            }
        }
    )

    return {
        "conversation_id": cid,
        "reply": reply
    }


ASPECT_HINTS = {"1:1": "square 1:1", "16:9": "wide cinematic 16:9", "9:16": "vertical portrait 9:16", "4:3": "classic 4:3"}

@api.post("/productivity/generate")
async def productivity_generate(body: ProductivityIn, user=Depends(get_current_user)):
    await require_credits(user, 1)

    system_instruction = "You are a helpful AI productivity assistant."
    if body.tool_id == "document_writer":
        system_instruction = "You are an expert AI document writer. Write comprehensive, well-structured, and clear documents based on the user's request."
    elif body.tool_id == "resume_builder":
        system_instruction = "You are an expert resume builder and career coach. Help the user write or improve their resume based on their input. Format your response clearly."
    elif body.tool_id == "cover_letter":
        system_instruction = "You are an expert cover letter generator. Write a professional, compelling, and tailored cover letter based on the user's details and job description."
    elif body.tool_id == "email_writer":
        system_instruction = "You are a professional email writer. Draft clear, polite, and effective emails based on the user's instructions."
    elif body.tool_id == "grammar_checker":
        system_instruction = "You are an expert grammar checker. Correct grammatical errors, improve sentence structure, and suggest better vocabulary for the provided text. Provide the corrected text directly."
    elif body.tool_id == "text_summarizer":
        system_instruction = "You are an expert text summarizer. Provide a concise, accurate, and readable summary of the provided text, capturing the key points."
    elif body.tool_id == "translator":
        system_instruction = "You are an expert translator. Translate the given text accurately."
    elif body.tool_id == "meeting_notes":
        system_instruction = "You are an expert at extracting and organizing meeting notes. Summarize the transcript or notes provided, highlight action items, key decisions, and follow-ups in a structured format."
    elif body.tool_id == "pdf_qa" or body.tool_id == "ocr":
        system_instruction = "You are an expert document analysis AI. Extract text accurately if asked for OCR, or answer questions based strictly on the content of the provided document."

    user_prompt = f"Instructions: {body.prompt}\n\n" if body.prompt else ""
    if body.input_text:
        user_prompt += f"Input:\n{body.input_text}\n"

    try:
        user_content_parts = []
        user_content_parts.append({
            "type": "text", 
            "text": user_prompt or ("Extract text from this file." if body.tool_id == "ocr" else "Please process this document.")
        })

        if body.file_data:
            mime_type = body.file_mime or "application/pdf"
            b64_data = body.file_data
            if "," in b64_data:
                full_data_uri = b64_data
            else:
                full_data_uri = f"data:{mime_type};base64,{b64_data}"
            
            user_content_parts.append({
                "type": "image_url",
                "image_url": {"url": full_data_uri}
            })

        messages = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_content_parts}
        ]
        
        reply = await generate_text_free(messages)
        
        if not reply:
            reply = ""
            
        await log_activity(user["user_id"], "productivity", f"{body.tool_id} used")
        await deduct_credits(user["user_id"], 1)
        
        return {"result": reply}
    except Exception as e:
        logger.exception("Productivity generate error: %s", e)
        error_str = str(e)
        raise HTTPException(status_code=500, detail=str(e))

@api.post("/images/generate")
async def generate_image_api(request: Request, user=Depends(get_current_user)):
    content_type = request.headers.get("content-type", "")
    uploaded_files_data = []

    if "multipart/form-data" in content_type:
        form_data = await request.form()
        prompt = form_data.get("prompt", "")
        aspect_ratio = form_data.get("aspect_ratio", "1:1")
        count_str = form_data.get("count", "1")
        count = int(count_str) if count_str.isdigit() else 1
        
        files = form_data.getlist("files[]")
        for f in files:
            if hasattr(f, "filename") and f.filename:
                data = await f.read()
                if len(data) > 20 * 1024 * 1024:
                    raise HTTPException(400, "File too large")
                uploaded_files_data.append({
                    "mimeType": f.content_type or "application/octet-stream",
                    "data": base64.b64encode(data).decode('utf-8')
                })
    else:
        body = await request.json()
        prompt = body.get("prompt", "")
        aspect_ratio = body.get("aspect_ratio", "1:1")
        count = int(body.get("count", 1))

    count = max(1, min(count, 4))
    await require_credits(user, 2 * count)

    aspect_hint = ASPECT_HINTS.get(aspect_ratio, "square 1:1")
    full_prompt = f"{prompt}, {aspect_hint}"

    try:
        results = await asyncio.gather(
            *[gen_image(prompt, aspect_ratio, uploaded_files_data) for _ in range(count)]
        )
        logger.info("Results count: %d", len(results))
        logger.info("Valid images count: %d", len([r for r in results if r])) 
    except Exception as e:
        logger.exception("Image generation error: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Image generation error: {str(e)}"
        )

    images = []

    for data in results:
        if not data:
            continue

        mime = detect_image_mime(data)

        rec = {
            "id": new_id("img"),
            "user_id": user["user_id"],
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "data": data,
            "mime": mime,
            "has_attachments": bool(uploaded_files_data),
            "created_at": now_utc().isoformat(),
        }

        await db.images.insert_one(rec)

        images.append({
            k: v
            for k, v in rec.items()
            if k not in ("user_id", "_id")
        })

    if not images:
        raise HTTPException(
            status_code=500,
            detail="Image generation failed. Please try again."
        )

    await deduct_credits(
        user["user_id"],
        2 * len(images)
    )

    return {
        "images": images
    }


@api.get("/images")
async def list_images(user=Depends(get_current_user)):
    return await db.images.find({"user_id": user["user_id"]}, {"_id": 0, "user_id": 0}).sort("created_at", -1).limit(40).to_list(40)

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
    files_data = body.files or []
    asyncio.create_task(_run_website_job(job_id, user["user_id"], body.description, body.site_type, files_data))
    return {"job_id": job_id, "status": "pending"}


async def _run_website_job(job_id: str, user_id: str, description: str, site_type: str, files_data: list):
    prompt = (
        f"Build a beautiful, modern, fully responsive {site_type} website as a SINGLE self-contained HTML file. "
        f"Requirements: {description}. Use inline CSS and JS. Include header, hero, features, CTA, footer. "
        f"Return ONLY the HTML inside a ```html fenced block."
    )
    try:
        if files_data:
            user_content_parts = []
            user_content_parts.append({"type": "text", "text": prompt})
            
            for file in files_data:
                b64_data = file["data"]
                if "," in b64_data:
                    full_data_uri = b64_data
                else:
                    mime = file.get("mime", "application/octet-stream")
                    full_data_uri = f"data:{mime};base64,{b64_data}"
                user_content_parts.append({
                    "type": "image_url",
                    "image_url": {"url": full_data_uri}
                })
            
            messages = [
                {"role": "system", "content": SYSTEM_PROMPTS["website"]},
                {"role": "user", "content": user_content_parts}
            ]
            
            out = await generate_text_free(messages)
            if not out:
                out = ""
        else:
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
    plans = await _get_all_plans()
    plan_info = next((p for p in plans if p["id"] == plan), None)
    if not plan_info: raise HTTPException(status_code=400, detail="Invalid plan")
    credits = plan_info.get("credits", 0)
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


# ====================================================================
# PAYMENTS + SUBSCRIPTIONS + ADMIN PAYMENT SETTINGS (Phase 3)
# ====================================================================
import secrets, string

PAYMENT_SETTINGS_ID = "singleton"
BUSINESS_CREDITS = ENTERPRISE_CREDITS
DEFAULT_PRICES = {"pro": 29, "business": 99, "currency": "USD"}
PLAN_TO_CREDITS = {"pro": PRO_CREDITS, "business": BUSINESS_CREDITS, "enterprise": ENTERPRISE_CREDITS}
ALLOWED_PURCHASE_PLANS = {"pro", "business"}


class PaymentSettingsIn(BaseModel):
    qr_image: Optional[str] = None  # base64 data URL or plain base64
    qr_mime: Optional[str] = None
    qr_enabled: Optional[bool] = None
    pro_price: Optional[float] = None
    business_price: Optional[float] = None
    currency: Optional[str] = None
    instructions: Optional[str] = None


class PaymentSubmitIn(BaseModel):
    plan: str
    name: str
    email: EmailStr
    utr_number: str

class PlanIn(BaseModel):
    id: str  # e.g., 'free', 'pro'
    name: str
    price: float
    currency: str = "USD"
    credits: int
    purchasable: bool
    features: List[str] = []


def _public_settings(doc: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Return payment settings safe for public view."""
    d = doc or {}
    return {
        "qr_enabled": d.get("qr_enabled", True),
        "qr_image": d.get("qr_image"),
        "qr_mime": d.get("qr_mime", "image/png"),
        "pro_price": d.get("pro_price", DEFAULT_PRICES["pro"]),
        "business_price": d.get("business_price", DEFAULT_PRICES["business"]),
        "currency": d.get("currency", DEFAULT_PRICES["currency"]),
        "instructions": d.get("instructions", "Scan the QR code with your UPI / banking app and complete the payment. After paying, fill the form below with your full name, email and the UTR / transaction reference."),
        "updated_at": d.get("updated_at"),
    }


async def _audit(admin_user: Dict[str, Any], action: str, target_id: str = "", details: Optional[Dict[str, Any]] = None):
    await db.audit_log.insert_one({
        "id": new_id("aud"),
        "admin_id": admin_user.get("user_id"),
        "admin_email": admin_user.get("email"),
        "action": action,
        "target_id": target_id,
        "details": details or {},
        "ts": now_utc().isoformat(),
    })


def _gen_activation_code(plan: str) -> str:
    prefix = "VTX-PRO-" if plan == "pro" else "VTX-BUS-"
    alphabet = string.ascii_uppercase + string.digits
    return prefix + "".join(secrets.choice(alphabet) for _ in range(6))


# --- Plans CRUD ---
async def _get_all_plans():
    docs = await db.plans.find({}, {"_id": 0}).to_list(None)
    if not docs:
        docs = [
            {"id": "free", "name": "Free", "price": 0, "credits": FREE_CREDITS, "purchasable": False, "features": ["Basic AI Chat"]},
            {"id": "pro", "name": "Pro", "price": DEFAULT_PRICES["pro"], "credits": PRO_CREDITS, "purchasable": True, "features": ["Advanced Generation"]},
            {"id": "business", "name": "Business", "price": DEFAULT_PRICES["business"], "credits": BUSINESS_CREDITS, "purchasable": True, "features": ["Team Management"]},
            {"id": "enterprise", "name": "Enterprise", "price": 0, "credits": ENTERPRISE_CREDITS, "purchasable": False, "features": ["Dedicated Support"]},
        ]
        # Seed them so admin can edit them later
        if db is not None and getattr(db, "plans", None) is not None:
             await db.plans.insert_many([dict(d) for d in docs])
    return docs

@api.get("/plans")
async def get_plans():
    return await _get_all_plans()

@api.post("/admin/plans")
async def add_or_update_plan(body: PlanIn, admin=Depends(require_admin)):
    data = body.dict()
    data["updated_at"] = now_utc().isoformat()
    await db.plans.update_one({"id": body.id}, {"$set": data}, upsert=True)
    await _audit(admin, "update_plan", body.id, {"name": body.name, "price": body.price})
    return {"ok": True, "plan": data}

@api.delete("/admin/plans/{plan_id}")
async def delete_plan(plan_id: str, admin=Depends(require_admin)):
    if plan_id in ["free", "pro", "business", "enterprise"]:
        raise HTTPException(status_code=400, detail="Cannot delete default plans")
    await db.plans.delete_one({"id": plan_id})
    await _audit(admin, "delete_plan", plan_id)
    return {"ok": True}

# --- Public read of payment settings (needed on /payment page) ---
@api.get("/payment-settings")
async def get_payment_settings(_user=Depends(get_current_user)):
    doc = await db.payment_settings.find_one({"id": PAYMENT_SETTINGS_ID}, {"_id": 0})
    return _public_settings(doc)


# --- Admin: update payment settings ---
@api.put("/admin/payment-settings")
async def update_payment_settings(body: PaymentSettingsIn, admin=Depends(require_admin)):
    update: Dict[str, Any] = {"updated_at": now_utc().isoformat()}
    # Strip "data:image/png;base64," prefix if provided
    if body.qr_image is not None:
        img = body.qr_image
        mime = body.qr_mime
        if img.startswith("data:"):
            try:
                head, b64 = img.split(",", 1)
                if not mime and ";" in head:
                    mime = head.split(":", 1)[1].split(";", 1)[0]
                img = b64
            except ValueError:
                pass
        update["qr_image"] = img
        update["qr_mime"] = mime or "image/png"
    if body.qr_enabled is not None: update["qr_enabled"] = bool(body.qr_enabled)
    if body.pro_price is not None: update["pro_price"] = float(body.pro_price)
    if body.business_price is not None: update["business_price"] = float(body.business_price)
    if body.currency is not None: update["currency"] = body.currency
    if body.instructions is not None: update["instructions"] = body.instructions
    await db.payment_settings.update_one(
        {"id": PAYMENT_SETTINGS_ID},
        {"$set": update, "$setOnInsert": {"id": PAYMENT_SETTINGS_ID, "created_at": now_utc().isoformat()}},
        upsert=True,
    )
    await _audit(admin, "update_payment_settings", PAYMENT_SETTINGS_ID, {k: ("<image>" if k == "qr_image" else v) for k, v in update.items()})
    doc = await db.payment_settings.find_one({"id": PAYMENT_SETTINGS_ID}, {"_id": 0})
    return _public_settings(doc)


@api.delete("/admin/payment-settings/qr")
async def delete_qr(admin=Depends(require_admin)):
    await db.payment_settings.update_one(
        {"id": PAYMENT_SETTINGS_ID},
        {"$unset": {"qr_image": "", "qr_mime": ""}, "$set": {"updated_at": now_utc().isoformat()}},
        upsert=True,
    )
    await _audit(admin, "delete_qr", PAYMENT_SETTINGS_ID)
    return {"ok": True}


# --- User: submit a payment ---
@api.post("/payments")
async def submit_payment(body: PaymentSubmitIn, user=Depends(get_current_user)):
    plan = body.plan.lower()
    plans = await _get_all_plans()
    plan_info = next((p for p in plans if p["id"] == plan), None)
    
    if not plan_info or not plan_info.get("purchasable", False):
        raise HTTPException(status_code=400, detail="Plan must be purchasable")
        
    settings = await db.payment_settings.find_one({"id": PAYMENT_SETTINGS_ID}, {"_id": 0})
    if settings and settings.get("qr_enabled") is False:
        raise HTTPException(status_code=400, detail="QR payments are currently disabled. Please contact support.")
    utr = body.utr_number.strip()
    if not utr or len(utr) < 6:
        raise HTTPException(status_code=400, detail="Invalid UTR / transaction reference")
    # Prevent duplicate UTR submissions (globally unique within payments)
    if await db.payments.find_one({"utr_number": utr}, {"_id": 0}):
        raise HTTPException(status_code=409, detail="This UTR has already been submitted")
    rec = {
        "id": new_id("pay"),
        "user_id": user["user_id"],
        "name": body.name.strip()[:120],
        "email": body.email.lower(),
        "plan": plan,
        "utr_number": utr,
        "status": "pending",
        "created_at": now_utc().isoformat(),
        "processed_at": None,
        "processed_by": None,
        "activation_code": None,
        "amount": plan_info.get("price", 0),
        "currency": (settings or {}).get("currency", DEFAULT_PRICES["currency"]),
    }
    await db.payments.insert_one(rec.copy())
    await log_activity(user["user_id"], "payment", f"submitted {plan} - {utr}")
    return {
        "ok": True,
        "id": rec["id"],
        "status": rec["status"],
        "message": "Payment submitted for verification",
    }


# --- User: list their own payments ---
@api.get("/payments/me")
async def my_payments(user=Depends(get_current_user)):
    docs = await db.payments.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return docs


# --- User: get their active subscription ---
@api.get("/subscriptions/me")
async def my_subscription(user=Depends(get_current_user)):
    docs = await db.subscriptions.find({"user_id": user["user_id"]}, {"_id": 0}).sort("start_date", -1).limit(20).to_list(20)
    active = None
    now_iso = now_utc().isoformat()
    for d in docs:
        if d.get("status") == "active" and (not d.get("end_date") or d["end_date"] >= now_iso):
            active = d
            break
    return {"active": active, "history": docs}


# --- Admin: list payments ---
@api.get("/admin/payments")
async def admin_list_payments(status: Optional[str] = None, _admin=Depends(require_admin)):
    q: Dict[str, Any] = {}
    if status in ("pending", "approved", "rejected"):
        q["status"] = status
    docs = await db.payments.find(q, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)
    return docs


# --- Admin: approve payment ---
@api.post("/admin/payments/{pid}/approve")
async def admin_approve_payment(pid: str, admin=Depends(require_admin)):
    pay = await db.payments.find_one({"id": pid}, {"_id": 0})
    if not pay:
        raise HTTPException(status_code=404, detail="Payment not found")
    if pay["status"] == "approved":
        raise HTTPException(status_code=400, detail="Payment already approved")

    plan = pay["plan"]
    plans = await _get_all_plans()
    plan_info = next((p for p in plans if p["id"] == plan), None)
    if not plan_info:
        raise HTTPException(status_code=400, detail="Unsupported plan on this payment")

    # Generate a globally unique activation code
    code = None
    for _ in range(8):
        candidate = _gen_activation_code(plan)
        exists = await db.subscriptions.find_one({"activation_code": candidate}, {"_id": 0})
        if not exists:
            code = candidate
            break
    if not code:
        raise HTTPException(status_code=500, detail="Could not generate unique activation code")

    start = now_utc()
    end = start + timedelta(days=30)
    sub = {
        "id": new_id("sub"),
        "user_id": pay["user_id"],
        "plan": plan,
        "activation_code": code,
        "status": "active",
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "payment_id": pid,
        "created_at": start.isoformat(),
    }
    # Deactivate any older active subscriptions for this user
    await db.subscriptions.update_many(
        {"user_id": pay["user_id"], "status": "active"},
        {"$set": {"status": "inactive", "deactivated_at": start.isoformat(), "deactivated_reason": "replaced"}},
    )
    await db.subscriptions.insert_one(sub.copy())

    # Apply plan + credit grant to the user
    credits_to_grant = plan_info.get("credits", FREE_CREDITS)
    await db.users.update_one(
        {"user_id": pay["user_id"]},
        {"$set": {"plan": plan, "credits": credits_to_grant, "active_activation_code": code}},
    )

    await db.payments.update_one(
        {"id": pid},
        {"$set": {
            "status": "approved",
            "processed_at": start.isoformat(),
            "processed_by": admin["user_id"],
            "activation_code": code,
        }},
    )
    await _audit(admin, "approve_payment", pid, {"plan": plan, "code": code, "user_id": pay["user_id"]})
    return {"ok": True, "activation_code": code, "subscription": sub}


# --- Admin: reject payment ---
@api.post("/admin/payments/{pid}/reject")
async def admin_reject_payment(pid: str, admin=Depends(require_admin)):
    pay = await db.payments.find_one({"id": pid}, {"_id": 0})
    if not pay:
        raise HTTPException(status_code=404, detail="Payment not found")
    if pay["status"] == "approved":
        raise HTTPException(status_code=400, detail="Cannot reject an already approved payment")
    await db.payments.update_one(
        {"id": pid},
        {"$set": {"status": "rejected", "processed_at": now_utc().isoformat(), "processed_by": admin["user_id"]}},
    )
    await _audit(admin, "reject_payment", pid, {"plan": pay.get("plan"), "user_id": pay.get("user_id")})
    return {"ok": True}


# --- Admin: list subscriptions ---
@api.get("/admin/subscriptions")
async def admin_list_subscriptions(_admin=Depends(require_admin)):
    docs = await db.subscriptions.find({}, {"_id": 0}).sort("start_date", -1).limit(500).to_list(500)
    return docs

@api.delete("/admin/subscriptions/{sub_id}")
async def admin_delete_subscription(sub_id: str, admin=Depends(require_admin)):
    sub = await db.subscriptions.find_one({"id": sub_id})
    if not sub:
        raise HTTPException(404, "Subscription not found")
    
    await db.subscriptions.delete_one({"id": sub_id})
    # Reset user to free plan
    await db.users.update_one({"user_id": sub["user_id"]}, {"$set": {"plan": "free"}})
    
    await db.audit_log.insert_one({
        "id": "aud_" + gen_id()[:8],
        "ts": now_utc().isoformat(),
        "admin_email": admin["email"],
        "action": f"Deleted plan {sub['plan']} for user {sub['user_id']}"
    })
    return {"ok": True}


# --- Admin: audit log ---
@api.get("/admin/audit")
async def admin_audit(_admin=Depends(require_admin)):
    docs = await db.audit_log.find({}, {"_id": 0}).sort("ts", -1).limit(200).to_list(200)
    return docs


@api.get("/")
async def root(): return {"app": "GREXO AI", "ok": True}


@app.on_event("startup")
async def seed_admin():
    existing = await db.users.find_one({"email": ADMIN_EMAIL.lower()}, {"_id": 0})
    if not existing:
        await db.users.insert_one({
            "user_id": new_id("user"), "email": ADMIN_EMAIL.lower(), "name": "Grexo Admin",
            "password_hash": hash_pw(ADMIN_PASSWORD), "picture": None, "plan": "enterprise",
            "credits": ENTERPRISE_CREDITS, "role": "admin", "provider": "jwt",
            "created_at": now_utc().isoformat(),
        })
        logger.info("Seeded admin user: %s", ADMIN_EMAIL)
    else:
        # Ensure admin has admin role
        if existing.get("role") != "admin":
            await db.users.update_one({"email": ADMIN_EMAIL.lower()}, {"$set": {"role": "admin"}})
    # Indexes for payment/subscription system
    try:
        await db.payments.create_index("utr_number", unique=True)
        await db.subscriptions.create_index("activation_code", unique=True)
    except Exception as e:
        logger.warning("Index creation issue: %s", e)

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
