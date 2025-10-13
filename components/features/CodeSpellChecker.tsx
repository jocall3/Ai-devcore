import React, { useState, useMemo } from 'react';
import { BeakerIcon } from '../icons.tsx';

const commonTypos = [
    'funtion', 'functoin', 'funciton', 'contructor', 'cosntructor',
    'consle', 'conosle', 'cosnole', 'varable', 'varaible', 'vairable',
    'docment', 'docuemnt', 'docmunet', 'componnet', 'componenet', 'compnent',
    'retunr', 'retrun', 'asnyc', 'asycn', 'awai', 'awiat', 'promse',
    'resolv', 'rejct', 'catach', 'thne', 'lenght', 'lengt', 'prperty',
    'undefinded', 'nul', 'booleon', 'numbar', 'srtring', 'arrya', 'objcet',
    'elemnt', 'attriubte', 'eveent', 'listner', 'handeler', 'clieck',
    'submitt', 'resposne', 'requset', 'stauts', 'eror', 'sucess',
    'implemnt', 'overide', 'extned', 'pbulic', 'prvate', 'procted',
    'statci', 'abstact', 'interace', 'enmu', 'moduel', 'packge',
    'importt', 'exprot', 'defualt', 'namspace', 'tyep', 'clsas',
    'whiel', 'swich', 'cse', 'brek', 'contiune', 'thrwo', 'finnaly'
];

const typoRegex = new RegExp(`\\b(${commonTypos.join('|')})\\b`, 'gi');

const HighlightedText: React.FC<{ text: string }> = React.memo(({ text }) => {
    const parts = useMemo(() => {
        return text.split(typoRegex).map((part, i) => {
            if (typoRegex.test(part)) {
                return <span key={i} className="underline decoration-red-500 decoration-wavy" title={`Possible typo`}>{part}</span>;
            }
            return part;
        });
    }, [text]);

    return <>{parts}</>;
});

export const CodeSpellChecker: React.FC = () => {
    const [code, setCode] = useState('funtion myFunction() {\n  consle.log("Hello World");\n  const myVarable = docment.getElementById("root");\n  // This is a React componnet\n}');

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl flex items-center">
                    <BeakerIcon />
                    <span className="ml-3">Code Spell Checker</span>
                </h1>
                <p className="text-text-secondary mt-1">A simple tool that finds and highlights common typos in code.</p>
            </header>
            <div className="relative flex-grow font-mono text-sm bg-surface border border-border rounded-lg p-4 overflow-auto">
                <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="absolute inset-0 w-full h-full p-4 bg-transparent text-transparent caret-primary resize-none z-10"
                    spellCheck="false"
                />
                <pre className="absolute inset-0 w-full h-full p-4 pointer-events-none whitespace-pre-wrap" aria-hidden="true">
                    <HighlightedText text={code} />
                </pre>
            </div>
             <p className="text-xs text-text-secondary mt-2 text-center">This checker uses a predefined list of common typos and does not use AI.</p>
        </div>
    );
};