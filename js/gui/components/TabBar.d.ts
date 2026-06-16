interface Tab {
    id: string;
    path: string;
    name: string;
    dirty: boolean;
}
interface Props {
    tabs: Tab[];
    activeId: string | null;
    onActivate: (id: string) => void;
    onClose: (id: string) => void;
}
export declare function TabBar({ tabs, activeId, onActivate, onClose }: Props): import("preact").JSX.Element | null;
export type { Tab };
