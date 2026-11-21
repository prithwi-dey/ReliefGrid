from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class NodeType(str, Enum):
    JUNCTION = "junction"
    DEPOT = "depot"
    SHELTER = "shelter"
    SOS = "sos"


class EdgeStatus(str, Enum):
    CLEAR = "clear"
    FLOODED = "flooded"


class VehicleType(str, Enum):
    AMBULANCE = "ambulance"
    BOAT = "boat"
    TRUCK = "truck"


class VehicleState(str, Enum):
    IDLE = "idle"
    EN_ROUTE_TO_SOS = "en_route_to_sos"
    LOADING = "loading"
    EN_ROUTE_TO_SHELTER = "en_route_to_shelter"
    UNLOADING = "unloading"
    STUCK = "stuck"
    RETURNING = "returning"


class IncidentType(str, Enum):
    CRITICAL_MEDICAL = "critical_medical"
    STRANDED_FAMILY = "stranded_family"
    SUPPLY_REQUEST = "supply_request"


class IncidentStatus(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    FAILED = "failed"


class ShelterStatus(str, Enum):
    OPEN = "open"
    NEAR_CAPACITY = "near_capacity"
    FULL = "full"
    OVERFLOWED = "overflowed"


class DispatchPolicy(str, Enum):
    OPTIMIZED = "optimized"
    FIFO = "fifo"


class Node(BaseModel):
    id: str
    x: float
    y: float
    type: NodeType = NodeType.JUNCTION
    name: Optional[str] = None


class Edge(BaseModel):
    id: str
    from_node: str
    to_node: str
    length_km: float
    base_travel_time: float  # Base ticks/minutes needed to traverse
    status: EdgeStatus = EdgeStatus.CLEAR
    is_bridge: bool = False


class Vehicle(BaseModel):
    id: str
    name: str
    type: VehicleType
    capacity: int
    current_load: int = 0
    speed_factor: float = 1.0
    state: VehicleState = VehicleState.IDLE
    current_node_id: str
    x: float
    y: float
    target_node_id: Optional[str] = None
    path: List[str] = Field(default_factory=list)  # Remaining sequence of node ids
    path_coords: List[Dict[str, float]] = Field(default_factory=list)
    progress_in_edge: float = 0.0  # 0.0 to 1.0 along current edge
    assigned_incident_id: Optional[str] = None
    assigned_shelter_id: Optional[str] = None
    home_depot_id: str
    stuck_ticks_remaining: int = 0
    total_distance_km: float = 0.0
    trips_completed: int = 0
    eta_to_target: float = 0.0
    reroute_flash: bool = False  # UI trigger for rerouting morph/flash


class Incident(BaseModel):
    id: str
    location_node_id: str
    x: float
    y: float
    type: IncidentType
    people_count: int = 1
    created_at_tick: int = 0
    wait_time_ticks: int = 0
    status: IncidentStatus = IncidentStatus.PENDING
    assigned_vehicle_id: Optional[str] = None
    assigned_shelter_id: Optional[str] = None
    priority_score: float = 0.0
    response_time_ticks: Optional[int] = None  # Tick when vehicle reached scene
    resolved_time_ticks: Optional[int] = None  # Tick when evacuated to shelter


class Shelter(BaseModel):
    id: str
    name: str
    location_node_id: str
    x: float
    y: float
    beds_total: int
    beds_free: int
    beds_reserved: int = 0
    water_pct: float = 100.0
    medical_kits: int = 10
    status: ShelterStatus = ShelterStatus.OPEN
    overflow_count: int = 0


class Depot(BaseModel):
    id: str
    name: str
    location_node_id: str
    x: float
    y: float
    vehicle_ids: List[str] = Field(default_factory=list)


class EventLogItem(BaseModel):
    id: str
    tick: int
    type: str  # dispatched | rerouted | shelter_reserved | overflow | rescued | road_flooded | road_cleared | preemption | warning
    message: str
    incident_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    severity: str = "info"  # info | warning | critical | success


class KPISummary(BaseModel):
    tick: int = 0
    total_incidents: int = 0
    pending_incidents: int = 0
    in_progress_incidents: int = 0
    resolved_incidents: int = 0
    critical_resolved: int = 0
    critical_total: int = 0
    stranded_resolved: int = 0
    stranded_total: int = 0
    supplies_delivered: int = 0
    supplies_total: int = 0
    avg_critical_response_time: float = 0.0
    avg_overall_response_time: float = 0.0
    people_sheltered: int = 0
    shelter_overflows: int = 0
    stuck_vehicle_ticks: int = 0
    total_distance_km: float = 0.0
    active_vehicles: int = 0
    idle_vehicles: int = 0
    flooded_edges_count: int = 0


class SimulationState(BaseModel):
    tick: int = 0
    is_running: bool = False
    speed: int = 1  # 1x, 2x, 4x, 8x
    policy: DispatchPolicy = DispatchPolicy.OPTIMIZED
    scenario_name: str = "Urban Flash Flood"
    nodes: Dict[str, Node]
    edges: Dict[str, Edge]
    vehicles: Dict[str, Vehicle]
    incidents: Dict[str, Incident]
    shelters: Dict[str, Shelter]
    depots: Dict[str, Depot]
    kpis: KPISummary
    event_log: List[EventLogItem] = Field(default_factory=list)
    nodes_expanded_stats: Dict[str, int] = Field(default_factory=dict)
