import type { Graph } from "../../lib/graph";
interface VertexViewProps {
    uuid: string;
    graph: Graph;
    vertex: number;
}
export declare function VertexView({ uuid, graph, vertex }: VertexViewProps): import("preact").JSX.Element;
export {};
