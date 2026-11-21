from app.graph import build_city_graph
from app.router import astar, dijkstra, compute_route
from app.models import EdgeStatus


def test_shortest_path_astar_and_dijkstra():
    nodes, edges, _, _ = build_city_graph(seed=42)
    # Route from West Civic Center (W1) to East Central Bridgehead (E9)
    res_astar = astar("W1", "E9", nodes, edges)
    res_dijkstra = dijkstra("W1", "E9", nodes, edges)

    assert len(res_astar.path) > 0
    assert res_astar.path[0] == "W1"
    assert res_astar.path[-1] == "E9"

    # Both must find optimal travel time
    assert abs(res_astar.travel_time_min - res_dijkstra.travel_time_min) < 0.1

    # A* heuristic should expand fewer or equal nodes compared to Dijkstra
    assert res_astar.nodes_expanded <= res_dijkstra.nodes_expanded


def test_routing_around_flooded_edges():
    nodes, edges, _, _ = build_city_graph(seed=42)

    # Initial route between W12 (Central bridgehead West) and E9 (Central bridgehead East)
    initial_route = compute_route("W12", "E9", nodes, edges)
    bridge_edge = "edge_W12_E9"
    assert bridge_edge in initial_route.edges_traversed

    # Flood the Central bridge!
    edges[bridge_edge].status = EdgeStatus.FLOODED

    # Re-route: Router MUST detour via North Bridge or South Bridge!
    reroute = compute_route("W12", "E9", nodes, edges)
    assert len(reroute.path) > 0
    assert bridge_edge not in reroute.edges_traversed
    # Detour must take longer than the direct bridge
    assert reroute.travel_time_min > initial_route.travel_time_min
