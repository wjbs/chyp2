import { X } from 'lucide-preact';

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

export function TabBar({ tabs, activeId, onActivate, onClose }: Props) {
    if (tabs.length === 0) return null;
    return (
        <div class="tab-bar">
            {tabs.map((tab) => (
                <div
                    key={tab.id}
                    class={`tab${tab.id === activeId ? ' active' : ''}`}
                    onClick={() => onActivate(tab.id)}
                >
                    <span class="tab-name">
                        <span class="dirty-dot" title="Unsaved changes" aria-hidden={!tab.dirty} style={{ opacity: tab.dirty ? 1 : 0 }} />
                        {tab.name}
                    </span>
                    <button
                        class="tab-close"
                        title="Close tab"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose(tab.id);
                        }}
                    >
                        <X size={12} />
                    </button>
                </div>
            ))}
        </div>
    );
}

export type { Tab };
