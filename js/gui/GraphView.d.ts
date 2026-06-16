import { Graph } from "../lib/graph";
interface GraphViewProps {
    graph: Graph | null;
}
export declare function GraphView({ graph }: GraphViewProps): import("preact").JSX.Element;
interface GraphPanelsProps {
    lhs: Graph | null;
    rhs: Graph | null;
}
export declare function GraphPanels({ lhs, rhs }: GraphPanelsProps): import("preact").JSX.Element;
export {};
