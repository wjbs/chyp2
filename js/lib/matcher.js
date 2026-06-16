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
import { Rule } from "./rule.js";
const DEBUG_MATCH = false;
function matchLog(s) {
    if (DEBUG_MATCH)
        console.log(s);
}
// ---------------------------------------------------------------------------
// Match
// ---------------------------------------------------------------------------
export class Match {
    dom;
    cod;
    vmap;
    vimg;
    emap;
    eimg;
    constructor(domOrMatch, cod) {
        if (domOrMatch instanceof Match) {
            const m = domOrMatch;
            this.dom = m.dom;
            this.cod = m.cod;
            this.vmap = new Map(m.vmap);
            this.vimg = new Set(m.vimg);
            this.emap = new Map(m.emap);
            this.eimg = new Set(m.eimg);
        }
        else {
            this.dom = domOrMatch;
            this.cod = cod;
            this.vmap = new Map();
            this.vimg = new Set();
            this.emap = new Map();
            this.eimg = new Set();
        }
    }
    toString() {
        return `  vmap: ${JSON.stringify([...this.vmap])}\n  emap: ${JSON.stringify([...this.emap])}`;
    }
    copy() {
        return new Match(this);
    }
    tryAddVertex(v, codV) {
        matchLog(`trying to add vertex ${v} -> ${codV} to match:`);
        matchLog(this.toString());
        // if already mapped, only check consistency
        if (this.vmap.has(v)) {
            matchLog(`vertex already mapped to ${this.vmap.get(v)}`);
            return this.vmap.get(v) === codV;
        }
        const vVal = this.dom.vertexData(v).value;
        const codVVal = this.cod.vertexData(codV).value;
        if (vVal !== codVVal) {
            matchLog(`vertex failed: values ${vVal} != ${codVVal}`);
            return false;
        }
        if (this.cod.isBoundary(codV) && !this.dom.isBoundary(v)) {
            matchLog('vertex failed: cod v is boundary but dom v is not');
            return false;
        }
        // matches are only allowed to be non-injective on the boundary
        if (this.vimg.has(codV)) {
            if (!this.dom.isBoundary(v)) {
                matchLog('vertex failed: non-injective on interior vertex');
                return false;
            }
            for (const [dv, cv] of this.vmap) {
                if (cv === codV && !this.dom.isBoundary(dv)) {
                    matchLog('vertex failed: non-injective on interior vertex');
                    return false;
                }
            }
        }
        this.vmap.set(v, codV);
        this.vimg.add(codV);
        // unless v is a boundary, check that nhd sizes match so gluing conditions are satisfiable
        if (!this.dom.isBoundary(v)) {
            if (this.dom.inEdges(v).size !== this.cod.inEdges(codV).size) {
                matchLog('vertex failed: in_edges cannot satisfy gluing conds');
                return false;
            }
            if (this.dom.outEdges(v).size !== this.cod.outEdges(codV).size) {
                matchLog('vertex failed: out_edges cannot satisfy gluing conds');
                return false;
            }
        }
        matchLog('vertex success');
        return true;
    }
    tryAddEdge(e, codE) {
        matchLog(`trying to add edge ${e} -> ${codE} to match:`);
        matchLog(this.toString());
        const eVal = this.dom.edgeData(e).value;
        const codEVal = this.cod.edgeData(codE).value;
        if (eVal !== codEVal) {
            matchLog(`edge failed: values ${eVal} != ${codEVal}`);
            return false;
        }
        if (this.eimg.has(codE)) {
            matchLog('edge failed: non-injective');
            return false;
        }
        this.emap.set(e, codE);
        this.eimg.add(codE);
        const s = this.dom.source(e);
        const codS = this.cod.source(codE);
        const t = this.dom.target(e);
        const codT = this.cod.target(codE);
        if (s.length !== codS.length || t.length !== codT.length) {
            matchLog('edge failed: source or target len doesn\'t match image');
            return false;
        }
        const domVerts = [...s, ...t];
        const codVerts = [...codS, ...codT];
        for (let i = 0; i < domVerts.length; i++) {
            const v1 = domVerts[i];
            const codV1 = codVerts[i];
            if (this.vmap.has(v1)) {
                if (this.vmap.get(v1) !== codV1) {
                    matchLog('edge failed: inconsistent with previously mapped vertex');
                    return false;
                }
            }
            else {
                if (!this.tryAddVertex(v1, codV1)) {
                    matchLog('edge failed: couldn\'t add a vertex');
                    return false;
                }
            }
        }
        matchLog('edge success');
        return true;
    }
    /** Returns true if every edge in nhd(v) is already in the domain of emap */
    domNhdMapped(v) {
        for (const e of this.dom.inEdges(v)) {
            if (!this.emap.has(e))
                return false;
        }
        for (const e of this.dom.outEdges(v)) {
            if (!this.emap.has(e))
                return false;
        }
        return true;
    }
    /**
     * Try to extend the match by mapping all scalar edges (0 -> 0 edges).
     *
     * Returns true if successful. Scalar matches yield isomorphic rewriting results so
     * only one matching is tried rather than enumerating all possibilities.
     */
    mapScalars() {
        const codScalars = [];
        for (const e of this.cod.edges()) {
            const ed = this.cod.edgeData(e);
            if (ed.s.length === 0 && ed.t.length === 0) {
                codScalars.push([e, ed.value]);
            }
        }
        for (const e of this.dom.edges()) {
            matchLog(`trying to map scalar edge ${e}`);
            const ed = this.dom.edgeData(e);
            if (ed.s.length !== 0 || ed.t.length !== 0)
                continue;
            let found = false;
            for (let i = 0; i < codScalars.length; i++) {
                const [e1, val] = codScalars[i];
                if (val === ed.value) {
                    codScalars.splice(i, 1);
                    this.emap.set(e, e1);
                    this.eimg.add(e1);
                    found = true;
                    matchLog(`successfully mapped scalar ${e} -> ${e1}`);
                    break;
                }
            }
            if (!found) {
                matchLog(`match failed: could not map scalar edge ${e}`);
                return false;
            }
        }
        return true;
    }
    /**
     * Returns a list of partial matches identical to this one but with one additional
     * vertex or edge mapped. Used by Matches to drive the search stack.
     */
    more() {
        const ms = [];
        // first, try to complete neighbourhoods of already-matched vertices
        for (const v of this.vmap.keys()) {
            if (this.domNhdMapped(v))
                continue;
            const codV = this.vmap.get(v);
            // extend via the next unmapped in-edge
            for (const e of this.dom.inEdges(v)) {
                if (this.emap.has(e))
                    continue;
                for (const codE of this.cod.inEdges(codV)) {
                    const m1 = this.copy();
                    if (m1.tryAddEdge(e, codE))
                        ms.push(m1);
                }
                return ms;
            }
            // then unmapped out-edges
            for (const e of this.dom.outEdges(v)) {
                if (this.emap.has(e))
                    continue;
                for (const codE of this.cod.outEdges(codV)) {
                    const m1 = this.copy();
                    if (m1.tryAddEdge(e, codE))
                        ms.push(m1);
                }
                return ms;
            }
        }
        // no partially-mapped neighbourhoods - try to seed a new vertex
        for (const v of this.dom.vertices()) {
            if (this.vmap.has(v))
                continue;
            for (const codV of this.cod.vertices()) {
                const m1 = this.copy();
                if (m1.tryAddVertex(v, codV))
                    ms.push(m1);
            }
            return ms;
        }
        return [];
    }
    isTotal() {
        return this.vmap.size === this.dom.numVertices() &&
            this.emap.size === this.dom.numEdges();
    }
    isSurjective() {
        return this.vimg.size === this.cod.numVertices() &&
            this.eimg.size === this.cod.numEdges();
    }
    isInjective() {
        return this.vmap.size === this.vimg.size;
    }
    isConvex() {
        if (!this.isInjective())
            return false;
        const mappedOutputs = this.dom.outputs()
            .filter(v => this.vmap.has(v))
            .map(v => this.vmap.get(v));
        const future = this.cod.successors(mappedOutputs);
        for (const v of this.dom.inputs()) {
            if (this.vmap.has(v) && future.has(this.vmap.get(v)))
                return false;
        }
        return true;
    }
}
// ---------------------------------------------------------------------------
// Matches - iterable search over all valid matches
// ---------------------------------------------------------------------------
/**
 * Lazily enumerates all matches from `dom` into `cod`.
 *
 * Implements both `Iterable<Match>` and `Iterator<Match>` so it can be used
 * directly in `for...of` loops or consumed one result at a time via `.next()`.
 */
export class Matches {
    matchStack;
    convex;
    constructor(dom, cod, initialMatch, convex = true) {
        if (initialMatch === undefined)
            initialMatch = new Match(dom, cod);
        this.convex = convex;
        if (initialMatch.mapScalars()) {
            this.matchStack = [initialMatch];
        }
        else {
            this.matchStack = [];
        }
    }
    [Symbol.iterator]() {
        return this;
    }
    next() {
        while (this.matchStack.length > 0) {
            const m = this.matchStack.pop();
            if (m.isTotal()) {
                matchLog('got successful match:\n' + m.toString());
                if (this.convex) {
                    if (m.isConvex()) {
                        matchLog('match is convex, returning');
                        return { value: m, done: false };
                    }
                    else {
                        matchLog('match is not convex, dropping');
                    }
                }
                else {
                    return { value: m, done: false };
                }
            }
            else {
                this.matchStack.push(...m.more());
            }
        }
        return { value: undefined, done: true };
    }
}
// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------
/** Returns an iterable of all (convex) matches from `dom` into `cod` */
export function matchGraph(dom, cod, convex = true) {
    return new Matches(dom, cod, undefined, convex);
}
/** Returns an iterable of all (convex) matches of the rule's LHS into `g` */
export function matchRule(r, g, convex = true) {
    return new Matches(r.lhs, g, undefined, convex);
}
/**
 * Finds an isomorphism from `g` to `h` that respects boundaries, or returns
 * `undefined` if none exists.
 */
export function findIso(g, h) {
    const gIn = g.inputs();
    const gOut = g.outputs();
    const hIn = h.inputs();
    const hOut = h.outputs();
    if (gIn.length !== hIn.length || gOut.length !== hOut.length)
        return undefined;
    const m0 = new Match(g, h);
    for (let i = 0; i < gIn.length; i++) {
        if (!m0.tryAddVertex(gIn[i], hIn[i]))
            return undefined;
    }
    for (let i = 0; i < gOut.length; i++) {
        if (!m0.tryAddVertex(gOut[i], hOut[i]))
            return undefined;
    }
    for (const m of new Matches(g, h, m0, false)) {
        if (m.isSurjective())
            return m;
    }
    return undefined;
}
