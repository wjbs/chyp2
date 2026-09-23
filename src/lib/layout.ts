// chyp - An interactive theorem prover for string diagrams
// Copyright (C) 2022 - Aleks Kissinger
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Graph } from './graph.ts';
import { layerDecomp } from './term.ts';
import { inversionsWRT, vertexyShift, type Chyp2Settings } from './util.ts';

import loadHighs, { type HessianInput, type ModelData, type SparseMatrixInput } from "highs";

const highs = await loadHighs();

// (window as any).highs = highs
// const NUM_ITERATIONS = 10;

/**
 * Enforce minimum spacing between a sorted sequence of positions.
 *
 * A forward pass pushes each element forward if it is too close to its
 * predecessor; a backward pass then pulls elements back if they overshoot
 * the next element. Mutates `positions` in place.
 */
function enforceMinSpacing(positions: number[], minGaps: number[]): void {
    for (let i = 1; i < positions.length; i++) {
        if (positions[i] < positions[i - 1] + minGaps[i - 1]) {
            positions[i] = positions[i - 1] + minGaps[i - 1];
        }
    }
    // for (let i = positions.length - 2; i >= 0; i--) {
    //     if (positions[i] > positions[i + 1] - minGaps[i]) {
    //         positions[i] = positions[i + 1] - minGaps[i];
    //     }
    // }
}

function average(nums : number[]) : number|null {
    if (nums.length === 0) {
        return null
    }
    else {
        return nums.reduce((x,y) => x + y) / nums.length
    }
}

function centreGraph(g : Graph): void {

    // ----- Centre the result -----
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;
    for (const v of g.vertices()) {
        const x = g.vertexData(v).x;
        const y = g.vertexData(v).y;
        if (x < xMin) xMin = x;
        if (x > xMax) xMax = x;
        if (y < yMin) yMin = y;
        if (y > yMax) yMax = y;
    }
    if (isFinite(xMin) && isFinite(xMax) && isFinite(yMin) && isFinite(yMax)) {
        const xCenter = (xMin + xMax) / 2;
        const yCenter = (yMin + yMax) / 2;
        for (const v of g.vertices()) {
            g.vertexData(v).x -= xCenter;
            g.vertexData(v).y -= yCenter;
        }
        for (const e of g.edges()) {
            g.edgeData(e).x -= xCenter;
            g.edgeData(e).y -= yCenter;
        }
    }
}



/*

Full lists of:

variables:
ey_i, i in g.edges();
vy_i, i in g.vertices();


constraints:
for boundary in [g.inputs(), g.outputs()]:
    for i in range(len(boundary) - 1):
        v1 = boundary[i];
        v2 = boundary[i + 1];
        'vy_v2 - vy_v1 >= 1' 
        <-> "vy_v1 - vy_v2 <= -1"

for eLayer in eLayers:
    for i in range(len(eLayer) - 1): 
        e1 = eLayer[i]
        e2 = eLayer[i+1]
        dist = (e1.height + e2.height) * 0.5
        'ey_e2 - ey_e1 >= dist' 
        <-> "ey_e1 - ey_e2 <= - dist"

minimize (norm):

for boundary in [g.inputs(), g.outputs()]:
    for i in range(len(boundary) - 1):
        v1 = boundary[i];
        v2 = boundary[i + 1];
        "0.1 * (vy_v2 - vy_v1)"

for eLayer in eLayers:
    for i in range(len(eLayer) - 1): 
        e1 = eLayer[i]
        e2 = eLayer[i+1]
        "ey_e2 - ey_e1"

for v in g.vertices():
    in_pos = (if v.inEdges().size != 0 then 
        let e = [... v.inEdges()][0] in 
        "ey_e + e.vertexyShift(v, false)"
        else "vy_v")
    out_pos = (if v.outEdges().size != 0 then 
        let e = [... v.outEdges()][0] in 
        "ey_e + e.vertexyShift(v, true)"
        else "vy_v")
    "in_pos - out_pos"


*/


function makeOptimizationProblem(g : Graph, eLayers : number[][], s : Chyp2Settings) : 
    {c : {name : string, coeff : number}[], Q : number[][],
        bounds : {name : string, lower : number, upper : number, Arow : number[]}[]
        } {
    const verts : number[] = [...g.vertices()];
    const edges : number[] = [...g.edges()];
    const numVerts = verts.length;
    const numEdges = edges.length;

    const vy : Map<number,number> = new Map();
    for (const [i, v] of verts.map((v, i) => [i, v])) {
        vy.set(v, i);
    }
    
    const ey : Map<number,number> = new Map();
    for (const [i, e] of edges.map((e, i) => [i, e])) {
        ey.set(e, numVerts + i);
    }

    const size = numVerts + numEdges;
    const c : {name : string, coeff : number}[] = new Array(size).fill(0)
        .map<{name : string, coeff : number}>((_, i) => {
        return {name : (i < numVerts ? `v${i}` : `e${i - numVerts}`), coeff : 0}
        });


    const bounds : {name : string, lower : number, upper : number, Arow : number[]}[] = new Array();
    const Q : number[][] = Array(size).fill(0).map(() => Array(size).fill(0));

    // Constraints : 
    for (const [io, boundary] of 
            [['i', g.inputs()], ['o', g.outputs()]] as [string, number[]][]) {
        for (let i = 0; i < boundary.length - 1; i++) {
            const Arow : number[] = new Array(size).fill(0);
            const v1 = boundary[i];
            const v2 = boundary[i+1];
            const vy1 = vy.get(v1)!;
            const vy2 = vy.get(v2)!;
            // 1 <= vy2 - vy1 <= infinity
            const lower = s.OPTIM.min_boundary_height;
            const upper = highs.infinity;
            const name = `${io}${i}(v${v1})${i+1}(v${v2})`;
            Arow[vy1] = -1;
            Arow[vy2] = 1;
            bounds.push({name, lower, upper, Arow})
        }
    }
    
    // wjbs added this one: internal vertices must be at the average of their incident edges positions
    for (const v of g.vertices()) {
        if (g.isBoundary(v)) continue;
        const inEdges : number[] = [...g.inEdges(v)];
        const outEdges : number[] = [...g.outEdges(v)];
        if (inEdges.length === 0 && outEdges.length === 0) {
            // isolated vertex! For now, we'll just constrain it to y = 0
            const Arow : number[] = new Array(size).fill(0);
            const vy_v = vy.get(v)!;
            const lower = 0;
            const upper = 0;
            const name = `visol${v}`;
            Arow[vy_v] = 1;
            bounds.push({name, lower, upper, Arow})
        }
        else {
            const Arow : number[] = new Array(size).fill(0);
            const vy_v = vy.get(v)!;
            const lower = 0;
            const upper = 0;
            const name = `vavg${v}`;
            // vyv = average(ey_e for e in inEdges + outEdges)
            Arow[vy_v] = 1;
            const scaleFactor = - 1 / (inEdges.length + outEdges.length);
            for (const e of [... inEdges, ... outEdges]) {
                Arow[ey.get(e)!] = scaleFactor;
            }
            bounds.push({name, lower, upper, Arow})
        }
    }

    for (const eLayer of eLayers) {
        for (let i = 0; i < eLayer.length - 1; i++) {
            const Arow : number[] = new Array(size).fill(0);
            const e1 = eLayer[i];
            const e2 = eLayer[i+1];
            const ey1 = ey.get(e1)!;
            const ey2 = ey.get(e2)!;
            const separation = (g.edgeData(e1).height + g.edgeData(e2).height) * 0.5;
            // separation <= ey2 - ey1 <= infinity
            const lower = separation * s.OPTIM.edge_gap_factor;
            const upper = highs.infinity;
            const name = `gap_e${e1}_e${e2}`;
            Arow[ey1] = -1;
            Arow[ey2] = 1;
            bounds.push({name, lower, upper, Arow})
        }
    }


    // // Optimization (minimization)
    for (const boundary of [g.inputs(), g.outputs()]) {
        for (let i = 0; i < boundary.length - 1; i++) {
            const v1 = boundary[i];
            const v2 = boundary[i+1];
            const vy1 = vy.get(v1)!;
            const vy2 = vy.get(v2)!;
            // minimize 0.1 * (vy2 - vy1)^2 = 0.1 * (vy2^2 + vy1^2 - 2 * vy1 * vy2)
            Q[vy1][vy1] += 0.1 * s.OPTIM.boundary_weight;
            Q[vy2][vy2] += 0.1 * s.OPTIM.boundary_weight;
            // always keep symmetric
            Q[vy1][vy2] -= 0.1 * s.OPTIM.boundary_weight;
            Q[vy2][vy1] -= 0.1 * s.OPTIM.boundary_weight;
        }
    }

    for (const eLayer of eLayers) {
        for (let i = 0; i < eLayer.length - 1; i++) {
            const e1 = eLayer[i];
            const e2 = eLayer[i];
            const ey1 = ey.get(e1)!;
            const ey2 = ey.get(e2)!;
            // minimize 0.1 * (ey2 - ey1)^2 = 0.1 * (ey2^2 + e^2 - 2 * ey1 * ey2)
            Q[ey1][ey1] += 0.1 * s.OPTIM.edge_gap_weight;
            Q[ey2][ey2] += 0.1 * s.OPTIM.edge_gap_weight;
            // always keep symmetric
            Q[ey1][ey2] -= 0.1 * s.OPTIM.edge_gap_weight;
            Q[ey2][ey1] -= 0.1 * s.OPTIM.edge_gap_weight;
        }
    }

    for (const v of g.vertices()) {
        const vy_v = vy.get(v)!;
        const inEdges : number[] = [...g.inEdges(v)];
        const outEdges : number[] = [...g.outEdges(v)];
        if (inEdges.length === 0 && outEdges.length === 0) {
            // isolated vertex; no optimization needed
            continue
        }
        else if (inEdges.length !== 0 && outEdges.length === 0) {
            const e = inEdges[0];
            const ey_e = ey.get(e)!;
            /*  minimize (vy_v - e.vertexyPos(v))^2 = 
                (vy_v - (ey_e + e.vertexyShift(v, true)))^2 =
                vy_v^2 + ey_e ^ 2 [+ C] - 2 vy_v ey_e - 2 * e.vertexyShift(v, true) vy_v
            */
           Q[vy_v][vy_v] += 1 * s.OPTIM.vertex_gap_weight;
           Q[ey_e][ey_e] += 1 * s.OPTIM.vertex_gap_weight;
           // always keep symmetric
           Q[vy_v][ey_e] -= 1 * s.OPTIM.vertex_gap_weight;
           Q[ey_e][vy_v] -= 1 * s.OPTIM.vertex_gap_weight;
           const yShift = vertexyShift(v, g.target(e));
           c[vy_v].coeff -= /* 2 * */ yShift * s.OPTIM.vertex_gap_weight;
        }
        else if (inEdges.length === 0 && outEdges.length !== 0) {
            const e = outEdges[0];
            const ey_e = ey.get(e)!;
            /*  minimize (vy_v - e.vertexyPos(v))^2 = 
                (vy_v - (ey_e + e.vertexyShift(v, false)))^2 =
                vy_v^2 + ey_e ^ 2 [+ C] - 2 vy_v ey_e - 2 * e.vertexyShift(v, false) vy_v
            */
           Q[vy_v][vy_v] += 1 * s.OPTIM.vertex_gap_weight;
           Q[ey_e][ey_e] += 1 * s.OPTIM.vertex_gap_weight;
           // always keep symmetric
           Q[vy_v][ey_e] -= 1 * s.OPTIM.vertex_gap_weight;
           Q[ey_e][vy_v] -= 1 * s.OPTIM.vertex_gap_weight;
           const yShift = vertexyShift(v, g.source(e));
           c[vy_v].coeff -= /* 2 * */ yShift * s.OPTIM.vertex_gap_weight;
        }
        else /* inEdges.length !== 0 && outEdges.length !== 0 */ {
            const e1 = inEdges[0];
            const e2 = outEdges[0];
            const ey1 = ey.get(e1)!;
            const ey2 = ey.get(e2)!;
            /*  minimize (e1.vertexyPos(v) - e2.vertexyPos(v))^2 = 
                ((ey1 + e1.vertexyShift(v, true)) - (ey2 + e2.vertexyShift(v, false)))^2 =
                ey1 ^ 2 + ey2 ^ 2 [+ C] - 2 ey1 ey2 
                    - 2 * e1.vertexyShift(v, true) ey2 
                    - 2 * e2.vertexyShift(v, false) ey1
            */
           Q[ey1][ey1] += 1 * s.OPTIM.vertex_gap_weight;
           Q[ey2][ey2] += 1 * s.OPTIM.vertex_gap_weight;
           // always keep symmetric
           Q[ey1][ey2] -= 1 * s.OPTIM.vertex_gap_weight;
           Q[ey2][ey1] -= 1 * s.OPTIM.vertex_gap_weight;
           const yShift1 = vertexyShift(v, g.target(e1));
           const yShift2 = vertexyShift(v, g.source(e2));

           c[ey1].coeff -= /* 2 * */ yShift2 * s.OPTIM.vertex_gap_weight;
           c[ey2].coeff -= /* 2 * */ yShift1 * s.OPTIM.vertex_gap_weight;
        }
    }


    return {c, Q, bounds}
}

function matrix2CSC(n : number, m : number, A : number[/*m*/][/*n*/])
    : SparseMatrixInput {
    // A is row-major n-by-m matrix
    // majorDimension = numCols = m
    const format = "csc";
    const numRows = n;
    const numCols = m;
    const starts = Array(m + 1).fill(0).map((_, i) => i * n);
    const indices = Array(n * m).fill(0).map((_, i) => i % n);
    const values = Array(n * m).fill(0).map(function (_, ij) {
        const i = ij % n;
        const j = Math.floor(ij / n);
        return A[i][j];
    })
    return {format, indices, numCols, numRows, starts, values};
}

function Q2Hessian(dimension : number, Q : number[][]) : HessianInput {
    if (Q.length !== dimension || Q.some(r => r.length !== dimension)) {
        throw new Error("Argument to Q2Hession has wrong size!");
    }
    const csc = matrix2CSC(dimension, dimension, Q);
    const format = "square";
    const indices = csc.indices;
    const starts = csc.starts;
    const values = csc.values;
    return {dimension, format, indices, starts, values}
}

function graphToModelData(g : Graph, eLayers : number[][], s : Chyp2Settings) : ModelData {
    const problem = makeOptimizationProblem(g, eLayers, s);
    const numCols = problem.c.length;
    const numRows = problem.bounds.length;
    const colCost = problem.c.map(v => v.coeff);
    const colLower = problem.c.map(_ => - highs.infinity);
    const colUpper = problem.c.map(_ => highs.infinity);
    const colNames = problem.c.map(v => v.name);
    const hessian = Q2Hessian(numCols, problem.Q);
    const matrix = matrix2CSC(numRows, numCols, problem.bounds.map(v => v.Arow));
    const rowLower = problem.bounds.map(v => v.lower);
    const rowUpper = problem.bounds.map(v => v.upper);
    const rowNames = problem.bounds.map(v => v.name);
    const sense = highs.constants.objectiveSense.minimize;
    return {numCols, numRows, colCost, colLower, colUpper, colNames, hessian,
            matrix, rowLower, rowUpper, rowNames, sense};
}


function convexOptimizationLayout(g : Graph, force : boolean = false, 
    s : Chyp2Settings
) : void {
    if (g.laidOut && !force) return;
    const eLayers = layerDecomp(g);
    elementaryLayerDecompPreLayout(s, g, eLayers);
    if (g.numVertices() === 0 || g.numEdges() === 0) return;

    const model = highs.createModel();
    const graphModelData = graphToModelData(g, eLayers, s);
    model.passModel(graphModelData);
    model.run();
    // console.log(s);
    const { colValue } = model.getSolution();
    model.dispose();
    const verts : number[] = [...g.vertices()];
    const edges : number[] = [...g.edges()];
    const numVerts = verts.length;
    const numEdges = edges.length;
    for (let i = 0; i < numVerts; i++) {
        g.vertexData(verts[i]).y = colValue[i];
    }
    for (let i = 0; i < numEdges; i++) {
        g.edgeData(edges[i]).y = colValue[numVerts + i];
    }
    centreGraph(g);
}




function elementaryLayerDecompPreLayout(s : Chyp2Settings, g : Graph, eLayers : number[][]) : void {
    // ----- Assign initial x-coordinates and rough y-coordinates -----
    let x = 0;

    const opt = s.OPTIM;

    var inp = [...g.inputs()];
    for (let i = 0; i < inp.length; i++) {
        const vd = g.vertexData(inp[i]);
        vd.x = x;
        vd.y = (i - (inp.length - 1) / 2) * 0.8;
    }
    x += opt.layer_gap;

    for (const eLayer of eLayers) {
        const edLayer = eLayer.map(e => g.edgeData(e));
        // First, have to compute the max width of this layer:
        const layerWidth = edLayer.map(ed => ed.width).reduce((x,y)=>Math.max(x,y));
        const eli = edLayer.flatMap(ed => ed.s);
        
        x += layerWidth / 2 + opt.layer_gap_sqrt_invers_weight * Math.sqrt(inversionsWRT(inp, eli));

        inp = edLayer.flatMap(ed => ed.t);

        var y = 0;
        for (let i = 0; i < eLayer.length; i++) {
            const ed = g.edgeData(eLayer[i]);
            ed.x = x;
            y += ed.height/2;
            ed.y = y;
            y += ed.height/2;
            if (ed.value === 'id') {
                ed.width = layerWidth;
            }
        }
        for (const e of eLayer) {
            g.edgeData(e).y -= y / 2
        }
        const vLayer = eLayer.flatMap(e => g.target(e));
        for (let i = 0; i < vLayer.length; i++) {
            const v = vLayer[i];
            const vd = g.vertexData(v);
            vd.x = x + layerWidth / 2 + opt.layer_gap / 2;
            vd.y = average([...vd.outEdges].map(
                e => g.edgeData(e).y + vertexyShift(v, g.edgeData(e).s)
            ).concat([...vd.inEdges].map(
                e => g.edgeData(e).y + vertexyShift(v, g.edgeData(e).t)
            )))??0;
           // i - (vLayer.length - 1) / 2;   
        }
        x += layerWidth / 2 + opt.layer_gap;
    }

    const outp = [...g.outputs()];
    x += opt.layer_gap_sqrt_invers_weight * Math.sqrt(inversionsWRT(inp, outp));
    for (let i = 0; i < outp.length; i++) {
        const vd = g.vertexData(outp[i]);
        vd.x = x;
        vd.y = i - (outp.length - 1) / 2;
    }
}


/**
 * Lay out a graph using layer decomposition and iterative y-coordinate relaxation.
 *
 * This is a heuristic replacement for the convex-optimisation-based layout in the
 * original Python implementation.  X-coordinates are assigned deterministically from
 * the layer structure; y-coordinates are then refined over several iterations to
 * minimise wire bending while keeping elements in each layer at least the required
 * distance apart.
 *
 * Each iteration does four steps:
 *   1. Set each edge's y to the average of its source-vertex y-coordinates (adjusted
 *      for the vertex's position within the source list).
 *   2. Enforce minimum spacing between consecutive edges in the same layer.
 *   3. Set each vertex's y to the average of the positions suggested by its incident
 *      edges.
 *   4. Enforce minimum spacing of 1.0 between consecutive boundary vertices.
 *
 * After iteration the whole diagram is centred and non-boundary target vertices are
 * snapped to their incoming edge.
 */
export function convexElementaryLayout(g: Graph, force: boolean = false, NUM_ITERATIONS: number = 10, 
    s : Chyp2Settings
): void {
    if (g.laidOut && !force) return;
    const eLayers = layerDecomp(g);

    let isPerm = true;
    for (const ed of g.edata.values()) {
        isPerm &&= (ed.value === 'id');
    }

    if (isPerm) {
        // g is a permutation
        const inp = [...g.inputs()];
        const width = s.OPTIM.layer_gap * Math.sqrt(inp.length);
        for (let i = 0; i < inp.length; i++) {
            const vd = g.vertexData(inp[i]);
            vd.x = 0;
            vd.y = s.OPTIM.layer_gap * (i - (inp.length - 1) / 2);
        }
        
        const outp = [...g.outputs()];
        for (let i = 0; i < outp.length; i++) {
            const vd = g.vertexData(outp[i]);
            vd.x = width;
            vd.y = s.OPTIM.layer_gap * (i - (outp.length - 1) / 2);
        }

        for (let ed of g.edata.values()) {
            ed.x = (g.vertexData(ed.s[0]).x + g.vertexData(ed.t[0]).x) / 2;
            ed.y = (g.vertexData(ed.s[0]).y + g.vertexData(ed.t[0]).y) / 2;
        }

        centreGraph(g);
        return;
    }

    elementaryLayerDecompPreLayout(s, g, eLayers);

    if (g.numVertices() === 0 || g.numEdges() === 0) return;

    // ----- Iterative y-coordinate relaxation -----
    for (let iter = 0; iter < NUM_ITERATIONS; iter++) {
        // const temp = 1 - iter / NUM_ITERATIONS;

        // Step 1: update each edge's y from its source vertex positions
        for (const e of g.edges()) {
            const s = g.source(e);
            if (s.length > 0) {
                let sum = 0;
                for (let j = 0; j < s.length; j++) {
                    const yShift = s.length <= 1 ? 0 : (j / (s.length - 1)) - 0.5;
                    sum += g.vertexData(s[j]).y - yShift;
                }
                g.edgeData(e).y = sum / s.length;
            }
            else {
                const t = g.target(e);
                if (t.length > 0) {
                    let sum = 0;
                    for (let j = 0; j < t.length; j++) {
                        const yShift = t.length <= 1 ? 0 : (j / (t.length - 1)) - 0.5;
                        sum += g.vertexData(t[j]).y - yShift;
                    }
                    g.edgeData(e).y = sum / t.length;
                }
            }
        }

        // Step 2: enforce minimum spacing between edges in the same layer
        for (const eLayer of eLayers) {
            if (eLayer.length <= 1) continue;
            const minGaps: number[] = [];
            for (let i = 0; i < eLayer.length - 1; i++) {
                minGaps.push(
                    (g.edgeData(eLayer[i]).height + g.edgeData(eLayer[i + 1]).height) * 0.5
                );
            }
            const positions = eLayer.map(e => g.edgeData(e).y);
            // To prevent the layout "diagonalizing", expand uniformly to ensure minimum spacing
            const prevAvgPosition = positions.reduce((x,y) => x + y) / positions.length;
            enforceMinSpacing(positions, minGaps);
            const newAvgPosition = positions.reduce((x,y) => x + y) / positions.length;
            const shift = prevAvgPosition - newAvgPosition;
            for (let i = 0; i < eLayer.length; i++) {
                g.edgeData(eLayer[i]).y = positions[i] + shift;
            }
        }

        // Step 3: update each vertex's y from its incident edges
        for (const v of g.vertices()) {
            // Don't update boundary vertex positions:
            // if (g.isBoundary(v)) continue;
            const inEdges = [...g.inEdges(v)];
            const outEdges = [...g.outEdges(v)];
            if (inEdges.length === 0 && outEdges.length === 0) continue;

            let sum = 0;
            let count = 0;

            if (inEdges.length >= 1) {
                const e = inEdges[0];
                const t = g.target(e);
                const j = t.indexOf(v);
                const yShift = t.length <= 1 ? 0 : (j / (t.length - 1)) - 0.5;
                sum += g.edgeData(e).y + yShift;
                count++;
            }

            if (outEdges.length >= 1) {
                const e = outEdges[0];
                const s = g.source(e);
                const j = s.indexOf(v);
                const yShift = s.length <= 1 ? 0 : (j / (s.length - 1)) - 0.5;
                sum += g.edgeData(e).y + yShift;
                count++;
            }

            g.vertexData(v).y = sum / count;
        }

        // Step 4: enforce minimum spacing of 1.0 between consecutive boundary vertices
        // var prevAvgPosition : number | null = null
        for (const vList of [g.inputs(), g.outputs()]) {
            if (vList.length <= 1) continue;
            const positions = vList.map(v => g.vertexData(v).y);
            const minGaps = new Array<number>(vList.length - 1).fill(0.5);
            enforceMinSpacing(positions, minGaps);
            // const newAvgPosition = positions.reduce((x,y) => x + y);
            // const shift : number = prevAvgPosition ? (prevAvgPosition - newAvgPosition) : 0;
            for (let i = 0; i < vList.length; i++) {
                g.vertexData(vList[i]).y = positions[i] /* + temp * shift */;
            }
            // prevAvgPosition = newAvgPosition + shift;
        }
    }

    if (NUM_ITERATIONS > 0) {
        // Final pass to align midpoints as best as possible
        var prevAvgPosition = average(g.inputs().map(v => g.vertexData(v).y));
        for (const eLayer of eLayers) {
            if (eLayer.length === 0) continue; // just in case
            if (eLayer.length === 1 && g.source(eLayer[0]).length === 0) {
                const e = eLayer[0];
                const inputs = g.target(e)
                const num = inputs.length;
                const y = g.edgeData(e).y;
                prevAvgPosition = average(inputs.map((_, i) => y + (num <= 1 ? 0 : (i / (num - 1)) - 0.5)));
            };
            const vertPositionsIntoLayer = eLayer.flatMap(function (e) {
                const inputs = g.source(e);
                const num = inputs.length;
                const y = g.edgeData(e).y;
                return inputs.map((_, i) => y + (num <= 1 ? 0 : (i / (num - 1)) - 0.5))
            });
            const newAvgPosition = average(vertPositionsIntoLayer);
            const diff = newAvgPosition ? (prevAvgPosition ?? 0) - newAvgPosition : 0;
            for (const e of eLayer) {
                const ed = g.edgeData(e);
                ed.y += diff;
                for (const v of g.target(e)) {
                    const vd = g.vertexData(v);
                    vd.y += diff;
                }
            }
            const vertPositionsOutOfLayer = eLayer.flatMap(function (e) {
                const inputs = g.target(e);
                const num = inputs.length;
                const y = g.edgeData(e).y;
                return inputs.map((_, i) => y + (num <= 1 ? 0 : (i / (num - 1)) - 0.5))
            });
            prevAvgPosition = average(vertPositionsOutOfLayer);
        }
        const outputAvgPosition = average(g.outputs().map(v => g.vertexData(v).y));
        const outputDiff = outputAvgPosition ? (prevAvgPosition ?? 0) - outputAvgPosition : 0;
        for (const v of g.outputs()) {
            g.vertexData(v).y += outputDiff
        }
    }

    centreGraph(g);

    // ----- Snap non-boundary target vertices to their incoming edge -----
    for (const e of g.edges()) {
        const ed = g.edgeData(e);
        for (let j = 0; j < ed.t.length; j++) {
            const v = ed.t[j];
            if (!g.isBoundary(v)) {
                const yShiftV = ed.t.length <= 1 ? 0 : (j / (ed.t.length - 1)) - 0.5;
                g.vertexData(v).y = ed.y + yShiftV;
            }
        }
    }

    g.laidOut = true;
}

export function convexLayout(s : Chyp2Settings, g : Graph, force: boolean = false, NUM_ITERATIONS: number = 10
) : void {
    if (s.layout === "OPTIM") {
        convexOptimizationLayout(g, force, s);
    }
    else {
        convexElementaryLayout(g, force, NUM_ITERATIONS, s);
    }
}
