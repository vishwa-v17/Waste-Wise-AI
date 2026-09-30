# WasteWise AI — AI-Based Food Waste Prevention & Inventory Prioritization System

> **An intelligent AI/ML decision-support platform designed to eliminate food waste, prevent financial losses, and prioritize consumption across households, restaurants, cafeterias, hostels, and grocery businesses.**

---

## 1. Project Overview & Core Problem

Food waste is a major global ecological and financial problem. Households, restaurants, hostels, cafeterias, and grocery stores routinely discard edible food not because they lack inventory counts, but because they lack **dynamic decision-support**:
- They prioritize items purely by printed expiry dates, disregarding current stock volume versus real consumption capacity.
- They do not know **which products to use first today**, how much leftover will remain unconsumed by expiry, or when to discount, freeze, or donate items before spoilage escalates.
- Replenishment ordering is often uncoupled from dynamic shelf life, leading to compounding surplus cycles.

**WasteWise AI** transforms expiry tracking into an intelligent, proactive decision-support system. It combines:
1. **Dynamic Smart Expiry Priority Engine**: Prioritizes items based on shelf-life velocity, batch size, and consumption run-rate.
2. **Transparent Waste Risk Score (0–100)**: Non-arbitrary, explainable scoring with clear mathematical risk drivers.
3. **AI/ML Demand Prediction Pipeline**: Rigorous scikit-learn models (Linear Regression, Random Forest, Gradient Boosting) benchmarked on MAE, RMSE, and R² to forecast 1-day, 3-day, and 7-day demand.
4. **Waste & Financial Loss Forecasting**: Predicts exact potential leftover quantities and monetary loss.
5. **Action Recommendation Engine**: Context-specific guidance (`USE FIRST`, `SELL FIRST`, `DISCOUNT`, `DONATE`, `TRANSFER`, `REDUCE FUTURE PURCHASE`, `MONITOR`, `NO ACTION`) customized for Household, Restaurant/Canteen, or Grocery Store workflows.
6. **What-If Scenario Simulator**: Interactive operational scenario modeling (e.g. "What happens if we downsize milk replenishment by 20%?").
7. **Ask WasteWise AI & Natural Language Query Search**: Conversational assistant grounded in audited ML metrics without hallucinations.
8. **Automated Executive PDF Reports & CSV Tools**: Instant audit export and bulk inventory import with formula injection protection.

---

## 2. Main Features

- **Executive KPI Dashboard**: Live tracking of items expiring today, 3-day/7-day horizon, money at risk, and estimated rescued savings.
- **Priority Queue**: Dynamic multi-factor ranking assigning urgency badges (`USE FIRST`, `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- **Inventory Management**: Full inventory CRUD with OpenFoodFacts barcode scanning and CSV import/export.
- **Waste & Consumption Logger**: Track spoilage reasons, log actual daily usage, and record financial loss history.
- **What-If Scenario Simulator**: Adjust order quantities, shelf life, or demand acceleration to simulate financial and waste impact.
- **Smart Reorder Advisor**: Calculates Days of Supply (DoS) and recommends `BUY`, `MONITOR`, `WAIT`, `BUY LESS`, or `DO NOT BUY`.
- **Model Training Hub**: Train and benchmark Linear Regression, Random Forest, and Gradient Boosting with transparent MAE/RMSE/R² metrics.
- **AI Decision Assistant**: Natural language queries grounded strictly in application inventory metrics with food safety guardrails.
- **Executive PDF Audit Report**: Vector-quality downloadable PDF reports generated using ReportLab.

---

## 3. High-Level Architecture

```
                 WasteWise AI System Architecture
                               │
       ┌───────────────────────┼───────────────────────┐
       ↓                       ↓                       ↓
  Inventory Data          ML Pipeline             AI Assistant
(Expiry, Volume, Run-rate) (Demand Forecast)       (Grounded LLM)
       │                       │                       │
       └───────────┬───────────┴───────────┬───────────┘
                   ↓                       ↓
           Waste Risk Engine         Rule Engine
             (0-100 Score)     (Action Recommendations)
                   │                       │
                   └───────────┬───────────┘
                               ↓
                   Waste & Priority Analytics
                               ↓
                   LLM Explanation / Local Fallback
                               ↓
                   Interactive Web Dashboard
```

```mermaid


---

## 4. Machine Learning Component

### Purpose
The ML component is strictly responsible for **numerical demand forecasting** (predicting daily and weekly consumption based on inventory levels, day of week, seasonal month, and historical consumption lags).

> [!IMPORTANT]
> The ML model is **NOT** responsible for generating natural language chatbot responses. Natural language understanding and explanations are handled by the AI Assistant (LLM or deterministic fallback).

### Model Candidates Evaluated
1. **Linear Regression**: Fast baseline providing interpretable linear coefficient relationships.
2. **Random Forest Regressor**: Non-linear ensemble model capturing complex non-linear consumption patterns and category interactions.
3. **Gradient Boosting Regressor**: Sequential boosting minimizing residuals on continuous demand curves.

### Evaluated Metrics
- **MAE (Mean Absolute Error)**: Directly interpretable in physical units (e.g., $MAE = 0.51$ units means predictions are off by $\approx 0.51$ units on average).
- **RMSE (Root Mean Squared Error)**: Penalizes large forecasting outliers.
- **$R^2$ Score**: Quantifies the proportion of demand variance explained by the model features.

The model achieving the lowest MAE/RMSE on the evaluation split is automatically promoted to the **Champion Model** and serialized to `backend/models/champion_demand_model.joblib`.

---

## 5. Dataset & Training Process

### Synthetic Demo Dataset vs. Real Historical Data
- **Demo Mode (Synthetic Data)**: To allow out-of-the-box evaluation without requiring proprietary commercial restaurant data, `dataset_generator.py` generates a realistic 180-day benchmark time-series covering 13 diverse food categories with weekend surge patterns, random variation, and seasonal effects. All synthetic records are explicitly tagged with `"is_synthetic": True`.
- **Real Historical Data Support**: `demand_predictor.py` provides `prepare_historical_dataset(csv_path)`. If a real CSV is uploaded with columns `date`, `product_name`, `category`, and `quantity_consumed`, the pipeline automatically cleans, validates, and engineers features from the real historical data, marking the model metadata with `"dataset_type": "real"`.

### Data Leakage Prevention
To prevent information that would not be known at prediction time from contaminating features:
1. **Lagged Rolling Averages**: The 7-day rolling average uses `shift(1)` so that current-day consumption $y_t$ is strictly excluded from feature calculation.
2. **Warmup Imputation**: Initial missing values for lag features are imputed using past product group means rather than back-filling from future observations.
3. **Excluded Columns**: Future purchase orders, future waste logs, and future consumption quantities are excluded from feature inputs.

### Final ML Features
- `day_of_week` (0=Monday to 6=Sunday)
- `month` (1 to 12)
- `is_weekend` (Binary indicator)
- `quantity_in_stock` (Current volume available)
- `quantity_consumed_lag1` (Consumption yesterday)
- `quantity_consumed_lag7` (Consumption 7 days ago)
- `rolling_avg_7d` (7-day historical rolling average, strictly shifted by 1)
- `category` (One-hot encoded food category)

**Target Variable**: `quantity_consumed` (Numerical volume consumed per day).

---

## 6. Waste Risk & Priority Decision Engine

### Transparent Formula (0–100 Score)
WasteWise AI computes a transparent, explainable score combining four weighted components:

$$\text{Waste Risk Score} = \text{Time Score} + \text{Demand Score} + \text{Perishability Score} + \text{History Score}$$

1. **Time Score (0 to 45 pts)**:
   - $\le 0$ days (Expired): $45\text{ pts}$ (or boundary clamp to $100$)
   - $1\text{ day}$: $42\text{ pts}$
   - $2\text{ days}$: $38\text{ pts}$
   - $3\text{ days}$: $32\text{ pts}$
   - $7\text{ days}$: $18\text{ pts}$
2. **Demand vs. Stock Ratio (0 to 35 pts)**:
   - $\text{Expected Consumed} = \text{Days Remaining} \times \text{Daily Consumption Rate}$
   - $\text{Potential Waste} = \max(0, \text{Quantity} - \text{Expected Consumed})$
   - $\text{Demand Score} = \min\left(35, \frac{\text{Potential Waste}}{\text{Quantity}} \times 35\right)$
3. **Category & Storage Perishability (0 to 15 pts)**:
   - Category Weights: Meat/Seafood ($0.95$), Bakery/Prepared ($0.90$), Dairy ($0.85$), Produce ($0.80$), Pantry ($0.20$).
   - Storage Multiplier: Room Temperature ($1.25\times$), Refrigerator ($0.85\times$), Freezer ($0.40\times$).
4. **Historical Spoilage Frequency (0 to 5 pts)**: Based on past logged spoilage events.

### Core Acceptance Verification (Milk Scenario)
- **Product**: Pasteurized Whole Milk ($10\text{ L}$)
- **Shelf Life**: $2\text{ days remaining}$
- **Run-rate**: $2\text{ L/day}$
- **Expected Consumed**: $2\text{ days} \times 2\text{ L/day} = 4.0\text{ L}$
- **Potential Waste**: $10.0\text{ L} - 4.0\text{ L} = 6.0\text{ L}$
- **Financial Loss**: $6.0\text{ L} \times ₹60/\text{L} = ₹360.00$
- **Calculated Risk Score**: $84.85 / 100$ ($\text{CRITICAL}$)
- **Action**: $\text{USE FIRST}$ (Priority Rank: 1)

---

## 7. AI Assistant & LLM Integration

### Dual-Engine Architecture
The AI Assistant uses a resilient two-tier architecture:
- **Tier 1 (External LLM)**: If `LLM_API_KEY` is configured, calls the OpenAI Chat Completions API with strict system grounding.
- **Tier 2 (Deterministic Local Fallback)**: If `LLM_API_KEY` is omitted or the external API call fails/times out, the system automatically falls back to an offline, deterministic rule engine that analyzes the exact inventory context.

### Grounding & Guardrails
- **Zero Hallucinations**: Prompt instructions strictly mandate that the assistant only reference items, dates, and risk scores present in the verified application database.
- **Food Safety Guardrail**: The assistant never certifies that food is definitely safe to eat. When questioned about safety, it returns:
  > *"WasteWise AI does not make safety guarantees or certify that food is safe to consume. Always inspect items for spoilage (odor, appearance, texture), check manufacturer product labels, and follow applicable food-safety standards."*
- **Prompt Injection Defense**: Input messages are checked for system override patterns (`ignore previous instructions`, `reveal secrets`, `system prompt`). Malicious overrides are deflected with safe protocol responses.
- **Usage Limits**: Prompts are capped at 500 characters, completions are bounded to 400 tokens, requests time out at 10 seconds, and IP rate limiting (30 req/min) prevents API credit exhaustion.

---

## 8. Security & Hardening Highlights

| Area | Security Measure Implemented |
|:---|:---|
| **Production Secret** | Missing or default `SECRET_KEY` in production (`ENVIRONMENT=production`) fails fast on startup. |
| **Authentication** | Password hashing via `bcrypt`, 8–128 character policy, JWT expiration, and rate limiting (15 req/min). |
| **Authorization (IDOR)** | Strict ownership verification on all inventory, waste, consumption, and report records (`user_id == current_user.id`). |
| **Admin Boundary** | `POST /api/ml/train` restricted to verified administrator accounts. |
| **CSV Security** | Formula injection protection (prepends `'` to cells starting with `=`, `+`, `-`, `@`), 5 MB upload limit, 2,000 row cap. |
| **PDF Security** | XML character escaping prevents ReportLab Platypus markup injection. |
| **Barcode Gateway** | Regex validation (`^[0-9A-Za-z_-]{3,32}$`) blocks SSRF and directory traversal. |
| **Rate Limiting** | Sliding-window in-memory limiter applied across auth, AI, and file upload endpoints. |
| **HTTP Headers** | Enforces `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Permissions-Policy`. |
| **Health Check** | `GET /health` returns operational status without leaking credentials or environment variables. |

---

## 9. Local Development Setup

### Prerequisites
- Python 3.10+ (Recommended: Python 3.11 or 3.12)
- Node.js 18+ and npm
- Git

### 1. Clone & Setup Backend
```bash
git clone https://github.com/your-username/WasteWise-AI.git
cd WasteWise-AI

# Create and activate Python virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Start FastAPI backend server
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API is now running at `http://127.0.0.1:8000` (API Docs at `http://127.0.0.1:8000/docs`).

### 2. Setup Frontend
In a new terminal:
```bash
cd WasteWise-AI/frontend
npm install
npm run dev
```
The React frontend is now accessible at `http://localhost:5173`.

### 3. Demo Account Access
- **Email**: `demo@wastewise.ai`
- **Password**: `DemoPass123!`
- Or simply click **"One-Click Demo Account Login (Chef Marco)"** on the sign-in page.

---

## 10. Production Deployment Guide

### Architecture: Vercel (Frontend) + Render (Backend) + PostgreSQL (Database)

```
GitHub Repository
   ├── frontend/  ──> Deployed to Vercel (React SPA)
   └── backend/   ──> Deployed to Render (FastAPI ASGI Web Service)
                          └── Connected to Render PostgreSQL
```

### 1. Backend on Render
1. Create a new **Web Service** on [Render.com](https://render.com).
2. Connect your GitHub repository.
3. Configure settings:
   - **Root Directory**: `backend`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add **Environment Variables**:
   - `ENVIRONMENT`: `production`
   - `ENABLE_DEMO_SEED`: `false`
   - `SECRET_KEY`: Generate a 64-char key (`openssl rand -hex 32`)
   - `DATABASE_URL`: Your Render PostgreSQL connection string
   - `CORS_ORIGINS`: Your Vercel domain (e.g. `https://your-wastewise.vercel.app`)
   - `LLM_API_KEY`: Your OpenAI API key (optional; fallback engine operates offline)
   - `LLM_MODEL`: `gpt-3.5-turbo`

### 2. Frontend on Vercel
1. Import your repository into [Vercel.com](https://vercel.com).
2. Configure project:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add **Environment Variable**:
   - `VITE_API_URL`: Your Render backend URL (e.g. `https://wastewise-backend.onrender.com`)
4. Deploy! Vercel will automatically build the static assets, and SPA routing is handled via `vercel.json`.

---

## 11. Automated Testing Suite

All tests are implemented using `pytest` and can be executed with:

```bash
cd backend
pytest tests -v
```

### Test Coverage (20 / 20 Passed)
- **User Authentication Flow**: User registration, login, JWT validation, `/api/auth/me`.
- **Security Headers Verification**: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`.
- **Password Policy Enforcement**: Rejection of passwords $<8$ characters.
- **Auth Rate Limiting**: Triggers `429 Too Many Requests` on brute-force attempts.
- **IDOR Protection**: User B cannot log waste or view records belonging to User A.
- **Admin Privilege Barrier**: Non-admin users cannot trigger model training (`403 Forbidden`).
- **Barcode Validation**: Regex sanitization prevents SSRF and directory traversal.
- **CSV Formula Injection**: Escapes `=`, `@`, `+`, `-` spreadsheet triggers.
- **File Upload Limits**: Oversized files ($>5\text{ MB}$) rejected with `413`.
- **Health Check Endpoint**: `GET /health` returns operational status without leaking secrets.
- **AI Prompt Injection**: Detects and neutralizes prompt override attempts.
- **Food Safety Guardrail**: AI refuses to certify food consumption safety.
- **AI Rate Limiting**: Protects AI endpoints against token flooding.
- **Production Secret Validation**: Confirms startup failure if `SECRET_KEY` is weak in production.
- **ML Metadata & Leak-free Forecasting**: Verifies MAE, RMSE, R², dataset type, and multi-day predictions.
- **Core Acceptance Scenario**: Milk ($10\text{ L}$, $2\text{ days}$ expiry, $2\text{ L/day}$) $\rightarrow$ $4\text{ L}$ consumed, $6\text{ L}$ waste, $₹360$ loss, `USE FIRST`.
- **Priority Queue Ranking**: Perishables rank ahead of non-perishables.
- **What-If Scenario Simulator**: Tests $20\%$ volume reduction and verifies monetary savings.
- **Smart Reorder Advisor**: Computes Days of Supply and recommends replenishment actions.
- **Grounded AI Explainer**: Verifies mathematical risk breakdown in responses.

---

## 12. License & Academic Attribution
Developed as an academic software engineering project demonstrating applied Machine Learning and AI decision support in food inventory management.
