import { perlinNoise } from "./noise/perlinNoise";

export function terrainGenerator(size: { x: number; y: number }): string {
    const density = 16; // 分支的疏密程度，决定了一张图上最长的那个方向的平均分支数。
    const thickness = 0.5; // 墙壁的平均厚度，在[0,1]范围取值
    let terrainStr = "";
    const maxLength = Math.max(size.x, size.y);
    for (let i = 0; i < size.y; i++) {
        const ty = ((i + 1.0) / maxLength) * density;
        for (let j = 0; j < size.x; j++) {
            const tx = ((j + 1.0) / maxLength) * density;
            const gray = perlinNoise([tx, ty]);
            const terrainType = gray < thickness * 2 - 1 ? "2" : "0";
            terrainStr = terrainStr.concat(terrainType);
        }
    }
    // new Array((size.x * size.y) / 25).fill([101, 10001, 10000, 11101, 11010].join("")).join("");
    return terrainStr;
}
