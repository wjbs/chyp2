Chyp2 is a browser-based port of [Chyp](https://github.com/akissinger/chyp), an automated theorem prover for string diagrams. The original Chyp was written in Python, and this version is a port to TypeScript.

Not much is working yet, but currently it can:
- Parse chyp source code
- Typecheck string diagram compositions and rules (i.e. check diagrams have the correct numbers of input/output wires)
- Draw the current diagram or rule under the cursor

The minimum viable product will also include:
- Basic file IO, probably using [Dododir](https://github.com/akissinger/dododir) as a backend
- Checking of proof steps using the three basic Chyp tactics: `refl`, `rule`, and `simp`
- (maybe) an implementation of the Chyp module system


