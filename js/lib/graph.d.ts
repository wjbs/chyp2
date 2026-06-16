export declare class GraphError extends Error {
    constructor(message: string);
}
/** The data associated with a single vertex */
export declare class VData {
    value: unknown;
    x: number;
    y: number;
    highlight: boolean;
    inEdges: Set<number>;
    outEdges: Set<number>;
    inIndices: Set<number>;
    outIndices: Set<number>;
    constructor(x?: number, y?: number, value?: unknown);
}
/** The data associated with a single edge */
export declare class EData {
    value: string;
    highlight: boolean;
    x: number;
    y: number;
    s: number[];
    t: number[];
    fg: string;
    bg: string;
    hyper: boolean;
    constructor(s?: number[], t?: number[], value?: string, x?: number, y?: number, fg?: string, bg?: string, hyper?: boolean);
    toString(): string;
    /**
     * Returns the number of 'units' of width the box should have to display nicely.
     *
     * The rule is if both inputs and outputs are <= 1, draw as a small (size 1)
     * box, otherwise draw as a larger (size 2) box.
     */
    boxSize(): number;
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
export declare class Graph {
    vdata: Map<number, VData>;
    edata: Map<number, EData>;
    private _inputs;
    private _outputs;
    vindex: number;
    eindex: number;
    laidOut: boolean;
    constructor();
    /** Make a copy of the graph */
    copy(): Graph;
    /** Returns an iterator over the vertices in the graph */
    vertices(): IterableIterator<number>;
    /** Returns an iterator over the edges in the graph */
    edges(): IterableIterator<number>;
    /** The number of vertices */
    numVertices(): number;
    /** The number of edges */
    numEdges(): number;
    /** Returns the VData associated with a given vertex */
    vertexData(v: number): VData;
    /** Returns the EData associated with a given edge */
    edgeData(e: number): EData;
    /** Returns the set of edges that have `v` as a target */
    inEdges(v: number): Set<number>;
    /** Returns the set of edges that have `v` as a source */
    outEdges(v: number): Set<number>;
    /** Returns the list of source vertices associated with an edge */
    source(e: number): number[];
    /** Returns the list of target vertices associated with an edge */
    target(e: number): number[];
    /**
     * Add a vertex to the graph.
     *
     * @param x     The X coordinate to draw the vertex
     * @param y     The Y coordinate
     * @param value The value carried by this vertex (empty string by default)
     * @param name  An optional name; if -1, the name is assigned automatically
     */
    addVertex(x?: number, y?: number, value?: unknown, name?: number): number;
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
    addEdge(s: number[], t: number[], value?: string, x?: number, y?: number, fg?: string, bg?: string, hyper?: boolean, name?: number): number;
    /**
     * Remove a vertex.
     *
     * If `strict` is true the vertex must have no adjacent edges. If false, `v` will
     * be removed from the source/target list of all adjacent edges.
     *
     * @param v      A vertex to remove
     * @param strict If true, require the vertex to have no adjacent edges
     */
    removeVertex(v: number, strict?: boolean): void;
    /** Remove an edge */
    removeEdge(e: number): void;
    addInputs(inp: number[]): void;
    addOutputs(outp: number[]): void;
    setInputs(inp: number[]): void;
    setOutputs(outp: number[]): void;
    inputs(): number[];
    outputs(): number[];
    isInput(v: number): boolean;
    isOutput(v: number): boolean;
    isBoundary(v: number): boolean;
    successors(vs: Iterable<number>): Set<number>;
    /**
     * Compute bounding box of the graph as [minX, maxX, minY, maxY]
     */
    boundingBox(): [number, number, number, number];
    /**
     * Identify the two vertices given.
     *
     * Forms the quotient of the graph by identifying v with w. Afterwards, the
     * quotiented vertex will be named v.
     */
    mergeVertices(v: number, w: number): void;
    /**
     * Split a vertex into one copy for each input, in-tentacle, output, and out-tentacle.
     *
     * Used for computing pushout complements of rules that aren't left-linear. Returns
     * a pair of arrays containing the new input-like and output-like vertices, respectively.
     */
    explodeVertex(v: number): [number[], number[]];
    /**
     * Insert a new identity hyperedge after the given vertex.
     *
     * Inserts a dummy identity box with source at the given vertex and redirects any
     * out-edges or outputs to the target of the new hyperedge. If `reverse` is true,
     * the source and target of the identity wire are flipped.
     */
    insertIdAfter(v: number, reverse?: boolean): number;
    /**
     * Returns the monoidal product of this graph with `other`
     *
     * @param layout If true, the vertices and edges of `other` will be shifted
     *               downwards to avoid overlap with those of this graph.
     *
     */
    tensor(other: Graph, layout?: boolean): Graph;
    /**
     * Returns the composition of this graph with `other` in diagram order.
     */
    compose(other: Graph): Graph;
    /**
     * Set the `highlight` flag for a set of vertices and edges.
     *
     * Any vertices/edges not in the provided sets will be un-highlighted.
     */
    highlight(vertices: Set<number>, edges: Set<number>): void;
    /** Clear the `highlight` flag for all vertices and edges */
    unhighlight(): void;
    /**
     * Returns a graph with a single hyperedge and the given number of inputs/outputs.
     *
     * @param value    The label for the hyperedge
     * @param arity    The number of input vertices connected to the source of the edge
     * @param coarity  The number of output vertices connected to the target of the edge
     * @param fg       Optional foreground color as a 6-digit RGB hex code
     * @param bg       Optional background color as a 6-digit RGB hex code
     */
    static gen(value: string, arity: number, coarity: number, fg?: string, bg?: string): Graph;
    /**
     * Returns a graph corresponding to the given permutation.
     *
     * The permutation is given as a list [x0,..,x(n-1)], interpreted as { x0 -> 0, x1 -> 1, ..., x(n-1) -> n-1 }.
     * Input xj is mapped to the same vertex as output j.
     *
     * @param p A permutation as an n-element list of integers from 0 to n-1
     */
    static perm(p: number[]): Graph;
    /**
     * Returns a graph corresponding to the identity map.
     *
     * This graph has a single vertex which is both an input and an output.
     */
    static identity(): Graph;
}
/** Load a graph from a JSON string */
export declare function graphFromJson(jsonString: string): Graph;
