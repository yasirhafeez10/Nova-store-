# NOVA.STORE — Localhost Version

**Live Demo:** [https://nova-store-qb1r.onrender.com/](https://nova-store-qb1r.onrender.com/)


A complete, downloadable copy of NOVA.STORE that runs on **your own computer**.
This is a separate local project — it is not the Muse-hosted version, and its
database starts fresh on your machine.

## What you need

- **Python 3** installed (check with `python --version` in a terminal).
  Download from https://www.python.org/downloads/ if needed — tick
  "Add Python to PATH" during install on Windows.
- **Nothing else.** No pip installs, no npm, no internet needed to run it.
  The backend uses only Python's built-in libraries, and the database is SQLite.

## How to run

### Windows (easiest)
1. Unzip the folder.
2. Double-click **run.bat**
3. Your browser opens at http://localhost:8000

### Any computer (terminal)
1. Unzip the folder and open a terminal inside the `NOVA-STORE-Local` folder.
2. Run:
   ```
   python server.py
   ```
   (on Mac/Linux you may need `python3 server.py`)
3. Open http://localhost:8000 in your browser.
4. Stop the server with **Ctrl+C** in the terminal.

## What's inside

| Part | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript (in `static/`) |
| Backend | Python 3 standard library — `server.py` (REST API, no frameworks) |
| Database | SQLite — `nova.db` (created automatically on first run) |
| Charts | Simple CSS bars in the Admin dashboard (no library) |
| Login | Demo accounts, passwords stored as SHA-256 hashes |

## Features

- Home: hero, featured categories, trending, best sellers, new arrivals, deals,
  testimonials, newsletter signup (saved locally — no email is sent)
- Shop: category filter, search, max-price filter, min-rating filter,
  sort by price / newest / popularity, Load More
- Product page: gallery-style view, size/colour choice, quantity, ratings,
  customer reviews (you can add your own), related products
- Wishlist and cart (saved in your browser), promo code **WELCOME10** = 10% off,
  free shipping over $75, Express shipping option
- Checkout with validation and an order confirmation page
  (demo checkout — no real payment is taken)
- Accounts: register, login, logout, demo password reset, saved delivery
  addresses, order history
- Admin (⚙️ button, no login needed in this local demo): total sales / orders /
  customers / products, revenue-by-category chart, order status updates,
  customer list, add / edit / delete products and stock

## Files

- `server.py` — backend + database + API
- `static/index.html`, `static/app.js`, `static/styles.css` — frontend
- `nova.db` — your SQLite database (appears after the first run; delete it to reset the store)
- `run.bat` — Windows double-click launcher

## Honest note

The Muse-hosted NOVA.STORE runs on React + TypeScript + Bun + Drizzle ORM +
SQLite. This localhost copy gives you the **same store and the same features**
in the simplest possible local stack (Python + SQLite + vanilla JS) so it runs
anywhere with zero installation steps. It is a demo/teaching project — do not
use it for real payments or real customer data.
