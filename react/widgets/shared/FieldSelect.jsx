export function FieldSelect({
    label = 'Field',
    value,
    onChange,
    fields = [],
    placeholder = '- select field -'
}) {
    return (
        <select value={value} onChange={(e) => onChange?.(e.target.value)}>
            <option value="">{placeholder}</option>
            {fields.map((field) => (
                <option key={field} value={field}>{field}</option>
            ))}
        </select>
    );
}
