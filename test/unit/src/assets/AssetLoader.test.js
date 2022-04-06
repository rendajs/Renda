import {Importer} from "fake-imports";
import {assertRejects, assertStrictEquals, assertThrows} from "asserts";
import {castMock} from "./MockAssetBundle.js";
import {forceCleanup, installMockWeakRef, uninstallMockWeakRef} from "../../shared/mockWeakRef.js";
import {waitForMicrotasks} from "../../shared/waitForMicroTasks.js";

const importer = new Importer(import.meta.url);
importer.redirectModule("../../../../src/Assets/AssetBundle.js", "./MockAssetBundle.js");

/** @type {import("../../../../src/Assets/AssetLoader.js")} */
const AssetLoaderModule = await importer.import("../../../../src/Assets/AssetLoader.js");
const {AssetLoader} = AssetLoaderModule;

/** @type {import("../../../../src/Assets/AssetLoaderTypes/AssetLoaderType.js")} */
const AssetLoaderTypeModule = await importer.import("../../../../src/Assets/AssetLoaderTypes/AssetLoaderType.js");
const {AssetLoaderType} = AssetLoaderTypeModule;

const BASIC_ASSET_UUID = "basic asset uuid";
const BASIC_ASSET_TYPE_UUID = "ba51c0000-a55e-7000-778e-00000000441d";

class ExtendedAssetLoaderType extends AssetLoaderType {
	static get typeUuid() {
		return BASIC_ASSET_TYPE_UUID;
	}

	/**
	 * @param  {ConstructorParameters<typeof AssetLoaderType>} args
	 */
	constructor(...args) {
		super(...args);

		/** @type {{buffer: ArrayBuffer, assetOpts: unknown}[]} */
		this.parseBufferCalls = [];
		/** @private @type {unknown} */
		this.parseBufferReturn = null;
	}

	/**
	 * @override
	 * @param {ArrayBuffer} buffer
	 * @param {unknown} assetOpts
	 */
	async parseBuffer(buffer, assetOpts) {
		this.parseBufferCalls.push({buffer, assetOpts});
		return this.parseBufferReturn;
	}

	/**
	 * @param {unknown} asset
	 */
	setParseBufferReturn(asset) {
		this.parseBufferReturn = asset;
	}
}

/**
 * @template {boolean} [TRegisterLoaderType = true]
 * @param {Object} [options]
 * @param {TRegisterLoaderType} [options.registerLoaderType]
 */
function basicSetup({
	registerLoaderType = /** @type {TRegisterLoaderType} */ (true),
} = {}) {
	installMockWeakRef();
	const assetLoader = new AssetLoader();
	const expectedAsset = {label: "expected asset"};

	let loaderType = null;
	if (registerLoaderType) {
		loaderType = assetLoader.registerLoaderType(ExtendedAssetLoaderType);
		loaderType.setParseBufferReturn(expectedAsset);
	}
	const castLoaderType = 	/** @type {TRegisterLoaderType extends true ? ExtendedAssetLoaderType : null} */ (loaderType);

	return {
		assetLoader,
		expectedAsset,
		loaderType: castLoaderType,
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

Deno.test({
	name: "getting an asset",
	async fn() {
		const {assetLoader, expectedAsset, uninstall} = basicSetup();
		const bundle = assetLoader.addBundle("path/to/url");
		const mockBundle = castMock(bundle);
		mockBundle.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

		const getAssetPromise = assetLoader.getAsset(BASIC_ASSET_UUID);
		mockBundle.triggerAssetAvailable(BASIC_ASSET_UUID, true);
		const asset = await getAssetPromise;

		assertStrictEquals(asset, expectedAsset);

		uninstall();
	},
});

Deno.test({
	name: "requesting the same asset twice returns the same instance by default",
	async fn() {
		const {assetLoader, expectedAsset, loaderType, uninstall} = basicSetup();
		const bundle = assetLoader.addBundle("path/to/url");
		const mockBundle = castMock(bundle);
		mockBundle.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

		const getAssetPromise1 = assetLoader.getAsset(BASIC_ASSET_UUID);
		mockBundle.triggerAssetAvailable(BASIC_ASSET_UUID, true);
		const asset1 = await getAssetPromise1;
		assertStrictEquals(asset1, expectedAsset);

		loaderType.setParseBufferReturn({label: "unexpected asset"});

		const getAssetPromise2 = assetLoader.getAsset(BASIC_ASSET_UUID);
		mockBundle.triggerAssetAvailable(BASIC_ASSET_UUID, true);
		const asset2 = await getAssetPromise2;
		assertStrictEquals(asset2, expectedAsset);

		uninstall();
	},
});

Deno.test({
	name: "requesting the same asset twice returns a different instance when createNewInstance is true",
	async fn() {
		const {assetLoader, expectedAsset: expectedAsset1, loaderType, uninstall} = basicSetup();
		const bundle = assetLoader.addBundle("path/to/url");
		const mockBundle = castMock(bundle);
		mockBundle.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

		const getAssetPromise1 = assetLoader.getAsset(BASIC_ASSET_UUID, {
			createNewInstance: true,
		});
		mockBundle.triggerAssetAvailable(BASIC_ASSET_UUID, true);
		const asset1 = await getAssetPromise1;
		assertStrictEquals(asset1, expectedAsset1);

		const expectedAsset2 = {label: "expected asset 2"};
		loaderType.setParseBufferReturn(expectedAsset2);

		const getAssetPromise2 = assetLoader.getAsset(BASIC_ASSET_UUID, {
			createNewInstance: true,
		});
		mockBundle.triggerAssetAvailable(BASIC_ASSET_UUID, true);
		const asset2 = await getAssetPromise2;
		assertStrictEquals(asset2, expectedAsset2);

		uninstall();
	},
});

Deno.test({
	name: "requesting the same asset twice returns a different instance when the old one was garbage collected",
	async fn() {
		const {assetLoader, expectedAsset: expectedAsset1, loaderType, uninstall} = basicSetup();
		const bundle = assetLoader.addBundle("path/to/url");
		const mockBundle = castMock(bundle);
		mockBundle.setAssetType(BASIC_ASSET_UUID, BASIC_ASSET_TYPE_UUID);

		const getAssetPromise1 = assetLoader.getAsset(BASIC_ASSET_UUID);
		mockBundle.triggerAssetAvailable(BASIC_ASSET_UUID, true);
		const asset1 = await getAssetPromise1;
		assertStrictEquals(asset1, expectedAsset1);

		forceCleanup(asset1);

		const expectedAsset2 = {label: "expected asset 2"};
		loaderType.setParseBufferReturn(expectedAsset2);

		const getAssetPromise2 = assetLoader.getAsset(BASIC_ASSET_UUID);
		mockBundle.triggerAssetAvailable(BASIC_ASSET_UUID, true);
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
		mockBundle.triggerAssetAvailable(BASIC_ASSET_UUID, false);

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
		mockBundle1.triggerAssetAvailable(BASIC_ASSET_UUID, false);
		await waitForMicrotasks();
		mockBundle2.triggerAssetAvailable(BASIC_ASSET_UUID, true);
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
		mockBundle2.triggerAssetAvailable(BASIC_ASSET_UUID, true);
		await waitForMicrotasks();
		mockBundle1.triggerAssetAvailable(BASIC_ASSET_UUID, false);
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
		mockBundle.triggerAssetAvailable(BASIC_ASSET_UUID, true);
		await assertRejects(async () => {
			await getAssetPromise;
		}, Error, `Unable to parse asset with uuid "${BASIC_ASSET_UUID}". Its type is not registered, register it first with AssetLoader.registerLoaderType().`);

		uninstall();
	},
});
