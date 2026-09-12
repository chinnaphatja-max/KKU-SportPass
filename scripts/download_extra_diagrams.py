import urllib.request
import json
import base64
import zlib
import os

os.makedirs("docs/diagrams", exist_ok=True)

extra = {
    "system_architecture.png": """
graph TD
    Client[Frontend Client: React 19 + Vite SPA]
    Vercel[Vercel Cloud Edge / Serverless API Gateway]
    Express[Backend Layer: Express.js REST API]
    Middleware[Security Middleware: CSRF, Helmet, RateLimit, RBAC, Structured Logger]
    Database[(PostgreSQL Database on Supabase)]
    Cron[Vercel Scheduled Cron Job: Cleanup & Waitlist Auto-promotion]

    Client -- HTTPS REST / JSON with CSRF Token & Credentials --> Vercel
    Vercel --> Express
    Express --> Middleware
    Middleware --> Controller[Controllers: Bookings, Courts, Payments, Auth, Admin]
    Controller -- pg Connection Pool with SSL & Prepared Statements --> Database
    Cron -- Bearer CRON_SECRET Authentication --> Express
""",
    "er_diagram.png": """
erDiagram
    USERS ||--o{ BOOKINGS : "places"
    USERS ||--o{ PAYMENTS : "makes"
    USERS ||--o{ AUDIT_LOGS : "triggers"
    FACILITIES ||--o{ COURTS : "contains"
    COURTS ||--o{ BOOKINGS : "reserved_in"
    COURTS ||--o{ COURT_CLOSURES : "scheduled_for"
    BOOKINGS ||--o| PAYMENTS : "generates"
    BOOKINGS ||--o| REVIEWS : "evaluated_by"
    COURTS ||--o{ WAITLISTS : "queued_on"

    USERS {
        uuid id PK
        varchar email UK
        varchar full_name
        varchar role
    }
    FACILITIES {
        uuid id PK
        varchar name_th
        varchar location
    }
    COURTS {
        uuid id PK
        uuid facility_id FK
        varchar court_number
        varchar sport_type
    }
    BOOKINGS {
        uuid id PK
        varchar reference_code UK
        uuid court_id FK
        uuid user_id FK
        date booking_date
        varchar status
    }
    PAYMENTS {
        uuid id PK
        uuid booking_id FK
        varchar transaction_ref UK
        decimal amount
        varchar status
    }
    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        varchar action
        timestamp created_at
    }
"""
}

for name, code in extra.items():
    j = json.dumps({"code": code.strip(), "mermaid": {"theme": "default"}})
    compressor = zlib.compressobj(9, zlib.DEFLATED, 15, 8, zlib.Z_DEFAULT_STRATEGY)
    deflated = compressor.compress(j.encode("utf-8")) + compressor.flush()
    pako_b64 = base64.urlsafe_b64encode(deflated).decode("ascii")
    url = f"https://mermaid.ink/img/pako:{pako_b64}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
            filepath = os.path.join("docs/diagrams", name)
            with open(filepath, "wb") as f:
                f.write(data)
            print(f"  [OK] {name} saved ({len(data)} bytes)")
    except Exception as e:
        print(f"  [FAIL] {name}: {e}")
