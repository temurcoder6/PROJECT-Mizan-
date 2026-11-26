"""Pulim qayerga ketyapti? - Telegram bot (Chiroqchi uchun).

Xarajatlarni oddiy matn bilan kiritish: "non 5000" yoki "taksi 15000".
Har bir foydalanuvchining ma'lumoti alohida saqlanadi (SQLite).
"""
import os
import sqlite3
import time
from datetime import date, datetime

import requests

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def load_env(path):
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
if not TOKEN:
    raise SystemExit("BOT_TOKEN topilmadi. .env faylga BOT_TOKEN=... yozing.")

API = f"https://api.telegram.org/bot{TOKEN}"
DB_PATH = os.path.join(BASE_DIR, "pulim.db")

# Kalit so'z -> kategoriya (mahalliy hayotga moslangan)
KEYWORDS = {
    "Oziq-ovqat": ["non", "go'sht", "gosht", "sut", "tuxum", "meva", "sabzavot", "oziq", "un", "yog'", "shakar", "choy"],
    "Bozor": ["bozor", "bozorlik"],
    "Transport": ["taksi", "benzin", "yo'l", "yol", "avtobus", "marshrutka", "metan"],
    "Kommunal": ["gaz", "svet", "elektr", "suv", "internet", "kommunal", "tel"],
    "Kiyim": ["kiyim", "oyoq", "poyabzal", "ko'ylak", "koylak"],
    "Ijtimoiy": ["to'y", "toy", "mehmon", "xayr", "ziyofat", "sovg'a", "sovga"],
    "Dori-darmon": ["dori", "dorixona", "shifokor", "analiz"],
}
CATEGORIES = list(KEYWORDS.keys()) + ["Boshqa"]


def guess_category(name):
    low = name.lower()
    for cat, words in KEYWORDS.items():
        if any(w in low for w in words):
            return cat
    return "Boshqa"


def open_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS expenses ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER, name TEXT, "
        "amount INTEGER, category TEXT, created TEXT)"
    )
    conn.execute(
        "CREATE TABLE IF NOT EXISTS goals ("
        "chat_id INTEGER PRIMARY KEY, name TEXT, target INTEGER, deadline TEXT, saved INTEGER)"
    )
    conn.commit()
    return conn


def tg(method, **params):
    return requests.post(f"{API}/{method}", json=params, timeout=40).json()


def send(chat_id, text):
    tg("sendMessage", chat_id=chat_id, text=text)


def fmt(n):
    return f"{int(round(n)):,}".replace(",", " ") + " so'm"


def month_prefix():
    return date.today().strftime("%Y-%m")


# ---------- Buyruqlar ----------
HELP = (
    "Assalomu alaykum! \"Pulim qayerga ketyapti?\" botiga xush kelibsiz.\n\n"
    "Xarajat yozish (oddiy matn):\n"
    "  non 5000\n  taksi 15000\n\n"
    "/hisobot - shu oy xarajatlari\n"
    "/tavsiya - tejash maslahati\n"
    "/maqsad NOM SUMMA KUN - masalan: /maqsad telefon 1000000 60\n"
    "/maqsad - maqsad holati\n"
    "/ochir - oxirgi xarajatni o'chirish"
)


def cmd_hisobot(conn, chat):
    rows = conn.execute(
        "SELECT category, SUM(amount) FROM expenses WHERE chat_id=? AND created LIKE ? "
        "GROUP BY category ORDER BY SUM(amount) DESC",
        (chat, month_prefix() + "%"),
    ).fetchall()
    if not rows:
        send(chat, "Bu oy hali xarajat yo'q. Masalan: non 5000")
        return
    total = sum(s for _, s in rows)
    lines = [f"Shu oy jami: {fmt(total)}", ""]
    for cat, s in rows:
        lines.append(f"{cat}: {fmt(s)} ({s * 100 // total}%)")
    send(chat, "\n".join(lines))


def cmd_tavsiya(conn, chat):
    row = conn.execute(
        "SELECT category, SUM(amount) FROM expenses WHERE chat_id=? AND created LIKE ? "
        "GROUP BY category ORDER BY SUM(amount) DESC LIMIT 1",
        (chat, month_prefix() + "%"),
    ).fetchone()
    if not row:
        send(chat, "Tavsiya uchun avval bir nechta xarajat kiriting.")
        return
    cat, s = row
    send(
        chat,
        f"Eng ko'p pul \"{cat}\" ga ketyapti: {fmt(s)}.\n"
        f"Shu toifada 10% tejasangiz, oyiga {fmt(s * 0.1)} qoladi.",
    )


def cmd_maqsad(conn, chat, arg):
    if not arg:
        row = conn.execute("SELECT name, target, deadline, saved FROM goals WHERE chat_id=?", (chat,)).fetchone()
        if not row:
            send(chat, "Maqsad yo'q. Masalan: /maqsad telefon 1000000 60")
            return
        name, target, deadline, saved = row
        days_left = (datetime.strptime(deadline, "%Y-%m-%d").date() - date.today()).days
        remaining = max(target - saved, 0)
        if remaining == 0:
            send(chat, f"Maqsad \"{name}\" bajarildi! 🎉")
            return
        if days_left <= 0:
            send(chat, f"\"{name}\" muddati tugagan. Qolgan: {fmt(remaining)}.")
            return
        send(
            chat,
            f"Maqsad: \"{name}\"\nMaqsad summasi: {fmt(target)}\nJamg'arilgan: {fmt(saved)}\n"
            f"Qolgan: {fmt(remaining)}\nKunlik tejash kerak: {fmt(remaining / days_left)} ({days_left} kun qoldi)",
        )
        return

    parts = arg.split()
    if len(parts) < 3 or not parts[-2].isdigit() or not parts[-1].isdigit():
        send(chat, "Format: /maqsad NOM SUMMA KUN\nMasalan: /maqsad telefon 1000000 60")
        return
    name = " ".join(parts[:-2])
    target = int(parts[-2])
    days = int(parts[-1])
    deadline = date.fromordinal(date.today().toordinal() + days).isoformat()
    conn.execute(
        "INSERT OR REPLACE INTO goals (chat_id, name, target, deadline, saved) VALUES (?, ?, ?, ?, 0)",
        (chat, name, target, deadline),
    )
    conn.commit()
    send(chat, f"Maqsad saqlandi: \"{name}\", {fmt(target)}, {days} kunda.\nKunlik tejash kerak: {fmt(target / days)}")


def add_expense(conn, chat, text):
    parts = text.split()
    if len(parts) < 2 or not parts[-1].replace(".", "").isdigit():
        return False
    amount = int(float(parts[-1]))
    name = " ".join(parts[:-1])
    category = guess_category(name)
    conn.execute(
        "INSERT INTO expenses (chat_id, name, amount, category, created) VALUES (?, ?, ?, ?, ?)",
        (chat, name, amount, category, date.today().isoformat()),
    )
    conn.commit()
    month_total = conn.execute(
        "SELECT SUM(amount) FROM expenses WHERE chat_id=? AND created LIKE ?",
        (chat, month_prefix() + "%"),
    ).fetchone()[0]
    send(chat, f"Saqlandi: {name} — {fmt(amount)} ({category})\nShu oy jami: {fmt(month_total)}")
    return True


def handle(conn, chat, text):
    if text.startswith("/"):
        cmd, _, arg = text.partition(" ")
        cmd = cmd.lower().split("@")[0]
        arg = arg.strip()
        if cmd == "/start" or cmd == "/help":
            send(chat, HELP)
        elif cmd == "/hisobot":
            cmd_hisobot(conn, chat)
        elif cmd == "/tavsiya":
            cmd_tavsiya(conn, chat)
        elif cmd == "/maqsad":
            cmd_maqsad(conn, chat, arg)
        elif cmd == "/ochir":
            row = conn.execute("SELECT id, name, amount FROM expenses WHERE chat_id=? ORDER BY id DESC LIMIT 1", (chat,)).fetchone()
            if not row:
                send(chat, "O'chiriladigan xarajat yo'q.")
            else:
                conn.execute("DELETE FROM expenses WHERE id=?", (row[0],))
                conn.commit()
                send(chat, f"O'chirildi: {row[1]} — {fmt(row[2])}")
        else:
            send(chat, HELP)
        return

    if not add_expense(conn, chat, text):
        send(chat, "Tushunmadim. Format: non 5000\n\n" + HELP)


def main():
    conn = open_db()
    offset = None
    print("Pulim-bot ishga tushdi. To'xtatish: Ctrl+C")
    while True:
        try:
            params = {"timeout": 25}
            if offset is not None:
                params["offset"] = offset
            for upd in tg("getUpdates", **params).get("result", []):
                offset = upd["update_id"] + 1
                msg = upd.get("message") or {}
                if msg.get("text"):
                    handle(conn, msg["chat"]["id"], msg["text"].strip())
        except KeyboardInterrupt:
            print("To'xtatildi.")
            break
        except Exception as e:
            print("Xato:", e)
            time.sleep(5)


if __name__ == "__main__":
    main()
