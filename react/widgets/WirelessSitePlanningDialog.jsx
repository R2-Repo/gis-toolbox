import { useState } from 'react';
import { WidgetPanelShell } from './shared/WidgetPanelShell.jsx';
import { PoleSectorOptimizerPanel } from './wireless-site-planning/PoleSectorOptimizerPanel.jsx';

const ENABLED_TOOLS = [
    {
        id: 'pole-sector-optimizer',
        label: 'Pole / Sector Coverage Optimizer',
        description: 'Find the best pole locations and antenna sectors to cover client locations.'
    }
];

const PLANNED_TOOLS = [
    'Line of Sight Checker',
    'Fresnel Zone Checker',
    'Coverage Overlap Analyzer',
    'Capacity Estimator',
    'Backhaul Path Planner',
    'Outage / Redundancy Planner'
];

function LauncherView({ onSelectTool, onCancel }) {
    return (
        <WidgetPanelShell onCancel={onCancel} showRun={false}>
            <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Wireless Site Planning</div>
                <p className="text-xs" style={{ color: 'var(--text-muted)', margin: 0 }}>
                    Choose a wireless planning tool to get started.
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {ENABLED_TOOLS.map((tool) => (
                    <button
                        key={tool.id}
                        type="button"
                        className="btn btn-sm btn-secondary"
                        style={{ textAlign: 'left', padding: '10px 12px', height: 'auto' }}
                        onClick={() => onSelectTool(tool.id)}
                    >
                        <div style={{ fontWeight: 600 }}>{tool.label}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)', marginTop: 4 }}>{tool.description}</div>
                    </button>
                ))}
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Coming later</div>
                {PLANNED_TOOLS.map((label) => (
                    <div
                        key={label}
                        style={{
                            padding: '8px 10px',
                            marginBottom: 4,
                            borderRadius: 4,
                            background: 'var(--bg-surface)',
                            opacity: 0.6
                        }}
                    >
                        {label} — coming later
                    </div>
                ))}
            </div>
        </WidgetPanelShell>
    );
}

export function WirelessSitePlanningDialog({
    layers = [],
    unitOptions = [],
    onCancel,
    onValidateClients,
    onValidatePoles,
    onDrawClientPoint,
    onDrawPolePoint,
    onRun,
    onCreateOutputs
}) {
    const [activeTool, setActiveTool] = useState(null);

    if (activeTool === 'pole-sector-optimizer') {
        return (
            <PoleSectorOptimizerPanel
                layers={layers}
                unitOptions={unitOptions}
                onBack={() => setActiveTool(null)}
                onCancel={onCancel}
                onValidateClients={onValidateClients}
                onValidatePoles={onValidatePoles}
                onDrawClientPoint={onDrawClientPoint}
                onDrawPolePoint={onDrawPolePoint}
                onRun={onRun}
                onCreateOutputs={onCreateOutputs}
            />
        );
    }

    return (
        <LauncherView
            onSelectTool={setActiveTool}
            onCancel={onCancel}
        />
    );
}
