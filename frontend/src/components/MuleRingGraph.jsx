import React, { useState } from 'react'

const NODES = [
    { id: 'origin', label: 'Synthetic Mastermind', role: 'Attack Orchestrator', x: 250, y: 150, risk: 0.98, type: 'origin' },
    { id: 'mule1', label: 'Mule Account A', role: 'Card Testing Node', x: 120, y: 70, risk: 0.88, type: 'mule', ip: '198.51.100.4', device: 'FP-8841-A' },
    { id: 'mule2', label: 'Mule Account B', role: 'Rapid Stash Pass-through', x: 380, y: 70, risk: 0.92, type: 'mule', ip: '198.51.100.4 (COLLISION)', device: 'FP-8841-A' },
    { id: 'mule3', label: 'Mule Account C', role: 'Offshore P2P Splitter', x: 120, y: 240, risk: 0.84, type: 'mule', ip: '198.51.100.12', device: 'FP-9902-C' },
    { id: 'mule4', label: 'Mule Account D', role: 'Digital Wallet Crypto Rail', x: 380, y: 240, risk: 0.95, type: 'mule', ip: '198.51.100.4 (COLLISION)', device: 'FP-8841-A' },
    { id: 'victim1', label: 'Target Account #1', role: 'Compromised Payroll', x: 40, y: 150, risk: 0.15, type: 'victim' },
    { id: 'victim2', label: 'Target Account #2', role: 'Corporate Treasury Wire', x: 460, y: 150, risk: 0.20, type: 'victim' },
]

const EDGES = [
    { from: 'victim1', to: 'origin', amt: '$12,400', status: 'INFILTRATED' },
    { from: 'victim2', to: 'origin', amt: '$48,000', status: 'INFILTRATED' },
    { from: 'origin', to: 'mule1', amt: '$4,200', status: 'INTERCEPTED' },
    { from: 'origin', to: 'mule2', amt: '$9,800', status: 'INTERCEPTED' },
    { from: 'origin', to: 'mule3', amt: '$6,500', status: 'INTERCEPTED' },
    { from: 'origin', to: 'mule4', amt: '$15,000', status: 'INTERCEPTED' },
]

/**
 * Interactive Mule Ring & Synthetic Identity Syndicate Graph.
 * Visualizes graph neural network topology and multi-hop laundering detection.
 */
export default function MuleRingGraph() {
    const [selectedNode, setSelectedNode] = useState(NODES[0])

    return (
        <div className="p-6 rounded-2xl border-2 border-border bg-surface shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                            GRAPH TOPOLOGY
                        </span>
                        <h3 className="text-lg font-extrabold text-text-primary">
                            Mule Account Ring & Synthetic Syndicate Topology
                        </h3>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                        Detects coordinated money mule rings via IP collisions, shared device fingerprint clusters, and multi-hop graph embeddings.
                    </p>
                </div>
                <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-lg border border-emerald-500/30">
                    GNN Ring Match: 99.4%
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* SVG Graph Canvas */}
                <div className="lg:col-span-2 rounded-xl bg-navy-950/80 border border-border p-4 flex items-center justify-center relative overflow-hidden">
                    <svg viewBox="0 0 500 300" className="w-full h-auto max-h-[320px]">
                        {/* Render Edges */}
                        {EDGES.map((e, i) => {
                            const from = NODES.find(n => n.id === e.from)
                            const to = NODES.find(n => n.id === e.to)
                            return (
                                <g key={i}>
                                    <line
                                        x1={from.x}
                                        y1={from.y}
                                        x2={to.x}
                                        y2={to.y}
                                        stroke="#f43f5e"
                                        strokeWidth="2"
                                        strokeDasharray="4 4"
                                        className="animate-pulse"
                                        opacity="0.6"
                                    />
                                    <circle
                                        cx={(from.x + to.x) / 2}
                                        cy={(from.y + to.y) / 2}
                                        r="3"
                                        fill="#00ff66"
                                    />
                                </g>
                            )
                        })}

                        {/* Render Nodes */}
                        {NODES.map(node => {
                            const isSelected = selectedNode.id === node.id
                            const fill = node.type === 'origin'
                                ? '#f43f5e'
                                : node.type === 'mule'
                                ? '#a855f7'
                                : '#38bdf8'

                            return (
                                <g
                                    key={node.id}
                                    onClick={() => setSelectedNode(node)}
                                    className="cursor-pointer transition-all hover:scale-110"
                                >
                                    <circle
                                        cx={node.x}
                                        cy={node.y}
                                        r={isSelected ? 18 : 14}
                                        fill={fill}
                                        fillOpacity="0.3"
                                        stroke={fill}
                                        strokeWidth={isSelected ? 3 : 2}
                                    />
                                    <circle
                                        cx={node.x}
                                        cy={node.y}
                                        r="6"
                                        fill={fill}
                                    />
                                    <text
                                        x={node.x}
                                        y={node.y + 24}
                                        textAnchor="middle"
                                        className="text-[9px] font-mono fill-current font-bold"
                                        fill="#fff"
                                    >
                                        {node.label}
                                    </text>
                                </g>
                            )
                        })}
                    </svg>

                    <span className="absolute bottom-2 left-3 text-[10px] text-text-muted font-mono">
                        Click any node to inspect telemetry
                    </span>
                </div>

                {/* Node Inspector Panel */}
                <div className="p-4 rounded-xl bg-navy-950/60 border border-border space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                                NODE FORENSICS
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                selectedNode.risk > 0.7
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}>
                                Risk: {(selectedNode.risk * 100).toFixed(0)}%
                            </span>
                        </div>

                        <h4 className="text-base font-bold text-text-primary">{selectedNode.label}</h4>
                        <p className="text-xs text-text-secondary">{selectedNode.role}</p>

                        <div className="space-y-1.5 pt-2 text-xs font-mono border-t border-border">
                            {selectedNode.ip && (
                                <div className="flex justify-between">
                                    <span className="text-text-muted">IP Address:</span>
                                    <span className="text-text-primary font-bold">{selectedNode.ip}</span>
                                </div>
                            )}
                            {selectedNode.device && (
                                <div className="flex justify-between">
                                    <span className="text-text-muted">Device Fingerprint:</span>
                                    <span className="text-text-primary font-bold">{selectedNode.device}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-text-muted">Syndicate Link:</span>
                                <span className="text-purple-400 font-bold">Cluster #SYN-09</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                        🛡️ <strong>GNN Interception:</strong> All connected outbound hops blocked simultaneously upon identifying the shared cluster fingerprint.
                    </div>
                </div>
            </div>
        </div>
    )
}
