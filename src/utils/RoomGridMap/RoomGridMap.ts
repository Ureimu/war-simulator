import { MultiBar, Presets, SingleBar } from "cli-progress";
import { AnyObject, ObjectConstant, SpecifiedObject } from "object/type";
import sharp from "sharp";
import { DrawMap } from "utils/blockVisual/draw";
import { CONTROLLER_STRUCTURES } from "utils/common/constants";
import { BuildableStructureConstant, ControllerLevel } from "utils/common/type";
import { Grid } from "utils/Grid/Grid";
import { Coord, GridPosition } from "utils/Grid/type";
import { SvgCode } from "utils/SvgCode";
import { RoomGridPosition } from "./type";
export interface UpdateData {
    queue: number[];
    columnSize: number;
}
export class RoomGridMap extends Grid {
    public test = true;
    public static multiBar = new MultiBar(
        {
            clearOnComplete: false,
            hideCursor: true,
            format: `{progressName} | {bar} | ETA: {eta}s | {percentage}% || {value}/{total} Chunks || {label} || {log}`,
            barCompleteChar: "\u2588",
            barIncompleteChar: "\u2591"
        },
        Presets.shades_grey
    );
    public grid: RoomGridPosition[][] = this.grid;
    public visualizeDataList: SvgCode[] = [];
    public centerPos?: Coord;
    public updateData: UpdateData;
    public structureNumber: {
        [name: string]: {
            origin: { [level in ControllerLevel]?: number };
            total: { [level in ControllerLevel]: number };
            totalLimit: { [level in ControllerLevel]: number };
        };
    } = {};
    public coordToID(coord: Coord): number {
        return coord.x + coord.y * this.gridSize.x;
    }
    public IDToGridPosition(ID: number): GridPosition {
        return this.gridPos({ x: ID % this.gridSize.x, y: Math.floor(ID / this.gridSize.x) });
    }
    public pushToUpdateQueue(coord: Coord): boolean {
        const id = this.coordToID(coord);
        const isExist = this.updateData.queue.includes(id);
        if (!isExist) {
            this.updateData.queue.push(id);
        }
        return isExist;
    }
    public gridPos(coord: Coord): RoomGridPosition {
        const pos = this.grid[coord.x][coord.y];
        if (!pos) throw Error(`valid pos:x:${coord.x}, y:${coord.y}`);
        return pos;
    }
    private readonly terrainMap: { "0": "plain"; "1": "wall"; "2": "swamp"; "3": "wall" } = {
        "0": "plain",
        "1": "wall",
        "2": "swamp",
        "3": "wall"
    };
    private readonly terrainCost: { plain: number; wall: number; swamp: number } = {
        plain: this.BASE_COST * 2,
        wall: this.MAX_COST,
        swamp: this.BASE_COST * 10
    };
    private readonly roadCost = this.BASE_COST;
    public constructor(
        size: { x: number; y: number },
        public readonly terrainData: string,
        public objects: Map<string, AnyObject>,
        public readonly roomName: string,
        public readonly name: string
    ) {
        super(size, 1);
        this.grid = (this.grid as GridPosition[][]).map((xStack, x) => {
            return xStack.map((pos, y) => {
                const terrainType = this.terrainMap[terrainData[x + y * size.x] as "0" | "1" | "2" | "3"];
                const terrainCost = this.terrainCost[terrainType];
                return {
                    ...pos,
                    cost: terrainCost,
                    terrain: this.terrainMap[terrainData[x + y * size.x] as "0" | "1" | "2" | "3"],
                    objects: this.getObjectsInPos({ x, y }, Array.from(objects.values()))
                };
            });
        });
        this.updateData = { queue: [], columnSize: size.x };
    }

    private getStatsOfStructure(type: BuildableStructureConstant, level: ControllerLevel, num: number): number {
        let numList = this.structureNumber[type];
        if (!numList)
            this.structureNumber[type] = {
                origin: {},
                total: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
                totalLimit: CONTROLLER_STRUCTURES[type]
            };
        numList = this.structureNumber[type];

        const levelData = numList.origin[level];
        if (!levelData) {
            numList.origin[level] = num;
        } else {
            (numList.origin[level] as number) += num;
        }

        let sumNum = 0;
        for (let i = 0; i <= level; i++) {
            const index = i as ControllerLevel;
            const originData = numList.origin[index];
            if (originData) sumNum += originData;
            numList.total[index] = sumNum;
            if (numList.total[index] > numList.totalLimit[index]) {
                // 超出数量限制了
                (numList.origin[level] as number) -= num;
                return numList.totalLimit[index] - numList.total[index];
            }
        }
        return numList.totalLimit[level] - numList.total[level];
    }

    public createObjects(...objects: Omit<AnyObject, "id">[]): AnyObject[] {
        const newObjectList: AnyObject[] = [];
        objects.forEach(object => {
            const newObject: AnyObject = { ...object, id: _.uniqueId() } as AnyObject;
            this.pushToUpdateQueue(newObject);
            this.objects.set(newObject.id, newObject);
            const gridPos = this.gridPos(newObject);
            this.setCostForPos(gridPos);
            newObjectList.push(newObject);
        });
        return newObjectList;
    }

    public deleteObjects(...objects: AnyObject[]): boolean[] {
        const boolList: boolean[] = [];
        objects.forEach(i => {
            const bool1 = this.objects.delete(i.id);
            this.pushToUpdateQueue(i);
            if ([bool1].includes(false)) boolList.push(false);
            else boolList.push(true);
        });
        return boolList;
    }

    public getObjectsInPos(coord: Coord, objects?: AnyObject[]): AnyObject[] {
        const { x, y } = coord;
        if (!objects) objects = Array.from(this.objects.values());
        return objects.filter(anyObject => anyObject.x === x && anyObject.y === y);
    }

    public findObjects<T extends ObjectConstant>(type: T): SpecifiedObject<T>[] {
        const typed = anyObjectIsTyped(type);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return Array.from(this.objects.values()).filter<SpecifiedObject<T>>(typed);
    }

    private getCostByPos(pos: Coord): number {
        const gridPos = this.gridPos(pos);

        return this.terrainCost[gridPos.terrain];
    }

    private setCostForPos(pos: Coord): void {
        const cost = this.getCostByPos(pos);
        if (cost !== this.gridPos(pos).cost) {
            if (!this.costHasChanged) this.costHasChanged = true;
            this.gridPos(pos).cost = cost;
        }
    }

    public createProgressBar(progressName: string): SingleBar {
        const progressBar = RoomGridMap.multiBar.create(1000, 0, { label: "starting", progressName });
        return progressBar;
    }

    /**
     * 画出布局图像
     *
     * @param {string} savePath
     * @returns {Promise<void>}
     * @memberof RoomGridMap
     */
    public async drawMap(savePath: string): Promise<void> {
        const progressBar = this.createProgressBar("draw map");
        await new DrawMap(this.mapSize).getVisual(
            this.terrainData,
            Array.from(this.objects.values()),
            this.visualizeDataList,
            progressBar,
            savePath,
            [this.gridSize.x, this.gridSize.y]
        );
        RoomGridMap.multiBar.stop();
        // RoomGridMap.multiBar.remove(progressBar);
    }

    public async updateMap(savePath: string, label?: string, blenderTest?: sharp.Blend): Promise<void> {
        let progressBar: SingleBar | undefined;
        if (this.test) {
            progressBar = this.createProgressBar(`update map ${label ?? ""}`);
        }
        // 猜想：需要一次刷新多个object，drawMap才会正常工作
        // 很不幸，这个猜想似乎是正确的

        await new DrawMap(this.mapSize).updateObjectVisual(
            this.updateData,
            this.terrainData,
            Array.from(this.objects.values()),
            this.visualizeDataList,
            this.test ? progressBar : undefined,
            savePath,
            [this.gridSize.x, this.gridSize.y],
            blenderTest
        );
        if (this.test) {
            RoomGridMap.multiBar.stop();
            if (progressBar) RoomGridMap.multiBar.remove(progressBar);
        }
    }

    public rPosStr(coord: Coord): string {
        return `x${coord.x}y${coord.y}r${this.roomName}`;
    }
}

function anyObjectIsTyped<T extends ObjectConstant>(type: T) {
    return (anyObject: AnyObject): anyObject is SpecifiedObject<T> => {
        return anyObject.type === type;
    };
}
