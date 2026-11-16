# Nadi Kita — Closing the Loop Between UTD Blood Inventory and Eligible Repeat Donors

**Team Kita Peduli · STACK 2026 · Case 2: Stronger Communities and Everyday Services**

- **Muhammad Bazwa Arigusna** — Backend, Database, API Integration & Deployment
- **Nur Hidayat Surya Pamungkas** — Machine Learning Pipeline, Eligibility Rules Engine & Synthetic Data
- **Alvia Nabila Azzahra** — Design System, Frontend Interface, Accessibility & Usability Evaluation

> **Prototype Disclaimer:** This system is a STACK 2026 prototype (`UTD Simulasi Surabaya`). All donor profiles, stock counts, and schedules in the live demo are simulated. Self-screening checks in Nadi Kita are pre-arrival indicators only; final medical eligibility is always determined on-site by certified Blood Transfusion Unit (UTD) staff.

---

## 1. Problem Statement

Existing blood bank portals typically publish static daily unit counts. When a specific blood group (especially Rhesus-negative or high-demand groups like `B+` and `O−`) drops into a low or critical zone, UTD coordinators must manually message donor WhatsApp groups and record arrivals by hand. This creates three persistent operational bottlenecks:

1. **Cooldown Blindness:** Repeat donors forget when their 60-day recovery window ends, while broadcast alerts inadvertently disturb donors who donated recently and are not yet eligible.
2. **Unpredictable Turnout:** Coordinators have no systematic way to prioritize invitations or estimate how many invitations ($K$) are needed to fulfill a specific unit target before a deadline.
3. **Arrival Bottlenecks:** Without capacity-controlled time slots, donors arrive simultaneously, causing long queues and idle donor beds at other hours.

**Nadi Kita** closes this loop in one integrated workflow:
**Live 8-Group Stock Board → Cooldown-Filtered & ML-Ranked Donor Requests → 4-Question Pre-Screening & Atomic 30-Minute Slot Booking → Signed QR Check-In & 60-Day Timer Reset.**

---

## 2. Architecture & Key Decisions

```
Donor (Mobile Web) ──HTTPS──► Next.js 15 App Router (UI + API + Rules Engine)
UTD Coordinator    ──HTTPS──►   ├── Prisma ORM ──► Database (PostgreSQL / Local SQLite)
                                ├── POST /v1/score ──► FastAPI ML Service (return-lr-v1)
                                └── Email / Copy Link / WhatsApp (wa.me)
```

### Core Architectural Principles

- **Separation of Deterministic Rules vs. Probabilistic ML (`K2`):**
  - **Medical & Cooldown Eligibility (`web/src/server/rules/eligibility.ts`):** 100% deterministic, human-readable, and configurable per branch via `EligibilityConfig` (`cooldownDays = 60`, `minWeightKg = 45`, `minSleepHours = 4`, `minHbGdl = 12.5`, `age = 17–60`). Machine learning is **never** used to decide medical or cooldown eligibility.
  - **Return-Propensity Ranking (`ml/` & `web/src/server/rules/ranking.ts`):** A Platt-calibrated Logistic Regression model (`return-lr-v1`) trained on the UCI Blood Transfusion Service Center dataset estimates a return-propensity prior $p \in [0, 1]$ solely to rank already-eligible donors:
    $$\text{Priority} = p \times \left(1 - 0.5 \times \frac{\text{Invites}_{30\text{d}}}{\text{MaxInvites}_{30\text{d}}}\right)$$
  - **Resilient Heuristic Fallback (`10.4`):** If the Python FastAPI service is asleep or unreachable, the web server automatically falls back to a bounded deterministic heuristic and displays a clear notice (`"Peringkat sementara"`).
- **Zero-Overbooking Atomic Transactions (`8.3`, `BR-09`):**
  - Slot reservations execute inside an atomic transaction (`UPDATE "Slot" SET "bookedCount" = "bookedCount" + 1 WHERE "id" = ? AND "bookedCount" < "capacity"`) paired with a partial unique index (`one_active_booking_per_donor`) so 20 simultaneous booking requests on a 4-seat slot deterministically yield **4 confirmed bookings and 16 full-slot rejections**.
- **Two-Step On-Site Verification (`K4`, `BR-11`, `BR-12`):**
  - Scanning the HMAC-SHA256 signed QR ticket (`nk1.<bookingId>.<expUnix>.<sig>`) or entering the 8-character Crockford Base32 backup code (`NK-7H3K9Q2M`) marks the donor as **`CHECKED_IN`** (idempotent on repeated scans).
  - The 60-day cooldown timer (`nextEligibleAt`) is only reset when UTD staff confirm **`COMPLETED` ("Selesai donor")**; if a donor is deferred on-site (**`DEFERRED`**), the reason is recorded without resetting their cooldown timer.

---

## 3. Repository Structure

```
.
├─ docs/
│  ├─ planning.md           # Full engineering specification & business rules
│  ├─ design.md             # Design system, token palette, wireframes & anti-slop rules
│  ├─ sources.md            # Regulatory & dataset citations (Permenkes 91/2015, UCI, UU PDP)
│  └─ model_card.md         # Honest ML evaluation metrics, calibration & ethical boundaries
├─ web/                     # Next.js 15 (App Router, TypeScript strict, Tailwind CSS v4)
│  ├─ prisma/               # schema.prisma, schema.postgres.prisma, migrations, seed.ts, reset-demo.ts
│  ├─ src/
│  │  ├─ app/               # Public (/ , /stok, /masuk, /daftar), Invitation (/u/[token]),
│  │  │                     # Donor (/donor/*), Coordinator (/koordinator/*) & REST API (/api/*)
│  │  ├─ components/        # StockPill, LiveStockBoard, QrTicketCard, StatusChip, Navigation
│  │  ├─ server/            # Pure business rules (eligibility, ranking, slots) & services
│  │  ├─ lib/               # WIB date/time formatting, HMAC QR signing, tokens, .ics, Zod schemas
│  │  └─ messages/          # Indonesian (id.json) & English (en.json) message dictionaries
│  └─ tests/                # Vitest unit & database integration tests (including 20x concurrency test)
├─ ml/                      # Python 3.12 ML Pipeline & FastAPI Service
│  ├─ data/                 # UCI Blood Transfusion dataset loader (748 rows)
│  ├─ notebooks/            # Exploratory Data Analysis (eda.ipynb) verifying Monetary = 250 * Frequency
│  ├─ src/                  # features.py, train.py, evaluate.py, seed/generate.py (seed=20261108)
│  ├─ service/              # FastAPI app (POST /v1/score, GET /health, GET /v1/model)
│  ├─ artifacts/            # model.joblib, metrics.json, synthetic_seed.json
│  └─ tests/                # pytest suite (test_ml.py)
├─ docker-compose.yml       # PostgreSQL 16 + FastAPI ML container orchestration
└─ .github/workflows/ci.yml # Automated CI pipeline
```

---

## 4. Quick Start & Operational Commands

### Prerequisites

- **Node.js** 22+ and **npm** (or **pnpm**)
- **Python** 3.12+ (for training the ML model and running the FastAPI scoring service)

### 1. Train the ML Model & Generate Reproducible Synthetic Data

```bash
cd ml
pip install -r requirements.txt
python -m src.train
python -m src.seed.generate
pytest -v
```

### 2. Initialize, Migrate & Seed the Web Application

```bash
cd web
npm install
npm run db:migrate
npm run db:seed
```

### 3. Run the Application Locally

```bash
# Terminal 1: Start the FastAPI ML service (optional; web app includes automatic heuristic fallback)
npm run ml:serve

# Terminal 2: Start the Next.js web server on http://localhost:3000
npm run dev
```

### Operational Scripts (available from root or `web/`)

| Command | Description |
|---|---|
| `npm run db:migrate` | Push schema and apply the `one_active_booking_per_donor` partial unique index |
| `npm run db:seed` | Populate 320 synthetic donors, 15 `pilot-2026` volunteers, 8 stock levels & 7-day slots (`seed = 20261108`) |
| `npm run db:reset-demo` | Reset the entire demo scenario relative to the current time |
| `npm run db:purge-volunteers` | Delete pilot volunteer accounts and anonymize donor event logs post-event |
| `npm run ml:train` | Train calibrated logistic regression (`return-lr-v1`) and write `metrics.json` & `model_card.md` |
| `npm run ml:serve` | Launch the FastAPI scoring service on port `8000` |
| `npm test` | Run all Vitest unit, business-rule, and concurrency integration tests |

### Demo Accounts (Password for all accounts: `nadikita2026`)

| Role | Name | Email | Scenario |
|---|---|---|---|
| **Coordinator** | Bu Ratna | `ratna.koordinator@nadikita.test` | Full access to `/koordinator` stock, donor requests, QR scanner & metrics |
| **Donor (Ready)** | Rizky Pratama | `relawan01@contoh.test` | `B+`, passed 60-day cooldown, has an active invitation ready to book |
| **Donor (Booked)** | Sari Wijaya | `relawan02@contoh.test` | `B+`, has a confirmed ticket (`NK-4P8R2W6N`) ready for QR check-in today |

---

## 5. Model Evaluation & Pilot Usability Results

### 5.1 Return-Propensity Model (`return-lr-v1`)

Trained on the UCI Blood Transfusion Service Center dataset ($N = 748$, 80/20 stratified split, `Monetary` dropped after verifying exact collinearity $M = 250 \times F$). Full details in [`docs/model_card.md`](docs/model_card.md).

- **Held-out Test ROC-AUC:** `0.7111`
- **Held-out Test PR-AUC:** `0.3863`
- **Brier Score (Platt-calibrated):** `0.1663`
- **Lift in Top 20% Predicted Bucket:** `1.67x`

### 5.2 Pilot Usability Metrics (`n = 15` Volunteers, `EventLog`)

| Task | Role | Target | Median Duration | IQR (Q1–Q3) | Completion Rate |
|---|---|---|---|---|---|
| **T1:** Create & send `B+` donor request | Coordinator | `< 120 s` | **86 s** | `74–95 s` | `100%` |
| **T2:** Open invitation → screening → slot → QR ticket | Donor | `< 180 s` | **124 s** | `98–148 s` | `100%` |
| **T3:** Scan QR ticket & record donation outcome | Coordinator + Donor | `< 90 s` | **43 s** | `35–52 s` | `100%` |
| **T4:** Cancel active schedule | Donor | `< 60 s` | **36 s** | `26–47 s` | `100%` |

- **System Usability Scale (SUS) Median Score:** **87.5 / 100** ($n = 15$).

---

## 6. Limitations & Ethical Safeguards

1. **Dataset Generalization (`T1`):** The UCI dataset reflects donor behavior in Hsin-Chu, Taiwan (2007) without active campaign invitations. Its output is strictly treated as a relative ranking prior, never as a clinical or absolute response probability.
2. **Medical Pre-Screening (`T4`):** The 4-question pre-check (weight, sleep hours, last known Hb, last donation date) is self-reported. Every screen explicitly reminds the user that UTD medical staff perform the binding physical and hemoglobin examination on-site.
3. **Personal Data Protection (`T8`, UU No. 27/2022):** No national ID numbers (NIK) or home addresses are collected. All demo records use synthetic `.test` emails and fictitious phone numbers, explicit contact consent is required upon registration, and `npm run db:purge-volunteers` removes pilot volunteer profiles after evaluation.

---

## 7. Licenses & Attributions

- **UCI Blood Transfusion Service Center Data Set:** Contributed by Prof. I-Cheng Yeh (Chung-Hua University), licensed under **CC BY 4.0** (`doi:10.1016/j.eswa.2008.07.018`).
- **Open-Source Libraries:** Next.js, React, Tailwind CSS, Prisma, Lucide Icons, Zod, QRCode, FastAPI, scikit-learn, pandas, NumPy (MIT / BSD / Apache-2.0 licenses).

