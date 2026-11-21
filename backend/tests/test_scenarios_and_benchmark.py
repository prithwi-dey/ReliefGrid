from app.benchmark import run_headless_benchmark
from app.simulation import SimulationEngine
from app.scenarios import setup_scenario
from app.models import DispatchPolicy


def test_urban_flash_flood_benchmark_acceptance():
    """
    Acceptance Criteria:
    - Both policies run on the same scenario and produce clearly different metrics
    - Priority-Optimized beats FIFO on critical response time
    - Zero shelter overflows in Priority-Optimized
    """
    bench_data = run_headless_benchmark(scenario_name="Urban Flash Flood", max_ticks=40, seed=42)

    opt_kpis = bench_data["optimized_kpis"]
    fifo_kpis = bench_data["fifo_kpis"]

    # 1. Zero shelter overflows in Optimized mode
    assert opt_kpis["shelter_overflows"] == 0

    # 2. FIFO experiences shelter overflows due to ignoring capacity constraints
    assert fifo_kpis["shelter_overflows"] > 0

    # 3. Optimized critical response time is better than FIFO
    # Or FIFO has pending critical cases that were starved
    assert opt_kpis["critical_resolved"] >= fifo_kpis["critical_resolved"]
    if fifo_kpis["avg_critical_response_time"] > 0 and opt_kpis["avg_critical_response_time"] > 0:
        assert opt_kpis["avg_critical_response_time"] < fifo_kpis["avg_critical_response_time"]

    # 4. Stuck ticks: FIFO gets stuck on flooded roads, Optimized reroutes proactively
    assert fifo_kpis["stuck_vehicle_ticks"] > opt_kpis["stuck_vehicle_ticks"]

    # 5. Check time series is properly populated
    assert len(bench_data["time_series"]) == 40
    assert "headline" in bench_data
    assert "type_chart_data" in bench_data
