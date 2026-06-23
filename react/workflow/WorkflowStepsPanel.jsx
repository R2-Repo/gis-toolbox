import React, { useCallback, useEffect, useMemo, useState } from 'react';
import bus from '../../js/core/event-bus.js';
import { getLinearStepOrder } from '../../js/workflow/workflow-graph-utils.js';

export function WorkflowStepsPanel({ engine }) {
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedNodeId, setSelectedNodeId] = useState(null);

    useEffect(() => {
        const unsubs = [
            bus.on('workflow:engine-changed', () => setRefreshKey((k) => k + 1)),
            bus.on('workflow:node-selected', ({ nodeId }) => setSelectedNodeId(nodeId || null)),
            bus.on('workflow:node-deselected', () => setSelectedNodeId(null)),
            bus.on('workflow:run-start', () => setRefreshKey((k) => k + 1)),
            bus.on('workflow:node-done', () => setRefreshKey((k) => k + 1)),
            bus.on('workflow:run-done', () => setRefreshKey((k) => k + 1))
        ];
        return () => unsubs.forEach((off) => { try { off(); } catch { /* noop */ } });
    }, []);

    const steps = useMemo(() => {
        void refreshKey;
        return getLinearStepOrder(engine) || [];
    }, [engine, refreshKey]);

    const onSelectStep = useCallback((nodeId) => {
        bus.emit('workflow:node-selected', { nodeId });
    }, []);

    if (!steps.length) {
        return (
            <div className="wf-steps-panel">
                <div className="wf-palette-title">Steps</div>
                <p className="wf-steps-empty">No linear step order available.</p>
            </div>
        );
    }

    return (
        <div className="wf-steps-panel">
            <div className="wf-palette-title">Steps</div>
            <ol className="wf-steps-list">
                {steps.map((node, index) => {
                    const selected = node.id === selectedNodeId;
                    const badge = node._error
                        ? `Error: ${node._error}`
                        : (node._running
                            ? 'Running…'
                            : (node.getOutputStats?.() || (node._outputData || node._outputPorts ? 'Done' : '')));
                    const statusClass = node._error ? 'error' : (node._outputData || node._outputPorts ? 'done' : '');

                    return (
                        <li key={node.id}>
                            <button
                                type="button"
                                className={`wf-step-item${selected ? ' selected' : ''}`}
                                onClick={() => onSelectStep(node.id)}
                            >
                                <span className="wf-step-num">{index + 1}</span>
                                <span className="wf-step-icon">{node.icon}</span>
                                <span className="wf-step-body">
                                    <span className="wf-step-name">{node.name}</span>
                                    {badge ? (
                                        <span className={`wf-step-badge wf-step-badge-${statusClass || 'idle'}`}>
                                            {badge}
                                        </span>
                                    ) : null}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
