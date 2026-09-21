import "../index.css";
import { Graph } from "../../lib/graph";
interface GraphViewProps {
    uuid: string;
    graph: Graph | null;
}
export declare function GraphView({ uuid, graph }: GraphViewProps): import("preact").JSX.Element;
interface GraphPanelsProps {
    lhs: Graph | null;
    rhs: Graph | null;
}
export declare function GraphPanels({ lhs, rhs }: GraphPanelsProps): import("preact").JSX.Element;
export {};
