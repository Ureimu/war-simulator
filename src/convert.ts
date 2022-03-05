import { existsSync, readdirSync, unlinkSync, rmdirSync } from "fs";
import sharp from "sharp";

export async function convertPngToSvg(): Promise<void> {
    const path = "src\\utils\\blockVisual\\imgs\\16";
    const folderExist = existsSync(path);
    if (folderExist) {
        const fileList = readdirSync(path);
        for (const name of fileList) {
            const pngFilePath = `${path}/${name}`;

            const mainName = name.split(".")[0];
            const svgFilePath = `${path}/${mainName}.svg`;
            await sharp(pngFilePath).toFormat("svg").toFile(svgFilePath);
            unlinkSync(pngFilePath);
        }
    }
}
