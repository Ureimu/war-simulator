import { mainFunction } from "main";

describe("api", () => {
    it("runs", async () => {
        await tc(0);
    });
});
async function tc(index: number): Promise<void> {
    try {
        await mainFunction();
    } catch (e) {
        console.clear();
        index += 1;
        // console.log((e as { track: string }).track);
        console.log(`retry: ${index}`);
        await tc(index);
    }
}
