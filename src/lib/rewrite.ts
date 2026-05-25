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
import { Match } from './matcher.ts';
import { Rule } from './rule.ts';

/**
 * Do double-pushout rewriting.
 *
 * Given a rule `r` and a match of `r.lhs` into a graph, compute the rewrittern
 * graph and return a match `r.rhs` into it.
 */
export function dpo(r: Rule, m: Match): Match {
    // Maps from LHS boundary vertices to the split input/output copies in the context
    const inMap = new Map<number, number>();
    const outMap = new Map<number, number>();

    // Compute the pushout complement: start with a copy of the codomain and
    // remove the image of every LHS edge and interior vertex
    const ctx = m.cod.copy();

    for (const e of r.lhs.edges()) {
        ctx.removeEdge(m.emap.get(e)!);
    }

    for (const v of r.lhs.vertices()) {
        const v1 = m.vmap.get(v)!;
        if (r.lhs.isBoundary(v)) {
            const inC = r.lhs.vertexData(v).inIndices.size;
            const outC = r.lhs.vertexData(v).outIndices.size;
            if (inC === 1 && outC === 1) {
                const [v1i, v1o] = ctx.explodeVertex(v1);
                if (v1i.length === 1 && v1o.length === 1) {
                    inMap.set(v, v1i[0]);
                    outMap.set(v, v1o[0]);
                } else {
                    throw new Error('Rewriting modulo Frobenius not yet supported.');
                }
            } else if (inC > 1 || outC > 1) {
                throw new Error('Rewriting modulo Frobenius not yet supported.');
            }
        } else {
            ctx.removeVertex(v1);
        }
    }

    // ctx is now the context (pushout complement); we build the rewritten graph h into it
    const h = ctx;

    // Build a match of r.rhs into h
    const m1 = new Match(r.rhs, h);

    // Map RHS inputs using the LHS input matching
    for (let i = 0; i < r.lhs.inputs().length; i++) {
        const vl = r.lhs.inputs()[i];
        const vr = r.rhs.inputs()[i];
        m1.vmap.set(vr, inMap.has(vl) ? inMap.get(vl)! : m.vmap.get(vl)!);
    }

    // Map RHS outputs; if a vertex is both an input and output in r.rhs, merge in h
    for (let i = 0; i < r.lhs.outputs().length; i++) {
        const vl = r.lhs.outputs()[i];
        const vr = r.rhs.outputs()[i];
        const vr1 = outMap.has(vl) ? outMap.get(vl)! : m.vmap.get(vl)!;
        if (m1.vmap.has(vr)) {
            h.mergeVertices(m1.vmap.get(vr)!, vr1);
        } else {
            m1.vmap.set(vr, vr1);
        }
    }

    // Map interior RHS vertices to fresh vertices in h
    for (const v of r.rhs.vertices()) {
        if (!r.rhs.isBoundary(v)) {
            const vd = r.rhs.vertexData(v);
            const v1 = h.addVertex(vd.x, vd.y, vd.value);
            m1.vmap.set(v, v1);
            m1.vimg.add(v1);
        }
    }

    // Add RHS edges into h, connected via m1.vmap
    for (const e of r.rhs.edges()) {
        const ed = r.rhs.edgeData(e);
        const e1 = h.addEdge(
            ed.s.map(v => m1.vmap.get(v)!),
            ed.t.map(v => m1.vmap.get(v)!),
            ed.value, ed.x, ed.y, ed.fg, ed.bg, ed.hyper
        );
        m1.emap.set(e, e1);
        m1.eimg.add(e1);
    }

    return m1;
}

/**
 * Apply the given rewrite rule at match `m` and return the rewritten graph.
 *
 * Convenience wrapper around `dpo` for when the match data is not needed.
 */
export function rewrite(r: Rule, m: Match): Graph {
    return dpo(r, m).cod;
}
