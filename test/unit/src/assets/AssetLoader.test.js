import {Importer} from "fake-imports";
import {assertEquals, assertRejects, assertStrictEquals, assertThrows} from "std/testing/asserts.ts";
import {castMock} from "./MockAssetBundle.js";
import {forceCleanup, installMockWeakRef, uninstallMockWeakRef} from "../../shared/mockWeakRef.js";
import {waitForMicrotasks} from "../../shared/waitForMicroTasks.js";
import {assertIsType, testTypes} from "../../shared/typeAssertions.js";

const importer = new Importer(import.meta.url);
importer.redirectModule("../../../../src/assets/AssetBundle.js", "./MockAssetBundle.js");

/** @type {import("../../../../src/assets/AssetLoader.js")} */
const AssetLoaderModule = await importer.import("../../../../src/assets/AssetLoader.js");
const {AssetLoader} = AssetLoaderModule;

/** @type {import("../../../../src/assets/assetLoaderTypes/AssetLoaderType.js")} */
const AssetLoaderTypeModule = await importer.import("../../../../src/assets/assetLoaderTypes/AssetLoaderType.js");
const {AssetLoaderType} = AssetLoaderTypeModule;

const BASIC_ASSET_UUID = "basic asset uuid";
const BASIC_ASSET_TYPE_UUID = "ba51c0000-a55e-7000-778e-00000000441d";

/** @typedef {(buffer: ArrayBuffer, recursionTracker: import("../../../../src/assets/RecursionTracker.js").RecursionTracker, assetOpts: unknown) => unknown} ParseBufferFunction */

/**
 * @param {object} options
 * @param {import("../../../../src/mod.js").UuidString} options.uuid
 * @param {ParseBufferFunction} options.parseBufferFn
 */
function createBasicLoaderType({
	uuid,
	parseBufferFn,
}) {
	/**
	 * @extends {AssetLoaderType<unknown>}
	 */
	class ExtendedAssetLoaderType extends AssetLoaderType {
		static get typeUuid() {
			return uuid;
		}

		/**
		 * @override
		 * @param {ArrayBuffer} buffer
		 * @param {import("../../../../src/assets/RecursionTracker.js").RecursionTracker} recursionTracker
		 * @param {unknown} assetOpts
		 */
		async parseBuffer(buffer, recursionTracker, assetOpts) {
			return parseBufferFn(buffer, recursionTracker, assetOpts);
		}
	}

	return {
		ExtendedAssetLoaderType,
		/**
		 *@param {ParseBufferFunction} newParseBufferFn
		 */
		setParseBufferFn(newParseBufferFn) {
			parseBufferFn = newParseBufferFn;
		},
	};
}

/**
 * @template {boolean} [TRegisterLoaderType = true]
 * @param {object} options
 * @param {TRegisterLoaderType} [options.registerLoaderType]
 */
function basicSetup({
	registerLoaderType = /** @type {TRegisterLoaderType} */ (true),
} = {}) {
	installMockWeakRef();
	const assetLoader = new AssetLoader();
	const expectedAsset = {label: "expected asset"};

	const {ExtendedAssetLoaderType, setParseBufferFn} = createBasicLoaderType({
		uuid: BASIC_ASSET_TYPE_UUID,
		parseBufferFn() {
			return expectedAsset;
		},
	});

	let loaderType = null;
	if (registerLoaderType) {
		loaderType = assetLoader.registerLoaderType(ExtendedAssetLoaderType);
	}
	const castLoaderType = 	/** @type {TRegisterLoaderType extends true ? ExtendedAssetLoaderType : null} */ (loaderType);

	return {
		assetLoader,
		expectedAsset,
		loaderType: castLoaderType,
		setParseBufferFn,
		uninstall() {
			uninstallMockWeakRef();
		},
	};
}

Deno.test({
	name: "registering an asset loader type that is not an instance of AssetLoaderType shouuld throw",
	fn() {
		class Foo {}
		const assetLoader = new AssetLoader();
		assertThrows(() => {
			assetLoader.registerLoaderType(/** @type {any} */(Foo));
		}, Error, `Unable to register AssetLoaderType "Foo" because it doesn't extend the AssetLoaderType class.`);
	},
});

Deno.test({
	name: "registering an asset loader type that is missing a typeUuid property should throw",
	fn() {
		/** @extends {AssetLoaderType<unknown>} */
		class Foo extends AssetLoaderType {}
		const assetLoader = new AssetLoader();
		assertThrows(() => {
			assetLoader.registerLoaderType(Foo);
		}, Error, `Unable to register AssetLoaderType "Foo" because it doesn't have a valid uuid for the static 'typeUuid' set ("").`);
	},
});

Deno.test({
	name: "registering an asset loader type that has an invalid typeUuid property should throw",
	fn() {
		/** @extends {AssetLoaderType<unknown>} */
		class Foo extends AssetLoaderType {
			static get typeUuid() {
				return "not a uuid";
			}
		}
		const assetLoader = new AssetLoader();
		assertThrows(() => {
			assetLoader.registerLoaderType(Foo);
		}, Error, `Unable to register AssetLoaderType "Foo" because it doesn't have a valid uuid for the static 'typeUuid' set ("not a uuid").`);
	},
});

testTypes({
	name: "registerLoaderType() returns the correct type",
	fn() {
		/** @extends {AssetLoaderType<number, string>} */
		class Foo extends AssetLoaderType {
		}
		const assetLoader = new AssetLoader();
		const loaderType = assetLoader.registerLoaderType(Foo);

		const expectedType = new Foo(assetLoader);

		assertIsType(expectedType, loaderType);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, loaderType);
	},
});

Deno.test({
	name: "getting an asset",
	async fn() {
		const {assetLoader, expectedAsset, uninstall} = basicSetup();
		const bundle = assetLoader.addBundle("path/to/url");
		const mockBundle = castMock(bundle);
		mockBundle.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

		const getAssetPromise = assetLoader.getAsset(BASIC_ASSET_UUID);
		mockBundle.setAssetAvailable(BASIC_ASSET_UUID, true);
		const asset = await getAssetPromise;

		assertStrictEquals(asset, expectedAsset);

		uninstall();
	},
});

Deno.test({
	name: "requesting the same asset twice returns the same instance by default",
	async fn() {
		const {assetLoader, expectedAsset, setParseBufferFn, uninstall} = basicSetup();
		const bundle = assetLoader.addBundle("path/to/url");
		const mockBundle = castMock(bundle);
		mockBundle.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

		const getAssetPromise1 = assetLoader.getAsset(BASIC_ASSET_UUID);
		mockBundle.setAssetAvailable(BASIC_ASSET_UUID, true);
		const asset1 = await getAssetPromise1;
		assertStrictEquals(asset1, expectedAsset);

		setParseBufferFn(() => {
			return {label: "unexpected asset"};
		});

		const getAssetPromise2 = assetLoader.getAsset(BASIC_ASSET_UUID);
		mockBundle.setAssetAvailable(BASIC_ASSET_UUID, true);
		const asset2 = await getAssetPromise2;
		assertStrictEquals(asset2, expectedAsset);

		uninstall();
	},
});

Deno.test({
	name: "requesting the same asset twice returns a different instance when createNewInstance is true",
	async fn() {
		const {assetLoader, expectedAsset: expectedAsset1, setParseBufferFn, uninstall} = basicSetup();
		const bundle = assetLoader.addBundle("path/to/url");
		const mockBundle = castMock(bundle);
		mockBundle.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

		const getAssetPromise1 = assetLoader.getAsset(BASIC_ASSET_UUID, {
			createNewInstance: true,
		});
		mockBundle.setAssetAvailable(BASIC_ASSET_UUID, true);
		const asset1 = await getAssetPromise1;
		assertStrictEquals(asset1, expectedAsset1);

		const expectedAsset2 = {label: "expected asset 2"};
		setParseBufferFn(() => expectedAsset2);

		const getAssetPromise2 = assetLoader.getAsset(BASIC_ASSET_UUID, {
			createNewInstance: true,
		});
		mockBundle.setAssetAvailable(BASIC_ASSET_UUID, true);
		const asset2 = await getAssetPromise2;
		assertStrictEquals(asset2, expectedAsset2);

		uninstall();
	},
});

Deno.test({
	name: "requesting the same asset twice returns a different instance when the old one was garbage collected",
	async fn() {
		const {assetLoader, expectedAsset: expectedAsset1, setParseBufferFn, uninstall} = basicSetup();
		const bundle = assetLoader.addBundle("path/to/url");
		const mockBundle = castMock(bundle);
		mockBundle.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

		const getAssetPromise1 = assetLoader.getAsset(BASIC_ASSET_UUID);
		mockBundle.setAssetAvailable(BASIC_ASSET_UUID, true);
		const asset1 = await getAssetPromise1;
		assertStrictEquals(asset1, expectedAsset1);

		forceCleanup(asset1);

		const expectedAsset2 = {label: "expected asset 2"};
		setParseBufferFn(() => expectedAsset2);

		const getAssetPromise2 = assetLoader.getAsset(BASIC_ASSET_UUID);
		mockBundle.setAssetAvailable(BASIC_ASSET_UUID, true);
		const asset2 = await getAssetPromise2;
		assertStrictEquals(asset2, expectedAsset2);

		uninstall();
	},
});

Deno.test({
	name: "getting an asset with no bundles added rejects",
	async fn() {
		const {assetLoader, uninstall} = basicSetup();

		await assertRejects(async () => {
			await assetLoader.getAsset(BASIC_ASSET_UUID);
		}, Error, `Tried to load an asset with uuid ${BASIC_ASSET_UUID} but the uuid wasn't found in any AssetBundle.`);

		uninstall();
	},
});

Deno.test({
	name: "getting an asset that is not available in any bundle rejects",
	async fn() {
		const {assetLoader, uninstall} = basicSetup();
		const bundle = assetLoader.addBundle("path/to/url");
		const mockBundle = castMock(bundle);

		const getAssetPromise = assetLoader.getAsset(BASIC_ASSET_UUID);
		mockBundle.setAssetAvailable(BASIC_ASSET_UUID, false);

		await assertRejects(async () => {
			await getAssetPromise;
		}, Error, `Tried to load an asset with uuid ${BASIC_ASSET_UUID} but the uuid wasn't found in any AssetBundle.`);

		uninstall();
	},
});

Deno.test({
	name: "getting an asset that is available in the second bundle, first bundle resolves first",
	async fn() {
		const {assetLoader, expectedAsset, uninstall} = basicSetup();
		const bundle1 = assetLoader.addBundle("path/to/url1");
		const mockBundle1 = castMock(bundle1);
		const bundle2 = assetLoader.addBundle("path/to/url2");
		const mockBundle2 = castMock(bundle2);
		mockBundle2.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

		const getAssetPromise = assetLoader.getAsset(BASIC_ASSET_UUID);
		await waitForMicrotasks();
		mockBundle1.setAssetAvailable(BASIC_ASSET_UUID, false);
		await waitForMicrotasks();
		mockBundle2.setAssetAvailable(BASIC_ASSET_UUID, true);
		await waitForMicrotasks();
		const asset = await getAssetPromise;

		assertStrictEquals(asset, expectedAsset);

		uninstall();
	},
});

Deno.test({
	name: "getting an asset that is available in the second bundle, second bundle resolves first",
	async fn() {
		const {assetLoader, expectedAsset, uninstall} = basicSetup();
		const bundle1 = assetLoader.addBundle("path/to/url1");
		const mockBundle1 = castMock(bundle1);
		const bundle2 = assetLoader.addBundle("path/to/url2");
		const mockBundle2 = castMock(bundle2);
		mockBundle2.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

		const getAssetPromise = assetLoader.getAsset(BASIC_ASSET_UUID);
		await waitForMicrotasks();
		mockBundle2.setAssetAvailable(BASIC_ASSET_UUID, true);
		await waitForMicrotasks();
		mockBundle1.setAssetAvailable(BASIC_ASSET_UUID, false);
		await waitForMicrotasks();
		const asset = await getAssetPromise;

		assertStrictEquals(asset, expectedAsset);

		uninstall();
	},
});

Deno.test({
	name: "loading an asset that doesn't have a registerd loader type rejects",
	async fn() {
		const {assetLoader, uninstall} = basicSetup({registerLoaderType: false});
		const bundle = assetLoader.addBundle("path/to/url");
		const mockBundle = castMock(bundle);
		mockBundle.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

		const getAssetPromise = assetLoader.getAsset(BASIC_ASSET_UUID);
		mockBundle.setAssetAvailable(BASIC_ASSET_UUID, true);
		await assertRejects(async () => {
			await getAssetPromise;
		}, Error, `Unable to parse asset with uuid "${BASIC_ASSET_UUID}". Its type is not registered, register it first with AssetLoader.registerLoaderType().`);

		uninstall();
	},
});

Deno.test({
	name: "Loading an asset that loads another asset",
	async fn() {
		const {assetLoader, setParseBufferFn, uninstall} = basicSetup();

		try {
			const bundle = assetLoader.addBundle("path/to/url");
			const mockBundle = castMock(bundle);
			const FIRST_ASSET_UUID = "first asset uuid";
			const SECOND_ASSET_UUID = "second asset uuid";
			const firstAssetBuffer = new ArrayBuffer(0);
			const secondAssetBuffer = new ArrayBuffer(0);

			mockBundle.setAssetType(FIRST_ASSET_UUID, BASIC_ASSET_TYPE_UUID);
			mockBundle.setAssetBuffer(FIRST_ASSET_UUID, firstAssetBuffer);
			mockBundle.setAssetAvailable(FIRST_ASSET_UUID);

			mockBundle.setAssetType(SECOND_ASSET_UUID, BASIC_ASSET_TYPE_UUID);
			mockBundle.setAssetBuffer(SECOND_ASSET_UUID, secondAssetBuffer);
			mockBundle.setAssetAvailable(SECOND_ASSET_UUID);

			setParseBufferFn((buffer, recursionTracker) => {
				if (buffer == firstAssetBuffer) {
					const assetObj = {
						label: "first asset",
						secondAsset: /** @type {any} */ (null),
					};
					recursionTracker.getAsset(SECOND_ASSET_UUID, asset => {
						assetObj.secondAsset = asset;
					});
					return assetObj;
				} else if (buffer == secondAssetBuffer) {
					return {label: "second asset"};
				}
			});

			const asset = await assetLoader.getAsset(FIRST_ASSET_UUID);
			assertEquals(asset, {
				label: "first asset",
				secondAsset: {label: "second asset"},
			});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Loading an assets that load each other as a circular reference",
	async fn() {
		const {assetLoader, setParseBufferFn, uninstall} = basicSetup();

		try {
			const bundle = assetLoader.addBundle("path/to/url");
			const mockBundle = castMock(bundle);
			const FIRST_ASSET_UUID = "first asset uuid";
			const SECOND_ASSET_UUID = "second asset uuid";
			const firstAssetBuffer = new ArrayBuffer(0);
			const secondAssetBuffer = new ArrayBuffer(0);

			mockBundle.setAssetType(FIRST_ASSET_UUID, BASIC_ASSET_TYPE_UUID);
			mockBundle.setAssetBuffer(FIRST_ASSET_UUID, firstAssetBuffer);
			mockBundle.setAssetAvailable(FIRST_ASSET_UUID);

			mockBundle.setAssetType(SECOND_ASSET_UUID, BASIC_ASSET_TYPE_UUID);
			mockBundle.setAssetBuffer(SECOND_ASSET_UUID, secondAssetBuffer);
			mockBundle.setAssetAvailable(SECOND_ASSET_UUID);

			setParseBufferFn((buffer, recursionTracker) => {
				if (buffer == firstAssetBuffer) {
					const assetObj = {
						label: "first asset",
						otherAsset: /** @type {any} */ (null),
					};
					recursionTracker.getAsset(SECOND_ASSET_UUID, asset => {
						assetObj.otherAsset = asset;
					});
					return assetObj;
				} else if (buffer == secondAssetBuffer) {
					const assetObj = {
						label: "second asset",
						otherAsset: /** @type {any} */ (null),
					};
					recursionTracker.getAsset(FIRST_ASSET_UUID, asset => {
						assetObj.otherAsset = asset;
					});
					return assetObj;
				}
			});

			const asset = await assetLoader.getAsset(FIRST_ASSET_UUID);
			const expectedAsset = {
				label: "first asset",
				otherAsset: /** @type {any} */ (null),
			};
			const expectedAsset2 = {
				label: "second asset",
				otherAsset: expectedAsset,
			};
			expectedAsset.otherAsset = expectedAsset2;
			assertEquals(asset, expectedAsset);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Loading an assets with a circular reference but the root is not part of the circular reference",
	async fn() {
		const {assetLoader, setParseBufferFn, uninstall} = basicSetup();

		try {
			const bundle = assetLoader.addBundle("path/to/url");
			const mockBundle = castMock(bundle);
			const FIRST_ASSET_UUID = "first asset uuid";
			const SECOND_ASSET_UUID = "second asset uuid";
			const THIRD_ASSET_UUID = "third asset uuid";
			const firstAssetBuffer = new ArrayBuffer(0);
			const secondAssetBuffer = new ArrayBuffer(0);
			const thirdAssetBuffer = new ArrayBuffer(0);

			mockBundle.setAssetType(FIRST_ASSET_UUID, BASIC_ASSET_TYPE_UUID);
			mockBundle.setAssetBuffer(FIRST_ASSET_UUID, firstAssetBuffer);
			mockBundle.setAssetAvailable(FIRST_ASSET_UUID);

			mockBundle.setAssetType(SECOND_ASSET_UUID, BASIC_ASSET_TYPE_UUID);
			mockBundle.setAssetBuffer(SECOND_ASSET_UUID, secondAssetBuffer);
			mockBundle.setAssetAvailable(SECOND_ASSET_UUID);

			mockBundle.setAssetType(THIRD_ASSET_UUID, BASIC_ASSET_TYPE_UUID);
			mockBundle.setAssetBuffer(THIRD_ASSET_UUID, thirdAssetBuffer);
			mockBundle.setAssetAvailable(THIRD_ASSET_UUID);

			setParseBufferFn((buffer, recursionTracker) => {
				if (buffer == firstAssetBuffer) {
					const assetObj = {
						label: "first asset",
						otherAsset: /** @type {any} */ (null),
					};
					recursionTracker.getAsset(SECOND_ASSET_UUID, asset => {
						assetObj.otherAsset = asset;
					});
					return assetObj;
				} else if (buffer == secondAssetBuffer) {
					const assetObj = {
						label: "second asset",
						otherAsset: /** @type {any} */ (null),
					};
					recursionTracker.getAsset(THIRD_ASSET_UUID, asset => {
						assetObj.otherAsset = asset;
					});
					return assetObj;
				} else if (buffer == thirdAssetBuffer) {
					const assetObj = {
						label: "third asset",
						otherAsset: /** @type {any} */ (null),
					};
					recursionTracker.getAsset(SECOND_ASSET_UUID, asset => {
						assetObj.otherAsset = asset;
					});
					return assetObj;
				}
			});

			const asset = await assetLoader.getAsset(FIRST_ASSET_UUID);
			const expectedAsset2 = {
				label: "second asset",
				otherAsset: /** @type {any} */ (null),
			};
			const expectedAsset3 = {
				label: "third asset",
				otherAsset: expectedAsset2,
			};
			expectedAsset2.otherAsset = expectedAsset3;
			const expectedAsset = {
				label: "first asset",
				otherAsset: expectedAsset2,
			};
			assertEquals(asset, expectedAsset);
		} finally {
			uninstall();
		}
	},
});
