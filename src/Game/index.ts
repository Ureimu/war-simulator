import { terrainGenerator } from "terrainGenerator";
import { Coord } from "utils/Grid/type";
import { RoomGridMap } from "utils/RoomGridMap/RoomGridMap";

export class Game {
    public map: RoomGridMap;
    public constructor(size: Coord) {
        const map = new RoomGridMap(
            size,
            terrainGenerator(size),
            [
                { x: 4, y: 4, type: "source", id: "1" },
                { x: 4, y: 5, type: "soldier", id: "2" }
            ],
            "testRoom",
            "testRoom"
        );
        this.map = map;
    }
}
