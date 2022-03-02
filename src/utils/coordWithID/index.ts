import { Coord } from "utils/Grid/type";

export function coordToID(xGridSize: number): (coord: Coord) => number {
    return (coord: Coord) => coord.x + coord.y * xGridSize;
}
export function IDToCoord(xGridSize: number): (coordID: number) => Coord {
    return (coordID: number) => ({ x: coordID % xGridSize, y: Math.floor(coordID / xGridSize) });
}
