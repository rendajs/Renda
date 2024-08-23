import { assertEquals, assertExists, assertRejects, assertStrictEquals } from "std/testing/asserts.ts";
import { getBufferHelper } from "../../../../../src/util/gltf/getBuffer.js";

/**
 * @param {object} options
 * @param {import("../../../../../src/util/gltf/gltfParsing.js").GltfBufferData} [options.bufferData]
 */
function basicSetup({
	bufferData = {
		name: "Buffer 1",
		byteLength: 10,
	},
} = {}) {
	/** @type {import("../../../../../src/util/gltf/gltfParsing.js").GltfJsonData} */
	const jsonData = {
		asset: { version: "2.0" },
		buffers: [bufferData],
	};

	/** @type {Map<number, ArrayBuffer>} */
	const buffersCache = new Map();

	const containerBinary = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5]).buffer;

	return {
		jsonData,
		buffersCache,
		containerBinary,
	};
}

Deno.test({
	name: "Throws when the buffer id doesn't exist",
	async fn() {
		const { jsonData, containerBinary } = basicSetup();

		await assertRejects(async () => {
			await getBufferHelper(jsonData, 12345, new Map(), containerBinary);
		}, Error, "Tried to reference buffer with index 12345 but it does not exist.");
	},
});

Deno.test({
	name: "Throws when the json doesn't contain buffers",
	async fn() {
		const { jsonData, containerBinary } = basicSetup();
		delete jsonData.buffers;

		await assertRejects(async () => {
			await getBufferHelper(jsonData, 12345, new Map(), containerBinary);
		}, Error, "Tried to reference buffer with index 12345 but it does not exist.");
	},
});

Deno.test({
	name: "Uses cached buffers",
	async fn() {
		const { jsonData, buffersCache, containerBinary } = basicSetup();

		const cachedBuffer = new ArrayBuffer(0);
		buffersCache.set(0, cachedBuffer);

		const result = await getBufferHelper(jsonData, 0, buffersCache, containerBinary);

		assertStrictEquals(result, cachedBuffer);
	},
});

Deno.test({
	name: "Throws when a buffer other than the first one is missing a uri property",
	async fn() {
		const { jsonData, buffersCache, containerBinary } = basicSetup();
		assertExists(jsonData.buffers);
		jsonData.buffers[1] = {
			byteLength: 10,
		};

		await assertRejects(async () => {
			await getBufferHelper(jsonData, 1, buffersCache, containerBinary);
		}, Error, "Failed to get the buffer with index 1 because no uri was specified and it is not the first buffer in the glTF.");
	},
});

Deno.test({
	name: "Throws when no container binary is provided",
	async fn() {
		const { jsonData, buffersCache } = basicSetup();

		await assertRejects(async () => {
			await getBufferHelper(jsonData, 0, buffersCache, null);
		}, Error, "Failed to get the buffer with index 0 because no uri was specified and no binary data was provided via the .glb container format.");
	},
});

Deno.test({
	name: "Returns bytes from the provided container binary for index 0",
	async fn() {
		const { jsonData, buffersCache, containerBinary } = basicSetup();
		const result = await getBufferHelper(jsonData, 0, buffersCache, containerBinary);
		const view = new Uint8Array(result);
		assertEquals(Array.from(view), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
	},
});

Deno.test({
	name: "Parses data urls",
	async fn() {
		const uri = "data:application/octet-stream;base64," + btoa(String.fromCharCode(1, 2, 3, 4, 5));
		const { jsonData, buffersCache } = basicSetup({
			bufferData: {
				byteLength: 3,
				uri,
			},
		});
		const result = await getBufferHelper(jsonData, 0, buffersCache, null);
		const view = new Uint8Array(result);
		assertEquals(Array.from(view), [1, 2, 3]);
	},
});

Deno.test({
	name: "Throws when an unsupported data url is provided",
	async fn() {
		const { jsonData, buffersCache } = basicSetup({
			bufferData: {
				byteLength: 3,
				uri: "data:,Hello%2C%20World%21",
			},
		});

		await assertRejects(async () => {
			await getBufferHelper(jsonData, 0, buffersCache, null);
		}, Error, "Failed to get the buffer with index 0 because the data uri has the incorrect content type: text/plain");
	},
});
