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
const NUM_ITERATIONS = 10;
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
export function convexLayout(g, force = false) {
    if (g.laidOut && !force)
        return;
    const eLayers = layerDecomp(g);
    // ----- Assign initial x-coordinates and rough y-coordinates -----
    let x = -(eLayers.length + 1) * 1.5;
    const inp = [...g.inputs()];
    for (let i = 0; i < inp.length; i++) {
        const vd = g.vertexData(inp[i]);
        vd.x = x + 1.5;
        vd.y = i - (inp.length - 1) / 2;
    }
    x += 3.0;
    for (const eLayer of eLayers) {
        for (let i = 0; i < eLayer.length; i++) {
            const ed = g.edgeData(eLayer[i]);
            ed.x = x;
            ed.y = 2 * i - (eLayer.length - 1);
        }
        const vLayer = eLayer.flatMap(e => g.target(e));
        for (let i = 0; i < vLayer.length; i++) {
            const vd = g.vertexData(vLayer[i]);
            vd.x = x + 0.7;
            vd.y = i - (vLayer.length - 1) / 2;
        }
        x += 3.0;
    }
    const outp = [...g.outputs()];
    for (let i = 0; i < outp.length; i++) {
        const vd = g.vertexData(outp[i]);
        vd.x = x - 1.5;
        vd.y = i - (outp.length - 1) / 2;
    }
    if (g.numVertices() === 0 || g.numEdges() === 0)
        return;
    // ----- Iterative y-coordinate relaxation -----
    for (let iter = 0; iter < NUM_ITERATIONS; iter++) {
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
        }
        // Step 2: enforce minimum spacing between edges in the same layer
        for (const eLayer of eLayers) {
            if (eLayer.length <= 1)
                continue;
            const minGaps = [];
            for (let i = 0; i < eLayer.length - 1; i++) {
                minGaps.push((g.edgeData(eLayer[i]).boxSize() + g.edgeData(eLayer[i + 1]).boxSize()) * 0.5);
            }
            const positions = eLayer.map(e => g.edgeData(e).y);
            enforceMinSpacing(positions, minGaps);
            for (let i = 0; i < eLayer.length; i++) {
                g.edgeData(eLayer[i]).y = positions[i];
            }
        }
        // Step 3: update each vertex's y from its incident edges
        for (const v of g.vertices()) {
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
        for (const vList of [g.inputs(), g.outputs()]) {
            if (vList.length <= 1)
                continue;
            const positions = vList.map(v => g.vertexData(v).y);
            const minGaps = new Array(vList.length - 1).fill(1.0);
            enforceMinSpacing(positions, minGaps);
            for (let i = 0; i < vList.length; i++) {
                g.vertexData(vList[i]).y = positions[i];
            }
        }
    }
    // ----- Centre the result -----
    let yMin = Infinity;
    let yMax = -Infinity;
    for (const v of g.vertices()) {
        const y = g.vertexData(v).y;
        if (y < yMin)
            yMin = y;
        if (y > yMax)
            yMax = y;
    }
    if (isFinite(yMin) && isFinite(yMax)) {
        const yCenter = (yMin + yMax) / 2;
        for (const v of g.vertices())
            g.vertexData(v).y -= yCenter;
        for (const e of g.edges())
            g.edgeData(e).y -= yCenter;
    }
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
