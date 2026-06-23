import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CrsPicker } from '../shared/CrsPicker.jsx';
import { ERROR_CODES } from '../../../js/widgets/project-stationing/table-import/station-table-parse.js';

function FormField({ label, children }) {
    return (
        <label className="ps-import-field">
            <span className="ps-import-field__label">{label}</span>
            {children}
        </label>
    );
}

function FieldPicker({ label, value, fields, onChange, hint }) {
    return (
        <FormField label={label}>
            <select
                className="route-mp-widget__input"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
            >
                <option value="">Not mapped</option>
                {fields.map((field) => (
                    <option key={field} value={field}>{field}</option>
                ))}
            </select>
            {hint ? <span className="ps-import-field__hint">{hint}</span> : null}
        </FormField>
    );
}

function DetectionItem({ label, item, fallback = '—' }) {
    let content = fallback;
    if (item?.field && (item.confidence ?? 0) >= 50) {
        content = `${item.field} · ${item.confidence}%`;
    }
    return (
        <>
            <dt>{label}</dt>
            <dd>{content}</dd>
        </>
    );
}

function SideDetectionItem({ sideDetection, offsetEmbeddedSide }) {
    let content = '—';
    if (sideDetection?.field && (sideDetection.confidence ?? 0) >= 50) {
        content = `${sideDetection.field} · ${sideDetection.confidence}%`;
    } else if (offsetEmbeddedSide?.includesSide) {
        const fieldLabel = offsetEmbeddedSide.offsetField || 'Offset';
        content = `In ${fieldLabel} (${offsetEmbeddedSide.pct}%)`;
    }
    return (
        <>
            <dt>Side</dt>
            <dd>{content}</dd>
        </>
    );
}

function buildInitialLocatorNaming(suggestedNaming) {
    return {
        rtDirection: suggestedNaming?.rtDirection || suggestedNaming?.suggested || '',
        ltDirection: suggestedNaming?.ltDirection || ''
    };
}

function SamplePreview({ rows = [], fields = [] }) {
    if (!rows.length || !fields.length) return null;
    const previewFields = fields.slice(0, 6);
    return (
        <div className="ps-import-section">
            <div className="ps-import-section__title">Sample rows</div>
            <div className="gis-widget__preview-table">
                <table className="text-xs" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            {previewFields.map((field) => (
                                <th key={field} className="p-4 text-left" style={{ borderBottom: '1px solid var(--border)' }}>{field}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={index}>
                                {previewFields.map((field) => (
                                    <td key={field} className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>{row[field] ?? ''}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function ImportStationTablePanel({
    routeProfile,
    suggestedNaming,
    onFileLoad,
    onAnalyzeMapping,
    onPlot,
    onStatusChange
}) {
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [plotting, setPlotting] = useState(false);
    const [error, setError] = useState('');
    const [fileName, setFileName] = useState('');
    const [loaded, setLoaded] = useState(null);
    const [mapping, setMapping] = useState({});
    const [showOptionalColumns, setShowOptionalColumns] = useState(false);
    const [includeQaLines, setIncludeQaLines] = useState(false);
    const [coordinateCrs, setCoordinateCrs] = useState('EPSG:6337');
    const [locatorNaming, setLocatorNaming] = useState(() =>
        buildInitialLocatorNaming(suggestedNaming));

    const directionChoices = suggestedNaming?.choices || ['EB', 'WB'];
    const axisLabel = suggestedNaming?.axis === 'ns' ? 'NB / SB' : 'EB / WB';

    const fields = loaded?.fields || [];
    const offsetEmbeddedSide = loaded?.offsetEmbeddedSide || loaded?.detection?.offsetEmbeddedSide;
    const sideFromOffset = Boolean(offsetEmbeddedSide?.includesSide && !mapping.side);
    const needsCoordinateCrs = useMemo(
        () => (loaded?.reviewedRows || []).some((row) =>
            String(row.issue || '').includes(ERROR_CODES.PROJECTED_COORDINATES_NEED_CRS)),
        [loaded]
    );
    const reviewedIssues = useMemo(
        () => (loaded?.reviewedRows || []).filter((row) => row.status !== 'Ready').slice(0, 20),
        [loaded]
    );

    const plotRows = useCallback(async () => {
        setPlotting(true);
        setError('');
        try {
            await onPlot?.(mapping, {
                includeQaLines,
                coordinateCrs: needsCoordinateCrs ? coordinateCrs : undefined,
                locatorNaming
            });
        } catch (err) {
            setError(err?.message || 'Unable to plot station table.');
        } finally {
            setPlotting(false);
        }
    }, [mapping, includeQaLines, needsCoordinateCrs, coordinateCrs, locatorNaming, onPlot]);

    useEffect(() => {
        onStatusChange?.({
            error,
            loading,
            plotting,
            disabled: !loaded || plotting || loading,
            plotRows,
            status: error || (loading ? 'Loading table…' : '')
        });
    }, [error, loading, plotting, loaded, plotRows, onStatusChange]);

    const loadFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setLoading(true);
        setError('');
        setShowOptionalColumns(false);
        try {
            const result = await onFileLoad?.(file, { locatorNaming });
            setLoaded(result);
            setMapping(result?.mapping || {});
        } catch (err) {
            setLoaded(null);
            setError(err?.message || 'Unable to load table.');
        } finally {
            setLoading(false);
        }
    };

    const updateMapping = async (key, value) => {
        const next = { ...mapping, [key]: value };
        setMapping(next);
        if (!loaded) return;
        try {
            const result = await onAnalyzeMapping?.(next, { locatorNaming });
            setLoaded((current) => ({ ...current, ...result }));
        } catch (err) {
            setError(err?.message || 'Unable to analyze mapping.');
        }
    };

    const updateLocatorNaming = async (patch) => {
        const next = { ...locatorNaming, ...patch };
        if (patch.rtDirection && !patch.ltDirection) {
            const opposite = directionChoices.find((dir) => dir !== patch.rtDirection) || '';
            next.ltDirection = opposite;
        }
        setLocatorNaming(next);
        if (!loaded) return;
        try {
            const result = await onAnalyzeMapping?.(mapping, { locatorNaming: next });
            setLoaded((current) => ({ ...current, ...result }));
        } catch (err) {
            setError(err?.message || 'Unable to update locator names.');
        }
    };

    const summary = loaded?.summary || {};
    const previewParts = [
        loaded?.sampleLocatorNameRt ? `RT ${loaded.sampleLocatorNameRt}` : '',
        loaded?.sampleLocatorNameLt ? `LT ${loaded.sampleLocatorNameLt}` : '',
        !loaded?.sampleLocatorNameRt && !loaded?.sampleLocatorNameLt && loaded?.sampleLocatorName
            ? loaded.sampleLocatorName
            : ''
    ].filter(Boolean);

    return (
        <div className="project-stationing-import-panel">
            <div className="info-box ps-import-route">
                <strong>{routeProfile?.route_name || 'Stationed Route'}</strong>
                <div className="text-xs mt-4">
                    {routeProfile?.start_station_label} → {routeProfile?.end_station_label}
                </div>
            </div>

            <section className="ps-import-section">
                <div className="ps-import-section__head">
                    <span className="ps-import-section__title">Travel direction</span>
                    <span className="ps-import-section__hint">RT / LT names · {axisLabel}</span>
                </div>
                <div className="route-mp-widget__mp-grid ps-import-direction-grid">
                    <FormField label="RT (right)">
                        <select
                            className="route-mp-widget__input"
                            value={locatorNaming.rtDirection || ''}
                            onChange={(e) => updateLocatorNaming({ rtDirection: e.target.value })}
                            disabled={loading || plotting}
                        >
                            {directionChoices.map((dir) => (
                                <option key={dir} value={dir}>{dir}</option>
                            ))}
                        </select>
                    </FormField>
                    <FormField label="LT (left)">
                        <select
                            className="route-mp-widget__input"
                            value={locatorNaming.ltDirection || ''}
                            onChange={(e) => updateLocatorNaming({ ltDirection: e.target.value })}
                            disabled={loading || plotting}
                        >
                            {directionChoices.map((dir) => (
                                <option key={dir} value={dir}>{dir}</option>
                            ))}
                        </select>
                    </FormField>
                </div>
            </section>

            <section className="ps-import-section">
                <div className="ps-import-section__head">
                    <span className="ps-import-section__title">Station table</span>
                    <span className="ps-import-section__hint">CSV or Excel</span>
                </div>
                <div className="ps-import-file">
                    <div className="ps-import-file__row">
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading || plotting}
                        >
                            Choose file…
                        </button>
                        <span className={`ps-import-file__name${fileName ? '' : ' is-empty'}`}>
                            {fileName || 'No file selected'}
                        </span>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="ps-import-file__input"
                        accept=".csv,.xlsx,.xls"
                        onChange={loadFile}
                        disabled={loading || plotting}
                    />
                </div>
            </section>

            {loaded ? (
                <>
                    <section className="ps-import-section">
                        <div className="ps-import-section__head">
                            <span className="ps-import-section__title">Detected columns</span>
                            <span className="ps-import-section__hint">
                                {loaded.rowCount} rows · {loaded.datasetName || 'table'}
                            </span>
                        </div>
                        <dl className="ps-import-detect">
                            <DetectionItem label="Station" item={loaded.detection?.station} />
                            <DetectionItem label="Offset" item={loaded.detection?.offset} />
                            <SideDetectionItem
                                sideDetection={loaded.detection?.side}
                                offsetEmbeddedSide={offsetEmbeddedSide}
                            />
                            {showOptionalColumns ? (
                                <>
                                    <DetectionItem label="Label" item={loaded.detection?.label} />
                                    <DetectionItem label="Latitude" item={loaded.detection?.latitude} />
                                    <DetectionItem label="Longitude" item={loaded.detection?.longitude} />
                                </>
                            ) : null}
                        </dl>
                    </section>

                    {previewParts.length ? (
                        <div className="info-box text-xs ps-import-name-preview">
                            <span className="ps-import-section__title">Name preview</span>
                            <div className="ps-import-name-preview__values">
                                {previewParts.map((part) => (
                                    <span key={part}>{part}</span>
                                ))}
                            </div>
                            {loaded.milepostMetadataAvailable === false ? (
                                <div className="text-muted mt-4">Using engineering station (Sta …) — route MP bounds unavailable.</div>
                            ) : null}
                        </div>
                    ) : null}

                    <SamplePreview rows={loaded.previewRows} fields={fields} />

                    <section className="ps-import-section">
                        <div className="ps-import-section__head">
                            <span className="ps-import-section__title">Column mapping</span>
                        </div>
                        <div className="route-mp-widget__mp-grid">
                            <FieldPicker
                                label="Station"
                                value={mapping.station}
                                fields={fields}
                                onChange={(v) => updateMapping('station', v)}
                            />
                            <FieldPicker
                                label="Offset"
                                value={mapping.offset}
                                fields={fields}
                                onChange={(v) => updateMapping('offset', v)}
                                hint={sideFromOffset ? 'Side read from offset values.' : undefined}
                            />
                        </div>
                    </section>

                    <button
                        type="button"
                        className="gis-widget__link-btn"
                        onClick={() => setShowOptionalColumns((open) => !open)}
                    >
                        {showOptionalColumns ? 'Hide optional columns' : 'Optional: Side, Label, coordinates'}
                    </button>

                    {showOptionalColumns ? (
                        <div className="route-mp-widget__mp-grid">
                            <FieldPicker
                                label="Side"
                                value={mapping.side}
                                fields={fields}
                                onChange={(v) => updateMapping('side', v)}
                            />
                            <FieldPicker
                                label="Label"
                                value={mapping.label}
                                fields={fields}
                                onChange={(v) => updateMapping('label', v)}
                            />
                            <FieldPicker
                                label="Latitude"
                                value={mapping.latitude}
                                fields={fields}
                                onChange={(v) => updateMapping('latitude', v)}
                            />
                            <FieldPicker
                                label="Longitude"
                                value={mapping.longitude}
                                fields={fields}
                                onChange={(v) => updateMapping('longitude', v)}
                            />
                        </div>
                    ) : null}

                    <div className="route-mp-widget__summary text-xs">
                        Ready {summary.ready || 0}
                        {' · '}Warnings {summary.warnings || 0}
                        {' · '}Outside {summary.outsideRoute || 0}
                        {' · '}Conflicts {summary.coordinateConflicts || 0}
                        {' · '}Unplotted {summary.unplotted || 0}
                        {(summary.ready || 0) === 0 && loaded.rowCount > 0 ? (
                            <div className="text-muted mt-4">
                                No rows overlap the route range above.
                            </div>
                        ) : null}
                    </div>

                    <label className="checkbox-row text-xs">
                        <input
                            type="checkbox"
                            checked={includeQaLines}
                            onChange={(e) => setIncludeQaLines(e.target.checked)}
                        />
                        Include coordinate QA lines
                    </label>

                    {needsCoordinateCrs ? (
                        <CrsPicker
                            label="Table coordinate system"
                            value={coordinateCrs}
                            onChange={setCoordinateCrs}
                        />
                    ) : null}

                    {reviewedIssues.length > 0 ? (
                        <section className="ps-import-section">
                            <div className="ps-import-section__title">Rows needing attention</div>
                            <div className="gis-widget__preview-table" style={{ maxHeight: 180 }}>
                                {reviewedIssues.map((row) => (
                                    <div key={row.rowNumber} className="text-xs p-4" style={{ borderBottom: '1px solid var(--border)' }}>
                                        <strong>Row {row.rowNumber}</strong> · {row.status}
                                        {row.station ? ` · ${row.station}` : ''}
                                        {row.issue ? <div className="text-muted">{row.issue}</div> : null}
                                    </div>
                                ))}
                            </div>
                        </section>
                    ) : null}
                </>
            ) : null}
        </div>
    );
}
