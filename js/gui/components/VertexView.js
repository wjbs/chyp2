import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { isNontrivialValue } from "../../lib/graph";
import { SCALE, curveBetween, curveTo, vertexyShift } from "../../lib/util";
function curveOfMonogamousVertex(g, v, inedge, outedge) {
    const vd = g.vertexData(v);
    var inxpos;
    var inypos;
    var outxpos;
    var outypos;
    if (inedge === null) {
        inxpos = vd.x;
        inypos = vd.y;
    }
    else {
        const ied = g.edgeData(inedge);
        // if (ied.value !== 'id') {
        inxpos = ied.x + 0.4 * ied.width;
        inypos = ied.y + vertexyShift(v, ied.t);
        // }
        // else {
        //     inxpos = vd.x;
        //     inypos = vd.y;
        // }
    }
    if (outedge === null) {
        outxpos = vd.x;
        outypos = vd.y;
    }
    else {
        const oed = g.edgeData(outedge);
        // if (oed.value !== 'id') {
        outxpos = oed.x - 0.4 * oed.width;
        outypos = oed.y + vertexyShift(v, oed.s);
        // }
        // else {
        //     outxpos = vd.x;
        //     outypos = vd.y;
        // }
    }
    return curveBetween(inxpos * SCALE, inypos * SCALE, outxpos * SCALE, outypos * SCALE);
}
function curveForEdge(g, v, e, isInEdge) {
    const ed = g.edgeData(e);
    const xpos = ed.x + (isInEdge ? 0.4 : -0.4) * ed.width;
    const ypos = ed.y + vertexyShift(v, isInEdge ? g.target(e) : g.source(e));
    const vd = g.vertexData(v);
    return curveTo(xpos * SCALE, ypos * SCALE, vd.x * SCALE, vd.y * SCALE);
}
function svgOfMonogamousVertex(uuid, g, v, inedge, outedge) {
    const curve = curveOfMonogamousVertex(g, v, inedge, outedge);
    const val = isNontrivialValue(g.vertexData(v).value)
        ?? (window.debug_random_sizes ? ["1", "m", "n", "m * n"][v % 4] : "");
    return _jsxs("g", { id: `v${v}${uuid}`, children: [_jsx("path", { d: curve, id: `v${v}p${uuid}`, fill: "none", stroke: "black", "stroke-width": 0.01 * SCALE }, `${v}, ${inedge}, ${outedge}`), val !== null ? (_jsx("text", { style: `fill:black;font-size:${0.15 * SCALE};`, transform: `translate(0, -${SCALE * 0.03})`, children: _jsx("textPath", { href: `#v${v}p${uuid}`, startOffset: "5", children: val }) })) : null] });
}
function pathForEdge(g, v, e, isInEdge) {
    const curve = curveForEdge(g, v, e, isInEdge);
    return _jsx("path", { d: curve, id: `v${v}p${e}`, fill: "none", stroke: "black", "stroke-width": 0.01 * SCALE }, `${v}, ${e}`);
}
function circleOfNonmonogamousVertex(g, v
/* inedges : number[], outedges : number[] */ ) {
    const vd = g.vertexData(v);
    return _jsx("circle", { cx: vd.x * SCALE, cy: vd.y * SCALE, r: 0.04 * SCALE, stroke: "none", fill: "black", "stroke-width": "0" });
}
function svgOfNonmonogamousVertex(uuid, g, v, inedges, outedges) {
    return _jsxs("g", { id: `v${v}${uuid}`, children: [inedges.map(e => pathForEdge(g, v, e, true)), outedges.map(e => pathForEdge(g, v, e, false)), circleOfNonmonogamousVertex(g, v)] });
}
export function VertexView({ uuid, graph, vertex }) {
    const vertexData = graph.vertexData(vertex);
    const inEdges = Array.from(vertexData.inEdges.values());
    const outEdges = Array.from(vertexData.outEdges.values());
    if (inEdges.length === 1 &&
        outEdges.length === 1 || graph.isBoundary(vertex)) {
        const inEdge = inEdges.length !== 0 ? inEdges[0] : null;
        const outEdge = outEdges.length !== 0 ? outEdges[0] : null;
        if /* ((inEdge !== null && outEdge === null && graph.edgeData(inEdge).value === 'id') ||
            (outEdge !== null && inEdge === null && graph.edgeData(outEdge).value === 'id')) */ ((inEdge !== null && graph.edgeData(inEdge).value === 'id'
            && graph.outputs().includes(vertex)
            && graph.inputs().includes(graph.edgeData(inEdge).s[0])) ||
            (outEdge !== null && graph.edgeData(outEdge).value === 'id'
                && graph.inputs().includes(vertex)
                && graph.outputs().includes(graph.edgeData(outEdge).t[0]))) {
            // Identity edges draw themselves
            return _jsx("g", { id: `v${vertex}` });
        }
        return svgOfMonogamousVertex(uuid, graph, vertex, inEdge, outEdge);
    }
    else {
        return svgOfNonmonogamousVertex(uuid, graph, vertex, inEdges, outEdges);
    }
}
