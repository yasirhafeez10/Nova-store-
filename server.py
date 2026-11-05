"""
NOVA.STORE - Localhost version
Backend: Python 3 standard library only (no pip installs needed)
Database: SQLite (nova.db, created automatically on first run)
Run:  python server.py   then open http://localhost:8000
"""
import hashlib
import json
import os
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

BASE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE, "nova.db")
STATIC = os.path.join(BASE, "static")
PORT = 8000

PRODUCTS = [
    # name, category, price, original_price, rating, stock, emoji, colors, sizes, description, sold
    ("Nova Wireless Headphones", "Electronics", 129.99, 179.99, 4.8, 24, "🎧", ["Black", "White"], [], "Noise-cancelling over-ear headphones with 40-hour battery life and Bluetooth 5.3.", 320),
    ("Nova Smart Watch Series 5", "Electronics", 199.99, 249.99, 4.7, 18, "⌚", ["Black", "Silver"], [], "Fitness and health tracking smartwatch with AMOLED display and heart-rate sensor.", 275),
    ("Nova Bluetooth Speaker", "Electronics", 79.99, 99.99, 4.6, 30, "🔊", ["Blue", "Black"], [], "Portable waterproof speaker with deep bass and 20-hour playtime.", 190),
    ("Classic Leather Bag", "Fashion", 89.99, 120.00, 4.9, 12, "👜", ["Brown", "Black"], [], "Handcrafted genuine leather bag with adjustable strap and laptop sleeve.", 410),
    ("Men's Running Shoes", "Fashion", 119.99, 149.99, 4.5, 20, "👟", ["Red", "Grey"], ["40", "41", "42", "43", "44", "45"], "Lightweight breathable running shoes with cushioned sole for daily training.", 230),
    ("Women's Summer Dress", "Fashion", 59.99, 79.99, 4.4, 15, "👗", ["Floral", "Yellow"], ["S", "M", "L"], "Flowy summer dress in soft breathable fabric, perfect for warm days.", 150),
    ("Ceramic Table Lamp", "Home & Living", 49.99, 69.99, 4.6, 22, "💡", ["White", "Beige"], [], "Modern ceramic table lamp with warm light, ideal for bedroom or study.", 130),
    ("Aroma Diffuser", "Home & Living", 39.99, 54.99, 4.7, 28, "🕯️", ["White", "Wood"], [], "Ultrasonic aroma diffuser with colour-changing light and auto shut-off.", 260),
    ("Cotton Bed Sheet Set", "Home & Living", 69.99, 89.99, 4.8, 16, "🛏️", ["White", "Grey", "Blue"], ["Single", "Double", "King"], "Premium 100% cotton bed sheet set, soft, breathable and easy to wash.", 210),
    ("Vitamin C Serum", "Beauty", 29.99, 44.99, 4.7, 35, "🧴", [], [], "Brightening vitamin C face serum for glowing, even-toned skin.", 380),
    ("Matte Lipstick Set", "Beauty", 24.99, 34.99, 4.5, 40, "💄", ["Classic", "Nude"], [], "Set of 6 long-lasting matte lipsticks in everyday and bold shades.", 290),
    ("Natural Face Cream", "Beauty", 34.99, 49.99, 4.6, 26, "🌿", [], [], "Hydrating natural face cream with aloe vera and shea butter.", 175),
]


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hash_password(email, password):
    raw = f"{email.lower()}:{password}".encode()
    return hashlib.sha256(raw).hexdigest()


def init_db():
    conn = db()
    c = conn.cursor()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS products(
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, category TEXT,
        price REAL, original_price REAL, rating REAL, stock INTEGER,
        emoji TEXT, colors TEXT, sizes TEXT, description TEXT, sold INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS accounts(
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, password_hash TEXT);
    CREATE TABLE IF NOT EXISTS addresses(
        id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, label TEXT, address TEXT, city TEXT, phone TEXT);
    CREATE TABLE IF NOT EXISTS orders(
        id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, name TEXT, address TEXT, city TEXT,
        phone TEXT, shipping TEXT, payment TEXT, promo TEXT, discount REAL, shipping_cost REAL,
        total REAL, status TEXT DEFAULT 'Pending', created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS order_items(
        id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, product_id INTEGER,
        name TEXT, price REAL, qty INTEGER, size TEXT, color TEXT);
    CREATE TABLE IF NOT EXISTS reviews(
        id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, email TEXT, rating INTEGER, text TEXT,
        created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS newsletter(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE);
    CREATE TABLE IF NOT EXISTS contact_messages(
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, message TEXT);
    """)
    if c.execute("SELECT COUNT(*) FROM products").fetchone()[0] == 0:
        for p in PRODUCTS:
            c.execute("""INSERT INTO products(name,category,price,original_price,rating,stock,emoji,colors,sizes,description,sold)
                         VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                      (p[0], p[1], p[2], p[3], p[4], p[5], p[6], json.dumps(p[7]), json.dumps(p[8]), p[9], p[10]))
    conn.commit()
    conn.close()


def row_product(r):
    d = dict(r)
    d["colors"] = json.loads(d["colors"] or "[]")
    d["sizes"] = json.loads(d["sizes"] or "[]")
    d["discount_percent"] = round((1 - d["price"] / d["original_price"]) * 100) if d["original_price"] else 0
    return d


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def send_json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        if not length:
            return {}
        try:
            return json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            return {}

    # ---------------- GET ----------------
    def do_GET(self):
        parsed = urlparse(self.path)
        path, qs = parsed.path, parse_qs(parsed.query)
        conn = db()
        try:
            if path == "/api/products":
                rows = conn.execute("SELECT * FROM products").fetchall()
                items = [row_product(r) for r in rows]
                cat = qs.get("category", [""])[0]
                search = qs.get("search", [""])[0].lower()
                max_price = qs.get("max_price", [""])[0]
                min_rating = qs.get("min_rating", [""])[0]
                sort = qs.get("sort", [""])[0]
                if cat:
                    items = [i for i in items if i["category"] == cat]
                if search:
                    items = [i for i in items if search in i["name"].lower()]
                if max_price:
                    items = [i for i in items if i["price"] <= float(max_price)]
                if min_rating:
                    items = [i for i in items if i["rating"] >= float(min_rating)]
                if sort == "price_low":
                    items.sort(key=lambda x: x["price"])
                elif sort == "price_high":
                    items.sort(key=lambda x: -x["price"])
                elif sort == "newest":
                    items.sort(key=lambda x: -x["id"])
                elif sort == "popularity":
                    items.sort(key=lambda x: -x["sold"])
                return self.send_json({"products": items})

            if path.startswith("/api/products/"):
                pid = int(path.split("/")[-1])
                r = conn.execute("SELECT * FROM products WHERE id=?", (pid,)).fetchone()
                if not r:
                    return self.send_json({"error": "Product not found"}, 404)
                prod = row_product(r)
                revs = [dict(x) for x in conn.execute(
                    "SELECT * FROM reviews WHERE product_id=? ORDER BY id DESC", (pid,)).fetchall()]
                related = [row_product(x) for x in conn.execute(
                    "SELECT * FROM products WHERE category=? AND id!=? LIMIT 3", (prod["category"], pid)).fetchall()]
                return self.send_json({"product": prod, "reviews": revs, "related": related})

            if path == "/api/orders":
                email = qs.get("email", [""])[0]
                rows = conn.execute("SELECT * FROM orders WHERE email=? ORDER BY id DESC", (email,)).fetchall()
                out = []
                for r in rows:
                    o = dict(r)
                    o["items"] = [dict(x) for x in conn.execute(
                        "SELECT * FROM order_items WHERE order_id=?", (o["id"],)).fetchall()]
                    out.append(o)
                return self.send_json({"orders": out})

            if path == "/api/addresses":
                email = qs.get("email", [""])[0]
                rows = [dict(x) for x in conn.execute(
                    "SELECT * FROM addresses WHERE email=? ORDER BY id DESC", (email,)).fetchall()]
                return self.send_json({"addresses": rows})

            if path == "/api/admin/stats":
                total_sales = conn.execute("SELECT COALESCE(SUM(total),0) FROM orders").fetchone()[0]
                total_orders = conn.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
                total_customers = conn.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]
                total_products = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
                rev_cat = [dict(x) for x in conn.execute("""
                    SELECT p.category AS category, COALESCE(SUM(oi.price*oi.qty),0) AS revenue
                    FROM products p LEFT JOIN order_items oi ON oi.product_id=p.id GROUP BY p.category""").fetchall()]
                orders = [dict(x) for x in conn.execute("SELECT * FROM orders ORDER BY id DESC").fetchall()]
                for o in orders:
                    o["items"] = [dict(x) for x in conn.execute(
                        "SELECT * FROM order_items WHERE order_id=?", (o["id"],)).fetchall()]
                customers = [dict(x) for x in conn.execute("SELECT id,name,email FROM accounts ORDER BY id DESC").fetchall()]
                return self.send_json({"stats": {"total_sales": round(total_sales, 2), "total_orders": total_orders,
                                                 "total_customers": total_customers, "total_products": total_products},
                                       "revenue_by_category": rev_cat, "orders": orders, "customers": customers})

            # static files
            rel = "index.html" if path in ("/", "") else path.lstrip("/")
            full = os.path.normpath(os.path.join(STATIC, rel))
            if not full.startswith(STATIC) or not os.path.isfile(full):
                return self.send_json({"error": "Not found"}, 404)
            ctype = {".html": "text/html", ".css": "text/css", ".js": "application/javascript"}.get(
                os.path.splitext(full)[1], "application/octet-stream")
            with open(full, "rb") as f:
                body = f.read()
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        finally:
            conn.close()

    # ---------------- POST / PUT / DELETE ----------------
    def do_POST(self):
        path = urlparse(self.path).path
        data = self.read_json()
        conn = db()
        try:
            if path == "/api/register":
                name, email, pw = data.get("name", "").strip(), data.get("email", "").strip().lower(), data.get("password", "")
                if not name or "@" not in email or len(pw) < 4:
                    return self.send_json({"error": "Enter a name, a valid email and a password of 4+ characters."}, 400)
                try:
                    conn.execute("INSERT INTO accounts(name,email,password_hash) VALUES(?,?,?)",
                                 (name, email, hash_password(email, pw)))
                    conn.commit()
                except sqlite3.IntegrityError:
                    return self.send_json({"error": "An account with this email already exists."}, 400)
                return self.send_json({"ok": True, "name": name, "email": email})

            if path == "/api/login":
                email, pw = data.get("email", "").strip().lower(), data.get("password", "")
                r = conn.execute("SELECT * FROM accounts WHERE email=?", (email,)).fetchone()
                if not r or r["password_hash"] != hash_password(email, pw):
                    return self.send_json({"error": "Wrong email or password."}, 401)
                return self.send_json({"ok": True, "name": r["name"], "email": email})

            if path == "/api/reset-password":
                email, pw = data.get("email", "").strip().lower(), data.get("password", "")
                if len(pw) < 4:
                    return self.send_json({"error": "New password must be 4+ characters."}, 400)
                cur = conn.execute("UPDATE accounts SET password_hash=? WHERE email=?", (hash_password(email, pw), email))
                conn.commit()
                if cur.rowcount == 0:
                    return self.send_json({"error": "No account with this email."}, 404)
                return self.send_json({"ok": True, "note": "Demo reset: password changed directly, no email was sent."})

            if path == "/api/addresses":
                conn.execute("INSERT INTO addresses(email,label,address,city,phone) VALUES(?,?,?,?,?)",
                             (data.get("email", ""), data.get("label", "Home"), data.get("address", ""),
                              data.get("city", ""), data.get("phone", "")))
                conn.commit()
                return self.send_json({"ok": True})

            if path == "/api/orders":
                items = data.get("items", [])
                if not items:
                    return self.send_json({"error": "Your cart is empty."}, 400)
                subtotal = 0.0
                lines = []
                for it in items:
                    r = conn.execute("SELECT * FROM products WHERE id=?", (it["id"],)).fetchone()
                    if not r:
                        continue
                    qty = int(it.get("qty", 1))
                    if r["stock"] < qty:
                        return self.send_json({"error": f"Only {r['stock']} left in stock for {r['name']}."}, 400)
                    subtotal += r["price"] * qty
                    lines.append((r, qty, it.get("size", ""), it.get("color", "")))
                discount = round(subtotal * 0.10, 2) if (data.get("promo", "").upper() == "WELCOME10") else 0.0
                shipping_cost = 0.0 if (subtotal - discount) >= 75 else 6.99
                if data.get("shipping") == "Express":
                    shipping_cost += 9.99
                total = round(subtotal - discount + shipping_cost, 2)
                cur = conn.execute("""INSERT INTO orders(email,name,address,city,phone,shipping,payment,promo,discount,shipping_cost,total)
                                      VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                                   (data.get("email", ""), data.get("name", ""), data.get("address", ""),
                                    data.get("city", ""), data.get("phone", ""), data.get("shipping", "Standard"),
                                    data.get("payment", "Cash on Delivery"), data.get("promo", ""), discount, shipping_cost, total))
                oid = cur.lastrowid
                for r, qty, size, color in lines:
                    conn.execute("INSERT INTO order_items(order_id,product_id,name,price,qty,size,color) VALUES(?,?,?,?,?,?,?)",
                                 (oid, r["id"], r["name"], r["price"], qty, size, color))
                    conn.execute("UPDATE products SET stock=stock-?, sold=sold+? WHERE id=?", (qty, qty, r["id"]))
                conn.commit()
                return self.send_json({"ok": True, "order_id": oid, "total": total, "discount": discount, "shipping_cost": shipping_cost})

            if path == "/api/reviews":
                rating = int(data.get("rating", 5))
                if rating < 1 or rating > 5 or not data.get("text", "").strip():
                    return self.send_json({"error": "Give a rating (1-5) and a short review."}, 400)
                conn.execute("INSERT INTO reviews(product_id,email,rating,text) VALUES(?,?,?,?)",
                             (int(data["product_id"]), data.get("email", "guest"), rating, data["text"].strip()))
                conn.commit()
                return self.send_json({"ok": True})

            if path == "/api/newsletter":
                email = data.get("email", "").strip().lower()
                if "@" not in email:
                    return self.send_json({"error": "Enter a valid email."}, 400)
                conn.execute("INSERT OR IGNORE INTO newsletter(email) VALUES(?)", (email,))
                conn.commit()
                return self.send_json({"ok": True})

            if path == "/api/contact":
                if not data.get("message", "").strip():
                    return self.send_json({"error": "Write a message first."}, 400)
                conn.execute("INSERT INTO contact_messages(name,email,message) VALUES(?,?,?)",
                             (data.get("name", ""), data.get("email", ""), data["message"]))
                conn.commit()
                return self.send_json({"ok": True})

            if path == "/api/admin/products":
                conn.execute("""INSERT INTO products(name,category,price,original_price,rating,stock,emoji,colors,sizes,description,sold)
                                VALUES(?,?,?,?,?,?,'🛍️','[]','[]',?,0)""",
                             (data.get("name", ""), data.get("category", "Electronics"), float(data.get("price", 0)),
                              float(data.get("original_price", data.get("price", 0))), 4.5, int(data.get("stock", 10)),
                              data.get("description", "")))
                conn.commit()
                return self.send_json({"ok": True})

            if path.startswith("/api/admin/orders/") and path.endswith("/status"):
                oid = int(path.split("/")[4])
                conn.execute("UPDATE orders SET status=? WHERE id=?", (data.get("status", "Pending"), oid))
                conn.commit()
                return self.send_json({"ok": True})

            return self.send_json({"error": "Not found"}, 404)
        finally:
            conn.close()

    def do_PUT(self):
        path = urlparse(self.path).path
        data = self.read_json()
        conn = db()
        try:
            if path.startswith("/api/admin/products/"):
                pid = int(path.split("/")[-1])
                conn.execute("UPDATE products SET name=?, price=?, stock=?, category=? WHERE id=?",
                             (data.get("name"), float(data.get("price", 0)), int(data.get("stock", 0)),
                              data.get("category"), pid))
                conn.commit()
                return self.send_json({"ok": True})
            return self.send_json({"error": "Not found"}, 404)
        finally:
            conn.close()

    def do_DELETE(self):
        path = urlparse(self.path).path
        qs = parse_qs(urlparse(self.path).query)
        conn = db()
        try:
            if path.startswith("/api/admin/products/"):
                pid = int(path.split("/")[-1])
                conn.execute("DELETE FROM products WHERE id=?", (pid,))
                conn.commit()
                return self.send_json({"ok": True})
            if path.startswith("/api/addresses/"):
                aid = int(path.split("/")[-1])
                conn.execute("DELETE FROM addresses WHERE id=?", (aid,))
                conn.commit()
                return self.send_json({"ok": True})
            return self.send_json({"error": "Not found"}, 404)
        finally:
            conn.close()


if __name__ == "__main__":
    init_db()
    print(f"NOVA.STORE is running:  http://localhost:{PORT}")
    print("Press Ctrl+C to stop.")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
