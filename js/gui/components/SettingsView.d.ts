import "../index.css";
import { type Chyp2Settings, type OPTIMSettings } from "../../lib/util";
import type { JSX } from "preact/jsx-runtime";
interface SettingsViewProps<T> {
    s: T;
    update: (news: T) => void;
}
export declare function OPTIMSettingsView({ s, update }: SettingsViewProps<OPTIMSettings>): JSX.Element;
export declare function SettingsView({ s, update }: SettingsViewProps<Chyp2Settings>): JSX.Element;
export {};
