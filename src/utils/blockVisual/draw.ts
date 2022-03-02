import { SingleBar } from "cli-progress";
import { getLogger } from "log4js";
import { AnyObject } from "object/type";
import sharp from "sharp";
import { coordUnitWidth, picBasePath } from "utils/common/constants";
import { Range } from "utils/common/type";
import { coordToID, IDToCoord } from "utils/coordWithID";
import { Coord } from "utils/Grid/type";
import { UpdateData } from "utils/RoomGridMap/RoomGridMap";
import { sleep } from "utils/sleep";
import { SvgCode } from "utils/SvgCode";
import { getObjectPictureBuffer } from "./imgMap";

export class DrawMap {
    public test: boolean;
    public constructor(public rangeSettings: Range) {
        this.test = true;
    }
    private terrainMap: { "0": "plain"; "1": "wall"; "2": "swamp"; "3": "wall"; "4": "empty" } = {
        "0": "plain",
        "1": "wall",
        "2": "swamp",
        "3": "wall",
        "4": "empty"
    };
    /**
     * 一次布局超过166个图片在测试中会导致未知错误，只好采取折中
     *
     * @param {sharp.OverlayOptions[]} compositeInput
     * @param {string} outputPath
     * @returns {Promise<void>}
     * @memberof DrawMap
     */
    public async compositeLayout(
        compositeInput: sharp.OverlayOptions[],
        outputPath: string,
        drawBaseSize: [number, number] | false,
        progressBar?: SingleBar,
        label?: string,
        log?: string,
        blenderTest?: sharp.Blend
    ): Promise<void> {
        // 一次布局超过166（？）个图片在测试中会导致stack overflow error（没有任何被抛出的报错），只好进行多次读写。这个数量不确定，感觉和机器性能有关.
        // 但是多次读写对运行时间影响不大。
        // 参见 https://github.com/lovell/sharp/issues/2286
        // TODO 0.30.2之后的版本修复了这个bug。
        const startTime = Date.now();
        const onceNum = 100;
        const compLength = compositeInput.length;
        const blender: sharp.Blend | undefined = blenderTest;
        if (drawBaseSize) {
            const baseSize = [drawBaseSize[0] * coordUnitWidth, drawBaseSize[1] * coordUnitWidth];
            await sharp(`${picBasePath}bg.png`)
                .resize(...baseSize)
                .toFile(outputPath);
            // console.log(label);
        }
        compositeInput.forEach(val => (val.blend = blender));
        let bufferCache = await sharp(outputPath).toBuffer();
        let lastEndTime = Date.now();
        // const profilerStr = (startTimeH: number, endTimeH: number, compLengthH: number, subLabel: string) =>
        //     `${label} ${subLabel} ${outputPath} ${endTimeH - startTimeH}ms length ${compLength + 1} perPic ${(
        //         (endTimeH - startTimeH) /
        //         compLengthH
        //     ).toFixed(3)}ms`;
        for (let i = 0; i < Math.ceil(compLength / onceNum); i++) {
            const sharpInstance = sharp(bufferCache);
            const sliceData = compositeInput.slice(
                i * onceNum,
                (i + 1) * onceNum > compLength + 1 ? compLength + 1 : (i + 1) * onceNum
            );
            bufferCache = await sharpInstance.composite(sliceData).toBuffer();
            if (progressBar) {
                progressBar.increment(sliceData.length);
                const firstInput = sliceData[0];
                progressBar.update({
                    label,
                    log: `num:${sliceData.length},${log ?? ""},${firstInput.input?.toString().length ?? ""},[${(
                        (firstInput.top ?? 0) / coordUnitWidth
                    ).toFixed(2)},${((firstInput.left ?? 0) / coordUnitWidth).toFixed(2)}]`
                });
            }
            // await sleep(500);
            // console.log(profilerStr(lastEndTime, Date.now(), sliceData.length, "[composite]"));
            lastEndTime = Date.now();
            // if (label === "[drawObjectLayout]") {
            //     console.log(`[drawObjectLayout] ${compLength} ${JSON.stringify(compositeInput, null, 4)}`);
            // }
        }

        const answer = await sharp(bufferCache).toFile(outputPath);
        // if (label === "[drawObjectLayout]") {
        //     console.log(`[drawObjectLayout] ${compLength} ${JSON.stringify(answer, null, 4)}`);
        // }
        const endTime = Date.now();
        // console.log(profilerStr(startTime, endTime, compLength + 1, "[composite,toFile]"));
    }
    public async drawTerrainLayout(
        terrain: string,
        mapSize: [xLength: number, yLength: number],
        bar?: SingleBar,
        outputPath = "output.jpg",
        updateData: UpdateData | undefined = undefined,
        blenderTest?: sharp.Blend
    ): Promise<string> {
        const terrainPicBuffer: { [name: string]: Buffer } = {
            wall: await getObjectPictureBuffer("wall"),
            swamp: await getObjectPictureBuffer("swamp"),
            plain: await getObjectPictureBuffer("plain")
        };
        const [xMax, yMax] = mapSize;
        if (typeof updateData === "undefined") {
            const compositeInput = _.flatten(
                Array(xMax)
                    .fill(0)
                    .map((_m, x) => {
                        return Array(yMax)
                            .fill(0)
                            .map((_n, y) => {
                                return {
                                    top: y * coordUnitWidth,
                                    left: x * coordUnitWidth,
                                    input: terrainPicBuffer[
                                        this.terrainMap[
                                            (terrain[x + y * xMax] as "0" | "1" | "2" | "3") === "0"
                                                ? "4"
                                                : (terrain[x + y * xMax] as "1" | "2" | "3")
                                        ]
                                    ]
                                };
                            });
                    })
            ).filter(val => val.input);
            await this.compositeLayout(compositeInput, outputPath, mapSize, bar, "[drawTerrainLayout]");
        } else {
            const compositeInput = updateData.queue
                .map(id => {
                    const { x, y } = { x: id % xMax, y: Math.floor(id / xMax) };
                    return {
                        top: y * coordUnitWidth,
                        left: x * coordUnitWidth,
                        input: terrainPicBuffer[this.terrainMap[terrain[id] as "0" | "1" | "2" | "3"]]
                    };
                })
                .filter(val => val.input);
            // console.log(
            //     `queue: ${updateData.queue.toString()},input length:${compositeInput.length}, type:${updateData.queue
            //         .map(id => {
            //             return this.terrainMap[terrain[id] as "0" | "1" | "2" | "3"];
            //         })
            //         .toString()}`
            // );
            const logger = getLogger("updateTerrain");
            logger.info(
                compositeInput
                    .map(val => `[${(val.left / coordUnitWidth).toFixed(2)},${(val.top / coordUnitWidth).toFixed(2)}]`)
                    .toString()
            );
            await this.compositeLayout(
                compositeInput,
                outputPath,
                false,
                bar,
                "[drawTerrainLayout]",
                `${updateData.queue
                    .map(id => {
                        return this.terrainMap[terrain[id] as "0" | "1" | "2" | "3"];
                    })
                    .toString()}`,
                blenderTest
            );
            // await sleep(1000);
        }

        return "ok";
    }
    private ifInBorder(x: number, y: number): boolean {
        const { xMin, yMin, xMax, yMax } = this.rangeSettings;
        if (x < xMin || y < yMin || x > xMax || y > yMax) {
            return false;
        } else {
            return true;
        }
    }
    public squarePos(pos: Coord, range: number): Coord[] {
        const { x, y } = pos;
        const coordList = [];
        for (let i = -range; i <= range; i++) {
            for (let j = -range; j <= range; j++) {
                if (this.ifInBorder(x + i, y + j) && !(i === 0 && j === 0)) {
                    coordList.push({ x: x + i, y: y + j });
                }
            }
        }
        return coordList;
    }
    public calcNumOfObjToDraw(objects: AnyObject[], updateData: UpdateData): number {
        let sum = 0;
        let compositeObjects: AnyObject[];
        if (typeof updateData !== "undefined") {
            const queueToComposite = updateData.queue.concat(this.calcRoadRenderUpdate(objects, updateData));
            const coord2Id = coordToID(updateData.columnSize);
            compositeObjects = objects.filter(obj => queueToComposite.includes(coord2Id(obj)));
        } else {
            compositeObjects = objects;
        }
        // 画路
        const roadInput = compositeObjects.filter(val => val.type === "road");
        roadInput.map(road =>
            this.squarePos(road, 1).forEach(nearRoad => {
                const nearIndex = roadInput.findIndex(
                    roadHere => roadHere.x === nearRoad.x && roadHere.y === nearRoad.y
                );
                // 没有去掉重复渲染的路，几乎没有性能影响
                if (nearIndex !== -1) {
                    sum++;
                }
            })
        );
        // console.log(`${updateData.queue.length} ${sum},${compositeObjects.length}`);
        return sum + compositeObjects.length;
    }
    /**
     * 计算周围需要更新的路。
     *
     * @param {AnyObject[]} objects
     * @param {UpdateData} updateData
     * @returns {number[]}
     * @memberof DrawMap
     */
    public calcRoadRenderUpdate(objects: AnyObject[], updateData: UpdateData): number[] {
        const coord2Id = coordToID(updateData.columnSize);
        const id2Coord = IDToCoord(updateData.columnSize);
        const getObjByCoord: (coord: Coord) => AnyObject[] = (coord: Coord) => {
            return objects.filter(obj => coord.x === obj.x && coord.y === obj.y);
        };
        const updateObj = updateData.queue.map(id2Coord).map(getObjByCoord).flat();
        const squareUpdateRoad = _.flatten(
            updateObj.map(obj => this.squarePos(obj, 1).map(getObjByCoord).flat())
        ).filter(obj => obj.type === "road");
        const updateRoadIdList = squareUpdateRoad
            .map(coord2Id)
            .filter(updateId => !updateData.queue.includes(updateId));
        return Array.from(new Set(updateRoadIdList));
    }
    public async drawObjectLayout(
        objects: AnyObject[],
        bar?: SingleBar,
        outputPath = "output.jpg",
        updateData: UpdateData | undefined = undefined
    ): Promise<void> {
        const objectPicBuffer: { [name: string]: Buffer } = {
            constructedWall: await getObjectPictureBuffer("constructedWall"),
            container: await getObjectPictureBuffer("container"),
            controller: await getObjectPictureBuffer("controller"),
            extension: await getObjectPictureBuffer("extension"),
            extractor: await getObjectPictureBuffer("extractor"),
            factory: await getObjectPictureBuffer("factory"),
            lab: await getObjectPictureBuffer("lab"),
            link: await getObjectPictureBuffer("link"),
            nuker: await getObjectPictureBuffer("nuker"),
            observer: await getObjectPictureBuffer("observer"),
            powerSpawn: await getObjectPictureBuffer("powerSpawn"),
            rampart: await getObjectPictureBuffer("rampart"),
            road: await getObjectPictureBuffer("road_dot"),
            source: await getObjectPictureBuffer("source"),
            spawn: await getObjectPictureBuffer("spawn"),
            storage: await getObjectPictureBuffer("storage"),
            terminal: await getObjectPictureBuffer("terminal"),
            tower: await getObjectPictureBuffer("tower"),
            Z: await getObjectPictureBuffer("Z"),
            U: await getObjectPictureBuffer("U"),
            L: await getObjectPictureBuffer("L"),
            K: await getObjectPictureBuffer("K"),
            X: await getObjectPictureBuffer("X"),
            O: await getObjectPictureBuffer("O"),
            H: await getObjectPictureBuffer("H"),
            roadNS: await getObjectPictureBuffer("road_N-S"),
            roadEW: await getObjectPictureBuffer("road_W-E"),
            roadWNES: await getObjectPictureBuffer("road_WN-ES"),
            roadENWS: await getObjectPictureBuffer("road_EN-WS"),
            soldier: await getObjectPictureBuffer("soldier")
        };
        let compositeObjects;
        if (typeof updateData !== "undefined") {
            updateData.queue = updateData.queue.concat(this.calcRoadRenderUpdate(objects, updateData));
            const coord2Id = coordToID(updateData.columnSize);
            compositeObjects = objects.filter(obj => updateData.queue.includes(coord2Id(obj)));
            // console.log(`${updateData?.queue?.length},${compositeObjects.length}`);
        } else {
            compositeObjects = objects;
        }

        const compositeInput = compositeObjects
            .map(objectHere => {
                const { x, y, type } = objectHere;
                const structureType = type;
                // if (structureType === "link" || structureType === "road") console.log(type);
                // if (structureType === "rampart") console.log(type, Boolean(objectPicBuffer[structureType]));
                if (type !== "mineral") {
                    return {
                        top: y * coordUnitWidth,
                        left: x * coordUnitWidth,
                        input: objectPicBuffer[structureType],
                        type: structureType as string,
                        x,
                        y
                    };
                } else {
                    if (!objectHere.mineralType) throw new Error("unknown mineralType");
                    return {
                        top: y * coordUnitWidth,
                        left: x * coordUnitWidth,
                        input: objectPicBuffer[objectHere.mineralType],
                        type: structureType as string,
                        x,
                        y
                    };
                }
            })
            .filter(val => val.input);
        // 画路
        const roadInput = compositeInput.filter(val => val.type === "road");
        roadInput.map(road =>
            this.squarePos(road, 1).forEach(nearRoad => {
                const nearIndex = roadInput.findIndex(
                    roadHere => roadHere.x === nearRoad.x && roadHere.y === nearRoad.y
                );
                // 没有去掉重复渲染的路，几乎没有性能影响
                if (nearIndex !== -1) {
                    const dx = road.x - nearRoad.x;
                    const dy = road.y - nearRoad.y;

                    const posStr = (coord: Coord) => `${coord.x},${coord.y}`;
                    const directionStr = posStr({ x: dx, y: dy });
                    // console.log(posStr({ x: dx, y: dy }), posStr(road), posStr(nearRoad));
                    const directionList: { [name: string]: string } = {
                        "0,1": "roadNS",
                        "0,-1": "roadNS",
                        "1,0": "roadEW",
                        "-1,0": "roadEW",
                        "1,1": "roadWNES",
                        "-1,-1": "roadWNES",
                        "-1,1": "roadENWS",
                        "1,-1": "roadENWS"
                    };
                    compositeInput.push({
                        top: road.top - (coordUnitWidth / 2 - coordUnitWidth / 16) * dy,
                        left: road.left - (coordUnitWidth / 2 - coordUnitWidth / 16) * dx,
                        input: objectPicBuffer[directionList[directionStr]],
                        type: directionList[directionStr],
                        x: -1,
                        y: -1
                    });
                }
            })
        );
        // road 放在最前渲染
        compositeInput.sort((b, a) => {
            const typeNameList = ["road", "roadNS", "roadEW", "roadWNES", "roadENWS"];
            if (typeNameList.includes(a.type)) {
                if (typeNameList.includes(b.type)) return 0;
                else return 1;
            } else {
                if (typeNameList.includes(b.type)) return -1;
                else return 0;
            }
        });
        // rampart 放在最后渲染
        compositeInput.sort((a, b) => {
            if (a.type === "rampart") {
                if (b.type === "rampart") return 0;
                else return 1;
            } else {
                if (b.type === "rampart") return -1;
                else return 0;
            }
        });
        // console.log(`compositeInput ${compositeInput.length}, ${compositeInput[0].type}`);
        const logger = getLogger("updateObject");
        logger.info(
            `${compositeInput
                .map(
                    val =>
                        `${val.type}:[${(val.left / coordUnitWidth).toFixed(2)},${(val.top / coordUnitWidth).toFixed(
                            2
                        )}]`
                )
                .toString()}`
        );
        await this.compositeLayout(
            compositeInput,
            outputPath,
            false,
            bar,
            "[drawObjectLayout]",
            `obj:${compositeInput
                .map(obj => obj.type)
                .slice(0, 2)
                .toString()}`
        );
        // await sleep(1000);
    }
    public mulConst = coordUnitWidth;
    public async addSVG(svgCode: SvgCode, outputPath = "output.jpg"): Promise<void> {
        const dataBuffer = await sharp(Buffer.from(svgCode.code())).toBuffer();
        // console.log(svgCode.code());
        await this.compositeLayout(
            [
                {
                    top: svgCode.range.yMin * coordUnitWidth,
                    left: svgCode.range.xMin * coordUnitWidth,
                    input: dataBuffer
                }
            ],
            outputPath,
            false,
            undefined,
            "[addSVG]"
        );
    }
    public async drawVisualData(dataList: SvgCode[], bar?: SingleBar, outputPath = "output.jpg"): Promise<void> {
        const dataBufferList = await Promise.all(
            dataList.map(svgCode => sharp(Buffer.from(svgCode.code())).toBuffer())
        );
        const compositeDataList = dataList.map((svgCode, index) => {
            return {
                top: svgCode.range.yMin * coordUnitWidth,
                left: svgCode.range.xMin * coordUnitWidth,
                input: dataBufferList[index]
            };
        });
        const logger = getLogger("updateVisual");
        logger.info(
            `canvas:${compositeDataList
                .map(val => `[${(val.left / coordUnitWidth).toFixed(2)},${(val.top / coordUnitWidth).toFixed(2)}]`)
                .toString()}`
        );

        await this.compositeLayout(compositeDataList, outputPath, false, bar, "[drawVisualData]");
    }
    public async getVisual(
        terrain: string,
        objects: AnyObject[],
        visualDataList: SvgCode[],
        progressBar?: SingleBar,
        outputPath = "output.jpg",
        size = [50, 50] as [number, number]
    ): Promise<void> {
        const howManyZero = Array.from(terrain).reduce((sum, char) => {
            return Number(char === "0" ? (sum += 1) : sum);
        }, 0); // 计算平原（char为"0"）的个数并减去，因为这部分不用作图。
        const picNum = terrain.length - howManyZero;
        progressBar?.setTotal(picNum + objects.length + visualDataList.length);
        await this.drawTerrainLayout(terrain, size, progressBar, outputPath);
        await this.drawObjectLayout(objects, progressBar, outputPath);
        await this.drawVisualData(visualDataList, progressBar, outputPath);
        progressBar?.stop();
    }
    public async updateObjectVisual(
        updateData: UpdateData,
        terrain: string,
        objects: AnyObject[],
        visualDataList: SvgCode[],
        progressBar?: SingleBar,
        outputPath = "output.jpg",
        size = [50, 50] as [number, number],
        blenderTest?: sharp.Blend
    ): Promise<void> {
        const terrainArray = Array.from(terrain);
        const correspondArray = updateData.queue.map(id => terrainArray[id]);
        const howManyZero = correspondArray.reduce((sum, char) => {
            return Number(char === "0" ? (sum += 1) : sum);
        }, 0); // 计算平原（char为"0"）的个数并减去，因为这部分不用作图。
        const picNum = correspondArray.length - howManyZero;
        progressBar?.setTotal(
            updateData.queue.length + picNum + this.calcNumOfObjToDraw(objects, updateData) + visualDataList.length
        );

        await this.drawTerrainLayout(terrain, size, progressBar, outputPath, updateData, blenderTest);
        await this.drawObjectLayout(objects, progressBar, outputPath, updateData);

        await this.drawVisualData(visualDataList, progressBar, outputPath);
        await this.drawVisualData(
            updateData.queue.map(id =>
                new SvgCode({ xMin: 0, xMax: size[0], yMin: 0, yMax: size[1] })
                    .rect(
                        {
                            xMin: id % size[0],
                            xMax: (id % size[0]) + 1,
                            yMin: Math.floor(id / size[0]),
                            yMax: Math.floor(id / size[0]) + 1
                        },
                        { "fill-opacity": 1, fill: "#fff" }
                    )
                    .text("rem", { x: id % size[0], y: Math.floor(id / size[0]) })
            ),
            progressBar,
            outputPath
        );
        // 清空update queue
        updateData.queue = [];
        progressBar?.stop();
        progressBar?.render();
    }
}
