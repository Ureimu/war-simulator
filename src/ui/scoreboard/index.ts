import { coordUnitWidth } from "utils/common/constants";
import { SvgCode } from "utils/SvgCode";

export function scoreboard(): SvgCode {
    const svg = new SvgCode({ xMin: 120, xMax: 180, yMin: 0, yMax: 100 });
    svg.rect({ xMin: 10, xMax: 50, yMin: 10, yMax: 90 }, { opacity: 1, fill: "#fff" });
    svg.textStyle["font-size"] = coordUnitWidth * 4;
    svg.textStyle.fill = "#000";
    svg.textStyle.stroke = "#000";
    svg.textStyle.opacity = 1;
    svg.textStyle["fill-opacity"] = 1;
    svg.text("testing", { x: 12, y: 12 });
    svg.text(`${new Date().getTime()}`, { x: 12, y: 17 });
    return svg;
}
