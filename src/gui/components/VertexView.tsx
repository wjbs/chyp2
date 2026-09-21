import type { Graph } from "../../lib/graph";
import { isNontrivialValue } from "../../lib/graph";
import { SCALE, curveBetween, curveTo, vertexyShift } from "../../lib/util";


interface VertexViewProps {
    uuid: string;
    graph: Graph;
    vertex: number;
}

function curveOfMonogamousVertex(g : Graph, v : number, 
        inedge : number|null, outedge : number|null) : string {
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
        if (ied.value !== 'id') {
            inxpos = ied.x + 0.4 * ied.width;
            inypos = ied.y + vertexyShift(v, ied.t);
        }
        else {
            inxpos = vd.x;
            inypos = vd.y;
        }
    }
    if (outedge === null) {
        outxpos = vd.x;
        outypos = vd.y;
    }
    else {
        const oed = g.edgeData(outedge);
        if (oed.value !== 'id') {
            outxpos = oed.x - 0.4 * oed.width;
            outypos = oed.y + vertexyShift(v, oed.s);
        }
        else {
            outxpos = vd.x;
            outypos = vd.y;
        }
    }
    return curveBetween(inxpos * SCALE, inypos * SCALE, outxpos * SCALE, outypos * SCALE)
}

function curveForEdge(g : Graph, v : number, e : number, isInEdge : Boolean) {
    const ed = g.edgeData(e);
    const xpos = ed.x + (isInEdge ? 0.4 : -0.4) * ed.width;
    const ypos = ed.y + vertexyShift(v, isInEdge ? g.target(e) : g.source(e));
    const vd = g.vertexData(v);
    return curveTo(xpos * SCALE, ypos * SCALE, vd.x * SCALE, vd.y * SCALE);
}


function svgOfMonogamousVertex(uuid: string, g : Graph, v : number, 
        inedge : number|null, outedge : number|null) {
    const curve = curveOfMonogamousVertex(g, v, inedge, outedge);
    const val = isNontrivialValue(g.vertexData(v).value) 
        ?? ((window as any).debug_random_sizes ? ["1", "m", "n", "m * n"][v % 4] : "");

    return <g id={`v${v}${uuid}`}>
        <path key={`${v}, ${inedge}, ${outedge}`} d={curve} id={`v${v}p${uuid}`}
                fill="none"
                stroke="black"
                stroke-width={0.01 * SCALE} />
        {val !== null ? (
            <text style={`fill:black;font-size:${0.15 * SCALE};`}
                transform={`translate(0, -${SCALE * 0.03})`}>
                <textPath href={`#v${v}p${uuid}`} startOffset="5" >{val}</textPath>
            </text>
        ) : null}
    </g>
}

function pathForEdge(g : Graph, v : number, e : number, isInEdge : Boolean) {
    const curve = curveForEdge(g, v, e, isInEdge);
    return <path key={`${v}, ${e}`} d={curve} id={`v${v}p${e}`}
                fill="none"
                stroke="black"
                stroke-width={0.01 * SCALE} />
}


function circleOfNonmonogamousVertex(g : Graph, v : number
        /* inedges : number[], outedges : number[] */) {
    const vd = g.vertexData(v);
    return <circle cx={vd.x * SCALE} cy={vd.y * SCALE} r={0.04 * SCALE} 
        stroke="none" fill="black" stroke-width="0"/>
}

function svgOfNonmonogamousVertex(uuid : string, g : Graph, v : number, 
        inedges : number[], outedges : number[]) {
    return <g id={`v${v}${uuid}`}>
        {inedges.map(e => pathForEdge(g, v, e, true))}
        {outedges.map(e => pathForEdge(g, v, e, false))}
        {circleOfNonmonogamousVertex(g, v)}
    </g>
}



export function VertexView({ uuid, graph, vertex }: VertexViewProps) {
    const vertexData = graph.vertexData(vertex);
    const inEdges : number[] = Array.from(vertexData.inEdges.values());
    const outEdges : number[] = Array.from(vertexData.outEdges.values());

    if (inEdges.length === 1 &&
        outEdges.length === 1 || graph.isBoundary(vertex)) {
        const inEdge : number|null = inEdges.length !== 0 ? inEdges[0] : null;
        const outEdge : number|null = outEdges.length !== 0 ? outEdges[0] : null;
        if /* ((inEdge !== null && outEdge === null && graph.edgeData(inEdge).value === 'id') ||
            (outEdge !== null && inEdge === null && graph.edgeData(outEdge).value === 'id')) */
            ((inEdge !== null && graph.edgeData(inEdge).value === 'id') ||
            (outEdge !== null && graph.edgeData(outEdge).value === 'id')) {
            // Identity edges draw themselves
            return <g id={`v${vertex}`}/>;
        }
        return svgOfMonogamousVertex(uuid, graph, vertex, inEdge, outEdge);
    }
    else {
        return svgOfNonmonogamousVertex(uuid, graph, vertex, inEdges, outEdges);
    }
}