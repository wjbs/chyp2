Chyp2 is a browser-based port of [Chyp](https://github.com/akissinger/chyp), an automated theorem prover for string diagrams. The original Chyp was written in Python, and this version is a port to TypeScript.

Not much is working yet, but currently it can:
- Parse chyp source code
- Typecheck string diagram compositions and rules (i.e. check diagrams have the correct numbers of input/output wires)
- Draw the current diagram or rule under the cursor

The minimum viable product will also include:
- Basic file IO, probably using [Dododir](https://github.com/akissinger/dododir) as a backend
- Checking of proof steps using the three basic Chyp tactics: `refl`, `rule`, and `simp`
- (maybe) an implementation of the Chyp module system

# Usage

Chyp2 can be used as a stand-alone proof assistant, or it can be imported from other Javascript/TypeScript projects to provide access to the visualiser, prover, and/or chyp parser.

To use as a stand-alone proof assistant, run `npm run start` in the root directory of the project. This will start a local web server and print the URL.

## Library usage

To install the chyp library, use:
```bash
npm install git+https://github.com/akissinger/chyp2
```

The main data structure is the `Graph` class in `src/lib/graph.ts`. This class represents a string diagram as a directed hypergraph with lists of input/output vertices. Graphs can be constructed manually using the methods of the `Graph` class, loaded from JSON, or parsed from chyp source.

### Reading a graph from JSON

Use the `graphFromJson` function to deserialise a graph from a JSON string. The JSON object must have four top-level keys:

| Key | Type | Description |
|---|---|---|
| `vertices` | object | Map from vertex id to `{ value, x, y }` |
| `edges` | object | Map from edge id to `{ s, t, value, x, y }` |
| `inputs` | list | Ordered list of input vertex ids |
| `outputs` | list | Ordered list of output vertex ids |

All fields except `s` and `t` are optional. Vertex and edge ids should be non-negative integers, given as string literals. Coordinates `x` and `y` are floats, used for drawing the graph. They are not necessary if the graph will be laid out automatically.

```typescript
import { graphFromJson } from 'chyp2/lib/graph';

const json = `{
    "vertices": {
        "0": { "x": 0, "y": -0.5 },
        "1": { "x": 0, "y": 0.5 },
        "2": { "x": 2, "y": 0 },
        "3": { "x": 4, "y": -0.5 },
        "4": { "x": 4, "y": 0.5 }
    },
    "edges": {
        "0": { "s": ["0", "1"], "t": ["2"], "value": "f", "x": 1, "y": 0 },
        "1": { "s": ["2"], "t": ["3", "4"], "value": "g", "x": 3, "y": 0 }
    },
    "inputs":  ["0", "1"],
    "outputs": ["3", "4"]
}`;

const g = graphFromJson(json);
console.log(g.numVertices()); // 5
console.log(g.numEdges());    // 2
```


