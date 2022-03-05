import { convertPngToSvg } from "convert";
import { sleep } from "utils/sleep";

describe("convertTest", () => {
    it("runs", async () => {
        await convertPngToSvg();
    });
});
