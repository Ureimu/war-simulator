import { Game } from "Game";
import { BaseObject } from "Object";
import { AnyObject, ObjectConstant } from "Object/type";
import { Grid } from "utils/Grid";
import { Coord } from "utils/Grid/type";
import { GridMap } from "utils/RoomGridMap";

export type Direction = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export interface DirectionMap {
    0: { x: 0; y: 1 };
    1: { x: 1; y: 1 };
    2: { x: 1; y: 0 };
    3: { x: 1; y: -1 };
    4: { x: 0; y: -1 };
    5: { x: -1; y: -1 };
    6: { x: -1; y: 0 };
    7: { x: -1; y: 1 };
}
export type DirectionDelta = DirectionMap[keyof DirectionMap];

export class MoveableObject extends BaseObject {
    public constructor(public readonly game: Game, public readonly object: AnyObject) {
        super(game, object);
    }

    public findPath(...args: Parameters<Grid["findPath"]>): ReturnType<Grid["findPath"]> {
        return this.game.map.findPath(...args);
    }

    private directionMap: DirectionMap = {
        0: { x: 0, y: 1 },
        1: { x: 1, y: 1 },
        2: { x: 1, y: 0 },
        3: { x: 1, y: -1 },
        4: { x: 0, y: -1 },
        5: { x: -1, y: -1 },
        6: { x: -1, y: 0 },
        7: { x: -1, y: 1 }
    };
    public move(direction: Direction | DirectionDelta): void {
        if (typeof direction === "number") {
            const dxy = this.directionMap[direction];
            this.game.pushTask({ type: "moveObjectTask", directionDelta: dxy, object: this.object, id: _.uniqueId() });
        } else {
            this.game.pushTask({
                type: "moveObjectTask",
                directionDelta: direction,
                object: this.object,
                id: _.uniqueId()
            });
        }
        return;
    }

    public moveTo(dest: Coord, range?: number): void {
        const pathResult = this.findPath(this.object, dest, range ?? 1);
        if (pathResult.isFinish && pathResult.path.length > 1) {
            const pathPoint = pathResult.path[1];
            const delta = { x: pathPoint.x - this.object.x, y: pathPoint.y - this.object.y } as DirectionDelta;
            this.move(delta);
        }
    }
}
