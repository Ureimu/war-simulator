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
    public getObjects(): AnyObject[] {
        return this.grid
            .map((xStack, x) => {
                return xStack.map((pos, y) => {
                    return pos.objects;
                });
            })
            .flat(2);
    }
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
        public objects: AnyObject[],
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
                    objects: this.getObjectsInPos({ x, y }, objects)
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

    /**
     * 添加建筑到layout，总会返回当前rcl等级限制的最大建筑数量与当前的建筑总数的差值，
     * 如果超限会返回负数且不会添加任何建筑。
     *
     * @param {BuildableStructureConstant} type
     * @param {ControllerLevel} level
     * @param {number} priority
     * @param {...Coord[]} structures
     * @returns {number}
     * @memberof RoomGridMap
     */
    public addStructure(
        type: BuildableStructureConstant,
        level: ControllerLevel,
        priority: number,
        ...structures: Coord[]
    ): number {
        const structureType = type;
        const exceededNum = this.getStatsOfStructure(structureType, level, structures.length);
        if (exceededNum < 0) return exceededNum;
        const typedStructures = structures
            .filter(i => {
                const gridPos = this.gridPos(i);
                if (
                    gridPos.cost === this.MAX_COST &&
                    structureType !== "rampart" &&
                    structureType !== "road" &&
                    !(structureType === "extractor" && gridPos.objects.some(j => j.type === "mineral"))
                ) {
                    return false;
                }
                if (gridPos.cost === this.roadCost && structureType !== "container" && type !== "rampart") {
                    return false;
                }
                return true;
            })
            .map(i => {
                return { ...i, type, levelToBuild: level, priority, id: _.uniqueId() };
            });
        typedStructures.forEach(structure => {
            this.pushToUpdateQueue(structure);
            const gridPos = this.gridPos(structure);
            gridPos.objects.push(structure);
            this.setCostForPos(gridPos);
        });
        return exceededNum;
    }

    public addStructureByFillingLevel(
        type: BuildableStructureConstant,
        priority: (level: ControllerLevel, index: number, pos: Coord) => number,
        structures: Coord[]
    ): number {
        const coords = structures.map(coord => {
            return { x: coord.x, y: coord.y };
        });
        coords.reverse();
        let pos = coords.pop();
        let i = 0;
        let j = 0;
        let k = 0;
        // console.log(`start ${coords.length}`);
        while (pos) {
            const level = i as ControllerLevel;
            const exceededNum = this.addStructure(type, level, priority(level, k, pos), pos);
            if (exceededNum >= 0) {
                // console.log(`put level:${i}`);
                j++;
            }
            if (exceededNum < 0 && i < 8) {
                i++;
                // console.log(`upgrade level:${i}`);
                continue;
            }
            if (i >= 8 && exceededNum < 0) break;

            k++;
            // console.log(`str num:${k}`);
            pos = coords.pop();
        }
        // console.log(`end ex:${j}`);
        return j;
    }

    /**
     * 从layout移除建筑，总会返回当前rcl等级限制的最大建筑数量与当前的建筑总数的差值.
     *
     * @param {SpecifiedStructureNameList<BuildableStructureConstant>} type
     * @param {...Coord[]} structuresPos
     * @returns {number}
     * @memberof RoomGridMap
     */
    public removeStructure(type: BuildableStructureConstant, ...structuresPos: Coord[]): number {
        let deleteNum = 0;
        const structureType = type;
        structuresPos.forEach(structure => {
            const gridPos = this.gridPos(structure);
            const objects = gridPos.objects;
            const index = objects.findIndex(layoutStructure => layoutStructure.type === type);
            if (index !== -1) {
                const deletedStructure = objects.splice(index, 1)[0];
                this.pushToUpdateQueue(gridPos);
                this.setCostForPos(gridPos);
                // TODO controller支持
                this.getStatsOfStructure(structureType, 0 as ControllerLevel, -1);
                deleteNum++;
            }
        });
        const exceededNum = -deleteNum;
        return exceededNum;
    }

    public getObjectsInPos(coord: Coord, objects?: AnyObject[]): AnyObject[] {
        const { x, y } = coord;
        if (!objects) objects = this.objects;
        return objects.filter(anyObject => anyObject.x === x && anyObject.y === y);
    }

    public findObjects<T extends ObjectConstant>(type: T): SpecifiedObject<T>[] {
        const typed = anyObjectIsTyped(type);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this.objects.filter<SpecifiedObject<T>>(typed);
    }

    private getCostByPos(pos: Coord): number {
        const gridPos = this.gridPos(pos);
        const costList = gridPos.objects
            .map(structure => {
                const structureType = structure.type;
                if (structureType === "rampart" || structureType === "container") {
                    return -1;
                } else if (structureType === "road") {
                    return this.roadCost;
                } else {
                    return this.MAX_COST;
                }
            })
            .filter(x => x > 0);
        if (costList.length > 0) {
            return Math.max(...costList);
        } else {
            return this.terrainCost[gridPos.terrain];
        }
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
        this.objects = this.getObjects();
        await new DrawMap(this.mapSize).getVisual(
            this.terrainData,
            this.objects,
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
        this.objects = this.getObjects();
        // 猜想：需要一次刷新多个object，drawMap才会正常工作
        // 很不幸，这个猜想似乎是正确的

        await new DrawMap(this.mapSize).updateObjectVisual(
            this.updateData,
            this.terrainData,
            this.objects,
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
