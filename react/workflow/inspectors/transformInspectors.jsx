import React, { useCallback, useEffect, useRef } from 'react';
import { UNIT_CATEGORIES } from '../../../js/workflow/nodes/transform-nodes.js';
import {
    getUpstreamFields,
    getUpstreamFieldsForPort,
    getUpstreamData,
    mergeConfigFields,
    FILTER_OPERATORS,
    COND_OPERATORS
} from './helpers.js';
import {
    InspectorLabel,
    InspectorInput,
    InspectorSelect,
    InspectorTextarea,
    ToggleRow,
    FieldCheckboxList,
    FieldChips,
    HintText
} from './shared.jsx';

function orderSelected(fields, selected) {
    return fields.filter((f) => selected.includes(f));
}

function useInsertAtCursor(ref, value, onChange) {
    return useCallback((insertion) => {
        const el = ref.current;
        const current = value ?? '';
        const pos = el?.selectionStart ?? current.length;
        const newValue = current.slice(0, pos) + insertion + current.slice(pos);
        onChange(newValue);
        if (el) {
            requestAnimationFrame(() => {
                el.focus();
                const newPos = pos + insertion.length;
                el.selectionStart = el.selectionEnd = newPos;
            });
        }
    }, [ref, value, onChange]);
}

function extractBraceFields(template) {
    const names = [];
    if (!template) return names;
    for (const m of template.matchAll(/\{([^}]+)\}/g)) {
        if (m[1] && !names.includes(m[1])) names.push(m[1]);
    }
    return names;
}

function extractBracketFields(expression) {
    const names = [];
    if (!expression) return names;
    for (const m of expression.matchAll(/\[([^\]]+)\]/g)) {
        if (m[1] && !names.includes(m[1])) names.push(m[1]);
    }
    return names;
}

// 1. Filter Rows
function FilterRowsInspector({ node, config, onConfigChange, engine, getLayers }) {
    const fields = mergeConfigFields(
        getUpstreamFields(engine, node.id, getLayers),
        config.rules?.map((r) => r.field) || []
    );
    const rules = config.rules?.length ? config.rules : [{ field: '', operator: 'equals', value: '' }];

    const updateRule = (idx, patch) => {
        onConfigChange({ ...config, rules: rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)) });
    };

    return (
        <>
            <InspectorLabel>Logic</InspectorLabel>
            <ToggleRow
                options={[{ value: 'AND', label: 'AND' }, { value: 'OR', label: 'OR' }]}
                value={config.logic || 'AND'}
                onChange={(logic) => onConfigChange({ ...config, logic })}
            />
            <InspectorLabel style={{ marginTop: 8 }}>Rules</InspectorLabel>
            <div id="wf-filter-rules">
                {rules.map((rule, i) => (
                    <div key={i} className="wf-filter-rule" data-idx={i} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
                        <InspectorSelect
                            value={rule.field}
                            onChange={(v) => updateRule(i, { field: v })}
                            style={{ flex: 1 }}
                        >
                            <option value="">Field…</option>
                            {fields.map((f) => <option key={f} value={f}>{f}</option>)}
                        </InspectorSelect>
                        <InspectorSelect
                            value={rule.operator || 'equals'}
                            onChange={(v) => updateRule(i, { operator: v })}
                            style={{ width: 90 }}
                        >
                            {FILTER_OPERATORS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </InspectorSelect>
                        <InspectorInput
                            value={rule.value}
                            onChange={(v) => updateRule(i, { value: v })}
                            placeholder="Value"
                            style={{ flex: 1 }}
                        />
                        <button
                            type="button"
                            className="wf-btn-icon wf-filter-rm"
                            data-idx={i}
                            title="Remove rule"
                            onClick={() => {
                                if (rules.length > 1) {
                                    onConfigChange({ ...config, rules: rules.filter((_, j) => j !== i) });
                                }
                            }}
                        >
                            &times;
                        </button>
                    </div>
                ))}
            </div>
            <button
                type="button"
                className="wf-btn-sm"
                id="wf-add-rule"
                style={{ marginTop: 6 }}
                onClick={() => onConfigChange({ ...config, rules: [...rules, { field: '', operator: 'equals', value: '' }] })}
            >
                + Add Rule
            </button>
        </>
    );
}

// 2. Rename Fields
function RenameFieldsInspector({ node, config, onConfigChange, engine, getLayers }) {
    const upstreamFields = getUpstreamFields(engine, node.id, getLayers);
    const fields = mergeConfigFields(upstreamFields, config.mappings?.map((m) => m.from) || []);
    const mappings = config.mappings || [];

    useEffect(() => {
        if (mappings.length === 0 && fields.length > 0) {
            onConfigChange({ ...config, mappings: [{ from: fields[0], to: '' }] });
        }
    }, [mappings.length, fields.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const updateMapping = (idx, patch) => {
        onConfigChange({
            ...config,
            mappings: mappings.map((m, i) => (i === idx ? { ...m, ...patch } : m))
        });
    };

    return (
        <>
            <InspectorLabel>Field Renames</InspectorLabel>
            <div id="wf-rename-rows">
                {mappings.map((m, i) => (
                    <div key={i} className="wf-rename-row" data-idx={i} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
                        <InspectorSelect
                            value={m.from}
                            onChange={(v) => updateMapping(i, { from: v })}
                            style={{ flex: 1 }}
                        >
                            {fields.map((f) => <option key={f} value={f}>{f}</option>)}
                        </InspectorSelect>
                        <span style={{ color: 'var(--text-muted)' }}>→</span>
                        <InspectorInput
                            value={m.to}
                            onChange={(v) => updateMapping(i, { to: v })}
                            placeholder="New name"
                            style={{ flex: 1 }}
                        />
                        <button
                            type="button"
                            className="wf-btn-icon wf-rename-rm"
                            data-idx={i}
                            onClick={() => onConfigChange({ ...config, mappings: mappings.filter((_, j) => j !== i) })}
                        >
                            &times;
                        </button>
                    </div>
                ))}
            </div>
            <button
                type="button"
                className="wf-btn-sm"
                id="wf-add-rename"
                style={{ marginTop: 6 }}
                onClick={() => onConfigChange({ ...config, mappings: [...mappings, { from: fields[0] || '', to: '' }] })}
            >
                + Add Rename
            </button>
        </>
    );
}

// 3. Delete Fields
function DeleteFieldsInspector({ node, config, onConfigChange, engine, getLayers }) {
    const fields = mergeConfigFields(
        getUpstreamFields(engine, node.id, getLayers),
        config.fieldsToDelete || []
    );

    return (
        <>
            <InspectorLabel>Fields to Remove</InspectorLabel>
            <FieldCheckboxList
                fields={fields}
                selected={config.fieldsToDelete || []}
                onChange={(fieldsToDelete) => onConfigChange({ ...config, fieldsToDelete: orderSelected(fields, fieldsToDelete) })}
            />
        </>
    );
}

// 4. Find & Replace
function FindReplaceInspector({ node, config, onConfigChange, engine, getLayers }) {
    const fields = mergeConfigFields(
        getUpstreamFields(engine, node.id, getLayers),
        config.field ? [config.field] : []
    );

    return (
        <>
            <InspectorLabel>Field</InspectorLabel>
            <InspectorSelect value={config.field} onChange={(field) => onConfigChange({ ...config, field })}>
                <option value="">— Select —</option>
                {fields.map((f) => <option key={f} value={f}>{f}</option>)}
            </InspectorSelect>
            <InspectorLabel style={{ marginTop: 8 }}>Find</InspectorLabel>
            <InspectorInput
                value={config.find}
                onChange={(find) => onConfigChange({ ...config, find })}
                placeholder="Text to find"
            />
            <InspectorLabel style={{ marginTop: 6 }}>Replace with</InspectorLabel>
            <InspectorInput
                value={config.replace}
                onChange={(replace) => onConfigChange({ ...config, replace })}
                placeholder="Replacement text"
            />
            <InspectorLabel style={{ marginTop: 8 }}>Case Transform</InspectorLabel>
            <InspectorSelect
                value={config.caseTransform || ''}
                onChange={(caseTransform) => onConfigChange({ ...config, caseTransform })}
            >
                <option value="">None</option>
                <option value="upper">UPPERCASE</option>
                <option value="lower">lowercase</option>
                <option value="title">Title Case</option>
            </InspectorSelect>
        </>
    );
}

// 5. Sort
function SortInspector({ node, config, onConfigChange, engine, getLayers }) {
    const fields = mergeConfigFields(
        getUpstreamFields(engine, node.id, getLayers),
        config.field ? [config.field] : []
    );

    return (
        <>
            <InspectorLabel>Sort Field</InspectorLabel>
            <InspectorSelect value={config.field} onChange={(field) => onConfigChange({ ...config, field })}>
                <option value="">— Select —</option>
                {fields.map((f) => <option key={f} value={f}>{f}</option>)}
            </InspectorSelect>
            <InspectorLabel style={{ marginTop: 8 }}>Direction</InspectorLabel>
            <ToggleRow
                options={[
                    { value: 'asc', label: '↑ Ascending' },
                    { value: 'desc', label: '↓ Descending' }
                ]}
                value={config.direction || 'asc'}
                onChange={(direction) => onConfigChange({ ...config, direction })}
            />
        </>
    );
}

// 6. Deduplicate
function DeduplicateInspector({ node, config, onConfigChange, engine, getLayers }) {
    const fields = mergeConfigFields(
        getUpstreamFields(engine, node.id, getLayers),
        config.keyFields || []
    );

    return (
        <>
            <InspectorLabel>Key Fields (duplicates matched on these)</InspectorLabel>
            <FieldCheckboxList
                fields={fields}
                selected={config.keyFields || []}
                onChange={(keyFields) => onConfigChange({ ...config, keyFields: orderSelected(fields, keyFields) })}
            />
            <InspectorLabel style={{ marginTop: 8 }}>Keep</InspectorLabel>
            <ToggleRow
                options={[{ value: 'first', label: 'First' }, { value: 'last', label: 'Last' }]}
                value={config.keep || 'first'}
                onChange={(keep) => onConfigChange({ ...config, keep })}
            />
        </>
    );
}

// 7. Add Unique ID
function AddUniqueIdInspector({ config, onConfigChange }) {
    return (
        <>
            <InspectorLabel>ID Field Name</InspectorLabel>
            <InspectorInput
                value={config.fieldName}
                onChange={(fieldName) => onConfigChange({ ...config, fieldName })}
                placeholder="uid"
            />
            <InspectorLabel style={{ marginTop: 8 }}>Method</InspectorLabel>
            <ToggleRow
                options={[
                    { value: 'sequential', label: '1, 2, 3…' },
                    { value: 'uuid', label: 'UUID' }
                ]}
                value={config.method || 'sequential'}
                onChange={(method) => onConfigChange({ ...config, method })}
            />
        </>
    );
}

// 8. Combine Fields
function CombineFieldsInspector({ node, config, onConfigChange, engine, getLayers }) {
    const fields = mergeConfigFields(
        getUpstreamFields(engine, node.id, getLayers),
        config.fields || []
    );

    return (
        <>
            <InspectorLabel>Fields to Combine (in order)</InspectorLabel>
            <FieldCheckboxList
                fields={fields}
                selected={config.fields || []}
                onChange={(selected) => onConfigChange({ ...config, fields: orderSelected(fields, selected) })}
            />
            <InspectorLabel style={{ marginTop: 8 }}>Delimiter</InspectorLabel>
            <InspectorInput
                value={config.delimiter}
                onChange={(delimiter) => onConfigChange({ ...config, delimiter })}
                placeholder="Space, comma, etc."
            />
            <InspectorLabel style={{ marginTop: 6 }}>Output Field Name</InspectorLabel>
            <InspectorInput
                value={config.outputField}
                onChange={(outputField) => onConfigChange({ ...config, outputField })}
                placeholder="combined"
            />
            <label className="wf-check-row" style={{ marginTop: 6 }}>
                <input
                    type="checkbox"
                    checked={config.skipBlanks !== false}
                    onChange={(e) => onConfigChange({ ...config, skipBlanks: e.target.checked })}
                />
                <span>Skip blank values</span>
            </label>
        </>
    );
}

// 9. Split Column
function SplitColumnInspector({ node, config, onConfigChange, engine, getLayers }) {
    const fields = mergeConfigFields(
        getUpstreamFields(engine, node.id, getLayers),
        config.field ? [config.field] : []
    );

    return (
        <>
            <InspectorLabel>Field to Split</InspectorLabel>
            <InspectorSelect value={config.field} onChange={(field) => onConfigChange({ ...config, field })}>
                <option value="">— Select —</option>
                {fields.map((f) => <option key={f} value={f}>{f}</option>)}
            </InspectorSelect>
            <InspectorLabel style={{ marginTop: 8 }}>Delimiter</InspectorLabel>
            <InspectorInput
                value={config.delimiter}
                onChange={(delimiter) => onConfigChange({ ...config, delimiter })}
                placeholder=","
            />
            <InspectorLabel style={{ marginTop: 6 }}>Max Parts (0 = unlimited)</InspectorLabel>
            <InspectorInput
                type="number"
                value={config.maxParts ?? 0}
                onChange={(v) => onConfigChange({ ...config, maxParts: parseInt(v, 10) || 0 })}
                min={0}
                step={1}
            />
            <InspectorLabel style={{ marginTop: 6 }}>Output Names (comma-separated, optional)</InspectorLabel>
            <InspectorInput
                value={config.outputNames}
                onChange={(outputNames) => onConfigChange({ ...config, outputNames })}
                placeholder="part_1, part_2, ..."
            />
            <HintText>Leave blank to auto-name: field_1, field_2, …</HintText>
        </>
    );
}

// 10. Template Builder
function TemplateBuilderInspector({ node, config, onConfigChange, engine, getLayers }) {
    const textareaRef = useRef(null);
    const upstreamFields = getUpstreamFields(engine, node.id, getLayers);
    const fields = mergeConfigFields(upstreamFields, extractBraceFields(config.template));
    const handleTemplateChange = useCallback((template) => onConfigChange({ ...config, template }), [config, onConfigChange]);
    const insertAtCursor = useInsertAtCursor(textareaRef, config.template, handleTemplateChange);

    return (
        <>
            <InspectorLabel>
                Available Fields <span style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>(click to insert)</span>
            </InspectorLabel>
            <FieldChips fields={fields} onInsert={insertAtCursor} format={(f) => `{${f}}`} />
            <InspectorLabel style={{ marginTop: 8 }}>Template</InspectorLabel>
            <InspectorTextarea
                ref={textareaRef}
                value={config.template}
                onChange={handleTemplateChange}
                rows={3}
                placeholder="{FirstName} {LastName} ({City}, {State})"
            />
            <InspectorLabel style={{ marginTop: 6 }}>Output Field Name</InspectorLabel>
            <InspectorInput
                value={config.outputField}
                onChange={(outputField) => onConfigChange({ ...config, outputField })}
                placeholder="formatted"
            />
            <label className="wf-check-row" style={{ marginTop: 6 }}>
                <input
                    type="checkbox"
                    checked={config.skipBlanks !== false}
                    onChange={(e) => onConfigChange({ ...config, skipBlanks: e.target.checked })}
                />
                <span>Clean up blank placeholders</span>
            </label>
            <HintText>
                Use {'{FieldName}'} placeholders. Empty wrappers like () and dangling separators are auto-removed.
            </HintText>
        </>
    );
}

// 11. Type Convert
function TypeConvertInspector({ node, config, onConfigChange, engine, getLayers }) {
    const fields = mergeConfigFields(
        getUpstreamFields(engine, node.id, getLayers),
        config.field ? [config.field] : []
    );

    return (
        <>
            <InspectorLabel>Field</InspectorLabel>
            <InspectorSelect value={config.field} onChange={(field) => onConfigChange({ ...config, field })}>
                <option value="">— Select —</option>
                {fields.map((f) => <option key={f} value={f}>{f}</option>)}
            </InspectorSelect>
            <InspectorLabel style={{ marginTop: 8 }}>Convert To</InspectorLabel>
            <InspectorSelect
                value={config.targetType || 'number'}
                onChange={(targetType) => onConfigChange({ ...config, targetType })}
            >
                <option value="number">Number</option>
                <option value="string">Text</option>
                <option value="boolean">Boolean (true/false)</option>
                <option value="date">Date (ISO)</option>
            </InspectorSelect>
            <HintText>Converts all values in the field to the selected type. Invalid values remain unchanged.</HintText>
        </>
    );
}

// 12. Join / Lookup
function JoinLookupInspector({ node, config, onConfigChange, engine, getLayers }) {
    const leftFields = mergeConfigFields(
        getUpstreamFieldsForPort(engine, node.id, 'in', getLayers),
        [config.leftKey].filter(Boolean)
    );
    const rightFields = mergeConfigFields(
        getUpstreamFieldsForPort(engine, node.id, 'lookup', getLayers),
        [config.rightKey, ...(config.fieldsToJoin || [])].filter(Boolean)
    );

    return (
        <>
            <InspectorLabel>Main Key Field</InspectorLabel>
            <InspectorSelect value={config.leftKey} onChange={(leftKey) => onConfigChange({ ...config, leftKey })}>
                <option value="">— Select —</option>
                {leftFields.map((f) => <option key={f} value={f}>{f}</option>)}
            </InspectorSelect>
            <InspectorLabel style={{ marginTop: 8 }}>Lookup Key Field</InspectorLabel>
            <InspectorSelect value={config.rightKey} onChange={(rightKey) => onConfigChange({ ...config, rightKey })}>
                <option value="">— Select —</option>
                {rightFields.map((f) => <option key={f} value={f}>{f}</option>)}
            </InspectorSelect>
            <InspectorLabel style={{ marginTop: 8 }}>Fields to Add from Lookup</InspectorLabel>
            <FieldCheckboxList
                fields={rightFields}
                selected={config.fieldsToJoin || []}
                onChange={(fieldsToJoin) => onConfigChange({ ...config, fieldsToJoin: orderSelected(rightFields, fieldsToJoin) })}
                emptyText="Connect a lookup table to the second input"
            />
            <HintText>Like VLOOKUP: matches rows by key and copies selected fields from the lookup table.</HintText>
        </>
    );
}

// 13. Calculate Field
function CalculateFieldInspector({ node, config, onConfigChange, engine, getLayers }) {
    const inputRef = useRef(null);
    const upstreamFields = getUpstreamFields(engine, node.id, getLayers);
    const fields = mergeConfigFields(upstreamFields, extractBracketFields(config.expression));
    const handleExpressionChange = useCallback(
        (expression) => onConfigChange({ ...config, expression }),
        [config, onConfigChange]
    );
    const insertAtCursor = useInsertAtCursor(inputRef, config.expression, handleExpressionChange);

    return (
        <>
            <InspectorLabel>
                Available Fields <span style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>(click to insert)</span>
            </InspectorLabel>
            <FieldChips fields={fields} onInsert={insertAtCursor} format={(f) => `[${f}]`} />
            <InspectorLabel style={{ marginTop: 8 }}>Expression</InspectorLabel>
            <InspectorInput
                ref={inputRef}
                value={config.expression}
                onChange={handleExpressionChange}
                placeholder="[price] * [quantity]"
                style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
            <InspectorLabel style={{ marginTop: 6 }}>Output Field Name</InspectorLabel>
            <InspectorInput
                value={config.outputField}
                onChange={(outputField) => onConfigChange({ ...config, outputField })}
                placeholder="result"
            />
            <HintText>
                Use [FieldName] for field values. Supports: + - * / % ( ) and numbers.
                <br />
                Example: [price] * [qty] * (1 + [tax_rate] / 100)
            </HintText>
        </>
    );
}

// 14. Conditional Value
function ConditionalValueInspector({ node, config, onConfigChange, engine, getLayers }) {
    const fields = mergeConfigFields(
        getUpstreamFields(engine, node.id, getLayers),
        config.rules?.map((r) => r.field) || []
    );
    const rules = config.rules?.length
        ? config.rules
        : [{ field: '', operator: 'equals', value: '', result: '' }];

    const updateRule = (idx, patch) => {
        onConfigChange({ ...config, rules: rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)) });
    };

    return (
        <>
            <InspectorLabel>Output Field Name</InspectorLabel>
            <InspectorInput
                value={config.outputField}
                onChange={(outputField) => onConfigChange({ ...config, outputField })}
                placeholder="category"
            />
            <InspectorLabel style={{ marginTop: 8 }}>Rules (first match wins)</InspectorLabel>
            <div id="wf-cond-rules">
                {rules.map((rule, i) => (
                    <div
                        key={i}
                        className="wf-cond-rule"
                        data-idx={i}
                        style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 6, marginBottom: 4 }}
                    >
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: 11, width: 18 }}>IF</span>
                            <InspectorSelect
                                value={rule.field}
                                onChange={(v) => updateRule(i, { field: v })}
                                style={{ flex: 1, fontSize: 11 }}
                            >
                                <option value="">Field…</option>
                                {fields.map((f) => <option key={f} value={f}>{f}</option>)}
                            </InspectorSelect>
                            <InspectorSelect
                                value={rule.operator || 'equals'}
                                onChange={(v) => updateRule(i, { operator: v })}
                                style={{ width: 70, fontSize: 11 }}
                            >
                                {COND_OPERATORS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                            </InspectorSelect>
                            <InspectorInput
                                value={rule.value}
                                onChange={(v) => updateRule(i, { value: v })}
                                placeholder="Value"
                                style={{ flex: 1, fontSize: 11 }}
                            />
                            <button
                                type="button"
                                className="wf-btn-icon wf-cond-rm"
                                data-idx={i}
                                title="Remove"
                                onClick={() => {
                                    if (rules.length > 1) {
                                        onConfigChange({ ...config, rules: rules.filter((_, j) => j !== i) });
                                    }
                                }}
                            >
                                &times;
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 4 }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: 11, width: 18 }}>→</span>
                            <InspectorInput
                                value={rule.result}
                                onChange={(v) => updateRule(i, { result: v })}
                                placeholder="Set value to…"
                                style={{ flex: 1, fontSize: 11 }}
                            />
                        </div>
                    </div>
                ))}
            </div>
            <button
                type="button"
                className="wf-btn-sm"
                id="wf-add-cond"
                style={{ marginTop: 4 }}
                onClick={() => onConfigChange({
                    ...config,
                    rules: [...rules, { field: '', operator: 'equals', value: '', result: '' }]
                })}
            >
                + Add Rule
            </button>
            <InspectorLabel style={{ marginTop: 8 }}>Default Value (if no rules match)</InspectorLabel>
            <InspectorInput
                value={config.defaultValue}
                onChange={(defaultValue) => onConfigChange({ ...config, defaultValue })}
                placeholder="Other"
            />
        </>
    );
}

// 15. Coordinate Converter
function CoordConvertInspector({ node, config, onConfigChange, engine, getLayers }) {
    const upstream = getUpstreamData(engine, node.id, getLayers);
    const isSpatial = upstream?.type === 'spatial';
    const fields = mergeConfigFields(
        getUpstreamFields(engine, node.id, getLayers),
        [config.latField, config.lonField].filter(Boolean)
    );

    useEffect(() => {
        if (fields.length > 0 && !config.latField && !config.lonField) {
            const latGuess = fields.find((f) => /^(lat|latitude|y)$/i.test(f));
            const lonGuess = fields.find((f) => /^(lon|lng|longitude|long|x)$/i.test(f));
            if (latGuess || lonGuess) {
                onConfigChange({
                    ...config,
                    latField: latGuess || config.latField || '',
                    lonField: lonGuess || config.lonField || ''
                });
            }
        }
    }, [fields.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const source = config.source || (isSpatial ? 'geometry' : 'fields');
    const showFields = source === 'fields';

    return (
        <>
            <InspectorLabel>Coordinate Source</InspectorLabel>
            <InspectorSelect
                value={source}
                onChange={(v) => onConfigChange({ ...config, source: v })}
            >
                {isSpatial && <option value="geometry">Feature Geometry</option>}
                <option value="fields">Attribute Fields</option>
            </InspectorSelect>

            {showFields && (
                <div id="wf-coord-fields">
                    <InspectorLabel style={{ marginTop: 8 }}>Source Format</InspectorLabel>
                    <InspectorSelect
                        value={config.fromFormat || 'dd'}
                        onChange={(fromFormat) => onConfigChange({ ...config, fromFormat })}
                    >
                        <option value="dd">Decimal Degrees (DD)</option>
                        <option value="dms">Degrees Minutes Seconds (DMS)</option>
                        <option value="ddm">Degrees Decimal Minutes (DDM)</option>
                    </InspectorSelect>
                    <InspectorLabel style={{ marginTop: 6 }}>Latitude / Y Field</InspectorLabel>
                    <InspectorSelect
                        value={config.latField}
                        onChange={(latField) => onConfigChange({ ...config, latField })}
                    >
                        <option value="">— Select —</option>
                        {fields.map((f) => <option key={f} value={f}>{f}</option>)}
                    </InspectorSelect>
                    <InspectorLabel style={{ marginTop: 6 }}>Longitude / X Field</InspectorLabel>
                    <InspectorSelect
                        value={config.lonField}
                        onChange={(lonField) => onConfigChange({ ...config, lonField })}
                    >
                        <option value="">— Select —</option>
                        {fields.map((f) => <option key={f} value={f}>{f}</option>)}
                    </InspectorSelect>
                </div>
            )}

            <InspectorLabel style={{ marginTop: 8 }}>Convert To</InspectorLabel>
            <InspectorSelect
                value={config.toFormat || 'dms'}
                onChange={(toFormat) => onConfigChange({ ...config, toFormat })}
            >
                <option value="dd">Decimal Degrees (DD)</option>
                <option value="dms">Degrees Minutes Seconds (DMS)</option>
                <option value="ddm">Degrees Decimal Minutes (DDM)</option>
                <option value="utm">UTM</option>
            </InspectorSelect>
            <InspectorLabel style={{ marginTop: 6 }}>Output Field Prefix</InspectorLabel>
            <InspectorInput
                value={config.outputPrefix}
                onChange={(outputPrefix) => onConfigChange({ ...config, outputPrefix })}
                placeholder="Auto (e.g. DMS, UTM)"
            />
            <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 6 }}>
                Adds new attribute fields with the converted coordinates.
                <br />
                Examples: DMS_lat, DMS_lon, UTM_zone, UTM_easting, UTM_northing
            </p>
        </>
    );
}

// 16. Unit Converter
function UnitConvertInspector({ node, config, onConfigChange, engine, getLayers }) {
    const fields = mergeConfigFields(
        getUpstreamFields(engine, node.id, getLayers),
        config.sourceField ? [config.sourceField] : []
    );
    const categories = Object.keys(UNIT_CATEGORIES);
    const currentCat = UNIT_CATEGORIES[config.category] || UNIT_CATEGORIES['Length / Distance'] || {};
    const units = Object.keys(currentCat).filter((k) => k !== '_base');

    const handleCategoryChange = (category) => {
        const cat = UNIT_CATEGORIES[category] || {};
        const newUnits = Object.keys(cat).filter((k) => k !== '_base');
        onConfigChange({
            ...config,
            category,
            fromUnit: newUnits[0] || '',
            toUnit: newUnits[1] || newUnits[0] || ''
        });
    };

    return (
        <>
            <InspectorLabel>Source Field</InspectorLabel>
            <InspectorSelect
                value={config.sourceField}
                onChange={(sourceField) => onConfigChange({ ...config, sourceField })}
            >
                <option value="">— Select field —</option>
                {fields.map((f) => <option key={f} value={f}>{f}</option>)}
            </InspectorSelect>

            <InspectorLabel style={{ marginTop: 8 }}>Unit Category</InspectorLabel>
            <InspectorSelect
                value={config.category || 'Length / Distance'}
                onChange={handleCategoryChange}
            >
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </InspectorSelect>

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                    <InspectorLabel>From</InspectorLabel>
                    <InspectorSelect
                        value={config.fromUnit}
                        onChange={(fromUnit) => onConfigChange({ ...config, fromUnit })}
                    >
                        {units.map((u) => <option key={u} value={u}>{u}</option>)}
                    </InspectorSelect>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4, fontSize: 18, color: 'var(--text-muted)' }}>→</div>
                <div style={{ flex: 1 }}>
                    <InspectorLabel>To</InspectorLabel>
                    <InspectorSelect
                        value={config.toUnit}
                        onChange={(toUnit) => onConfigChange({ ...config, toUnit })}
                    >
                        {units.map((u) => <option key={u} value={u}>{u}</option>)}
                    </InspectorSelect>
                </div>
            </div>

            <InspectorLabel style={{ marginTop: 8 }}>Output Field Name</InspectorLabel>
            <InspectorInput
                value={config.outputField}
                onChange={(outputField) => onConfigChange({ ...config, outputField })}
                placeholder="Leave blank to overwrite source"
            />

            <InspectorLabel style={{ marginTop: 8 }}>Decimal Precision</InspectorLabel>
            <InspectorInput
                type="number"
                value={config.precision ?? 4}
                onChange={(v) => onConfigChange({ ...config, precision: parseInt(v, 10) || 4 })}
                min={0}
                max={15}
                step={1}
            />
        </>
    );
}

// 17. Add Field
function AddFieldInspector({ node, config, onConfigChange, engine, getLayers }) {
    const existing = getUpstreamFields(engine, node.id, getLayers);
    const isAttachment = config.fieldType === 'attachment';

    return (
        <>
            <InspectorLabel>Field Name</InspectorLabel>
            <InspectorInput
                value={config.fieldName}
                onChange={(fieldName) => onConfigChange({ ...config, fieldName })}
                placeholder="new_field"
            />
            {existing.length > 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                    Existing: {existing.join(', ')}
                </p>
            )}

            <InspectorLabel style={{ marginTop: 8 }}>Field Type</InspectorLabel>
            <InspectorSelect
                value={config.fieldType || 'string'}
                onChange={(fieldType) => {
                    const patch = { fieldType };
                    if (fieldType === 'attachment') patch.defaultValue = '';
                    onConfigChange({ ...config, ...patch });
                }}
            >
                <option value="string">Text (string)</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="date">Date</option>
                <option value="attachment">Attach Photo (KML/KMZ export only)</option>
            </InspectorSelect>

            {!isAttachment && (
                <div id="wf-af-default-group" style={{ marginTop: 8 }}>
                    <InspectorLabel>
                        Default Value <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>(optional)</span>
                    </InspectorLabel>
                    <InspectorInput
                        value={config.defaultValue}
                        onChange={(defaultValue) => onConfigChange({ ...config, defaultValue })}
                        placeholder="Leave blank for empty"
                    />
                </div>
            )}

            <div id="wf-af-error" style={{ color: 'var(--error)', fontSize: 11, minHeight: 16, marginTop: 4 }} />
        </>
    );
}

export const TRANSFORM_INSPECTORS = {
    'filter-rows': FilterRowsInspector,
    'rename-fields': RenameFieldsInspector,
    'delete-fields': DeleteFieldsInspector,
    'find-replace': FindReplaceInspector,
    'sort': SortInspector,
    'deduplicate': DeduplicateInspector,
    'add-unique-id': AddUniqueIdInspector,
    'combine-fields': CombineFieldsInspector,
    'split-column': SplitColumnInspector,
    'template-builder': TemplateBuilderInspector,
    'type-convert': TypeConvertInspector,
    'join-lookup': JoinLookupInspector,
    'calculate-field': CalculateFieldInspector,
    'conditional-value': ConditionalValueInspector,
    'coord-convert': CoordConvertInspector,
    'unit-convert': UnitConvertInspector,
    'add-field': AddFieldInspector
};
