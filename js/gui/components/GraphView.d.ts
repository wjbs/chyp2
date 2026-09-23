import "../index.css";
import { Graph } from "../../lib/graph";
import { type Chyp2Settings } from "../../lib/util";
interface GraphViewProps {
    s: Chyp2Settings;
    uuid: string;
    graph: Graph | null;
}
export declare function GraphView({ s, uuid, graph }: GraphViewProps): import("preact").JSX.Element;
interface GraphPanelsProps {
    s: Chyp2Settings;
    lhs: Graph | null;
    rhs: Graph | null;
}
export declare function GraphPanels({ s, lhs, rhs }: GraphPanelsProps): import("preact").JSX.Element;
export {};
