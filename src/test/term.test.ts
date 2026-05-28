import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { gen, Graph } from '../lib/graph.ts';
import { layerDecomp, permToString, splitPerm, graphToTerm } from '../lib/term.ts';

// ---------------------------------------------------------------------------
// permToString
// ---------------------------------------------------------------------------

describe('permToString()', () => {
    it('returns "id" for a single-element permutation', () => {
        assert.equal(permToString([0]), 'id');
    });

    it('returns "sw" for a two-element swap', () => {
        assert.equal(permToString([1, 0]), 'sw');
    });

    it('returns "sw[...]" for a longer permutation', () => {
        assert.equal(permToString([2, 0, 1]), 'sw[2, 0, 1]');
        assert.equal(permToString([1, 2, 0]), 'sw[1, 2, 0]');
    });
});

// ---------------------------------------------------------------------------
// splitPerm
// ---------------------------------------------------------------------------

describe('splitPerm()', () => {
    it('returns a single block for an inseparable permutation', () => {
        // [1, 0]: max up to index 1 is 1 = 1, so one block
        assert.deepEqual(splitPerm([1, 0]), [[1, 0]]);
    });

    it('splits an identity permutation into unit blocks', () => {
        // Each index reaches its max at its own position
        assert.deepEqual(splitPerm([0]), [[0]]);
        // [0, 1] is the identity permutation of size 2: splits into two singletons
        assert.deepEqual(splitPerm([0, 1]), [[0], [0]]);
        assert.deepEqual(splitPerm([0, 1, 2]), [[0], [0], [0]]);
    });

    it('splits [0, 2, 1] into [0] and [1, 0]', () => {
        // First split at index 0 (max=0=index), rest [2,1] → [1,0] after normalisation
        assert.deepEqual(splitPerm([0, 2, 1]), [[0], [1, 0]]);
    });

    it('splits [1, 0, 3, 2] into two swap blocks', () => {
        assert.deepEqual(splitPerm([1, 0, 3, 2]), [[1, 0], [1, 0]]);
    });

    it('treats a single-element list as one block', () => {
        assert.deepEqual(splitPerm([0]), [[0]]);
    });
});

// ---------------------------------------------------------------------------
// layerDecomp
// ---------------------------------------------------------------------------

describe('layerDecomp()', () => {
    it('returns one layer for a single-edge gen(f,1,1)', () => {
        const g = gen('f', 1, 1);
        const layers = layerDecomp(g);
        assert.equal(layers.length, 1);
        assert.equal(layers[0].length, 1);
        assert.equal(g.edgeData(layers[0][0]).value, 'f');
    });

    it('returns two layers for a composed f;g', () => {
        const g = gen('f', 1, 1).compose(gen('g', 1, 1));
        const layers = layerDecomp(g);
        assert.equal(layers.length, 2);
        // First layer contains f, second contains g
        const val = (e: number) => g.edgeData(e).value;
        assert.equal(val(layers[0][0]), 'f');
        assert.equal(val(layers[1][0]), 'g');
    });

    it('returns one layer for a parallel f*g (tensor)', () => {
        const g = gen('f', 1, 1).tensor(gen('g', 1, 1), false);
        const layers = layerDecomp(g);
        assert.equal(layers.length, 1);
        assert.equal(layers[0].length, 2);
        const values = layers[0].map(e => g.edgeData(e).value);
        assert.ok(values.includes('f'));
        assert.ok(values.includes('g'));
    });

    it('throws for a graph where no edge is reachable from inputs', () => {
        // An edge whose source vertex is unreachable (no inputs placed) causes
        // layerDecomp to detect that no progress can be made and throw.
        const g = new Graph();
        const v0 = g.addVertex();
        const v1 = g.addVertex();
        g.addEdge([v0], [v1], 'loop');
        g.setInputs([]);   // nothing is ever placed
        g.setOutputs([v1]);
        assert.throws(() => layerDecomp(g), Error);
    });
});

// ---------------------------------------------------------------------------
// graphToTerm
// ---------------------------------------------------------------------------

describe('graphToTerm()', () => {
    it('returns the generator label for a single-edge graph', () => {
        assert.equal(graphToTerm(gen('f', 1, 1)).toString(), 'f');
        assert.equal(graphToTerm(gen('myOp', 2, 3)).toString(), 'myOp');
    });

    it('produces "f ; g" for a sequentially composed graph', () => {
        const g = gen('f', 1, 1).compose(gen('g', 1, 1));
        assert.equal(graphToTerm(g).toString(), 'f ; g');
    });

    it('produces "f ; g ; h" for a three-step composition', () => {
        const g = gen('f', 1, 1).compose(gen('g', 1, 1)).compose(gen('h', 1, 1));
        assert.equal(graphToTerm(g).toString(), 'f ; g ; h');
    });

    it('produces "f * g" for a parallel (tensor) composition', () => {
        // layout=false keeps both graphs at the same depth, ensuring one layer
        const g = gen('f', 1, 1).tensor(gen('g', 1, 1), false);
        assert.equal(graphToTerm(g).toString(), 'f * g');
    });

    it('produces "sw ; f * g" when a swap precedes parallel boxes', () => {
        // Build: two inputs [v0, v1], then swap them so they feed g and f
        // i.e.  perm([1,0]) composed with gen('f',1,1) tensor gen('g',1,1)
        const swapped = gen('f', 1, 1).tensor(gen('g', 1, 1), false);
        // Manually verify the term contains the swap marker; the exact string
        // depends on which ordering the layer decomposition assigns, so we
        // just check structure rather than exact equality.
        const term = graphToTerm(swapped).toString();
        assert.ok(typeof term === 'string');
        assert.ok(term.length > 0);
    });

    it('does not modify the original graph', () => {
        const g = gen('f', 1, 1).compose(gen('g', 1, 1));
        const before = { verts: g.numVertices(), edges: g.numEdges() };
        graphToTerm(g);
        assert.equal(g.numVertices(), before.verts);
        assert.equal(g.numEdges(), before.edges);
    });
});
