import { assertEquals } from "std/testing/asserts.ts";
import { bufferToHex, hashBuffer } from "../../../../src/util/bufferUtil.js";

Deno.test({
	name: "bufferToHex",
	fn() {
		const buffer = new Uint8Array([0, 5, 20, 255]);
		const hex = bufferToHex(buffer);
		assertEquals(hex, "000514ff");
	},
});

Deno.test({
	name: "bufferToHex empty buffer",
	fn() {
		const buffer = new ArrayBuffer(0);
		const hex = bufferToHex(buffer);
		assertEquals(hex, "");
	},
});

Deno.test({
	name: "hashBuffer",
	async fn() {
		const originalDigest = crypto.subtle.digest;

		/** @type {{algorithm: AlgorithmIdentifier, bufferLength: number}[]} */
		const digestCalls = [];
		crypto.subtle.digest = async (algorithm, buffer) => {
			digestCalls.push({ algorithm, bufferLength: buffer.byteLength });
			const castBuffer = /** @type {Uint8Array} */ (buffer);
			return castBuffer.buffer;
		};
		try {
			const result1 = await hashBuffer(new Uint8Array([0, 1]));
			const result2 = await hashBuffer(new Uint8Array([0, 1, 2]), "SHA-256");
			const result3 = await hashBuffer(new Uint8Array([1, 2, 3]), "SHA-512");
			assertEquals(digestCalls, [
				{ algorithm: "SHA-256", bufferLength: 2 },
				{ algorithm: "SHA-256", bufferLength: 3 },
				{ algorithm: "SHA-512", bufferLength: 3 },
			]);
			assertEquals(result1, "0001");
			assertEquals(result2, "000102");
			assertEquals(result3, "010203");
		} finally {
			crypto.subtle.digest = originalDigest;
		}
	},
});
