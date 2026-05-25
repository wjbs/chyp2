import { useEffect, useRef } from 'preact/hooks';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';

interface EditorProps {
    initialContent?: string;
    onChange?: (content: string) => void;
}

export function Editor({ initialContent = '', onChange }: EditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const extensions = [basicSetup];

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
