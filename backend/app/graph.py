import json
import math
import os
import random
from pathlib import Path
from typing import Dict, List, Tuple
from app.models import Node, Edge, NodeType, EdgeStatus, Shelter, Depot, ShelterStatus

CITY_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "city.json"


def build_city_graph(seed: int = 42) -> Tuple[Dict[str, Node], Dict[str, Edge], Dict[str, Shelter], Dict[str, Depot]]:
    """
    Builds an irregular ~45 junction city road network with a curving river,
    3 river bridges, inland high ground, and a coastal zone on the east.
    Loads from backend/data/city.json when available for fast deterministic startup.
    """
    if seed == 42 and CITY_DATA_PATH.exists():
        try:
            with open(CITY_DATA_PATH, "r", encoding="utf-8") as f:
                raw = json.load(f)
            nodes = {k: Node(**v) for k, v in raw["nodes"].items()}
            edges = {k: Edge(**v) for k, v in raw["edges"].items()}
            shelters = {k: Shelter(**v) for k, v in raw["shelters"].items()}
            depots = {k: Depot(**v) for k, v in raw["depots"].items()}
            return nodes, edges, shelters, depots
        except Exception as e:
            print(f"[GRAPH] Warning: Could not load {CITY_DATA_PATH}, falling back to generator: {e}")

    rng = random.Random(seed)
    nodes: Dict[str, Node] = {}
    edges: Dict[str, Edge] = {}
    shelters: Dict[str, Shelter] = {}
    depots: Dict[str, Depot] = {}

    # Define city grid layout in 1000 x 750 coordinate space
    # River flows approximately along x = 480 + 90*sin(y/120)
    # West sector: x from 60 to 440
    # East/Coastal sector: x from 540 to 940

    # Explicit anchor points for rich topology
    # 1. West Sector Nodes (Downtown, Industrial, Hospital, Hills)
    west_nodes = [
        ("W1", 100, 100, "Civic Center"),
        ("W2", 220, 90, "North Park"),
        ("W3", 340, 110, "Upper Avenue"),
        ("W4", 430, 120, "North West Bridgehead"),  # Connects to Bridge North
        ("W5", 110, 230, "Metro Hospital"),
        ("W6", 230, 220, "Downtown Transit"),
        ("W7", 350, 230, "Commercial Square"),
        ("W8", 440, 260, "River Promenade W"),
        ("W9", 90, 360, "West Rail Yard"),
        ("W10", 210, 360, "Central Plaza"),
        ("W11", 330, 370, "Market District"),
        ("W12", 430, 390, "Central Bridgehead W"),  # Connects to Central Bridge
        ("W13", 100, 490, "Industrial Heights"),
        ("W14", 220, 500, "South Substation"),
        ("W15", 340, 510, "Riverfront South"),
        ("W16", 440, 530, "South Bridgehead W"),  # Connects to South Bridge
        ("W17", 120, 630, "Hillside Terminus"),
        ("W18", 240, 640, "South Gate"),
        ("W19", 360, 630, "Lower Riverside"),
        ("W20", 280, 160, "Financial Tower"),
        ("W21", 170, 430, "Warehouse Row"),
    ]

    # 2. East / Coastal Sector Nodes (Residential, Wetlands, Marina, Beachfront)
    east_nodes = [
        ("E1", 560, 110, "North East Bridgehead"),  # Connects to Bridge North
        ("E2", 680, 100, "Northridge Residential"),
        ("E3", 800, 120, "Coastal Highway N"),
        ("E4", 920, 130, "North Shore Pier"),
        ("E5", 560, 250, "East University"),
        ("E6", 690, 240, "Botanical Gardens"),
        ("E7", 810, 250, "Harbor District"),
        ("E8", 930, 270, "Fisherman Marina"),
        ("E9", 570, 380, "Central Bridgehead E"),  # Connects to Central Bridge
        ("E10", 690, 370, "Grand Boulevard"),
        ("E11", 820, 380, "East Haven Estate"),
        ("E12", 940, 400, "Coastal Boardwalk"),
        ("E13", 560, 520, "South East Bridgehead"),  # Connects to South Bridge
        ("E14", 680, 530, "Wetland Reserve"),
        ("E15", 810, 520, "Pelican Bay"),
        ("E16", 930, 540, "Lighthouse Point"),
        ("E17", 580, 640, "Marshland Crossing"),
        ("E18", 700, 650, "Bay View Park"),
        ("E19", 830, 640, "South Dunes"),
        ("E20", 940, 660, "Oceanic Research"),
        ("E21", 750, 180, "Highland Overlook"),
        ("E22", 760, 450, "Seaside Commons"),
    ]

    for nid, x, y, name in west_nodes + east_nodes:
        # Add slight natural jitter using seed
        jx = x + rng.uniform(-10, 10)
        jy = y + rng.uniform(-8, 8)
        nodes[nid] = Node(id=nid, x=round(jx, 1), y=round(jy, 1), type=NodeType.JUNCTION, name=name)

    # Road Segments (Unidirectional internally or bidirectional pairs)
    # We will build undirected edges by registering an edge for both directions or a master Edge id
    road_pairs = [
        # West grid horizontal
        ("W1", "W2"), ("W2", "W3"), ("W3", "W4"),
        ("W5", "W6"), ("W6", "W7"), ("W7", "W8"),
        ("W9", "W10"), ("W10", "W11"), ("W11", "W12"),
        ("W13", "W14"), ("W14", "W15"), ("W15", "W16"),
        ("W17", "W18"), ("W18", "W19"),
        # West grid vertical
        ("W1", "W5"), ("W5", "W9"), ("W9", "W13"), ("W13", "W17"),
        ("W2", "W6"), ("W6", "W10"), ("W10", "W14"), ("W14", "W18"),
        ("W3", "W7"), ("W7", "W11"), ("W11", "W15"), ("W15", "W19"),
        ("W4", "W8"), ("W8", "W12"), ("W12", "W16"),
        # West diagonals/arterials
        ("W2", "W20"), ("W20", "W7"), ("W6", "W20"),
        ("W10", "W21"), ("W21", "W14"), ("W9", "W21"),
        ("W16", "W19"),

        # East grid horizontal
        ("E1", "E2"), ("E2", "E3"), ("E3", "E4"),
        ("E1", "E5"), ("E5", "E6"), ("E6", "E7"), ("E7", "E8"),
        ("E9", "E10"), ("E10", "E11"), ("E11", "E12"),
        ("E13", "E14"), ("E14", "E15"), ("E15", "E16"),
        ("E17", "E18"), ("E18", "E19"), ("E19", "E20"),
        # East grid vertical
        ("E1", "E5"), ("E5", "E9"), ("E9", "E13"), ("E13", "E17"),
        ("E2", "E6"), ("E6", "E10"), ("E10", "E14"), ("E14", "E18"),
        ("E3", "E7"), ("E7", "E11"), ("E11", "E15"), ("E15", "E19"),
        ("E4", "E8"), ("E8", "E12"), ("E12", "E16"), ("E16", "E20"),
        # East diagonals/connectors
        ("E2", "E21"), ("E21", "E7"), ("E3", "E21"),
        ("E10", "E22"), ("E22", "E15"), ("E11", "E22"),
        ("E14", "E17"),

        # THREE CRITICAL RIVER BRIDGES
        ("W4", "E1"),   # North Suspension Bridge
        ("W12", "E9"),  # Central Metro Expressway Bridge
        ("W16", "E13"), # South Coastal Causeway Bridge
    ]

    bridge_pairs = {("W4", "E1"), ("W12", "E9"), ("W16", "E13")}

    edge_count = 0
    for u, v in road_pairs:
        edge_count += 1
        n1 = nodes[u]
        n2 = nodes[v]
        dx = n1.x - n2.x
        dy = n1.y - n2.y
        dist_px = math.sqrt(dx * dx + dy * dy)
        length_km = round(dist_px * 0.015, 2)  # Scale to ~1.5 - 4.5 km per road
        is_bridge = (u, v) in bridge_pairs or (v, u) in bridge_pairs
        base_time = round(length_km * 1.8, 1)  # minutes to traverse at normal speed

        edge_id = f"edge_{u}_{v}"
        edges[edge_id] = Edge(
            id=edge_id,
            from_node=u,
            to_node=v,
            length_km=length_km,
            base_travel_time=base_time,
            status=EdgeStatus.CLEAR,
            is_bridge=is_bridge,
        )

    # 3 Shelters with distinct capacities and specializations
    # Shelter 1: West Civic Stadium (High bed capacity, inland)
    shelters["shelter_west"] = Shelter(
        id="shelter_west",
        name="West Arena Shelter",
        location_node_id="W1",
        x=nodes["W1"].x,
        y=nodes["W1"].y,
        beds_total=40,
        beds_free=40,
        beds_reserved=0,
        water_pct=100.0,
        medical_kits=20,
        status=ShelterStatus.OPEN,
    )
    nodes["W1"].type = NodeType.SHELTER

    # Shelter 2: Central Metro Gymnasium (Medium capacity, near central bridge)
    shelters["shelter_central"] = Shelter(
        id="shelter_central",
        name="Metro Sports Center",
        location_node_id="W10",
        x=nodes["W10"].x,
        y=nodes["W10"].y,
        beds_total=28,
        beds_free=28,
        beds_reserved=0,
        water_pct=95.0,
        medical_kits=14,
        status=ShelterStatus.OPEN,
    )
    nodes["W10"].type = NodeType.SHELTER

    # Shelter 3: East Haven High School (Smaller coastal shelter, realistic community shelter)
    shelters["shelter_east"] = Shelter(
        id="shelter_east",
        name="East Haven Academy",
        location_node_id="E11",
        x=nodes["E11"].x,
        y=nodes["E11"].y,
        beds_total=10,
        beds_free=10,
        beds_reserved=0,
        water_pct=85.0,
        medical_kits=4,
        status=ShelterStatus.OPEN,
    )
    nodes["E11"].type = NodeType.SHELTER

    # 2 Vehicle Depots
    # Depot 1: West Fire & Emergency Services Hub
    depots["depot_west"] = Depot(
        id="depot_west",
        name="Sector-1 Dispatch Depot",
        location_node_id="W6",
        x=nodes["W6"].x,
        y=nodes["W6"].y,
        vehicle_ids=["amb_1", "amb_2", "truck_1", "boat_1"],
    )
    nodes["W6"].type = NodeType.DEPOT

    # Depot 2: East Coast Guard & Marine Rescue Base
    depots["depot_east"] = Depot(
        id="depot_east",
        name="Coast Guard Marine Base",
        location_node_id="E7",
        x=nodes["E7"].x,
        y=nodes["E7"].y,
        vehicle_ids=["amb_3", "amb_4", "boat_2", "truck_2"],
    )
    nodes["E7"].type = NodeType.DEPOT

    return nodes, edges, shelters, depots
