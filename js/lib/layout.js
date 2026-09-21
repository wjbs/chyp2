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
import { Graph } from "./graph.js";
import { layerDecomp } from "./term.js";
// const NUM_ITERATIONS = 10;
/**
 * Enforce minimum spacing between a sorted sequence of positions.
 *
 * A forward pass pushes each element forward if it is too close to its
 * predecessor; a backward pass then pulls elements back if they overshoot
 * the next element. Mutates `positions` in place.
 */
function enforceMinSpacing(positions, minGaps) {
    for (let i = 1; i < positions.length; i++) {
        if (positions[i] < positions[i - 1] + minGaps[i - 1]) {
            positions[i] = positions[i - 1] + minGaps[i - 1];
        }
    }
    for (let i = positions.length - 2; i >= 0; i--) {
        if (positions[i] > positions[i + 1] - minGaps[i]) {
            positions[i] = positions[i + 1] - minGaps[i];
        }
    }
}
function average(nums) {
    if (nums.length === 0) {
        return null;
    }
    else {
        return nums.reduce((x, y) => x + y) / nums.length;
    }
}
function centreGraph(g) {
    // ----- Centre the result -----
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;
    for (const v of g.vertices()) {
        const x = g.vertexData(v).x;
        const y = g.vertexData(v).y;
        if (x < xMin)
            xMin = x;
        if (x > xMax)
            xMax = x;
        if (y < yMin)
            yMin = y;
        if (y > yMax)
            yMax = y;
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
const layerGap = 0.4;
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
export function convexLayout(g, force = false, NUM_ITERATIONS = 10) {
    if (g.laidOut && !force)
        return;
    const eLayers = layerDecomp(g);
    let isPerm = true;
    for (const ed of g.edata.values()) {
        isPerm &&= (ed.value === 'id');
    }
    if (isPerm) {
        // g is a permutation
        const inp = [...g.inputs()];
        const width = layerGap * Math.sqrt(inp.length);
        for (let i = 0; i < inp.length; i++) {
            const vd = g.vertexData(inp[i]);
            vd.x = 0;
            vd.y = layerGap * (i - (inp.length - 1) / 2);
        }
        const outp = [...g.outputs()];
        for (let i = 0; i < outp.length; i++) {
            const vd = g.vertexData(outp[i]);
            vd.x = width;
            vd.y = layerGap * (i - (outp.length - 1) / 2);
        }
        for (let ed of g.edata.values()) {
            ed.x = (g.vertexData(ed.s[0]).x + g.vertexData(ed.t[0]).x) / 2;
            ed.y = (g.vertexData(ed.s[0]).y + g.vertexData(ed.t[0]).y) / 2;
        }
        centreGraph(g);
        return;
    }
    // ----- Assign initial x-coordinates and rough y-coordinates -----
    let x = 0;
    const inp = [...g.inputs()];
    for (let i = 0; i < inp.length; i++) {
        const vd = g.vertexData(inp[i]);
        vd.x = x;
        vd.y = i - (inp.length - 1) / 2;
    }
    x += layerGap;
    for (const eLayer of eLayers) {
        // First, have to compute the max width of this layer:
        const layerWidth = eLayer.map(i => g.edgeData(i).width).reduce((x, y) => Math.max(x, y));
        x += layerWidth / 2;
        for (let i = 0; i < eLayer.length; i++) {
            const ed = g.edgeData(eLayer[i]);
            ed.x = x;
            ed.y = 2 * i - (eLayer.length - 1);
        }
        const vLayer = eLayer.flatMap(e => g.target(e));
        for (let i = 0; i < vLayer.length; i++) {
            const vd = g.vertexData(vLayer[i]);
            vd.x = x + layerWidth / 2 + layerGap / 2;
            vd.y = i - (vLayer.length - 1) / 2;
        }
        x += layerWidth / 2 + layerGap;
    }
    const outp = [...g.outputs()];
    for (let i = 0; i < outp.length; i++) {
        const vd = g.vertexData(outp[i]);
        vd.x = x;
        vd.y = i - (outp.length - 1) / 2;
    }
    if (g.numVertices() === 0 || g.numEdges() === 0)
        return;
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
            if (eLayer.length <= 1)
                continue;
            const minGaps = [];
            for (let i = 0; i < eLayer.length - 1; i++) {
                minGaps.push((g.edgeData(eLayer[i]).height + g.edgeData(eLayer[i + 1]).height) * 0.5);
            }
            const positions = eLayer.map(e => g.edgeData(e).y);
            // To prevent the layout "diagonalizing", expand uniformly to ensure minimum spacing
            const prevAvgPosition = positions.reduce((x, y) => x + y) / positions.length;
            enforceMinSpacing(positions, minGaps);
            const newAvgPosition = positions.reduce((x, y) => x + y) / positions.length;
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
            if (inEdges.length === 0 && outEdges.length === 0)
                continue;
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
            if (vList.length <= 1)
                continue;
            const positions = vList.map(v => g.vertexData(v).y);
            const minGaps = new Array(vList.length - 1).fill(1.0);
            enforceMinSpacing(positions, minGaps);
            // const newAvgPosition = positions.reduce((x,y) => x + y);
            // const shift : number = prevAvgPosition ? (prevAvgPosition - newAvgPosition) : 0;
            for (let i = 0; i < vList.length; i++) {
                g.vertexData(vList[i]).y = positions[i] /* + temp * shift */;
            }
            // prevAvgPosition = newAvgPosition + shift;
        }
    }
    // Final pass to align midpoints as best as possible
    var prevAvgPosition = average(g.inputs().map(v => g.vertexData(v).y));
    for (const eLayer of eLayers) {
        if (eLayer.length === 0)
            continue; // just in case
        if (eLayer.length === 1 && g.source(eLayer[0]).length === 0) {
            const e = eLayer[0];
            const inputs = g.target(e);
            const num = inputs.length;
            const y = g.edgeData(e).y;
            prevAvgPosition = average(inputs.map((_, i) => y + (num <= 1 ? 0 : (i / (num - 1)) - 0.5)));
        }
        ;
        const vertPositionsIntoLayer = eLayer.flatMap(function (e) {
            const inputs = g.source(e);
            const num = inputs.length;
            const y = g.edgeData(e).y;
            return inputs.map((_, i) => y + (num <= 1 ? 0 : (i / (num - 1)) - 0.5));
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
            return inputs.map((_, i) => y + (num <= 1 ? 0 : (i / (num - 1)) - 0.5));
        });
        prevAvgPosition = average(vertPositionsOutOfLayer);
    }
    const outputAvgPosition = average(g.outputs().map(v => g.vertexData(v).y));
    const outputDiff = outputAvgPosition ? (prevAvgPosition ?? 0) - outputAvgPosition : 0;
    for (const v of g.outputs()) {
        g.vertexData(v).y += outputDiff;
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
