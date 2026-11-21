import asyncio
import os
import uuid
from typing import Optional, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.models import (
    DispatchPolicy, Incident, IncidentType, SimulationState
)
from app.simulation import SimulationEngine
from app.scenarios import setup_scenario, get_scenario_catalog
from app.benchmark import run_headless_benchmark
from app.ws import ws_manager


app = FastAPI(
    title="ReliefGrid Emergency Command Center API",
    description="Disaster response, rescue dispatch, and capacity-constrained shelter allocation simulation engine",
    version="1.0.0",
)

# CORS: Read allowed origins from FRONTEND_URL environment variable
frontend_url_env = os.getenv("FRONTEND_URL", "*")
if frontend_url_env == "*":
    allowed_origins = ["*"]
else:
    allowed_origins = [url.strip() for url in frontend_url_env.split(",") if url.strip()]
    # Always include standard local Vite ports for developer convenience
    for local_dev in ["http://localhost:5173", "http://127.0.0.1:5173"]:
        if local_dev not in allowed_origins:
            allowed_origins.append(local_dev)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global simulation instance
sim_engine = SimulationEngine(seed=42, policy=DispatchPolicy.OPTIMIZED, scenario_name="Urban Flash Flood")
setup_scenario(sim_engine, "Urban Flash Flood")

# Background simulation runner task
sim_task: Optional[asyncio.Task] = None


async def simulation_loop():
    """
    Ticks the simulation forward while sim_engine.is_running is True.
    Broadcasts full state snapshot over WebSocket at each tick.
    """
    while True:
        try:
            if sim_engine.is_running:
                sim_engine.step()
                state_data = sim_engine.get_state().model_dump()
                await ws_manager.broadcast_json(state_data)

            # Delay based on speed: 1x = 1.0s, 2x = 0.5s, 4x = 0.25s, 8x = 0.125s
            delay = max(0.1, 1.0 / sim_engine.speed)
            await asyncio.sleep(delay)
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[SIM LOOP ERROR]: {e}")
            await asyncio.sleep(1.0)


@app.on_event("startup")
async def startup_event():
    global sim_task
    sim_task = asyncio.create_task(simulation_loop())


@app.on_event("shutdown")
async def shutdown_event():
    global sim_task
    if sim_task:
        sim_task.cancel()


# --- HEALTH CHECK & STATUS ---

@app.get("/health")
def health_check():
    """
    Deployment health probe endpoint.
    """
    return {
        "status": "healthy",
        "service": "ReliefGrid Command API",
        "version": "1.0.0",
        "tick": sim_engine.tick,
        "is_running": sim_engine.is_running,
        "active_vehicles": sim_engine.kpis.active_vehicles,
        "policy": sim_engine.policy.value,
        "scenario": sim_engine.scenario_name,
    }


# --- REQUEST MODELS ---
class LoadScenarioRequest(BaseModel):
    name: str


class SpeedRequest(BaseModel):
    speed: int  # 1, 2, 4, 8


class PolicyRequest(BaseModel):
    policy: str  # "optimized" or "fifo"


class AddSosRequest(BaseModel):
    location_node_id: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    type: str = "critical_medical"  # "critical_medical", "stranded_family", "supply_request"
    people_count: int = 2


# --- REST ENDPOINTS ---

@app.get("/state", response_model=SimulationState)
def get_current_state():
    return sim_engine.get_state()


@app.get("/scenarios")
def list_scenarios():
    return get_scenario_catalog()


@app.post("/scenario/load")
async def load_scenario_endpoint(req: LoadScenarioRequest):
    sim_engine.is_running = False
    setup_scenario(sim_engine, req.name)
    state_data = sim_engine.get_state().model_dump()
    await ws_manager.broadcast_json(state_data)
    return {"status": "loaded", "scenario": req.name, "tick": sim_engine.tick}


@app.post("/sim/start")
async def start_sim():
    sim_engine.is_running = True
    return {"status": "started", "tick": sim_engine.tick}


@app.post("/sim/pause")
async def pause_sim():
    sim_engine.is_running = False
    return {"status": "paused", "tick": sim_engine.tick}


@app.post("/sim/step")
async def step_sim():
    sim_engine.is_running = False
    sim_engine.step()
    state_data = sim_engine.get_state().model_dump()
    await ws_manager.broadcast_json(state_data)
    return {"status": "stepped", "tick": sim_engine.tick}


@app.post("/sim/reset")
async def reset_sim():
    sim_engine.is_running = False
    setup_scenario(sim_engine, sim_engine.scenario_name)
    state_data = sim_engine.get_state().model_dump()
    await ws_manager.broadcast_json(state_data)
    return {"status": "reset", "scenario": sim_engine.scenario_name, "tick": 0}


@app.post("/sim/speed")
async def set_speed(req: SpeedRequest):
    if req.speed not in [1, 2, 4, 8]:
        raise HTTPException(status_code=400, detail="Speed must be 1, 2, 4, or 8")
    sim_engine.speed = req.speed
    return {"status": "speed_set", "speed": sim_engine.speed}


@app.post("/policy")
async def set_policy(req: PolicyRequest):
    p = req.policy.lower()
    if p in ("optimized", "priority", "priority-optimized"):
        sim_engine.policy = DispatchPolicy.OPTIMIZED
    elif p in ("fifo", "naive", "baseline"):
        sim_engine.policy = DispatchPolicy.FIFO
    else:
        raise HTTPException(status_code=400, detail="Policy must be 'optimized' or 'fifo'")

    state_data = sim_engine.get_state().model_dump()
    await ws_manager.broadcast_json(state_data)
    return {"status": "policy_updated", "policy": sim_engine.policy.value}


@app.post("/sos")
async def create_sos(req: AddSosRequest):
    # Find nearest junction node if x,y provided or use explicit node_id
    loc_id = req.location_node_id
    if not loc_id or loc_id not in sim_engine.nodes:
        if req.x is not None and req.y is not None:
            # Find closest node to given coordinates
            min_dist = float('inf')
            best_nid = "W1"
            for nid, node in sim_engine.nodes.items():
                d = (node.x - req.x)**2 + (node.y - req.y)**2
                if d < min_dist:
                    min_dist = d
                    best_nid = nid
            loc_id = best_nid
        else:
            loc_id = "W1"

    node = sim_engine.nodes[loc_id]
    inc_type = IncidentType(req.type)

    incident = Incident(
        id=f"SOS-{str(uuid.uuid4())[:4].upper()}",
        location_node_id=loc_id,
        x=node.x,
        y=node.y,
        type=inc_type,
        people_count=req.people_count,
        created_at_tick=sim_engine.tick,
    )

    sim_engine.add_incident(incident)
    state_data = sim_engine.get_state().model_dump()
    await ws_manager.broadcast_json(state_data)

    return {"status": "created", "incident": incident.model_dump()}


@app.post("/road/{edge_id}/toggle")
async def toggle_road(edge_id: str):
    res = sim_engine.toggle_road_flood(edge_id)
    if res is None:
        raise HTTPException(status_code=404, detail=f"Edge {edge_id} not found")

    state_data = sim_engine.get_state().model_dump()
    await ws_manager.broadcast_json(state_data)
    return {"status": "toggled", "edge_id": edge_id, "new_status": res.value}


@app.post("/dispatch/auto")
async def auto_dispatch_and_optimize():
    """
    Immediate one-click auto-dispatch: triggers dispatcher and steps the simulation.
    """
    sim_engine.step()
    state_data = sim_engine.get_state().model_dump()
    await ws_manager.broadcast_json(state_data)
    return {"status": "optimized_and_dispatched", "tick": sim_engine.tick, "kpis": sim_engine.kpis.model_dump()}


@app.get("/benchmark")
def run_benchmark_endpoint(scenario: str = "Urban Flash Flood", ticks: int = 60):
    """
    Executes headless A/B benchmark comparing Priority-Optimized vs Naive FIFO.
    """
    return run_headless_benchmark(scenario_name=scenario, max_ticks=ticks, seed=sim_engine.seed)


# --- WEBSOCKET ENDPOINT ---

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Immediately stream current state on connect
        await websocket.send_json(sim_engine.get_state().model_dump())
        while True:
            # Listen for client control commands over WebSocket if any
            data = await websocket.receive_text()
            # Heartbeat / ping
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
