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

export class Term { }

export class Atom extends Term {
    ident: string;

    constructor(ident: string) {
        super();
        this.ident = ident;
    }

    toString(): string {
        return this.ident;
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
}

/**
 * Decompose a graph into regular and singular layers.
 *
 * Returns a list of edge layers. Note that this can modify `g` by introducing
 * extra vertices and identity boxes.
 */
export function layerDecomp(g: Graph): number[][] {
    const eLayers: number[][] = [];
    let vLayer: number[] = [];
    const vPlaced = new Set<number>();

    // Mark all inputs as placed; if an input is also an output, insert an id edge to break the overlap
    let outputs = new Set(g.outputs());
    for (const v of g.inputs()) {
        if (outputs.has(v)) g.insertIdAfter(v);
        vLayer.push(v);
        vPlaced.add(v);
    }

    const newIds = new Set<number>();
    const edges = new Set(g.edges());

    while (edges.size > 0) {
        // collect edges whose entire source is already placed
        const ready = new Set<number>();
        for (const e of edges) {
            if (g.source(e).every(v => vPlaced.has(v))) ready.add(e);
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
            throw new Error('Could not make progress. Is graph acyclic?');
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
    }

    // Minimise crossings: forward pass (it=0) then backward pass (it=1)
    for (let it = 0; it < 2; it++) {
        const indices = it === 0
            ? Array.from({ length: eLayers.length }, (_, i) => i)
            : Array.from({ length: eLayers.length }, (_, i) => eLayers.length - 1 - i);

        for (const j of indices) {
            const inp: number[] = j > 0
                ? eLayers[j - 1].flatMap(e => g.target(e))
                : [...g.inputs()];
            const inpPos = new Map<number, number>(inp.map((v, i) => [v, i / inp.length]));

            let outpPos: Map<number, number> | undefined;
            if (it !== 0) {
                const outp: number[] = j < eLayers.length - 1
                    ? eLayers[j + 1].flatMap(e => g.source(e))
                    : [...g.outputs()];
                outpPos = new Map(outp.map((v, i) => [v, i / outp.length]));
            }

            const ePos = new Map<number, number>();
            for (const e of eLayers[j]) {
                const src = g.source(e);
                let pos = src.length !== 0
                    ? src.reduce((sum, v) => sum + inpPos.get(v)!, 0) / src.length
                    : 0;

                if (outpPos !== undefined) {
                    const tgt = g.target(e);
                    pos += tgt.length !== 0
                        ? 2 * tgt.reduce((sum, v) => sum + outpPos!.get(v)!, 0) / tgt.length
                        : 0;
                }
                ePos.set(e, pos);
            }

            eLayers[j].sort((a, b) => ePos.get(a)! - ePos.get(b)!);
        }
    }

    return eLayers;
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
