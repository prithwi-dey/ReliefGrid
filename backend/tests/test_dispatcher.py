from app.graph import build_city_graph
from app.models import (
    Vehicle, Incident, IncidentType, IncidentStatus, VehicleType,
    VehicleState, DispatchPolicy, EdgeStatus
)
from app.triage import TriageQueue
from app.dispatcher import (
    dispatch_optimized, handle_edge_flooded
)
from app.simulation import SimulationEngine


def test_critical_medical_preemption():
    """
    Test that when an urgent critical medical SOS arrives and ambulances are busy with
    lower priority tasks (e.g. supply request), an ambulance is preempted and diverted.
    """
    nodes, edges, shelters, depots = build_city_graph(seed=42)
    queue = TriageQueue()
    event_log = []

    # Vehicle: ambulance busy heading to supply request
    amb = Vehicle(
        id="amb_1", name="Medic-1", type=VehicleType.AMBULANCE, capacity=4,
        speed_factor=1.5, current_node_id="W6", x=nodes["W6"].x, y=nodes["W6"].y,
        state=VehicleState.EN_ROUTE_TO_SOS, assigned_incident_id="SOS-LOW",
        assigned_shelter_id="shelter_west", home_depot_id="depot_west",
        target_node_id="W18", path=["W6", "W10", "W14", "W18"]
    )
    vehicles = {"amb_1": amb}

    low_prio = Incident(
        id="SOS-LOW", location_node_id="W18", x=nodes["W18"].x, y=nodes["W18"].y,
        type=IncidentType.SUPPLY_REQUEST, people_count=2, status=IncidentStatus.ASSIGNED,
        assigned_vehicle_id="amb_1", assigned_shelter_id="shelter_west"
    )
    queue.add(low_prio)

    # Brand new critical medical SOS arrives at W10 (right along Medic-1's path)
    crit_sos = Incident(
        id="SOS-CRIT", location_node_id="W10", x=nodes["W10"].x, y=nodes["W10"].y,
        type=IncidentType.CRITICAL_MEDICAL, people_count=1, status=IncidentStatus.PENDING
    )
    queue.add(crit_sos)

    # Dispatch: Should trigger preemption!
    count = dispatch_optimized(queue, vehicles, shelters, nodes, edges, current_tick=5, event_log=event_log)
    assert count == 1
    assert amb.assigned_incident_id == "SOS-CRIT"
    assert crit_sos.status == IncidentStatus.ASSIGNED
    assert low_prio.status == IncidentStatus.PENDING
    assert any(ev.type == "preemption" for ev in event_log)


def test_dynamic_rerouting_when_edge_floods():
    """
    Acceptance criterion: Flooding a road on an active route visibly reroutes the vehicle within one tick.
    """
    engine = SimulationEngine(seed=42, policy=DispatchPolicy.OPTIMIZED)

    # Put a vehicle on an active path across Central Bridge (W12 <-> E9)
    veh = engine.vehicles["amb_1"]
    veh.state = VehicleState.EN_ROUTE_TO_SOS
    veh.current_node_id = "W12"
    veh.target_node_id = "E10"
    bridge_edge = "edge_W12_E9"
    veh.path = ["W12", "E9", "E10"]

    assert bridge_edge in engine.edges

    # Flood the bridge via toggle_road_flood
    engine.toggle_road_flood(bridge_edge)

    # In Optimized policy, the vehicle must be rerouted immediately!
    assert bridge_edge not in [f"edge_{veh.path[i]}_{veh.path[i+1]}" for i in range(len(veh.path)-1)]
    assert veh.target_node_id == "E10"
    assert veh.reroute_flash is True
    assert any(ev.type == "rerouted" for ev in engine.event_log)
