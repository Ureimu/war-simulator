import { spawnSync } from "child_process";
import { testControl } from "Control";
import { unlinkSync } from "fs";
import { Game } from "Game";
import { configure, getLogger } from "log4js";
import { concurrency } from "sharp";
import { copyIt } from "utils/fs/copy";
import { removeDir } from "utils/fs/removeDir";
import { checkPath } from "utils/pathCheck";
import { sleep } from "utils/sleep";
import { SvgCode } from "utils/SvgCode";

unlinkSync("work.log");
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
// 上面的userData需要自己在根目录创建，示例参照根目录的authInfoSample.ts
describe("api", () => {
    it("runs", async () => {
        const mainFunction = async (): Promise<void> => {
            console.profile();
            testControl();
            removeDir("movie");

            await sleep(1000);
            removeDir("out");

            checkPath(["out", "cache", "movie"]);
            concurrency(4);
            const game = new Game({ x: 80, y: 80 });
            await game.map.drawMap("out/testPic.png");
            const road = game.map.findPath({ x: 2, y: 2 }, { x: 70, y: 70 }, 0);
            let time = new Date().getTime();
            // 猜想：需要一次布局至少10个图片，这些布局图片才能被正常缓存。
            // 很不幸，这个猜想似乎是正确的，谜一样的bug
            game.map.visualizeDataList.push(
                ...new Array(10)
                    .fill(0)
                    .map(() => new SvgCode({ xMin: 0, xMax: 1, yMin: 0, yMax: 1 }).circle({ x: 0, y: 0 }, { r: 1 }))
            );

            if (road.isFinish) {
                for (let i = 0; i < road.path.length; i++) {
                    const coord = road.path[i];
                    game.map.addStructure("road", 8, 1, coord);
                    if (i > 10) {
                        const coord2 = road.path[i - 10];
                        const coord3 = road.path[i - 5];
                        game.map.removeStructure("road", coord3);
                        // game.map.removeStructure("rampart", coord3);
                        // game.map.addStructure("rampart", 8, 1, coord);
                        game.map.addStructure("road", 8, 1, coord2);
                    }
                    // if (i < 70)
                    //     game.map.visualizeDataList.push(
                    //         new SvgCode({ xMin: 0, xMax: 100, yMin: 0, yMax: 100 }).circle({ x: i, y: i }, { r: 0.5 })
                    //     );
                    // console.log(game.map.updateData.queue.toString());
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
        await mainFunction();
    });
});
