import { Game } from "Game";
import { Coord } from "utils/Grid/type";
import { GridMap } from "utils/RoomGridMap";
import { AnyObject, ObjectConstant } from "./type";

export class BaseObject {
    public constructor(public readonly game: Game, public readonly object: AnyObject) {}
}
