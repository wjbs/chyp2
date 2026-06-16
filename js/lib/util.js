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
