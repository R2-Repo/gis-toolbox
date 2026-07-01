import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayerSelect } from '../shared/LayerSelect.jsx';
import { WidgetPanelShell } from '../shared/WidgetPanelShell.jsx';
import { WidgetStepWizard } from '../shared/WidgetStepWizard.jsx';

const WIZARD_STEPS = [
    'Locations that need coverage',
    'Possible pole locations',
    'Planning settings',
    'Review & run',
    'Results'
];

const OPTIMIZATION_GOAL_OPTIONS = [
    { value: 'cover_most', label: 'Cover most locations' },
    { value: 'fewest_poles', label: 'Use fewest poles' },
    { value: 'fewest_antennas', label: 'Use fewest antennas' },
    { value: 'balanced', label: 'Balanced' }
];

const SECTOR_WIDTH_MODE_OPTIONS = [
    { value: 'fixed', label: 'Fixed sector width' },
    { value: 'auto_fit', label: 'Auto-fit sector width' }
];

const SECTOR_WIDTH_CHOICES = [30, 45, 60, 90, 120, 180, 360];

function SourceModeToggle({ mode, onChange, drawLabel }) {
    return (
        <div className="form-group">
            <label>Data source</label>
            <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <input
                        type="radio"
                        name={`source-${drawLabel}`}
                        checked={mode === 'layer'}
                        onChange={() => onChange('layer')}
                    />
                    Use existing layer
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <input
                        type="radio"
                        name={`source-${drawLabel}`}
                        checked={mode === 'draw'}
                        onChange={() => onChange('draw')}
                    />
                    Draw points on map
                </label>
            </div>
        </div>
    );
}

function StatsBlock({ title, stats }) {
    if (!stats) return null;
    return (
        <div className="text-xs" style={{ color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.6 }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{title}</div>
            <div>Total: {stats.total ?? 0}</div>
            <div>Valid: {stats.valid ?? stats.validClients ?? stats.validPoles ?? 0}</div>
            {(stats.invalid ?? stats.invalidClients ?? stats.invalidPoles) > 0 ? (
                <div>Invalid/skipped: {stats.invalid ?? stats.invalidClients ?? stats.invalidPoles}</div>
            ) : null}
            {stats.polesWithExistingAttrs != null ? (
                <div>Poles with existing sector settings: {stats.polesWithExistingAttrs}</div>
            ) : null}
            {stats.polesUsingDefaults != null ? (
                <div>Poles using default settings: {stats.polesUsingDefaults}</div>
            ) : null}
        </div>
    );
}

export function PoleSectorOptimizerPanel({
    layers = [],
    unitOptions = [],
    onBack,
    onCancel,
    onValidateClients,
    onValidatePoles,
    onDrawClientPoint,
    onDrawPolePoint,
    onRun,
    onCreateOutputs
}) {
    const [step, setStep] = useState(1);
    const [clientSourceMode, setClientSourceMode] = useState('layer');
    const [poleSourceMode, setPoleSourceMode] = useState('layer');
    const [clientLayerId, setClientLayerId] = useState('');
    const [poleLayerId, setPoleLayerId] = useState('');
    const [drawnClients, setDrawnClients] = useState([]);
    const [drawnPoles, setDrawnPoles] = useState([]);
    const [clientStats, setClientStats] = useState(null);
    const [poleStats, setPoleStats] = useState(null);
    const [units, setUnits] = useState('miles');
    const [defaultRange, setDefaultRange] = useState('1');
    const [defaultSectorWidth, setDefaultSectorWidth] = useState('90');
    const [sectorWidthMode, setSectorWidthMode] = useState('fixed');
    const [maxAntennasPerPole, setMaxAntennasPerPole] = useState(1);
    const [optimizationGoal, setOptimizationGoal] = useState('balanced');
    const [createAssignmentLines, setCreateAssignmentLines] = useState(false);
    const [results, setResults] = useState(null);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [running, setRunning] = useState(false);
    const [creating, setCreating] = useState(false);

    const unitsLabel = useMemo(
        () => unitOptions.find((opt) => opt.value === units)?.label?.match(/\(([^)]+)\)/)?.[1] || units,
        [unitOptions, units]
    );

    const settings = useMemo(() => ({
        defaultRange,
        defaultSectorWidth,
        sectorWidthMode,
        maxAntennasPerPole,
        optimizationGoal,
        units,
        createAssignmentLines
    }), [defaultRange, defaultSectorWidth, sectorWidthMode, maxAntennasPerPole, optimizationGoal, units, createAssignmentLines]);

    const refreshClientStats = useCallback(async () => {
        if (!onValidateClients) return;
        try {
            const stats = await onValidateClients({
                sourceMode: clientSourceMode,
                layerId: clientLayerId,
                drawnFeatures: drawnClients
            });
            setClientStats(stats);
        } catch {
            setClientStats(null);
        }
    }, [onValidateClients, clientSourceMode, clientLayerId, drawnClients]);

    const refreshPoleStats = useCallback(async () => {
        if (!onValidatePoles) return;
        try {
            const stats = await onValidatePoles({
                sourceMode: poleSourceMode,
                layerId: poleLayerId,
                drawnFeatures: drawnPoles,
                settings
            });
            setPoleStats(stats);
        } catch {
            setPoleStats(null);
        }
    }, [onValidatePoles, poleSourceMode, poleLayerId, drawnPoles, settings]);

    useEffect(() => {
        if (step >= 1) refreshClientStats();
    }, [step, refreshClientStats]);

    useEffect(() => {
        if (step >= 2) refreshPoleStats();
    }, [step, refreshPoleStats]);

    const canAdvanceStep1 = clientSourceMode === 'layer'
        ? Boolean(clientLayerId)
        : drawnClients.length > 0;

    const canAdvanceStep2 = poleSourceMode === 'layer'
        ? Boolean(poleLayerId)
        : drawnPoles.length > 0;

    const canAdvanceStep3 = parseFloat(defaultRange) > 0 && parseFloat(defaultSectorWidth) > 0;

    const handleDrawClient = async () => {
        setStatus('Click the map to add a client location…');
        setError('');
        try {
            const feature = await onDrawClientPoint?.();
            if (feature) {
                setDrawnClients((prev) => [...prev, feature]);
                setStatus('Client point added.');
            } else {
                setStatus('');
            }
        } catch (err) {
            setError(err.message || 'Could not add client point.');
            setStatus('');
        }
    };

    const handleDrawPole = async () => {
        setStatus('Click the map to add a pole location…');
        setError('');
        try {
            const feature = await onDrawPolePoint?.({ settings });
            if (feature) {
                setDrawnPoles((prev) => [...prev, feature]);
                setStatus('Pole point added with default sector settings.');
            } else {
                setStatus('');
            }
        } catch (err) {
            setError(err.message || 'Could not add pole point.');
            setStatus('');
        }
    };

    const handleRun = async () => {
        setRunning(true);
        setError('');
        setStatus('Running optimizer…');
        try {
            const result = await onRun?.({
                clientSourceMode,
                clientLayerId,
                drawnClients,
                poleSourceMode,
                poleLayerId,
                drawnPoles,
                settings
            });
            setResults(result);
            setStep(5);
            setStatus('Optimization complete. Review results below.');
        } catch (err) {
            setError(err.message || 'Optimization failed.');
            setStatus('');
        } finally {
            setRunning(false);
        }
    };

    const handleCreateOutputs = async () => {
        if (!results) return;
        setCreating(true);
        setError('');
        try {
            await onCreateOutputs?.(results, { createAssignmentLines, settings });
            setStatus('Output layers created.');
        } catch (err) {
            setError(err.message || 'Could not create output layers.');
        } finally {
            setCreating(false);
        }
    };

    const wizardFooter = (primaryLabel, onPrimary, primaryDisabled = false) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-sm btn-secondary" onClick={onCancel}>Cancel</button>
                {step > 1 && step < 5 ? (
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setStep((s) => s - 1)}>Back</button>
                ) : null}
                {step === 1 ? (
                    <button type="button" className="btn btn-sm btn-secondary" onClick={onBack}>Tool list</button>
                ) : null}
            </div>
            {step < 4 ? (
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={
                        (step === 1 && !canAdvanceStep1)
                        || (step === 2 && !canAdvanceStep2)
                        || (step === 3 && !canAdvanceStep3)
                    }
                    onClick={() => setStep((s) => s + 1)}
                >
                    Next
                </button>
            ) : null}
            {step === 4 ? (
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={running || !canAdvanceStep3}
                    onClick={handleRun}
                >
                    {running ? 'Running…' : primaryLabel || 'Run optimizer'}
                </button>
            ) : null}
            {step === 5 ? (
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={creating}
                    onClick={handleCreateOutputs}
                >
                    {creating ? 'Creating…' : 'Create output layers'}
                </button>
            ) : null}
        </div>
    );

    return (
        <WidgetPanelShell
            status={error || status}
            statusTone={error ? 'danger' : 'muted'}
            showRun={false}
            footer={wizardFooter()}
        >
            <WidgetStepWizard steps={WIZARD_STEPS} currentStep={step} />

            {step === 1 ? (
                <>
                    <p className="text-xs" style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
                        Choose where the locations that need wireless coverage come from.
                    </p>
                    <SourceModeToggle mode={clientSourceMode} onChange={setClientSourceMode} drawLabel="client" />
                    {clientSourceMode === 'layer' ? (
                        <LayerSelect
                            label="Client point layer"
                            value={clientLayerId}
                            layers={layers}
                            onChange={setClientLayerId}
                            placeholder="- select client layer -"
                        />
                    ) : (
                        <div className="form-group">
                            <label>Draw client points</label>
                            <button type="button" className="btn btn-sm btn-secondary" onClick={handleDrawClient}>
                                Add client point
                            </button>
                            <div className="text-xs" style={{ marginTop: 6, color: 'var(--text-muted)' }}>
                                {drawnClients.length} point{drawnClients.length === 1 ? '' : 's'} drawn
                            </div>
                        </div>
                    )}
                    <StatsBlock title="Client points" stats={clientStats} />
                </>
            ) : null}

            {step === 2 ? (
                <>
                    <p className="text-xs" style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
                        Choose possible pole locations where antennas could be installed.
                    </p>
                    <SourceModeToggle mode={poleSourceMode} onChange={setPoleSourceMode} drawLabel="pole" />
                    {poleSourceMode === 'layer' ? (
                        <LayerSelect
                            label="Pole point layer"
                            value={poleLayerId}
                            layers={layers}
                            onChange={setPoleLayerId}
                            placeholder="- select pole layer -"
                        />
                    ) : (
                        <div className="form-group">
                            <label>Draw pole points</label>
                            <button type="button" className="btn btn-sm btn-secondary" onClick={handleDrawPole}>
                                Add pole point
                            </button>
                            <div className="text-xs" style={{ marginTop: 6, color: 'var(--text-muted)' }}>
                                {drawnPoles.length} point{drawnPoles.length === 1 ? '' : 's'} drawn
                            </div>
                        </div>
                    )}
                    <StatsBlock title="Pole points" stats={poleStats} />
                </>
            ) : null}

            {step === 3 ? (
                <>
                    <div className="form-group">
                        <label>Coverage distance</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                value={defaultRange}
                                onChange={(e) => setDefaultRange(e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <select value={units} onChange={(e) => setUnits(e.target.value)} style={{ minWidth: 100 }}>
                                {unitOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Sector width mode</label>
                        <select value={sectorWidthMode} onChange={(e) => setSectorWidthMode(e.target.value)}>
                            {SECTOR_WIDTH_MODE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    {sectorWidthMode === 'fixed' ? (
                        <div className="form-group">
                            <label>Sector width (degrees)</label>
                            <select value={defaultSectorWidth} onChange={(e) => setDefaultSectorWidth(e.target.value)}>
                                {SECTOR_WIDTH_CHOICES.map((width) => (
                                    <option key={width} value={String(width)}>{width}°</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            The optimizer will try sector widths from 30° to 360° and prefer the smallest width that covers each group.
                        </p>
                    )}
                    <div className="form-group">
                        <label>Maximum antennas per pole</label>
                        <select value={maxAntennasPerPole} onChange={(e) => setMaxAntennasPerPole(parseInt(e.target.value, 10))}>
                            <option value={1}>1 antenna</option>
                            <option value={2}>2 antennas</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Optimization goal</label>
                        <select value={optimizationGoal} onChange={(e) => setOptimizationGoal(e.target.value)}>
                            {OPTIMIZATION_GOAL_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <input
                            type="checkbox"
                            checked={createAssignmentLines}
                            onChange={(e) => setCreateAssignmentLines(e.target.checked)}
                        />
                        Create client-to-pole assignment lines
                    </label>
                </>
            ) : null}

            {step === 4 ? (
                <div className="text-xs" style={{ lineHeight: 1.7 }}>
                    <p style={{ marginBottom: 8 }}>Ready to run the pole / sector coverage optimizer.</p>
                    <div><strong>Client points:</strong> {clientStats?.valid ?? 0} valid</div>
                    <div><strong>Pole points:</strong> {poleStats?.valid ?? 0} valid</div>
                    <div><strong>Coverage distance:</strong> {defaultRange} {unitsLabel}</div>
                    <div><strong>Sector width:</strong> {sectorWidthMode === 'fixed' ? `${defaultSectorWidth}°` : 'Auto-fit'}</div>
                    <div><strong>Max antennas per pole:</strong> {maxAntennasPerPole}</div>
                    <div><strong>Goal:</strong> {OPTIMIZATION_GOAL_OPTIONS.find((o) => o.value === optimizationGoal)?.label}</div>
                    <div><strong>Assignment lines:</strong> {createAssignmentLines ? 'Yes' : 'No'}</div>
                    <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>
                        Source layers will not be changed. New output layers will be created after you review results.
                    </p>
                </div>
            ) : null}

            {step === 5 && results ? (
                <div className="text-xs" style={{ lineHeight: 1.7 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Coverage summary</div>
                    <div>Total locations: {results.summary?.totalClients ?? 0}</div>
                    <div>Covered locations: {results.summary?.coveredClients ?? 0}</div>
                    <div>Uncovered locations: {results.summary?.uncoveredClients ?? 0}</div>
                    <div>Recommended poles: {results.summary?.recommendedPoles ?? 0}</div>
                    <div>Recommended antennas: {results.summary?.recommendedAntennas ?? 0}</div>
                    <div>Coverage: {results.summary?.coveragePercent ?? 0}%</div>
                    <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>
                        The map preview shows recommended poles, sector coverage areas, covered locations, and uncovered locations.
                        Click Create output layers to add permanent layers to the map.
                    </p>
                    <button type="button" className="btn btn-sm btn-secondary" style={{ marginTop: 8 }} onClick={onBack}>
                        Back to tool list
                    </button>
                </div>
            ) : null}
        </WidgetPanelShell>
    );
}
