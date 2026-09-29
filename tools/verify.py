#!/usr/bin/env python3
"""Drive the real game in a real browser and check it works.

    python3 tools/verify.py            # desktop + mobile
    python3 tools/verify.py desktop
    python3 tools/verify.py mobile
    python3 tools/verify.py shot out.png

Starts its own static server and headless Chrome, and shuts both down after.
Screenshots land in tools/_shots/.

Flags deliberately NOT passed to Chrome, each having hidden a real bug before:
  --mute-audio                            hid broken audio for a month
  --autoplay-policy=no-user-gesture-...   fakes a successful audio unlock
"""
import math, os, shutil, signal, subprocess, sys, time, urllib.request, json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SHOTS = os.path.join(HERE, "_shots")
PORT, DPORT = 8137, 9222
URL = f"http://localhost:{PORT}/index.html"
sys.path.insert(0, HERE)
from cdp import (WS, CDP, canvas_point, click, move_mouse, key, tap_key,
                 touch, tap, screenshot, console_errors, pump)

CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    shutil.which("google-chrome") or "", shutil.which("chromium") or "",
]
PROFILE = "/tmp/kzs-verify-profile"
_procs = []
FAILURES = []


def check(label, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {label}" + (f"  — {detail}" if detail else ""))
    if not ok:
        FAILURES.append(label)
    return ok


def start_everything():
    chrome = next((c for c in CHROME_CANDIDATES if c and os.path.exists(c)), None)
    if not chrome:
        sys.exit("No Chrome/Chromium/Edge found — install one to run browser checks.")
    _procs.append(subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT)], cwd=ROOT,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
    shutil.rmtree(PROFILE, ignore_errors=True)
    _procs.append(subprocess.Popen(
        [chrome, "--headless=new", "--disable-gpu", f"--remote-debugging-port={DPORT}",
         "--window-size=1400,900", "--hide-scrollbars",
         f"--user-data-dir={PROFILE}", "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
    for _ in range(60):                     # Chrome can take several seconds
        time.sleep(0.5)
        try:
            urllib.request.urlopen(f"http://localhost:{DPORT}/json/version", timeout=2)
            break
        except Exception:
            pass
    else:
        stop_everything(); sys.exit("Chrome never opened its debugging port.")
    targets = json.loads(urllib.request.urlopen(f"http://localhost:{DPORT}/json").read())
    page = next(t for t in targets if t["type"] == "page")
    c = CDP(WS(page["webSocketDebuggerUrl"]))
    for m in ("Page.enable", "Runtime.enable", "Log.enable", "Network.enable"):
        c.call(m)
    # Without this you silently test a mix of cached and fresh JS.
    c.call("Network.setCacheDisabled", cacheDisabled=True)
    return c


def stop_everything():
    for p in _procs:
        try: p.send_signal(signal.SIGTERM); p.wait(timeout=5)
        except Exception:
            try: p.kill()
            except Exception: pass
    shutil.rmtree(PROFILE, ignore_errors=True)


def viewport(c, w, h, mobile):
    c.call("Emulation.setDeviceMetricsOverride", width=w, height=h,
           deviceScaleFactor=2 if mobile else 1, mobile=mobile)
    c.call("Emulation.setTouchEmulationEnabled", enabled=mobile, maxTouchPoints=5)
    # Переключение режима ввода применяется не мгновенно: без паузы первый
    # dispatchTouchEvent после смены десктоп -> мобила не получает ответа.
    time.sleep(1.0)


def load(c):
    c.call("Page.navigate", url=URL)
    # Цикл стартует только после Assets.load, а fps растёт только если
    # requestAnimationFrame реально идёт — в headless его надо подталкивать.
    for _ in range(60):
        pump(c)
        time.sleep(0.25)
        if c.evaluate("typeof fps !== 'undefined' && fps > 0"):
            return True
    return False


def card_centre(c, idx=1):
    """Aim at the CENTRE of a difficulty card — the first matching pixel is a
    corner, sitting exactly on an inclusive boundary, and misses."""
    return c.evaluate(f"(()=>{{const r=_diffCardRect({idx});"
                      f"return {{x:r.x+r.w/2,y:r.y+r.h/2}};}})()")


def click_until(c, cx, cy, expect, tries=8):
    x, y = canvas_point(c, cx, cy)
    for _ in range(tries):
        move_mouse(c, x, y); click(c, x, y); pump(c); time.sleep(0.25); pump(c)
        if c.evaluate("game.state") == expect:
            return True
    return False


def tap_until(c, cx, cy, expect, tries=8):
    for _ in range(tries):
        tap(c, cx, cy); pump(c); time.sleep(0.2); pump(c)
        if c.evaluate("game.state") == expect:
            return True
    return False


def deg(r):
    return round(math.degrees(r)) if isinstance(r, (int, float)) else None


def near(a, b, tol=12):
    return a is not None and min(abs(a - b), 360 - abs(a - b)) <= tol


# ---------------------------------------------------------------- desktop ---
def desktop(c):
    print("\nDESKTOP (1400x900, mouse + keyboard)")
    viewport(c, 1400, 900, False)
    check("game loop starts", load(c))
    size = c.evaluate("(()=>{const s=document.getElementById('game').style;"
                      "return s.width+' x '+s.height;})()")
    check("canvas renders 1:1 at 800x600", size == "800px x 600px", str(size))
    check("all assets load", c.evaluate("Object.keys(Assets.images).every(k=>Assets.ready(k))"))

    x, y = canvas_point(c, 400, 300); move_mouse(c, x, y); time.sleep(0.15)
    m = c.evaluate("({x:Math.round(Input.mouse.x),y:Math.round(Input.mouse.y)})")
    check("pointer maps exactly to logical coords", m == {"x": 400, "y": 300}, str(m))

    check("title -> difficulty", click_until(c, 400, 300, "difficulty"))
    cc = card_centre(c, 1)
    check("difficulty -> playing", click_until(c, cc["x"], cc["y"], "playing"))
    c.evaluate("game._autoPause=function(){};if(game.state==='paused')game.state='playing';")

    check("audio unlocked by a real click", c.evaluate("Sfx.state") == "running",
          str(c.evaluate("Sfx.state")))
    check("audio actually audible", c.evaluate("Sfx.audible") is True,
          f"volume={c.evaluate('Sfx.getVolume()')}")

    # Пустая арена и неубиваемый игрок — разово, без таймеров: висящий
    # setInterval здесь глушил requestAnimationFrame и игра замирала.
    c.evaluate("game.player.maxHp=99999;game.player.hp=99999;")
    c.evaluate("game.player.x=400;game.player.y=300;")
    x0 = c.evaluate("Math.round(game.player.x)")
    key(c, "d", "KeyD", 68, True); pump(c, 6); time.sleep(0.4); pump(c, 6)
    key(c, "d", "KeyD", 68, False)
    check("WASD moves the player", c.evaluate("Math.round(game.player.x)") > x0)

    c.evaluate("game.player.x=400;game.player.y=300;")
    for label, (px, py), want in (("right", (700, 300), 0), ("left", (100, 300), 180),
                                  ("up", (400, 100), -90)):
        mx, my = canvas_point(c, px, py); move_mouse(c, mx, my)
        pump(c); time.sleep(0.2); pump(c)
        got = deg(c.evaluate("game.player.facing"))
        check(f"mouse aim {label}", near(got, want), f"got={got} want={want}")

    check("still playing (not dead)", c.evaluate("game.state") == "playing",
          str(c.evaluate("game.state")))
    check("no touch overlay on desktop", c.evaluate("Input.touchActive") is False)
    screenshot(c, os.path.join(SHOTS, "desktop.png"))


# ----------------------------------------------------------------- mobile ---
def mobile(c):
    print("\nMOBILE (844x390 landscape, touch)")
    viewport(c, 844, 390, True)
    check("game loop starts", load(c))
    check("canvas scales down to fit", c.evaluate("document.getElementById('game').clientWidth") < 800)

    check("tap starts the game", tap_until(c, 400, 300, "difficulty"))
    check("touch controls activate", c.evaluate("Input.touchActive") is True)
    cc = card_centre(c, 1)
    check("tap picks difficulty", tap_until(c, cc["x"], cc["y"], "playing"))
    c.evaluate("game._autoPause=function(){};if(game.state==='paused')game.state='playing';")
    # Пустая арена, игрок практически неубиваем, и волна НЕ должна читаться
    # как зачищенная (иначе игра уйдёт в экран выбора перка).
    c.evaluate("""game.zombies=[];game.waveTotal=99999;game.waveSpawned=0;
      game.player.maxHp=99999;game.player.hp=99999;
      game.player.x=400;game.player.y=300;""")

    ox, oy = canvas_point(c, 180, 300)
    touch(c, "touchStart", [(1, ox, oy)]); time.sleep(0.1)
    dx, dy = canvas_point(c, 260, 300)
    touch(c, "touchMove", [(1, dx, dy)]); pump(c, 4); time.sleep(0.4); pump(c, 4)
    check("left stick moves player", c.evaluate("Math.round(game.player.x)") > 400)
    check("facing follows movement", near(deg(c.evaluate("game.player.facing")), 0))
    touch(c, "touchEnd", []); pump(c); time.sleep(0.2)
    check("stick releases cleanly", c.evaluate("Input.move.active") is False)

    c.evaluate("game.player.energy=ENERGY_MAX;game.projectiles.length=0;game.player.x=400;game.player.y=300;")
    ax, ay = canvas_point(c, 620, 300)
    touch(c, "touchStart", [(2, ax, ay)]); time.sleep(0.1)
    bx, by = canvas_point(c, 620, 220)
    touch(c, "touchMove", [(2, bx, by)]); pump(c, 4); time.sleep(0.4); pump(c, 4)
    check("right stick aims up", near(deg(c.evaluate("game.player.facing")), -90))
    check("right stick auto-fires", c.evaluate("game.projectiles.length") > 0)
    touch(c, "touchEnd", []); pump(c); time.sleep(0.2)
    check("fire stops on release", c.evaluate("Input.fire") is False)

    for label, btn, expr in (("MIC (melee)", "TOUCH_BTN_MELEE", "Input.melee"),
                             ("DASH", "TOUCH_BTN_DASH", "Input.keys.space")):
        b = c.evaluate(f"({{x:{btn}.x,y:{btn}.y}})")
        bx, by = canvas_point(c, b["x"], b["y"])
        touch(c, "touchStart", [(3, bx, by)]); pump(c); time.sleep(0.2); pump(c)
        held = c.evaluate(expr)
        touch(c, "touchEnd", []); time.sleep(0.15)
        check(f"{label} button", held is True and c.evaluate(expr) is False)

    b = c.evaluate("({x:TOUCH_BTN_PAUSE.x,y:TOUCH_BTN_PAUSE.y})")
    bx, by = canvas_point(c, b["x"], b["y"])
    touch(c, "touchStart", [(4, bx, by)]); pump(c); time.sleep(0.2)
    touch(c, "touchEnd", []); pump(c); time.sleep(0.3); pump(c)
    check("pause button", c.evaluate("game.state") == "paused",
          str(c.evaluate("game.state")))
    c.evaluate("if(game.state==='paused')game.state='playing';")
    screenshot(c, os.path.join(SHOTS, "mobile.png"))


def main():
    os.makedirs(SHOTS, exist_ok=True)
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"

    # Каждый режим — отдельным процессом со своим Chrome. Переключение
    # эмуляции десктоп -> мобила в одной вкладке оставляет её в состоянии,
    # где dispatchTouchEvent перестаёт отвечать; по отдельности оба надёжны.
    if mode == "all":
        rc = 0
        for m in ("desktop", "mobile"):
            rc |= subprocess.run([sys.executable, "-u", __file__, m]).returncode
        print("\n" + ("ALL CHECKS PASSED" if rc == 0 else "SOME CHECKS FAILED"))
        sys.exit(rc)

    c = start_everything()
    try:
        if mode == "shot":
            out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(SHOTS, "shot.png")
            viewport(c, 1400, 900, False); load(c); time.sleep(0.5)
            print("saved", screenshot(c, out)); return
        if mode in ("all", "desktop"): desktop(c)
        if mode in ("all", "mobile"):  mobile(c)
        errs = console_errors(c)
        print()
        check("no console errors", len(errs) == 0, "; ".join(errs[:3]))
        print(f"\n{'ALL CHECKS PASSED' if not FAILURES else 'FAILED: ' + ', '.join(FAILURES)}")
        print(f"screenshots: {SHOTS}")
    finally:
        stop_everything()
    sys.exit(1 if FAILURES else 0)


if __name__ == "__main__":
    main()
