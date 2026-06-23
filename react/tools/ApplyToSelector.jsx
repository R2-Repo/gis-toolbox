import { useEffect, useState } from 'react';

/**
 * Radio group: run tool on entire layer or selected features only.
 * @param {'auto'|'layer'|'selection'} [defaultApplyTo] auto = selected when selectionCount > 0
 */
export function ApplyToSelector({
    selectionCount = 0,
    totalCount = 0,
    layerName = '',
    requireSelection = false,
    defaultApplyTo = 'auto',
    onChange
}) {
    const initial = defaultApplyTo === 'auto'
        ? (selectionCount > 0 ? 'selection' : 'layer')
        : defaultApplyTo;
    const [applyTo, setApplyTo] = useState(initial);

    useEffect(() => {
        if (defaultApplyTo !== 'auto') return;
        if (selectionCount > 0 && applyTo === 'layer') {
            setApplyTo('selection');
        } else if (selectionCount === 0 && applyTo === 'selection') {
            setApplyTo('layer');
        }
    }, [selectionCount, defaultApplyTo, applyTo]);

    useEffect(() => {
        onChange?.(applyTo);
    }, [applyTo, onChange]);

    const selectionDisabled = selectionCount === 0;

    return (
        <div className="form-group">
            <label>Apply to</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="toggle" style={{ cursor: 'pointer' }}>
                    <input
                        type="radio"
                        name="apply-to"
                        checked={applyTo === 'layer'}
                        onChange={() => setApplyTo('layer')}
                    />
                    <span>Entire layer — {totalCount} feature{totalCount === 1 ? '' : 's'}{layerName ? ` on ${layerName}` : ''}</span>
                </label>
                <label className="toggle" style={{ cursor: selectionDisabled ? 'not-allowed' : 'pointer', opacity: selectionDisabled ? 0.55 : 1 }}>
                    <input
                        type="radio"
                        name="apply-to"
                        checked={applyTo === 'selection'}
                        disabled={selectionDisabled}
                        onChange={() => setApplyTo('selection')}
                    />
                    <span>
                        Selected features — {selectionCount} selected
                        {requireSelection && selectionDisabled ? ' (select on map first)' : ''}
                    </span>
                </label>
            </div>
        </div>
    );
}

export function isApplyToValid(applyTo, selectionCount, requireSelection = false) {
    if (applyTo === 'selection') {
        if (selectionCount === 0) return false;
        return true;
    }
    if (requireSelection) return selectionCount > 0;
    return true;
}
