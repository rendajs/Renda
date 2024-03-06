import { assertSpyCall, assertSpyCalls, stub } from "std/testing/mock.ts";
import { DownloadableAssetBundle } from "../../../../../src/assets/assetBundles/DownloadableAssetBundle.js";
import { uuidToBinary } from "../../../../../src/mod.js";
import { assertEquals, assertExists } from "std/testing/asserts.ts";
import { assertPromiseResolved } from "../../../shared/asserts.js";

const BASIC_ASSET_UUID = "00000000-0000-0000-0000-000000000001";
const BASIC_ASSET_TYPE_UUID = "00000000-0000-0000-0000-000000000002";
const BASIC_ASSET_UUID_2 = "00000000-0000-0000-0000-000000000003";
const BASIC_ASSET_TYPE_UUID_2 = "00000000-0000-0000-0000-000000000004";
const BASIC_ASSET_UUID_3 = "00000000-0000-0000-0000-000000000005";

Deno.test({
	name: "startDownload fetches the resource",
	async fn() {
		const fetchSpy = stub(globalThis, "fetch", async () => {
			return new Response();
		});

		try {
			const bundle = new DownloadableAssetBundle("path/to/bundle");
			assertSpyCalls(fetchSpy, 0);

			bundle.startDownload();

			assertSpyCalls(fetchSpy, 1);
			assertSpyCall(fetchSpy, 0, {
				args: ["path/to/bundle"],
			});
		} finally {
			fetchSpy.restore();
		}
	},
});

Deno.test({
	name: "getting assets",
	async fn() {
		const body = new ArrayBuffer(44);
		const view = new DataView(body);
		const intView = new Uint8Array(body);
		let cursor = 0;
		view.setUint32(cursor, 1, true); // asset count
		cursor += 4;

		const assetUuidBinary = uuidToBinary(BASIC_ASSET_UUID);
		intView.set(new Uint8Array(assetUuidBinary), cursor); // asset uuid
		cursor += 16;

		const assetTypeUuidBinary = uuidToBinary(BASIC_ASSET_TYPE_UUID);
		intView.set(new Uint8Array(assetTypeUuidBinary), cursor); // asset type uuid
		cursor += 16;

		view.setUint32(cursor, 4, true); // asset length
		cursor += 4;

		view.setUint32(cursor, 12345678, true); // asset content

		const fetchSpy = stub(globalThis, "fetch", async () => {
			return new Response(body, {
				headers: {
					"Content-Length": "44",
				},
			});
		});

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
			fetchSpy.restore();
		}
	},
});

Deno.test({
	name: "assets become available even though the full bundle hasn't been downloaded yet",
	async fn() {
		/** @type {ReadableStreamDefaultController<Uint8Array>} */
		let streamController;
		/** @type {ReadableStream<Uint8Array>} */
		const stream = new ReadableStream({
			start(controller) {
				streamController = controller;
			},
		});

		/**
		 * @param {Uint8Array} chunk
		 */
		function enqueue(chunk) {
			streamController.enqueue(chunk);
		}

		function closeStream() {
			streamController.close();
		}

		const fetchSpy = stub(globalThis, "fetch", async () => {
			const mockResponse = /** @type {Response} */ ({
				headers: new Headers({
					"Content-Length": "84",
				}),
				body: stream,
			});
			return mockResponse;
		});

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
				let headerCursor1 = 0;
				const headerBody1 = new ArrayBuffer(40);
				const headerView1 = new DataView(headerBody1);
				const headerIntView1 = new Uint8Array(headerBody1);

				headerView1.setUint32(headerCursor1, 2, true); // asset count
				headerCursor1 += 4;

				const assetUuidBinary = uuidToBinary(BASIC_ASSET_UUID);
				headerIntView1.set(new Uint8Array(assetUuidBinary), headerCursor1); // asset uuid
				headerCursor1 += 16;

				const assetTypeUuidBinary = uuidToBinary(BASIC_ASSET_TYPE_UUID);
				headerIntView1.set(new Uint8Array(assetTypeUuidBinary), headerCursor1); // asset type uuid
				headerCursor1 += 16;

				headerView1.setUint32(headerCursor1, 4, true); // asset length
				headerCursor1 += 4;

				enqueue(headerIntView1);
			}

			// Second part of the header, `hasAsset` promises resolve,
			// as well as the `waitForAssetAvailable` and `getAsset` promises for the third asset
			// since it is now known that the bundle doesn't contain the third asset uuid
			{
				let headerCursor2 = 0;
				const headerBody2 = new ArrayBuffer(36);
				const headerView2 = new DataView(headerBody2);
				const headerIntView2 = new Uint8Array(headerBody2);

				const assetUuid2Binary = uuidToBinary(BASIC_ASSET_UUID_2);
				headerIntView2.set(new Uint8Array(assetUuid2Binary), headerCursor2); // asset uuid
				headerCursor2 += 16;

				const assetTypeUuid2Binary = uuidToBinary(BASIC_ASSET_TYPE_UUID_2);
				headerIntView2.set(new Uint8Array(assetTypeUuid2Binary), headerCursor2); // asset type uuid
				headerCursor2 += 16;

				headerView2.setUint32(headerCursor2, 4, true); // asset length
				headerCursor2 += 4;

				await assertPromiseResolved(hasAssetPromise1, false);
				await assertPromiseResolved(hasAssetPromise2, false);
				await assertPromiseResolved(hasAssetPromise3, false);
				await assertPromiseResolved(getPromise3, false);

				enqueue(headerIntView2);

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
				const assetContent = 12345678;

				const asset1Body = new ArrayBuffer(4);
				const asset1View = new DataView(asset1Body);
				asset1View.setUint32(0, 12345678, true);
				const asset1IntView = new Uint8Array(asset1Body);

				await assertPromiseResolved(availablePromise1, false);
				await assertPromiseResolved(getPromise1, false);

				enqueue(asset1IntView);

				await assertPromiseResolved(availablePromise1, true);
				assertEquals(await availablePromise1, true);

				await assertPromiseResolved(getPromise1, true);
				const getResult = await getPromise1;
				assertExists(getResult);
				const dataView = new DataView(getResult.buffer);
				assertEquals(dataView.getUint32(0, true), assetContent);
			}

			// Second (and final) asset content is received, all promises resolve
			{
				const assetContent = 8765432;

				const asset2Body = new ArrayBuffer(4);
				const asset2View = new DataView(asset2Body);
				asset2View.setUint32(0, assetContent, true);
				const asset2IntView = new Uint8Array(asset2Body);

				await assertPromiseResolved(availablePromise2, false);
				await assertPromiseResolved(getPromise2, false);

				enqueue(asset2IntView);

				await assertPromiseResolved(availablePromise2, true);
				assertEquals(await availablePromise2, true);

				await assertPromiseResolved(getPromise2, true);
				const getResult = await getPromise2;
				assertExists(getResult);
				const dataView = new DataView(getResult.buffer);
				assertEquals(dataView.getUint32(0, true), assetContent);
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
			fetchSpy.restore();
		}
	},
});
