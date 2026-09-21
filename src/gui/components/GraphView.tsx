import "../index.css";
import { useRef } from "preact/hooks";
import { Graph } from "../../lib/graph";
import { EdgeView } from "./EdgeView";
import { VertexView } from "./VertexView";
import { SCALE } from "../../lib/util";
import { convexLayout } from "../../lib/layout";
import { layerDecomp } from "../../lib/term";

interface GraphViewProps {
    uuid: string;
    graph: Graph | null;
}

export function GraphView({ uuid, graph }: GraphViewProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    if (!graph) {
        return <div className="graph-panel" />;
    }
    if ((window as any).debug_show_graph) {
        console.log("graph", layerDecomp(graph).map(es => es.map(e => `${e} : ${graph.edgeData(e).value}`).toString()));
    }
    convexLayout(graph, true, (window as any).NUM_ITERATIONS ?? 10);
    const bbox = graph.boundingBox();
    const viewBox = `${bbox[0] * SCALE} ${bbox[2] * SCALE} ${(bbox[1] - bbox[0]) * SCALE} ${(bbox[3] - bbox[2]) * SCALE}`;
    return (
        <div className="graph-panel">
            <svg ref={svgRef} className="graph-svg" viewBox={viewBox}>
                {[...graph.edges()].map(e => <EdgeView key={e} uuid={uuid} graph={graph} edge={e} />)}
                {[...graph.vertices()].map(v => <VertexView key={v} uuid={uuid} graph={graph} vertex={v} />)}
            </svg>
        </div>
    );
}

interface GraphPanelsProps {
    lhs: Graph | null;
    rhs: Graph | null;
}

export function GraphPanels({ lhs, rhs }: GraphPanelsProps) {
    if (rhs === null) {
        return (
            <div style={{ display: 'flex', width: '100%', height: '100%', justifyContent: 'center' }}>
                <GraphView graph={lhs} uuid="lhs" />
            </div>
        );
    }
    return (
        <div style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%' }}>
            <div style={{ flex: 1, borderRight: '1px solid #ccc' }}>
                <GraphView graph={lhs} uuid="lhs" />
            </div>
            <div style={{ flex: 1 }}>
                <GraphView graph={rhs} uuid="rhs" />
            </div>
        </div>
    );
}