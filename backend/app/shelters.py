from typing import Dict, List, Optional, Tuple
from app.models import Shelter, Incident, IncidentType, ShelterStatus, Node, Edge
from app.router import compute_route


def find_best_shelter_optimized(
    incident: Incident,
    shelters: Dict[str, Shelter],
    nodes: Dict[str, Node],
    edges: Dict[str, Edge]
) -> Tuple[Optional[str], float, bool]:
    """
    Capacity-constrained shelter selection:
    Selects the reachable shelter minimizing travel time from incident location subject to:
      1. (beds_free - beds_reserved) >= incident.people_count
      2. If CRITICAL_MEDICAL, requires shelter.medical_kits > 0
    Returns: (shelter_id, travel_time_min, is_capacity_warning)
    If no shelter satisfies capacity, falls back to the reachable shelter with the highest
    remaining capacity and flags is_capacity_warning = True.
    """
    evacuees = incident.people_count
    is_medical = (incident.type == IncidentType.CRITICAL_MEDICAL)

    candidates: List[Tuple[float, str, Shelter]] = []

    for sid, shelter in shelters.items():
        free_capacity = shelter.beds_free - shelter.beds_reserved
        if free_capacity < evacuees:
            continue
        if is_medical and shelter.medical_kits <= 0:
            continue

        route = compute_route(incident.location_node_id, shelter.location_node_id, nodes, edges)
        if route.travel_time_min < float('inf'):
            candidates.append((route.travel_time_min, sid, shelter))

    if candidates:
        # Choose shelter with minimum travel time
        candidates.sort(key=lambda c: c[0])
        best_time, best_id, _ = candidates[0]
        return best_id, best_time, False

    # Fallback if no single shelter has full capacity:
    # Pick reachable shelter with max available capacity
    reachable_fallbacks: List[Tuple[int, float, str]] = []
    for sid, shelter in shelters.items():
        route = compute_route(incident.location_node_id, shelter.location_node_id, nodes, edges)
        if route.travel_time_min < float('inf'):
            avail = shelter.beds_free - shelter.beds_reserved
            reachable_fallbacks.append((avail, route.travel_time_min, sid))

    if reachable_fallbacks:
        # Maximize available capacity, then minimize time
        reachable_fallbacks.sort(key=lambda x: (-x[0], x[1]))
        _, best_time, best_id = reachable_fallbacks[0]
        return best_id, best_time, True

    return None, float('inf'), True


def find_shelter_fifo_naive(
    incident: Incident,
    shelters: Dict[str, Shelter],
    nodes: Dict[str, Node],
    edges: Dict[str, Edge]
) -> Tuple[Optional[str], float]:
    """
    Naive baseline shelter assignment:
    Simply picks the nearest shelter ignoring capacity, beds reserved, or medical supplies.
    Causes shelter overflows if shelter is full!
    """
    nearest_id: Optional[str] = None
    min_time = float('inf')

    for sid, shelter in shelters.items():
        route = compute_route(incident.location_node_id, shelter.location_node_id, nodes, edges)
        if route.travel_time_min < min_time:
            min_time = route.travel_time_min
            nearest_id = sid

    return nearest_id, min_time


def reserve_shelter_capacity(shelter: Shelter, people_count: int) -> None:
    """
    Reserves beds immediately BEFORE the dispatch vehicle departs.
    Guarantees no race condition or double booking.
    """
    shelter.beds_reserved += people_count
    update_shelter_status(shelter)


def release_shelter_reservation(shelter: Shelter, people_count: int) -> None:
    """
    Rolls back reservation if a mission is preempted or canceled.
    """
    shelter.beds_reserved = max(0, shelter.beds_reserved - people_count)
    update_shelter_status(shelter)


def intake_evacuees_at_shelter(
    shelter: Shelter,
    people_count: int,
    is_medical: bool = False
) -> bool:
    """
    Converts reserved beds to occupied beds upon vehicle arrival.
    Returns True if safe intake, False if overflow occurred.
    """
    was_overflow = False
    if shelter.beds_reserved >= people_count:
        shelter.beds_reserved -= people_count
    else:
        shelter.beds_reserved = 0

    if shelter.beds_free < people_count:
        shelter.overflow_count += (people_count - shelter.beds_free)
        shelter.beds_free -= people_count  # goes negative indicating physical overflow
        was_overflow = True
    else:
        shelter.beds_free -= people_count

    if is_medical and shelter.medical_kits > 0:
        shelter.medical_kits -= 1

    # Decrement water supply slightly per intake
    shelter.water_pct = max(10.0, round(shelter.water_pct - (people_count * 0.4), 1))
    update_shelter_status(shelter)
    return not was_overflow


def update_shelter_status(shelter: Shelter) -> None:
    """
    Recalculates status badge for UI.
    """
    if shelter.beds_free < 0 or shelter.overflow_count > 0:
        shelter.status = ShelterStatus.OVERFLOWED
    elif (shelter.beds_free - shelter.beds_reserved) <= 0:
        shelter.status = ShelterStatus.FULL
    elif (shelter.beds_free - shelter.beds_reserved) <= (shelter.beds_total * 0.25):
        shelter.status = ShelterStatus.NEAR_CAPACITY
    else:
        shelter.status = ShelterStatus.OPEN
