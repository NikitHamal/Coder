// linter.js

export function lintJsCode(code) {
    const lines = code.split('\n');
    const problems = [];
    const openBrackets = [];
    lines.forEach((line, idx) => {
        const trimmed = line.trim();
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('//')) return;
        // Check for missing semicolon (simple heuristic)
        if (/^[^\{\}\s][^;\{\}]$/.test(trimmed) && !trimmed.endsWith(';')) {
            problems.push({
                line: idx + 1,
                message: 'Missing semicolon',
                type: 'warning'
            });
        }
        // Track open/close brackets for basic syntax
        for (let c of trimmed) {
            if (c === '{') openBrackets.push(idx + 1);
            if (c === '}') openBrackets.pop();
        }
    });
    if (openBrackets.length > 0) {
        problems.push({
            line: openBrackets[openBrackets.length - 1],
            message: 'Unclosed { bracket',
            type: 'error'
        });
    }
    return problems;
} 