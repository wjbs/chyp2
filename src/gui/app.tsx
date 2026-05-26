import { Editor } from "./Editor";
import { GraphPanel } from "./GraphPanel";
import Splitpane from "./Splitpane";

export function App() {
  return (
    <Splitpane splitRatio={0.6} orientation="vertical" showSecondPanel={true}>
      <GraphPanel />
      <Editor initialContent={"gen f : 1 -> 2\ngen g : 2 -> 1\ngen h : 1 -> 1"} onChange={(_content) => true} />
    </Splitpane>
  )
}
