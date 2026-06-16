import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { X } from 'lucide-preact';
export function TabBar({ tabs, activeId, onActivate, onClose }) {
    if (tabs.length === 0)
        return null;
    return (_jsx("div", { class: "tab-bar", children: tabs.map((tab) => (_jsxs("div", { class: `tab${tab.id === activeId ? ' active' : ''}`, onClick: () => onActivate(tab.id), children: [_jsxs("span", { class: "tab-name", children: [_jsx("span", { class: "dirty-dot", title: "Unsaved changes", "aria-hidden": !tab.dirty, style: { opacity: tab.dirty ? 1 : 0 } }), tab.name] }), _jsx("button", { class: "tab-close", title: "Close tab", onClick: (e) => {
                        e.stopPropagation();
                        onClose(tab.id);
                    }, children: _jsx(X, { size: 12 }) })] }, tab.id))) }));
}
