/**
 * Filter rule evaluation for smart styling (visual-only, does not hide features).
 */

/**
 * @param {object} props
 * @param {{ field: string, operator: string, value?: string }} rule
 * @returns {boolean}
 */
export function evaluateFilterRule(props, rule) {
    const val = props?.[rule.field];
    const target = rule.value;

    switch (rule.operator) {
        case 'equals': return String(val) === String(target);
        case 'not_equals': return String(val) !== String(target);
        case 'contains': return String(val ?? '').toLowerCase().includes(String(target).toLowerCase());
        case 'not_contains': return !String(val ?? '').toLowerCase().includes(String(target).toLowerCase());
        case 'starts_with': return String(val ?? '').toLowerCase().startsWith(String(target).toLowerCase());
        case 'ends_with': return String(val ?? '').toLowerCase().endsWith(String(target).toLowerCase());
        case 'greater_than': return Number(val) > Number(target);
        case 'less_than': return Number(val) < Number(target);
        case 'gte': return Number(val) >= Number(target);
        case 'lte': return Number(val) <= Number(target);
        case 'is_null': return val == null || val === '';
        case 'is_not_null': return val != null && val !== '';
        case 'in': {
            const list = String(target ?? '').split(',').map((s) => s.trim()).filter(Boolean);
            return list.includes(String(val));
        }
        default: return false;
    }
}

/**
 * @param {object} props
 * @param {{ logic?: string, rules?: object[] }} filter
 * @returns {boolean}
 */
export function evaluateFilterGroup(props, filter) {
    const rules = filter?.rules || [];
    if (!rules.length) return false;
    const logic = filter?.logic || 'AND';
    const results = rules.map((r) => evaluateFilterRule(props, r));
    return logic === 'OR' ? results.some(Boolean) : results.every(Boolean);
}

/**
 * Build MapLibre boolean expression for a single rule (subset of operators).
 * @param {{ field: string, operator: string, value?: string }} rule
 * @returns {unknown[]|null}
 */
export function compileFilterRuleExpression(rule) {
    const get = ['get', rule.field];
    const str = ['to-string', get];
    const num = ['to-number', get, 0];

    switch (rule.operator) {
        case 'equals':
            return ['==', str, String(rule.value ?? '')];
        case 'not_equals':
            return ['!=', str, String(rule.value ?? '')];
        case 'greater_than':
            return ['>', num, Number(rule.value)];
        case 'less_than':
            return ['<', num, Number(rule.value)];
        case 'gte':
            return ['>=', num, Number(rule.value)];
        case 'lte':
            return ['<=', num, Number(rule.value)];
        case 'is_null':
            return ['any', ['==', get, null], ['==', str, '']];
        case 'is_not_null':
            return ['all', ['!=', get, null], ['!=', str, '']];
        default:
            return null;
    }
}

/**
 * @param {{ logic?: string, rules?: object[] }} filter
 * @returns {unknown[]|null}
 */
export function compileFilterGroupExpression(filter) {
    const rules = filter?.rules || [];
    if (!rules.length) return null;
    const exprs = rules.map(compileFilterRuleExpression).filter(Boolean);
    if (!exprs.length) return null;
    if (exprs.length === 1) return exprs[0];
    const logic = filter?.logic || 'AND';
    return logic === 'OR' ? ['any', ...exprs] : ['all', ...exprs];
}

/**
 * Wrap a paint value with filter-rule case overrides (last matching rule wins).
 * @param {string|number|unknown[]} baseValue
 * @param {Array<{ filter: object, style: object, paintKey: string }>} ruleEntries
 * @param {string} paintKey
 * @returns {string|number|unknown[]}
 */
export function applyFilterRuleCases(baseValue, filterRules, paintKey) {
    if (!filterRules?.length) return baseValue;
    const cases = [];
    for (const entry of filterRules) {
        const expr = compileFilterGroupExpression(entry.filter);
        const override = entry.style?.[paintKey];
        if (expr && override != null) {
            cases.push(expr, override);
        }
    }
    if (!cases.length) return baseValue;
    return ['case', ...cases, baseValue];
}
