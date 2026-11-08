export function bitCount(mask: bigint): number {
  let count = 0;
  for (let bits = mask; bits !== 0n; bits &= bits - 1n) count++;
  return count;
}
