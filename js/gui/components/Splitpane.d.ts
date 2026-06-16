import type { ComponentChildren } from "preact";
interface SplitpaneProps {
    children: [ComponentChildren, ComponentChildren];
    splitRatio?: number;
    orientation?: "horizontal" | "vertical";
    showSecondPanel?: boolean;
}
declare const Splitpane: ({ children, splitRatio, orientation, showSecondPanel }: SplitpaneProps) => import("preact").JSX.Element;
export default Splitpane;
