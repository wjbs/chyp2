import "../index.css";

import { /* updateOptimSettings, */ updateSettings, type Chyp2Settings, type OPTIMSettings } from "../../lib/util";
import type { JSX } from "preact/jsx-runtime";


// type Settable<T> = {
//     [Property in keyof T] : (newVal : Property) => void
// };

// type SettingLike<T, E> = {
//     [Property in keyof T] : (update : (newval : T[Property]) => void) => E
// };

// const Chyp2SettingsLike : SettingLike<Chyp2Settings, JSX.Element> = {

// }

// class 

// function distrSettable<T>(keys : [keyof T][], setter : (newval : T) => void) : Settable<T> {
//     const setters : Partial<Settable<T>> = {};
//     for (const k of keys) {
//         setters[k] =
//     }
    
// }


interface SettingsViewProps<T> {
    s : T;
    update : (news : T) => void
}

interface FloatInputProps {
    name : string, 
    value: number, 
    update : (newVal : number) => void
}

function FloatInput({name, value, update} : FloatInputProps) {
    return <label>
        {name}:
        <input value={value} name={name} type="number" step="0.5"
            onInput={(newVal) => update(Number(newVal.currentTarget.value))}/>
    </label>
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

export function OPTIMSettingsView({s, update} : SettingsViewProps<OPTIMSettings>) : JSX.Element {
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

    const keys : (keyof OPTIMSettings)[] = [];
    let k : keyof OPTIMSettings;
    for (k in s) {
        keys.push(k);
    }

    return <div>
        {keys.map(key =>
            <FloatInput name={key} value={s[key]} update={newval => {
                const newSettings = {...s};
                newSettings[key] = newval;
                update(newSettings);
                }
            }/>
        )}
        {/* <FloatInput name="min_boundary_height" value={s.min_boundary_height} update={update_min_boundary_height}/> */}
    </div>
    
}
// import Collapsible from 'react-collapsible';
export function SettingsView({s, update} : SettingsViewProps<Chyp2Settings>) : JSX.Element {
    if (s === null || update === null) {
        return <text>Settings created improperly</text>

    }
    const update_OPTIM = (newval : OPTIMSettings) => {
        const newSettings = updateSettings({OPTIM : newval}, s);
        update({...newSettings});
    }
    return <div className="settings-panel">
        <h3> Optimization settings </h3>
        <OPTIMSettingsView s={s.OPTIM} update={update_OPTIM}/>
        
    </div>
}