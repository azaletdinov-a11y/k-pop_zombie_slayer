#!/usr/bin/env python3
"""Minimal Chrome DevTools Protocol client — pure stdlib.

There is no node, playwright or websocket library on this machine, so this
implements just enough of the WebSocket framing to drive Chrome directly.
Used by verify.py to run the game in a real browser and observe it.
"""
import base64, json, os, socket, struct, subprocess, time, urllib.request

CANVAS_W, CANVAS_H = 800, 600


class WS:
    """Barebones WebSocket client (client->server frames are always masked)."""

    def __init__(self, url):
        assert url.startswith("ws://")
        hostport, _, path = url[5:].partition("/")
        host, _, port = hostport.partition(":")
        self.sock = socket.create_connection((host, int(port or 80)), timeout=60)
        # Without a timeout, a CDP call that never gets a reply blocks forever.
        self.sock.settimeout(60)
        key = base64.b64encode(os.urandom(16)).decode()
        self.sock.sendall(
            (f"GET /{path} HTTP/1.1\r\nHost: {hostport}\r\nUpgrade: websocket\r\n"
             f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\n"
             f"Sec-WebSocket-Version: 13\r\n\r\n").encode())
        buf = b""
        while b"\r\n\r\n" not in buf:
            buf += self.sock.recv(4096)
        self.buf = buf.split(b"\r\n\r\n", 1)[1]

    def send(self, data):
        payload = data.encode()
        n, mask = len(payload), os.urandom(4)
        header = bytearray([0x81])
        if n < 126:
            header.append(0x80 | n)
        elif n < 65536:
            header.append(0x80 | 126); header += struct.pack(">H", n)
        else:
            header.append(0x80 | 127); header += struct.pack(">Q", n)
        header += mask
        self.sock.sendall(bytes(header) + bytes(b ^ mask[i % 4] for i, b in enumerate(payload)))

    def _read(self, n):
        while len(self.buf) < n:
            chunk = self.sock.recv(65536)
            if not chunk:
                raise ConnectionError("socket closed")
            self.buf += chunk
        out, self.buf = self.buf[:n], self.buf[n:]
        return out

    def recv(self):
        _, b1 = self._read(2)
        length = b1 & 0x7F
        if length == 126:
            length = struct.unpack(">H", self._read(2))[0]
        elif length == 127:
            length = struct.unpack(">Q", self._read(8))[0]
        return self._read(length).decode("utf-8", "replace")


class CDP:
    def __init__(self, ws):
        self.ws, self.id, self.events = ws, 0, []

    def call(self, method, **params):
        self.id += 1
        mid = self.id
        self.ws.send(json.dumps({"id": mid, "method": method, "params": params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == mid:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})
            if "method" in msg:
                self.events.append(msg)

    def evaluate(self, expr):
        r = self.call("Runtime.evaluate", expression=expr,
                      returnByValue=True, awaitPromise=True)
        if "exceptionDetails" in r:
            d = r["exceptionDetails"]
            return {"__exc__": (d.get("exception") or {}).get("description") or d.get("text")}
        return r.get("result", {}).get("value")


# ---- input helpers -------------------------------------------------------

def canvas_point(cdp, cx, cy):
    """Logical 800x600 canvas point -> viewport point.

    Mirrors Input._toCanvas: the drawing surface is the CONTENT box, inset by
    the CSS border, and may be displayed smaller than logical size.
    """
    g = cdp.evaluate("""(()=>{const c=document.getElementById('game');
      const r=c.getBoundingClientRect();
      return {l:r.left,t:r.top,bl:c.clientLeft,bt:c.clientTop,
              w:c.clientWidth,h:c.clientHeight};})()""")
    return (g["l"] + g["bl"] + cx * (g["w"] / CANVAS_W),
            g["t"] + g["bt"] + cy * (g["h"] / CANVAS_H))


def move_mouse(cdp, x, y):
    cdp.call("Input.dispatchMouseEvent", type="mouseMoved", x=x, y=y)


def click(cdp, x, y, dwell=0.10):
    """Hold long enough that the fixed-timestep loop sees the pressed edge."""
    cdp.call("Input.dispatchMouseEvent", type="mousePressed", x=x, y=y,
             button="left", clickCount=1, buttons=1)
    time.sleep(dwell)
    cdp.call("Input.dispatchMouseEvent", type="mouseReleased", x=x, y=y,
             button="left", clickCount=1, buttons=0)
    time.sleep(0.05)


def key(cdp, k, code, vk, down):
    cdp.call("Input.dispatchKeyEvent", type="keyDown" if down else "keyUp",
             key=k, code=code, windowsVirtualKeyCode=vk, nativeVirtualKeyCode=vk)


def tap_key(cdp, k, code, vk):
    key(cdp, k, code, vk, True); time.sleep(0.08); key(cdp, k, code, vk, False)


def touch(cdp, kind, points):
    """points = [(id, x, y), ...]; touchEnd with [] releases everything."""
    cdp.call("Input.dispatchTouchEvent", type=kind,
             touchPoints=[{"x": x, "y": y, "id": i} for (i, x, y) in points])


def tap(cdp, cx, cy, hold=0.14):
    x, y = canvas_point(cdp, cx, cy)
    touch(cdp, "touchStart", [(1, x, y)]); time.sleep(hold)
    touch(cdp, "touchEnd", []); time.sleep(0.2)


def pump(cdp, frames=2):
    """Прогнать несколько кадров игрового цикла.

    В headless Chrome requestAnimationFrame замирает, когда отрисовку никто не
    запрашивает: состояние игры перестаёт меняться, хотя fps/state выглядят
    нормально. Запрос кадра будит compositor и двигает цикл. Дешёвый jpeg
    quality=1 — нам нужен сам кадр, а не картинка.
    """
    for _ in range(frames):
        try:
            cdp.call("Page.captureScreenshot", format="jpeg", quality=1)
        except RuntimeError:
            return  # страница ещё навигируется — кадра пока нет, это нормально


def screenshot(cdp, path):
    data = cdp.call("Page.captureScreenshot", format="png")["data"]
    with open(path, "wb") as f:
        f.write(base64.b64decode(data))
    return path


def console_errors(cdp):
    """Game errors only — browser-extension noise is filtered out."""
    out = []
    for e in cdp.events:
        m = e.get("method")
        if m == "Runtime.consoleAPICalled" and e["params"].get("type") in ("error", "warning"):
            txt = " ".join(str(a.get("value", a.get("description", "")))
                           for a in e["params"]["args"])
            out.append(f"[{e['params']['type']}] {txt}")
        elif m == "Runtime.exceptionThrown":
            d = e["params"]["exceptionDetails"]
            out.append("[exception] " + ((d.get("exception") or {}).get("description")
                                         or d.get("text", "")))
    return [e for e in out if "chrome-extension" not in e]
