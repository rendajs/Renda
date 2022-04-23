/** @typedef {string & {}} ProjectAssetTypeIdentifier */

import {ContentWindowProperties} from "../../windowManagement/contentWindows/ContentWindowProperties.js";

/** @typedef {ProjectAssetType<any, any, any, any>} ProjectAssetTypeAny */
/** @typedef {ProjectAssetType<unknown, unknown, object, unknown>} ProjectAssetTypeUnknown */
/**
 * @template {any} TLiveAsset
 * @template {any} TEditorData
 * @template {ProjectAssetDiskDataType} TFileData
 * @template {any} [TAssetSettings = null]
 * @typedef {new (...args: any) => ProjectAssetType<TLiveAsset, TEditorData, TFileData, TAssetSettings>} ProjectAssetTypeConstructor
 */
/** @typedef {ProjectAssetTypeConstructor<any, any, any, any>} ProjectAssetTypeConstructorAny */

/** @typedef {[import("../../Editor.js").Editor, import("../ProjectAsset.js").ProjectAssetAny, import("../AssetManager.js").AssetManager, import("../ProjectAssetTypeManager.js").ProjectAssetTypeManager]} ProjectAssetTypeConstructorParametersAny */

/**
 * @template TLiveAsset
 * @template TEditorData
 * @typedef {Object} LiveAssetData
 * @property {TLiveAsset} liveAsset
 * @property {TEditorData} editorData
 */

/**
 * @typedef {LiveAssetData<any, any>} LiveAssetDataAny
 */

/** @typedef {Object | string | "binary"} ProjectAssetDiskDataType */

/**
 * ProjectAssetTypes are classes that are extended and implemented by different
 * types of assets. It is intended to configure behaviour like parsing data
 * before reading/writing to disk and creating live assets among other things.
 *
 * If all you want to do is create an asset type that stores basic data with
 * basic properties ui, see `WebGpuPipelineConfigProjectAssetType` for a good
 * example on how to do this.
 *
 * For a more complicated example, see `MaterialProjectAssetType`.
 *
 * If you want an asset that is not a live asset, but only available in the
 * editor, have a look at `AssetBundleProjectAssetType`. It only configures
 * a minimal amount. Most of it is implemented in its
 * `propertiesAssetContentConstructor`.
 *
 * Live assets should have the same type as what is created by AssetLoaderTypes
 * when running a project. If you want to add extra properties to live assets,
 * it is recommended to do so using symbols.
 *
 * New instances of this class are generally instantiated at {@linkcode ProjectAsset.init}.
 * @template {any} TLiveAsset
 * @template {any} TEditorData
 * @template {ProjectAssetDiskDataType} TFileData
 * @template {any} [TAssetSettings = null]
 */
export class ProjectAssetType {
	/**
	 * Identifier of the assetType. This is stored in various places
	 * such as the asset settings file or the wrapped editor meta data.
	 * This should have the format "namespace:assetType", for example: "JJ:mesh".
	 * @type {ProjectAssetTypeIdentifier}
	 */
	static type = "";

	/**
	 * This will be used for storing the asset type in asset bundles.
	 * This should have the format "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx".
	 * You can generate a uuid in the editor browser console using `Util.generateUuid()`.
	 * @type {import("../../../../src/util/mod.js").UuidString?}
	 */
	static typeUuid = null;

	/**
	 * This is used to find out what type an asset is when it isn't json.
	 * If this value is omitted and storeInProjectAsJson is false,
	 * {@linkcode newFileExtension} will be used instead.
	 * @type {string[]}
	 */
	static matchExtensions = [];

	/**
	 * Filename used when creating new assets of this type.
	 * @type {string}
	 */
	static newFileName = "New Asset";

	/**
	 * Extension used when creating new assets of this type.
	 * @type {string}
	 */
	static newFileExtension = "json";

	/**
	 * The text that is shown in ui when choosing from a list of asset types
	 * when creating a new asset.
	 */
	static uiCreateName = "";

	static storeInProjectAsJson = true;
	static storeInProjectAsText = false;

	/**
	 * Whether the assetdata from {@linkcode saveLiveAssetData} gets wrapped
	 * in a json object that contains extra editor metadata.
	 * @type {boolean}
	 */
	static wrapProjectJsonWithEditorMetaData = true;

	/** @typedef {import("../../ui/propertiesTreeView/PropertiesTreeView.js").PropertiesTreeView} PropertiesTreeView */
	/**
	 * The properties window will show ui generated from this structure.
	 * This object will be fed into {@linkcode PropertiesTreeView.generateFromSerializableStructure}.
	 * Leave this as null if you don't want to show any ui or if you want to create
	 * custom ui using {@linkcode propertiesAssetContentConstructor}.
	 * @type {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure?}
	 */
	static propertiesAssetContentStructure = null;

	/** @typedef {import("../../propertiesWindowContent/PropertiesAssetContent/PropertiesAssetContent.js").PropertiesAssetContent<any>} PropertiesAssetContent */
	/**
	 * If you want more control over ui rendering in the properties window,
	 * you can set this to the constructor of an extended {@linkcode PropertiesAssetContent} class.
	 * @type {(new (...args: any) => import("../../propertiesWindowContent/PropertiesAssetContent/PropertiesAssetContent.js").PropertiesAssetContent<any>)?}
	 */
	static propertiesAssetContentConstructor = null;

	/**
	 * Fill this with asset settings you want to appear in the properties window.
	 * @type {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure}
	 */
	static assetSettingsStructure = {};

	/** @typedef {import("../ProjectAsset.js").ProjectAsset<ProjectAssetType<TLiveAsset, TEditorData, TFileData, TAssetSettings>>} ProjectAsset */

	/**
	 * @param {import("../../Editor.js").Editor} editorInstance
	 * @param {ProjectAsset} projectAsset
	 * @param {import("../AssetManager.js").AssetManager} assetManager
	 * @param {import("../ProjectAssetTypeManager.js").ProjectAssetTypeManager} assetTypeManager
	 */
	constructor(editorInstance, projectAsset, assetManager, assetTypeManager) {
		this.editorInstance = editorInstance;
		/**
		 * You can use this in any of the hook methods of a ProjectAssetType.
		 * If you need access to the path or uuid of an asset for instance.
		 */
		this.projectAsset = projectAsset;
		this.assetManager = assetManager;
		this.projectAssetTypeManager = assetTypeManager;

		this.boundLiveAssetNeedsReplacement = this.liveAssetNeedsReplacement.bind(this);
		/** @type {Set<ProjectAsset>} */
		this.usedLiveAssets = new Set();
	}

	/**
	 * This will be called when a new file of this type is created
	 * the returned value will be passed along to {@linkcode saveLiveAssetData}.
	 * @returns {Promise<LiveAssetData<TLiveAsset, TEditorData>>}
	 */
	async createNewLiveAssetData() {
		return {
			liveAsset: /** @type {TLiveAsset} */ (null),
			editorData: /** @type {TEditorData} */ (null),
		};
	}

	/**
	 * This is used to find out if a specific class could be stored as an asset,
	 * when dragging assets to a DroppableGui for instance.
	 * Set this to the constructor of the type that you expect to return in getLiveAsset().
	 * For example, if getLiveAsset() returns a `new Material()`, this value
	 * should be set to `Material` (without new).
	 * If you don't plan on adding support for loading this asset type at runtime,
	 * you can safely ommit this.
	 * @type {(new (...args: any) => any)?}
	 */
	static expectedLiveAssetConstructor = null;

	/** @typedef {TFileData extends "binary" ? Blob : TFileData} TGetFileData */
	/** @typedef {TFileData extends "binary" ? BlobPart : TFileData} TSaveFileData */

	/**
	 * If you plan on supporting loading live assets in the editor,
	 * return your liveasset instance and editorData here.
	 * This it guaranteed to not get called if a liveAssets already exists,
	 * i.e. It is only called twice if destroyLiveAssetData gets called first.
	 * Both `editorData` and `liveAsset` are optional.
	 * `editorData` will be passed back to {@linkcode saveLiveAssetData}.
	 * You can use this to store extra data that can be manipulated by the editor.
	 * Editor data is useful for storing info that is not necessary in assetbundle exports.
	 * @param {TGetFileData?} fileData The result returned from {@linkcode ProjectAsset.readAssetData}.
	 * @param {import("../liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 * @returns {Promise<LiveAssetData<TLiveAsset, TEditorData>>}
	 */
	async getLiveAssetData(fileData, recursionTracker) {
		return {
			liveAsset: /** @type {TLiveAsset} */ (null),
			editorData: /** @type {TEditorData} */ (null),
		};
	}

	/**
	 * Use this to store a liveasset instance in the project folder
	 * the return value will be passed on to {@linkcode ProjectAsset.writeAssetData} so depending
	 * on your configuration you can return a json object, DOMString, or binary data.
	 * @param {*} liveAsset
	 * @param {*} editorData
	 * @returns {Promise<TSaveFileData?>}
	 */
	async saveLiveAssetData(liveAsset, editorData) {
		throw new Error(`"${this.constructor.name}" hasn't implemented saveLiveAssetData(). If you're trying to save an embedded asset, this is only supported if all of its parent assets implement saveLiveAssetData().`);
	}

	/**
	 * This gets called when the file is changed on disk by an external program.
	 * By default this calls `liveAssetNeedsReplacement()` but you can optionally
	 * override this and reconfigure the current liveAsset manually without creating
	 * a new instance. This might be more efficient if the live asset is used in a lot
	 * of places, or if a new instance sets of a big chain of liveAsset replacements.
	 */
	async fileChangedExternally() {
		this.liveAssetNeedsReplacement();
	}

	/**
	 * Destroys all current live asset data, informing any objects
	 * that are holding an instance of the liveAsset that they should
	 * request a new instance.
	 */
	liveAssetNeedsReplacement() {
		this.projectAsset.liveAssetNeedsReplacement();
	}

	/**
	 * You can use this to automacally listen for changes in other projectAsset.
	 * If any of the registered liveAssets get replaced, the liveAsset
	 * of this ProjectAsset automatically gets destroyed and recreated.
	 * @template {import("../ProjectAsset.js").ProjectAsset<any>} T
	 * @param {T?} projectAsset
	 */
	listenForUsedLiveAssetChanges(projectAsset) {
		if (!projectAsset) return;
		this.usedLiveAssets.add(projectAsset);
		projectAsset.onLiveAssetNeedsReplacement(this.boundLiveAssetNeedsReplacement);
	}

	/**
	 * Gets called when a liveAsset is no longer needed.
	 * You can override this for custom asset destruction.
	 * @param {*} liveAsset
	 * @param {*} editorData
	 */
	destroyLiveAssetData(liveAsset = null, editorData = null) {
		liveAsset?.destructor?.();
		for (const projectAsset of this.usedLiveAssets) {
			projectAsset.removeOnLiveAssetNeedsReplacement(this.boundLiveAssetNeedsReplacement);
		}
	}

	/**
	 * If this asset is a file that can be opened, open it
	 * either in the editor or in an external application.
	 * @param {import("../../windowManagement/WindowManager.js").WindowManager} windowManager
	 */
	async open(windowManager) {
		const propertiesWindow = windowManager.getMostSuitableContentWindowByConstructor(ContentWindowProperties);
		if (propertiesWindow) {
			propertiesWindow.setActiveObjects([this.projectAsset]);
		}
	}

	/** @typedef {import("../../../../src/assets/assetLoaderTypes/AssetLoaderTypeGenericStructure.js").AssetLoaderTypeGenericStructure<any>} AssetLoaderTypeGenericStructure */
	/** @typedef {import("../../../../src/util/binarySerialization.js").objectToBinary} objectToBinary */
	/**
	 * If your asset loader extends {@linkcode AssetLoaderTypeGenericStructure}
	 * you don't need to implement {@linkcode createBundledAssetData}.
	 * The structure values of the AssetLoaderType will be passed on to
	 * {@linkcode objectToBinary} instead.
	 * @type {(new (...args: any) => import("../../../../src/mod.js").AssetLoaderType)?}
	 */
	static usedAssetLoaderType = null;

	/**
	 * This method is called when creating asset bundles,
	 * this is optional when `usedAssetLoaderType` is set.
	 * You can use this.projectAsset to generate the binary data, {@link ProjectAsset.readAssetData}
	 * or {@link ProjectAsset.getLiveAssetData} for example.
	 * AssetSettingOverrides are changes made to the asset settings from the
	 * assetbundle that is being generated.
	 * If this function returns null or undefined, the raw
	 * asset data as it is stored in the project will be used
	 * which could be very inefficient.
	 * @param {Object} assetSettingOverrides
	 * @returns {Promise<null | BufferSource | Blob | string>}
	 */
	async createBundledAssetData(assetSettingOverrides = {}) {
		return null;
	}

	/**
	 * This should yield all asset uuids that are referenced by this asset, this will be
	 * used for determining what other assets should be included in a bundle recursively.
	 * Embedded assets don't need to be included here since they don't have an uuid. They'll
	 * be included in the assetbundle automatically.
	 * If `usedAssetLoaderType` has been set to an instance of `AssetLoaderTypeGenericStructure`,
	 * the references from its structure values, will automatically be collected as well.
	 * @returns {AsyncGenerator<string>}
	 */
	async *getReferencedAssetUuids() {}
}
