import { unlinkSync } from "fs";
import { Game } from "Game";
import _ from "lodash";
import { MoveableObject } from "Object/MoveableObject";
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
    console.profile();
    const game = new Game({ x: 100, y: 100 });
    await game.start();

    game.createObjects({ x: 2, y: 2, type: "soldier" });
    await game.runLoop();
    const fir = new MoveableObject(game, game.map.getObjectsInPos({ x: 2, y: 2 }).filter(j => j.type === "soldier")[0]);
    for (let index = 0; index < 10; index++) {
        const randomFood = { x: Math.floor(100 * Math.random()), y: Math.floor(100 * Math.random()) };
        const road = game.map.findPath(fir.object, randomFood, 0);
        game.createObjects({ ...randomFood, type: "source" });
        if (road.isFinish) {
            for (let i = 0; i < road.path.length; i++) {
                const coord = road.path[i];
                game.createObjects({ ...coord, type: "road" });

                if (i >= index - 1 && i - index + 1 < road.path.length) {
                    const coord3 = road.path[i - index + 1];
                    fir.moveTo(road.path[i]);
                    game.deleteObjects(...game.map.getObjectsInPos(coord3).filter(j => j.type === "road"));
                    // game.createObjects({ ...coord2, type: "road" });
                }

                await game.runLoop();
            }
        }
        game.deleteObjects(...game.map.getObjectsInPos(randomFood).filter(j => j.type === "source"));
    }

    game.finish();
    console.log("finish, type ctrl-c to quit");
    console.profileEnd();
};
// console.log(process.env.NODE_ENV, process.argv);
