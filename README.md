# 🚨 ReliefGrid: Municipal Disaster Response & Rescue Dispatch Command Center

**ReliefGrid** is an interactive municipal emergency operations command center and simulation engine for disaster response, dynamic rescue vehicle dispatch, and capacity-constrained shelter allocation.

During flash floods, cyclones, and storm surges, traditional emergency dispatch systems waste critical life-saving minutes due to:
1. **First-Come-First-Served (FIFO) Dispatching**: Minor supply requests are handled before life-threatening critical medical cases.
2. **Road Network Inundation Traps**: Roads flood mid-route, stranding emergency units and halting operations.
3. **Shelter Capacity Blindness**: Evacuees are transported to the nearest shelter only to find it already full, causing dangerous overflow.

**ReliefGrid solves all three problems** and validates the solution through a **live A/B benchmark engine** comparing Priority-Optimized dispatching against naive FIFO baseline operations on identical random seeds.

---

## 🏛️ System Architecture

```
                                  +---------------------------------------+
                                  |     Vite + React 18 + TypeScript      |
                                  |   Tailwind CSS + Framer Motion + SVG  |
                                  +-------------------+-------------------+
                                                      ^
                                       WebSocket /ws  |  REST Endpoints
                                     (Tick Telemetry) |  (/sim, /sos, /bench)
                                                      v
+-----------------------------------------------------+-----------------------------------------------------+
|                                 FASTAPI PYTHON BACKEND SIMULATION ENGINE                                   |
|                                                                                                           |
|  +--------------------+    +--------------------+    +------------------------+    +-------------------+  |
|  |     ROUTER.PY      |    |     TRIAGE.PY      |    |      SHELTERS.PY       |    |   DISPATCHER.PY   |  |
|  |  * A* (Euclidean)  |    |  * Max-Heap Queue  |    |  * Capacity Guard      |    |  * Specialized    |  |
|  |  * Dijkstra        |    |  * Dynamic Aging   |    |  * Advance Booking     |    |    Vehicle Match  |  |
|  |  * Flooded Bypass  |    |  * Starvation-Free |    |  * Medical Supply Check|    |  * Preemption     |  |
|  +--------------------+    +--------------------+    +------------------------+    +-------------------+  |
|                                                     |                                                     |
|                                  +------------------v--------------------+                                |
|                                  |            SIMULATION.PY              |                                |
|                                  |   * 1 Tick = 1 Simulated Minute       |                                |
|                                  |   * Discrete-Event State Machine      |                                |
|                                  |   * Deterministic Scenario Engine     |                                |
|                                  +---------------------------------------+                                |
+-----------------------------------------------------------------------------------------------------------+
```

---

## 🚀 Quickstart & Setup

### Prerequisites
- **Python 3.11+**
- **Node.js 18+ & npm**

### 1. Run the Backend API Server
```bash
cd backend
python -m pip install fastapi uvicorn pydantic websockets pytest
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
*API docs available at: `http://localhost:8000/docs`*

### 2. Run the Frontend Command Center
```bash
cd frontend
npm install
npm run dev
```
*Open your browser at: `http://localhost:5173`*

### 3. Run Backend Test Suite
```bash
cd backend
python -m pytest tests -v
```

---

## 🌐 Production Deployment Guide

ReliefGrid is built as a cloud-ready, decoupled architecture ready to deploy on modern PaaS platforms (e.g., Render, Railway, Fly.io, Vercel, Netlify) or Docker.

### Environment Variables

| Variable | Scope | Description | Example (Production) | Example (Local) |
| :--- | :--- | :--- | :--- | :--- |
| `FRONTEND_URL` | Backend | Allowed CORS origin(s) | `https://reliefgrid.vercel.app` | `http://localhost:5173` |
| `VITE_API_URL` | Frontend | Target Backend REST base URL | `https://reliefgrid-api.onrender.com` | `http://localhost:8000` |
| `VITE_WS_URL` | Frontend | Target Backend WebSocket URL | `wss://reliefgrid-api.onrender.com/ws` | `ws://localhost:8000/ws` |

---

### Option A: Render / Railway (Backend) + Vercel / Netlify (Frontend)

#### 1. Deploy the Backend (Python / FastAPI)
1. Push repository to GitHub.
2. In **Render** or **Railway**, create a **New Web Service**:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variable**: `FRONTEND_URL=https://your-frontend-domain.vercel.app`
3. Verify deployment via the health check endpoint:
   ```bash
   curl https://your-backend-domain.onrender.com/health
   # Response: {"status":"healthy","service":"ReliefGrid Command API",...}
   ```

#### 2. Deploy the Frontend (Vite / React)
1. In **Vercel** or **Netlify**, create a **New Project**:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variables**:
     - `VITE_API_URL=https://your-backend-domain.onrender.com`
     - `VITE_WS_URL=wss://your-backend-domain.onrender.com/ws`
2. Deploy. The frontend will automatically connect via secure HTTPS and WSS!

---

### Option B: Docker Deployment (Single-Container or Compose)

#### Run with Docker:
```bash
# Backend Dockerfile
docker build -t reliefgrid-backend ./backend
docker run -d -p 8000:8000 -e FRONTEND_URL="*" reliefgrid-backend

# Frontend Dockerfile / Nginx
docker build -t reliefgrid-frontend ./frontend
docker run -d -p 5173:80 -e VITE_API_URL=http://localhost:8000 -e VITE_WS_URL=ws://localhost:8000/ws reliefgrid-frontend
```

---

## 🧠 Core Algorithms & Mathematical Foundations

### 1. Triage Priority Max-Heap with Aging Guarantee
Each emergency incident is scored dynamically every simulated minute:
$$\text{Priority Score} = \text{Base Severity} + 4 \cdot N_{\text{people}} + 2.5 \cdot t_{\text{waited}}$$
- **Base Severity Weights**:
  - `Critical Medical`: $100.0$
  - `Stranded Family`: $60.0$
  - `Supply Request`: $30.0$
- **Starvation-Free Aging**: The $+2.5 \cdot t_{\text{waited}}$ term guarantees that low-priority requests never starve; as minutes elapse, their priority score climbs until they are guaranteed service.

### 2. Dynamic A* Routing & Road Inundation Bypass
- Heuristic: Admissible and consistent Euclidean travel-time lower bound:
  $$h(u, v) = \frac{\sqrt{(x_u - x_v)^2 + (y_u - y_v)^2} \cdot 0.015 \text{ km/px}}{v_{\text{max}}}$$
- When a road or bridge floods, its edge weight becomes $\infty$.
- **Active Rerouting**: Vehicles heading towards a flooded segment immediately trigger an A* recalculation from their current junction, rerouting without penalty.
- **FIFO Penalty**: In baseline FIFO mode, vehicles that encounter flooded roads enter the `STUCK` state for a 5-tick penalty.

### 3. Capacity-Constrained Advance Shelter Reservation
Before a rescue vehicle departs:
1. Filters reachable shelters satisfying $(\text{Beds}_{\text{free}} - \text{Beds}_{\text{reserved}}) \ge N_{\text{evacuees}}$.
2. For medical emergencies, verifies $\text{Medical Kits} > 0$.
3. Selects the shelter minimizing travel time via A*.
4. **Reserves beds in advance**: $\text{Beds}_{\text{reserved}} \leftarrow \text{Beds}_{\text{reserved}} + N$.
5. On arrival at the shelter, reservations safely convert to physical intake. In FIFO mode, nearest shelters are chosen blindly, resulting in catastrophic overflow.

### 4. Vehicle Preemption for Critical Incidents
If a high-severity critical medical case arrives and all ambulances are active, the optimizer scans ambulances en route to lower-priority supply requests. If diverting the ambulance delivers a faster ETA than waiting for a return, the supply task is preempted and returned to the queue, and the ambulance diverts immediately.

---

## 🎬 2-Minute Demo Script (For Presentations & Judges)

1. **[0:00 - 0:25] Scenario Walkthrough & Naive FIFO Disaster**
   - Click **Scenario: Urban Flash Flood**.
   - Switch Policy to **FIFO Baseline** (Red toggle).
   - Press **RUN** (or Space).
   - Point out that FIFO dispatches high-speed ambulances to minor supply requests first because they arrived slightly earlier.
   - Watch `East Haven Academy` shelter: because FIFO ignores capacity, it quickly turns red with **OVERFLOW (+8 people)** while the massive `West Arena Shelter` sits half-empty!

2. **[0:25 - 0:50] The Priority-Optimized Fix**
   - Press **RESET**, switch Policy to **Priority-Optimized** (Cyan toggle), and press **RUN**.
   - Notice how `Medic-1` and `Medic-3` immediately rush to **Critical Medical SOS** cases first!
   - Notice that evacuees bypass the smaller coastal shelter and are booked into shelters with guaranteed capacity. Shelter overflows remain strictly **0**.

3. **[0:50 - 1:20] Mid-Route Bridge Collapse & Dynamic Rerouting**
   - At simulated time **T+00:14**, slow speed to **1x**.
   - At **T+00:15**, the **Central Metro Bridge** floods!
   - Highlight the vehicles crossing the river: they instantly flash **"REROUTING"** and take the North or South bridge without stopping!
   - Switch back to FIFO to show that under baseline operations, vehicles get **STUCK** in the floodwaters for 5 minutes.

4. **[1:20 - 1:45] Interactive Chaos Demonstration**
   - Click **Drop SOS (S)** in Chaos Controls and click on the map to drop a Critical Medical call with 4 victims.
   - Click **Flood Road (F)** and click any active road to show live rerouting in real time.
   - Click **Surge +5 SOS** to flood the triage queue and watch the queue dynamically sort by priority.

5. **[1:45 - 2:00] The Proof: Headless A/B Benchmark & Split View**
   - Click **A/B Benchmark** (or press **B**).
   - Show the judges the side-by-side KPI cards:
     - **Critical Response Time**: Priority-Optimized responds faster to life-threatening cases.
     - **Shelter Overflows**: **0 in Optimized vs multiple in FIFO**.
     - **Cumulative Rescues Over Time**: Review the Recharts curves.
   - Click **Split View** to show both simulations running live side-by-side on dual maps.

---

## 🧪 Acceptance Criteria Checklist
- [x] Both policies run on the same scenario and produce distinct metrics.
- [x] Priority-Optimized beats FIFO on critical response time with zero shelter overflows.
- [x] Flooding a road on an active route visibly reroutes the vehicle within one tick.
- [x] A vehicle carrying 6 evacuees skips a nearby shelter with 3 free beds and goes to a farther one with enough capacity.
- [x] Operates completely offline with zero external API dependencies.
