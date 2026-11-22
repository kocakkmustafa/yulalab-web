/**
 * W8-16: the baked atlas (scripts/build-wordmark-sdf.py) is stored top row first (image order). A GL DataTexture
 * has v = 0 at its FIRST row (the bottom), so uploading the file as is draws the letters upside down.
 * Reverse the row order when copying it into the texture.
 */
export function flipSdfRows(source: Uint8Array, target: Uint8Array, width: number, height: number): void {
  for (let row = 0; row < height; row += 1) {
    const from = (height - 1 - row) * width;
    target.set(source.subarray(from, from + width), row * width);
  }
}
