"""Lupo PWA smoke test: walks onboarding, exercises the daily loop, screenshots every screen.

Usage: python tools/verify.py  (serves docs/ on :8123, writes tools/shots/)
"""
import json
import threading
import functools
import http.server
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent / "docs"
SHOTS = Path(__file__).resolve().parent / "shots"
SHOTS.mkdir(exist_ok=True)
PORT = 8123

def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd

def main():
    serve()
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 390, "height": 844})  # iPhone-ish
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))

        page.goto(f"http://127.0.0.1:{PORT}/app.html")
        page.wait_for_timeout(1400)  # splash
        page.screenshot(path=str(SHOTS / "01-onboarding-intent.png"))

        # ── onboarding ──
        page.click('[data-intent="doomscrolling"]')
        page.click("#obNext")
        page.wait_for_timeout(300)
        page.screenshot(path=str(SHOTS / "02-onboarding-limit.png"))
        page.click("#obNext")
        page.wait_for_timeout(300)
        page.fill("#obName", "Fenrir")
        page.screenshot(path=str(SHOTS / "03-onboarding-name.png"))
        page.click("#obNext")
        page.wait_for_timeout(300)
        page.screenshot(path=str(SHOTS / "04-onboarding-feed.png"))
        page.click("#obNext")  # feed → first level-up
        page.wait_for_timeout(1600)
        page.screenshot(path=str(SHOTS / "05-home-after-onboarding.png"))

        # state checks after first feed (+20 XP → level 2)
        st = json.loads(page.evaluate("localStorage.getItem('lupo.v3')"))
        assert st["onboarded"] is True, "onboarded flag"
        assert st["name"] == "Fenrir", f"name carried: {st['name']}"
        assert st["xp"] == 20, f"first feed xp: {st['xp']}"
        assert st["limitMin"] == 180, f"default limit: {st['limitMin']}"

        # ── today tab: log under limit ──
        page.click('[data-screen="today"]')
        page.wait_for_timeout(400)
        page.screenshot(path=str(SHOTS / "06-today.png"))
        page.click("#keptBtn")
        page.wait_for_timeout(1200)
        page.screenshot(path=str(SHOTS / "07-today-kept.png"))
        st = json.loads(page.evaluate("localStorage.getItem('lupo.v3')"))
        assert st["streak"] == 1, f"streak after keep: {st['streak']}"
        assert st["xp"] == 70, f"xp after keep (20+50): {st['xp']}"
        assert st["hunt"] is not None, "hunt scheduled"

        # habit check (+10)
        page.click("[data-habit]")
        page.wait_for_timeout(900)
        st = json.loads(page.evaluate("localStorage.getItem('lupo.v3')"))
        assert st["xp"] == 80, f"xp after habit: {st['xp']}"

        # ── journey + den ──
        page.click('[data-screen="journey"]')
        page.wait_for_timeout(400)
        page.screenshot(path=str(SHOTS / "08-journey.png"))
        page.click('[data-screen="den"]')
        page.wait_for_timeout(400)
        page.screenshot(path=str(SHOTS / "09-den.png"))

        # ── home with everything done ──
        page.click('[data-screen="wolf"]')
        page.wait_for_timeout(400)
        page.screenshot(path=str(SHOTS / "10-home-done.png"))

        # ── XP math sanity straight from the module ──
        math_ok = page.evaluate("""async () => {
            const XP = await import('./js/xp.js');
            const r = {};
            r.step1 = XP.stepCost(1);          // ~19
            r.step150 = XP.stepCost(150);      // ~220 plateau
            r.step499 = XP.stepCost(499);
            r.total = XP.TOTAL_XP;             // ~95k
            r.lvl0 = XP.levelForXp(0);         // 1
            r.lvl100 = XP.levelForXp(10000);
            r.rank1 = XP.rankForLevel(1);      // Whelp
            r.rank101 = XP.rankForLevel(101);  // Yearling
            r.phase100 = XP.phaseForLevel(100);// Full Moon
            r.mk100 = XP.milestoneKind(100);   // rank
            r.mk25 = XP.milestoneKind(25);     // cosmetic
            r.mk5 = XP.milestoneKind(5);       // micro
            return r;
        }""")
        assert math_ok["step1"] == 19, math_ok
        assert 210 <= math_ok["step150"] <= 220, math_ok  # plateau: 214 at L150 → 220 by L499
        assert 80000 < math_ok["total"] < 115000, math_ok
        assert math_ok["lvl0"] == 1, math_ok
        assert math_ok["rank1"] == "Whelp" and math_ok["rank101"] == "Yearling", math_ok
        assert math_ok["phase100"] == "Full Moon", math_ok
        assert math_ok["mk100"] == "rank" and math_ok["mk25"] == "cosmetic" and math_ok["mk5"] == "micro", math_ok

        # ── simulate tomorrow: hunt resolves, discovery shows ──
        page.evaluate("""() => {
            const st = JSON.parse(localStorage.getItem('lupo.v3'));
            // shift yesterday: pretend everything happened a day earlier
            const oldDay = st.lastSeenDay;
            const d = new Date(); d.setDate(d.getDate() - 1);
            const shift = k => { const x = new Date(k + 'T12:00:00'); x.setDate(x.getDate() - 1);
                return x.getFullYear() + '-' + String(x.getMonth()+1).padStart(2,'0') + '-' + String(x.getDate()).padStart(2,'0'); };
            const days = {};
            Object.keys(st.days).forEach(k => days[shift(k)] = st.days[k]);
            st.days = days;
            st.lastSeenDay = shift(oldDay);
            st.hunt.day = shift(st.hunt.day);
            localStorage.setItem('lupo.v3', JSON.stringify(st));
        }""")
        page.reload()
        page.wait_for_timeout(1700)
        page.screenshot(path=str(SHOTS / "11-next-morning-discovery.png"))
        st = json.loads(page.evaluate("localStorage.getItem('lupo.v3')"))
        assert st["hunt"] is None, "hunt resolved"
        assert len(st["discoveries"]) == 1, f"discovery written: {st['discoveries']}"
        assert st["streak"] == 1, f"streak survives a kept yesterday: {st['streak']}"

        # ── missed-day freeze: jump 2 days with nothing logged ──
        page.evaluate("""() => {
            const st = JSON.parse(localStorage.getItem('lupo.v3'));
            const shift = k => { const x = new Date(k + 'T12:00:00'); x.setDate(x.getDate() - 2);
                return x.getFullYear() + '-' + String(x.getMonth()+1).padStart(2,'0') + '-' + String(x.getDate()).padStart(2,'0'); };
            const days = {};
            Object.keys(st.days).forEach(k => days[shift(k)] = st.days[k]);
            st.days = days;
            st.lastSeenDay = shift(st.lastSeenDay);
            localStorage.setItem('lupo.v3', JSON.stringify(st));
        }""")
        page.reload()
        page.wait_for_timeout(1700)
        st = json.loads(page.evaluate("localStorage.getItem('lupo.v3')"))
        assert st["freezes"] < 3, f"freeze consumed: {st['freezes']}"
        assert st["streak"] == 1, f"streak survived via freeze: {st['streak']}"
        page.screenshot(path=str(SHOTS / "12-after-freeze.png"))

        # ── high-level render check: force level 137 (Sub-Adult, Yearling) ──
        page.evaluate("""async () => {
            const XP = await import('./js/xp.js');
            const st = JSON.parse(localStorage.getItem('lupo.v3'));
            st.xp = XP.THRESHOLDS[137] + 5; st.seenLevel = 137;
            localStorage.setItem('lupo.v3', JSON.stringify(st));
        }""")
        page.reload()
        page.wait_for_timeout(1700)
        page.screenshot(path=str(SHOTS / "13-home-L137.png"))
        page.click('[data-screen="journey"]')
        page.wait_for_timeout(400)
        page.screenshot(path=str(SHOTS / "14-journey-L137.png"))
        page.click('[data-screen="den"]')
        page.wait_for_timeout(400)
        page.screenshot(path=str(SHOTS / "15-den-L137.png"))

        # ── v2 migration ──
        page.evaluate("""() => {
            localStorage.clear();
            localStorage.setItem('lupo.v2', JSON.stringify({
                onboarded: true, sound: true,
                pet: { name: 'Shadow', currentStreak: 9, bestStreak: 14, createdDate: '2026-04-01T00:00:00Z' },
                creditedDays: Array.from({length: 30}, (_, i) => '2026-05-' + String(i+1).padStart(2,'0')),
                habits: { screenTime: {enabled:true,target:2}, workout: {enabled:true,target:30}, read: {enabled:true,target:20} }
            }));
        }""")
        page.reload()
        page.wait_for_timeout(1700)
        page.screenshot(path=str(SHOTS / "16-v2-migration.png"))
        st = json.loads(page.evaluate("localStorage.getItem('lupo.v3')"))
        assert st["name"] == "Shadow", f"migrated name: {st['name']}"
        assert st["streak"] == 9 and st["bestStreak"] == 14, "migrated streaks"
        assert st["xp"] == 2700, f"migrated xp 30*90: {st['xp']}"
        assert st["limitMin"] == 120, f"migrated limit: {st['limitMin']}"
        assert st["onboarded"] is True, "migration skips onboarding"

        browser.close()

    bad = [e for e in errors if "favicon" not in e]
    if bad:
        print("CONSOLE ERRORS:")
        for e in bad:
            print(" -", e)
        raise SystemExit(1)
    print(f"ALL CHECKS PASSED · {len(list(SHOTS.glob('*.png')))} screenshots in {SHOTS}")

if __name__ == "__main__":
    main()
