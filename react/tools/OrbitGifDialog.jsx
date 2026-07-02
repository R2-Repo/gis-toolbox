import { useMemo, useState } from 'react';

const ORBIT_MIN_ZOOM = 13;
const ORBIT_MAX_ZOOM = 18;
const ORBIT_DEFAULT_PITCH = 55;
const ORBIT_MAX_PITCH = 85;
const PLAYBACK_OPTIONS = [12, 16, 20, 24];

function formatCoord(value) {
    if (value == null || Number.isNaN(value)) return '—';
    return value.toFixed(5);
}

function zoomLabel(zoom) {
    if (zoom <= 14) return 'Neighborhood';
    if (zoom <= 16) return 'Street';
    return 'Building';
}

function pitchLabel(pitch) {
    if (pitch <= 15) return 'Top-down';
    if (pitch <= 45) return 'Moderate tilt';
    if (pitch <= 65) return 'Orbit view';
    return 'Low horizon';
}

export function OrbitGifDialog({
    initialCenter = { lng: 0, lat: 0 },
    initialZoom = 15,
    initialPitch = ORBIT_DEFAULT_PITCH,
    activeLayerName = null,
    layerCenter = null,
    onGetMapCenter,
    onPickCenter,
    onPreview,
    onConfirm,
    onCancel
}) {
    const [centerMode, setCenterMode] = useState(layerCenter ? 'layer' : 'map');
    const [pickedCenter, setPickedCenter] = useState(null);
    const [zoom, setZoom] = useState(() => Math.min(ORBIT_MAX_ZOOM, Math.max(ORBIT_MIN_ZOOM, initialZoom)));
    const [pitch, setPitch] = useState(() => Math.min(ORBIT_MAX_PITCH, Math.max(0, initialPitch)));
    const [playbackSec, setPlaybackSec] = useState(20);
    const [picking, setPicking] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [error, setError] = useState('');

    const resolvedCenter = useMemo(() => {
        if (centerMode === 'layer' && layerCenter) return layerCenter;
        if (centerMode === 'pick' && pickedCenter) return pickedCenter;
        return initialCenter;
    }, [centerMode, layerCenter, pickedCenter, initialCenter]);

    const centerSummary = useMemo(() => {
        if (centerMode === 'map') return 'Current map center when you record';
        if (centerMode === 'layer') return activeLayerName || 'Active layer centroid';
        if (pickedCenter) return 'Picked on map';
        return 'Click the map to set center';
    }, [centerMode, activeLayerName, pickedCenter]);

    const canRecord = centerMode !== 'pick' || !!pickedCenter;
    const canUseLayer = !!layerCenter;

    const buildSettings = () => {
        let center = resolvedCenter;
        if (centerMode === 'map' && onGetMapCenter) {
            center = onGetMapCenter();
        }
        return {
            center: { lng: center.lng, lat: center.lat },
            zoom,
            pitch,
            playbackSec,
            durationSec: playbackSec
        };
    };

    const handlePick = async () => {
        if (!onPickCenter || picking) return;
        setError('');
        setPicking(true);
        try {
            const next = await onPickCenter();
            if (!next) return;
            setPickedCenter(next);
            setCenterMode('pick');
        } catch (err) {
            setError(err.message || 'Could not pick a point on the map.');
        } finally {
            setPicking(false);
        }
    };

    const handlePreview = async () => {
        if (!onPreview || previewing) return;
        setError('');
        setPreviewing(true);
        try {
            await onPreview(buildSettings());
        } catch (err) {
            setError(err.message || 'Preview failed.');
        } finally {
            setPreviewing(false);
        }
    };

    const handleRecord = () => {
        if (!canRecord) {
            setError('Pick an orbit center on the map first.');
            return;
        }
        setError('');
        onConfirm?.(buildSettings());
    };

    return (
        <div className="orbit-gif-dialog">
            <p className="text-sm text-muted mb-12">
                Set the orbit center, camera height, and tilt before recording one full 360° rotation.
            </p>

            <fieldset className="orbit-gif-fieldset mb-12">
                <legend className="field-label">Orbit center</legend>
                <label className="radio-row mb-8">
                    <input
                        type="radio"
                        name="orbit-center"
                        checked={centerMode === 'map'}
                        onChange={() => setCenterMode('map')}
                    />
                    <span>Current map center</span>
                </label>
                <label className={`radio-row mb-8${canUseLayer ? '' : ' text-muted'}`}>
                    <input
                        type="radio"
                        name="orbit-center"
                        checked={centerMode === 'layer'}
                        disabled={!canUseLayer}
                        onChange={() => setCenterMode('layer')}
                    />
                    <span>{activeLayerName ? `Active layer — ${activeLayerName}` : 'Active layer (none loaded)'}</span>
                </label>
                <label className="radio-row mb-8">
                    <input
                        type="radio"
                        name="orbit-center"
                        checked={centerMode === 'pick'}
                        onChange={() => setCenterMode('pick')}
                    />
                    <span>Pick on map</span>
                </label>
                <div className="orbit-gif-center-meta text-xs text-muted mb-8">
                    {centerSummary}
                    {resolvedCenter ? (
                        <span className="orbit-gif-coords">
                            {' '}({formatCoord(resolvedCenter.lng)}, {formatCoord(resolvedCenter.lat)})
                        </span>
                    ) : null}
                </div>
                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={picking || previewing}
                    onClick={() => { void handlePick(); }}
                >
                    {picking ? 'Click the map…' : 'Set center on map'}
                </button>
            </fieldset>

            <div className="mb-12">
                <label className="field-label" htmlFor="orbit-gif-zoom">
                    Camera height (zoom) — {zoom.toFixed(1)} · {zoomLabel(zoom)}
                </label>
                <input
                    id="orbit-gif-zoom"
                    type="range"
                    className="style-range w-full"
                    min={ORBIT_MIN_ZOOM}
                    max={ORBIT_MAX_ZOOM}
                    step="0.5"
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                />
                <div className="text-xs text-muted">Higher zoom moves the camera closer to the ground.</div>
            </div>

            <div className="mb-12">
                <label className="field-label" htmlFor="orbit-gif-pitch">
                    Camera tilt — {Math.round(pitch)}° · {pitchLabel(pitch)}
                </label>
                <input
                    id="orbit-gif-pitch"
                    type="range"
                    className="style-range w-full"
                    min="0"
                    max={ORBIT_MAX_PITCH}
                    step="1"
                    value={pitch}
                    onChange={(e) => setPitch(Number(e.target.value))}
                />
                <div className="text-xs text-muted">0° is top-down; 55° is a classic orbit; 85° is near the horizon.</div>
            </div>

            <div className="mb-12">
                <label className="field-label" htmlFor="orbit-gif-playback">Playback length</label>
                <select
                    id="orbit-gif-playback"
                    className="input w-full"
                    value={playbackSec}
                    onChange={(e) => setPlaybackSec(Number(e.target.value))}
                >
                    {PLAYBACK_OPTIONS.map((sec) => (
                        <option key={sec} value={sec}>{sec} seconds — slow orbit</option>
                    ))}
                </select>
                <div className="text-xs text-muted">
                    High frame rate capture keeps motion smooth while the GIF plays back slowly.
                </div>
            </div>

            {error ? <p className="text-sm mb-12" style={{ color: 'var(--danger)' }}>{error}</p> : null}

            <div className="modal-actions mt-16">
                <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={previewing || picking}
                    onClick={() => { void handlePreview(); }}
                >
                    {previewing ? 'Previewing…' : 'Preview view'}
                </button>
                <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!canRecord || picking || previewing}
                    onClick={handleRecord}
                >
                    Record GIF
                </button>
            </div>
        </div>
    );
}
