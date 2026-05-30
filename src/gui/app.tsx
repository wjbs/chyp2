import { useState, useEffect } from "preact/hooks";

import { Editor } from "./Editor";
import { GraphView } from "./GraphView";
import Splitpane from "./Splitpane";
import { parser } from "../lib/parser";
import { ChypReader, logTree } from "../lib/reader";
import { State, Part } from "../lib/state";

export function App() {
  const initialContent = `# Chyp example
gen m : 2 -> 1
gen c : 1 -> 2
gen u : 0 -> 1
gen v : 1 -> 0

let m3 = m * id ; m
let m_sw = sw[1, 0] ; m
let nest = (u ; v) * (u ; v)
def c3 = c ; c * id

rule m_assoc : m * id ; m = id * m ; m
`;
  const [state, setState] = useState<State>(new State());
  const [currentPart, setCurrentPart] = useState<number>(-1);

  const onChange = (content: string | null, pos: number | null) => {
    let newState = new State();
    if (content !== null) {
      const reader = new ChypReader(newState);
      const parseTree = parser.parse(content);
      logTree(parseTree);
      reader.readSource(content, parseTree);
      setState(newState);
    } else {
      newState = state;
    }

    if (pos !== null) {
      const i = newState.getPartIndexAt(pos);
      // console.log(`Selected part for pos ${pos}:`, i);
      setCurrentPart(i);
    }
  }

  useEffect(() => {
    onChange(initialContent, 0);
  }, []);

  // const [highlightPart, setHighlightPart] = useState<Part | null>(null);

  return (
    <Splitpane splitRatio={0.6} orientation="vertical" showSecondPanel={true}>
      <GraphView />
      <Editor state={state}
        currentPart={currentPart}
        initialContent={initialContent}
        onChange={onChange}
      />
    </Splitpane>
  )
}
