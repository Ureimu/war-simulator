import { configure, getLogger } from "log4js";
import { AnyObject } from "Object/type";
import { terrainGenerator } from "terrainGenerator";
import { Coord } from "utils/Grid/type";
import { RoomGridMap } from "utils/RoomGridMap/RoomGridMap";
import { CreateObjects, DeleteObjects, GameTask, GameTaskType, MoveObject, SpecifiedGameTask } from "./type";
import { spawnSync } from "child_process";
import { copyIt } from "utils/fs/copy";
import { testControl } from "Control";
import { cache, concurrency } from "sharp";
import { removeDir } from "utils/fs/removeDir";
import { checkPath } from "utils/pathCheck";
configure({
    appenders: {
        work: { type: "file", filename: "work.log" },
        updateObject: { type: "file", filename: "work.log" },
        updateTerrain: { type: "file", filename: "work.log" },
        updateVisual: { type: "file", filename: "work.log" }
    },
    categories: { default: { appenders: ["work"], level: "INFO" } }
});
const logger = getLogger("Game");
logger.level = "debug";
export class Game {
    public map: RoomGridMap;
    public constructor(size: Coord) {
        const map = new RoomGridMap(size, terrainGenerator(size), new Map<string, AnyObject>(), "testRoom", "testRoom");
        this.map = map;
        cache(false); // 一定要不使用缓存！否则会有各种问题。

        testControl();
        removeDir("movie");
        // await sleep(1000);
        removeDir("out");
        checkPath(["out", "cache", "movie"]);
        concurrency(4);
    }
    public tick = 0;

    public taskQueue: GameTask[] = [];

    public pushTask(task: GameTask): void {
        this.taskQueue.push(task);
    }

    public taskTypeList: GameTaskType[] = ["createObjectsTask", "deleteObjectsTask", "moveObjectTask"];

    public async start(): Promise<void> {
        await this.map.drawMap("out/testPic.png");
    }

    public async runLoop(): Promise<void> {
        logger.info(`Game.runLoop: tick: ${this.tick}`);
        this.runTaskQueue();
        await this.map.updateMap("out/testPic.png", `tick: ${this.tick}`);
        copyIt("out/testPic.png", `out/${this.tick}.png`);
        this.tick++;
    }

    public finish(): void {
        const returns = spawnSync("ffmpeg", [
            "-f",
            "image2",
            "-y",
            "-i",
            "out/%d.png",
            "-filter:v",
            `setpts=8.0*PTS`,
            `movie/${"test"}.avi`
        ]);
        console.log(returns.output.toString());
    }

    public runTaskQueue(): void {
        this.taskQueue.forEach(i => {
            (this[i.type] as (task: GameTask) => void)(i);
        });
        this.taskQueue = [];
    }

    public createObjects(...objects: Omit<AnyObject, "id">[]): void {
        this.pushTask({
            type: "createObjectsTask",
            objectList: objects,
            id: _.uniqueId()
        });
    }

    public deleteObjects(...objects: AnyObject[]): void {
        this.pushTask({
            type: "deleteObjectsTask",
            objectList: objects,
            id: _.uniqueId()
        });
    }

    private createObjectsTask(task: CreateObjects): void {
        this.map.createObjects(...task.objectList);
        return;
    }
    private deleteObjectsTask(task: DeleteObjects): void {
        this.map.deleteObjects(...task.objectList);
        return;
    }
    private moveObjectTask(task: MoveObject): void {
        const newPos = { x: task.object.x + task.directionDelta.x, y: task.object.y + task.directionDelta.y };
        this.map.updateObject(task.object, newPos);
        return;
    }
}

function GameTaskIsTypedTask<T extends GameTaskType>(type: T) {
    return (task: GameTask): task is SpecifiedGameTask<T> => {
        return task.type === type;
    };
}
