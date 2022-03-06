import sharp from "sharp";

describe("convertTest", () => {
    it("runs", async () => {
        const plainBuffer = await sharp("src\\utils\\blockVisual\\imgs\\16\\plain.png").resize(16, 16).toBuffer();
        const buffer = await sharp("out/testPic.png")
            .composite([
                {
                    top: 16 * 5,
                    left: 16 * 5,
                    input: plainBuffer
                }
            ])
            .toBuffer();
        await sharp(buffer).toFile("out/testPic.png");
    });
});
