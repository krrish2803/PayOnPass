# PayOnPass

> "Pay only for work that passes the test."  
> Automated verify-before-release settlement gateway powered by PayPal Sandbox and AI. Built for the **"Build What's Next with PayPal and AI"** hackathon.

---

## ⚡ What is PayOnPass?
PayOnPass holds a client's payment for a small digital job, checks the delivered work against criteria agreed up front, and then pays the worker, refunds the client, or splits the money by the result:
* **Pass:** Releases payout to the worker via PayPal Payouts.
* **Partial:** Pro-rates payout based on criteria weights and refunds the rest to the client.
* **Fail:** Issues a 100% full refund to the client.
* **Suspicious / Injection / Borderline:** Routes to a Human Review Queue before any money can move.

---

## 🔒 Security & Architectural Guarantees
1. **Receipt Before Money:** No PayPal money endpoints are invoked without a SHA-256 sealed receipt appended to the immutable hash chain (MongoDB, append-only, `seq` monotonic via a guard counter).
2. **Rules Beat the Model:** Deterministic Python hard gates (word count, schema, required terms) cannot be overridden by AI.
3. **Bounded LLM Audit:** The LLM evaluates only soft criteria at temperature `0` in escaped delimited blocks—**it never outputs a numeric score** and can never raise one.
4. **Idempotency:** Every PayPal call carries a deterministic `PayPal-Request-Id`; money events are guarded by a `{job_id, kind}` unique index so a retry can never move money twice. Transport-ambiguous results are marked `UNKNOWN` and resolved by the reconciler querying PayPal—never by blind re-send.
5. **Exact Integer Accounting:**
   $$\text{Worker Payout} + \text{Client Refund} + \text{Platform Fee} = \text{Amount Captured}$$
6. **Money Moves Only in `SETTLING`:** `SETTLED`/`REFUNDED` is reached only after PayPal confirms success; any PayPal failure sends the job to the human review queue and money never settles.

---

## 🌐 3D Interactive Marketing Site

The repository includes a production-quality, static single-page marketing site featuring a continuous, scroll-driven 3D WebGL narrative (8 chapters) built with **React 18, Vite, Three.js, @react-three/fiber, GSAP ScrollTrigger, Lenis, and Tailwind CSS**.

### Single-Point Renaming
The product name is isolated in a single constant in [`src/config.ts`](src/config.ts):
```typescript
export const PRODUCT_NAME = "PayOnPass";
```
Renaming this constant updates the wordmark, headings, navigation, and SEO copy throughout the entire application.

### Running the Marketing Site
```bash
# Install Node dependencies
npm install

# Start Vite development server
npm run dev

# Production build (TypeScript validation + Vite bundling)
npm run build

# Preview production build locally
npm run preview
```

### Static Deployment
The marketing site compiles to pure static HTML/JS/CSS assets in `/dist`:
* **Vercel / Netlify:** Connect repo, set build command to `npm run build`, output directory to `dist`.
* **Render Static Site:** Connect repo, publish directory `dist`.

---

## 🛠️ Backend API Quick Start (Python / FastAPI / MongoDB)

### 1. Prerequisites
* Python 3.11+
* Node.js 18+ (marketing site only)
* MongoDB — run locally via Docker (below) or use MongoDB Atlas

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env: PayPal Sandbox credentials, MONGODB_URI, LLM_API_KEY (optional),
# FUNDING_MODE (live | prefunded), SETTLE_MODE (paypal | mock), PAYPAL_WORKER_EMAIL.
```

> Note: if the sandbox merchant account's country cannot send Payouts (PayPal
> returns `PAYOUT_NOT_AVAILABLE`), use `FUNDING_MODE=prefunded SETTLE_MODE=mock`
> for a fully self-contained demo. Live mode correctly routes such failures to
> `NEEDS_REVIEW` rather than settling.

### 3. Install Python Dependencies
```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 4. Run MongoDB (Docker)
```bash
docker compose up -d mongo     # or point MONGODB_URI at your Atlas cluster
```

### 5. Run Tests (no network; in-memory MongoDB + scriptable PayPal/LLM)
```bash
pytest -q
```
Covers the seeded suite S1–S5, the Step-2 regression (a PayPal 500 must route the
job to `NEEDS_REVIEW` with a `FAILED` money event and can never settle), the
transport-`UNKNOWN` → reconciler recovery path, guardrails, agent key auth.

### 6. Run the Backend Server
```bash
uvicorn app.main:app --reload --port 8000
```
API docs at [http://localhost:8000/docs](http://localhost:8000/docs).

### 7. Product Dashboard (React + Vite + AG Grid)
The product UI lives in [`dashboard/`](dashboard) and is served by the same process at
[http://localhost:8000/app](http://localhost:8000/app) (same-origin, no CORS needed).

```bash
cd dashboard
npm install
npm run build          # tsc + vite build -> dashboard/dist
# then (re)start the backend; FastAPI mounts dashboard/dist at /app
```
Pages: **New Job**, **Worker** (deliver funded work, watch the payout),
**Scenarios** (S1–S5 demo runner — two-step in live funding mode), **Jobs**, **Job Detail** (fund /
capture / submit / review, **PayPal calls** drawer, tamper test), **Review
Queue**, **Ledger** (AG Grid), and **Verifier Scorecard** (reads the adversarial
suite's results). For live development run `npm run dev` (port 5174) and set
`VITE_API_BASE=http://localhost:8000`; CORS origins are configurable via
`CORS_ORIGINS`.

**New Job** has a *Human console* and an *Agent API* mode. In Agent mode you paste
an `X-API-Key` (stored in the browser) and can either create via the keyed
`/api/v1/agent/*` endpoints or run the full autonomous `create → fund → submit`
pipeline; the key is only sent as the `X-API-Key` header.

### State Machine
```
CREATED -> FUNDED -> DELIVERED -> AUDITING -> SETTLING -> SETTLED
              \        \            |           |-> REFUNDED
               `---> NEEDS_REVIEW <-'           `-> NEEDS_REVIEW (on PayPal failure)
```

### Key API Surface
| Method | Route | Purpose |
|---|---|---|
| POST | `/jobs` | Create job + LLM acceptance matrix (weights sum 10000bp, gates are rules only) |
| POST | `/jobs/{id}/fund` | Live: returns PayPal approval URL. Prefunded: seeds capture |
| GET | `/paypal/return` | Buyer returns from PayPal; capture runs exactly once |
| POST | `/jobs/{id}/submit` | Run rules → injection scan → bounded LLM audit → decide → settle |
| GET/POST | `/reviews`, `/review/{id}/decide` | Human review queue; APPROVE/ADJUST/REJECT |
| GET | `/verify-chain` | Verify the full receipt hash chain |
| GET | `/ledger/events`, `/master` | Money-event ledger + audit rollup |
| GET | `/jobs/{id}/paypal-calls` | Every PayPal call for a job (kind, status, ids, fee, raw) |
| POST | `/webhooks/paypal` | Signature-verified webhook ingestion (dedupes by event_id) |
| POST | `/api/v1/agent/*` | Agent API (X-API-Key) for self-serve job creation |
| GET | `/app` | Product dashboard (built React/AG Grid UI, served same-origin) |
| GET | `/verifier/scorecard` | Adversarial-suite results served to the dashboard |
| GET | `/health` | Mongo ping + reconciler status |

Demo endpoints (gated behind `ENABLE_DEV_TOOLS=true`, else 404) back the scenario
runner and tamper test in the Scenarios/Job Detail pages. Scenario runs use the
**real** pipeline — a real LLM-built matrix, real PayPal funding and real
payout/refund. In live funding mode it is a two-step flow (approve in PayPal
between `run` and `complete`); with `FUNDING_MODE=prefunded` `run` completes in
one call.

| Method | Route | Purpose |
|---|---|---|
| GET | `/demo/scenarios` | List S1–S5 metadata (`{enabled, scenarios}`) |
| POST | `/demo/scenarios/{id}/run` | File + fund a scenario job; live mode returns the approval URL |
| POST | `/demo/scenarios/complete/{job_id}` | After capture: submit, apply the scenario's review, settle |
| POST | `/demo/tamper` | Corrupt one sealed receipt so `/verify-chain` flips invalid |

### Demo Scripts
```bash
.venv/bin/python scripts/paypal_spike.py --verify   # Step-0 hard gate (sandbox only)
.venv/bin/python scripts/seed_scenarios.py          # S1–S5 suite vs a running server
.venv/bin/python scripts/verify_chain.py            # receipt chain integrity
```

---

## ⚠️ Prototype Disclaimer
*PayOnPass is a sandbox prototype built for hackathon evaluation. It runs on the PayPal sandbox with test accounts and moves NO real money. Funds are captured into a platform balance in the sandbox and this is NOT regulated escrow.*

---

## 📡 Live Verification Status (sandbox, as of last check)

Verified live against real services (not mocks):
- ✅ MongoDB Atlas — connection + ping OK.
- ✅ PayPal OAuth — access token issued for the sandbox client.
- ✅ PayPal Payouts — a real payout batch was created to `PAYPAL_WORKER_EMAIL` (`batch_status: PENDING`, settles to `SUCCESS`); `SETTLE_MODE=paypal` is the default in `.env`.
- ✅ LLM (Gemini 2.5 Flash via OpenAI-compatible gateway) — returns valid JSON at temperature 0.

NOT yet proven live (do not claim these in the demo/README until run):
- ❌ End-to-end **capture + refund** with a real buyer approval. Funding in `live` mode creates a real order (verified live, see above), but buyer approval + capture + refund have not been exercised end-to-end on a funded job — needs a sandbox buyer account to approve the PayPal checkout. Until then, refund behavior is covered by the mocked suite only.
- ✅ **Render deploy** — live at https://payonpass.onrender.com (health OK, Mongo connected, reconciler running). S1–S5 all run on the live URL; each creates a real PayPal sandbox order and a real LLM matrix (`online:gemini` for S1/S3/S4/S5; S2 exercised the `offline-demo:llm-unavailable` fallback, proving the fallback path works).
- ❌ **Live-model fallback** — a 503 from the model routing the job to `NEEDS_REVIEW` (`AUDIT_ERROR`) has not been observed against the real provider.

If a demo claims any of the ❌ items, it is overstating what has been verified.


---

## 📜 Legal & License
Not affiliated with or endorsed by PayPal. PayPal is a trademark of PayPal, Inc.  
MIT License. See [LICENSE](LICENSE) for details.
