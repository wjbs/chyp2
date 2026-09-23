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

import { Graph, GraphError } from './graph.ts';
import { inversionsBetween, inversionsWRT } from './util.ts';

export class Term {
    toGraph(_defs: (name: string) => Graph | null): Graph {
        return new Graph();
    }

    toString(): string {
        return "id0";
    }
}

export class Atom extends Term {
    ident: string;

    constructor(ident: string) {
        super();
        this.ident = ident;
    }

    toString(): string {
        return this.ident;
    }

    toGraph(defs: (name: string) => Graph | null): Graph {
        if (this.ident === 'id') {
            return Graph.identity();
        } else if (this.ident === 'id0') {
            return new Graph();
        } else {
            const g = defs(this.ident);
            if (g) return g.copy();
            else throw new GraphError(`Can't find identifier: ${this.ident}`);
        }
    }
}

export class Perm extends Term {
    perm: number[];

    constructor(perm: number[]) {
        super();
        this.perm = perm;
    }

    toString(): string {
        return 'sw[' + this.perm.join(', ') + ']';
    }

    toGraph(_defs: (name: string) => Graph | null): Graph {
        return Graph.perm(this.perm);
    }
}

export class Seq extends Term {
    children: Term[];

    constructor(children: Term[] = []) {
        super();
        this.children = children;
    }

    toString(): string {
        return this.children.map(c => {
            if (c instanceof Seq) {
                return '(' + c.toString() + ')';
            } else {
                return c.toString();
            }
        }).join(' ; ');
    }

    toGraph(defs: (name: string) => Graph | null): Graph {
        if (this.children.length === 0) {
            return new Graph();
        } else {
            const [first, ...rest] = this.children;
            return rest.reduce((g, c) => g.compose(c.toGraph(defs)), first.toGraph(defs));
        }
    }
}

export class Par extends Term {
    children: Term[];

    constructor(children: Term[] = []) {
        super();
        this.children = children;
    }

    toString(): string {
        return this.children.map(c => {
            if (c instanceof Seq || c instanceof Par) {
                return '(' + c.toString() + ')';
            } else {
                return c.toString();
            }
        }).join(' * ');
    }

    toGraph(defs: (name: string) => Graph | null): Graph {
        if (this.children.length === 0) {
            return new Graph();
        } else {
            return this.children.reduce((g, c) => g.tensor(c.toGraph(defs)), new Graph());
        }
    }
}


function sortEdges(ordering : number[], vs : number[], ws : number[]) : number {
    return -(inversionsBetween(ordering, vs, ws) - inversionsBetween(ordering, ws, vs));
}

interface Edge {
    id : number;
    s : number[];
    t : number[];
}

// Source - https://stackoverflow.com/a/37580979
// Posted by le_m, modified by community. See post 'Timeline' for change history
// Retrieved 2026-09-22, License - CC BY-SA 4.0
function permute<T>(permutation : T[]) : T[][] {
    var length = permutation.length;
    const result = [permutation.slice()];
    const c = new Array(length).fill(0);
    let i = 1, k, p;

    while (i < length) {
        if (c[i] < i) {
            k = i % 2 && c[i];
            p = permutation[i];
            permutation[i] = permutation[k];
            permutation[k] = p;
            ++c[i];
            i = 1;
            result.push(permutation.slice());
        } else {
            c[i] = 0;
            ++i;
        }
    }
    return result;
}

/**
 * Returns the permutation of a layer decomposition with the fewest number
 * of inversions required between different layers. `bestKnown`, if present
 * and not equal to -1, specifies the number of inversions of the best known
 * solution; more expensive solutions will be ignored (this may result in 
 * returning `null`).
 */
function optimizeLayerDecompExpensive(inputs : number[], 
        eLayersWithData : Edge[][], outputs : number[],
        bestKnown : number | null = null) : 
        {numInvs : number, ld : Edge[][]} | null {
    if (bestKnown === 0) return null;
    if (eLayersWithData.length === 0) {
        return {numInvs : inversionsWRT(inputs, outputs), ld : eLayersWithData};
    }
    let bestSolution : {numInvs : number, ld : Edge[][]} | null = null;
    const eLayer = eLayersWithData[eLayersWithData.length-1];
    const eLayers = eLayersWithData.slice(0, -1);
    for (const eLayerP of permute(eLayer.slice())) {
        const elo : number[] = Array(0).concat(...eLayerP.map(e=>e.t));
        const outInvs = inversionsWRT(elo, outputs);
        if (bestKnown !== null && bestKnown <= outInvs) continue;

        const eli : number[] = Array(0).concat(...eLayerP.map(e=>e.s));

        const best_rec = optimizeLayerDecompExpensive(inputs, eLayers, eli, bestKnown);
        if (best_rec === null) continue;
        if (bestSolution === null) {
            bestSolution = {numInvs : best_rec.numInvs + outInvs, ld : [...best_rec.ld, eLayerP]};
        }
        else {
            const invs = best_rec.numInvs + outInvs;
            if (invs < bestSolution.numInvs) {
                bestSolution = {numInvs : best_rec.numInvs + outInvs, ld : [...best_rec.ld, eLayerP]};
            }
        }
        bestKnown = bestKnown === null ? bestSolution.numInvs : Math.min(bestKnown, bestSolution.numInvs);
    }
    return bestSolution;
}

function getLayerDecompInvs(inputs : number[], ld : Edge[][], outputs : number[]) : number {
    if (ld.length === 0) return inversionsWRT(inputs, outputs);
    const el = ld[0];
    const lds = ld.slice(1);
    const eli = el.flatMap(e => e.s);
    const elo = el.flatMap(e => e.t);
    // console.log("gldi: ", [...el], [...lds], [...inputs], [...eli], [...elo], [...outputs], 
    //     // inversionsWRT(inputs, eli), getLayerDecompInvs(elo, lds, outputs)
    // );
    return inversionsWRT(inputs, eli) + getLayerDecompInvs(elo, lds, outputs);
}

// (window as any).gLDI = getLayerDecompInvs;

/**
 * Decompose a graph into regular and singular layers.
 *
 * Returns a list of edge layers. Note that this can modify `g` by introducing
 * extra vertices and identity boxes.
 */
export function layerDecomp(g: Graph): number[][] {
    g.removeIds() // Remove all internal identities
    const eLayers: number[][] = [];
    let vLayer: number[] = [];
    const vPlaced = new Set<number>();
    const vCanBePlaced = new Map<number, number>();

    // Mark all inputs as placed; if an input is also an output, insert an id edge to break the overlap
    let outputs = new Set(g.outputs());
    for (const v of g.inputs()) {
        if (outputs.has(v)) g.insertIdAfter(v);
        vLayer.push(v);
        vPlaced.add(v);
    }

    const newIds = new Set<number>();
    const edges = new Set(g.edges());
    const sourcelessEdges = new Set<number>();

    // Determine the vertices that are available for placement at any point
    // (because they are in the target of an edge with empty source)
    for (const e of [...edges]) {
        const ed = g.edgeData(e);
        if (ed.s.length === 0) {
            sourcelessEdges.add(e);
            edges.delete(e);
            for (const v of ed.t) {
                vCanBePlaced.set(v, e);
            }
        }
    }

    function addToLastLayer(e : number){
        const l = eLayers.pop();
        if (l === undefined) {
            const newLayer = [e];
            for (const _v of [...g.inputs()]) {
                // Insert identities for all inputs
                // var newEdge : number;
                // const vouts = [...g.vertexData(v).outEdges];
                // if (vouts.length === 1 && g.edgeData(vouts[0]).value == 'id') {
                //     newEdge = vouts[0];
                // }
                // else {
                //     newEdge = g.insertIdAfter(v);
                // }
                // const newEdge = g.insertIdAfter(v);
                // newLayer.push(newEdge);
                // vPlaced.add(g.target(newEdge)[0]);
                // vLayer.push(g.target(newEdge)[0])
            }
            eLayers.push(newLayer);
        }
        else {
            if (!(l.includes(e))) {
                l.push(e);
            }
            eLayers.push(l);
        }
    }

    var firstTime = true;

    while (edges.size > 0) {
        // collect edges whose entire source is already placed, or could be using sourceless edges
        const ready = new Set<number>();
        for (const e of edges) {
            const s = g.source(e);
            if (s.length !== 0 && 
                firstTime ? s.every (v => vPlaced.has(v)) : 
                s.every(v => vPlaced.has(v)||vCanBePlaced.has(v))) ready.add(e);
        }

        // add the necessary vertices from sourceless edges to the previous layer
        // var usedSourceless = false;
        for (const e of ready) {
            const ed = g.edgeData(e);
            for (const v of ed.s) {
                const edgeDependency = vCanBePlaced.get(v);
                if (edgeDependency !== undefined) {
                    // usedSourceless = true;
                    addToLastLayer(edgeDependency);
                    vPlaced.add(v);
                    sourcelessEdges.delete(edgeDependency);
                }
            }
        }

        // for each vertex in the current layer, insert an id edge if the vertex is a current
        // output or has any out-edge that is not yet ready — this ensures a regular layer structure
        outputs = new Set(g.outputs());
        for (const v of vLayer) {
            if (outputs.has(v) || [...g.outEdges(v)].some(e => !ready.has(e))) {
                const newEdge = g.insertIdAfter(v);
                newIds.add(newEdge);
                ready.add(newEdge);
            }
        }

        const eLayer: number[] = [];
        for (const e of ready) {
            eLayer.push(e);
            edges.delete(e);
        }

        if (eLayer.every(e => newIds.has(e))) {
            if (sourcelessEdges.size !== 0) {
                sourcelessEdges.forEach(e => eLayer.push(e))
            }
            else {
                throw new Error('Could not make progress. Is graph acyclic?');
            }
        }

        eLayers.push(eLayer);

        if (edges.size > 0) {
            vLayer = [];
            for (const e of eLayer) {
                for (const v of g.target(e)) {
                    vPlaced.add(v);
                    vLayer.push(v);
                }
            }
        }

        firstTime = false;
    }

    const unplacedSourceless = [... sourcelessEdges];
    if (unplacedSourceless.length !== 0) {
        eLayers.push(unplacedSourceless);
    }

    // Minimise crossings by sorting with respect to an inversions metric
    const eLayersWithData : Edge[][]
        = []; // Each entry is [eLayerWithData],
            // where each entry of [eLayerWithData] is [e, s, t]
    
    for (let i = 0; i < eLayers.length; i ++) {
        const es : number[] = eLayers[i];
        const esWithData : Edge[] = es.map(e => {
            const ed = g.edgeData(e);
            return {id:e, s:ed.s, t:ed.t}
        });
        eLayersWithData.push(esWithData);
    }

    // Forward pass
    var verticesOfPrevLayer : number[] = g.inputs();
    for (let i = 0; i < eLayers.length; i ++) {
        const esWithData : Edge[] = eLayersWithData[i];
        // console.log('order:', [...verticesOfPrevLayer], 'sorting:', [...esWithData]);
        esWithData.sort(({s:s1}, {s:s2}) =>
            sortEdges(verticesOfPrevLayer, s1, s2));
        // console.log('sorted as:', [...esWithData], 'value:', [...eLayersWithData[i]]);
        eLayersWithData[i] = esWithData;
        verticesOfPrevLayer = esWithData.reduce<number[]>((vs, {t}) => vs.concat(t), [])
    }

    // Backwards pass
    var verticesOfNextLayer : number[] = g.outputs();
    for (let i = eLayers.length - 1; 0 <= i; i --) {
        const esWithData : Edge[] = eLayersWithData[i];
        const verticesOfPrevLayer : number[] = i === 0 ? g.inputs() 
            : eLayersWithData[i].reduce<number[]>((vs, {t}) => vs.concat(t), [])
        esWithData.sort(function ({s:s1,t:t1}, {s:s2,t:t2}) {
            let ssort = sortEdges(verticesOfPrevLayer, s1, s2);
            if (ssort !== 0) {
                return ssort
            }
            return sortEdges(verticesOfNextLayer, t1, t2)});
        eLayersWithData[i] = esWithData;
        verticesOfNextLayer = esWithData.reduce<number[]>((vs, {s}) => vs.concat(s), [])
    }

    var eLWD : Edge[][];
    if (g.numEdges() < 30 && eLayersWithData.every(el => el.length <= 6)) {


        const eLWD_invs = getLayerDecompInvs(g.inputs(), eLayersWithData, g.outputs());
        const eLWD_opt = optimizeLayerDecompExpensive(g.inputs(), [...eLayersWithData], 
            g.outputs(), eLWD_invs);
        
        eLWD = eLWD_opt === null ? eLayersWithData : eLWD_opt.ld;

        // console.log("orig: ", eLayersWithData, "cost: ", eLWD_invs, "new?: ", eLWD_opt,
        //     g.inputs(), g.outputs()
        // );
    }
    else {
        eLWD = eLayersWithData;
    }

    return eLWD.map(es => es.map(({id:e}) => e));
}

/** Convert a permutation to its string representation */
export function permToString(perm: number[]): string {
    if (perm.length === 1) return 'id';
    if (perm.length === 2) return 'sw';
    return 'sw[' + perm.join(', ') + ']';
}

/**
 * Split a permutation into a tensor product of independent sub-permutations.
 *
 * The input permutation is split at the earliest index where the maximum value
 * seen so far equals the current index.
 */
export function splitPerm(perm: number[]): number[][] {
    const perms: number[][] = [];
    let rest = [...perm];

    while (rest.length > 0) {
        let m = 0;
        for (let i = 0; i < rest.length; i++) {
            m = Math.max(rest[i], m);
            if (m <= i) {
                perms.push(rest.slice(0, i + 1));
                rest = rest.slice(i + 1).map(y => y - (i + 1));
                break;
            }
        }
    }

    return perms;
}

/**
 * Convert a graph to a term string.
 *
 * Currently only works for monogamous acyclic graphs (symmetric monoidal terms).
 */
export function graphToTerm(g: Graph): Term {
    g = g.copy();
    const eLayers = layerDecomp(g);

    let inLayer = [...g.inputs()];
    const seq = new Seq();

    for (let i = 0; i < eLayers.length; i++) {
        // permutation from current vertex layer to sources of this edge layer
        const vPos = new Map<number, number>(inLayer.map((v, j) => [v, j]));
        const outLayer = eLayers[i].flatMap(e => g.source(e));
        const vPerm = outLayer.map(v => vPos.get(v)!);

        if (!vPerm.every((x, j) => x === j)) {
            const perms = splitPerm(vPerm);
            if (perms.length == 1) {
                seq.children.push(new Perm(perms[0]));
            } else {
                seq.children.push(new Par(perms.map(perm => new Perm(perm))));
            }
        }

        // parallel composition of this edge layer
        if (eLayers[i].length === 1) {
            seq.children.push(new Atom(String(g.edgeData(eLayers[i][0]).value)));
        } else {
            seq.children.push(new Par(eLayers[i].map(e => new Atom(String(g.edgeData(e).value)))));
        }

        inLayer = eLayers[i].flatMap(e => g.target(e));
    }

    // final permutation from last vertex layer to graph outputs
    const vPos = new Map<number, number>(inLayer.map((v, j) => [v, j]));
    const outLayer = [...g.outputs()];
    const vPerm = outLayer.map(v => vPos.get(v)!);

    if (!vPerm.every((x, j) => x === j)) {
        const perms = splitPerm(vPerm);
        if (perms.length == 1) {
            seq.children.push(new Perm(perms[0]));
        } else {
            seq.children.push(new Par(perms.map(perm => new Perm(perm))));
        }
    }

    if (seq.children.length === 1) {
        return seq.children[0];
    } else {
        return seq;
    }
}
