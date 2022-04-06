import {Importer} from "fake-imports";
import {assertStrictEquals} from "asserts";
import {castMock} from "./MockAssetBundle.js";
import {forceCleanup, installMockWeakRef, uninstallMockWeakRef} from "../../shared/mockWeakRef.js";

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

function basicSetup() {
	installMockWeakRef();
	const assetLoader = new AssetLoader();
	const loaderType = assetLoader.registerLoaderType(ExtendedAssetLoaderType);
	const asset = {label: "expected asset"};
	loaderType.setParseBufferReturn(asset);

	return {
		assetLoader,
		asset,
		loaderType,
		uninstall() {
			uninstallMockWeakRef();
		},
	};
}

Deno.test({
	name: "getting an asset",
	async fn() {
		const {assetLoader, asset: expectedAsset, uninstall} = basicSetup();
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
		const {assetLoader, asset: expectedAsset, loaderType, uninstall} = basicSetup();
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
		const {assetLoader, asset: expectedAsset1, loaderType, uninstall} = basicSetup();
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
		const {assetLoader, asset: expectedAsset1, loaderType, uninstall} = basicSetup();
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
