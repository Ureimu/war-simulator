import { existsSync, readdirSync } from "fs";
import sharp from "sharp";

export async function convertPngToSvg(): Promise<void> {
    const path = "photo";
    const folderExist = existsSync(path);
    console.log("test");
    if (folderExist) {
        console.log("running");
        const fileList = readdirSync(path);
        for (const name of fileList) {
            const pngFilePath = `${path}/${name}`;

            const mainName = name.split(".")[0];
            const svgFilePath = `${path}/Trs${mainName}.jpg`;
            await sharp(pngFilePath).resize(1000).toFile(svgFilePath);
        }
    }
}
