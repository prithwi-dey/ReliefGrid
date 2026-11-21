export type NodeType = 'junction' | 'depot' | 'shelter' | 'sos';
export type EdgeStatus = 'clear' | 'flooded';
export type VehicleType = 'ambulance' | 'boat' | 'truck';
export type VehicleState =
  | 'idle'
  | 'en_route_to_sos'
  | 'loading'
  | 'en_route_to_shelter'
  | 'unloading'
  | 'stuck'
  | 'returning';

export type IncidentType = 'critical_medical' | 'stranded_family' | 'supply_request';
export type IncidentStatus = 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'failed';
export type ShelterStatus = 'open' | 'near_capacity' | 'full' | 'overflowed';
export type DispatchPolicy = 'optimized' | 'fifo';

export interface Node {
  id: string;
  x: number;
  y: number;
  type: NodeType;
  name?: string;
}

export interface Edge {
  id: string;
  from_node: string;
  to_node: string;
  length_km: number;
  base_travel_time: number;
  status: EdgeStatus;
  is_bridge: boolean;
}

export interface Vehicle {
  id: string;
  name: string;
  type: VehicleType;
  capacity: number;
  current_load: number;
  speed_factor: number;
  state: VehicleState;
  current_node_id: string;
  x: number;
  y: number;
  target_node_id?: string | null;
  path: string[];
  progress_in_edge: number;
  assigned_incident_id?: string | null;
  assigned_shelter_id?: string | null;
  home_depot_id: string;
  stuck_ticks_remaining: number;
  total_distance_km: number;
  trips_completed: number;
  eta_to_target: number;
  reroute_flash?: boolean;
}

export interface Incident {
  id: string;
  location_node_id: string;
  x: number;
  y: number;
  type: IncidentType;
  people_count: number;
  created_at_tick: number;
  wait_time_ticks: number;
  status: IncidentStatus;
  assigned_vehicle_id?: string | null;
  assigned_shelter_id?: string | null;
  priority_score: number;
  response_time_ticks?: number | null;
  resolved_time_ticks?: number | null;
}

export interface Shelter {
  id: string;
  name: string;
  location_node_id: string;
  x: number;
  y: number;
  beds_total: number;
  beds_free: number;
  beds_reserved: number;
  water_pct: number;
  medical_kits: number;
  status: ShelterStatus;
  overflow_count: number;
}

export interface Depot {
  id: string;
  name: string;
  location_node_id: string;
  x: number;
  y: number;
  vehicle_ids: string[];
}

export interface EventLogItem {
  id: string;
  tick: number;
  type: string;
  message: string;
  incident_id?: string | null;
  vehicle_id?: string | null;
  severity: 'info' | 'warning' | 'critical' | 'success';
}

export interface KPISummary {
  tick: number;
  total_incidents: number;
  pending_incidents: number;
  in_progress_incidents: number;
  resolved_incidents: number;
  critical_resolved: number;
  critical_total: number;
  stranded_resolved: number;
  stranded_total: number;
  supplies_delivered: number;
  supplies_total: number;
  avg_critical_response_time: number;
  avg_overall_response_time: number;
  people_sheltered: number;
  shelter_overflows: number;
  stuck_vehicle_ticks: number;
  total_distance_km: number;
  active_vehicles: number;
  idle_vehicles: number;
  flooded_edges_count: number;
}

export interface SimulationState {
  tick: number;
  is_running: boolean;
  speed: number;
  policy: DispatchPolicy;
  scenario_name: string;
  nodes: Record<string, Node>;
  edges: Record<string, Edge>;
  vehicles: Record<string, Vehicle>;
  incidents: Record<string, Incident>;
  shelters: Record<string, Shelter>;
  depots: Record<string, Depot>;
  kpis: KPISummary;
  event_log: EventLogItem[];
  nodes_expanded_stats: Record<string, number>;
}

export interface BenchmarkResult {
  scenario: string;
  max_ticks: number;
  headline: string;
  optimized_kpis: KPISummary;
  fifo_kpis: KPISummary;
  time_series: Array<{
    tick: number;
    optimized_rescued: number;
    fifo_rescued: number;
    optimized_critical_time: number;
    fifo_critical_time: number;
    optimized_overflows: number;
    fifo_overflows: number;
  }>;
  type_chart_data: Array<{
    category: string;
    optimized: number;
    fifo: number;
  }>;
  summary: {
    critical_response_gain: string;
    overflow_prevention: string;
    stuck_ticks_avoided: string;
  };
}
