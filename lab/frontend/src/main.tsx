import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Activity, AlertTriangle, ArrowRight, BrainCircuit, Check, ChevronRight, CircleDot, Database, Gauge, Play, Radar, RefreshCw, Search, ShieldAlert, SlidersHorizontal, Sparkles, Terminal, Zap } from 'lucide-react'
import './styles.css'
import './scenario.css'

const api = async (path: string, options?: RequestInit) => {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options })
  if (!response.ok) throw new Error((await response.json()).detail || `Request failed: ${response.status}`)
  return response.json()
}
const label = (value: string) => value.replaceAll('_', ' ').toUpperCase()
type AnyRecord = Record<string, any>

function Metric({ name, value, accent = '' }: { name: string; value: string | number; accent?: string }) {
  return <div className="metric"><span>{name}</span><strong className={accent}>{value}</strong></div>
}
function Bar({ name, value, color = 'cyan' }: { name: string; value: number; color?: string }) {
  return <div className="bar-row"><div><span>{label(name)}</span><b>{value.toFixed(3)}</b></div><i><em className={color} style={{ width: `${Math.max(2, value * 100)}%` }} /></i></div>
}

export default function App() {
  const [customers, setCustomers] = useState<AnyRecord[]>([])
  const [transactions, setTransactions] = useState<AnyRecord[]>([])
  const [attacks, setAttacks] = useState<AnyRecord[]>([])
  const [scenarios, setScenarios] = useState<AnyRecord[]>([])
  const [summary, setSummary] = useState<AnyRecord | null>(null)
  const [selected, setSelected] = useState<AnyRecord | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<AnyRecord | null>(null)
  const [run, setRun] = useState<AnyRecord | null>(null)
  const [runAll, setRunAll] = useState<AnyRecord | null>(null)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [scenarioType, setScenarioType] = useState('AUTO')
  const [scenarioFilter, setScenarioFilter] = useState('ALL')
  const [attackFilter, setAttackFilter] = useState('ALL')
  const [suitableTargets, setSuitableTargets] = useState<AnyRecord[]>([])
  const [config, setConfig] = useState({ customers: 100, merchants: 30, transactions: 1000, seed: 2026, fraud_rate: 0 })

  const load = async () => {
    setBusy(true); setError('')
    try { const [population, customerData, txData, attackData, scenarioData] = await Promise.all([api('/api/population/summary'), api('/api/customers'), api('/api/transactions'), api('/api/attacks'), api('/api/scenarios')]); setSummary(population); setConfig(population.config); setCustomers(customerData); setTransactions(txData); setAttacks(attackData); setScenarios(scenarioData); setSelected(txData[0]); setSelectedCustomer(customerData[0]) } catch (e) { setError(String(e)) } finally { setBusy(false) }
  }
  useEffect(() => { load() }, [])
  const scenarioByTarget = useMemo(() => Object.fromEntries(scenarios.map(item => [item.target_id, item])), [scenarios])
  const filteredCustomers = useMemo(() => customers.filter(item => `${item.customer_id} ${item.city}`.toLowerCase().includes(query.toLowerCase())).filter(item => scenarioFilter === 'ALL' || scenarioByTarget[item.customer_id]?.scenario_type === scenarioFilter).filter(item => attackFilter === 'ALL' || suitableTargets.some(target => target.target_id === item.customer_id)).slice(0, 12), [customers, query, scenarioFilter, attackFilter, suitableTargets, scenarioByTarget])
  const filteredTransactions = useMemo(() => transactions.filter(item => `${item.transaction_id} ${item.customer_id} ${item.city}`.toLowerCase().includes(query.toLowerCase())).slice(-16).reverse(), [transactions, query])
  const chooseTransaction = (item: AnyRecord) => { setSelected(item); setSelectedCustomer(customers.find(customer => customer.customer_id === item.customer_id) || null) }
  const chooseCustomer = (item: AnyRecord) => { setSelectedCustomer(item); const own = transactions.filter(tx => tx.customer_id === item.customer_id); setSelected(own.at(-1) || null) }
  const randomTransaction = () => chooseTransaction(transactions[Math.floor(Math.random() * transactions.length)])
  const runAttack = async (attackType?: string, selectedScenario?: string) => {
    if (!selectedCustomer) return
    setBusy(true); setError(''); setRun(null); setRunAll(null)
    try { setRun(await api('/api/attacks/run', { method: 'POST', body: JSON.stringify({ target_id: selectedCustomer.customer_id, transaction_id: selected?.transaction_id, attack_type: attackType, scenario_type: selectedScenario || (scenarioType === 'AUTO' ? undefined : scenarioType) }) })) } catch (e) { setError(String(e)) } finally { setBusy(false) }
  }
  const runScenario = () => runAttack(undefined, scenarioType)
  const findSuitableTargets = async (attack: string) => { setAttackFilter(attack); if (attack === 'ALL') { setSuitableTargets([]); return } try { setSuitableTargets(await api(`/api/targets/${attack}`)) } catch (e) { setError(String(e)) } }
  const runEveryAttack = async () => { if (!selectedCustomer) return; setBusy(true); setError(''); try { setRunAll(await api('/api/attacks/run-all', { method: 'POST', body: JSON.stringify({ target_id: selectedCustomer.customer_id, transaction_id: selected?.transaction_id }) })) } catch (e) { setError(String(e)) } finally { setBusy(false) } }
  const regenerate = async () => { setBusy(true); setError(''); try { const response = await api('/api/dataset/generate', { method: 'POST', body: JSON.stringify(config) }); setSummary(response); await load() } catch (e) { setError(String(e)) } finally { setBusy(false) } }
  const stats = summary?.statistics || {}
  const plan = run?.plan
  const signals = plan?.parameters?.signals || {}
  const scores = plan?.parameters?.candidate_scores || {}
  const result = run?.records?.[0] || null
  const scenarioContext = run?.scenario ? Object.entries(run.scenario).find(([key, value]) => ['transaction_context', 'communication_context', 'identity_context', 'classifier_context', 'timeline_context'].includes(key) && value && Object.keys(value).length > 0)?.[1] || {} : {}

  return <div className="app-shell">
    <ScenarioStats stats={stats} scenarios={scenarios} />
    <header className="topbar"><div className="brand"><div className="brand-mark"><Radar size={19} /></div><div><b>RED TEAM <span>//</span> AI DEFENSE LAB</b><small>SYNTHETIC PAYMENT WORLD</small></div></div><div className="status"><i /> SIMULATION ONLINE</div><div className="top-meta"><span>PLANNER <b>{run?.planner_mode || 'OFFLINE FALLBACK'}</b></span><span>SEED <b>{config.seed}</b></span></div></header>
    {error && <div className="error"><AlertTriangle size={16} /> {error} <button onClick={() => setError('')}>DISMISS</button></div>}
    <main className="workspace">
      <aside className="left-rail">
        <div className="section-head"><div><span className="eyebrow">01 / TARGET ACQUISITION</span><h2>Data Explorer</h2></div><button className="icon-btn" title="Refresh synthetic world" onClick={load}><RefreshCw size={15} className={busy ? 'spin' : ''} /></button></div>
        <div className="search"><Search size={15} /><input placeholder="Search IDs or locations" value={query} onChange={e => setQuery(e.target.value)} /></div><div className="filter-grid"><select value={scenarioFilter} onChange={e => setScenarioFilter(e.target.value)}><option value="ALL">ALL SCENARIOS</option>{['TRANSACTION_ANOMALY','COMMUNICATION_SCAM','KYC_IDENTITY','LONGITUDINAL_BEHAVIOR','CLASSIFIER_EVALUATION'].map(kind => <option key={kind} value={kind}>{label(kind)}</option>)}</select><select value={attackFilter} onChange={e => findSuitableTargets(e.target.value)}><option value="ALL">ALL ATTACKS</option>{attacks.map(attack => <option key={attack.name} value={attack.name}>{label(attack.name)}</option>)}</select></div>
        <div className="tabs"><span className="active">CUSTOMERS</span><span>TRANSACTIONS</span></div>
        <div className="list-label">CUSTOMER TARGETS <b>{customers.length}</b></div>
        <div className="target-list">{filteredCustomers.map(item => <button className={`target ${selectedCustomer?.customer_id === item.customer_id ? 'selected' : ''}`} key={item.customer_id} onClick={() => chooseCustomer(item)}><span className="avatar">{item.customer_id.slice(-2)}</span><span><b>{item.customer_id}</b><small>{item.city} · {item.usual_payment_method}</small></span><ChevronRight size={14} /></button>)}</div>
        <div className="list-label transaction-label">RECENT TRANSACTIONS <b>{transactions.length}</b></div>
        <div className="tx-list">{filteredTransactions.map(item => <button className={`tx ${selected?.transaction_id === item.transaction_id ? 'selected' : ''}`} key={item.transaction_id} onClick={() => chooseTransaction(item)}><span><b>{item.transaction_id}</b><small>{item.customer_id} · {item.city}</small></span><strong>₹{Number(item.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></button>)}</div>
        <div className="rail-actions"><button className="secondary" onClick={randomTransaction}><Zap size={15} /> RANDOM TRANSACTION</button><button className="primary" disabled={!selectedCustomer || busy} onClick={() => runAttack()}><Play size={15} fill="currentColor" /> RUN ATTACK</button><button className="outline-danger" disabled={!selectedCustomer || busy} onClick={runEveryAttack}><LayersIcon /> RUN ALL ATTACKS</button></div>
      </aside>
      <section className="center-stage">
        <div className="section-head"><div><span className="eyebrow">02 / LIVE SIMULATION</span><h1>Attack Control Center</h1></div><div className="live-chip"><Activity size={14} /> LIVE ENGINE</div></div>
        <div className="scenario-strip"><div><span className="eyebrow">SCENARIO CONTEXT</span><strong>{scenarioType === 'AUTO' ? 'AUTO DISCOVERY' : label(scenarioType)}</strong></div><div className="scenario-options">{['AUTO', 'TRANSACTION_ANOMALY', 'COMMUNICATION_SCAM', 'KYC_IDENTITY', 'LONGITUDINAL_BEHAVIOR', 'CLASSIFIER_EVALUATION'].map(kind => <button className={scenarioType === kind ? 'active' : ''} key={kind} onClick={() => setScenarioType(kind)}>{kind === 'AUTO' ? 'AUTO' : kind.split('_')[0]}</button>)}</div><button className="scenario-run" disabled={!selectedCustomer || busy} onClick={runScenario}><Sparkles size={14} /> RUN SCENARIO</button></div>
        <div className="pipeline">{['target', 'observe', 'plan', 'generate', 'execute', 'record'].map((stage, index) => { const active = run?.events?.find((event: AnyRecord) => event.stage === stage); return <div className={`pipe-node ${active?.status === 'complete' ? 'complete' : active?.status === 'running' ? 'running' : ''}`} key={stage}><div className="pipe-icon">{active?.status === 'complete' ? <Check size={15} /> : <span>0{index + 1}</span>}</div><b>{label(stage)}</b>{index < 5 && <ArrowRight className="pipe-arrow" size={14} />}</div> })}</div>
        <div className="target-banner"><div><span className="eyebrow">SELECTED OBSERVATION</span><h3>{selectedCustomer?.customer_id || 'NO TARGET'} <span>·</span> {selected?.transaction_id || 'CUSTOMER PROFILE'}</h3><p>{selected ? `${selected.city} / ${selected.payment_method} / ${selected.device_id}` : 'Choose a synthetic customer or transaction from the explorer.'}</p></div><div className="target-amount">{selected ? <><small>OBSERVED AMOUNT</small><strong>₹{Number(selected.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></> : <Database size={28} />}</div></div>
        {run?.scenario && <section className="panel scenario-intelligence"><div className="panel-title"><Radar size={16} /><span>SCENARIO INTELLIGENCE</span><em>{run.scenario.scenario_type}</em></div><div className="scenario-context"><div><small>AVAILABLE CONTEXT</small><strong>{Object.entries(run.scenario).filter(([key, value]) => ['transaction_context', 'communication_context', 'identity_context', 'classifier_context', 'timeline_context'].includes(key) && value && Object.keys(value).length).map(([key]) => label(key.replace('_context', ''))).join(' · ') || 'BEHAVIORAL HISTORY'}</strong></div><div><small>SCENARIO ID</small><strong>{run.scenario.scenario_id}</strong></div></div><div className="scenario-signal-grid">{Object.entries(scenarioContext).filter(([key]) => !['transaction', 'history'].includes(key)).slice(0, 6).map(([key, value]) => <div key={key}><small>{label(key)}</small><b>{typeof value === 'boolean' ? value ? 'YES' : 'NO' : typeof value === 'object' ? 'AVAILABLE' : String(value)}</b></div>)}</div><div className="applicable"><small>APPLICABLE ATTACKS</small>{Object.entries(scores).map(([name, value]) => <span key={name} className={name === plan?.attack_type ? 'selected' : ''}>{label(name)} <b>{Number(value).toFixed(2)}</b></span>)}</div></section>}
        <div className="simulation-grid"><section className="panel intelligence"><div className="panel-title"><BrainCircuit size={16} /><span>BEHAVIOR ANALYSIS</span><em>{plan ? 'CAPTURED' : 'AWAITING RUN'}</em></div>{Object.keys(signals).length ? <div className="bars">{['amount_deviation', 'velocity_signal', 'device_stability', 'location_consistency', 'category_consistency', 'spending_regularity'].map(key => signals[key] !== undefined && <Bar key={key} name={key} value={Number(signals[key])} color={key.includes('stability') || key.includes('consistency') ? 'violet' : 'cyan'} />)}</div> : <div className="empty-panel"><Gauge size={26} /><p>Run the planner to expose<br />target-specific signals.</p></div>}</section><section className="panel planner"><div className="panel-title"><Sparkles size={16} /><span>ATTACK PLANNER</span><em>{run?.planner_mode || 'OFFLINE'}</em></div>{plan ? <><div className="selected-attack"><div><small>SELECTED ATTACK</small><h2>{label(plan.attack_type)}</h2></div><div className="score"><small>SUITABILITY</small><strong>{Number(scores[plan.attack_type] || 0).toFixed(2)}</strong></div></div><div className="candidate-list">{Object.entries(scores).map(([name, value]) => <Bar key={name} name={name} value={Number(value)} color={name === plan.attack_type ? 'red' : 'violet'} />)}</div><p className="rationale">“{plan.rationale}”</p></> : <div className="empty-panel"><BrainCircuit size={26} /><p>Candidate scores and rationale<br />appear after execution.</p></div>}</section></div>
        <section className="panel result-panel"><div className="panel-title"><ShieldAlert size={16} /><span>GENERATOR OUTPUT</span>{result && <em className="fraud">SYNTHETIC FRAUD RECORD</em>}</div>{result ? <ResultView type={plan?.attack_type} result={result} /> : <div className="result-empty"><Terminal size={22} /><span>Generator output will stream here after RUN ATTACK.</span></div>}</section>
        <section className="panel event-panel"><div className="panel-title"><Terminal size={16} /><span>LIVE EVENT STREAM</span><em>LOCAL / AUDITABLE</em></div><div className="events">{(run?.events || [{ stage: 'system', description: 'Engine ready. Select a target to begin.' }]).map((event: AnyRecord, index: number) => <div className="event" key={`${event.stage}-${index}`}><time>{run ? `00:0${index + 1}` : '--:--'}</time><b>[{event.stage.toUpperCase()}]</b><span>{event.description}</span>{event.status === 'complete' && <Check size={13} />}</div>)}</div></section>
      </section>
      <aside className="right-rail"><section className="panel metrics"><div className="panel-title"><Activity size={16} /><span>WORLD TELEMETRY</span></div><div className="metric-grid"><Metric name="TRANSACTIONS" value={stats.total_transactions || 0} /><Metric name="FRAUD SCENARIOS" value={stats.fraudulent_transactions || 0} accent="red-text" /><Metric name="CUSTOMERS" value={stats.total_customers || 0} /><Metric name="MERCHANTS" value={stats.total_merchants || 0} /></div><div className="fraud-meter"><div><span>FRAUD RATE</span><b>{((stats.fraud_rate || 0) * 100).toFixed(1)}%</b></div><i><em style={{ width: `${(stats.fraud_rate || 0) * 100}%` }} /></i></div></section><section className="panel controls"><div className="panel-title"><SlidersHorizontal size={16} /><span>WORLD CONTROLS</span></div>{[['customers', 'CUSTOMERS', 1000], ['merchants', 'MERCHANTS', 200], ['transactions', 'TRANSACTIONS', 10000]].map(([key, name, max]) => <label key={key as string}>{name}<output>{config[key as keyof typeof config]}</output><input type="range" min="1" max={max as number} value={config[key as keyof typeof config] as number} onChange={e => setConfig({ ...config, [key]: Number(e.target.value) })} /></label>)}<label>FRAUD RATE <output>{Math.round(config.fraud_rate * 100)}%</output><input type="range" min="0" max="0.5" step="0.05" value={config.fraud_rate} onChange={e => setConfig({ ...config, fraud_rate: Number(e.target.value) })} /></label><button className="secondary full" onClick={regenerate} disabled={busy}><RefreshCw size={14} /> REGENERATE SYNTHETIC WORLD</button></section><section className="panel library"><div className="panel-title"><Database size={16} /><span>ATTACK LIBRARY</span><em>{attacks.length} REGISTERED</em></div>{attacks.map(attack => <button className="attack-row" key={attack.name} onClick={() => runAttack(attack.name)}><span className={`modality ${attack.modality}`}>{attack.modality.slice(0, 3).toUpperCase()}</span><span><b>{label(attack.name)}</b><small>{attack.description}</small></span><ChevronRight size={14} /></button>)}</section>{runAll && <section className="panel run-all"><div className="panel-title"><Zap size={16} /><span>RUN-ALL STATUS</span></div><h2>{runAll.successful} <small>/ {runAll.total}</small></h2><p>registered generators executed</p>{runAll.results.map((item: AnyRecord) => <div className="run-row" key={item.attack_type}><span>{label(item.attack_type)}</span>{item.status === 'complete' ? <Check size={14} /> : <AlertTriangle size={14} />}</div>)}</section>}</aside>
    </main><footer><span><CircleDot size={12} /> SYNTHETIC RED TEAM ENVIRONMENT</span><span>NO REAL USERS · NO REAL TRANSACTIONS · NO EXTERNAL EXECUTION</span><span>LOCAL ENGINE v1.0</span></footer>
  </div>
}

function LayersIcon() { return <span className="layers-icon">10</span> }
function ScenarioStats({ stats, scenarios }: { stats: AnyRecord; scenarios: AnyRecord[] }) {
  return <section className="scenario-dock"><div className="dock-title"><Radar size={14} /> DATASET BALANCE <span>{scenarios.length} SCENARIOS</span></div><div className="dock-grid">{Object.entries(stats.scenario_statistics?.scenarios_by_type || {}).map(([name, value]) => <div key={name}><small>{label(name)}</small><b>{String(value)}</b></div>)}</div><div className="dock-reach">{Object.entries(stats.auto_attack_reachability || {}).map(([name, value]) => <span key={name}>{label(name)} <b>{String(value)}</b></span>)}</div></section>
}
function ResultView({ type, result }: { type?: string; result: AnyRecord }) {
  const payload = result.payload || result
  if (type === 'adversarial_probing') return <div className="probe-view"><div className="probe-stat"><small>BASELINE → FINAL</small><strong>{payload.original_prediction ? 'FRAUD' : 'LEGITIMATE'} <ArrowRight size={16} /> {payload.final_prediction ? 'FRAUD' : 'LEGITIMATE'}</strong></div><div className="probe-stat"><small>ATTEMPTS</small><strong>{payload.number_of_attempts}</strong></div><div className="probe-stat"><small>BOUNDARY CROSSING</small><strong className={payload.successful_boundary_crossing ? 'red-text' : ''}>{payload.successful_boundary_crossing ? 'DETECTED' : 'NOT REACHED'}</strong></div><div className="feature-chips">{Object.keys(payload.changed_features || {}).map(key => <span key={key}>{key}</span>)}</div></div>
  if (type === 'sleeper_transaction_pacing') return <div className="sleeper-view"><div className="sequence-head"><strong>{payload.sequence_length} synthetic events</strong><span>threshold ₹{Number(payload.synthetic_threshold).toLocaleString('en-IN')}</span><b>{payload.final_cashout_simulated ? 'CASH-OUT SIMULATED' : 'NO CASH-OUT'}</b></div><div className="sequence-bars">{(payload.amounts || []).slice(0, 14).map((amount: number, index: number) => <i key={index} style={{ height: `${Math.min(100, amount / Math.max(payload.synthetic_threshold, 1) * 85)}%` }}><small>{index + 1}</small></i>)}</div><div className="sequence-foot"><span>PACING CONSISTENCY <b>{payload.pacing_consistency}</b></span><span>ROLLING 7D VELOCITY <b>{Number(payload.rolling_7d_velocity?.at(-1) || 0).toFixed(0)}</b></span></div></div>
  const fields = Object.entries(payload).filter(([key]) => !['attack_type', 'is_fraud', 'timestamp'].includes(key)).slice(0, 8)
  return <div className="record-view"><div className="record-badge"><ShieldAlert size={22} /><div><small>ATTACK GENERATED</small><strong>{result.attack_id || payload.artifact_id || 'SYNTHETIC RECORD'}</strong></div><span>is_fraud = TRUE</span></div><div className="record-fields">{fields.map(([key, value]) => <div key={key}><small>{label(key)}</small><b>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</b></div>)}</div></div>
}

createRoot(document.getElementById('root')!).render(<App />)