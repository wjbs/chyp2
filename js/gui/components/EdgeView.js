import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { isNontrivialValue } from "../../lib/graph";
import { SCALE, curveBetween, vertexyShift } from "../../lib/util";
export function EdgeView({ uuid, graph, edge }) {
    const edgeData = graph.edgeData(edge);
    // function pathFor(v: number, i: number, src: boolean): string {
    //     const vd = graph.vertexData(v);
    //     const num = src ? edgeData.s.length : edgeData.t.length;
    //     const dx = edgeData.width * 0.4;
    //     const xShift = src ? -dx : dx;
    //     const yShift = num <= 1 ? 0 : (i / (num - 1)) - 0.5;
    //     const p1x = vd.x * SCALE;
    //     const p1y = vd.y * SCALE;
    //     const p2x = (edgeData.x + xShift) * SCALE;
    //     const p2y = (edgeData.y + yShift) * SCALE;
    //     return curveBetween(p1x, p1y, p2x, p2y);
    // }
    return (_jsxs("g", { id: `e${edge}${uuid}`, children: [(edgeData.value !== 'id') ?
                _jsxs("g", { children: [_jsx("rect", { x: (edgeData.x - 0.4 * edgeData.width) * SCALE, y: (edgeData.y - edgeData.height * 0.4) * SCALE, width: 0.8 * edgeData.width * SCALE, height: 0.8 * edgeData.height * SCALE, fill: "#ccccff", stroke: "black", "stroke-width": 0.01 * SCALE }), _jsx("text", { x: edgeData.x * SCALE, y: edgeData.y * SCALE, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 0.3 * SCALE, "font-family": "sans-serif", children: edgeData.value })] }) : null, (edgeData.value !== 'id') ? null :
                edgeData.s.map(function (svi, i) {
                    const tvi = edgeData.t[i];
                    const sv = graph.vertexData(svi);
                    const tv = graph.vertexData(tvi);
                    const svIn = [...sv.inEdges.values()].at(0) ?? null;
                    const tvOut = [...tv.outEdges.values()].at(0) ?? null;
                    let [sx, sy] = [sv.x, sv.y];
                    let [tx, ty] = [tv.x, tv.y];
                    if (svIn !== null) {
                        const ed = graph.edgeData(svIn);
                        if (ed.value !== 'id') {
                            sx = ed.x + ed.width * 0.4;
                            sy = ed.y + vertexyShift(svi, ed.t);
                        }
                    }
                    if (tvOut !== null) {
                        const ed = graph.edgeData(tvOut);
                        if (ed.value !== 'id') {
                            tx = ed.x - ed.width * 0.4;
                            ty = ed.y + vertexyShift(tvi, ed.s);
                        }
                    }
                    const val = isNontrivialValue(sv.value)
                        ?? (window.debug_random_sizes ? ["1", "m", "n", "m * n"][svi % 4] : "");
                    return _jsxs("g", { id: `id${edge}{uuid}`, children: [_jsx("path", { d: curveBetween(sx * SCALE, sy * SCALE, tx * SCALE, ty * SCALE), id: `idp${edge}${uuid}`, fill: "none", stroke: "black", "stroke-width": 0.01 * SCALE }, svi), _jsx("text", { style: `fill:black;font-size:${0.2 * SCALE};`, transform: `translate(0, -${SCALE * 0.03})`, children: _jsx("textPath", { href: `#idp${edge}${uuid}`, startOffset: "5", children: val }) })] });
                })] }));
}
