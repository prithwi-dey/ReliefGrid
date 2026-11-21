from typing import List, Dict, Any
from app.models import Incident, IncidentType, DispatchPolicy
from app.simulation import SimulationEngine


def get_scenario_catalog() -> List[Dict[str, Any]]:
    return [
        {
            "id": "urban_flash_flood",
            "name": "Urban Flash Flood",
            "description": "12 incidents across both river banks. Central Metro Bridge collapses/floods at tick 15, forcing immediate dynamic rerouting.",
            "sos_count": 12,
            "duration_ticks": 60,
        },
        {
            "id": "cyclone_coastal_surge",
            "name": "Cyclone Coastal Surge",
            "description": "18 incidents along the vulnerable coastal sectors with progressive storm surge flooding 4 critical coastal arterials.",
            "sos_count": 18,
            "duration_ticks": 80,
        },
        {
            "id": "sandbox",
            "name": "Sandbox (Command Free-Play)",
            "description": "Clean municipal canvas. Drop SOS incidents, manually toggle road floods, and trigger custom emergency surges.",
            "sos_count": 0,
            "duration_ticks": 100,
        }
    ]


def setup_scenario(engine: SimulationEngine, scenario_name: str) -> None:
    """
    Configures initial incidents and scripted timeline of floods and arrivals.
    Identical across both policies for 100% fair A/B benchmarking.
    """
    name_lower = scenario_name.lower()
    engine.scenario_name = scenario_name
    engine.tick = 0
    engine.is_running = False
    engine.event_log.clear()
    engine.scheduled_events.clear()

    # Reset road statuses to CLEAR
    for edge in engine.edges.values():
        edge.status = edge.status.__class__.CLEAR

    # Reset shelters
    for sid, s in engine.shelters.items():
        if "east" in sid:
            s.beds_total = 10 if "cyclone" not in name_lower else 8
        elif "central" in sid:
            s.beds_total = 24 if "cyclone" not in name_lower else 18
        else:
            s.beds_total = 40
        s.beds_free = s.beds_total
        s.beds_reserved = 0
        s.overflow_count = 0
        s.water_pct = 100.0
        s.medical_kits = 20 if "west" in sid else (14 if "central" in sid else 4)
        s.status = s.status.__class__.OPEN

    # Re-initialize fleet
    engine._initialize_fleet()

    # Clear triage queue
    for inc_id in [i.id for i in engine.triage_queue.all_incidents()]:
        engine.triage_queue.remove(inc_id)

    name_lower = scenario_name.lower()

    if "cyclone" in name_lower:
        # CYCLONE COASTAL SURGE
        initial_sos = [
            ("SOS-C1", "E4", IncidentType.CRITICAL_MEDICAL, 2, 0),
            ("SOS-C2", "E8", IncidentType.STRANDED_FAMILY, 5, 0),
            ("SOS-C3", "E12", IncidentType.SUPPLY_REQUEST, 3, 0),
            ("SOS-C4", "E16", IncidentType.CRITICAL_MEDICAL, 3, 0),
            ("SOS-C5", "E20", IncidentType.STRANDED_FAMILY, 6, 0),
            ("SOS-C6", "E15", IncidentType.CRITICAL_MEDICAL, 1, 0),
            ("SOS-C7", "E7", IncidentType.SUPPLY_REQUEST, 4, 0),
            ("SOS-C8", "E19", IncidentType.STRANDED_FAMILY, 7, 0),
        ]
        for sid, loc, itype, count, tick in initial_sos:
            node = engine.nodes[loc]
            engine.add_incident(Incident(
                id=sid,
                location_node_id=loc,
                x=node.x,
                y=node.y,
                type=itype,
                people_count=count,
                created_at_tick=tick,
            ))

        # Staged arrivals & Floods
        engine.scheduled_events = [
            {"tick": 5, "type": "flood_edge", "edge_id": "edge_E3_E4"},
            {"tick": 7, "type": "sos", "id": "SOS-C9", "location": "E11", "incident_type": "critical_medical", "people_count": 2},
            {"tick": 10, "type": "flood_edge", "edge_id": "edge_E11_E12"},
            {"tick": 12, "type": "sos", "id": "SOS-C10", "location": "E18", "incident_type": "stranded_family", "people_count": 4},
            {"tick": 14, "type": "flood_edge", "edge_id": "edge_E15_E16"},
            {"tick": 16, "type": "sos", "id": "SOS-C11", "location": "E2", "incident_type": "critical_medical", "people_count": 1},
            {"tick": 18, "type": "sos", "id": "SOS-C12", "location": "E6", "incident_type": "supply_request", "people_count": 5},
            {"tick": 20, "type": "flood_edge", "edge_id": "edge_W16_E13"},  # South Bridge floods!
            {"tick": 22, "type": "sos", "id": "SOS-C13", "location": "E10", "incident_type": "stranded_family", "people_count": 8},
            {"tick": 25, "type": "sos", "id": "SOS-C14", "location": "E14", "incident_type": "critical_medical", "people_count": 3},
            {"tick": 28, "type": "sos", "id": "SOS-C15", "location": "E19", "incident_type": "supply_request", "people_count": 2},
            {"tick": 30, "type": "sos", "id": "SOS-C16", "location": "E22", "incident_type": "stranded_family", "people_count": 4},
            {"tick": 33, "type": "sos", "id": "SOS-C17", "location": "E7", "incident_type": "critical_medical", "people_count": 2},
            {"tick": 36, "type": "sos", "id": "SOS-C18", "location": "E13", "incident_type": "stranded_family", "people_count": 6},
        ]

    elif "sandbox" in name_lower:
        # SANDBOX: Clean slate for interactive user chaos
        engine.scheduled_events = []

    else:
        # DEFAULT: URBAN FLASH FLOOD (12 SOS, 3 shelters, Central bridge floods at tick 15)
        # Demonstrates:
        # (1) FIFO dispatches minor supply requests before life-threatening critical cases
        # (2) Bridge floods at tick 15 trapping FIFO vehicles while Optimized proactively detours
        # (3) FIFO overfills East Haven Academy (10 beds) while Optimized respects capacity
        initial_sos = [
            ("SOS-U1", "W15", IncidentType.SUPPLY_REQUEST, 4, 0),
            ("SOS-U2", "W18", IncidentType.SUPPLY_REQUEST, 3, 0),
            ("SOS-U3", "E10", IncidentType.STRANDED_FAMILY, 5, 0),
            ("SOS-U4", "E5", IncidentType.CRITICAL_MEDICAL, 2, 0),
            ("SOS-U5", "E7", IncidentType.SUPPLY_REQUEST, 4, 0),
            ("SOS-U6", "W11", IncidentType.CRITICAL_MEDICAL, 1, 0),
        ]
        for sid, loc, itype, count, tick in initial_sos:
            node = engine.nodes[loc]
            engine.add_incident(Incident(
                id=sid,
                location_node_id=loc,
                x=node.x,
                y=node.y,
                type=itype,
                people_count=count,
                created_at_tick=tick,
            ))

        engine.scheduled_events = [
            {"tick": 3, "type": "sos", "id": "SOS-U7", "location": "E11", "incident_type": "critical_medical", "people_count": 2},
            {"tick": 7, "type": "sos", "id": "SOS-U8", "location": "E9", "incident_type": "stranded_family", "people_count": 4},
            {"tick": 10, "type": "sos", "id": "SOS-U9", "location": "E2", "incident_type": "supply_request", "people_count": 5},
            {"tick": 14, "type": "sos", "id": "SOS-U10", "location": "W12", "incident_type": "critical_medical", "people_count": 2},
            {"tick": 15, "type": "flood_edge", "edge_id": "edge_W12_E9"},  # Central Metro Bridge Floods at Tick 15!
            {"tick": 18, "type": "sos", "id": "SOS-U11", "location": "E18", "incident_type": "stranded_family", "people_count": 6},
            {"tick": 22, "type": "sos", "id": "SOS-U12", "location": "W19", "incident_type": "critical_medical", "people_count": 2},
        ]
