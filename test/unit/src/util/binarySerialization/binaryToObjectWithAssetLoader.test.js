import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {assertEquals} from "std/testing/asserts.ts";
import {StorageType, binaryToObjectWithAssetLoader, createObjectToBinaryOptions, objectToBinary} from "../../../../../src/mod.js";

const BASIC_ASSET_UUID = "00000000-0000-0000-0000-000000000001";

function createMockAssetLoader() {
	const assetLoader = /** @type {import("../../../../../src/mod.js").AssetLoader} */ ({
		async getAsset(uuid, options) {
			return {
				loadedAssetUuid: uuid,
			};
		},
	});
	return assetLoader;
}

/** @type {CreateTypeAssertionFn<unknown>} */
const assertIsUnknown = () => {};

/** @type {CreateTypeAssertionFn<import("../../../../../src/mod.js").UuidString>} */
const assertIsUuidString = () => {};

Deno.test({
	name: "binaryToObjectWithAssetLoader()",
	async fn() {
		const opts = createObjectToBinaryOptions({
			structure: {
				asset: StorageType.ASSET_UUID,
				num: StorageType.UINT32,
				unsetAsset: StorageType.ASSET_UUID,
				unsetNumber: StorageType.UINT32,
				replacedByTransformValueHook: StorageType.UINT32,
			},
			nameIds: {
				asset: 1,
				num: 2,
				unsetAsset: 3,
				unsetNumber: 4,
				replacedByTransformValueHook: 5,
			},
		});

		const buffer = objectToBinary({
			asset: BASIC_ASSET_UUID,
			num: 42,
			replacedByTransformValueHook: 42,
		}, opts);

		const assetLoader = createMockAssetLoader();

		/** @type {import("../../../../../src/mod.js").BinaryToObjectTransformValueHook} */
		const transformValueHook = function({value, placedOnKey}) {
			if (placedOnKey == "replacedByTransformValueHook") {
				if (typeof value != "number") {
					throw new Error("Assertion failed, expected a number.");
				}
				return value + 1;
			}
			return value;
		};
		const transformValueHookSpy = spy(transformValueHook);

		const result = await binaryToObjectWithAssetLoader(buffer, assetLoader, {
			...opts,
			transformValueHook: transformValueHookSpy,
		});
		assertEquals(result, {
			asset: {
				loadedAssetUuid: BASIC_ASSET_UUID,
			},
			num: 42,
			unsetAsset: null,
			unsetNumber: 0,
			replacedByTransformValueHook: 43,
		});

		assertSpyCalls(transformValueHookSpy, 5);
		assertSpyCall(transformValueHookSpy, 0, {
			args: [
				{
					placedOnKey: "num",
					value: 42,
					type: StorageType.UINT32,
					placedOnObject: result,
				},
			],
		});
		assertSpyCall(transformValueHookSpy, 1, {
			args: [
				{
					placedOnKey: "unsetNumber",
					value: 0,
					type: StorageType.UINT32,
					placedOnObject: result,
				},
			],
		});
		assertSpyCall(transformValueHookSpy, 2, {
			args: [
				{
					placedOnKey: "replacedByTransformValueHook",
					value: 42,
					type: StorageType.UINT32,
					placedOnObject: result,
				},
			],
		});
		assertSpyCall(transformValueHookSpy, 3, {
			args: [
				{
					placedOnKey: "unsetAsset",
					value: null,
					type: StorageType.ASSET_UUID,
					placedOnObject: result,
				},
			],
		});
		assertSpyCall(transformValueHookSpy, 4, {
			args: [
				{
					placedOnKey: "asset",
					value: result.asset,
					type: StorageType.ASSET_UUID,
					placedOnObject: result,
				},
			],
		});

		assertIsUnknown(result.asset, result.asset);
		// @ts-expect-error
		assertIsUuidString(result.asset, result.asset);
	},
});

Deno.test({
	name: "Asset in union",
	async fn() {
		const opts = createObjectToBinaryOptions({
			structure: {
				union: [
					StorageType.UNION_ARRAY,
					{
						isFirstType: StorageType.BOOL,
						asset: StorageType.ASSET_UUID,
					},
					{
						isSecondType: StorageType.BOOL,
						asset: StorageType.ASSET_UUID,
					},
				],
			},
			nameIds: {
				union: 1,
				isFirstType: 2,
				isSecondType: 3,
				asset: 4,
			},
		});

		const buffer = objectToBinary({
			union: {
				isFirstType: true,
				asset: BASIC_ASSET_UUID,
			},
		}, opts);

		const assetLoader = createMockAssetLoader();

		const result = await binaryToObjectWithAssetLoader(buffer, assetLoader, opts);

		assertEquals(result, {
			union: {
				isFirstType: true,
				asset: {
					loadedAssetUuid: BASIC_ASSET_UUID,
				},
			},
		});

		assertIsUnknown(result.union.asset, result.union.asset);
		// @ts-expect-error
		assertIsUuidString(result.union.asset, result.union.asset);
	},
});
