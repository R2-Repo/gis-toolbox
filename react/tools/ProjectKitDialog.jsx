import { useMemo, useState } from 'react';
import { PROJECT_KIT_SECTIONS } from '../../js/core/project-kit.js';

const SECTION_LABELS = {
    layers: 'Layers & styles',
    map: 'Map appearance',
    workflow: 'Data pipeline',
    preferences: 'Preferences'
};

function SectionCheckboxes({ sections, onChange, availableSections = PROJECT_KIT_SECTIONS }) {
    return (
        <div className="project-kit-sections">
            {PROJECT_KIT_SECTIONS.map((key) => {
                if (!availableSections.includes(key)) return null;
                return (
                    <label key={key} className="toggle mb-8">
                        <input
                            type="checkbox"
                            checked={sections.includes(key)}
                            onChange={(e) => {
                                if (e.target.checked) onChange([...sections, key]);
                                else onChange(sections.filter((entry) => entry !== key));
                            }}
                        />
                        <span className="toggle-track"></span>
                        <span>{SECTION_LABELS[key]}</span>
                    </label>
                );
            })}
        </div>
    );
}

export function ExportProjectKitDialog({
    defaultName = 'toolbox-project',
    layerCount = 0,
    onConfirm,
    onCancel
}) {
    const [projectName, setProjectName] = useState(defaultName);
    const [sections, setSections] = useState([...PROJECT_KIT_SECTIONS]);

    const canExport = sections.length > 0;
    const dateHint = useMemo(() => {
        const now = new Date();
        const d = `${now.getMonth() + 1}-${now.getDate()}-${String(now.getFullYear()).slice(-2)}`;
        return `${projectName.trim() || 'toolbox-project'}(${d}).gis-toolbox`;
    }, [projectName]);

    return (
        <div className="project-kit-dialog">
            <p className="text-sm text-muted mb-8">
                Save your workspace as a <strong>.gis-toolbox</strong> project file. Choose what to include.
            </p>
            <label className="field-label" htmlFor="project-kit-name">Project name</label>
            <input
                id="project-kit-name"
                className="input w-full mb-8"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Highway-88-Stationing"
            />
            <div className="text-xs text-muted mb-12">File: {dateHint}</div>
            <div className="text-sm text-muted mb-8">{layerCount} layer{layerCount !== 1 ? 's' : ''} in workspace</div>
            <SectionCheckboxes sections={sections} onChange={setSections} />
            <div className="modal-actions mt-16">
                <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!canExport}
                    onClick={() => onConfirm?.({ projectName: projectName.trim() || 'toolbox-project', sections })}
                >
                    Export
                </button>
            </div>
        </div>
    );
}

export function ImportProjectKitDialog({
    summary,
    availableSections = PROJECT_KIT_SECTIONS,
    onConfirm,
    onCancel
}) {
    const [sections, setSections] = useState(() => [...availableSections]);
    const [mode, setMode] = useState('replace');

    const detailLines = useMemo(() => {
        const lines = [];
        if (summary?.projectName) lines.push(`Project: ${summary.projectName}`);
        if (summary?.exportedAt) lines.push(`Exported: ${new Date(summary.exportedAt).toLocaleString()}`);
        if (summary?.layerCount != null) lines.push(`${summary.layerCount} layer${summary.layerCount !== 1 ? 's' : ''}`);
        if (summary?.hasWorkflow) lines.push('Pipeline included');
        if (summary?.hasMap) lines.push('Map settings included');
        if (summary?.hasPreferences) lines.push('Preferences included');
        return lines;
    }, [summary]);

    return (
        <div className="project-kit-dialog">
            <p className="text-sm text-muted mb-8">Restore from this <strong>.gis-toolbox</strong> project file:</p>
            <ul className="text-sm mb-12 project-kit-summary">
                {detailLines.map((line) => <li key={line}>{line}</li>)}
            </ul>
            <SectionCheckboxes sections={sections} onChange={setSections} availableSections={availableSections} />
            <div className="mt-12">
                <div className="text-sm mb-8">Import mode</div>
                <label className="radio-row mb-8">
                    <input type="radio" name="kit-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
                    <span>Replace selected sections</span>
                </label>
                <label className="radio-row">
                    <input type="radio" name="kit-mode" checked={mode === 'merge'} onChange={() => setMode('merge')} />
                    <span>Merge (layers get new IDs on conflict)</span>
                </label>
            </div>
            <div className="modal-actions mt-16">
                <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!sections.length}
                    onClick={() => onConfirm?.({ sections, mode })}
                >
                    Import
                </button>
            </div>
        </div>
    );
}
