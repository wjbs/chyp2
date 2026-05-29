import { useRef } from "preact/hooks";
import { Graph } from "../lib/graph";
import { convexLayout } from "../lib/layout";
import { EdgeView } from "./EdgeView";
import { SCALE } from "../lib/util";

interface GraphViewProps {
}

export function GraphView({ }: GraphViewProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    // const [scale, setScale] = useState(100.0);
    // function toScreen(p: number[]): number[] {
    //     const origin = [svgRef.current!.clientWidth / 2, svgRef.current!.clientHeight / 2];
    //     return [p[0] * scale + origin[0], p[1] * scale + origin[1]];
    // }
    const g = Graph.gen("f", 2, 1);
    convexLayout(g);
    const bbox = g.boundingBox();
    const viewBox = `${bbox[0] * SCALE} ${bbox[2] * SCALE} ${(bbox[1] - bbox[0]) * SCALE} ${(bbox[3] - bbox[2]) * SCALE}`;
    return (
        <div className="graph-panel">
            <svg ref={svgRef} className="graph-svg" viewBox={viewBox}>
                {[...g.edges()].map(e => <EdgeView key={e} graph={g} edge={e} />)}
            </svg>
        </div>
    );
}