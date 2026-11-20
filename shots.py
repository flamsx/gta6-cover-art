# Take the 4 screenshots for gta6-cover-art-01 v2 + verify PNG export live.
# Playwright (venv) + Chrome-for-Testing. The exported PNG data URLs are large
# (~6MB), so they are NEVER transferred to Python: the browser checks the PNG
# header itself and shows the image, and Python only screenshots the page.
import asyncio, os, subprocess, sys, time

REPO = "/home/hatch/workspace/makefun/gta6-cover-art-01-repo5"
APP = REPO + "/app"
OUTAPP = REPO + "/out/app"
PORT = 8135
PORT2 = 8136
CHROME = "/home/hatch/workspace/.tmp/chrome-linux64/chrome"

SHOW_JS = """async ([w, h, tw, th]) => {
  const d = window.CoverStudio.exportPNG(w, h);
  const head = d.slice(0, 30);
  const ok = head === 'data:image/png;base64,iVBORw0K';
  const img = new Image();
  img.src = d;
  await img.decode();
  document.body.innerHTML = '';
  img.style.cssText = `width:${tw}px;height:${th}px;display:block;margin:0`;
  document.body.style.margin = '0';
  document.body.appendChild(img);
  return { ok, head, len: d.length };
}"""

CHECK_JS = """([w, h]) => {
  const d = window.CoverStudio.exportPNG(w, h);
  return { ok: d.slice(0, 30) === 'data:image/png;base64,iVBORw0K', len: d.length };
}"""


async def shoot_cover(page, w, h, tw, th, path):
    r = await page.evaluate(SHOW_JS, [w, h, tw, th])
    assert r["ok"], f"export {w}x{h} is not a PNG: {r['head']}"
    print(f"export {w}x{h} PNG ok (data {r['len']} chars)")
    await page.set_viewport_size({"width": tw, "height": th})
    await page.wait_for_timeout(300)
    await page.screenshot(path=path, type="jpeg", quality=82)
    print("shot", path, os.path.getsize(path), "bytes")


async def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--directory", APP],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
            page = await browser.new_page(viewport={"width": 1400, "height": 1000})
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            await page.goto(f"http://127.0.0.1:{PORT}/index.html")
            await page.wait_for_function("window.CoverStudio && window.CoverStudio.ready", timeout=30000)
            await page.evaluate("window.CoverStudio.ready")
            await page.wait_for_timeout(800)
            print("page errors:", errors)
            # UI export button -> real downloaded PNG file.
            async with page.expect_download() as dl_info:
                await page.click("#exportBtn")
            dl = await dl_info.value
            tmp = "/tmp/golden-coast-ui-export.png"
            await dl.save_as(tmp)
            with open(tmp, "rb") as f:
                magic = f.read(8)
            assert magic == b"\x89PNG\r\n\x1a\n", "UI export is not a PNG"
            print("UI Export button PNG ok, bytes:", os.path.getsize(tmp))
            # 1-cover: hero sunset, export 1920x1080, show at 1280x720.
            await page.evaluate("CoverStudio.setVariant('Sunset Coast')")
            await page.wait_for_timeout(600)
            await shoot_cover(page, 1920, 1080, 1280, 720, REPO + "/screenshots/1-cover.jpg")
            for (w, h) in [(1080, 1080), (1080, 1350)]:
                r = await page.evaluate(CHECK_JS, [w, h])
                assert r["ok"], f"export {w}x{h} not PNG"
                print(f"export {w}x{h} PNG ok (data {r['len']} chars)")
            # 2-editor: the app itself, photo loaded.
            await page.goto(f"http://127.0.0.1:{PORT}/index.html")
            await page.wait_for_function("window.CoverStudio && window.CoverStudio.ready", timeout=30000)
            await page.evaluate("window.CoverStudio.ready")
            await page.wait_for_timeout(800)
            await page.set_viewport_size({"width": 1280, "height": 914})
            await page.screenshot(path=REPO + "/screenshots/2-editor.jpg", type="jpeg", quality=82)
            print("shot 2-editor.jpg", os.path.getsize(REPO + "/screenshots/2-editor.jpg"), "bytes")
            # 3-cover: 9-panel Poster Ink portrait 1080x1350 -> 1024x1280.
            await page.evaluate("CoverStudio.setVariant('Ink City')")
            await page.wait_for_timeout(600)
            await shoot_cover(page, 1080, 1350, 1024, 1280, REPO + "/screenshots/3-cover.jpg")
            # 4-cover: Neon Night square 1080x1080. (Reload: shoot_cover wiped the body.)
            await page.goto(f"http://127.0.0.1:{PORT}/index.html")
            await page.wait_for_function("window.CoverStudio && window.CoverStudio.ready", timeout=30000)
            await page.evaluate("window.CoverStudio.ready")
            await page.wait_for_timeout(500)
            await page.evaluate("CoverStudio.setVariant('Neon Nights')")
            await page.wait_for_timeout(600)
            await shoot_cover(page, 1080, 1080, 1080, 1080, REPO + "/screenshots/4-cover.jpg")
            print("page errors at end:", errors)
            await browser.close()
    finally:
        srv.terminate()
    # Verify the BUILT output (out/app) also exports cleanly.
    srv2 = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT2), "--directory", OUTAPP],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
            page = await browser.new_page()
            errs = []
            page.on("pageerror", lambda e: errs.append(str(e)))
            await page.goto(f"http://127.0.0.1:{PORT2}/index.html")
            await page.wait_for_function("window.CoverStudio && window.CoverStudio.ready", timeout=30000)
            await page.evaluate("window.CoverStudio.ready")
            r = await page.evaluate(CHECK_JS, [1080, 1080])
            assert r["ok"], "out/app export not PNG"
            print("out/app export 1080x1080 PNG ok | page errors:", errs)
            await browser.close()
    finally:
        srv2.terminate()


asyncio.run(main())
