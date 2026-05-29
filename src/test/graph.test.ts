import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import {
    Graph,
    VData,
    EData,
    GraphError,
    graphFromJson,
} from '../lib/graph.ts';

// ---------------------------------------------------------------------------
// VData
// ---------------------------------------------------------------------------

describe('VData', () => {
    it('has correct defaults', () => {
        const vd = new VData();
        assert.equal(vd.x, 0);
        assert.equal(vd.y, 0);
        assert.equal(vd.value, '');
        assert.equal(vd.highlight, false);
        assert.equal(vd.inEdges.size, 0);
        assert.equal(vd.outEdges.size, 0);
        assert.equal(vd.inIndices.size, 0);
        assert.equal(vd.outIndices.size, 0);
    });

    it('stores supplied values', () => {
        const vd = new VData(1.5, -2, 'foo');
        assert.equal(vd.x, 1.5);
        assert.equal(vd.y, -2);
        assert.equal(vd.value, 'foo');
    });
});

// ---------------------------------------------------------------------------
// EData
// ---------------------------------------------------------------------------

describe('EData', () => {
    it('has correct defaults', () => {
        const ed = new EData();
        assert.equal(ed.value, '');
        assert.equal(ed.x, 0);
        assert.equal(ed.y, 0);
        assert.deepEqual(ed.s, []);
        assert.deepEqual(ed.t, []);
        assert.equal(ed.fg, '');
        assert.equal(ed.bg, '');
        assert.equal(ed.hyper, true);
        assert.equal(ed.highlight, false);
    });

    describe('boxSize()', () => {
        it('returns 1 when both s and t have at most 1 element', () => {
            assert.equal(new EData([0], [1]).boxSize(), 1);
            assert.equal(new EData([], []).boxSize(), 1);
            assert.equal(new EData([0], []).boxSize(), 1);
        });

        it('returns 2 when s or t has more than 1 element', () => {
            assert.equal(new EData([0, 1], [2]).boxSize(), 2);
            assert.equal(new EData([0], [1, 2]).boxSize(), 2);
            assert.equal(new EData([0, 1], [2, 3]).boxSize(), 2);
        });
    });

    it('toString() includes value and coordinates', () => {
        const ed = new EData([], [], 'f', 3, 4);
        assert.ok(ed.toString().includes('f'));
        assert.ok(ed.toString().includes('3'));
        assert.ok(ed.toString().includes('4'));
    });
});

// ---------------------------------------------------------------------------
// Graph - construction and basic accessors
// ---------------------------------------------------------------------------

describe('Graph - addVertex / addEdge', () => {
    it('auto-assigns increasing vertex indices', () => {
        const g = new Graph();
        const v0 = g.addVertex();
        const v1 = g.addVertex();
        assert.equal(v0, 0);
        assert.equal(v1, 1);
        assert.equal(g.numVertices(), 2);
    });

    it('stores vertex position and value', () => {
        const g = new Graph();
        const v = g.addVertex(1, 2, 'label');
        const vd = g.vertexData(v);
        assert.equal(vd.x, 1);
        assert.equal(vd.y, 2);
        assert.equal(vd.value, 'label');
    });

    it('respects explicit vertex name and bumps vindex', () => {
        const g = new Graph();
        const v = g.addVertex(0, 0, '', 10);
        assert.equal(v, 10);
        assert.equal(g.vindex, 11);
        // next auto-assigned vertex must not collide
        const v2 = g.addVertex();
        assert.equal(v2, 11);
    });

    it('auto-assigns increasing edge indices', () => {
        const g = new Graph();
        const v0 = g.addVertex();
        const v1 = g.addVertex();
        const v2 = g.addVertex();
        const e0 = g.addEdge([v0], [v1], 'a');
        const e1 = g.addEdge([v1], [v2], 'b');
        assert.equal(e0, 0);
        assert.equal(e1, 1);
        assert.equal(g.numEdges(), 2);
    });

    it('tracks adjacency on vertices', () => {
        const g = new Graph();
        const v0 = g.addVertex();
        const v1 = g.addVertex();
        const e = g.addEdge([v0], [v1]);
        assert.ok(g.outEdges(v0).has(e));
        assert.ok(g.inEdges(v1).has(e));
        assert.equal(g.outEdges(v1).size, 0);
        assert.equal(g.inEdges(v0).size, 0);
    });

    it('source() and target() return the correct lists', () => {
        const g = new Graph();
        const v0 = g.addVertex();
        const v1 = g.addVertex();
        const v2 = g.addVertex();
        const e = g.addEdge([v0, v1], [v2]);
        assert.deepEqual(g.source(e), [v0, v1]);
        assert.deepEqual(g.target(e), [v2]);
    });
});

// ---------------------------------------------------------------------------
// Graph - boundaries
// ---------------------------------------------------------------------------

describe('Graph - inputs / outputs', () => {
    it('setInputs / setOutputs update vertex indices', () => {
        const g = new Graph();
        const v0 = g.addVertex();
        const v1 = g.addVertex();
        g.setInputs([v0]);
        g.setOutputs([v1]);
        assert.deepEqual(g.inputs(), [v0]);
        assert.deepEqual(g.outputs(), [v1]);
        assert.ok(g.isInput(v0));
        assert.ok(!g.isInput(v1));
        assert.ok(g.isOutput(v1));
        assert.ok(!g.isOutput(v0));
    });

    it('isBoundary returns true for either input or output', () => {
        const g = new Graph();
        const v0 = g.addVertex();
        const v1 = g.addVertex();
        const v2 = g.addVertex();
        g.setInputs([v0]);
        g.setOutputs([v1]);
        assert.ok(g.isBoundary(v0));
        assert.ok(g.isBoundary(v1));
        assert.ok(!g.isBoundary(v2));
    });

    it('addInputs / addOutputs append without clearing', () => {
        const g = new Graph();
        const vs = [g.addVertex(), g.addVertex(), g.addVertex()];
        g.setInputs([vs[0]]);
        g.addInputs([vs[1]]);
        assert.deepEqual(g.inputs(), [vs[0], vs[1]]);
        g.addOutputs([vs[2]]);
        assert.deepEqual(g.outputs(), [vs[2]]);
    });

    it('setInputs clears previous in-indices', () => {
        const g = new Graph();
        const v0 = g.addVertex();
        const v1 = g.addVertex();
        g.setInputs([v0]);
        assert.ok(g.isInput(v0));
        g.setInputs([v1]);
        assert.ok(!g.isInput(v0));
        assert.ok(g.isInput(v1));
    });
});

// ---------------------------------------------------------------------------
// Graph - removeVertex / removeEdge
// ---------------------------------------------------------------------------

describe('Graph - removeVertex / removeEdge', () => {
    it('removeEdge deletes the edge and cleans adjacency', () => {
        const g = new Graph();
        const v0 = g.addVertex();
        const v1 = g.addVertex();
        const e = g.addEdge([v0], [v1]);
        g.removeEdge(e);
        assert.equal(g.numEdges(), 0);
        assert.equal(g.outEdges(v0).size, 0);
        assert.equal(g.inEdges(v1).size, 0);
    });

    it('removeVertex (non-strict) removes vertex and cleans edges + boundaries', () => {
        const g = new Graph();
        const v0 = g.addVertex();
        const v1 = g.addVertex();
        const v2 = g.addVertex();
        const e = g.addEdge([v0, v1], [v2]);
        g.setInputs([v1]);
        g.removeVertex(v1);
        assert.equal(g.numVertices(), 2);
        assert.deepEqual(g.source(e), [v0]);
        assert.deepEqual(g.inputs(), []);
    });

    it('removeVertex (strict) throws when adjacent edges exist', () => {
        const g = new Graph();
        const v0 = g.addVertex();
        const v1 = g.addVertex();
        g.addEdge([v0], [v1]);
        assert.throws(() => g.removeVertex(v0, true), Error);
    });

    it('removeVertex (strict) throws for boundary vertex', () => {
        const g = new Graph();
        const v = g.addVertex();
        g.setInputs([v]);
        assert.throws(() => g.removeVertex(v, true), Error);
    });
});

// ---------------------------------------------------------------------------
// Graph - copy
// ---------------------------------------------------------------------------

describe('Graph - copy()', () => {
    it('produces an independent deep copy', () => {
        const g = new Graph();
        const v0 = g.addVertex(1, 2, 'a');
        const v1 = g.addVertex(3, 4, 'b');
        g.addEdge([v0], [v1], 'f');
        g.setInputs([v0]);
        g.setOutputs([v1]);

        const h = g.copy();
        assert.equal(h.numVertices(), 2);
        assert.equal(h.numEdges(), 1);
        assert.deepEqual(h.inputs(), [v0]);
        assert.deepEqual(h.outputs(), [v1]);

        // mutating h must not affect g
        h.addVertex(5, 6);
        assert.equal(g.numVertices(), 2);
        h.vertexData(v0).value = 'changed';
        assert.equal(g.vertexData(v0).value, 'a');
    });
});

// ---------------------------------------------------------------------------
// Graph - successors
// ---------------------------------------------------------------------------

describe('Graph - successors()', () => {
    it('returns all reachable vertices', () => {
        const g = new Graph();
        const v0 = g.addVertex();
        const v1 = g.addVertex();
        const v2 = g.addVertex();
        const v3 = g.addVertex();
        g.addEdge([v0], [v1]);
        g.addEdge([v1], [v2]);
        // v3 is unreachable from v0
        const succ = g.successors([v0]);
        assert.ok(succ.has(v1));
        assert.ok(succ.has(v2));
        assert.ok(!succ.has(v3));
        assert.ok(!succ.has(v0));
    });

    it('returns empty set when starting vertex has no out-edges', () => {
        const g = new Graph();
        const v = g.addVertex();
        assert.equal(g.successors([v]).size, 0);
    });
});

// ---------------------------------------------------------------------------
// Graph - mergeVertices
// ---------------------------------------------------------------------------

describe('Graph - mergeVertices()', () => {
    it('redirects edges from w to v and removes w', () => {
        const g = new Graph();
        const v = g.addVertex();
        const w = g.addVertex();
        const x = g.addVertex();
        const e1 = g.addEdge([v], [w]);
        const e2 = g.addEdge([w], [x]);
        g.mergeVertices(v, w);
        // w should be gone
        assert.equal(g.numVertices(), 2);
        // e1's target and e2's source should now point to v
        assert.deepEqual(g.target(e1), [v]);
        assert.deepEqual(g.source(e2), [v]);
    });

    it('updates boundary lists', () => {
        const g = new Graph();
        const v = g.addVertex();
        const w = g.addVertex();
        g.setInputs([w]);
        g.setOutputs([w]);
        g.mergeVertices(v, w);
        assert.deepEqual(g.inputs(), [v]);
        assert.deepEqual(g.outputs(), [v]);
    });
});

// ---------------------------------------------------------------------------
// Graph - highlight / unhighlight
// ---------------------------------------------------------------------------

describe('Graph - highlight / unhighlight', () => {
    it('sets highlight on specified vertices and edges only', () => {
        const g = new Graph();
        const v0 = g.addVertex();
        const v1 = g.addVertex();
        const e = g.addEdge([v0], [v1]);
        g.highlight(new Set([v0]), new Set([e]));
        assert.equal(g.vertexData(v0).highlight, true);
        assert.equal(g.vertexData(v1).highlight, false);
        assert.equal(g.edgeData(e).highlight, true);
    });

    it('unhighlight clears all flags', () => {
        const g = new Graph();
        const v = g.addVertex();
        const e = g.addEdge([v], [v]);
        g.highlight(new Set([v]), new Set([e]));
        g.unhighlight();
        assert.equal(g.vertexData(v).highlight, false);
        assert.equal(g.edgeData(e).highlight, false);
    });
});

// ---------------------------------------------------------------------------
// Graph - insertIdAfter
// ---------------------------------------------------------------------------

describe('Graph - insertIdAfter()', () => {
    it('inserts a new Graph.identity edge after a vertex', () => {
        const g = new Graph();
        const v = g.addVertex(0, 0);
        const x = g.addVertex(3, 0);
        const e0 = g.addEdge([v], [x]);
        g.setOutputs([v]);

        const eId = g.insertIdAfter(v);
        const ed = g.edgeData(eId);
        assert.equal(ed.value, 'id');
        assert.deepEqual(ed.s, [v]);
        // the new vertex w is the target of the id edge
        const w = ed.t[0];
        // original out-edge e0 now originates from w, not v
        assert.deepEqual(g.source(e0), [w]);
        // output was redirected to w
        assert.deepEqual(g.outputs(), [w]);
    });
});

// ---------------------------------------------------------------------------
// Helper functions - Graph.gen, Graph.perm, Graph.identity
// ---------------------------------------------------------------------------

describe('Graph.gen()', () => {
    it('creates a graph with the correct number of inputs and outputs', () => {
        const g = Graph.gen('f', 2, 3);
        assert.equal(g.inputs().length, 2);
        assert.equal(g.outputs().length, 3);
        assert.equal(g.numEdges(), 1);
        assert.equal(g.numVertices(), 5);
    });

    it('stores value, fg, bg on the edge', () => {
        const g = Graph.gen('myOp', 1, 1, 'ff0000', '00ff00');
        const e = [...g.edges()][0];
        assert.equal(g.edgeData(e).value, 'myOp');
        assert.equal(g.edgeData(e).fg, 'ff0000');
        assert.equal(g.edgeData(e).bg, '00ff00');
    });

    it('produces a 0-arity Graph.generator (cap-like)', () => {
        const g = Graph.gen('cap', 0, 2);
        assert.equal(g.inputs().length, 0);
        assert.equal(g.outputs().length, 2);
    });
});

describe('Graph.perm()', () => {
    it('Graph.identity Graph.permutation maps input i to output i', () => {
        const g = Graph.perm([0, 1, 2]);
        assert.equal(g.inputs().length, 3);
        assert.equal(g.outputs().length, 3);
        // no edges - just shared vertices
        assert.equal(g.numEdges(), 0);
        for (let i = 0; i < 3; i++) {
            assert.equal(g.inputs()[i], g.outputs()[i]);
        }
    });

    it('swap Graph.permutation [1,0] maps correctly', () => {
        const g = Graph.perm([1, 0]);
        // input 0 should be at output position 1, and vice versa
        assert.equal(g.inputs()[0], g.outputs()[1]);
        assert.equal(g.inputs()[1], g.outputs()[0]);
    });
});

describe('Graph.identity()', () => {
    it('has one vertex that is both input and output', () => {
        const g = Graph.identity();
        assert.equal(g.numVertices(), 1);
        assert.equal(g.numEdges(), 0);
        assert.equal(g.inputs().length, 1);
        assert.equal(g.outputs().length, 1);
        assert.equal(g.inputs()[0], g.outputs()[0]);
    });
});

// ---------------------------------------------------------------------------
// Graph - tensor
// ---------------------------------------------------------------------------

describe('Graph - tensor', () => {
    it('tensor() combines inputs and outputs', () => {
        const a = Graph.gen('a', 1, 1);
        const b = Graph.gen('b', 2, 1);
        const ab = a.tensor(b);
        assert.equal(ab.inputs().length, 3);
        assert.equal(ab.outputs().length, 2);
        assert.equal(ab.numEdges(), 2);
    });

    it('tensor() does not modify the original graphs', () => {
        const a = Graph.gen('a', 1, 1);
        const b = Graph.gen('b', 1, 1);
        const origAVerts = a.numVertices();
        a.tensor(b);
        assert.equal(a.numVertices(), origAVerts);
    });
});

// ---------------------------------------------------------------------------
// Graph - compose
// ---------------------------------------------------------------------------

describe('Graph - compose', () => {
    it('compose() merges outputs of first with inputs of second', () => {
        const a = Graph.gen('a', 1, 2);
        const b = Graph.gen('b', 2, 1);
        const ab = a.compose(b);
        assert.equal(ab.inputs().length, 1);
        assert.equal(ab.outputs().length, 1);
        assert.equal(ab.numEdges(), 2);
        assert.equal(ab.numVertices(), 4);
    });

    it('compose() throws GraphError on arity mismatch', () => {
        const a = Graph.gen('a', 1, 2);
        const b = Graph.gen('b', 3, 1);
        assert.throws(() => a.compose(b), GraphError);
    });

    it('Graph.identity() is left-neutral for compose', () => {
        const f = Graph.gen('f', 1, 2);
        const result = Graph.identity().compose(f); // id ; f ≈ f up to vertex names
        assert.equal(result.inputs().length, f.inputs().length);
        assert.equal(result.outputs().length, f.outputs().length);
    });
});

// ---------------------------------------------------------------------------
// graphFromJson
// ---------------------------------------------------------------------------

describe('graphFromJson()', () => {
    it('round-trips a simple graph', () => {
        const json = JSON.stringify({
            vertices: {
                '0': { x: 1, y: 2, value: 'v0' },
                '1': { x: 3, y: 4, value: 'v1' },
            },
            edges: {
                '0': { s: [0], t: [1], value: 'f', x: 2, y: 3, hyper: true },
            },
            inputs: [0],
            outputs: [1],
        });

        const g = graphFromJson(json);
        assert.equal(g.numVertices(), 2);
        assert.equal(g.numEdges(), 1);
        assert.equal(g.vertexData(0).value, 'v0');
        assert.equal(g.vertexData(1).value, 'v1');
        assert.deepEqual(g.inputs(), [0]);
        assert.deepEqual(g.outputs(), [1]);
        const e = [...g.edges()][0];
        assert.deepEqual(g.source(e), [0]);
        assert.deepEqual(g.target(e), [1]);
        assert.equal(g.edgeData(e).value, 'f');
    });

    it('uses defaults when optional fields are absent', () => {
        const json = JSON.stringify({
            vertices: { '0': {} },
            edges: { '0': { s: [], t: [] } },
            inputs: [],
            outputs: [],
        });
        const g = graphFromJson(json);
        assert.equal(g.vertexData(0).x, 0);
        assert.equal(g.vertexData(0).y, 0);
        assert.equal(g.vertexData(0).value, '');
    });
});

// ---------------------------------------------------------------------------
// Graph - boundingBox()
// ---------------------------------------------------------------------------

describe('Graph - boundingBox()', () => {
    it('returns default box [-0.5, 0.5, -0.5, 0.5] for empty graph', () => {
        const g = new Graph();
        assert.deepEqual(g.boundingBox(), [-0.5, 0.5, -0.5, 0.5]);
    });

    it('single vertex at origin has half-unit padding on all sides', () => {
        const g = new Graph();
        g.addVertex(0, 0);
        assert.deepEqual(g.boundingBox(), [-0.5, 0.5, -0.5, 0.5]);
    });

    it('single vertex at arbitrary position', () => {
        const g = new Graph();
        g.addVertex(3, 5);
        assert.deepEqual(g.boundingBox(), [2.5, 3.5, 4.5, 5.5]);
    });

    it('two vertices span both their padded extents', () => {
        const g = new Graph();
        g.addVertex(0, 0);
        g.addVertex(4, 6);
        assert.deepEqual(g.boundingBox(), [-0.5, 4.5, -0.5, 6.5]);
    });

    it('single simple edge (boxSize=1) at origin', () => {
        const g = new Graph();
        const v0 = g.addVertex(0, 0);
        const v1 = g.addVertex(2, 0);
        g.addEdge([v0], [v1], 'f', 1, 0);
        // vertices: x in [-0.5, 2.5], y in [-0.5, 0.5]
        // edge at (1,0) with boxSize=1: x in [0.5, 1.5], y in [-0.5, 0.5]
        assert.deepEqual(g.boundingBox(), [-0.5, 2.5, -1, 1]);
    });

    it('hyper edge (boxSize=2) widens the bounding box', () => {
        const g = new Graph();
        const v0 = g.addVertex(-2, 0);
        const v1 = g.addVertex(2, 0);
        // edge with 2 sources → boxSize = 2, placed at origin
        g.addEdge([v0, v1], [], 'f', 0, 0);
        // edge x: [-1, 1], y: [-1, 1]
        // vertices x: [-2.5, 2.5], y: [-0.5, 0.5]
        const [minX, maxX, minY, maxY] = g.boundingBox();
        assert.equal(minX, -2.5);
        assert.equal(maxX, 2.5);
        assert.equal(minY, -1.5);
        assert.equal(maxY, 1.5);
    });

    it('graph with only edges (no vertices)', () => {
        const g = new Graph();
        // addEdge with empty source/target lists to avoid vertex tracking
        g.addEdge([], [], 'f', 2, 3);
        assert.deepEqual(g.boundingBox(), [1, 3, 2, 4]);
    });

    it('negative coordinates are handled correctly', () => {
        const g = new Graph();
        g.addVertex(-3, -4);
        assert.deepEqual(g.boundingBox(), [-3.5, -2.5, -4.5, -3.5]);
    });
});
