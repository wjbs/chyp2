export const SCALE = 100.0;
export function lineNumberForPosition(source, pos) {
    let line = 1;
    for (let i = 0; i < pos && i < source.length; i++) {
        if (source[i] === '\n') {
            line++;
        }
    }
    return line;
}
/**
  * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
  *
  * @param {String} text The text to be rendered.
  * @param {String} font The css font descriptor that text is to be rendered with (e.g. "bold 14px verdana").
  *
  * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
  */
let getTextWidthCanvas = null;
function getTextWidthFont(text, font) {
    // re-use canvas object for better performance
    const canvas = getTextWidthCanvas ?? (getTextWidthCanvas = document.createElement("canvas"));
    let context = canvas.getContext("2d");
    context.font = font;
    const metrics = context.measureText(text);
    return metrics.width;
}
function getTextWidthWithDom(text) {
    const font = "normal sans-serif " + (0.3 * SCALE);
    return (getTextWidthFont(text, font));
}
export var USE_DOM_FOR_TEXT_WIDTH = { USE_DOM_FOR_TEXT_WIDTH: true };
const charLengths = [750, 750, 750, 750, 750, 750, 750, 750, 750, 278, 278, 278, 278, 278, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, 500, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 750, 278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 0, 737, 552, 400, 549, 333, 333, 333, 576, 537, 333, 333, 333, 365, 556, 834, 834, 834, 611, 667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278, 556, 556, 556, 556, 556, 556, 556, 549, 611, 556, 556, 556, 556, 500, 556, 500];
const maxCharLength = charLengths.reduce((x, y) => Math.max(x, y));
export function approxTextWidth(s) {
    let len = 0;
    for (const c of s) {
        const ci = c.charCodeAt(0);
        if (Number.isNaN(ci)) {
            len += maxCharLength;
        }
        else {
            len += charLengths[ci] ?? maxCharLength;
        }
    }
    return len / 100;
}
export function getTextWidth(s) {
    if (USE_DOM_FOR_TEXT_WIDTH.USE_DOM_FOR_TEXT_WIDTH) {
        return getTextWidthWithDom(s);
    }
    else {
        return approxTextWidth(s);
    }
}
export function mkBezierC(p1x, p1y, cp1x, cp1y, cp2x, cp2y, p2x, p2y) {
    return `M ${p1x} ${p1y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2x} ${p2y}`;
}
export function curveBetween(p1x, p1y, p2x, p2y) {
    const cp1x = 0.6 * p1x + 0.4 * p2x;
    const cp1y = p1y;
    const cp2x = 0.4 * p1x + 0.6 * p2x;
    const cp2y = p2y;
    return mkBezierC(p1x, p1y, cp1x, cp1y, cp2x, cp2y, p2x, p2y);
}
export function curveTo(p1x, p1y, p2x, p2y) {
    const cp1x = 0.6 * p1x + 0.4 * p2x;
    const cp1y = p1y;
    const cp2x = 0.5 * cp1x + 0.5 * p2x;
    const cp2y = 0.5 * cp1y + 0.5 * p2y;
    return mkBezierC(p1x, p1y, cp1x, cp1y, cp2x, cp2y, p2x, p2y);
}
export function vertexiyShift(i, num) {
    return (num <= 1 ? 0 : (i / (num - 1)) - 0.5);
}
export function vertexyShift(v, st) {
    const idx = st.indexOf(v);
    if (idx === -1) {
        return 0;
    }
    else {
        return vertexiyShift(idx, st.length);
    }
}
