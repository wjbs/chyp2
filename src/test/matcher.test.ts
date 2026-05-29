import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { Graph } from '../lib/graph.ts';
import { Rule } from '../lib/rule.ts';
import { Match, Matches, matchGraph, matchRule, findIso } from '../lib/matcher.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the first match from an iterable, or undefined. */
function firstMatch(ms: Iterable<Match>): Match | undefined {
    for (const m of ms) return m;
    return undefined;
}

/** Collect all matches into an array. */
function allMatches(ms: Iterable<Match>): Match[] {
    return [...ms];
}

// ---------------------------------------------------------------------------
// Match - constructor and copy
// ---------------------------------------------------------------------------

describe('Match constructor', () => {
    it('initialises empty maps when constructed from two graphs', () => {
        const g = Graph.gen('f', 1, 1);
        const h = Graph.gen('f', 1, 1);
        const m = new Match(g, h);
        assert.equal(m.dom, g);
        assert.equal(m.cod, h);
        assert.equal(m.vmap.size, 0);
        assert.equal(m.emap.size, 0);
        assert.equal(m.vimg.size, 0);
        assert.equal(m.eimg.size, 0);
    });

    it('copy constructor clones all maps independently', () => {
        const g = Graph.gen('f', 1, 1);
        const h = Graph.gen('f', 1, 1);
        const m = new Match(g, h);
        const gV = g.inputs()[0];
        const hV = h.inputs()[0];
        m.vmap.set(gV, hV);
        m.vimg.add(hV);

        const m2 = new Match(m);
        assert.equal(m2.vmap.get(gV), hV);
        // mutating m2's vmap must not affect m
        m2.vmap.delete(gV);
        assert.ok(m.vmap.has(gV));
    });

    it('Match.copy() is equivalent to the copy constructor', () => {
        const g = Graph.gen('f', 1, 1);
        const h = Graph.gen('f', 1, 1);
        const m = new Match(g, h);
        const m2 = m.copy();
        assert.equal(m2.dom, m.dom);
        assert.equal(m2.cod, m.cod);
        assert.equal(m2.vmap.size, m.vmap.size);
    });
});

// ---------------------------------------------------------------------------
// Match - tryAddVertex
// ---------------------------------------------------------------------------

describe('Match.tryAddVertex()', () => {
    it('succeeds when values match and vertex is not yet mapped', () => {
        const g = Graph.gen('f', 1, 1);
        const h = Graph.gen('f', 1, 1);
        const m = new Match(g, h);
        const gV = g.inputs()[0];
        const hV = h.inputs()[0];
        assert.ok(m.tryAddVertex(gV, hV));
        assert.equal(m.vmap.get(gV), hV);
    });

    it('fails when vertex values differ', () => {
        const g = new Graph();
        const h = new Graph();
        const gV = g.addVertex(0, 0, 'a');
        const hV = h.addVertex(0, 0, 'b');
        g.setInputs([gV]);
        h.setInputs([hV]);
        const m = new Match(g, h);
        assert.equal(m.tryAddVertex(gV, hV), false);
    });

    it('succeeds when vertex is already mapped consistently', () => {
        const g = Graph.gen('f', 1, 1);
        const h = Graph.gen('f', 1, 1);
        const m = new Match(g, h);
        const gV = g.inputs()[0];
        const hV = h.inputs()[0];
        m.tryAddVertex(gV, hV);
        // mapping again to the same cod vertex must succeed
        assert.ok(m.tryAddVertex(gV, hV));
    });

    it('fails when vertex is already mapped to a different cod vertex', () => {
        const g = Graph.gen('f', 1, 1);
        const h = Graph.gen('f', 2, 1);
        const m = new Match(g, h);
        const gV = g.inputs()[0];
        const hV0 = h.inputs()[0];
        const hV1 = h.inputs()[1];
        m.tryAddVertex(gV, hV0);
        assert.equal(m.tryAddVertex(gV, hV1), false);
    });

    it('fails when cod vertex is boundary but dom vertex is not', () => {
        // build a dom graph with an interior vertex (not a boundary)
        const g = new Graph();
        const v0 = g.addVertex(0, 0, '');
        const v1 = g.addVertex(1, 0, '');
        const v2 = g.addVertex(2, 0, '');
        g.addEdge([v0], [v1], 'f');
        g.addEdge([v1], [v2], 'g');
        g.setInputs([v0]);
        g.setOutputs([v2]);

        // h is a Graph.gen with a boundary vertex
        const h = Graph.gen('f', 1, 1);
        const m = new Match(g, h);

        // v1 is interior in g; h.inputs()[0] is a boundary in h → must fail
        assert.equal(m.tryAddVertex(v1, h.inputs()[0]), false);
    });
});

// ---------------------------------------------------------------------------
// Match - tryAddEdge
// ---------------------------------------------------------------------------

describe('Match.tryAddEdge()', () => {
    it('succeeds and extends the vertex map', () => {
        const g = Graph.gen('f', 1, 1);
        const h = Graph.gen('f', 1, 1);
        const m = new Match(g, h);

        // seed the boundary vertices first
        m.tryAddVertex(g.inputs()[0], h.inputs()[0]);
        m.tryAddVertex(g.outputs()[0], h.outputs()[0]);

        const gE = [...g.edges()][0];
        const hE = [...h.edges()][0];
        assert.ok(m.tryAddEdge(gE, hE));
        assert.equal(m.emap.get(gE), hE);
    });

    it('fails when edge values differ', () => {
        const g = Graph.gen('f', 1, 1);
        const h = Graph.gen('g', 1, 1);
        const m = new Match(g, h);
        m.tryAddVertex(g.inputs()[0], h.inputs()[0]);
        m.tryAddVertex(g.outputs()[0], h.outputs()[0]);

        const gE = [...g.edges()][0];
        const hE = [...h.edges()][0];
        assert.equal(m.tryAddEdge(gE, hE), false);
    });

    it('fails on non-injective edge mapping', () => {
        // Try to map two different dom edges to the same cod edge
        const g = new Graph();
        const v0 = g.addVertex(0, 0, '');
        const v1 = g.addVertex(1, 0, '');
        const v2 = g.addVertex(2, 0, '');
        const e1 = g.addEdge([v0], [v1], 'f');
        const e2 = g.addEdge([v1], [v2], 'f');
        g.setInputs([v0]);
        g.setOutputs([v2]);

        const h = Graph.gen('f', 1, 1);
        const m = new Match(g, h);
        m.tryAddVertex(v0, h.inputs()[0]);
        m.tryAddVertex(v1, h.outputs()[0]);

        const hE = [...h.edges()][0];
        m.tryAddEdge(e1, hE);          // first mapping – succeeds
        assert.equal(m.tryAddEdge(e2, hE), false); // non-injective – must fail
    });
});

// ---------------------------------------------------------------------------
// Match - isTotal / isInjective / isSurjective / isConvex
// ---------------------------------------------------------------------------

describe('Match predicates', () => {
    it('isTotal returns false before the match is complete', () => {
        const g = Graph.gen('f', 1, 1);
        const h = Graph.gen('f', 1, 1);
        const m = new Match(g, h);
        assert.equal(m.isTotal(), false);
    });

    it('isTotal returns true for a fully enumerated match', () => {
        const g = Graph.gen('f', 1, 1);
        const h = Graph.gen('f', 1, 1);
        const match = firstMatch(matchGraph(g, h));
        assert.ok(match);
        assert.ok(match!.isTotal());
    });

    it('isInjective returns true for a total injective match', () => {
        const g = Graph.gen('f', 1, 1);
        const h = Graph.gen('f', 1, 1);
        const match = firstMatch(matchGraph(g, h));
        assert.ok(match!.isInjective());
    });

    it('isSurjective returns true when match covers all of cod', () => {
        const g = Graph.gen('f', 1, 1);
        const h = Graph.gen('f', 1, 1);
        const match = firstMatch(matchGraph(g, h));
        assert.ok(match!.isSurjective());
    });
});

// ---------------------------------------------------------------------------
// Match – mapScalars
// ---------------------------------------------------------------------------

describe('Match.mapScalars()', () => {
    it('maps a scalar dom edge to a matching cod scalar edge', () => {
        const dom = Graph.gen('s', 0, 0);
        const cod = Graph.gen('s', 0, 0);
        const m = new Match(dom, cod);
        assert.ok(m.mapScalars());
        assert.equal(m.emap.size, 1);
    });

    it('fails when no matching scalar exists in cod', () => {
        const dom = Graph.gen('s', 0, 0);
        const cod = Graph.gen('t', 0, 0);
        const m = new Match(dom, cod);
        assert.equal(m.mapScalars(), false);
    });

    it('returns true and maps nothing when dom has no scalars', () => {
        const dom = Graph.gen('f', 1, 1);
        const cod = Graph.gen('f', 1, 1);
        const m = new Match(dom, cod);
        assert.ok(m.mapScalars());
        assert.equal(m.emap.size, 0);
    });
});

// ---------------------------------------------------------------------------
// Matches – iterable search
// ---------------------------------------------------------------------------

describe('Matches enumeration', () => {
    it('finds exactly one match of Graph.gen(f,1,1) into Graph.gen(f,1,1)', () => {
        const dom = Graph.gen('f', 1, 1);
        const cod = Graph.gen('f', 1, 1);
        const matches = allMatches(matchGraph(dom, cod));
        assert.equal(matches.length, 1);
    });

    it('finds no matches when labels differ', () => {
        const dom = Graph.gen('f', 1, 1);
        const cod = Graph.gen('g', 1, 1);
        assert.equal(allMatches(matchGraph(dom, cod)).length, 0);
    });

    it('finds a match of f in a composed graph f;g', () => {
        const f = Graph.gen('f', 1, 1);
        const fg = Graph.gen('f', 1, 1).compose(Graph.gen('g', 1, 1));
        const matches = allMatches(matchGraph(f, fg));
        assert.equal(matches.length, 1);
    });

    it('finds no match of h in a graph containing only f and g', () => {
        const h = Graph.gen('h', 1, 1);
        const fg = Graph.gen('f', 1, 1).compose(Graph.gen('g', 1, 1));
        assert.equal(allMatches(matchGraph(h, fg)).length, 0);
    });

    it('finds exactly one match of a scalar', () => {
        const dom = Graph.gen('s', 0, 0);
        const cod = Graph.gen('s', 0, 0);
        assert.equal(allMatches(matchGraph(dom, cod)).length, 1);
    });

    it('Matches implements the iterator protocol', () => {
        const dom = Graph.gen('f', 1, 1);
        const cod = Graph.gen('f', 1, 1);
        const iter = new Matches(dom, cod);
        const r1 = iter.next();
        assert.equal(r1.done, false);
        const r2 = iter.next();
        assert.equal(r2.done, true);
    });
});

// ---------------------------------------------------------------------------
// matchRule
// ---------------------------------------------------------------------------

describe('matchRule()', () => {
    it('finds the LHS of a rule inside a larger graph', () => {
        const r = new Rule(Graph.gen('f', 1, 1), Graph.gen('g', 1, 1));
        const graph = Graph.gen('f', 1, 1).compose(Graph.gen('h', 1, 1));
        const matches = allMatches(matchRule(r, graph));
        assert.equal(matches.length, 1);
        // The matched edge should have value 'f'
        const m = matches[0];
        const [domE] = m.dom.edges();
        const codE = m.emap.get(domE)!;
        assert.equal(m.cod.edgeData(codE).value, 'f');
    });

    it('finds no matches when the rule LHS is absent', () => {
        const r = new Rule(Graph.gen('x', 1, 1), Graph.gen('y', 1, 1));
        const graph = Graph.gen('f', 1, 1).compose(Graph.gen('g', 1, 1));
        assert.equal(allMatches(matchRule(r, graph)).length, 0);
    });
});

// ---------------------------------------------------------------------------
// findIso
// ---------------------------------------------------------------------------

describe('findIso()', () => {
    it('finds an isomorphism between two copies of the same graph', () => {
        const g = Graph.gen('f', 2, 1);
        const h = Graph.gen('f', 2, 1);
        const iso = findIso(g, h);
        assert.ok(iso !== undefined);
    });

    it('finds an isomorphism between two copies of a more complicated graph', () => {
        const g = Graph.gen('f', 1, 2).compose(Graph.gen('g', 2, 1));
        const h = Graph.gen('f', 1, 2).compose(Graph.gen('g', 2, 1));
        const iso = findIso(g, h);
        assert.ok(iso !== undefined);
    });

    it('returns undefined when edge labels differ', () => {
        const g = Graph.gen('f', 1, 1);
        const h = Graph.gen('g', 1, 1);
        assert.equal(findIso(g, h), undefined);
    });

    it('returns undefined when input counts differ', () => {
        const g = Graph.gen('f', 1, 1);
        const h = Graph.gen('f', 2, 1);
        assert.equal(findIso(g, h), undefined);
    });

    it('returns undefined when output counts differ', () => {
        const g = Graph.gen('f', 1, 1);
        const h = Graph.gen('f', 1, 2);
        assert.equal(findIso(g, h), undefined);
    });

    it('finds an isomorphism for the Graph.identity graph', () => {
        const g = Graph.identity();
        const h = Graph.identity();
        const iso = findIso(g, h);
        assert.ok(iso !== undefined);
    });
});
