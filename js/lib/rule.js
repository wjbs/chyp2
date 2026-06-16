// chyp - An interactive theorem prover for string diagrams
// Copyright (C) 2022 - Aleks Kissinger
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { Graph } from "./graph.js";
export class RuleError extends Error {
    constructor(message) {
        super(message);
        this.name = 'RuleError';
    }
}
export class Rule {
    lhs;
    rhs;
    name;
    equiv;
    constructor(lhs, rhs, name = '', equiv = true) {
        if (lhs.inputs().length !== rhs.inputs().length ||
            lhs.outputs().length !== rhs.outputs().length) {
            throw new RuleError('Inputs and outputs must match on LHS and RHS of rule');
        }
        this.lhs = lhs;
        this.rhs = rhs;
        this.name = name;
        this.equiv = equiv;
    }
    copy() {
        return new Rule(this.lhs.copy(), this.rhs.copy(), this.name, this.equiv);
    }
    converse() {
        const name = this.name.startsWith('-') ? this.name.slice(1) : '-' + this.name;
        return new Rule(this.rhs.copy(), this.lhs.copy(), name, true);
    }
    /** Returns true if the boundary on the LHS embeds injectively (no repeated vertex in inputs/outputs) */
    isLeftLinear() {
        const verts = new Set();
        for (const v of [...this.lhs.inputs(), ...this.lhs.outputs()]) {
            if (verts.has(v))
                return false;
            verts.add(v);
        }
        return true;
    }
}
