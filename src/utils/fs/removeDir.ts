import { existsSync, readdirSync, rmdirSync, unlinkSync } from "fs";

export function removeDir(path: string): void {
    const folderExist = existsSync(path);
    if (folderExist) {
        const fileList = readdirSync(path);
        fileList.forEach(name => unlinkSync(`${path}/${name}`));
        rmdirSync(path);
    }
}
