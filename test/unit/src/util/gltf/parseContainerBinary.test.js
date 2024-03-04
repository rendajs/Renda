import { assertEquals, assertExists, assertThrows } from "std/testing/asserts.ts";
import { parseContainerBinary } from "../../../../../src/util/gltf/parseContainerBinary.js";

/**
 * Returns an ArrayBuffer that contains valid container data. This can be used
 * to modify into something needed for each specific test.
 */
function createGltfBuffer({
	magicHeader = 0x46546C67,
	containerVersion = 2,
	totalLength = /** @type {number?} */ (null),
	hasJson = true,
	hasBinary = true,
	customBinaryChunkLengthValue = /** @type {number?} */ (null),
} = {}) {
	const uint32Numbers = [];
	uint32Numbers.push(magicHeader);
	uint32Numbers.push(containerVersion);
	uint32Numbers.push(0); // total length to be set later

	if (hasJson) {
		/** @type {import("../../../../../src/util/gltf/gltfParsing.js").GltfJsonData} */
		const jsonData = {
			asset: {
				version: "2.0",
			},
		};
		const jsonStr = JSON.stringify(jsonData);
		const textEncoder = new TextEncoder();
		const jsonBytesUnpadded = textEncoder.encode(jsonStr);
		const paddingByteCount = 4 - (jsonBytesUnpadded.length % 4);
		const jsonBytesUint8 = new Uint8Array(jsonBytesUnpadded.length + paddingByteCount);
		jsonBytesUint8.set(jsonBytesUnpadded);
		for (let i = 0; i < paddingByteCount; i++) {
			jsonBytesUint8[jsonBytesUnpadded.length + i] = 0x20; // space character
		}
		const jsonBytesUint32 = new Uint32Array(jsonBytesUint8.buffer);

		uint32Numbers.push(jsonBytesUint8.byteLength);
		uint32Numbers.push(0x4E4F534A); // "JSON"
		uint32Numbers.push(...jsonBytesUint32);
	}

	let binaryBuffer = null;
	if (hasBinary) {
		const binaryNumbers = [0, 1, 2, 3, 4, 5, 6, 7];
		const binaryBytesUint8 = new Uint8Array(binaryNumbers);
		binaryBuffer = binaryBytesUint8.buffer;
		const binaryBytesUint32 = new Uint32Array(binaryBuffer);
		if (customBinaryChunkLengthValue != null) {
			uint32Numbers.push(customBinaryChunkLengthValue);
		} else {
			uint32Numbers.push(binaryBytesUint8.byteLength);
		}
		uint32Numbers.push(0x004E4942); // "BIN"
		uint32Numbers.push(...binaryBytesUint32);
	}

	const buffer = new ArrayBuffer(uint32Numbers.length * 4);
	if (totalLength !== null) {
		uint32Numbers[2] = totalLength;
	} else {
		uint32Numbers[2] = buffer.byteLength;
	}
	const dataView = new DataView(buffer);
	for (let i = 0; i < uint32Numbers.length; i++) {
		dataView.setUint32(i * 4, uint32Numbers[i], true);
	}
	return { buffer, dataView, binaryBuffer };
}

Deno.test({
	name: "valid gltf data",
	fn() {
		const { buffer, binaryBuffer } = createGltfBuffer();
		const result = parseContainerBinary(buffer);

		assertEquals(result.json, {
			asset: {
				version: "2.0",
			},
		});

		assertExists(result.binary);
		const actualBinaryNumbers = [...new Uint8Array(result.binary)];
		assertExists(binaryBuffer);
		const expectedBinaryNumbers = [...new Uint8Array(binaryBuffer)];
		assertEquals(actualBinaryNumbers, expectedBinaryNumbers);
	},
});

Deno.test({
	name: "valid data without binary",
	fn() {
		const { buffer } = createGltfBuffer({ hasBinary: false });
		const result = parseContainerBinary(buffer);
		assertEquals(result, {
			json: {
				asset: {
					version: "2.0",
				},
			},
			binary: null,
		});
	},
});

Deno.test({
	name: "invalid magic in header",
	fn() {
		const { buffer } = createGltfBuffer({ magicHeader: 0x12345678 });

		assertThrows(() => {
			parseContainerBinary(buffer);
		}, Error, "The provided file doesn't have a valid glTF format. The file is missing the glTF magic header.");
	},
});

Deno.test({
	name: "too new container version",
	fn() {
		const { buffer } = createGltfBuffer({ containerVersion: 3 });

		assertThrows(() => {
			parseContainerBinary(buffer);
		}, Error, "The glTF container version of this file is too new: 3. The parser only supports up to version 2.");
	},
});

Deno.test({
	name: "invalid total length",
	fn() {
		const { buffer } = createGltfBuffer({ totalLength: 10000 });

		assertThrows(() => {
			parseContainerBinary(buffer);
		}, Error, "Failed to parse glTF. The length in the header is larger than the total file length.");
	},
});

Deno.test({
	name: "missing json chunk",
	fn() {
		const { buffer } = createGltfBuffer({ hasJson: false });

		assertThrows(() => {
			parseContainerBinary(buffer);
		}, Error, "Failed to parse glTF file, no JSON chunk was found.");
	},
});

Deno.test({
	name: "Chunk length too large",
	fn() {
		const { buffer } = createGltfBuffer({ customBinaryChunkLengthValue: 1000 });
		assertThrows(() => {
			parseContainerBinary(buffer);
		}, Error, "Failed to parse glTF. The length of a chunk is larger than the total file length.");
	},
});
