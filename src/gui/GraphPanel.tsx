import { useRef, useState } from "preact/hooks";
import { gen, Graph } from "../lib/graph";
import { convexLayout } from "../lib/layout";

interface GraphPanelProps {
}

export function GraphPanel({ }: GraphPanelProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [scale, setScale] = useState(100.0);
    function toScreen(p: number[]): number[] {
        const origin = [svgRef.current!.clientWidth / 2, svgRef.current!.clientHeight / 2];
        return [p[0] * scale + origin[0], p[1] * scale + origin[1]];
    }

    const g = gen("f", 2, 1);
    convexLayout(g);
    return (
        <div className="graph-panel">
            <svg ref={svgRef} className="graph-svg">

            </svg>
        </div>
    );
}