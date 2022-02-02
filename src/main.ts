import { concurrency } from "sharp";
import _ from "lodash";
global._ = _;
import { checkPath } from "utils/pathCheck";
import { RoomGridMap } from "utils/RoomGridMap/RoomGridMap";
import { terrainGenerator } from "terrainGenerator";
process.on("unhandledRejection", error => {
    console.log("unhandledRejection: ", error);
});

export const mainFunction = async (): Promise<void> => {
    console.profile();
    checkPath(["out", "cache"]);
    concurrency(4);
    const size = { x: 180, y: 100 };
    const map = new RoomGridMap(
        size,
        terrainGenerator(size),
        [{ x: 10, y: 10, type: "source", id: "1" }],
        "testRoom",
        "testRoom"
    );
    await map.drawMap("out/testPic.png");
    console.profileEnd();
};
// console.log(process.env.NODE_ENV, process.argv);

mainFunction().catch(e => {
    throw e;
});
