import { Graph } from './graph.ts';
import { Match } from './matcher.ts';
import { Rule } from './rule.ts';
/**
 * Do double-pushout rewriting.
 *
 * Given a rule `r` and a match of `r.lhs` into a graph, compute the rewrittern
 * graph and return a match `r.rhs` into it.
 */
export declare function dpo(r: Rule, m: Match): Match;
/**
 * Apply the given rewrite rule at match `m` and return the rewritten graph.
 *
 * Convenience wrapper around `dpo` for when the match data is not needed.
 */
export declare function rewrite(r: Rule, m: Match): Graph;
