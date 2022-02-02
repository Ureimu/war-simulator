export function terrainGenerator(size: { x: number; y: number }): string {
    return new Array((size.x * size.y) / 25).fill([101, 10001, 10000, 11101, 11010].join("")).join("");
}
