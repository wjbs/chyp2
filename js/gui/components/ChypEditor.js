import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import '../index.css';
import { useState, useEffect } from "preact/hooks";
import { CodeView } from "./CodeView";
import { GraphPanels } from "./GraphView";
import Splitpane from "./Splitpane";
import { parser } from "../../lib/parser";
import { ChypReader } from "../../lib/reader";
import { State, GraphPart } from "../../lib/state";
import { defaultSettings, updateSettings } from '../../lib/util';
import { SettingsView } from './SettingsView';
function retrieveSettings(filename) {
    const storedSettingsJSON = localStorage.getItem(`settings_${filename}`);
    return updateSettings(storedSettingsJSON === null ? null : JSON.parse(storedSettingsJSON), defaultSettings);
}
function storeSettings(filename, s) {
    localStorage.setItem(`settings_${filename}`, JSON.stringify(s));
}
export function ChypEditor({ filename: _filename, content, onChange }) {
    //     const initialContent = `# Chyp example
    // gen m : 2 -> 1
    // gen c : 1 -> 2
    // gen u : 0 -> 1
    // gen v : 1 -> 0
    // let m3 = m * id ; m
    // let m_sw = sw[1, 0] ; m
    // let nest = (u ; v) * (u ; v)
    // def c3 = c ; c * id
    // rule m_assoc : m * id ; m = id * m ; m
    // rewrite m_assoc3 : m * id * id ; m * id ; m
    //   = id * m * id ; m * id ; m by m_assoc
    //   = id * m * id ; id * m ; m by m_assoc
    //   = id * id * m ; id * m ; m by m_assoc
    // show m3
    // show m_assoc3
    // `;
    const [state, setState] = useState(new State());
    const [currentPart, setCurrentPart] = useState(-1);
    const [settings, setSettings] = useState(() => retrieveSettings(_filename));
    const [currentLHS, setCurrentLHS] = useState(null);
    const [currentRHS, setCurrentRHS] = useState(null);
    const updateGraph = (forceRelayout = false) => {
        const part = currentPart >= 0 ? state.parts[currentPart] : null;
        if (part instanceof GraphPart) {
            part.layout(settings, forceRelayout);
            setCurrentLHS((part.lhs ?? null)?.copy() ?? null);
            setCurrentRHS((part.rhs ?? null)?.copy() ?? null);
        }
    };
    useEffect(() => {
        console.log("settings");
        storeSettings(_filename, settings);
        updateGraph(true);
    }, [settings]);
    // (window as any).settings = settings;
    // (window as any).setSettings = setSettings;
    useEffect(() => {
        console.log("currentPart");
        updateGraph();
    }, [currentPart]);
    const handleChange = (content, pos) => {
        let newState = new State();
        if (content !== null) {
            const reader = new ChypReader(newState);
            const parseTree = parser.parse(content);
            // logTree(parseTree);
            reader.readSource(content, parseTree);
            // TODO: should do this asynchronously
            newState.evalAll();
            newState.logErrors(content);
            setState(newState);
            onChange(content);
        }
        else {
            newState = state;
        }
        if (pos !== null) {
            const i = newState.getPartIndexAt(pos);
            setCurrentPart(i);
        }
    };
    useEffect(() => {
        handleChange(content, 0);
    }, [content]);
    return (_jsxs(Splitpane, { splitRatio: 0.6, orientation: "vertical", showSecondPanel: true, children: [_jsx(GraphPanels, { lhs: currentLHS, rhs: currentRHS, s: settings }), _jsxs(Splitpane, { splitRatio: 0.7, orientation: "horizontal", showSecondPanel: true, children: [_jsx(CodeView, { state: state, currentPart: currentPart, initialContent: content, onChange: handleChange }), _jsx(SettingsView, { s: settings, update: setSettings })] })] }));
}
