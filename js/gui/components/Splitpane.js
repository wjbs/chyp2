import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { useState, useRef, useCallback, useEffect } from "preact/hooks";
const Splitpane = ({ children, splitRatio = 0.5, orientation = "horizontal", showSecondPanel = true }) => {
    const [percent, setPercent] = useState(splitRatio * 100);
    const [isDragging, setIsDragging] = useState(false);
    const splitpaneRef = useRef(null);
    const separatorRef = useRef(null);
    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);
    const handleMouseMove = useCallback((e) => {
        if (!isDragging || !splitpaneRef.current)
            return;
        const container = splitpaneRef.current;
        const containerRect = container.getBoundingClientRect();
        let newSize;
        if (orientation === "horizontal") {
            const containerWidth = containerRect.width;
            const mouseX = e.clientX - containerRect.left;
            newSize = (mouseX / containerWidth) * 100;
        }
        else {
            const containerHeight = containerRect.height;
            const mouseY = e.clientY - containerRect.top;
            newSize = (mouseY / containerHeight) * 100;
        }
        // Apply min/max constraints
        // const containerSize =
        //   orientation === "horizontal" ? containerRect.width : containerRect.height;
        newSize = Math.max(0, Math.min(100, newSize));
        setPercent(newSize);
    }, [isDragging, orientation]);
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);
    useEffect(() => {
        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = orientation === "horizontal" ? "col-resize" : "row-resize";
            document.body.style.userSelect = "none";
            return () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp, orientation]);
    return (_jsxs("div", { ref: splitpaneRef, className: "splitpane", style: {
            display: "flex",
            flexDirection: orientation === "horizontal" ? "row" : "column",
            width: "100%",
            height: "100%",
            overflow: "hidden",
        }, children: [_jsx("div", { style: {
                    flex: "none",
                    width: orientation === "horizontal" && showSecondPanel ? `${percent}%` : "100%",
                    height: orientation !== "horizontal" && showSecondPanel ? `${percent}%` : "100%",
                    overflow: "hidden",
                    display: "block",
                }, children: children[0] }), _jsx("div", { ref: separatorRef, style: {
                    flex: "none",
                    cursor: orientation === "horizontal" ? "col-resize" : "row-resize",
                    width: orientation === "horizontal" ? "4px" : "100%",
                    height: orientation === "horizontal" ? "100%" : "4px",
                    position: "relative",
                    zIndex: 1,
                    backgroundColor: isDragging
                        ? "var(--tikzit-sash-hoverBorder)"
                        : "var(--tikzit-sash-border)",
                }, onMouseDown: handleMouseDown, onMouseEnter: e => {
                    if (!isDragging) {
                        e.target.style.backgroundColor = "var(--tikzit-sash-hoverBorder)";
                    }
                }, onMouseLeave: e => {
                    if (!isDragging) {
                        e.target.style.backgroundColor = "var(--tikzit-sash-border)";
                    }
                } }), _jsx("div", { style: {
                    flex: "1",
                    overflow: "hidden",
                    display: showSecondPanel ? "block" : "none",
                }, children: children[1] })] }));
};
export default Splitpane;
