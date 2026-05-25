import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { gen, identity } from '../lib/graph.ts';
import { Rule, RuleError } from '../lib/rule.ts';

// ---------------------------------------------------------------------------
// RuleError
// ---------------------------------------------------------------------------

describe('RuleError', () => {
    it('has the correct name and message', () => {
        const err = new RuleError('something went wrong');
        assert.equal(err.name, 'RuleError');
        assert.equal(err.message, 'something went wrong');
        assert.ok(err instanceof Error);
    });
});

// ---------------------------------------------------------------------------
// Rule constructor
// ---------------------------------------------------------------------------

describe('Rule constructor', () => {
    it('constructs when boundaries match', () => {
        const r = new Rule(gen('f', 2, 1), gen('g', 2, 1), 'test');
        assert.equal(r.name, 'test');
        assert.equal(r.equiv, true);
        assert.equal(r.lhs.numEdges(), 1);
        assert.equal(r.rhs.numEdges(), 1);
    });

    it('defaults name to empty string and equiv to true', () => {
        const r = new Rule(gen('f', 1, 1), gen('g', 1, 1));
        assert.equal(r.name, '');
        assert.equal(r.equiv, true);
    });

    it('accepts equiv = false', () => {
        const r = new Rule(gen('f', 1, 1), gen('g', 1, 1), 'directed', false);
        assert.equal(r.equiv, false);
    });

    it('throws RuleError when input counts differ', () => {
        assert.throws(() => new Rule(gen('f', 2, 1), gen('g', 1, 1)), RuleError);
    });

    it('throws RuleError when output counts differ', () => {
        assert.throws(() => new Rule(gen('f', 1, 2), gen('g', 1, 1)), RuleError);
    });

    it('works with 0-arity boundaries (scalars)', () => {
        const r = new Rule(gen('s', 0, 0), gen('t', 0, 0), 'scalar');
        assert.equal(r.lhs.inputs().length, 0);
        assert.equal(r.rhs.outputs().length, 0);
    });
});

// ---------------------------------------------------------------------------
// Rule.copy()
// ---------------------------------------------------------------------------

describe('Rule.copy()', () => {
    it('returns a copy with the same name and equiv', () => {
        const r = new Rule(gen('f', 1, 1), gen('g', 1, 1), 'myRule', false);
        const r2 = r.copy();
        assert.equal(r2.name, 'myRule');
        assert.equal(r2.equiv, false);
    });

    it('produces independent graph copies', () => {
        const r = new Rule(gen('f', 1, 1), gen('g', 1, 1), 'r');
        const r2 = r.copy();
        r2.lhs.addVertex();
        assert.notEqual(r.lhs.numVertices(), r2.lhs.numVertices());
        r2.rhs.addVertex();
        assert.notEqual(r.rhs.numVertices(), r2.rhs.numVertices());
    });
});

// ---------------------------------------------------------------------------
// Rule.converse()
// ---------------------------------------------------------------------------

describe('Rule.converse()', () => {
    it('swaps lhs and rhs', () => {
        const lhs = gen('f', 2, 1);
        const rhs = gen('g', 2, 1);
        const r = new Rule(lhs, rhs, 'r');
        const rc = r.converse();
        assert.equal(rc.lhs.numEdges(), rhs.numEdges());
        assert.equal(rc.rhs.numEdges(), lhs.numEdges());
    });

    it('prepends - to the name', () => {
        const r = new Rule(gen('f', 1, 1), gen('g', 1, 1), 'myRule');
        assert.equal(r.converse().name, '-myRule');
    });

    it('strips a leading - from the name', () => {
        const r = new Rule(gen('f', 1, 1), gen('g', 1, 1), '-myRule');
        assert.equal(r.converse().name, 'myRule');
    });

    it('produces an independent copy (mutating converse does not affect original)', () => {
        const r = new Rule(gen('f', 1, 1), gen('g', 1, 1), 'r');
        const rc = r.converse();
        rc.lhs.addVertex();
        assert.notEqual(r.rhs.numVertices(), rc.lhs.numVertices());
    });
});

// ---------------------------------------------------------------------------
// Rule.isLeftLinear()
// ---------------------------------------------------------------------------

describe('Rule.isLeftLinear()', () => {
    it('returns true when all boundary vertices are distinct', () => {
        // gen('f', 2, 2) has 2 distinct inputs and 2 distinct outputs
        const r = new Rule(gen('f', 2, 2), gen('g', 2, 2));
        assert.ok(r.isLeftLinear());
    });

    it('returns true for a scalar rule (no boundary vertices)', () => {
        const r = new Rule(gen('s', 0, 0), gen('t', 0, 0));
        assert.ok(r.isLeftLinear());
    });

    it('returns false when a vertex appears in both inputs and outputs', () => {
        // identity() shares the same vertex for input and output
        const r = new Rule(identity(), identity());
        assert.equal(r.isLeftLinear(), false);
    });
});
