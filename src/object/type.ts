export type AnyRoomObjects = Source | Mineral | Controller;
export type RoomObjectType = "source" | "mineral" | "controller";
export type SpecifiedRoomObject<T extends RoomObjectType> = T extends "source"
    ? Source
    : T extends "mineral"
    ? Mineral
    : T extends "controller"
    ? Controller
    : never;
export interface BasicRoomObject {
    x: number;
    y: number;
    type: RoomObjectType;
    id: string;
    // room: string;
}
export interface Source extends BasicRoomObject {
    type: "source";
    // energy: number;
    // energyCapacity: number;
    // ticksToRegeneration: number;
    // invaderHarvested: number;
    // nextRegenerationTime: number;
}
export interface Mineral extends BasicRoomObject {
    type: "mineral";
    mineralType: string;
    // mineralAmount: number;
}
export interface Controller extends BasicRoomObject {
    type: "controller";
}
