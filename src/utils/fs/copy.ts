import { spawn } from "child_process";
import { createReadStream, createWriteStream, readFileSync, writeFileSync } from "fs";

export function copyIt(from: string, to: string): void {
    // writeFileSync(to, readFileSync(from));
    createReadStream(from).pipe(createWriteStream(to)); // 大文件复制
}
//
