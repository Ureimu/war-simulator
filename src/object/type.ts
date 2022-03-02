import { StructureConstant } from "utils/common/type";

export type AnyObject = Source | Mineral | Controller | Soldier | Structure;
export type ObjectConstant = "source" | "mineral" | "controller" | "soldier" | StructureConstant;
export type SpecifiedObject<T extends ObjectConstant> = T extends "source"
    ? Source
    : T extends "mineral"
    ? Mineral
    : T extends "controller"
    ? Controller
    : T extends "soldier"
    ? Soldier
    : T extends StructureConstant
    ? Structure
    : never;
export interface BasicObject {
    x: number;
    y: number;
    type: ObjectConstant;
    id: string;
    // room: string;
}
export interface Source extends BasicObject {
    type: "source";
    // energy: number;
    // energyCapacity: number;
    // ticksToRegeneration: number;
    // invaderHarvested: number;
    // nextRegenerationTime: number;
}
export interface Mineral extends BasicObject {
    type: "mineral";
    mineralType: string;
    // mineralAmount: number;
}
export interface Controller extends BasicObject {
    type: "controller";
}
export interface Soldier extends BasicObject {
    type: "soldier";
}

export interface Structure extends BasicObject {
    type: StructureConstant;
}
