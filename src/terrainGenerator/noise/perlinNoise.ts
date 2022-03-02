/**
 * 输入一个二维点，输出一个随机二维向量，使用hash22算法生成。
 *
 * @param {number} x
 * @param {number} y
 * @returns
 */
function grad(point: [number, number]) {
    const [x, y] = point;
    const vec: [number, number] = [0, 0];
    vec[0] = x * 127.1 + y * 311.7;
    vec[1] = x * 269.5 + y * 183.3;

    const sin0 = Math.sin(vec[0]) * 43758.5453123;
    const sin1 = Math.sin(vec[1]) * 43758.5453123;
    vec[0] = (sin0 - Math.floor(sin0)) * 2.0 - 1.0;
    vec[1] = (sin1 - Math.floor(sin1)) * 2.0 - 1.0;

    // 归一化，尽量消除正方形的方向性偏差
    const len = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1]);
    vec[0] /= len;
    vec[1] /= len;

    return vec;
}

/**
 * 输入一个二维点，输出一个范围在[-1,1]的数，其符合柏林噪声的分布。
 *
 * @export
 * @param {[number, number]} point
 * @returns {number}
 */
export function perlinNoise(point: [number, number]): number {
    const [x, y] = point;
    const p0x = Math.floor(x); // P0坐标
    const p0y = Math.floor(y);
    const p1x = p0x; // P1坐标
    const p1y = p0y + 1;
    const p2x = p0x + 1; // P2坐标
    const p2y = p0y + 1;
    const p3x = p0x + 1; // P3坐标
    const p3y = p0y;

    const [g0x, g0y] = grad([p0x, p0y]); // P0点的梯度
    const [g1x, g1y] = grad([p1x, p1y]); // P1点的梯度
    const [g2x, g2y] = grad([p2x, p2y]); // P2点的梯度
    const [g3x, g3y] = grad([p3x, p3y]); // P3点的梯度

    const v0x = x - p0x; // P0点的方向向量
    const v0y = y - p0y;
    const v1x = x - p1x; // P1点的方向向量
    const v1y = y - p1y;
    const v2x = x - p2x; // P2点的方向向量
    const v2y = y - p2y;
    const v3x = x - p3x; // P3点的方向向量
    const v3y = y - p3y;

    const product0 = g0x * v0x + g0y * v0y; // P0点梯度向量和方向向量的点乘
    const product1 = g1x * v1x + g1y * v1y; // P1点梯度向量和方向向量的点乘
    const product2 = g2x * v2x + g2y * v2y; // P2点梯度向量和方向向量的点乘
    const product3 = g3x * v3x + g3y * v3y; // P3点梯度向量和方向向量的点乘

    // P1和P2的插值
    const d0 = x - p0x;
    const t0 = 6.0 * Math.pow(d0, 5.0) - 15.0 * Math.pow(d0, 4.0) + 10.0 * Math.pow(d0, 3.0);
    const n0 = product1 * (1.0 - t0) + product2 * t0;

    // P0和P3的插值
    const n1 = product0 * (1.0 - t0) + product3 * t0;

    // P点的插值
    const d1 = y - p0y;
    const t1 = 6.0 * Math.pow(d1, 5.0) - 15.0 * Math.pow(d1, 4.0) + 10.0 * Math.pow(d1, 3.0);
    return n1 * (1.0 - t1) + n0 * t1;
}
