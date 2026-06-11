"""Screenshot every Lupo screen in every state for the by-eye polish pass.

Usage: python tools/polish_shots.py [--only name1,name2]
Writes tools/polish/<name>.png at 390x844.
"""
import functools
import http.server
import json
import math
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent / "docs"
OUT = Path(__file__).resolve().parent / "polish"
OUT.mkdir(exist_ok=True)
PORT = 8125

def step_cost(L):
    return round(10 + 210 / (1 + math.exp(-0.045 * (L - 70))))

def threshold(level):
    return sum(step_cost(L) for L in range(1, level))

def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()

def base_state(**over):
    st = {
        "v": 3, "onboarded": True, "intent": "doomscrolling", "name": "Lupo",
        "createdAt": "2026-05-01T00:00:00Z",
        "xp": threshold(8), "cycle": 0, "seenLevel": 8,
        "days": {}, "lastSeenDay": None,  # lastSeenDay=None fills with today on load
        "streak": 4, "bestStreak": 9, "freezes": 3, "freezeMonth": None,
        "limitMin": 180, "habits": ["workout", "read", "water"],
        "hunt": None, "discoveries": [], "equipped": {"env": None, "aura": None, "frame": None},
        "packHall": [], "sound": False, "welcomedBack": True, "migratedFromV2": False,
    }
    st.update(over)
    return st

DAY_JS = """(off) => { const d = new Date(Date.now() - 4*3600000 + off*86400000);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }"""

def day_rec(checkin=False, under=None, habits=None, rest=False, frozen=False, xp=0):
    return {"checkin": checkin, "under": under, "habits": habits or {}, "rest": rest, "frozen": frozen, "xp": xp}

# each scene: (name, state-dict or None, day-offset records, tab, pre-shot actions)
def scenes():
    L41 = threshold(41)
    S = []
    # home moods
    S.append(("home-waiting", base_state(), {}, "wolf", None))
    S.append(("home-happy", base_state(), {0: day_rec(checkin=True, xp=20)}, "wolf", None))
    S.append(("home-proud", base_state(streak=7, hunt={"day": "TODAY", "resolved": False}),
              {0: day_rec(checkin=True, under=True, xp=83)}, "wolf", None))
    S.append(("home-over", base_state(), {0: day_rec(checkin=True, under=False, xp=20)}, "wolf", None))
    S.append(("home-drooping", base_state(streak=0, freezes=0),
              {-2: day_rec(checkin=True, under=True, xp=90), -1: day_rec()}, "wolf", None))
    S.append(("home-lonely", base_state(streak=0), {-4: day_rec(checkin=True, under=True, xp=70)}, "wolf", None))
    S.append(("home-resting", base_state(), {0: day_rec(rest=True)}, "wolf", None))
    S.append(("home-cozy", base_state(streak=5, freezes=2), {-1: day_rec(frozen=True), -2: day_rec(under=True, checkin=True, xp=90)}, "wolf", None))
    S.append(("home-maxlevel", base_state(xp=threshold(500) + 99, seenLevel=500, streak=88, bestStreak=120,
              equipped={"env": "env-cosmos", "aura": "aura-mythic", "frame": "frame-runic"}), {}, "wolf", None))
    S.append(("home-longname", base_state(name="Maximilian Fenrir"), {}, "wolf", None))
    # today states
    S.append(("today-fresh", base_state(), {}, "today", None))
    S.append(("today-kept", base_state(streak=7), {0: day_rec(checkin=True, under=True, habits={"workout": True}, xp=93)}, "today", None))
    S.append(("today-rest", base_state(), {0: day_rec(rest=True)}, "today", None))
    S.append(("today-over", base_state(freezes=1), {0: day_rec(checkin=True, under=False, xp=20)}, "today", None))
    S.append(("today-history", base_state(streak=3, freezes=2),
              {0: day_rec(), -1: day_rec(under=True, checkin=True, xp=90), -2: day_rec(rest=True),
               -3: day_rec(frozen=True), -4: day_rec(under=True, xp=50), -5: day_rec(), -6: day_rec(under=True, xp=50)}, "today", None))
    # journey
    S.append(("journey-low", base_state(), {}, "journey", None))
    S.append(("journey-high", base_state(xp=threshold(437) + 10, seenLevel=437, streak=45, bestStreak=80,
              equipped={"env": "env-aurora", "aura": "aura-gold", "frame": "frame-gold"}), {}, "journey", None))
    S.append(("journey-max", base_state(xp=threshold(500), seenLevel=500), {}, "journey", None))
    S.append(("journey-cycle2", base_state(xp=threshold(120), seenLevel=120, cycle=1,
              packHall=[{"name": "Lupo", "cycle": 0, "level": 500, "date": "2026-06-01"}]), {}, "journey", None))
    # den
    S.append(("den-empty", base_state(), {}, "den", None))
    S.append(("den-rich", base_state(xp=threshold(300), seenLevel=300,
              equipped={"env": "env-desert", "aura": "aura-violet", "frame": "frame-moon"},
              discoveries=[
                  {"day": "2026-06-10", "rarity": "legendary", "icon": "🐺", "text": "Lupo met an old white wolf on the ridge. They spoke. He won't say about what."},
                  {"day": "2026-06-09", "rarity": "rare", "icon": "✨", "text": "A fleck of silver appeared in Lupo's coat overnight. It was not there before."},
                  {"day": "2026-06-08", "rarity": "journal", "icon": "📜", "text": "Lupo learned the smell of rain before it falls."},
                  {"day": "2026-06-07", "rarity": "common", "icon": "🦴", "text": "Lupo dug up an old bone and carried it home, very pleased."},
              ]), {}, "den", None))
    # overlays via real triggers
    S.append(("overlay-settings", base_state(), {}, "wolf", "settings"))
    S.append(("overlay-limit", base_state(), {}, "today", "limit"))
    S.append(("overlay-habits", base_state(), {}, "today", "habits"))
    S.append(("overlay-evolution", base_state(xp=L41 - 5, seenLevel=40), {0: day_rec(checkin=True, xp=20)}, "today", "habit-award"))
    S.append(("overlay-cosmetic", base_state(xp=threshold(25) - 5, seenLevel=24), {0: day_rec(checkin=True, xp=20)}, "today", "habit-award"))
    S.append(("overlay-rank", base_state(xp=threshold(100) - 5, seenLevel=99), {0: day_rec(checkin=True, xp=20)}, "today", "habit-award"))
    S.append(("overlay-discovery", base_state(hunt={"day": "YESTERDAY", "resolved": False}, streak=3),
              {-1: day_rec(under=True, checkin=True, xp=90)}, "wolf", None))
    S.append(("sharecard", base_state(xp=threshold(137), seenLevel=137, streak=21), {}, "wolf", "sharecard"))
    return S

def main():
    only = None
    if len(sys.argv) > 2 and sys.argv[1] == "--only":
        only = set(sys.argv[2].split(","))
    serve()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.goto(f"http://127.0.0.1:{PORT}/app.html")
        page.wait_for_timeout(300)
        for name, st, days, tab, action in scenes():
            if only and name not in only:
                continue
            page.evaluate(f"""(args) => {{
                const dk = {DAY_JS};
                const st = args.st;
                const days = {{}};
                for (const [off, rec] of Object.entries(args.days)) days[dk(Number(off))] = rec;
                st.days = days;
                st.lastSeenDay = dk(0);
                if (st.hunt && st.hunt.day === 'TODAY') st.hunt.day = dk(0);
                if (st.hunt && st.hunt.day === 'YESTERDAY') st.hunt.day = dk(-1);
                localStorage.clear();
                localStorage.setItem('lupo.v3', JSON.stringify(st));
            }}""", {"st": st, "days": {str(k): v for k, v in days.items()}})
            page.reload()
            page.wait_for_timeout(1500)
            if tab != "wolf":
                page.click(f'[data-screen="{tab}"]')
                page.wait_for_timeout(500)
            if action == "settings":
                page.click("#gearBtn"); page.wait_for_timeout(600)
            elif action == "limit":
                page.click("#editLimit"); page.wait_for_timeout(600)
            elif action == "habits":
                page.click("#editHabits"); page.wait_for_timeout(600)
            elif action == "habit-award":
                page.click("[data-habit]"); page.wait_for_timeout(2600)
            elif action == "sharecard":
                page.evaluate("""async () => {
                    const { buildCard } = await import('./js/sharecard.js');
                    const c = await buildCard();
                    c.style.cssText = 'position:fixed;inset:0;z-index:99999;width:100%;height:auto;background:#000;';
                    document.body.appendChild(c);
                }""")
                page.wait_for_timeout(800)
            page.screenshot(path=str(OUT / f"{name}.png"))
        browser.close()
    print(f"OK {len(list(OUT.glob('*.png')))} shots in {OUT}")

if __name__ == "__main__":
    main()
