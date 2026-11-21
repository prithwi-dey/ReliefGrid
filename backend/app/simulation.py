import math
import uuid
from typing import Dict, List, Optional
from app.models import (
    SimulationState, Vehicle, Incident, Shelter, Depot, Node, Edge,
    VehicleState, VehicleType, IncidentType, IncidentStatus, DispatchPolicy,
    EdgeStatus, EventLogItem, KPISummary
)
from app.graph import build_city_graph
from app.router import compute_route
from app.triage import TriageQueue
from app.shelters import intake_evacuees_at_shelter
from app.dispatcher import (
    dispatch_optimized, dispatch_fifo_baseline, handle_edge_flooded
)


class SimulationEngine:
    def __init__(self, seed: int = 42, policy: DispatchPolicy = DispatchPolicy.OPTIMIZED, scenario_name: str = "Urban Flash Flood"):
        self.seed = seed
        self.policy = policy
        self.scenario_name = scenario_name
        self.tick = 0
        self.is_running = False
        self.speed = 1  # 1x, 2x, 4x, 8x
        self.nodes_expanded_stats = {"dijkstra": 0, "astar": 0}

        self.nodes, self.edges, self.shelters, self.depots = build_city_graph(seed=seed)
        self.vehicles: Dict[str, Vehicle] = {}
        self.triage_queue = TriageQueue()
        self.event_log: List[EventLogItem] = []
        self.scheduled_events: List[dict] = []
        self.kpis = KPISummary()

        self._initialize_fleet()

    def _initialize_fleet(self) -> None:
        """
        Instantiates emergency fleet across the 2 depots.
        West Depot: 2 Ambulances, 1 Rescue Boat, 1 Supply Truck
        East Depot: 1 Ambulance, 2 Rescue Boats, 1 Supply Truck
        """
        depot_w = self.depots["depot_west"]
        depot_e = self.depots["depot_east"]

        fleet_defs = [
            # West Depot Units (Sector-1)
            ("amb_1", "Medic-1 (Fast Response)", VehicleType.AMBULANCE, 4, 1.5, depot_w.location_node_id, "depot_west"),
            ("amb_2", "Medic-2 (Intensive Care)", VehicleType.AMBULANCE, 4, 1.4, depot_w.location_node_id, "depot_west"),
            ("boat_1", "River Rescue Boat Alpha", VehicleType.BOAT, 8, 0.9, depot_w.location_node_id, "depot_west"),
            ("truck_1", "Supply Hauler-1", VehicleType.TRUCK, 12, 1.0, depot_w.location_node_id, "depot_west"),

            # East Depot Units (Marine & Coastal Base)
            ("amb_3", "Coast Medic-3 (Rapid EMS)", VehicleType.AMBULANCE, 4, 1.5, depot_e.location_node_id, "depot_east"),
            ("amb_4", "Coast Medic-4 (Mobile Clinic)", VehicleType.AMBULANCE, 4, 1.4, depot_e.location_node_id, "depot_east"),
            ("boat_2", "Marine Zodiac Bravo", VehicleType.BOAT, 8, 0.9, depot_e.location_node_id, "depot_east"),
            ("truck_2", "Coast Logistics Truck-2", VehicleType.TRUCK, 12, 1.0, depot_e.location_node_id, "depot_east"),
        ]

        self.vehicles.clear()
        for vid, name, vtype, cap, speed, loc, d_id in fleet_defs:
            node = self.nodes[loc]
            self.vehicles[vid] = Vehicle(
                id=vid,
                name=name,
                type=vtype,
                capacity=cap,
                speed_factor=speed,
                current_node_id=loc,
                x=node.x,
                y=node.y,
                home_depot_id=d_id,
                state=VehicleState.IDLE,
            )

    def add_incident(self, incident: Incident) -> None:
        """
        Registers a new SOS incident into the simulation.
        """
        self.triage_queue.add(incident)
        self.event_log.append(EventLogItem(
            id=str(uuid.uuid4())[:8],
            tick=self.tick,
            type="warning" if incident.type != IncidentType.CRITICAL_MEDICAL else "critical",
            message=f"[NEW SOS] {incident.type.value.upper()} reported at junction {incident.location_node_id} ({incident.people_count} people, Initial Score: {incident.priority_score:.1f})",
            incident_id=incident.id,
            severity="critical" if incident.type == IncidentType.CRITICAL_MEDICAL else "warning"
        ))

    def toggle_road_flood(self, edge_id: str) -> Optional[EdgeStatus]:
        """
        Toggles clear/flooded status on an edge and triggers dynamic rerouting.
        """
        if edge_id not in self.edges:
            return None

        edge = self.edges[edge_id]
        if edge.status == EdgeStatus.CLEAR:
            edge.status = EdgeStatus.FLOODED
            self.event_log.append(EventLogItem(
                id=str(uuid.uuid4())[:8],
                tick=self.tick,
                type="road_flooded",
                message=f"[HAZARD] Road {edge_id} ({edge.from_node} <-> {edge.to_node}{' [BRIDGE]' if edge.is_bridge else ''}) is FLOODED and closed!",
                severity="critical"
            ))
            # Trigger dynamic reroute / stuck handling
            handle_edge_flooded(
                edge_id, self.vehicles, self.nodes, self.edges,
                self.policy, self.event_log, self.tick
            )
        else:
            edge.status = EdgeStatus.CLEAR
            self.event_log.append(EventLogItem(
                id=str(uuid.uuid4())[:8],
                tick=self.tick,
                type="road_cleared",
                message=f"[ALL CLEAR] Road {edge_id} has been pumped and cleared for transit.",
                severity="info"
            ))

        return edge.status

    def step(self) -> None:
        """
        Advances the simulation by 1 discrete tick (1 simulated minute).
        Deterministic discrete-event logic.
        """
        self.tick += 1

        # 1. Update aging in triage queue
        self.triage_queue.tick_aging()

        # 2. Process scheduled scenario events for this tick
        remaining_events = []
        for event in self.scheduled_events:
            if event.get("tick") == self.tick:
                ev_type = event.get("type")
                if ev_type == "flood_edge":
                    self.toggle_road_flood(event["edge_id"])
                elif ev_type == "sos":
                    loc = event["location"]
                    node = self.nodes.get(loc, list(self.nodes.values())[0])
                    inc = Incident(
                        id=event["id"],
                        location_node_id=loc,
                        x=node.x,
                        y=node.y,
                        type=IncidentType(event["incident_type"]),
                        people_count=event.get("people_count", 2),
                        created_at_tick=self.tick,
                    )
                    self.add_incident(inc)
            else:
                remaining_events.append(event)
        self.scheduled_events = remaining_events

        # 3. Update vehicle movements and state transitions
        for veh in self.vehicles.values():
            self._update_vehicle(veh)

        # 4. Dispatch pending incidents
        if self.policy == DispatchPolicy.OPTIMIZED:
            dispatch_optimized(
                self.triage_queue, self.vehicles, self.shelters,
                self.nodes, self.edges, self.tick, self.event_log
            )
        else:
            dispatch_fifo_baseline(
                self.triage_queue, self.vehicles, self.shelters,
                self.nodes, self.edges, self.tick, self.event_log
            )

        # 5. Compute global KPIs
        self._calculate_kpis()

    def _update_vehicle(self, veh: Vehicle) -> None:
        """
        Transitions vehicle along path segments and updates telemetry coordinates.
        """
        veh.reroute_flash = False  # Reset flash after tick

        if veh.state == VehicleState.STUCK:
            self.kpis.stuck_vehicle_ticks += 1
            veh.stuck_ticks_remaining -= 1
            if veh.stuck_ticks_remaining <= 0:
                # Penalty elapsed: replan route from current node to target
                if veh.target_node_id:
                    route = compute_route(veh.current_node_id, veh.target_node_id, self.nodes, self.edges)
                    if route.path and len(route.path) > 1:
                        veh.path = route.path
                        veh.progress_in_edge = 0.0
                        veh.state = VehicleState.EN_ROUTE_TO_SOS if veh.assigned_incident_id else VehicleState.RETURNING
                        self.event_log.append(EventLogItem(
                            id=str(uuid.uuid4())[:8],
                            tick=self.tick,
                            type="info",
                            message=f"[RESUMED] Unit {veh.name} freed from flood waters, proceeding on detoured route.",
                            vehicle_id=veh.id,
                            severity="info"
                        ))
                    else:
                        veh.stuck_ticks_remaining = 2  # Continue waiting if still trapped
            return

        if veh.state == VehicleState.IDLE:
            node = self.nodes.get(veh.current_node_id)
            if node:
                veh.x = node.x
                veh.y = node.y
            return

        if not veh.path or len(veh.path) < 2:
            return

        # Current segment is between veh.path[0] and veh.path[1]
        u_id = veh.path[0]
        v_id = veh.path[1]
        u_node = self.nodes[u_id]
        v_node = self.nodes[v_id]

        # Calculate edge length & base time
        edge_key = f"edge_{u_id}_{v_id}"
        alt_edge_key = f"edge_{v_id}_{u_id}"
        edge = self.edges.get(edge_key) or self.edges.get(alt_edge_key)
        base_time = edge.base_travel_time if edge else 3.0
        length_km = edge.length_km if edge else 2.0

        # Advance progress along this edge (speed_factor modifies speed)
        step_progress = (1.0 / max(0.5, base_time)) * veh.speed_factor
        veh.progress_in_edge += step_progress
        veh.total_distance_km += round(length_km * min(1.0, step_progress), 2)

        # Interpolate coordinates
        t = min(1.0, veh.progress_in_edge)
        veh.x = round(u_node.x + t * (v_node.x - u_node.x), 1)
        veh.y = round(u_node.y + t * (v_node.y - u_node.y), 1)

        # Update remaining ETA
        if veh.eta_to_target > 0:
            veh.eta_to_target = max(0.0, veh.eta_to_target - (1.0 * veh.speed_factor))

        if veh.progress_in_edge >= 1.0:
            # Completed edge segment!
            veh.current_node_id = v_id
            veh.path.pop(0)
            veh.progress_in_edge = 0.0

            # Did we reach the destination?
            if len(veh.path) == 1 and veh.current_node_id == veh.target_node_id:
                self._handle_destination_reached(veh)

    def _handle_destination_reached(self, veh: Vehicle) -> None:
        """
        Handles arrival at SOS incident scene, Shelter, or Depot.
        """
        if veh.state == VehicleState.EN_ROUTE_TO_SOS:
            # Reached SOS scene
            inc_id = veh.assigned_incident_id
            inc = self.triage_queue.get(inc_id) if inc_id else None
            if inc:
                inc.status = IncidentStatus.IN_PROGRESS
                inc.response_time_ticks = self.tick - inc.created_at_tick
                veh.current_load = inc.people_count

                self.event_log.append(EventLogItem(
                    id=str(uuid.uuid4())[:8],
                    tick=self.tick,
                    type="rescued",
                    message=f"[ON SCENE] Unit {veh.name} reached SOS {inc.id}. Response time: {inc.response_time_ticks}m. Loaded {inc.people_count} evacuees.",
                    incident_id=inc.id,
                    vehicle_id=veh.id,
                    severity="success"
                ))

                # Route from SOS location to the assigned shelter
                shelter_id = veh.assigned_shelter_id
                shelter = self.shelters.get(shelter_id) if shelter_id else None
                if shelter:
                    route = compute_route(veh.current_node_id, shelter.location_node_id, self.nodes, self.edges)
                    veh.state = VehicleState.EN_ROUTE_TO_SHELTER
                    veh.target_node_id = shelter.location_node_id
                    veh.path = route.path
                    veh.progress_in_edge = 0.0
                    veh.eta_to_target = route.travel_time_min / veh.speed_factor
                else:
                    # Return to depot if no shelter
                    self._route_to_depot(veh)

        elif veh.state == VehicleState.EN_ROUTE_TO_SHELTER:
            # Reached shelter with evacuees
            inc_id = veh.assigned_incident_id
            inc = self.triage_queue.get(inc_id) if inc_id else None
            shelter_id = veh.assigned_shelter_id
            shelter = self.shelters.get(shelter_id) if shelter_id else None

            if shelter and inc:
                safe_intake = intake_evacuees_at_shelter(
                    shelter, inc.people_count,
                    is_medical=(inc.type == IncidentType.CRITICAL_MEDICAL)
                )
                inc.status = IncidentStatus.RESOLVED
                inc.resolved_time_ticks = self.tick - inc.created_at_tick
                veh.trips_completed += 1
                veh.current_load = 0

                if safe_intake:
                    self.event_log.append(EventLogItem(
                        id=str(uuid.uuid4())[:8],
                        tick=self.tick,
                        type="rescued",
                        message=f"[SAFE AT SHELTER] {inc.people_count} evacuees safely sheltered at {shelter.name} ({shelter.beds_free} beds remaining). Total mission time: {inc.resolved_time_ticks}m.",
                        incident_id=inc.id,
                        vehicle_id=veh.id,
                        severity="success"
                    ))
                else:
                    self.event_log.append(EventLogItem(
                        id=str(uuid.uuid4())[:8],
                        tick=self.tick,
                        type="overflow",
                        message=f"[SHELTER OVERFLOW ALERT] {shelter.name} OVERFLOWED! {shelter.overflow_count} people exceeding bed limit!",
                        incident_id=inc.id,
                        vehicle_id=veh.id,
                        severity="critical"
                    ))

            # Return vehicle to home depot
            self._route_to_depot(veh)

        elif veh.state == VehicleState.RETURNING:
            # Returned to depot
            veh.state = VehicleState.IDLE
            veh.assigned_incident_id = None
            veh.assigned_shelter_id = None
            veh.target_node_id = None
            veh.path = []
            veh.progress_in_edge = 0.0

    def _route_to_depot(self, veh: Vehicle) -> None:
        """
        Routes vehicle back to its home depot.
        """
        depot = self.depots.get(veh.home_depot_id)
        if not depot:
            veh.state = VehicleState.IDLE
            return

        route = compute_route(veh.current_node_id, depot.location_node_id, self.nodes, self.edges)
        veh.state = VehicleState.RETURNING
        veh.target_node_id = depot.location_node_id
        veh.path = route.path
        veh.progress_in_edge = 0.0
        veh.eta_to_target = route.travel_time_min / veh.speed_factor

    def _calculate_kpis(self) -> None:
        """
        Aggregates live KPIs for municipal command center dashboard.
        Response time = time from SOS creation until emergency unit arrives on scene.
        """
        all_incidents = self.triage_queue.all_incidents()
        critical = [i for i in all_incidents if i.type == IncidentType.CRITICAL_MEDICAL]
        stranded = [i for i in all_incidents if i.type == IncidentType.STRANDED_FAMILY]
        supplies = [i for i in all_incidents if i.type == IncidentType.SUPPLY_REQUEST]

        # On-scene response time applies to incidents reached (IN_PROGRESS or RESOLVED)
        critical_reached = [i for i in critical if i.response_time_ticks is not None]
        all_reached = [i for i in all_incidents if i.response_time_ticks is not None]

        # For pending critical incidents that haven't been reached yet, account for current wait time
        crit_times = [i.response_time_ticks for i in critical_reached] + [i.wait_time_ticks for i in critical if i.response_time_ticks is None]
        all_times = [i.response_time_ticks for i in all_reached] + [i.wait_time_ticks for i in all_incidents if i.response_time_ticks is None]

        avg_crit = sum(crit_times) / max(1, len(crit_times)) if crit_times else 0.0
        avg_all = sum(all_times) / max(1, len(all_times)) if all_times else 0.0

        all_resolved = [i for i in all_incidents if i.status == IncidentStatus.RESOLVED]
        critical_resolved = [i for i in critical if i.status == IncidentStatus.RESOLVED]

        total_sheltered = sum(i.people_count for i in all_incidents if i.status == IncidentStatus.RESOLVED)
        total_overflows = sum(s.overflow_count for s in self.shelters.values())
        total_dist = sum(v.total_distance_km for v in self.vehicles.values())
        active_vehs = sum(1 for v in self.vehicles.values() if v.state != VehicleState.IDLE)
        idle_vehs = sum(1 for v in self.vehicles.values() if v.state == VehicleState.IDLE)
        flooded_count = sum(1 for e in self.edges.values() if e.status == EdgeStatus.FLOODED)

        self.kpis = KPISummary(
            tick=self.tick,
            total_incidents=len(all_incidents),
            pending_incidents=sum(1 for i in all_incidents if i.status == IncidentStatus.PENDING),
            in_progress_incidents=sum(1 for i in all_incidents if i.status in (IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS)),
            resolved_incidents=len(all_resolved),
            critical_resolved=len(critical_resolved),
            critical_total=len(critical),
            stranded_resolved=sum(1 for i in stranded if i.status == IncidentStatus.RESOLVED),
            stranded_total=len(stranded),
            supplies_delivered=sum(1 for i in supplies if i.status == IncidentStatus.RESOLVED),
            supplies_total=len(supplies),
            avg_critical_response_time=round(avg_crit, 1),
            avg_overall_response_time=round(avg_all, 1),
            people_sheltered=total_sheltered,
            shelter_overflows=total_overflows,
            stuck_vehicle_ticks=self.kpis.stuck_vehicle_ticks,
            total_distance_km=round(total_dist, 1),
            active_vehicles=active_vehs,
            idle_vehicles=idle_vehs,
            flooded_edges_count=flooded_count,
        )

    def get_state(self) -> SimulationState:
        """
        Exports full state snapshot for WebSocket stream and REST clients.
        """
        inc_dict = {i.id: i for i in self.triage_queue.all_incidents()}
        return SimulationState(
            tick=self.tick,
            is_running=self.is_running,
            speed=self.speed,
            policy=self.policy,
            scenario_name=self.scenario_name,
            nodes=self.nodes,
            edges=self.edges,
            vehicles=self.vehicles,
            incidents=inc_dict,
            shelters=self.shelters,
            depots=self.depots,
            kpis=self.kpis,
            event_log=self.event_log[-50:],  # Most recent 50 events
            nodes_expanded_stats=self.nodes_expanded_stats,
        )
