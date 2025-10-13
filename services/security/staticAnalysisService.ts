/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface SecurityIssue {
    line: number;
    type: string;
    description: string;
    severity: 'High' | 'Medium' | 'Low';
}

const rules = [
    {
        name: 'Hardcoded Secret',
        regex: /(key|secret|token|password)['"]?\s*[:=]\s*['"]([a-zA-Z0-9-_.]{16,})['"]/gi,
        description: 'A hardcoded secret or API key was found. These should be stored in environment variables.',
        severity: 'High' as const,
    },
    {
        name: 'dangerouslySetInnerHTML',
        regex: /dangerouslySetInnerHTML/g,
        description: 'Use of dangerouslySetInnerHTML can open your application to XSS attacks. Ensure the source is sanitized.',
        severity: 'Medium' as const,
    },
    {
        name: 'eval() usage',
        regex: /eval\(/g,
        description: 'The use of eval() is a major security risk as it can execute arbitrary code.',
        severity: 'High' as const,
    },
    {
        name: 'Insecure URL',
        regex: /http:\/\//g,
        description: 'Found an insecure "http://" URL. Use "https://" for all external resources.',
        severity: 'Low' as const,
    }
];

export const runStaticScan = (code: string): SecurityIssue[] => {
    const issues: SecurityIssue[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
        rules.forEach(rule => {
            if (rule.regex.test(line)) {
                issues.push({
                    line: index + 1,
                    type: rule.name,
                    description: rule.description,
                    severity: rule.severity,
                });
            }
        });
    });

    return issues;
};
