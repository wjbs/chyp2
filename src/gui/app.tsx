import { Editor } from "./Editor";
import Splitpane from "./Splitpane";

export function App() {
  return (
    <Splitpane splitRatio={0.6} orientation="vertical" showSecondPanel={true}>
      <div className="graph-panel">Panel 1</div>
      <Editor initialContent="Panel 2: Code Editor" onChange={(_content) => true} />
    </Splitpane>
  )
}
