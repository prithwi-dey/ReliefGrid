from app.models import Incident, IncidentType, IncidentStatus
from app.triage import TriageQueue, calculate_priority_score


def test_triage_scoring_and_ranking():
    crit = Incident(
        id="SOS-1", location_node_id="W1", x=0, y=0,
        type=IncidentType.CRITICAL_MEDICAL, people_count=2, wait_time_ticks=0
    )
    stranded = Incident(
        id="SOS-2", location_node_id="W2", x=0, y=0,
        type=IncidentType.STRANDED_FAMILY, people_count=5, wait_time_ticks=0
    )
    supply = Incident(
        id="SOS-3", location_node_id="W3", x=0, y=0,
        type=IncidentType.SUPPLY_REQUEST, people_count=1, wait_time_ticks=0
    )

    # Score = base (100 | 60 | 30) + 4 * people + 2.5 * wait
    # crit = 100 + 4*2 + 0 = 108
    # stranded = 60 + 4*5 + 0 = 80
    # supply = 30 + 4*1 + 0 = 34
    assert calculate_priority_score(crit) == 108.0
    assert calculate_priority_score(stranded) == 80.0
    assert calculate_priority_score(supply) == 34.0

    queue = TriageQueue()
    queue.add(crit)
    queue.add(stranded)
    queue.add(supply)

    sorted_list = queue.get_priority_sorted()
    assert sorted_list[0].id == "SOS-1"
    assert sorted_list[1].id == "SOS-2"
    assert sorted_list[2].id == "SOS-3"


def test_triage_aging_prevents_starvation():
    queue = TriageQueue()

    # Low priority supply request created 40 minutes ago
    old_supply = Incident(
        id="SOS-OLD-SUPPLY", location_node_id="W3", x=0, y=0,
        type=IncidentType.SUPPLY_REQUEST, people_count=4, wait_time_ticks=35,
        created_at_tick=0
    )
    # Brand new critical medical request created right now (wait = 0)
    new_crit = Incident(
        id="SOS-NEW-CRIT", location_node_id="W1", x=0, y=0,
        type=IncidentType.CRITICAL_MEDICAL, people_count=1, wait_time_ticks=0,
        created_at_tick=35
    )

    queue.add(old_supply)
    queue.add(new_crit)

    # old_supply score = 30 + 4*4 + 2.5*35 = 30 + 16 + 87.5 = 133.5
    # new_crit score = 100 + 4*1 + 2.5*0 = 104.0
    # Aging ensures old supply request has aged and is prioritized so it doesn't starve
    assert old_supply.priority_score > new_crit.priority_score
    top = queue.pop_highest_priority()
    assert top is not None
    assert top.id == "SOS-OLD-SUPPLY"
