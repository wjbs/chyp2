import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import "../index.css";
import { /* updateOptimSettings, */ updateSettings } from "../../lib/util";
function FloatInput({ name, value, update }) {
    return _jsxs("label", { children: [name, ":", _jsx("input", { value: value, name: name, type: "number", step: "0.5", onInput: (newVal) => update(Number(newVal.currentTarget.value)) })] });
}
// interface SelectInputProps {
//     name : string, 
//     value: number, 
//     update : (newVal : number) => void
// }
// function SelectInput({name, value, values, update} : SelectInputProps) {
//     return <label>
//         {name}:
//         <input value={value} name={name} type="number"
//             onInput={(newVal) => update(Number(newVal.currentTarget.value))}/>
//     </label>
// }
export function OPTIMSettingsView({ s, update }) {
    // const updateKey = (key : keyof OPTIMSettings) => 
    //     (newval : OPTIMSettings[key])
    // const update_min_boundary_height = (newval : number) => {
    //     update({...s, min_boundary_height : newval});
    // }
    // const update_boundary_weight = (newval : number) => {
    //     update({...s, boundary_weight : newval});
    // }
    // const update_edge_gap_weight = (newval : number) => {
    //     update({...s, edge_gap_weight : newval});
    // }
    // const update_vertex_gap_weight = (newval : number) => {
    //     update({...s, vertex_gap_weight : newval});
    // }
    // const update_edge_gap_factor = (newval : number) => {
    //     update({...s, edge_gap_factor : newval});
    // }
    const keys = [];
    let k;
    for (k in s) {
        keys.push(k);
    }
    return _jsx("div", { children: keys.map(key => _jsx(FloatInput, { name: key, value: s[key], update: newval => {
                const newSettings = { ...s };
                newSettings[key] = newval;
                update(newSettings);
            } })) });
}
// import Collapsible from 'react-collapsible';
export function SettingsView({ s, update }) {
    if (s === null || update === null) {
        return _jsx("text", { children: "Settings created improperly" });
    }
    const update_OPTIM = (newval) => {
        const newSettings = updateSettings({ OPTIM: newval }, s);
        update({ ...newSettings });
    };
    return _jsxs("div", { className: "settings-panel", children: [_jsx("h3", { children: " Optimization settings " }), _jsx(OPTIMSettingsView, { s: s.OPTIM, update: update_OPTIM })] });
}
