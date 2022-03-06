export class Player {
    public get level(): number {
        return this._level;
    }
    private _level = 0;
    public constructor(public money: number) {}
}
