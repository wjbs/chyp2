import type { Graph } from "../../lib/graph";
interface EdgeViewProps {
    uuid: String;
    graph: Graph;
    edge: number;
}
export declare function EdgeView({ uuid, graph, edge }: EdgeViewProps): import("preact").JSX.Element;
export {};
