import { terrainGenerator } from "terrainGenerator";
import { Grid } from "utils/Grid";
import { Coord } from "utils/Grid/type";
import { RoomGridMap } from "utils/RoomGridMap/RoomGridMap";

export class PlayerMap {
    public constructor(private map: RoomGridMap) {}

    public findPath(...args: Parameters<Grid["findPath"]>): ReturnType<Grid["findPath"]> {
        return this.map.findPath(...args);
    }
}
