"""Record the ~10s Lupo early-access preview + full-body proof shots of all 5 stages.

Usage: python tools/preview_video.py
Outputs: tools/out/lupo-preview.mp4 (1080x1920) + tools/shots/stage-*.png
"""
import functools
import http.server
import json
import shutil
import subprocess
import threading
from pathlib import Path

import imageio_ffmpeg
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent / "docs"
OUT = Path(__file__).resolve().parent / "out"
SHOTS = Path(__file__).resolve().parent / "shots"
OUT.mkdir(exist_ok=True)
SHOTS.mkdir(exist_ok=True)
PORT = 8124

def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()


# state with yesterday kept (wolf waiting, streak alive) and XP one log away from evolving
SEED = """async (cfg) => {
    const XP = await import('./js/xp.js');
    const today = (() => { const d = new Date(Date.now() - 4*3600000);
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); })();
    const yest = (() => { const d = new Date(Date.now() - 28*3600000);
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); })();
    const st = {
        v: 3, onboarded: true, intent: 'doomscrolling', name: 'Lupo',
        createdAt: new Date(Date.now() - 40*86400000).toISOString(),
        xp: cfg.xp != null ? cfg.xp : (XP.THRESHOLDS[41] - 30),
        cycle: 0, seenLevel: 999,
        days: { [yest]: { checkin: true, under: true, habits: {}, rest: false, frozen: false, xp: 100 } },
        lastSeenDay: today, streak: cfg.streak != null ? cfg.streak : 6, bestStreak: 12,
        freezes: 3, freezeMonth: today.slice(0,7), limitMin: 180,
        habits: ['workout','read','water'], hunt: null,
        discoveries: [{ day: yest, rarity: 'common', icon: '\\u{1F9B4}', text: 'Lupo dug up an old bone and carried it home, very pleased.' }],
        equipped: { env: cfg.env || null, aura: null, frame: null },
        packHall: [], sound: false, welcomedBack: true, migratedFromV2: false,
    };
    st.seenLevel = XP.levelForXp(st.xp);
    localStorage.setItem('lupo.v3', JSON.stringify(st));
}"""


def stage_proofs(browser):
    """Force each art stage and screenshot the wolf card. View these by eye."""
    levels = [(5, "newborn"), (25, "youngpup"), (80, "adolescent"), (200, "subadult"), (400, "adult")]
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page.goto(f"http://127.0.0.1:{PORT}/app.html")
    page.wait_for_timeout(400)
    for lvl, name in levels:
        page.evaluate(f"""async () => {{
            const XP = await import('./js/xp.js');
            await ({SEED})({{ xp: XP.THRESHOLDS[{lvl}] + 1, streak: 6 }});
        }}""")
        page.reload()
        page.wait_for_timeout(1500)
        page.locator(".wolf-card").screenshot(path=str(SHOTS / f"stage-{name}-L{lvl}.png"))
    page.close()


def step_cost(L):
    import math
    return round(10 + 210 / (1 + math.exp(-0.045 * (L - 70))))

def threshold(level):
    return sum(step_cost(L) for L in range(1, level))

def record(browser):
    # Playwright never upscales video â€” record at viewport size, upscale 2x in ffmpeg.
    ctx = browser.new_context(
        viewport={"width": 540, "height": 960},          # 9:16
        record_video_dir=str(OUT),
        record_video_size={"width": 540, "height": 960},
        device_scale_factor=2,
    )
    # seed state BEFORE first load so the recording opens straight on the splash
    xp = threshold(41) - 30
    ctx.add_init_script(f"""
        if (!localStorage.getItem('lupo.v3')) {{
            (function() {{
                const now = Date.now();
                const dk = ms => {{ const d = new Date(ms - 4*3600000);
                    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }};
                const today = dk(now), yest = dk(now - 86400000);
                localStorage.setItem('lupo.v3', JSON.stringify({{
                    v: 3, onboarded: true, intent: 'doomscrolling', name: 'Lupo',
                    createdAt: new Date(now - 40*86400000).toISOString(),
                    xp: {xp}, cycle: 0, seenLevel: 40,
                    days: {{ [yest]: {{ checkin: true, under: true, habits: {{}}, rest: false, frozen: false, xp: 100 }} }},
                    lastSeenDay: today, streak: 6, bestStreak: 12,
                    freezes: 3, freezeMonth: today.slice(0,7), limitMin: 180,
                    habits: ['workout','read','water'], hunt: null,
                    discoveries: [{{ day: yest, rarity: 'common', icon: '\\u{{1F9B4}}', text: 'Lupo dug up an old bone and carried it home, very pleased.' }}],
                    equipped: {{ env: 'env-forest', aura: null, frame: null }},
                    packHall: [], sound: false, welcomedBack: true, migratedFromV2: false,
                }}));
            }})();
        }}
    """)
    page = ctx.new_page()
    page.goto(f"http://127.0.0.1:{PORT}/app.html")  # splash = the opening title card
    page.wait_for_timeout(1900) # splash out + home reveal + a beat of idle breathing

    page.click("#feedBtn")             # feed: bounce + confetti + toast
    page.wait_for_timeout(1900)

    page.click('[data-screen="today"]')
    page.wait_for_timeout(1100)
    page.click("#keptBtn")             # +63 XP â†’ L41 â†’ EVOLUTION ceremony fires
    page.wait_for_timeout(3200)        # crouch â†’ burst â†’ confetti â†’ settle

    page.click('[data-act="ok"]')      # CONTINUE on the evolution overlay
    page.wait_for_timeout(700)
    page.click('[data-screen="wolf"]') # adolescent wolf, line-held chip
    page.wait_for_timeout(1500)
    page.click('[data-screen="journey"]')
    page.wait_for_timeout(1700)        # LV 41 hero + roadmap, hold to end

    page.close()
    video_path = Path(page.video.path())
    ctx.close()
    return video_path


def main():
    serve()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        stage_proofs(browser)
        webm = record(browser)
        browser.close()

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    mp4 = OUT / "lupo-preview.mp4"
    # measure the raw take, then speed it so the final cut lands at ~10s
    probe_raw = subprocess.run([ffmpeg, "-i", str(webm)], capture_output=True, text=True)
    import re
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", probe_raw.stderr)
    raw_s = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)) if m else 13.0
    factor = min(1.7, max(1.0, raw_s / 10.2))
    subprocess.run([
        ffmpeg, "-y", "-i", str(webm),
        "-vf", f"setpts=PTS/{factor:.3f},fps=30,scale=1080:1920:flags=lanczos",
        "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", "-an", str(mp4),
    ], check=True, capture_output=True)
    webm.unlink()

    # QA frames to view by eye
    for t in ("1", "4", "6.5", "9"):
        subprocess.run([ffmpeg, "-y", "-ss", t, "-i", str(mp4), "-frames:v", "1",
                        str(OUT / f"frame-{t.replace('.', '_')}s.png")], check=True, capture_output=True)

    probe = subprocess.run([ffmpeg, "-i", str(mp4)], capture_output=True, text=True)
    dur = [l for l in probe.stderr.splitlines() if "Duration" in l]
    size_mb = mp4.stat().st_size / 1e6
    print(f"OK {mp4} Â· {size_mb:.1f} MB Â· {dur[0].strip() if dur else '?'}")

if __name__ == "__main__":
    main()

