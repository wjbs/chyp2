import { createToken, Lexer, EmbeddedActionsParser } from "chevrotain";

const WhiteSpace = createToken({ name: "WhiteSpace", pattern: /[ \t\n\r]+/, group: Lexer.SKIPPED });
const Comment = createToken({ name: "Comment", pattern: /#[^\n]*/, group: Lexer.SKIPPED });

// keywords
const Gen = createToken({ name: "Gen", pattern: /gen/ });
const Def = createToken({ name: "Def", pattern: /def/ });
const Let = createToken({ name: "Let", pattern: /let/ });
const Show = createToken({ name: "Show", pattern: /show/ });
const Rule = createToken({ name: "Rule", pattern: /rule/ });
const Rewrite = createToken({ name: "Rewrite", pattern: /rewrite/ });
const By = createToken({ name: "By", pattern: /by/ });
const Color = createToken({ name: "Color", pattern: /color/ });
const Converse = createToken({ name: "Converse", pattern: /converse/ });
const Import = createToken({ name: "Import", pattern: /import/ });
const Sw = createToken({ name: "Sw", pattern: /sw/ });
const Id = createToken({ name: "Id", pattern: /id/ });
const Id0 = createToken({ name: "Id0", pattern: /id0/ });

// symbols
const Colon = createToken({ name: "Colon", pattern: /:/ });
const Question = createToken({ name: "Question", pattern: /\?/ });
const Arrow = createToken({ name: "Arrow", pattern: /->/ });
const LParen = createToken({ name: "LParen", pattern: /\(/ });
const RParen = createToken({ name: "RParen", pattern: /\)/ });
const LBracket = createToken({ name: "LBracket", pattern: /\[/ });
const RBracket = createToken({ name: "RBracket", pattern: /\]/ });
const Comma = createToken({ name: "Comma", pattern: /,/ });
const Minus = createToken({ name: "Minus", pattern: /-/ });
const Plus = createToken({ name: "Plus", pattern: /\\+/ });
const Semicolon = createToken({ name: "Semicolon", pattern: /;/ });
const Star = createToken({ name: "Star", pattern: /\*/ });
const Eq = createToken({ name: "Eq", pattern: /=/ });

// numbers and identifiers
const Nat = createToken({ name: "Nat", pattern: /[0-9]+/ });
const HexColor = createToken({ name: "HexColor", pattern: /\\"[0-9a-fA-F]{6}\\"/ });
const Identifier = createToken({ name: "Identifier", pattern: /[a-zA-Z_][a-zA-Z0-9_.]*/ });

const allTokens = [
    WhiteSpace,
    Comment,
    Gen,
    Def,
    Let,
    Show,
    Rule,
    Rewrite,
    By,
    Color,
    Converse,
    Import,
    Sw,
    Id,
    Id0,
    Colon,
    Question,
    Arrow,
    LParen,
    RParen,
    LBracket,
    RBracket,
    Comma,
    Minus,
    Plus,
    Semicolon,
    Star,
    Eq,
    Nat,
    HexColor,
    Identifier,
];

export class ParseError extends Error {
    public line: number;
    public column: number;
    public message: string;
    constructor(line: number, column: number, message: string) {
        super(message);
        this.line = line;
        this.column = column;
        this.message = message;
    }
}

export class ChypParser extends EmbeddedActionsParser {
    constructor() {
        super(allTokens);
        this.performSelfAnalysis();
    }

    public document = this.RULE("document", () => {
        this.MANY(() => this.SUBRULE(this.statement));
    });

    public statement = this.RULE("statement", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.import) },
            { ALT: () => this.SUBRULE(this.gen) },
            { ALT: () => this.SUBRULE(this.let) },
            { ALT: () => this.SUBRULE(this.def) },
            { ALT: () => this.SUBRULE(this.rule) },
            { ALT: () => this.SUBRULE(this.rewrite) },
            { ALT: () => this.SUBRULE(this.show) },
        ]);
    });

    public import = this.RULE("import", () => {
        this.CONSUME(Import);
        this.CONSUME(Identifier);
    });

    public gen = this.RULE("gen", () => {
    });

    public let = this.RULE("let", () => {
    });

    public def = this.RULE("def", () => {
    });

    public rule = this.RULE("rule", () => {
    });

    public rewrite = this.RULE("rewrite", () => {
    });

    public show = this.RULE("show", () => {
    });
}