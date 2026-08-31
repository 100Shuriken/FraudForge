from __future__ import annotations
import os

import time
import uuid
from dataclasses import asdict, is_dataclass
from datetime import datetime
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from red_team.agent.attack_planner import OfflineFallbackPlanner, select_planner
from red_team.agent.orchestrator import AttackOrchestrator
from red_team.agent.planner import AttackPlan
from red_team.attack_registry import AttackRegistry
from red_team.knowledge.attack_knowledge import get_attack_knowledge
from red_team.adversarial_probing import MockClassifier
from simulator.simulator import PaymentSimulator
from simulator.scenario import SCENARIO_TYPES, ScenarioGenerator, SyntheticScenario, export_dataset_files


class DatasetRequest(BaseModel):
    customers: int = Field(default=100, ge=1, le=1000)
    merchants: int = Field(default=30, ge=1, le=200)
    transactions: int = Field(default=1000, ge=1, le=10000)
    seed: int = Field(default=2026, ge=0)
    fraud_rate: float = Field(default=0.0, ge=0.0, le=1.0)
    scenario_distribution: dict[str, float] | None = None


class PlanRequest(BaseModel):
    target_id: str
    transaction_id: str | None = None
    scenario_type: str | None = None


class RunRequest(PlanRequest):
    attack_type: str | None = None
    difficulty: str | None = None
    intensity: float | None = Field(default=None, ge=0.0, le=1.0)
    number_of_transactions: int = Field(default=1, ge=1, le=25)


app = FastAPI(title="AI Defense Lab Red Team Control Center", version="1.0")
# Origins allowed to call this service. The bundled Vite dashboard keeps its
# entry; the FraudForge site is added for local dev, and the deployed origin
# comes from FF_ALLOWED_ORIGINS (comma-separated) so the Render service does
# not need a code change to learn its front end.
_DEFAULT_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3100",
    "http://127.0.0.1:3100",
]
_EXTRA_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("FF_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_DEFAULT_ORIGINS + _EXTRA_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)

simulator = PaymentSimulator()
scenario_generator = ScenarioGenerator(simulator, seed=2026)
registry = AttackRegistry(simulator)
planner = select_planner()
orchestrator = AttackOrchestrator(registry, planner=planner, seed=2026)
current_dataset: dict[str, Any] = {}
current_scenarios: list[SyntheticScenario] = []
scenarios_by_target: dict[str, SyntheticScenario] = {}
runs: dict[str, dict[str, Any]] = {}


def _json(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat(sep=" ")
    if is_dataclass(value):
        return {key: _json(item) for key, item in asdict(value).items()}
    if isinstance(value, dict):
        return {str(key): _json(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json(item) for item in value]
    if hasattr(value, "__dict__"):
        return {key: _json(item) for key, item in value.__dict__.items() if not key.startswith("_")}
    return value


def _transaction(transaction: Any) -> dict[str, Any]:
    return _json(transaction)


def _customer(customer: Any) -> dict[str, Any]:
    return _json(customer)


def _ensure_dataset() -> None:
    if not current_dataset:
        _generate(DatasetRequest())


def _generate(request: DatasetRequest) -> dict[str, Any]:
    global current_dataset, registry, planner, orchestrator, scenario_generator, current_scenarios, scenarios_by_target
    per_customer = max(1, (request.transactions + request.customers - 1) // request.customers)
    simulator.generate_dataset(
        request.customers, request.merchants,
        per_customer,
        seed=request.seed, fraud_rate=request.fraud_rate,
    )
    if len(simulator.transactions) > request.transactions:
        del simulator.transactions[request.transactions:]
    current_dataset = {"config": request.model_dump(), "data": simulator.statistics()}
    registry = AttackRegistry(simulator)
    scenario_generator = ScenarioGenerator(simulator, seed=request.seed)
    current_scenarios = scenario_generator.generate_balanced_dataset(
        simulator.customers, request.scenario_distribution, seed=request.seed,
    )
    scenarios_by_target = {scenario.target_id: scenario for scenario in current_scenarios}
    planner = select_planner()
    orchestrator = AttackOrchestrator(registry, planner=planner, seed=request.seed)
    return current_dataset


def _find_customer(customer_id: str) -> Any:
    _ensure_dataset()
    for customer in simulator.customers:
        if customer.customer_id == customer_id:
            return customer
    raise HTTPException(status_code=404, detail=f"customer not found: {customer_id}")


def _find_transaction(transaction_id: str) -> Any:
    _ensure_dataset()
    for transaction in simulator.transactions:
        if transaction.transaction_id == transaction_id:
            return transaction
    raise HTTPException(status_code=404, detail=f"transaction not found: {transaction_id}")


def _plan_payload(plan: AttackPlan) -> dict[str, Any]:
    return _json(plan)


def _context(customer: Any, transaction: Any | None, scenario: SyntheticScenario | None = None) -> dict[str, Any]:
    history = [item for item in simulator.transactions if item.customer_id == customer.customer_id]
    context: dict[str, Any] = {"transaction_history": history}
    if scenario is None:
        scenario = scenarios_by_target.get(customer.customer_id)
    if scenario is not None:
        context.update(scenario.observable_context())
    if transaction is not None:
        context["transaction"] = transaction
        context["merchant_categories"] = [
            simulator.merchants[int(item.merchant_id[1:]) - 1].category
            for item in history
            if item.merchant_id.startswith("M") and int(item.merchant_id[1:]) <= len(simulator.merchants)
        ]
    return context


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "environment": "synthetic_red_team", "planner_mode": getattr(planner, "last_mode", "OFFLINE FALLBACK")}


@app.post("/api/dataset/generate")
def generate_dataset(request: DatasetRequest) -> dict[str, Any]:
    generated = _generate(request)
    return {"config": generated["config"], "statistics": _json(generated["data"])}


@app.get("/api/attacks")
def attacks() -> list[dict[str, Any]]:
    _ensure_dataset()
    knowledge = get_attack_knowledge()
    return [{"name": name, "generator": type(attack).__name__, **knowledge.get(name, {})} for name, attack in registry._attacks.items()]


@app.get("/api/population/summary")
def population_summary() -> dict[str, Any]:
    _ensure_dataset()
    stats = _json(simulator.statistics())
    stats["scenario_statistics"] = ScenarioGenerator.statistics(current_scenarios)
    stats.update(_scenario_transaction_statistics())
    stats["auto_attack_reachability"] = _auto_attack_reachability()
    return {"config": current_dataset["config"], "statistics": stats}


@app.get("/api/customers")
def customers() -> list[dict[str, Any]]:
    _ensure_dataset()
    return [_customer(customer) for customer in simulator.customers]


@app.get("/api/customers/{customer_id}")
def customer_detail(customer_id: str) -> dict[str, Any]:
    customer = _find_customer(customer_id)
    return {"customer": _customer(customer), "transactions": [_transaction(item) for item in simulator.transactions if item.customer_id == customer_id]}


@app.get("/api/merchants")
def merchants() -> list[dict[str, Any]]:
    _ensure_dataset()
    return [_json(merchant) for merchant in simulator.merchants]


@app.get("/api/transactions")
def transactions() -> list[dict[str, Any]]:
    _ensure_dataset()
    return [_transaction(transaction) for transaction in simulator.transactions]


@app.get("/api/transactions/{transaction_id}")
def transaction_detail(transaction_id: str) -> dict[str, Any]:
    return _transaction(_find_transaction(transaction_id))


def _scenario_observable(scenario: SyntheticScenario) -> dict[str, Any]:
    payload = scenario.to_dict()
    payload.pop("ground_truth", None)
    return payload


@app.get("/api/dataset/statistics")
def dataset_statistics() -> dict[str, Any]:
    _ensure_dataset()
    stats = _json(simulator.statistics())
    stats["scenario_statistics"] = ScenarioGenerator.statistics(current_scenarios)
    stats.update(_scenario_transaction_statistics())
    stats["auto_attack_reachability"] = _auto_attack_reachability()
    return stats


def _auto_attack_reachability() -> dict[str, int]:
    reachable: dict[str, int] = {}
    for scenario in current_scenarios:
        customer = next(customer for customer in simulator.customers if customer.customer_id == scenario.target_id)
        transaction = _find_transaction(scenario.transaction_id) if scenario.transaction_id else None
        try:
            plan = orchestrator.plan(customer, _context(customer, transaction, scenario))
        except (ValueError, KeyError):
            continue
        reachable[plan.attack_type] = reachable.get(plan.attack_type, 0) + 1
    return reachable


def _scenario_transaction_statistics() -> dict[str, Any]:
    scenario_by_target = {scenario.target_id: scenario.scenario_type for scenario in current_scenarios}
    transactions_by_scenario: dict[str, int] = {}
    fraud_by_scenario: dict[str, int] = {}
    for transaction in simulator.transactions:
        scenario_type = scenario_by_target.get(transaction.customer_id, "UNASSIGNED")
        transactions_by_scenario[scenario_type] = transactions_by_scenario.get(scenario_type, 0) + 1
        if transaction.is_fraud:
            fraud_by_scenario[scenario_type] = fraud_by_scenario.get(scenario_type, 0) + 1
    return {"transactions_by_scenario": transactions_by_scenario, "fraud_by_scenario": fraud_by_scenario, "customers_by_scenario": {scenario_type: sum(item == scenario_type for item in scenario_by_target.values()) for scenario_type in SCENARIO_TYPES}}


@app.get("/api/scenarios")
def scenarios() -> list[dict[str, Any]]:
    _ensure_dataset()
    return [_scenario_observable(scenario) for scenario in current_scenarios]


@app.get("/api/scenarios/{scenario_type}")
def scenarios_by_type(scenario_type: str) -> list[dict[str, Any]]:
    _ensure_dataset()
    normalized = scenario_type.upper()
    if normalized not in SCENARIO_TYPES:
        raise HTTPException(status_code=404, detail=f"scenario type not found: {scenario_type}")
    return [_scenario_observable(scenario) for scenario in current_scenarios if scenario.scenario_type == normalized]


@app.get("/api/targets/{attack_type}")
def targets_for_attack(attack_type: str) -> list[dict[str, Any]]:
    _ensure_dataset()
    if attack_type not in registry._attacks:
        raise HTTPException(status_code=404, detail=f"attack not found: {attack_type}")
    targets = []
    for scenario in current_scenarios:
        customer = next(customer for customer in simulator.customers if customer.customer_id == scenario.target_id)
        try:
            plan = orchestrator.plan(customer, _context(customer, _find_transaction(scenario.transaction_id) if scenario.transaction_id else None, scenario))
        except (ValueError, KeyError):
            continue
        if attack_type in plan.parameters.get("applicable_attacks", []) or plan.attack_type == attack_type:
            targets.append({"target_id": scenario.target_id, "scenario_id": scenario.scenario_id, "scenario_type": scenario.scenario_type, "selected_attack": plan.attack_type, "score": plan.parameters.get("candidate_scores", {}).get(attack_type, 0), "scenario": _scenario_observable(scenario)})
    return targets


@app.post("/api/dataset/export")
def export_dataset() -> dict[str, Any]:
    _ensure_dataset()
    files = export_dataset_files(simulator, current_scenarios, "exports")
    return {"directory": "exports", "files": files}


@app.post("/api/scenarios/generate")
def generate_scenario(request: PlanRequest) -> dict[str, Any]:
    customer = _find_customer(request.target_id)
    transaction = _find_transaction(request.transaction_id) if request.transaction_id else None
    try:
        scenario = scenario_generator.generate(request.scenario_type or "AUTO", customer=customer, transaction=transaction)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"scenario": _json(scenario), "scenario_types": list(SCENARIO_TYPES)}


@app.post("/api/scenarios/dataset")
def generate_scenario_dataset(number_of_scenarios: int = 100, seed: int = 2026) -> dict[str, Any]:
    if number_of_scenarios < 0 or number_of_scenarios > 10000:
        raise HTTPException(status_code=422, detail="number_of_scenarios must be between 0 and 10000")
    _ensure_dataset()
    scenarios = scenario_generator.generate_dataset(number_of_scenarios, seed=seed)
    return {"count": len(scenarios), "seed": seed, "scenarios": [_json(scenario) for scenario in scenarios]}


@app.post("/api/planner/plan")
def make_plan(request: PlanRequest) -> dict[str, Any]:
    customer = _find_customer(request.target_id)
    transaction = _find_transaction(request.transaction_id) if request.transaction_id else None
    try:
        scenario = scenario_generator.generate(request.scenario_type, customer=customer, transaction=transaction) if request.scenario_type else scenarios_by_target.get(customer.customer_id)
        plan = orchestrator.plan(customer, _context(customer, transaction, scenario))
    except (ValueError, KeyError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"plan": _plan_payload(plan), "planner_mode": getattr(planner, "last_mode", "OFFLINE FALLBACK"), "scenario": _json(scenario) if scenario else None}


def _explicit_plan(request: RunRequest, customer: Any, transaction: Any | None, scenario: SyntheticScenario | None = None) -> AttackPlan:
    if not request.attack_type:
        return orchestrator.plan(customer, _context(customer, transaction, scenario))
    if request.attack_type not in registry._attacks:
        raise HTTPException(status_code=404, detail=f"attack not found: {request.attack_type}")
    return AttackPlan(
        attack_type=request.attack_type,
        difficulty=request.difficulty or "medium",
        intensity=request.intensity if request.intensity is not None else 0.5,
        target_id=customer.customer_id,
        rationale="Explicit attack selected from the registered synthetic generator library.",
        parameters={},
    )


def _run_attack(plan: AttackPlan, customer: Any, count: int) -> list[dict[str, Any]]:
    if plan.attack_type == "adversarial_probing":
        transaction = next((item for item in simulator.transactions if item.customer_id == customer.customer_id), None)
        baseline = {"amount": getattr(transaction, "amount", 250.0), "hour": getattr(getattr(transaction, "timestamp", None), "hour", 18), "merchant_category": "Food", "device_risk_signal": 0.2, "location_risk_signal": 0.2, "velocity_signal": 0.2}
        return [registry.get(plan.attack_type).generate(MockClassifier(), baseline=baseline, difficulty=plan.difficulty, intensity=plan.intensity, seed=current_dataset["config"]["seed"])]
    if plan.attack_type in {"phishing", "vishing", "video_deepfake", "synthetic_identity"}:
        return registry.get(plan.attack_type).generate(count, difficulty=plan.difficulty, intensity=plan.intensity)
    if plan.attack_type == "sleeper_transaction_pacing":
        return registry.get(plan.attack_type).generate(customer, sequence_length=max(7, count), difficulty=plan.difficulty, intensity=plan.intensity, seed=current_dataset["config"]["seed"])
    return registry.execute_plan(plan, customer, number_of_transactions=count)


@app.post("/api/attacks/run")
def run_attack(request: RunRequest) -> dict[str, Any]:
    started = time.perf_counter()
    customer = _find_customer(request.target_id)
    transaction = _find_transaction(request.transaction_id) if request.transaction_id else None
    scenario = scenario_generator.generate(request.scenario_type, customer=customer, transaction=transaction) if request.scenario_type else scenarios_by_target.get(customer.customer_id)
    run_id = f"RUN-{uuid.uuid4().hex[:10].upper()}"
    events = [{"stage": "target", "status": "complete", "description": f"Target {customer.customer_id} acquired"}, {"stage": "observe", "status": "complete", "description": "Customer history and transaction context loaded"}]
    try:
        plan = _explicit_plan(request, customer, transaction, scenario)
        events += [{"stage": "plan", "status": "complete", "description": f"Planner selected {plan.attack_type}"}, {"stage": "generate", "status": "running", "description": f"Initializing {type(registry.get(plan.attack_type)).__name__}"}]
        records = _run_attack(plan, customer, request.number_of_transactions)
        events += [{"stage": "execute", "status": "complete", "description": "Synthetic generator executed"}, {"stage": "record", "status": "complete", "description": "Ground truth record produced"}, {"stage": "complete", "status": "complete", "description": "Run complete"}]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    result = {"run_id": run_id, "elapsed_ms": round((time.perf_counter() - started) * 1000, 2), "planner_mode": getattr(planner, "last_mode", "OFFLINE FALLBACK"), "scenario": _json(scenario) if scenario else None, "plan": _plan_payload(plan), "events": events, "records": _json(records)}
    runs[run_id] = result
    return result


@app.post("/api/attacks/run-all")
def run_all(request: PlanRequest) -> dict[str, Any]:
    customer = _find_customer(request.target_id)
    transaction = _find_transaction(request.transaction_id) if request.transaction_id else None
    output = []
    for name in registry._attacks:
        try:
            plan = _explicit_plan(RunRequest(target_id=customer.customer_id, attack_type=name), customer, transaction)
            output.append({"attack_type": name, "status": "complete", "records": _json(_run_attack(plan, customer, 1))})
        except Exception as exc:
            output.append({"attack_type": name, "status": "error", "error": str(exc)})
    return {"target_id": customer.customer_id, "total": len(output), "successful": sum(item["status"] == "complete" for item in output), "results": output}


@app.get("/api/runs/{run_id}")
def run_detail(run_id: str) -> dict[str, Any]:
    if run_id not in runs:
        raise HTTPException(status_code=404, detail=f"run not found: {run_id}")
    return runs[run_id]


# ==========================================================================
# Defence layer
#
# backend/defense/ was written but never wired to a route, so the six trained
# model artifacts were unreachable from the API. These two endpoints expose
# what can honestly be exposed:
#
#   /api/defense/models    what is loaded and what each model requires
#   /api/defense/phishing  the one model a browser can actually drive
#
# The other five need audio MFCCs, 86-dim video features, image statistics,
# keystroke dynamics, or the 21 IEEE-CIS transaction columns that the red-team
# generator does not produce. Rather than fabricate those features and return
# a meaningless score, /api/defense/models reports the requirement and the UI
# says so plainly.
# ==========================================================================


class PhishingRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


@app.get("/api/defense/models")
def defense_models() -> dict[str, Any]:
    from backend.defense.model_manager import ModelManager
    from backend.defense.predictors import inference_requirements

    manager = ModelManager()
    try:
        manager.load_all_models()
    except Exception:  # pragma: no cover - reported per-model below
        pass

    requirements = inference_requirements()
    browser_drivable = {"phishing"}

    models = []
    for name, spec in requirements.items():
        features = spec.get("features")
        if isinstance(features, int):
            feature_count, feature_note = features, None
        elif isinstance(features, str):
            feature_count, feature_note = None, features
        else:
            feature_count, feature_note = len(features or []), None

        models.append(
            {
                "name": name,
                "loaded": getattr(manager, f"{name}_model", None) is not None
                or name in getattr(manager, "models", {}),
                "browser_drivable": name in browser_drivable,
                "feature_count": feature_count,
                "feature_note": feature_note,
                "preprocessing": spec.get("preprocessing"),
            }
        )

    return {
        "models": models,
        "total": len(models),
        "browser_drivable": sorted(browser_drivable),
    }


@app.post("/api/defense/phishing")
def defense_phishing(request: PhishingRequest) -> dict[str, Any]:
    from backend.defense.predictors import predict_phishing

    try:
        result = predict_phishing(request.text)
    except Exception as exc:  # model unavailable or input rejected
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "model": "phishing",
        "fraud_probability": result.get("fraud_probability"),
        "prediction": result.get("prediction"),
        "characters": len(request.text),
    }
