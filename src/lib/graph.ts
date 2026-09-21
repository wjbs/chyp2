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

import {getTextWidth, SCALE} from './util.ts';

export class GraphError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GraphError';
    }
}

/** The data associated with a single vertex */
export class VData {
    value: unknown;
    x: number;
    y: number;
    highlight: boolean;
    inEdges: Set<number>;
    outEdges: Set<number>;
    inIndices: Set<number>;
    outIndices: Set<number>;

    constructor(x: number = 0, y: number = 0, value: unknown = '') {
        this.value = value;
        this.x = x;
        this.y = y;
        this.highlight = false;
        this.inEdges = new Set();
        this.outEdges = new Set();
        this.inIndices = new Set();
        this.outIndices = new Set();
    }
}

/** The data associated with a single edge */
export class EData {
    value: string;
    highlight: boolean;
    x: number;
    y: number;
    width : number;
    height : number;
    s: number[];
    t: number[];
    fg: string;
    bg: string;
    hyper: boolean;

    constructor(
        s: number[] = [],
        t: number[] = [],
        value: string = '',
        x: number = 0,
        y: number = 0,
        width: number|null = null,
        height: number|null = null,
        fg: string = '',
        bg: string = '',
        hyper: boolean = true
    ) {
        this.value = value;
        this.highlight = false;
        this.x = x;
        this.y = y;
        this.width = width ?? 
            (value !== 'id' ? 
                Math.max(1, getTextWidth(value) / (SCALE / 3.75) + 0.4) 
                : 0);
        this.height = height ?? (s.length <= 1 && t.length <= 1 ? 1 : 2);
        this.s = s;
        this.t = t;
        this.fg = fg;
        this.bg = bg;
        this.hyper = hyper;
    }

    toString(): string {
        return `Edge: ${this.value} (${this.x}, ${this.y})`;
    }
}

/**
 * A hypergraph with boundaries.
 *
 * This is the main data structure used by Chyp. It represents a directed hypergraph
 * as two maps for vertices and (hyper)edges. Each vertex is associated with a `VData`
 * object and each edge with an `EData` object, which stores adjacency, position, label, etc.
 *
 * Each hyperedge has a list of source vertices and a list of target vertices. The graph
 * itself also has a list of input vertices and a list of output vertices, used for
 * sequential composition and rewriting.
 */
export class Graph {
    vdata: Map<number, VData>;
    edata: Map<number, EData>;
    private _inputs: number[];
    private _outputs: number[];
    vindex: number;
    eindex: number;
    laidOut: boolean = false;

    constructor() {
        this.vdata = new Map();
        this.edata = new Map();
        this._inputs = [];
        this._outputs = [];
        this.vindex = 0;
        this.eindex = 0;
    }

    /** Make a copy of the graph */
    copy(): Graph {
        const g = new Graph();
        for (const [k, vd] of this.vdata) {
            const vd2 = new VData(vd.x, vd.y, vd.value);
            vd2.highlight = vd.highlight;
            vd2.inEdges = new Set(vd.inEdges);
            vd2.outEdges = new Set(vd.outEdges);
            vd2.inIndices = new Set(vd.inIndices);
            vd2.outIndices = new Set(vd.outIndices);
            g.vdata.set(k, vd2);
        }
        for (const [k, ed] of this.edata) {
            const ed2 = new EData([...ed.s], [...ed.t], ed.value, ed.x, ed.y, ed.width, ed.height, ed.fg, ed.bg, ed.hyper);
            ed2.highlight = ed.highlight;
            g.edata.set(k, ed2);
        }
        g._inputs = [...this._inputs];
        g._outputs = [...this._outputs];
        g.vindex = this.vindex;
        g.eindex = this.eindex;
        return g;
    }

    /** Returns an iterator over the vertices in the graph */
    vertices(): IterableIterator<number> {
        return this.vdata.keys();
    }

    /** Returns an iterator over the edges in the graph */
    edges(): IterableIterator<number> {
        return this.edata.keys();
    }

    /** The number of vertices */
    numVertices(): number {
        return this.vdata.size;
    }

    /** The number of edges */
    numEdges(): number {
        return this.edata.size;
    }

    /** Returns the VData associated with a given vertex */
    vertexData(v: number): VData {
        return this.vdata.get(v)!;
    }

    /** Returns the EData associated with a given edge */
    edgeData(e: number): EData {
        return this.edata.get(e)!;
    }

    /** Returns the set of edges that have `v` as a target */
    inEdges(v: number): Set<number> {
        return this.vdata.get(v)!.inEdges;
    }

    /** Returns the set of edges that have `v` as a source */
    outEdges(v: number): Set<number> {
        return this.vdata.get(v)!.outEdges;
    }

    /** Returns the list of source vertices associated with an edge */
    source(e: number): number[] {
        return this.edata.get(e)!.s;
    }

    /** Returns the list of target vertices associated with an edge */
    target(e: number): number[] {
        return this.edata.get(e)!.t;
    }

    /**
     * Add a vertex to the graph.
     *
     * @param x     The X coordinate to draw the vertex
     * @param y     The Y coordinate
     * @param value The value carried by this vertex (empty string by default)
     * @param name  An optional name; if -1, the name is assigned automatically
     */
    addVertex(x: number = 0, y: number = 0, value: unknown = '', name: number = -1): number {
        let v: number;
        if (name === -1) {
            v = this.vindex;
            this.vindex += 1;
        } else {
            v = name;
            this.vindex = Math.max(name, this.vindex) + 1;
        }
        this.vdata.set(v, new VData(x, y, value));
        return v;
    }

    /**
     * Add an edge to the graph.
     *
     * @param s     A list of source vertices
     * @param t     A list of target vertices
     * @param value The value carried by this edge (typically a string)
     * @param x     The X coordinate to draw the box representing this hyperedge
     * @param y     The Y coordinate
     * @param fg    Optional foreground color as a 6-digit RGB hex code
     * @param bg    Optional background color as a 6-digit RGB hex code
     * @param hyper Hint to the GUI about how to draw this edge
     * @param name  An optional name; if -1, the name is assigned automatically
     */
    addEdge(
        s: number[],
        t: number[],
        value: string = '',
        x: number = 0,
        y: number = 0,
        width: number|null = null,
        height: number|null = null,
        fg: string = '',
        bg: string = '',
        hyper: boolean = true,
        name: number = -1
    ): number {
        let e: number;
        if (name === -1) {
            e = this.eindex;
            this.eindex += 1;
        } else {
            e = name;
            this.eindex = Math.max(name, this.eindex) + 1;
        }
        this.edata.set(e, new EData(s, t, value, x, y, width, height, fg, bg, hyper));
        for (const v of s) this.vdata.get(v)!.outEdges.add(e);
        for (const v of t) this.vdata.get(v)!.inEdges.add(e);
        return e;
    }

    /**
     * Remove a vertex.
     *
     * If `strict` is true the vertex must have no adjacent edges. If false, `v` will
     * be removed from the source/target list of all adjacent edges.
     *
     * @param v      A vertex to remove
     * @param strict If true, require the vertex to have no adjacent edges
     */
    removeVertex(v: number, strict: boolean = false): void {
        if (strict) {
            const vd = this.vertexData(v);
            if (vd.inEdges.size > 0 || vd.outEdges.size > 0) {
                throw new Error('Attempting to remove vertex with adjacent edges');
            }
            if (this.inputs().includes(v) || this.outputs().includes(v)) {
                throw new Error('Attempting to remove boundary vertex');
            }
        } else {
            for (const e of this.vertexData(v).inEdges) {
                this.edgeData(e).t = this.edgeData(e).t.filter(v1 => v1 !== v);
            }
            for (const e of this.vertexData(v).outEdges) {
                this.edgeData(e).s = this.edgeData(e).s.filter(v1 => v1 !== v);
            }
            this.setInputs(this.inputs().filter(v1 => v1 !== v));
            this.setOutputs(this.outputs().filter(v1 => v1 !== v));
        }
        this.vdata.delete(v);
    }

    /** Remove an edge */
    removeEdge(e: number): void {
        for (const v of this.edgeData(e).s) {
            this.vertexData(v).outEdges.delete(e);
        }
        for (const v of this.edgeData(e).t) {
            this.vertexData(v).inEdges.delete(e);
        }
        this.edata.delete(e);
    }

    addInputs(inp: number[]): void {
        const i1 = this._inputs.length;
        const i2 = i1 + inp.length;
        this._inputs.push(...inp);
        for (let i = i1; i < i2; i++) {
            this.vdata.get(this._inputs[i])!.inIndices.add(i);
        }
    }

    addOutputs(outp: number[]): void {
        const i1 = this._outputs.length;
        const i2 = i1 + outp.length;
        this._outputs.push(...outp);
        for (let i = i1; i < i2; i++) {
            this.vdata.get(this._outputs[i])!.outIndices.add(i);
        }
    }

    setInputs(inp: number[]): void {
        this._inputs = inp;
        for (const d of this.vdata.values()) {
            d.inIndices.clear();
        }
        for (let i = 0; i < this._inputs.length; i++) {
            this.vdata.get(this._inputs[i])!.inIndices.add(i);
        }
    }

    setOutputs(outp: number[]): void {
        this._outputs = outp;
        for (const d of this.vdata.values()) {
            d.outIndices.clear();
        }
        for (let i = 0; i < this._outputs.length; i++) {
            this.vdata.get(this._outputs[i])!.outIndices.add(i);
        }
    }

    inputs(): number[] {
        return this._inputs;
    }

    outputs(): number[] {
        return this._outputs;
    }

    isInput(v: number): boolean {
        return this.vdata.get(v)!.inIndices.size > 0;
    }

    isOutput(v: number): boolean {
        return this.vdata.get(v)!.outIndices.size > 0;
    }

    isBoundary(v: number): boolean {
        return this.isInput(v) || this.isOutput(v);
    }

    successors(vs: Iterable<number>): Set<number> {
        const succ: Set<number> = new Set();
        const current = [...vs];
        while (current.length > 0) {
            const v = current.pop()!;
            for (const e of this.outEdges(v)) {
                for (const v1 of this.target(e)) {
                    if (!succ.has(v1)) {
                        succ.add(v1);
                        current.push(v1);
                    }
                }
            }
        }
        return succ;
    }

    /**
     * Compute bounding box of the graph as [minX, maxX, minY, maxY]
     */
    boundingBox(): [number, number, number, number] {
        if (this.vdata.size === 0 && this.edata.size === 0) {
            return [-0.5, 0.5, -0.5, 0.5];
        }
        const vXs0 = [...this.vdata.values()].map(vd => vd.x - 0.5);
        const vXs1 = [...this.vdata.values()].map(vd => vd.x + 0.5);
        const vYs0 = [...this.vdata.values()].map(vd => vd.y - 0.5);
        const vYs1 = [...this.vdata.values()].map(vd => vd.y + 0.5);
        const eXs0 = [...this.edata.values()].map(ed => ed.x - (ed.width + 1) * 0.5);
        const eXs1 = [...this.edata.values()].map(ed => ed.x + (ed.width + 1) * 0.5);
        const eYs0 = [...this.edata.values()].map(ed => ed.y - (ed.height + 1) * 0.5);
        const eYs1 = [...this.edata.values()].map(ed => ed.y + (ed.height + 1) * 0.5);
        const minX = Math.min(...vXs0, ...eXs0);
        const maxX = Math.max(...vXs1, ...eXs1);
        const minY = Math.min(...vYs0, ...eYs0);
        const maxY = Math.max(...vYs1, ...eYs1);
        return [minX, maxX, minY, maxY];
    }

    /**
     * Identify the two vertices given.
     *
     * Forms the quotient of the graph by identifying v with w. Afterwards, the
     * quotiented vertex will be named v.
     */
    mergeVertices(v: number, w: number): void {
        const vd = this.vertexData(v);

        for (const e of this.inEdges(w)) {
            const ed = this.edgeData(e);
            ed.t = ed.t.map(x => (x === w ? v : x));
            vd.inEdges.add(e);
        }

        for (const e of this.outEdges(w)) {
            const ed = this.edgeData(e);
            ed.s = ed.s.map(x => (x === w ? v : x));
            vd.outEdges.add(e);
        }

        this.setInputs(this.inputs().map(x => (x === w ? v : x)));
        this.setOutputs(this.outputs().map(x => (x === w ? v : x)));
        this.removeVertex(w);
    }

    /**
     * Split a vertex into one copy for each input, in-tentacle, output, and out-tentacle.
     *
     * Used for computing pushout complements of rules that aren't left-linear. Returns
     * a pair of arrays containing the new input-like and output-like vertices, respectively.
     */
    explodeVertex(v: number): [number[], number[]] {
        const newVs: [number[], number[]] = [[], []];
        const vd = this.vertexData(v);
        const fresh = (j: 0 | 1): number => {
            const v1 = this.addVertex(vd.x, vd.y, vd.value);
            newVs[j].push(v1);
            return v1;
        };

        this.setInputs(this.inputs().map(v1 => (v1 !== v ? v1 : fresh(0))));

        for (const e of vd.inEdges) {
            const ed = this.edgeData(e);
            for (let i = 0; i < ed.t.length; i++) {
                if (ed.t[i] === v) {
                    ed.t[i] = fresh(0);
                    this.vertexData(ed.t[i]).inEdges.add(e);
                }
            }
        }

        this.setOutputs(this.outputs().map(v1 => (v1 !== v ? v1 : fresh(1))));

        for (const e of vd.outEdges) {
            const ed = this.edgeData(e);
            for (let i = 0; i < ed.s.length; i++) {
                if (ed.s[i] === v) {
                    ed.s[i] = fresh(1);
                    this.vertexData(ed.s[i]).outEdges.add(e);
                }
            }
        }

        vd.inEdges = new Set();
        vd.outEdges = new Set();
        this.removeVertex(v, true);

        return newVs;
    }

    /**
     * Insert a new identity hyperedge after the given vertex.
     *
     * Inserts a dummy identity box with source at the given vertex and redirects any
     * out-edges or outputs to the target of the new hyperedge. If `reverse` is true,
     * the source and target of the identity wire are flipped.
     */
    insertIdAfter(v: number, reverse: boolean = false): number {
        const vd = this.vertexData(v);
        const shift = reverse ? -1.5 : 1.5;
        const w = this.addVertex(vd.x + 2 * shift, vd.y, vd.value);
        const wd = this.vertexData(w);
        wd.highlight = vd.highlight;
        this.setOutputs(this.outputs().map(x => (x !== v ? x : w)));
        for (const e of vd.outEdges) {
            const ed = this.edgeData(e);
            ed.s = ed.s.map(x => (x !== v ? x : w));
            wd.outEdges.add(e);
        }
        vd.outEdges.clear();

        const [s, t] = !reverse ? [[v], [w]] : [[w], [v]];
        const e = this.addEdge(s, t, 'id', vd.x + shift, vd.y);
        this.edgeData(e).highlight = vd.highlight;
        return e;
    }

    /**
     * Returns the monoidal product of this graph with `other`
     * 
     * @param layout If true, the vertices and edges of `other` will be shifted
     *               downwards to avoid overlap with those of this graph.
     *
     */
    tensor(other: Graph, layout: boolean = true): Graph {
        const g = this.copy();
        const vmap = new Map<number, number>();

        let minOther = 0;
        if (layout) {
            const vYs = [...g.vdata.values()].map(vd => vd.y);
            const eYs = [...g.edata.values()].map(ed => ed.y);
            const maxSelf = Math.max(0, ...vYs, ...eYs);

            const ovYs = [...other.vdata.values()].map(vd => vd.y);
            const oeYs = [...other.edata.values()].map(ed => ed.y);
            minOther = Math.min(0, ...ovYs, ...oeYs);

            for (const v of g.vertices()) g.vertexData(v).y -= maxSelf;
            for (const e of g.edges()) g.edgeData(e).y -= maxSelf;
        }

        for (const v of other.vertices()) {
            const vd = other.vertexData(v);
            vmap.set(v, g.addVertex(vd.x, vd.y - minOther + 1, vd.value));
        }

        for (const e of other.edges()) {
            const ed = other.edgeData(e);
            g.addEdge(
                ed.s.map(v => vmap.get(v)!),
                ed.t.map(v => vmap.get(v)!),
                ed.value, ed.x, ed.y - minOther + 1, 
                ed.width, ed.height, ed.fg, ed.bg, ed.hyper
            );
        }

        g.addInputs(other.inputs().map(v => vmap.get(v)!));
        g.addOutputs(other.outputs().map(v => vmap.get(v)!));
        return g;
    }

    /**
     * Returns the composition of this graph with `other` in diagram order.
     */
    compose(other: Graph): Graph {
        const g = this.copy();
        const vmap = new Map<number, number>();

        const vXs = [...g.vdata.values()].map(vd => vd.x);
        const eXs = [...g.edata.values()].map(ed => ed.x);
        const maxSelf = Math.max(0, ...vXs, ...eXs);

        const ovXs = [...other.vdata.values()].map(vd => vd.x);
        const oeXs = [...other.edata.values()].map(ed => ed.x);
        const minOther = Math.min(0, ...ovXs, ...oeXs);

        for (const v of g.vertices()) g.vertexData(v).x -= maxSelf;
        for (const e of g.edges()) g.edgeData(e).x -= maxSelf;

        for (const v of other.vertices()) {
            const vd = other.vertexData(v);
            vmap.set(v, g.addVertex(vd.x - minOther, vd.y, vd.value));
        }

        for (const e of other.edges()) {
            const ed = other.edgeData(e);
            g.addEdge(
                ed.s.map(v => vmap.get(v)!),
                ed.t.map(v => vmap.get(v)!),
                ed.value, ed.x - minOther, ed.y, 
                ed.width, ed.height, ed.fg, ed.bg, ed.hyper
            );
        }

        const plug1 = g.outputs();
        const plug2 = other.inputs().map(v => vmap.get(v)!);
        const quotient = new Map<number, number>();

        if (plug1.length !== plug2.length) {
            throw new GraphError(
                `Attempting to plug a graph with ${plug1.length} outputs into one with ${plug2.length} inputs`
            );
        }

        g.setOutputs(other.outputs().map(v => vmap.get(v)!));

        for (let i = 0; i < plug1.length; i++) {
            let p1 = plug1[i];
            let p2 = plug2[i];
            while (quotient.has(p1)) p1 = quotient.get(p1)!;
            while (quotient.has(p2)) p2 = quotient.get(p2)!;
            if (p1 !== p2) {
                g.mergeVertices(p1, p2);
                quotient.set(p2, p1);
            }
        }

        return g;
    }

    /**
     * Set the `highlight` flag for a set of vertices and edges.
     *
     * Any vertices/edges not in the provided sets will be un-highlighted.
     */
    highlight(vertices: Set<number>, edges: Set<number>): void {
        for (const [v, vd] of this.vdata) {
            vd.highlight = vertices.has(v);
        }
        for (const [e, ed] of this.edata) {
            ed.highlight = edges.has(e);
        }
    }

    /** Clear the `highlight` flag for all vertices and edges */
    unhighlight(): void {
        for (const vd of this.vdata.values()) {
            vd.highlight = false;
        }
        for (const ed of this.edata.values()) {
            ed.highlight = false;
        }
    }

    /**
     * For each identity edge in the graph, merge the vertices.
     * Returns true if the graph is changed, and false otherwise.
     */
    private removeIdsOnce(onlyInternal : Boolean): Boolean {
        let usedVertices = new Set<number>;
        let toQuotient : [number[],number[]][] = [];
        let toRemove : number[] = [];
        for (const [i,ed] of this.edata.entries()) {
            if (ed.value === 'id' && ed.s.length === ed.t.length) {
                if ((ed.s.concat(ed.t)).every(
                        v => !usedVertices.has(v) &&
                                onlyInternal ? this.isBoundary(v) : true)) {
                    toQuotient.push([ed.s, ed.t]);
                    (ed.s.concat(ed.t)).forEach(e => usedVertices.add(e));
                    toRemove.push(i);
                }
            }
        }
        if (toRemove.length === 0) {
            return false;
        }
        for (const i of toRemove) {
            this.removeEdge(i);
        }
        for (const [s, t] of toQuotient) {
            const n = s.length;
            for (let i = 0; i < n; i++) {
                this.mergeVertices(s[i], t[i]);
            }
        }
        return true
    }
    removeIds(onlyInternal=true): Boolean {
        let changed = false;
        while(this.removeIdsOnce(onlyInternal)) {changed = true};
        return changed
    }

    /**
     * Returns a graph with a single hyperedge and the given number of inputs/outputs.
     *
     * @param value    The label for the hyperedge
     * @param arity    The number of input vertices connected to the source of the edge
     * @param coarity  The number of output vertices connected to the target of the edge
     * @param fg       Optional foreground color as a 6-digit RGB hex code
     * @param bg       Optional background color as a 6-digit RGB hex code
     */
    public static gen(value: string, arity: number, coarity: number, 
            width: number|null = null, height: number|null = null, fg: string = '', bg: string = ''): Graph {
        const g = new Graph();
        const inputs = Array.from({ length: arity }, (_, i) => g.addVertex(-1.5, i - (arity - 1) / 2));
        const outputs = Array.from({ length: coarity }, (_, i) => g.addVertex(1.5, i - (coarity - 1) / 2));
        g.addEdge(inputs, outputs, value, 0, 0, width, height, fg, bg);
        g.setInputs(inputs);
        g.setOutputs(outputs);
        return g;
    }

    /**
     * Returns a graph with a single hyperedge and the given number of inputs/outputs.
     *
     * @param value    The label for the hyperedge
     * @param domain   The values of input vertices connected to the source of the edge
     * @param codomain The values of output vertices connected to the target of the edge
     * @param fg       Optional foreground color as a 6-digit RGB hex code
     * @param bg       Optional background color as a 6-digit RGB hex code
     */
    public static mgen(value: string, domain: unknown[], codomain: unknown[], 
            width: number|null = null, height: number|null = null, fg: string = '', bg: string = ''): Graph {
        const g = new Graph();
        const arity = domain.length;
        const coarity = codomain.length;
        const inputs = domain.map((val, i) => g.addVertex(-1.5, i - (arity - 1) / 2, val));
        const outputs = codomain.map((val, i) => g.addVertex(1.5, i - (coarity - 1) / 2, val));
        g.addEdge(inputs, outputs, value, 0, 0, width, height, fg, bg);
        g.setInputs(inputs);
        g.setOutputs(outputs);
        return g;
    }

    /**
     * Returns a graph corresponding to the given sized permutation.
     *
     * The permutation is given as a list [x0,..,x(n-1)], interpreted as { x0 -> 0, x1 -> 1, ..., x(n-1) -> n-1 }.
     * Input xj is mapped to the same vertex as output j.
     *
     * @param p A permutation as an n-element list of integers from 0 to n-1, along with their values
     */
    public static mperm(p: [number,unknown][]): Graph {
        const g = new Graph();
        const size = p.length;
        const inputs = Array.from({ length: size }, (_, i) => g.addVertex(0, i - (size - 1) / 2, p.find(([j, _]) => i === j)![1]));
        const outputs = p.map(([i, _]) => inputs[i]);
        g.setInputs(inputs);
        g.setOutputs(outputs);
        return g;
    }
    
    public static perm(p: number[]): Graph {
        const g = new Graph();
        const size = p.length;
        const inputs = Array.from({ length: size }, (_, i) => g.addVertex(0, i - (size - 1) / 2));
        const outputs = p.map(i => inputs[i]);
        g.setInputs(inputs);
        g.setOutputs(outputs);
        return g;
    }

    /**
     * Returns a graph corresponding to the identity map.
     *
     * This graph has a single vertex which is both an input and an output.
     */
    public static identity(): Graph {
        const g = new Graph();
        const v = g.addVertex(0, 0);
        g.setInputs([v]);
        g.setOutputs([v]);
        return g;
    }
}


/** Load a graph from a JSON string */
export function graphFromJson(jsonString: string): Graph {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const j = JSON.parse(jsonString) as any;
    const g = new Graph();
    for (const [v, vd] of Object.entries(j.vertices as Record<string, Record<string, unknown>>)) {
        g.addVertex(
            vd['x'] !== undefined ? parseFloat(vd['x'] as string) : 0.0,
            vd['y'] !== undefined ? parseFloat(vd['y'] as string) : 0.0,
            vd['value'] !== undefined ? vd['value'] : '',
            parseInt(v, 10)
        );
    }
    for (const [e, ed] of Object.entries(j.edges as Record<string, Record<string, unknown>>)) {
        g.addEdge(
            (ed['s'] as unknown[]).map(v => parseInt(v as string, 10)),
            (ed['t'] as unknown[]).map(v => parseInt(v as string, 10)),
            ed['value'] !== undefined ? String(ed['value']) : '',
            ed['x'] !== undefined ? parseFloat(ed['x'] as string) : 0.0,
            ed['y'] !== undefined ? parseFloat(ed['y'] as string) : 0.0,
            ed['width'] !== undefined ? parseFloat(ed['width'] as string) : null,
            ed['height'] !== undefined ? parseFloat(ed['height'] as string) : null,
            '',
            '',
            ed['hyper'] !== undefined ? Boolean(ed['hyper']) : true,
            parseInt(e, 10)
        );
    }
    g.setInputs((j.inputs as unknown[]).map((v: unknown) => parseInt(v as string, 10)));
    g.setOutputs((j.outputs as unknown[]).map((v: unknown) => parseInt(v as string, 10)));
    return g;
}
