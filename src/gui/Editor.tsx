import { useEffect, useRef } from 'preact/hooks';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { parser } from "../lib/parser"
import { foldNodeProp, foldInside, indentNodeProp, LRLanguage, LanguageSupport } from "@codemirror/language"
import { styleTags, tags } from "@lezer/highlight"

const chypLanguage = LRLanguage.define({
    parser: parser.configure({
        props: [
            styleTags({
                Identifier: tags.variableName,
                gen: tags.keyword,
                let: tags.keyword,
                def: tags.keyword,
                rule: tags.keyword,
                show: tags.keyword,
                as: tags.keyword,
                by: tags.keyword,
                HexColor: tags.string,
                Comment: tags.lineComment,
                "( )": tags.paren
            }),
            indentNodeProp.add({
                Application: context => context.column(context.node.from) + context.unit
            }),
            foldNodeProp.add({
                Application: foldInside
            })
        ]
    }),
    languageData: {
        commentTokens: { line: "#" }
    }
});

interface EditorProps {
    initialContent?: string;
    onChange?: (content: string) => void;
}

export function Editor({ initialContent = '', onChange }: EditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const extensions = [basicSetup, new LanguageSupport(chypLanguage)];

        if (onChange) {
            extensions.push(
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        onChange(update.state.doc.toString());
                    }
                })
            );
        }

        const view = new EditorView({
            state: EditorState.create({
                doc: initialContent,
                extensions,
            }),
            parent: containerRef.current,
        });

        return () => {
            view.destroy();
        };
    }, []);

    return (
        <div className="editor-panel">
            <div ref={containerRef} />
        </div>);
}
