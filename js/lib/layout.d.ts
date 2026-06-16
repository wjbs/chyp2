import { Graph } from './graph.ts';
/**
 * Lay out a graph using layer decomposition and iterative y-coordinate relaxation.
 *
 * This is a heuristic replacement for the convex-optimisation-based layout in the
 * original Python implementation.  X-coordinates are assigned deterministically from
 * the layer structure; y-coordinates are then refined over several iterations to
 * minimise wire bending while keeping elements in each layer at least the required
 * distance apart.
 *
 * Each iteration does four steps:
 *   1. Set each edge's y to the average of its source-vertex y-coordinates (adjusted
 *      for the vertex's position within the source list).
 *   2. Enforce minimum spacing between consecutive edges in the same layer.
 *   3. Set each vertex's y to the average of the positions suggested by its incident
 *      edges.
 *   4. Enforce minimum spacing of 1.0 between consecutive boundary vertices.
 *
 * After iteration the whole diagram is centred and non-boundary target vertices are
 * snapped to their incoming edge.
 */
export declare function convexLayout(g: Graph, force?: boolean): void;
