from app.graph import build_city_graph
from app.models import Incident, IncidentType, Shelter, ShelterStatus
from app.shelters import (
    find_best_shelter_optimized, find_shelter_fifo_naive,
    reserve_shelter_capacity, intake_evacuees_at_shelter
)


def test_capacity_constrained_shelter_skips_near_full_shelter():
    """
    Acceptance criterion: A vehicle carrying 6 evacuees skips a nearby shelter
    with only 3 free beds and goes to a farther one with enough capacity.
    """
    nodes, edges, shelters, _ = build_city_graph(seed=42)

    # Nearby shelter W10 (Metro Sports Center) has only 3 free beds left
    shelters["shelter_central"].beds_total = 28
    shelters["shelter_central"].beds_free = 3
    shelters["shelter_central"].beds_reserved = 0

    # Farther shelter W1 (West Arena Shelter) has 40 free beds
    shelters["shelter_west"].beds_total = 40
    shelters["shelter_west"].beds_free = 40
    shelters["shelter_west"].beds_reserved = 0

    # Incident located at W11 (very close to W10) with 6 evacuees
    inc = Incident(
        id="SOS-TEST", location_node_id="W11", x=nodes["W11"].x, y=nodes["W11"].y,
        type=IncidentType.STRANDED_FAMILY, people_count=6
    )

    # In Optimized mode, W10 cannot fit 6 evacuees (3 < 6), so it MUST pick shelter_west!
    best_id, _, is_warning = find_best_shelter_optimized(inc, shelters, nodes, edges)
    assert best_id == "shelter_west"
    assert is_warning is False

    # In Naive FIFO mode, it naively selects W10 because it is closer, ignoring capacity!
    fifo_id, _ = find_shelter_fifo_naive(inc, shelters, nodes, edges)
    assert fifo_id == "shelter_central"


def test_shelter_immediate_reservation_and_overflow_intake():
    shelter = Shelter(
        id="test_shelter", name="Test Shelter", location_node_id="W1",
        x=0, y=0, beds_total=10, beds_free=5, beds_reserved=0,
        status=ShelterStatus.OPEN
    )

    # Reserve 4 beds
    reserve_shelter_capacity(shelter, 4)
    assert shelter.beds_reserved == 4
    # Available beds left to book = beds_free - beds_reserved = 5 - 4 = 1

    # Intake 4 evacuees safely
    safe = intake_evacuees_at_shelter(shelter, 4)
    assert safe is True
    assert shelter.beds_reserved == 0
    assert shelter.beds_free == 1
    assert shelter.overflow_count == 0

    # Now attempt to intake 5 evacuees when only 1 bed is free (FIFO overflow scenario)
    safe2 = intake_evacuees_at_shelter(shelter, 5)
    assert safe2 is False
    assert shelter.overflow_count == 4
    assert shelter.status == ShelterStatus.OVERFLOWED
