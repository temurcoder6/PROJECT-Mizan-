"""Xavfsiz hudud - Telegram bot.

Ob-havo ma'lumotini Open-Meteo API dan oladi, hududda xavf
ko'tarilsa obunachilarga xabar yuboradi.
"""
import os
import sqlite3
import time

import requests

# ---------- Sozlamalar ----------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def load_env(path):
    """.env faylini o'qiydi (python-dotenv kerak emas)."""
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip())


load_env(os.path.join(BASE_DIR, ".env"))

TOKEN = os.getenv("BOT_TOKEN", "")
ADMIN_ID = int(os.getenv("ADMIN_ID", "0") or 0)  # /sinov buyrug'i faqat shu ID uchun
if not TOKEN:
    raise SystemExit("BOT_TOKEN topilmadi. .env faylga BOT_TOKEN=... yozing.")

API = f"https://api.telegram.org/bot{TOKEN}"
DB_PATH = os.path.join(BASE_DIR, "subs.db")
CHECK_EVERY = 3600  # har 1 soatda tekshiradi (sekund)

# Koordinatalar taxminiy. Haqiqiy loyihada rasmiy manbadan tekshirib oling.
REGIONS = {
    "chiroqchi": ("Chiroqchi tumani", 38.97, 65.59),
    "qarshi": ("Qarshi shahri", 38.86, 65.79),
    "shahrisabz": ("Shahrisabz shahri", 39.06, 66.83),
}

LEVEL_TEXT = {
    "high": "⚠️ YUQORI XAVF",
    "mid": "🟡 O'RTACHA XAVF",
    "low": "✅ Xavf yo'q",
}


# ---------- Ma'lumotlar bazasi ----------
def open_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS subs ("
        "chat_id INTEGER PRIMARY KEY, region TEXT, last_level TEXT)"
    )
    conn.commit()
    return conn


# ---------- Telegram ----------
def tg(method, **params):
    r = requests.post(f"{API}/{method}", json=params, timeout=40)
    return r.json()


def send(chat_id, text):
    tg("sendMessage", chat_id=chat_id, text=text)


# ---------- Ob-havo va xavf ----------
def get_weather(lat, lon):
    r = requests.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": lat,
            "longitude": lon,
            "hourly": "precipitation,wind_speed_10m",
            "forecast_days": 1,
            "timezone": "auto",
            "wind_speed_unit": "ms",
        },
        timeout=20,
    )
    r.raise_for_status()
    hourly = r.json()["hourly"]
    rain_mm = sum(hourly["precipitation"])  # keyingi 24 soat jami
    wind_ms = max(hourly["wind_speed_10m"])  # keyingi 24 soatdagi eng kuchli shamol
    return rain_mm, wind_ms


def risk_level(rain_mm, wind_ms):
    # Chegaralar taxminiy. Haqiqiy loyihada rasmiy mezonlardan foydalaning.
    if rain_mm >= 50 or wind_ms >= 20:
        return "high"
    if rain_mm >= 20 or wind_ms >= 12:
        return "mid"
    return "low"


def region_report(key):
    name, lat, lon = REGIONS[key]
    rain_mm, wind_ms = get_weather(lat, lon)
    level = risk_level(rain_mm, wind_ms)
    text = (
        f"{LEVEL_TEXT[level]} — {name}\n"
        f"Keyingi 24 soat: yomg'ir ~{rain_mm:.0f} mm, shamol {wind_ms:.0f} m/s\n\n"
        "Manba: Open-Meteo. Rasmiy ogohlantirishlarga ham quloq soling."
    )
    return level, text


# ---------- Buyruqlar ----------
def handle(conn, chat_id, text):
    parts = text.split(maxsplit=1)
    cmd = parts[0].lower().split("@")[0]
    arg = parts[1].strip().lower() if len(parts) > 1 else ""

    if cmd == "/start":
        send(
            chat_id,
            "Assalomu alaykum! \"Xavfsiz hudud\" botiga xush kelibsiz.\n\n"
            "Hududni tanlang:\n"
            "/hudud chiroqchi\n/hudud qarshi\n/hudud shahrisabz\n\n"
            "/check — hozirgi xavf\n/stop — obunani bekor qilish",
        )

    elif cmd == "/hudud":
        if arg not in REGIONS:
            send(chat_id, "Noto'g'ri hudud. Variantlar: " + ", ".join(REGIONS))
            return
        conn.execute(
            "INSERT OR REPLACE INTO subs (chat_id, region, last_level) VALUES (?, ?, 'low')",
            (chat_id, arg),
        )
        conn.commit()
        send(chat_id, f"{REGIONS[arg][0]} uchun obuna yoqildi. Xavf bo'lsa xabar yuboraman.")

    elif cmd == "/check":
        row = conn.execute("SELECT region FROM subs WHERE chat_id=?", (chat_id,)).fetchone()
        if not row:
            send(chat_id, "Avval hududni tanlang: /hudud chiroqchi")
            return
        send(chat_id, region_report(row[0])[1])

    elif cmd == "/stop":
        conn.execute("DELETE FROM subs WHERE chat_id=?", (chat_id,))
        conn.commit()
        send(chat_id, "Obuna bekor qilindi.")

    elif cmd == "/sinov" and chat_id == ADMIN_ID:
        # Demo: barcha obunachilarga hozirgi holatni yuboradi
        sent = 0
        for chat, region in conn.execute("SELECT chat_id, region FROM subs").fetchall():
            send(chat, region_report(region)[1])
            sent += 1
        send(chat_id, f"Sinov xabari {sent} ta obunachiga yuborildi.")


# ---------- Avtomatik tekshiruv ----------
def run_checks(conn):
    cache = {}
    rows = conn.execute("SELECT chat_id, region, last_level FROM subs").fetchall()
    for chat_id, region, last_level in rows:
        if region not in cache:
            try:
                cache[region] = region_report(region)
            except requests.RequestException as e:
                print("Ob-havo olinmadi:", e)
                continue
        level, text = cache[region]
        if level != last_level:
            if level in ("mid", "high"):
                send(chat_id, "🔔 Ogohlantirish!\n\n" + text)
            conn.execute("UPDATE subs SET last_level=? WHERE chat_id=?", (level, chat_id))
    conn.commit()


# ---------- Asosiy sikl ----------
def main():
    conn = open_db()
    offset = None
    last_check = 0
    print("Bot ishga tushdi. To'xtatish: Ctrl+C")
    while True:
        try:
            params = {"timeout": 25}
            if offset is not None:
                params["offset"] = offset
            updates = tg("getUpdates", **params).get("result", [])
            for upd in updates:
                offset = upd["update_id"] + 1
                msg = upd.get("message") or {}
                if msg.get("text"):
                    handle(conn, msg["chat"]["id"], msg["text"].strip())
            if time.time() - last_check >= CHECK_EVERY:
                run_checks(conn)
                last_check = time.time()
        except KeyboardInterrupt:
            print("To'xtatildi.")
            break
        except Exception as e:  # tarmoq xatolari botni to'xtatmasin
            print("Xato:", e)
            time.sleep(5)


if __name__ == "__main__":
    main()
