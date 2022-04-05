import { DirectionDelta } from "Object/MoveableObject";
import { AnyObject, ObjectConstant } from "Object/type";

export type GameTask = CreateObjects | DeleteObjects | MoveObject;
export type GameTaskType = "createObjectsTask" | "deleteObjectsTask" | "moveObjectTask";
export type SpecifiedGameTask<T extends GameTaskType> = T extends "createObjectsTask"
    ? CreateObjects
    : T extends "deleteObjectsTask"
    ? DeleteObjects
    : T extends "moveObjectTask"
    ? MoveObject
    : never;

export interface BaseTask {
    id: string;
    type: GameTaskType;
}
export interface CreateObjects extends BaseTask {
    type: "createObjectsTask";
    objectList: Omit<AnyObject, "id">[];
}
export interface DeleteObjects extends BaseTask {
    type: "deleteObjectsTask";
    objectList: AnyObject[];
}
export interface MoveObject extends BaseTask {
    type: "moveObjectTask";
    object: AnyObject;
    directionDelta: DirectionDelta;
}
