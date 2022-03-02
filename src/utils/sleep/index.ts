/**
 * 停止指定时间。
 *
 * @export
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
