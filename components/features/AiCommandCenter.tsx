import React, { useState, useCallback } from 'react';
import { Type, FunctionDeclaration } from "@google/genai";
import { logError } from '../../services/telemetryService.ts';
import { getInferenceFunction, CommandResponse } from '../../services/aiService.ts';
import { FEATURE_TAXONOMY } from '../../services/taxonomyService.ts';
import { useGlobalState } from '../../contexts/GlobalStateContext.tsx';
import { CommandLineIcon } from '../icons.tsx';
import { LoadingSpinner } from '../shared/index.tsx';
import { ALL_FEATURE_IDS } from '../../constants.tsx';
import { executeWorkspaceAction, ACTION_REGISTRY } from '../../services/workspaceConnectorService.ts';

const baseFunctionDeclarations: FunctionDeclaration[] = [
    {
        name: 'navigateTo',
        description: 'Navigates to a specific feature page.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                featureId: { 
                    type: Type.STRING, 
                    description: 'The ID of the feature to navigate to.',
                    enum: ALL_FEATURE_IDS
                },
            },
            required: ['featureId'],
        },
    },
    {
        name: 'runFeatureWithInput',
        description: 'Navigates to a feature and passes initial data to it.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                 featureId: { 
                    type: Type.STRING, 
                    description: 'The ID of the feature to run.',
                    enum: ALL_FEATURE_IDS
                },
                props: {
                    type: Type.OBJECT,
                    description: 'An object containing the initial properties for the feature, based on its required inputs.',
                    properties: {
                        initialCode: { type: Type.STRING },
                        initialPrompt: { type: Type.STRING },
                        beforeCode: { type: Type.STRING },
                        afterCode: { type: Type.STRING },
                        logInput: { type: Type.STRING },
                        diff: { type: Type.STRING },
                        codeInput: { type: Type.STRING },
                        jsonInput: { type: Type.STRING },
                    }
                }
            },
            required: ['featureId', 'props']
        }
    }
];

// Dynamically add the workspace action
const functionDeclarations: FunctionDeclaration[] = [
    ...baseFunctionDeclarations,
    {
        name: 'runWorkspaceAction',
        description: 'Executes a defined action on a connected workspace service like Jira, Slack, or GitHub.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                 actionId: {
                    type: Type.STRING,
                    description: 'The unique identifier for the action to execute.',
                    enum: [ ...ACTION_REGISTRY.keys() ]
                },
                params: {
                    type: Type.OBJECT,
                    description: 'An object containing the parameters for the action, matching its required inputs.'
                }
            },
            required: ['actionId', 'params']
        }
    }
]

const knowledgeBase = FEATURE_TAXONOMY.map(f => `- ${f.name} (${f.id}): ${f.description} Inputs: ${f.inputs}`).join('\n');

const ExamplePromptButton: React.FC<{ text: string, onClick: (text: string) => void }> = ({ text, onClick }) => (
    <button
        onClick={() => onClick(text)}
        className="px-3 py-1.5 bg-surface border border-border rounded-full text-xs hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
    >
        {text}
    </button>
)

export const AiCommandCenter: React.FC = () => {
    const { dispatch } = useGlobalState();
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [lastResponse, setLastResponse] = useState('');

    const handleCommand = useCallback(async () => {
        if (!prompt.trim()) return;

        setIsLoading(true);
        setLastResponse('');

        try {
            const response: CommandResponse = await getInferenceFunction(prompt, functionDeclarations, knowledgeBase);
            
            if (response.functionCalls && response.functionCalls.length > 0) {
                const call = response.functionCalls[0];
                const { name, args } = call;

                setLastResponse(`Understood! Executing command: ${name}`);

                switch (name) {
                    case 'navigateTo':
                        dispatch({ type: 'SET_VIEW', payload: { view: args.featureId }});
                        break;
                    case 'runFeatureWithInput':
                         dispatch({ type: 'SET_VIEW', payload: { view: args.featureId, props: args.props } });
                        break;
                    case 'runWorkspaceAction':
                        try {
                            const result = await executeWorkspaceAction(args.actionId, args.params);
                            setLastResponse(`Action '${args.actionId}' executed successfully.\n\nResult: \`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``);
                        } catch (e) {
                            setLastResponse(`Action failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
                        }
                        break;
                    default:
                        setLastResponse(`Unknown command: ${name}`);
                }
                 setPrompt('');
            } else {
                 setLastResponse(response.text);
            }

        } catch (err) {
            logError(err as Error, { prompt });
            setLastResponse(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [prompt, dispatch]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleCommand();
        }
    };
    
    const handleExampleClick = (text: string) => {
        setPrompt(text);
    }

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight flex items-center justify-center">
                    <CommandLineIcon />
                    <span className="ml-3">AI Command Center</span>
                </h1>
                <p className="mt-2 text-lg text-text-secondary">What would you like to do?</p>
            </header>
            
            <div className="flex-grow flex flex-col justify-end max-w-3xl w-full mx-auto">
                {lastResponse && (
                    <div className="mb-4 p-4 bg-surface rounded-lg text-text-primary border border-border">
                        <p><strong>AI:</strong> {lastResponse}</p>
                    </div>
                )}
                 <div className="relative">
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        placeholder='Try "explain this code: const a = 1;" or "open the theme designer"'
                        className="w-full p-4 pr-28 rounded-lg bg-surface border border-border focus:ring-2 focus:ring-primary focus:outline-none resize-none shadow-sm"
                        rows={2}
                    />
                    <button
                        onClick={handleCommand}
                        disabled={isLoading}
                        className="btn-primary absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2"
                    >
                       {isLoading ? <LoadingSpinner/> : 'Send'}
                    </button>
                </div>
                 <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                    <ExamplePromptButton text="Open Theme Designer" onClick={handleExampleClick} />
                    <ExamplePromptButton text="Generate a commit for a bug fix" onClick={handleExampleClick} />
                    <ExamplePromptButton text="Create a regex for email validation" onClick={handleExampleClick} />
                </div>
                 <p className="text-xs text-text-secondary text-center mt-2">Press Enter to send, Shift+Enter for new line.</p>
            </div>
        </div>
    );
};