import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import "../index.css";
import { useRef } from "preact/hooks";
import { Graph } from "../../lib/graph";
import { EdgeView } from "./EdgeView";
import { SCALE } from "../../lib/util";
export function GraphView({ graph }) {
    const svgRef = useRef(null);
    if (!graph) {
        return _jsx("div", { className: "graph-panel" });
    }
    const bbox = graph.boundingBox();
    const viewBox = `${bbox[0] * SCALE} ${bbox[2] * SCALE} ${(bbox[1] - bbox[0]) * SCALE} ${(bbox[3] - bbox[2]) * SCALE}`;
    return (_jsx("div", { className: "graph-panel", children: _jsx("svg", { ref: svgRef, className: "graph-svg", viewBox: viewBox, children: [...graph.edges()].map(e => _jsx(EdgeView, { graph: graph, edge: e }, e)) }) }));
}
export function GraphPanels({ lhs, rhs }) {
    if (rhs === null) {
        return (_jsx("div", { style: { display: 'flex', width: '100%', height: '100%', justifyContent: 'center' }, children: _jsx(GraphView, { graph: lhs }) }));
    }
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'row', width: '100%', height: '100%' }, children: [_jsx("div", { style: { flex: 1, borderRight: '1px solid #ccc' }, children: _jsx(GraphView, { graph: lhs }) }), _jsx("div", { style: { flex: 1 }, children: _jsx(GraphView, { graph: rhs }) })] }));
}
