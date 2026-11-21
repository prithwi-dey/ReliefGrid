import uuid
from typing import Dict, List, Optional, Tuple
from app.models import (
    Vehicle, Incident, Shelter, Node, Edge, VehicleType,
    VehicleState, IncidentType, IncidentStatus, DispatchPolicy,
    EventLogItem
)
from app.router import compute_route
from app.shelters import (
    find_best_shelter_optimized, find_shelter_fifo_naive,
    reserve_shelter_capacity, release_shelter_reservation
)
from app.triage import TriageQueue

SUITABLE_VEHICLES_MAP = {
    IncidentType.CRITICAL_MEDICAL: [VehicleType.AMBULANCE],
    IncidentType.STRANDED_FAMILY: [VehicleType.BOAT, VehicleType.AMBULANCE, VehicleType.TRUCK],
    IncidentType.SUPPLY_REQUEST: [VehicleType.TRUCK, VehicleType.BOAT, VehicleType.AMBULANCE],
}


def dispatch_optimized(
    triage_queue: TriageQueue,
    vehicles: Dict[str, Vehicle],
    shelters: Dict[str, Shelter],
    nodes: Dict[str, Node],
    edges: Dict[str, Edge],
    current_tick: int,
    event_log: List[EventLogItem]
) -> int:
    """
    Priority-Optimized Dispatch:
    1. Iterates incidents sorted descending by dynamic priority score (triage queue).
    2. Matches with idle vehicles prioritized by vehicle type specialization.
    3. Selects optimal vehicle with minimum ETA to incident.
    4. Supports Preemption: A critical medical incident can preempt an ambulance heading
       to a lower-priority request if its ETA is better than waiting.
    5. Reserves shelter capacity immediately BEFORE departure.
    """
    dispatched_count = 0
    priority_list = triage_queue.get_priority_sorted()

    for incident in priority_list:
        if incident.status != IncidentStatus.PENDING:
            continue

        # 1. Select shelter with capacity constraint
        shelter_id, _, is_warning = find_best_shelter_optimized(incident, shelters, nodes, edges)
        if not shelter_id:
            event_log.append(EventLogItem(
                id=str(uuid.uuid4())[:8],
                tick=current_tick,
                type="warning",
                message=f"[CAPACITY ALERT] No shelter reachable for SOS {incident.id} ({incident.people_count} evacuees)!",
                incident_id=incident.id,
                severity="critical"
            ))
            continue

        # 2. Find best suitable vehicle
        best_vehicle: Optional[Vehicle] = None
        best_eta = float('inf')
        best_path: List[str] = []

        preferred_types = SUITABLE_VEHICLES_MAP.get(incident.type, list(VehicleType))

        # Check idle vehicles matching preferred types first
        for ptype in preferred_types:
            for veh in vehicles.values():
                if veh.state == VehicleState.IDLE and veh.type == ptype:
                    route = compute_route(veh.current_node_id, incident.location_node_id, nodes, edges)
                    if route.travel_time_min < float('inf'):
                        eta = route.travel_time_min / veh.speed_factor
                        if eta < best_eta:
                            best_eta = eta
                            best_vehicle = veh
                            best_path = route.path
            if best_vehicle:
                # Found a vehicle of preferred type
                break

        # 3. Preemption logic for CRITICAL_MEDICAL cases
        if not best_vehicle and incident.type == IncidentType.CRITICAL_MEDICAL:
            # Look for an ambulance currently en route to a non-critical incident
            for veh in vehicles.values():
                if veh.type == VehicleType.AMBULANCE and veh.state == VehicleState.EN_ROUTE_TO_SOS:
                    other_inc_id = veh.assigned_incident_id
                    other_inc = triage_queue.get(other_inc_id) if other_inc_id else None
                    if other_inc and other_inc.type != IncidentType.CRITICAL_MEDICAL:
                        # Test if this ambulance can divert to the critical SOS
                        route = compute_route(veh.current_node_id, incident.location_node_id, nodes, edges)
                        if route.travel_time_min < float('inf'):
                            divert_eta = route.travel_time_min / veh.speed_factor
                            if divert_eta < best_eta:
                                # Preempt other incident!
                                best_eta = divert_eta
                                best_vehicle = veh
                                best_path = route.path

                                # Release old reservation and put other incident back to PENDING
                                if other_inc.assigned_shelter_id and other_inc.assigned_shelter_id in shelters:
                                    release_shelter_reservation(shelters[other_inc.assigned_shelter_id], other_inc.people_count)
                                other_inc.status = IncidentStatus.PENDING
                                other_inc.assigned_vehicle_id = None
                                other_inc.assigned_shelter_id = None

                                event_log.append(EventLogItem(
                                    id=str(uuid.uuid4())[:8],
                                    tick=current_tick,
                                    type="preemption",
                                    message=f"[PREEMPTION] Unit {veh.name} diverted from {other_inc.type.value} to CRITICAL SOS {incident.id}! ETA: {divert_eta:.1f}m",
                                    incident_id=incident.id,
                                    vehicle_id=veh.id,
                                    severity="warning"
                                ))
                                break

        if best_vehicle and best_path:
            # Reserve shelter capacity BEFORE vehicle departs
            reserve_shelter_capacity(shelters[shelter_id], incident.people_count)

            # Assign vehicle
            best_vehicle.state = VehicleState.EN_ROUTE_TO_SOS
            best_vehicle.assigned_incident_id = incident.id
            best_vehicle.assigned_shelter_id = shelter_id
            best_vehicle.target_node_id = incident.location_node_id
            best_vehicle.path = best_path
            best_vehicle.progress_in_edge = 0.0
            best_vehicle.eta_to_target = best_eta
            best_vehicle.reroute_flash = False

            # Update incident
            incident.status = IncidentStatus.ASSIGNED
            incident.assigned_vehicle_id = best_vehicle.id
            incident.assigned_shelter_id = shelter_id

            dispatched_count += 1
            event_log.append(EventLogItem(
                id=str(uuid.uuid4())[:8],
                tick=current_tick,
                type="dispatched",
                message=f"[DISPATCHED] {best_vehicle.name} ({best_vehicle.type.value}) dispatched to SOS {incident.id} (Prio: {incident.priority_score:.0f}, ETA: {best_eta:.1f}m). Reserved {incident.people_count} beds at {shelters[shelter_id].name}.",
                incident_id=incident.id,
                vehicle_id=best_vehicle.id,
                severity="info"
            ))

    return dispatched_count


def dispatch_fifo_baseline(
    triage_queue: TriageQueue,
    vehicles: Dict[str, Vehicle],
    shelters: Dict[str, Shelter],
    nodes: Dict[str, Node],
    edges: Dict[str, Edge],
    current_tick: int,
    event_log: List[EventLogItem]
) -> int:
    """
    Naive Baseline Policy (FIFO):
    1. Strictly serves incidents in order of creation/arrival.
    2. Assigns the nearest idle vehicle regardless of vehicle type specialization.
    3. Assigns the nearest shelter regardless of remaining bed capacity (allows overflow).
    4. No proactive preemption or dynamic avoidance.
    """
    dispatched_count = 0
    fifo_list = triage_queue.get_fifo_sorted()

    for incident in fifo_list:
        if incident.status != IncidentStatus.PENDING:
            continue

        # Baseline ignores capacity constraint: pick nearest shelter
        shelter_id, _ = find_shelter_fifo_naive(incident, shelters, nodes, edges)
        if not shelter_id:
            continue

        # Baseline ignores vehicle specialization: pick nearest idle vehicle
        best_vehicle: Optional[Vehicle] = None
        best_eta = float('inf')
        best_path: List[str] = []

        for veh in vehicles.values():
            if veh.state == VehicleState.IDLE:
                route = compute_route(veh.current_node_id, incident.location_node_id, nodes, edges)
                if route.travel_time_min < best_eta:
                    best_eta = route.travel_time_min / veh.speed_factor
                    best_vehicle = veh
                    best_path = route.path

        if best_vehicle and best_path:
            # Check if this will cause an overflow at shelter
            target_shelter = shelters[shelter_id]
            if (target_shelter.beds_free - target_shelter.beds_reserved) < incident.people_count:
                event_log.append(EventLogItem(
                    id=str(uuid.uuid4())[:8],
                    tick=current_tick,
                    type="overflow",
                    message=f"[CAPACITY MISMATCH] Baseline dispatched to full shelter {target_shelter.name}! Only {max(0, target_shelter.beds_free)} beds free for {incident.people_count} evacuees.",
                    incident_id=incident.id,
                    vehicle_id=best_vehicle.id,
                    severity="critical"
                ))

            # Naive reservation without checking limits
            reserve_shelter_capacity(target_shelter, incident.people_count)

            best_vehicle.state = VehicleState.EN_ROUTE_TO_SOS
            best_vehicle.assigned_incident_id = incident.id
            best_vehicle.assigned_shelter_id = shelter_id
            best_vehicle.target_node_id = incident.location_node_id
            best_vehicle.path = best_path
            best_vehicle.progress_in_edge = 0.0
            best_vehicle.eta_to_target = best_eta
            best_vehicle.reroute_flash = False

            incident.status = IncidentStatus.ASSIGNED
            incident.assigned_vehicle_id = best_vehicle.id
            incident.assigned_shelter_id = shelter_id

            dispatched_count += 1
            event_log.append(EventLogItem(
                id=str(uuid.uuid4())[:8],
                tick=current_tick,
                type="dispatched",
                message=f"[FIFO DISPATCH] {best_vehicle.name} sent to SOS {incident.id} (Arrival order #{incident.created_at_tick}). Target: {shelters[shelter_id].name}.",
                incident_id=incident.id,
                vehicle_id=best_vehicle.id,
                severity="info"
            ))

    return dispatched_count


def handle_edge_flooded(
    flooded_edge_id: str,
    vehicles: Dict[str, Vehicle],
    nodes: Dict[str, Node],
    edges: Dict[str, Edge],
    policy: DispatchPolicy,
    event_log: List[EventLogItem],
    current_tick: int
) -> int:
    """
    Triggered when an edge floods.
    Optimized policy: Reroutes affected vehicles immediately via A*.
    FIFO policy: Vehicles that encounter the flooded edge get stuck for 5 ticks!
    """
    if flooded_edge_id not in edges:
        return 0

    edge = edges[flooded_edge_id]
    u = edge.from_node
    v = edge.to_node
    rerouted_count = 0

    for veh in vehicles.values():
        if veh.state in (VehicleState.IDLE, VehicleState.LOADING, VehicleState.UNLOADING):
            continue

        if not veh.target_node_id or not veh.path or len(veh.path) < 2:
            continue

        # Check if the flooded edge is part of the remaining path
        is_affected = False
        for i in range(len(veh.path) - 1):
            p1 = veh.path[i]
            p2 = veh.path[i + 1]
            if (p1 == u and p2 == v) or (p1 == v and p2 == u):
                is_affected = True
                break

        if is_affected:
            if policy == DispatchPolicy.OPTIMIZED:
                # Dynamic Rerouting via A* from current vehicle node to target
                new_route = compute_route(veh.current_node_id, veh.target_node_id, nodes, edges)
                if new_route.path and len(new_route.path) > 1:
                    veh.path = new_route.path
                    veh.progress_in_edge = 0.0
                    veh.eta_to_target = new_route.travel_time_min / veh.speed_factor
                    veh.reroute_flash = True
                    rerouted_count += 1

                    event_log.append(EventLogItem(
                        id=str(uuid.uuid4())[:8],
                        tick=current_tick,
                        type="rerouted",
                        message=f"[REROUTED] Unit {veh.name} actively rerouted around flooded road {edge.id}! New ETA: {veh.eta_to_target:.1f}m ({new_route.distance_km:.1f} km).",
                        vehicle_id=veh.id,
                        severity="warning"
                    ))
                else:
                    event_log.append(EventLogItem(
                        id=str(uuid.uuid4())[:8],
                        tick=current_tick,
                        type="warning",
                        message=f"[BLOCKED] Unit {veh.name} cannot find alternate route to {veh.target_node_id}! Waiting for flood waters to recede.",
                        vehicle_id=veh.id,
                        severity="critical"
                    ))
            else:
                # FIFO Baseline Policy: Road floods under vehicle or path -> gets STUCK for 5 ticks penalty
                veh.state = VehicleState.STUCK
                veh.stuck_ticks_remaining = 5
                veh.reroute_flash = True
                event_log.append(EventLogItem(
                    id=str(uuid.uuid4())[:8],
                    tick=current_tick,
                    type="warning",
                    message=f"[STUCK PENALTY] FIFO Unit {veh.name} entered flooded road {edge.id}! Trapped in floodwater for 5 simulated minutes.",
                    vehicle_id=veh.id,
                    severity="critical"
                ))

    return rerouted_count
