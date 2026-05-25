import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { gen } from '../lib/graph.ts';
import { Rule } from '../lib/rule.ts';
import { matchRule, findIso } from '../lib/matcher.ts';
import { dpo, rewrite } from '../lib/rewrite.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the first match from matchRule, asserting it exists. */
function firstRuleMatch(r: Rule, g: ReturnType<typeof gen>) {
    for (const m of matchRule(r, g)) return m;
    throw new Error('No match found');
}

// ---------------------------------------------------------------------------
// rewrite() - convenience wrapper
// ---------------------------------------------------------------------------

describe('rewrite()', () => {
    it('replaces f with g in a single-edge graph', () => {
        const r = new Rule(gen('f', 1, 1), gen('g', 1, 1));
        const cod = gen('f', 1, 1);
        const m = firstRuleMatch(r, cod);

        const result = rewrite(r, m);

        assert.equal(result.numEdges(), 1);
        const [e] = result.edges();
        assert.equal(result.edgeData(e).value, 'g');
        assert.equal(result.inputs().length, 1);
        assert.equal(result.outputs().length, 1);
    });

    it('replaces f in the middle of a f;h graph leaving h intact', () => {
        const r = new Rule(gen('f', 1, 1), gen('g', 1, 1));
        const cod = gen('f', 1, 1).compose(gen('h', 1, 1));
        const m = firstRuleMatch(r, cod);

        const result = rewrite(r, m);

        const edgeValues = [...result.edges()].map(e => result.edgeData(e).value);
        assert.ok(edgeValues.includes('g'), 'result should contain g');
        assert.ok(edgeValues.includes('h'), 'result should contain h');
        assert.ok(!edgeValues.includes('f'), 'result should not contain f');
    });

    it('replaces f in h;f;k, preserving h and k', () => {
        const r = new Rule(gen('f', 1, 1), gen('g', 1, 1));
        const cod = gen('h', 1, 1).compose(gen('f', 1, 1)).compose(gen('k', 1, 1));
        const m = firstRuleMatch(r, cod);

        const result = rewrite(r, m);

        const edgeValues = [...result.edges()].map(e => result.edgeData(e).value);
        assert.ok(edgeValues.includes('g'));
        assert.ok(edgeValues.includes('h'));
        assert.ok(edgeValues.includes('k'));
        assert.ok(!edgeValues.includes('f'));
    });

    it('produces a graph isomorphic to gen(g,1,1) when rewriting a standalone f', () => {
        const r = new Rule(gen('f', 1, 1), gen('g', 1, 1));
        const cod = gen('f', 1, 1);
        const m = firstRuleMatch(r, cod);
        const result = rewrite(r, m);

        const expected = gen('g', 1, 1);
        assert.ok(findIso(result, expected) !== undefined, 'Result should be iso to gen(g,1,1)');
    });

    it('handles a scalar rule (0->0 arity)', () => {
        const r = new Rule(gen('s', 0, 0), gen('t', 0, 0));
        const cod = gen('s', 0, 0);
        const m = firstRuleMatch(r, cod);
        const result = rewrite(r, m);

        assert.equal(result.numEdges(), 1);
        const [e] = result.edges();
        assert.equal(result.edgeData(e).value, 't');
    });

    it('handles a multi-input/output rule', () => {
        // lhs and rhs must have the same boundary counts
        const r = new Rule(gen('mult', 2, 1), gen('mult2', 2, 1));
        const cod = gen('mult', 2, 1);
        const m = firstRuleMatch(r, cod);
        const result = rewrite(r, m);

        assert.equal(result.numEdges(), 1);
        const [e] = result.edges();
        assert.equal(result.edgeData(e).value, 'mult2');
        assert.equal(result.inputs().length, 2);
        assert.equal(result.outputs().length, 1);
    });
});

// ---------------------------------------------------------------------------
// dpo() - lower-level double-pushout API
// ---------------------------------------------------------------------------

describe('dpo()', () => {
    it('returns a Match whose cod is the rewritten graph', () => {
        const r = new Rule(gen('f', 1, 1), gen('g', 1, 1));
        const cod = gen('f', 1, 1);
        const m = firstRuleMatch(r, cod);

        const m1 = dpo(r, m);

        // m1 maps r.rhs into the resulting graph
        assert.equal(m1.dom, r.rhs);
        assert.ok(m1.isTotal());
    });

    it('the returned match image contains the rhs edge', () => {
        const r = new Rule(gen('f', 1, 1), gen('g', 1, 1));
        const cod = gen('f', 1, 1);
        const m = firstRuleMatch(r, cod);

        const m1 = dpo(r, m);

        // Every rhs edge should be mapped to an edge with value 'g'
        for (const [rhsE, hE] of m1.emap) {
            assert.equal(m1.cod.edgeData(hE).value, r.rhs.edgeData(rhsE).value);
        }
    });

    it('rewrite() and dpo().cod produce the same graph (up to iso)', () => {
        const r = new Rule(gen('f', 1, 1), gen('g', 1, 1));
        const cod1 = gen('f', 1, 1);
        const cod2 = gen('f', 1, 1);
        const m1 = firstRuleMatch(r, cod1);
        const m2 = firstRuleMatch(r, cod2);

        const via_rewrite = rewrite(r, m1);
        const via_dpo = dpo(r, m2).cod;

        assert.ok(findIso(via_rewrite, via_dpo) !== undefined);
    });
});
