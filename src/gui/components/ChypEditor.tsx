
import '../index.css';
import { useState, useEffect } from "preact/hooks";

import { CodeView } from "./CodeView";
import { GraphPanels } from "./GraphView";
import Splitpane from "./Splitpane";
import { parser } from "../../lib/parser";
import { ChypReader } from "../../lib/reader";
import { State, GraphPart } from "../../lib/state";
import { defaultSettings, updateSettings, type Chyp2Settings } from '../../lib/util';
import { SettingsView } from './SettingsView';



function retrieveSettings(filename : string) : Chyp2Settings {
    const storedSettingsJSON = localStorage.getItem(`settings_${filename}`);
    return updateSettings(storedSettingsJSON === null ? null : JSON.parse(storedSettingsJSON), 
        defaultSettings);
}

function storeSettings(filename : string, s : Chyp2Settings) : void {
    localStorage.setItem(`settings_${filename}`, JSON.stringify(s));
}

export interface ChypEditorProps {
    filename: string;
    content: string;
    onChange: (content: string) => void;
}

export function ChypEditor({ filename: _filename, content, onChange }: ChypEditorProps) {
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
    const [state, setState] = useState<State>(new State());
    const [currentPart, setCurrentPart] = useState<number>(-1);
    const [settings, setSettings] = useState<Chyp2Settings>(() =>
        retrieveSettings(_filename))

    useEffect(() => {
        storeSettings(_filename, settings)
    }, [settings]);

    (window as any).settings = settings;
    (window as any).setSettings = setSettings;


    const currentGraphPart = (): GraphPart | null => {
        const part = currentPart >= 0 ? state.parts[currentPart] : null;
        if (part instanceof GraphPart) {
            part.layout();
            return part;
        }
        return null;
    };

    const handleChange = (content: string | null, pos: number | null) => {
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
        } else {
            newState = state;
        }

        if (pos !== null) {
            const i = newState.getPartIndexAt(pos);
            setCurrentPart(i);
        }
    }

    useEffect(() => {
        handleChange(content, 0);
    }, [content]);

    return (
        <Splitpane splitRatio={0.6} orientation="vertical" showSecondPanel={true}>
            <GraphPanels lhs={currentGraphPart()?.lhs ?? null} rhs={currentGraphPart()?.rhs ?? null}
                s={settings} />
            <Splitpane splitRatio={0.7} orientation="horizontal" showSecondPanel={true}>
                <CodeView state={state}
                    currentPart={currentPart}
                    initialContent={content}
                    onChange={handleChange}
                />
                <SettingsView 
                    s={settings}
                    update={setSettings}
                    />
            </Splitpane>
        </Splitpane>
    )
}
