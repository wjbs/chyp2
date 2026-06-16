import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { SCALE } from "../../lib/util";
export function EdgeView({ graph, edge }) {
    const edgeData = graph.edgeData(edge);
    function pathFor(v, i, src) {
        const vd = graph.vertexData(v);
        const num = src ? edgeData.s.length : edgeData.t.length;
        const dx = edgeData.value !== 'id' ? 0.4 : 0.0;
        const xShift = src ? -dx : dx;
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
    return (_jsxs("g", { children: [(edgeData.value !== 'id') ?
                _jsxs("g", { children: [_jsx("rect", { x: (edgeData.x - 0.4) * SCALE, y: (edgeData.y - edgeData.boxSize() * 0.5 + 0.1) * SCALE, width: 0.8 * SCALE, height: (edgeData.boxSize() - 0.2) * SCALE, fill: "#ccccff", stroke: "black", "stroke-width": 0.01 * SCALE }), _jsx("text", { x: edgeData.x * SCALE, y: edgeData.y * SCALE, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 0.3 * SCALE, "font-family": "sans-serif", children: edgeData.value })] }) : null, edgeData.s.map((s, i) => _jsx("path", { d: pathFor(s, i, true), fill: "none", stroke: "black", "stroke-width": 0.01 * SCALE }, s)), edgeData.t.map((t, i) => _jsx("path", { d: pathFor(t, i, false), fill: "none", stroke: "black", "stroke-width": 0.01 * SCALE }, t))] }));
}
