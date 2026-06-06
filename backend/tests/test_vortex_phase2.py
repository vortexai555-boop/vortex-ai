"""VORTEX AI Phase 2 - Website Builder + Image Generator API tests."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
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
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def user_a():
    email = f"test_p2_userA_{uuid.uuid4().hex[:8]}@vortex-ai.com"
    r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "PassAA@2026", "name": "Alice2"}, timeout=20)
    assert r.status_code == 200, r.text
    return {"email": email, "token": r.json()["token"], "user": r.json()["user"]}


@pytest.fixture(scope="module")
def user_b():
    email = f"test_p2_userB_{uuid.uuid4().hex[:8]}@vortex-ai.com"
    r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "PassBB@2026", "name": "Bob2"}, timeout=20)
    assert r.status_code == 200, r.text
    return {"email": email, "token": r.json()["token"], "user": r.json()["user"]}


def _credits(token):
    r = requests.get(f"{API}/auth/me", headers=auth_headers(token), timeout=15)
    assert r.status_code == 200
    return r.json()["credits"]


# ---- Image Generator ----
class TestImageGenerator:
    def test_unauth(self):
        r = requests.post(f"{API}/images/generate", json={"prompt": "x", "aspect_ratio": "1:1", "count": 1}, timeout=10)
        assert r.status_code in (401, 403)

    def test_generate_one_image_admin(self, admin_token):
        before = _credits(admin_token)
        r = requests.post(
            f"{API}/images/generate",
            json={"prompt": "A neon cyberpunk city at midnight", "aspect_ratio": "16:9", "count": 1},
            headers=auth_headers(admin_token),
            timeout=120,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "images" in body
        assert len(body["images"]) == 1
        img = body["images"][0]
        assert "id" in img and "data" in img
        assert img["aspect_ratio"] == "16:9"
        # Validate base64 PNG header (decoded begins with PNG magic bytes)
        import base64
        raw = base64.b64decode(img["data"])
        # Accept PNG or JPEG magic — Gemini Nano Banana currently returns JPEG bytes
        # even though frontend tags as image/png (browsers MIME-sniff so it still renders).
        is_png = raw[:8] == b"\x89PNG\r\n\x1a\n"
        is_jpeg = raw[:3] == b"\xff\xd8\xff"
        assert is_png or is_jpeg, f"Not a recognized image format, header={raw[:8].hex()}"
        # Credits deducted (admin is enterprise -> may or may not deduct; only assert >= 0)
        after = _credits(admin_token)
        assert after >= 0
        # store last id for later test on same module
        TestImageGenerator._last_image_id = img["id"]

    def test_generate_deducts_credits_for_free_user(self, user_a):
        before = _credits(user_a["token"])
        r = requests.post(
            f"{API}/images/generate",
            json={"prompt": "minimal abstract gradient", "aspect_ratio": "1:1", "count": 1},
            headers=auth_headers(user_a["token"]),
            timeout=120,
        )
        assert r.status_code == 200, r.text
        after = _credits(user_a["token"])
        # 2 credits per image
        assert before - after == 2, f"Expected 2-credit deduction, got {before-after}"

    def test_list_images_for_admin(self, admin_token):
        r = requests.get(f"{API}/images", headers=auth_headers(admin_token), timeout=20)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 1
        # no _id / user_id leakage
        for it in items:
            assert "_id" not in it
            assert "user_id" not in it
            assert "data" in it and "prompt" in it

    def test_user_isolation_images(self, user_a, user_b):
        # user_a should have at least 1 image (from previous test)
        r_a = requests.get(f"{API}/images", headers=auth_headers(user_a["token"]), timeout=20)
        assert r_a.status_code == 200
        ids_a = {i["id"] for i in r_a.json()}
        assert len(ids_a) >= 1

        # user_b should NOT see user_a's images
        r_b = requests.get(f"{API}/images", headers=auth_headers(user_b["token"]), timeout=20)
        assert r_b.status_code == 200
        ids_b = {i["id"] for i in r_b.json()}
        assert ids_a.isdisjoint(ids_b), "User B can see User A's images!"


# ---- Website Builder (async job pattern) ----
def _poll_job(token, job_id, max_wait=300):
    deadline = time.time() + max_wait
    last = None
    while time.time() < deadline:
        r = requests.get(f"{API}/website/jobs/{job_id}", headers=auth_headers(token), timeout=20)
        if r.status_code != 200:
            return r.status_code, r.text
        last = r.json()
        if last.get("status") in ("done", "error"):
            return 200, last
        time.sleep(3)
    return 0, last


class TestWebsiteBuilder:
    def test_unauth(self):
        r = requests.post(f"{API}/website/generate", json={"description": "x", "site_type": "landing"}, timeout=10)
        assert r.status_code in (401, 403)

    def test_generate_website_admin_async(self, admin_token):
        before = _credits(admin_token)
        r = requests.post(
            f"{API}/website/generate",
            json={"description": "Landing page for a coffee brand called Brewly", "site_type": "landing"},
            headers=auth_headers(admin_token),
            timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "job_id" in body
        assert body.get("status") == "pending"
        job_id = body["job_id"]

        # Credits should be reserved up-front
        after_reserve = _credits(admin_token)
        # Admin has enterprise plan; just check credits non-negative
        assert after_reserve >= 0
        # Reserve assertion is via free user test below

        # Poll job
        code, result = _poll_job(admin_token, job_id, max_wait=300)
        assert code == 200, f"Poll failed: {result}"
        assert result["status"] == "done", f"Job did not complete: {result.get('error')}"
        assert "html" in result and "site_id" in result
        html = result["html"]
        assert len(html) > 200, f"HTML too short: {len(html)}"
        assert "<html" in html.lower() or "<!doctype" in html.lower() or "<body" in html.lower()
        TestWebsiteBuilder._last_site_id = result["site_id"]
        TestWebsiteBuilder._last_job_id = job_id

    def test_list_websites_for_admin(self, admin_token):
        r = requests.get(f"{API}/website", headers=auth_headers(admin_token), timeout=20)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 1
        for it in items:
            assert "_id" not in it
            assert "user_id" not in it
            assert "html" in it and "description" in it and "site_type" in it

    def test_credits_reserved_immediately(self, user_a):
        """POST should reserve 3 credits immediately (before LLM completes)."""
        before = _credits(user_a["token"])
        r = requests.post(
            f"{API}/website/generate",
            json={"description": "Simple portfolio site for a UX designer named Maya", "site_type": "portfolio"},
            headers=auth_headers(user_a["token"]),
            timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        job_id = body["job_id"]
        # Within seconds of POST, credits should have been deducted
        time.sleep(1)
        after_reserve = _credits(user_a["token"])
        assert before - after_reserve == 3, f"Expected immediate 3-credit reserve, got {before-after_reserve}"

        # Poll for completion to ensure no double-refund / double-charge
        code, result = _poll_job(user_a["token"], job_id, max_wait=300)
        assert code == 200, f"Poll failed: {result}"
        final = _credits(user_a["token"])
        if result["status"] == "done":
            assert before - final == 3, f"Expected net -3 after success, got {before-final}"
        elif result["status"] == "error":
            # Backend refunds on failure
            assert before - final == 0, f"Expected refund (net 0) after error, got {before-final}"

    def test_job_ownership_404_for_other_user(self, user_a, user_b):
        """User B should get 404 for a job owned by User A."""
        # Create job under user_a
        r = requests.post(
            f"{API}/website/generate",
            json={"description": "About page for a tiny bakery", "site_type": "landing"},
            headers=auth_headers(user_a["token"]),
            timeout=30,
        )
        assert r.status_code == 200, r.text
        job_id = r.json()["job_id"]

        # User B attempts to read user A's job -> 404
        r_b = requests.get(f"{API}/website/jobs/{job_id}", headers=auth_headers(user_b["token"]), timeout=15)
        assert r_b.status_code == 404, f"Expected 404 for cross-user job access, got {r_b.status_code}"

        # Owner can still read it
        r_a = requests.get(f"{API}/website/jobs/{job_id}", headers=auth_headers(user_a["token"]), timeout=15)
        assert r_a.status_code == 200

    def test_user_isolation_websites(self, user_a, user_b):
        r_a = requests.get(f"{API}/website", headers=auth_headers(user_a["token"]), timeout=20)
        assert r_a.status_code == 200
        ids_a = {i["id"] for i in r_a.json()}

        r_b = requests.get(f"{API}/website", headers=auth_headers(user_b["token"]), timeout=20)
        assert r_b.status_code == 200
        ids_b = {i["id"] for i in r_b.json()}
        if ids_a:
            assert ids_a.isdisjoint(ids_b), "User B can see User A's websites!"


# ---- Image MIME detection ----
class TestImageMime:
    def test_mime_field_present_on_generate(self, admin_token):
        r = requests.post(
            f"{API}/images/generate",
            json={"prompt": "soft pastel sunrise over mountains", "aspect_ratio": "1:1", "count": 1},
            headers=auth_headers(admin_token),
            timeout=120,
        )
        assert r.status_code == 200, r.text
        img = r.json()["images"][0]
        assert "mime" in img, "Response is missing 'mime' field"
        assert img["mime"] in ("image/jpeg", "image/png", "image/webp")
        # Verify mime matches base64 magic prefix
        if img["data"].startswith("/9j/"):
            assert img["mime"] == "image/jpeg"
        elif img["data"].startswith("iVBOR"):
            assert img["mime"] == "image/png"

    def test_mime_field_present_on_list(self, admin_token):
        r = requests.get(f"{API}/images", headers=auth_headers(admin_token), timeout=20)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1
        for it in items:
            assert "mime" in it, "List response missing 'mime' field on item"
