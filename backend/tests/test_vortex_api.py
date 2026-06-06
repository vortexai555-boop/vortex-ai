"""VORTEX AI - End-to-end API tests."""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Fallback to frontend .env (read directly) since backend tests run in same env
    from pathlib import Path
    env_path = Path("/app/frontend/.env")
    for line in env_path.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
            break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@vortex.ai"
ADMIN_PASSWORD = "VortexAdmin@2026"


# ---- Fixtures ----
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def user_a():
    # Unique signup
    email = f"test_userA_{uuid.uuid4().hex[:8]}@vortex-ai.com"
    r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "PassAA@2026", "name": "Alice"}, timeout=20)
    assert r.status_code == 200, r.text
    return {"email": email, "token": r.json()["token"], "user": r.json()["user"]}


@pytest.fixture(scope="session")
def user_b():
    email = f"test_userB_{uuid.uuid4().hex[:8]}@vortex-ai.com"
    r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "PassBB@2026", "name": "Bob"}, timeout=20)
    assert r.status_code == 200, r.text
    return {"email": email, "token": r.json()["token"], "user": r.json()["user"]}


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---- Health / Root ----
class TestRoot:
    def test_root_api(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---- Auth ----
class TestAuth:
    def test_admin_login(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 10

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=10)
        assert r.status_code == 401

    def test_me_with_token(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=auth_headers(admin_token), timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data.get("role") == "admin"
        assert "password_hash" not in data

    def test_me_unauthorized(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401

    def test_signup_duplicate(self, user_a):
        r = requests.post(f"{API}/auth/signup", json={"email": user_a["email"], "password": "x", "name": "x"}, timeout=10)
        assert r.status_code == 400

    def test_signup_user_a_has_free_credits(self, user_a):
        r = requests.get(f"{API}/auth/me", headers=auth_headers(user_a["token"]), timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["plan"] == "free"
        assert data["credits"] == 100


# ---- Forgot/Reset ----
class TestForgotReset:
    def test_forgot_reset_flow(self):
        email = f"test_reset_{uuid.uuid4().hex[:8]}@vortex-ai.com"
        old_pw = "OldPass@2026"
        new_pw = "NewPass@2026"
        # signup
        r = requests.post(f"{API}/auth/signup", json={"email": email, "password": old_pw, "name": "Reset User"}, timeout=15)
        assert r.status_code == 200

        # forgot
        r = requests.post(f"{API}/auth/forgot", json={"email": email}, timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body.get("ok") is True
        token = body.get("reset_token")
        assert isinstance(token, str) and token.startswith("reset_")

        # reset
        r = requests.post(f"{API}/auth/reset", json={"token": token, "password": new_pw}, timeout=10)
        assert r.status_code == 200

        # old password must fail
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": old_pw}, timeout=10)
        assert r.status_code == 401

        # new password works
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": new_pw}, timeout=10)
        assert r.status_code == 200

    def test_forgot_unknown_email_silent(self):
        r = requests.post(f"{API}/auth/forgot", json={"email": "nonexistent@vortex-ai.com"}, timeout=10)
        assert r.status_code == 200
        # No reset_token leaked when user doesn't exist
        assert "reset_token" not in r.json()


# ---- Chat ----
class TestChat:
    def test_chat_unauth(self):
        r = requests.post(f"{API}/chat/send", json={"message": "hi"}, timeout=10)
        assert r.status_code == 401

    def test_chat_send_creates_conversation(self, user_a):
        r = requests.post(
            f"{API}/chat/send",
            headers=auth_headers(user_a["token"]),
            json={"message": "Reply with exactly the word PONG."},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "conversation_id" in body and body["conversation_id"].startswith("conv_")
        assert isinstance(body.get("reply"), str) and len(body["reply"]) > 0
        user_a["conv_id"] = body["conversation_id"]

    def test_chat_continues_conversation(self, user_a):
        cid = user_a.get("conv_id")
        assert cid, "must run after test_chat_send_creates_conversation"
        r = requests.post(
            f"{API}/chat/send",
            headers=auth_headers(user_a["token"]),
            json={"conversation_id": cid, "message": "Now reply with just OK."},
            timeout=60,
        )
        assert r.status_code == 200
        assert r.json()["conversation_id"] == cid

    def test_get_conversation_persists_messages(self, user_a):
        cid = user_a.get("conv_id")
        r = requests.get(f"{API}/conversations/{cid}", headers=auth_headers(user_a["token"]), timeout=10)
        assert r.status_code == 200
        conv = r.json()
        assert conv["id"] == cid
        msgs = conv.get("messages", [])
        # 2 user + 2 assistant
        assert len(msgs) >= 4
        roles = [m["role"] for m in msgs]
        assert "user" in roles and "assistant" in roles


# ---- Conversations CRUD + Isolation ----
class TestConversations:
    def test_list_for_user_a(self, user_a):
        r = requests.get(f"{API}/conversations", headers=auth_headers(user_a["token"]), timeout=10)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) >= 1
        assert all(it.get("id", "").startswith("conv_") for it in items)

    def test_user_b_isolated(self, user_b, user_a):
        # User B should not see user A's conversations
        r = requests.get(f"{API}/conversations", headers=auth_headers(user_b["token"]), timeout=10)
        assert r.status_code == 200
        items = r.json()
        a_ids = {user_a.get("conv_id")}
        b_ids = {it["id"] for it in items}
        assert not (a_ids & b_ids), "User B sees User A's conversations!"

    def test_user_b_cannot_access_user_a_conv(self, user_b, user_a):
        cid = user_a.get("conv_id")
        r = requests.get(f"{API}/conversations/{cid}", headers=auth_headers(user_b["token"]), timeout=10)
        assert r.status_code == 404

    def test_rename_conversation(self, user_a):
        cid = user_a.get("conv_id")
        new_title = "Renamed TEST title"
        r = requests.patch(
            f"{API}/conversations/{cid}",
            headers=auth_headers(user_a["token"]),
            json={"title": new_title},
            timeout=10,
        )
        assert r.status_code == 200
        # Verify
        r = requests.get(f"{API}/conversations/{cid}", headers=auth_headers(user_a["token"]), timeout=10)
        assert r.json()["title"] == new_title

    def test_delete_conversation(self, user_a):
        # Create a fresh conv to delete
        r = requests.post(
            f"{API}/chat/send",
            headers=auth_headers(user_a["token"]),
            json={"message": "Tiny test to be deleted. Reply OK."},
            timeout=60,
        )
        assert r.status_code == 200
        cid = r.json()["conversation_id"]
        r = requests.delete(f"{API}/conversations/{cid}", headers=auth_headers(user_a["token"]), timeout=10)
        assert r.status_code == 200
        r = requests.get(f"{API}/conversations/{cid}", headers=auth_headers(user_a["token"]), timeout=10)
        assert r.status_code == 404


# ---- Dashboard summary ----
class TestDashboard:
    def test_summary_unauth(self):
        r = requests.get(f"{API}/dashboard/summary", timeout=10)
        assert r.status_code == 401

    def test_summary_for_user_a(self, user_a):
        r = requests.get(f"{API}/dashboard/summary", headers=auth_headers(user_a["token"]), timeout=10)
        assert r.status_code == 200
        data = r.json()
        for k in ("credits", "plan", "activity", "usage_by_tool", "stats"):
            assert k in data
        # User A consumed ~3 credits (3 chat sends)
        assert data["credits"] <= 100
        assert data["stats"]["conversations"] >= 1


# ---- Logout ----
class TestLogout:
    def test_logout(self):
        # Create temp user, login, logout
        email = f"test_logout_{uuid.uuid4().hex[:8]}@vortex-ai.com"
        r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "Pw@2026!!", "name": "Lo"}, timeout=10)
        token = r.json()["token"]
        r = requests.post(f"{API}/auth/logout", headers=auth_headers(token), timeout=10)
        assert r.status_code == 200
        # JWT is stateless so /me still works with valid JWT; logout primarily clears Google sessions/cookie
        # Just ensure endpoint returns ok
        assert r.json().get("ok") is True
