import heapq
import math
from typing import Dict, List, Optional, Tuple, Set
from pydantic import BaseModel
from app.models import Node, Edge, EdgeStatus


class PathResult(BaseModel):
    path: List[str]  # Ordered sequence of node ids [start, ..., goal]
    distance_km: float
    travel_time_min: float
    nodes_expanded: int
    edges_traversed: List[str]  # Ordered sequence of edge ids


def _build_adjacency(nodes: Dict[str, Node], edges: Dict[str, Edge]) -> Dict[str, List[Tuple[str, str, float, float]]]:
    """
    Builds an adjacency list of clear (non-flooded) edges.
    Returns: node_id -> list of (neighbor_id, edge_id, length_km, travel_time_min)
    Bidirectional traversal.
    """
    adj: Dict[str, List[Tuple[str, str, float, float]]] = {nid: [] for nid in nodes}
    for eid, edge in edges.items():
        if edge.status == EdgeStatus.FLOODED:
            # Flooded edges have infinite cost and are excluded from traversal
            continue
        u = edge.from_node
        v = edge.to_node
        if u in adj and v in adj:
            adj[u].append((v, eid, edge.length_km, edge.base_travel_time))
            adj[v].append((u, eid, edge.length_km, edge.base_travel_time))
    return adj


def dijkstra(
    start_id: str,
    goal_id: str,
    nodes: Dict[str, Node],
    edges: Dict[str, Edge]
) -> PathResult:
    """
    Dijkstra's Shortest Path Algorithm on weighted road network.
    Travel time in minutes is used as the edge weight.
    Flooded edges are excluded.
    Tracks nodes_expanded for performance comparison with A*.
    """
    if start_id == goal_id:
        return PathResult(path=[start_id], distance_km=0.0, travel_time_min=0.0, nodes_expanded=0, edges_traversed=[])

    if start_id not in nodes or goal_id not in nodes:
        return PathResult(path=[], distance_km=float('inf'), travel_time_min=float('inf'), nodes_expanded=0, edges_traversed=[])

    adj = _build_adjacency(nodes, edges)

    # Priority queue stores tuples: (travel_time, counter, current_node, distance_km)
    counter = 0
    pq = [(0.0, counter, start_id, 0.0)]
    best_time: Dict[str, float] = {start_id: 0.0}
    parent: Dict[str, Tuple[Optional[str], Optional[str], float]] = {start_id: (None, None, 0.0)}  # node -> (prev_node, edge_id, edge_dist)
    visited: Set[str] = set()
    nodes_expanded = 0

    while pq:
        curr_time, _, u, curr_dist = heapq.heappop(pq)

        if u in visited:
            continue
        visited.add(u)
        nodes_expanded += 1

        if u == goal_id:
            # Reconstruct path
            path = []
            edge_ids = []
            curr: Optional[str] = goal_id
            while curr is not None:
                path.append(curr)
                prev, eid, _ = parent[curr]
                if eid is not None:
                    edge_ids.append(eid)
                curr = prev
            path.reverse()
            edge_ids.reverse()
            return PathResult(
                path=path,
                distance_km=round(curr_dist, 2),
                travel_time_min=round(curr_time, 2),
                nodes_expanded=nodes_expanded,
                edges_traversed=edge_ids,
            )

        for v, eid, length_km, base_time in adj.get(u, []):
            if v in visited:
                continue
            new_time = curr_time + base_time
            if new_time < best_time.get(v, float('inf')):
                best_time[v] = new_time
                parent[v] = (u, eid, length_km)
                counter += 1
                heapq.heappush(pq, (new_time, counter, v, curr_dist + length_km))

    # Goal unreachable (cut off by floods)
    return PathResult(path=[], distance_km=float('inf'), travel_time_min=float('inf'), nodes_expanded=nodes_expanded, edges_traversed=[])


def astar(
    start_id: str,
    goal_id: str,
    nodes: Dict[str, Node],
    edges: Dict[str, Edge]
) -> PathResult:
    """
    A* Search Algorithm with Euclidean Distance Heuristic.
    h(n) = euclidean_distance(n, goal) * 0.015 * 1.8 (consistent lower bound on travel time)
    Admissible and consistent -> guarantees optimal shortest path while expanding fewer nodes than Dijkstra.
    Flooded edges are excluded.
    """
    if start_id == goal_id:
        return PathResult(path=[start_id], distance_km=0.0, travel_time_min=0.0, nodes_expanded=0, edges_traversed=[])

    if start_id not in nodes or goal_id not in nodes:
        return PathResult(path=[], distance_km=float('inf'), travel_time_min=float('inf'), nodes_expanded=0, edges_traversed=[])

    goal_node = nodes[goal_id]

    def heuristic(nid: str) -> float:
        n = nodes[nid]
        dx = n.x - goal_node.x
        dy = n.y - goal_node.y
        dist_px = math.sqrt(dx * dx + dy * dy)
        dist_km = dist_px * 0.015
        # 1.8 min/km travel time estimate
        return dist_km * 1.8

    adj = _build_adjacency(nodes, edges)

    # Priority queue stores tuples: (f_score, counter, g_score, current_node, distance_km)
    counter = 0
    h_start = heuristic(start_id)
    pq = [(h_start, counter, 0.0, start_id, 0.0)]
    g_score: Dict[str, float] = {start_id: 0.0}
    parent: Dict[str, Tuple[Optional[str], Optional[str], float]] = {start_id: (None, None, 0.0)}
    visited: Set[str] = set()
    nodes_expanded = 0

    while pq:
        f, _, g, u, curr_dist = heapq.heappop(pq)

        if u in visited:
            continue
        visited.add(u)
        nodes_expanded += 1

        if u == goal_id:
            # Reconstruct path
            path = []
            edge_ids = []
            curr: Optional[str] = goal_id
            while curr is not None:
                path.append(curr)
                prev, eid, _ = parent[curr]
                if eid is not None:
                    edge_ids.append(eid)
                curr = prev
            path.reverse()
            edge_ids.reverse()
            return PathResult(
                path=path,
                distance_km=round(curr_dist, 2),
                travel_time_min=round(g, 2),
                nodes_expanded=nodes_expanded,
                edges_traversed=edge_ids,
            )

        for v, eid, length_km, base_time in adj.get(u, []):
            if v in visited:
                continue
            tentative_g = g + base_time
            if tentative_g < g_score.get(v, float('inf')):
                g_score[v] = tentative_g
                parent[v] = (u, eid, length_km)
                f_score = tentative_g + heuristic(v)
                counter += 1
                heapq.heappush(pq, (f_score, counter, tentative_g, v, curr_dist + length_km))

    return PathResult(path=[], distance_km=float('inf'), travel_time_min=float('inf'), nodes_expanded=nodes_expanded, edges_traversed=[])


def compute_route(
    start_id: str,
    goal_id: str,
    nodes: Dict[str, Node],
    edges: Dict[str, Edge],
    algorithm: str = "astar"
) -> PathResult:
    """
    Public router interface. Defaults to A* for speed, with Dijkstra available.
    """
    if algorithm.lower() == "dijkstra":
        return dijkstra(start_id, goal_id, nodes, edges)
    return astar(start_id, goal_id, nodes, edges)
