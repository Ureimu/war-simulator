import { spawnSync } from "child_process";
import { testControl } from "Control";
import { unlinkSync } from "fs";
import { Game } from "Game";
import _ from "lodash";
import { configure, getLogger } from "log4js";
import { cache, concurrency } from "sharp";
import { copyIt } from "utils/fs/copy";
import { removeDir } from "utils/fs/removeDir";
import { checkPath } from "utils/pathCheck";
import { sleep } from "utils/sleep";
global._ = _;

process.on("unhandledRejection", error => {
    console.log("unhandledRejection: ", error);
});
try {
    unlinkSync("work.log");
} catch {
    void 0;
}
export const mainFunction = async (): Promise<void> => {
    configure({
        appenders: {
            work: { type: "file", filename: "work.log" },
            updateObject: { type: "file", filename: "work.log" },
            updateTerrain: { type: "file", filename: "work.log" },
            updateVisual: { type: "file", filename: "work.log" }
        },
        categories: { default: { appenders: ["work"], level: "INFO" } }
    });
    const logger = getLogger("work");
    logger.level = "debug";
    cache(false); // 一定要不使用缓存！否则会有各种问题。
    console.profile();
    testControl();
    removeDir("movie");

    await sleep(1000);
    removeDir("out");

    checkPath(["out", "cache", "movie"]);
    concurrency(4);
    const game = new Game({ x: 32, y: 32 });
    await game.map.drawMap("out/testPic.png");
    const road = game.map.findPath({ x: 2, y: 2 }, { x: 30, y: 30 }, 0);
    let time = new Date().getTime();

    if (road.isFinish) {
        for (let i = 0; i < road.path.length; i++) {
            const coord = road.path[i];
            game.map.createObjects({ ...coord, type: "road" });
            if (i > 10) {
                const coord2 = road.path[i - 10];
                const coord3 = road.path[i - 5];

                game.map.deleteObjects(...game.map.getObjectsInPos(coord3).filter(j => j.type === "road"));
                // game.map.removeStructure("rampart", coord3);
                // game.map.addStructure("rampart", 8, 1, coord);
                game.map.createObjects({ ...coord2, type: "road" });
            }
            logger.info(`updateMap:tick: ${i}`);
            await game.map.updateMap("out/testPic.png", `tick: ${i}`);
            copyIt("out/testPic.png", `out/${i}.png`);

            // console.log(i, new Date().getTime() - time);
            time = new Date().getTime();
            // await sleep(500);
        }
    }
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
    logger.trace(`finish ffmpeg:${returns.output[2]}`);
    console.log(returns.output.toString());

    console.log("finish, type ctrl-c to quit");
    console.profileEnd();
};
// console.log(process.env.NODE_ENV, process.argv);
