import { Editor } from "./Editor";
import { GraphView } from "./GraphView";
import Splitpane from "./Splitpane";
import { parseDocument } from "../lib/parser";

export function App() {
  const initialContent = `# Chyp example
gen m : 2 -> 1
gen c : 1 -> 2
gen u : 0 -> 1
gen v : 1 -> 0

let m3 = m * id ; m
def c3 = c ; c * id

rule m_assoc : m * (m * id) = (m * id) * m
`;
  const parsed = parseDocument(initialContent);
  console.log(parsed);
  return (
    <Splitpane splitRatio={0.6} orientation="vertical" showSecondPanel={true}>
      <GraphView />
      <Editor initialContent={initialContent} onChange={(_content) => true} />
    </Splitpane>
  )
}
