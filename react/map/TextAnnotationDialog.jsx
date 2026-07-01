import { useEffect, useRef, useState } from 'react';
import { DEFAULT_ANNOTATION_STYLE } from '../../js/map/map-annotations.js';

const ANCHOR_OPTIONS = [
    { value: 'center', label: 'Center' },
    { value: 'top', label: 'Top' },
    { value: 'bottom', label: 'Bottom' },
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
    { value: 'top-left', label: 'Top left' },
    { value: 'top-right', label: 'Top right' },
    { value: 'bottom-left', label: 'Bottom left' },
    { value: 'bottom-right', label: 'Bottom right' }
];

export function TextAnnotationDialog({
    mode = 'text',
    initial = {},
    onConfirm,
    onCancel
}) {
    const inputRef = useRef(null);
    const [text, setText] = useState(initial.text ?? '');
    const [fontSize, setFontSize] = useState(initial.fontSize ?? DEFAULT_ANNOTATION_STYLE.fontSize);
    const [color, setColor] = useState(initial.color ?? DEFAULT_ANNOTATION_STYLE.color);
    const [haloColor, setHaloColor] = useState(initial.haloColor ?? DEFAULT_ANNOTATION_STYLE.haloColor);
    const [haloWidth, setHaloWidth] = useState(initial.haloWidth ?? DEFAULT_ANNOTATION_STYLE.haloWidth);
    const [anchor, setAnchor] = useState(initial.anchor ?? DEFAULT_ANNOTATION_STYLE.anchor);
    const [rotation, setRotation] = useState(initial.rotation ?? DEFAULT_ANNOTATION_STYLE.rotation);
    const [leaderColor, setLeaderColor] = useState(initial.leaderColor ?? DEFAULT_ANNOTATION_STYLE.leaderColor);
    const [leaderWidth, setLeaderWidth] = useState(initial.leaderWidth ?? DEFAULT_ANNOTATION_STYLE.leaderWidth);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed) return;
        onConfirm?.({
            text: trimmed,
            fontSize: Number(fontSize) || DEFAULT_ANNOTATION_STYLE.fontSize,
            color,
            haloColor,
            haloWidth: Number(haloWidth) || DEFAULT_ANNOTATION_STYLE.haloWidth,
            anchor,
            rotation: Number(rotation) || 0,
            ...(mode === 'callout' ? {
                leaderColor,
                leaderWidth: Number(leaderWidth) || DEFAULT_ANNOTATION_STYLE.leaderWidth
            } : {})
        });
    };

    return (
        <form className="text-annotation-dialog" onSubmit={handleSubmit}>
            <div className="form-group">
                <label className="text-xs text-muted" htmlFor="ann-text">Text</label>
                <textarea
                    id="ann-text"
                    ref={inputRef}
                    rows={3}
                    value={text}
                    placeholder="Enter label text…"
                    onChange={(e) => setText(e.target.value)}
                />
            </div>
            <div className="text-annotation-style-grid">
                <div className="form-group">
                    <label className="text-xs text-muted" htmlFor="ann-size">Size</label>
                    <input
                        id="ann-size"
                        type="number"
                        min={8}
                        max={72}
                        value={fontSize}
                        onChange={(e) => setFontSize(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label className="text-xs text-muted" htmlFor="ann-rotation">Rotation</label>
                    <input
                        id="ann-rotation"
                        type="number"
                        min={-360}
                        max={360}
                        value={rotation}
                        onChange={(e) => setRotation(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label className="text-xs text-muted" htmlFor="ann-color">Text color</label>
                    <input id="ann-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="text-xs text-muted" htmlFor="ann-halo">Halo color</label>
                    <input id="ann-halo" type="color" value={haloColor} onChange={(e) => setHaloColor(e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="text-xs text-muted" htmlFor="ann-halo-w">Halo width</label>
                    <input
                        id="ann-halo-w"
                        type="number"
                        min={0}
                        max={8}
                        step={0.5}
                        value={haloWidth}
                        onChange={(e) => setHaloWidth(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label className="text-xs text-muted" htmlFor="ann-anchor">Anchor</label>
                    <select id="ann-anchor" value={anchor} onChange={(e) => setAnchor(e.target.value)}>
                        {ANCHOR_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                {mode === 'callout' ? (
                    <>
                        <div className="form-group">
                            <label className="text-xs text-muted" htmlFor="ann-leader-color">Leader color</label>
                            <input id="ann-leader-color" type="color" value={leaderColor} onChange={(e) => setLeaderColor(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="text-xs text-muted" htmlFor="ann-leader-w">Leader width</label>
                            <input
                                id="ann-leader-w"
                                type="number"
                                min={0.5}
                                max={8}
                                step={0.5}
                                value={leaderWidth}
                                onChange={(e) => setLeaderWidth(e.target.value)}
                            />
                        </div>
                    </>
                ) : null}
            </div>
            <div className="text-annotation-dialog-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onCancel?.()}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={!text.trim()}>Place label</button>
            </div>
        </form>
    );
}
