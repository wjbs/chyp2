import type { Graph } from "../lib/graph";
interface EdgeViewProps {
    graph: Graph;
    edge: number;
}
export declare function EdgeView({ graph, edge }: EdgeViewProps): import("preact").JSX.Element;
export {};
