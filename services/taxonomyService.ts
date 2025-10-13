export interface FeatureTaxonomy {
    id: string;
    name: string;
    description: string;
    category: string;
    inputs: string;
}

export const FEATURE_TAXONOMY: FeatureTaxonomy[] = [
    {
        id: "ai-command-center",
        name: "AI Command Center",
        description: "The main entry point. Use natural language to navigate and control the entire toolkit. Can call other tools.",
        category: "Core",
        inputs: "A natural language prompt describing what the user wants to do. Examples: 'explain this code: ...', 'design a theme with space vibes'."
    },
    {
        id: "workspace-connector-hub",
        name: "Workspace Connector Hub",
        description: "A central hub to execute actions on connected third-party services like Jira, Slack, GitHub, Vercel, and more. This is the primary tool for inter-service orchestration. The AI should use the 'runWorkspaceAction' function to interact with it.",
        category: "Workflow",
        inputs: "A natural language command describing a sequence of actions. Examples: 'create a jira ticket and post to slack', 'deploy the `dev` branch to vercel', 'summarize the last 5 commits and create a Confluence page'."
    },
    {
        id: "ai-code-explainer",
        name: "AI Code Explainer",
        description: "Accepts a code snippet and provides a detailed, structured analysis including summary, line-by-line breakdown, complexity, suggestions, and a visual flowchart.",
        category: "AI Tools",
        inputs: "A string containing a code snippet."
    },
    {
        id: "theme-designer",
        name: "AI Theme Designer",
        description: "Generates a complete UI color theme, including a semantic palette and accessibility scores, from a simple text description or an uploaded image.",
        category: "AI Tools",
        inputs: "A string describing the desired aesthetic (e.g., 'a calm, minimalist theme for a blog') or an image file."
    },
    {
        id: "regex-sandbox",
        name: "RegEx Sandbox",
        description: "Generates a regular expression from a natural language description. Also allows testing expressions against a string.",
        category: "Testing",
        inputs: "A string describing the pattern to match. Example: 'find all email addresses'."
    },
    {
        id: "ai-pull-request-assistant",
        name: "AI Pull Request Assistant",
        description: "Takes 'before' and 'after' code snippets, calculates the diff, generates a structured pull request summary (title, description, changes), and populates a full PR template.",
        category: "AI Tools",
        inputs: "Two strings: 'beforeCode' and 'afterCode'."
    },
     {
        id: "visual-git-tree",
        name: "AI Git Log Analyzer",
        description: "Intelligently parses a raw 'git log' output to create a categorized and well-formatted changelog, separating new features from bug fixes.",
        category: "Git",
        inputs: "A string containing the raw output of a 'git log' command."
    },
    {
        id: "cron-job-builder",
        name: "AI Cron Job Builder",
        description: "Generates a valid cron expression from a natural language description of a schedule.",
        category: "Deployment",
        inputs: "A string describing a schedule. Example: 'every weekday at 5pm'."
    },
    {
        id: "ai-code-migrator",
        name: "AI Code Migrator",
        description: "Translate code between languages & frameworks.",
        category: "AI Tools",
        inputs: "A string of code to convert, a string for the source language, and a string for the target language. e.g. 'migrate this SASS to CSS: ...'"
    },
    {
        id: "ai-commit-generator",
        name: "AI Commit Message Generator",
        description: "Generates a conventional commit message from a git diff.",
        category: "AI Tools",
        inputs: "A string containing a git diff."
    },
    {
        id: "worker-thread-debugger",
        name: "AI Concurrency Analyzer",
        description: "Analyzes JavaScript code for potential Web Worker concurrency issues like race conditions.",
        category: "Testing",
        inputs: "A string of JavaScript code to analyze for concurrency issues."
    },
    {
        id: "xbrl-converter",
        name: "XBRL Converter",
        description: "Converts a JSON object into a simplified XBRL-like XML format.",
        category: "Data",
        inputs: "A string containing valid JSON."
    },
    {
        id: "api-mock-generator",
        name: "API Mock Server",
        description: "Generates mock API data from a description and serves it locally using a service worker.",
        category: "Local Dev",
        inputs: "A text description of a data schema (e.g., 'a user with id, name, and email')."
    },
    {
        id: "env-manager",
        name: ".env Manager",
        description: "A graphical interface for creating and managing .env files.",
        category: "Local Dev",
        inputs: "Key-value pairs for environment variables."
    },
    {
        id: "performance-profiler",
        name: "AI Performance Profiler",
        description: "Analyze runtime performance traces and bundle stats to get AI-powered optimization advice.",
        category: "Performance & Auditing",
        inputs: "Runtime performance data or pasted bundle statistics JSON."
    },
    {
        id: "a11y-auditor",
        name: "Accessibility Auditor",
        description: "Audit a live URL for accessibility issues and get AI-powered suggestions for fixes.",
        category: "Performance & Auditing",
        inputs: "A URL to a website or web application."
    },
    {
        id: "ci-cd-generator",
        name: "AI CI/CD Pipeline Architect",
        description: "Generate CI/CD configuration files (e.g., GitHub Actions YAML) from a natural language description.",
        category: "Deployment & CI/CD",
        inputs: "A text description of deployment stages (e.g., 'install, test, build, deploy')."
    },
    {
        id: "deployment-preview",
        name: "Static Deployment Previewer",
        description: "See a live preview of files generated by the AI Feature Builder as if they were statically deployed.",
        category: "Deployment & CI/CD",
        inputs: "Files stored in the app's local database from the AI Feature Builder."
    },
    {
        id: "security-scanner",
        name: "AI Security Scanner",
        description: "Perform static analysis on code snippets to find common vulnerabilities and get AI-driven mitigation advice.",
        category: "Security",
        inputs: "A string containing a code snippet."
    },
    {
        id: "gmail-addon-simulator",
        name: "Gmail Add-on Simulator",
        description: "A simulation of how this app could use contextual Gmail Add-on scopes to read the current email and compose replies with AI assistance.",
        category: "Productivity",
        inputs: "A mock email context. No user input required to launch the simulation."
    },
    {
        id: "iam-policy-visualizer",
        name: "GCP IAM Policy Visualizer",
        description: "Visually test what a user can and cannot do across a set of Google Cloud resources.",
        category: "Cloud",
        inputs: "A list of full GCP resource names and a list of permission strings to test."
    }
];