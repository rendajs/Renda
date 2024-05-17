import { assertSpyCall, assertSpyCalls, stub } from "std/testing/mock.ts";
import { DownloadableAssetBundle } from "../../../../../src/assets/assetBundles/DownloadableAssetBundle.js";
import { TypedMessenger } from "../../../../../src/mod.js";
import { assertEquals, assertExists, assertRejects } from "std/testing/asserts.ts";
import { assertPromiseResolved } from "../../../../../src/util/asserts.js";
import { bundle } from "../../../../../studio/src/tasks/workers/bundleAssets/bundle.js";
import { waitForMicrotasks } from "../../../../../src/util/waitForMicroTasks.js";

const BASIC_ASSET_UUID = "00000000-0000-0000-0000-000000000001";
const BASIC_ASSET_TYPE_UUID = "00000000-0000-0000-0000-000000000002";
const BASIC_ASSET_UUID_2 = "00000000-0000-0000-0000-000000000003";
const BASIC_ASSET_TYPE_UUID_2 = "00000000-0000-0000-0000-000000000004";
const BASIC_ASSET_UUID_3 = "00000000-0000-0000-0000-000000000005";

/**
 * @typedef CreateAssetBundleAsset
 * @property {import("../../../../../src/mod.js").UuidString} uuid
 * @property {import("../../../../../src/mod.js").UuidString} assetTypeUuid
 * @property {ArrayBuffer} content
 */

/**
 * @param {CreateAssetBundleAsset[]} assets
 */
async function createAssetBundle(assets) {
	/** @type {import("../../../../../studio/src/tasks/workers/bundleAssets/mod.js").BundleAssetsMessenger} */
	const messengerA = new TypedMessenger();

	/** @type {TypedMessenger<import("../../../../../studio/src/tasks/task/TaskBundleAssets.js").BundleAssetsMessengerResponseHandlers, import("../../../../../studio/src/tasks/workers/bundleAssets/mod.js").BundleAssetsMessengerResponseHandlers>} */
	const messengerB = new TypedMessenger();

	messengerA.setSendHandler((data) => {
		messengerB.handleReceivedMessage(data.sendData);
	});
	messengerB.setSendHandler((data) => {
		messengerA.handleReceivedMessage(data.sendData);
	});

	const mappedAssetDatas = new Map(assets.map((asset) => [asset.uuid, asset]));

	messengerB.setResponseHandlers({
		async getBundledAssetData(assetUuid) {
			const asset = mappedAssetDatas.get(assetUuid);
			if (!asset) {
				throw new Error("Assertion failed, asset data for a non existent asset was requested.");
			}
			return {
				$respondOptions: {
					returnValue: {
						assetTypeUuid: asset.assetTypeUuid,
						assetData: asset.content,
					},
					transfer: [],
				},
			};
		},
		async writeFile() {},
		async closeFile() {},
	});

	const assetUuids = assets.map((asset) => asset.uuid);
	const buffer = await bundle(assetUuids, -1, messengerA);
	if (!buffer) {
		throw new Error("Assertion failed, bundle buffer was not created");
	}
	return buffer;
}

/**
 * Stubs `fetch()` and causes it to allow a single call and always returns the same response.
 * @param {ConstructorParameters<typeof Response>} responseArgs
 */
function mockFetch(...responseArgs) {
	let called = false;
	return stub(globalThis, "fetch", async () => {
		if (called) {
			throw new Error("fetch has already been called once");
		}
		called = true;
		return new Response(...responseArgs);
	});
}

/**
 * Creates a ReadableStream for which you can controll how many bytes are read at a time.
 * @param {ArrayBuffer} buffer
 */
function createControlledReadableStream(buffer) {
	/** @type {ReadableStreamDefaultController<Uint8Array>} */
	let streamController;
	/** @type {ReadableStream<Uint8Array>} */
	const stream = new ReadableStream({
		start(controller) {
			streamController = controller;
		},
	});

	let enqueuedBytes = 0;

	/**
	 * Makes available a specific amount of bytes on the ReadableStream.
	 * @param {number} bytes
	 */
	function enqueue(bytes) {
		const chunk = buffer.slice(enqueuedBytes, enqueuedBytes + bytes);
		enqueuedBytes += bytes;
		streamController.enqueue(new Uint8Array(chunk));
	}

	function closeStream() {
		streamController.close();
	}

	return { stream, enqueue, closeStream };
}

/**
 * Creates an ArrayBuffer that stores a single 32bit integer.
 * @param {number} number
 */
function createBasicAssetContent(number) {
	const buffer = new ArrayBuffer(4);
	const contentView = new DataView(buffer);
	contentView.setUint32(0, number, true);
	return buffer;
}

Deno.test({
	name: "startDownload fetches the resource",
	async fn() {
		const bundleBuffer = await createAssetBundle([]);
		const fetchMock = mockFetch(bundleBuffer);

		try {
			const bundle = new DownloadableAssetBundle("path/to/bundle");
			assertSpyCalls(fetchMock, 0);

			await bundle.startDownload();

			assertSpyCalls(fetchMock, 1);
			assertSpyCall(fetchMock, 0, {
				args: ["path/to/bundle"],
			});
		} finally {
			fetchMock.restore();
		}
	},
});

Deno.test({
	name: "response with 404 status code",
	ignore: true, // #936
	async fn() {
		const fetchMock = mockFetch(null, { status: 404, statusText: "Not found" });

		try {
			const bundle = new DownloadableAssetBundle("path/to/bundle");
			assertSpyCalls(fetchMock, 0);

			await assertRejects(async () => {
				await bundle.startDownload();
			}, Error, "Asset bundle request responded with 404 Not found");
		} finally {
			fetchMock.restore();
		}
	},
});

Deno.test({
	name: "response with invalid magic header",
	ignore: true, // #936
	async fn() {
		const buffer = new ArrayBuffer(40);
		const fetchMock = mockFetch(buffer);

		try {
			const bundle = new DownloadableAssetBundle("path/to/bundle");
			assertSpyCalls(fetchMock, 0);

			await assertRejects(async () => {
				await bundle.startDownload();
			}, Error, "Asset bundle request did not respond with the correct magic header. The url you provided (path/to/bundle) does not point to an asset bundle.");
		} finally {
			fetchMock.restore();
		}
	},
});

Deno.test({
	name: "response with invalid version",
	ignore: true, // #936
	async fn() {
		const buffer = new ArrayBuffer(40);
		const dataView = new DataView(buffer);
		dataView.setUint32(0, 0x62734172, true); // magic header
		dataView.setUint32(4, 2, true); // version
		const fetchMock = mockFetch(buffer);

		try {
			const bundle = new DownloadableAssetBundle("path/to/bundle");
			assertSpyCalls(fetchMock, 0);

			await assertRejects(async () => {
				await bundle.startDownload();
			}, Error, "Asset bundle request responded with a future asset bundle version (2). This version of Renda only supports asset bundle version 1.");
		} finally {
			fetchMock.restore();
		}
	},
});

Deno.test({
	name: "getting assets",
	async fn() {
		const bundleBuffer = await createAssetBundle([
			{
				uuid: BASIC_ASSET_UUID,
				assetTypeUuid: BASIC_ASSET_TYPE_UUID,
				content: createBasicAssetContent(12345678),
			},
		]);

		const fetchMock = mockFetch(bundleBuffer);

		try {
			const bundle = new DownloadableAssetBundle("path/to/bundle");

			await bundle.startDownload();

			const result = await bundle.getAsset(BASIC_ASSET_UUID);
			assertExists(result);
			assertEquals(result.type, BASIC_ASSET_TYPE_UUID);
			assertEquals(result.buffer.byteLength, 4);
			const resultView = new DataView(result.buffer);
			assertEquals(resultView.getUint32(0, true), 12345678);
		} finally {
			fetchMock.restore();
		}
	},
});

Deno.test({
	name: "progress stays zero until the bundle size is known and then changes as the file is downloaded",
	async fn() {
		const bundleBuffer = await createAssetBundle([
			{
				uuid: BASIC_ASSET_UUID,
				assetTypeUuid: BASIC_ASSET_TYPE_UUID,
				content: new ArrayBuffer(1000),
			},
		]);
		const { stream, enqueue, closeStream } = createControlledReadableStream(bundleBuffer);
		const fetchMock = mockFetch(stream);

		try {
			const bundle = new DownloadableAssetBundle("path/to/bundle");
			/** @type {number[]} */
			const progressCalls = [];
			bundle.onProgress((progress) => {
				progressCalls.push(progress);
			});
			const startDownloadPromise = bundle.startDownload();
			enqueue(3);
			enqueue(5);
			enqueue(4);
			enqueue(3);
			await waitForMicrotasks();
			assertEquals(bundle.progress, 0);

			enqueue(1);
			assertEquals(progressCalls.length, 0);
			await waitForMicrotasks();
			assertEquals(progressCalls.length, 1);
			assertEquals(progressCalls[0], 0.015037593984962405);
			assertEquals(bundle.progress, 0.015037593984962405);

			enqueue(500);
			await waitForMicrotasks();
			assertEquals(progressCalls.length, 2);
			assertEquals(progressCalls[1], 0.4849624060150376);
			assertEquals(bundle.progress, 0.4849624060150376);

			enqueue(600);
			await waitForMicrotasks();
			assertEquals(progressCalls.length, 3);
			assertEquals(progressCalls[2], 1);
			assertEquals(bundle.progress, 1);

			closeStream();
			await startDownloadPromise;
		} finally {
			fetchMock.restore();
		}
	},
});

Deno.test({
	name: "assets become available even though the full bundle hasn't been downloaded yet",
	async fn() {
		const bundleBuffer = await createAssetBundle([
			{
				uuid: BASIC_ASSET_UUID,
				assetTypeUuid: BASIC_ASSET_TYPE_UUID,
				content: createBasicAssetContent(12345678),
			},
			{
				uuid: BASIC_ASSET_UUID_2,
				assetTypeUuid: BASIC_ASSET_TYPE_UUID_2,
				content: createBasicAssetContent(8765432),
			},
		]);
		const { stream, enqueue, closeStream } = createControlledReadableStream(bundleBuffer);
		const fetchMock = mockFetch(stream);

		try {
			const bundle = new DownloadableAssetBundle("path/to/bundle");

			const hasAssetPromise1 = bundle.hasAsset(BASIC_ASSET_UUID);
			const hasAssetPromise2 = bundle.hasAsset(BASIC_ASSET_UUID_2);
			const hasAssetPromise3 = bundle.hasAsset(BASIC_ASSET_UUID_3);
			const availablePromise1 = bundle.waitForAssetAvailable(BASIC_ASSET_UUID);
			const availablePromise2 = bundle.waitForAssetAvailable(BASIC_ASSET_UUID_2);
			const availablePromise3 = bundle.waitForAssetAvailable(BASIC_ASSET_UUID_3);
			const getPromise1 = bundle.getAsset(BASIC_ASSET_UUID);
			const getPromise2 = bundle.getAsset(BASIC_ASSET_UUID_2);
			const getPromise3 = bundle.getAsset(BASIC_ASSET_UUID_3);
			const startDownloadPromise = bundle.startDownload();
			const waitForLoadPromise = bundle.waitForLoad();

			// First part of the header, since the header is incomplete, no promises should resolve yet.
			{
				enqueue(50);
				await assertPromiseResolved(hasAssetPromise1, false);
				await assertPromiseResolved(hasAssetPromise2, false);
				await assertPromiseResolved(hasAssetPromise3, false);
				await assertPromiseResolved(getPromise3, false);
			}

			// Second part of the header, `hasAsset` promises resolve,
			// as well as the `waitForAssetAvailable` and `getAsset` promises for the third asset
			// since it is now known that the bundle doesn't contain the third asset uuid
			{
				enqueue(54);

				await assertPromiseResolved(hasAssetPromise1, true);
				assertEquals(await hasAssetPromise1, true);

				await assertPromiseResolved(hasAssetPromise2, true);
				assertEquals(await hasAssetPromise2, true);

				await assertPromiseResolved(hasAssetPromise3, true);
				assertEquals(await hasAssetPromise3, false);

				await assertPromiseResolved(availablePromise3, true);
				assertEquals(await availablePromise3, false);

				await assertPromiseResolved(getPromise3, true);
				assertEquals(await getPromise3, null);
			}

			// First asset content is received
			{
				await assertPromiseResolved(availablePromise1, false);
				await assertPromiseResolved(getPromise1, false);

				enqueue(4);

				await assertPromiseResolved(availablePromise1, true);
				assertEquals(await availablePromise1, true);

				await assertPromiseResolved(getPromise1, true);
				const getResult = await getPromise1;
				assertExists(getResult);
				const dataView = new DataView(getResult.buffer);
				assertEquals(dataView.getUint32(0, true), 12345678);
			}

			// Second (and final) asset content is received, all promises resolve
			{
				await assertPromiseResolved(availablePromise2, false);
				await assertPromiseResolved(getPromise2, false);

				enqueue(4);

				await assertPromiseResolved(availablePromise2, true);
				assertEquals(await availablePromise2, true);

				await assertPromiseResolved(getPromise2, true);
				const getResult = await getPromise2;
				assertExists(getResult);
				const dataView = new DataView(getResult.buffer);
				assertEquals(dataView.getUint32(0, true), 8765432);
			}

			// Finish the stream, causing all promises to resolve
			{
				await assertPromiseResolved(startDownloadPromise, false);
				await assertPromiseResolved(waitForLoadPromise, false);

				closeStream();

				await assertPromiseResolved(startDownloadPromise, true);
				await assertPromiseResolved(waitForLoadPromise, true);
			}
		} finally {
			fetchMock.restore();
		}
	},
});
