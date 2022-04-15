/**
 * Converts a buffer to a hex string.
 *
 * ### Example
 * ```js
 * const buffer = new Uint8Array([0, 5, 20, 255]);
 * const hex = bufferToHex(buffer); // "000514ff"
 * ```
 *
 * @param {ArrayBuffer} buffer
 */
export function bufferToHex(buffer) {
	const hashArray = Array.from(new Uint8Array(buffer));
	return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Compute the hash of an array buffer using the specified algorithm.
 *
 * ### Example
 * ```js
 * const buffer = new Uint8Array([0, 5, 20, 255]);
 * const hash = await hashBuffer(buffer); // "2f39e7f6a1135a9e107614297330e8f4e6080ade6fcd6b603632e65eaa7fa702"
 * ```
 *
 * @param {BufferSource} buffer
 * @param {AlgorithmIdentifier} [algorithm]
 */
export async function hashBuffer(buffer, algorithm = "SHA-256") {
	const hash = await crypto.subtle.digest(algorithm, buffer);
	return bufferToHex(hash);
}
