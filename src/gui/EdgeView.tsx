import type { Graph } from "../lib/graph";
import { SCALE } from "../lib/util";

interface EdgeViewProps {
    graph: Graph;
    edge: number;
}

export function EdgeView({ graph, edge }: EdgeViewProps) {
    const edgeData = graph.edgeData(edge);

    function pathFor(v: number, i: number, src: boolean): string {
        const vd = graph.vertexData(v);
        const num = src ? edgeData.s.length : edgeData.t.length;
        const xShift = src ? -0.5 : 0.5;
        const yShift = num <= 1 ? 0 : (i / (num - 1)) - 0.5;
        const p1x = vd.x * SCALE;
        const p1y = vd.y * SCALE;
        const p2x = (edgeData.x + xShift) * SCALE;
        const p2y = (edgeData.y + yShift) * SCALE;
        const cp1x = 0.6 * p1x + 0.4 * p2x;
        const cp1y = p1y;
        const cp2x = 0.4 * p1x + 0.6 * p2x;
        const cp2y = p2y;
        return `M ${p1x} ${p1y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2x} ${p2y}`;
    }

    return (<g>
        <rect
            x={(edgeData.x - 0.5) * SCALE}
            y={(edgeData.y - edgeData.boxSize() * 0.5) * SCALE}
            width={1.0 * SCALE}
            height={edgeData.boxSize() * SCALE}
            fill="#ccccff"
            stroke="black"
            stroke-width={0.01 * SCALE} />
        <text
            x={edgeData.x * SCALE}
            y={edgeData.y * SCALE}
            text-anchor="middle"
            dominant-baseline="central"
            font-size={0.3 * SCALE}
            font-family="sans-serif">
            {edgeData.value}
        </text>
        {edgeData.s.map((s, i) =>
            <path key={s} d={pathFor(s, i, true)}
                fill="none"
                stroke="black"
                stroke-width={0.01 * SCALE} />
        )}
        {edgeData.t.map((t, i) =>
            <path key={t} d={pathFor(t, i, false)}
                fill="none"
                stroke="black"
                stroke-width={0.01 * SCALE} />
        )}
    </g>);
}