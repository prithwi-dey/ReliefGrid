import heapq
from typing import Dict, List, Optional, Tuple
from app.models import Incident, IncidentType, IncidentStatus

BASE_SEVERITY_MAP = {
    IncidentType.CRITICAL_MEDICAL: 100.0,
    IncidentType.STRANDED_FAMILY: 60.0,
    IncidentType.SUPPLY_REQUEST: 30.0,
}


def calculate_priority_score(incident: Incident) -> float:
    """
    Computes dynamic triage score:
    score = base_severity (100 | 60 | 30) + 4 * people_count + 2.5 * minutes_waited
    Aging guarantee: Every minute waited adds 2.5 points, preventing starvation.
    """
    base = BASE_SEVERITY_MAP.get(incident.type, 30.0)
    score = base + (4.0 * incident.people_count) + (2.5 * incident.wait_time_ticks)
    return round(score, 2)


class TriageQueue:
    """
    Max-heap based priority queue for emergency incidents with tick-by-tick dynamic re-scoring.
    """
    def __init__(self):
        self._incidents: Dict[str, Incident] = {}

    def add(self, incident: Incident) -> None:
        incident.priority_score = calculate_priority_score(incident)
        self._incidents[incident.id] = incident

    def remove(self, incident_id: str) -> Optional[Incident]:
        return self._incidents.pop(incident_id, None)

    def get(self, incident_id: str) -> Optional[Incident]:
        return self._incidents.get(incident_id)

    def tick_aging(self) -> None:
        """
        Advances wait time by 1 tick for pending/assigned incidents and updates priority scores.
        """
        for incident in self._incidents.values():
            if incident.status in (IncidentStatus.PENDING, IncidentStatus.ASSIGNED):
                incident.wait_time_ticks += 1
                incident.priority_score = calculate_priority_score(incident)

    def get_priority_sorted(self) -> List[Incident]:
        """
        Returns all pending incidents sorted from highest priority to lowest priority.
        Used by the UI triage queue and the Priority-Optimized dispatcher.
        """
        pending = [inc for inc in self._incidents.values() if inc.status == IncidentStatus.PENDING]
        # Sort descending by priority score, tie-break by earlier created_at_tick
        return sorted(pending, key=lambda inc: (-inc.priority_score, inc.created_at_tick))

    def get_fifo_sorted(self) -> List[Incident]:
        """
        Returns all pending incidents strictly in arrival order (FIFO baseline).
        """
        pending = [inc for inc in self._incidents.values() if inc.status == IncidentStatus.PENDING]
        return sorted(pending, key=lambda inc: (inc.created_at_tick, inc.id))

    def pop_highest_priority(self) -> Optional[Incident]:
        """
        Extracts the highest priority pending incident from a max-heap.
        """
        pending = [inc for inc in self._incidents.values() if inc.status == IncidentStatus.PENDING]
        if not pending:
            return None

        # Max-heap using negated score
        heap: List[Tuple[float, int, str]] = []
        for inc in pending:
            heapq.heappush(heap, (-inc.priority_score, inc.created_at_tick, inc.id))

        _, _, highest_id = heapq.heappop(heap)
        return self._incidents[highest_id]

    def all_incidents(self) -> List[Incident]:
        return list(self._incidents.values())
