"""Takes the entry's screenshots by driving the app in Chrome-for-Testing:
the exported covers (full frame) and the editor with photos loaded.
Writes screenshots/*.jpg (each <= 256 KiB, long side <= 1280)."""
import os
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

REPO = "/home/hatch/workspace/makefun/gta6-cover-art-01-repo"
CHROME = "/home/hatch/workspace/.tmp/chrome-linux64/chrome"
BASE = "http://127.0.0.1:8931"

SHOTS = [
    # (name, url, viewport, quality)
    ("1-cover.jpg",
     "/index.html?shot=cover&layout=hero&grade=vice&size=1920x1080&title=GOLDEN%20COAST&subtitle=Neon%20Nights",
     (1280, 720), 88),
    ("2-editor.jpg",
     "/index.html?shot=editor",
     (1280, 800), 88),
    ("3-cover.jpg",
     "/index.html?shot=cover&layout=nine&grade=comic&size=1080x1350&title=HEAT%20WAVE&subtitle=Coast%20to%20Coast&halftone=1",
     (1024, 1280), 88),
    ("4-cover.jpg",
     "/index.html?shot=cover&layout=hero&grade=neon&size=1080x1080&title=PALM%20HEAT&subtitle=Vice%20Nights",
     (1080, 1080), 88),
]

server = subprocess.Popen(
    [sys.executable, "-m", "http.server", "8931", "--directory",
     os.path.join(REPO, "app"), "--bind", "127.0.0.1"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
time.sleep(1.5)
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME,
            args=["--no-sandbox", "--no-proxy-server", "--disable-dev-shm-usage"],
        )
        for name, url, (vw, vh), quality in SHOTS:
            page = browser.new_page(viewport={"width": vw, "height": vh})
            errors = []
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(BASE + url, wait_until="domcontentloaded", timeout=60000)
            try:
                page.wait_for_function("window.__shotReady === true", timeout=30000)
            except Exception:
                print(name, "WARN: __shotReady never set; errors:", errors[:5])
            page.wait_for_timeout(400)
            out = os.path.join(REPO, "screenshots", name)
            q = quality
            while True:
                page.screenshot(path=out, type="jpeg", quality=q)
                size = os.path.getsize(out)
                if size <= 262144 or q <= 55:
                    break
                q -= 10
            print(name, size, "bytes, quality", q, "errors:", errors[:3])
            page.close()
        browser.close()
finally:
    server.terminate()
print("done")
