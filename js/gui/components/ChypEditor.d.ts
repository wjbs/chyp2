export interface ChypEditorProps {
    filename: string;
    content: string;
    onChange: (content: string) => void;
}
export declare function ChypEditor({ filename: _filename, content, onChange }: ChypEditorProps): import("preact").JSX.Element;
