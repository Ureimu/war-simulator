import { AnyObject } from "object/type";
import { terrainGenerator } from "terrainGenerator";
import { Coord } from "utils/Grid/type";
import { RoomGridMap } from "utils/RoomGridMap/RoomGridMap";

export class Game {
    public map: RoomGridMap;
    public constructor(size: Coord) {
        const map = new RoomGridMap(size, terrainGenerator(size), new Map<string, AnyObject>(), "testRoom", "testRoom");
        this.map = map;
    }
}
