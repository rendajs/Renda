/** @typedef {string & {}} ProjectAssetTypeIdentifier */

/** @typedef {ProjectAssetType<any, any, any>} ProjectAssetTypeAny */
/**
 * @template {any} TLiveAsset
 * @template {any} TEditorData
 * @template {ProjectAssetDiskData} TFileData
 * @typedef {new (...args: any) => ProjectAssetType<TLiveAsset, TEditorData, TFileData>} ProjectAssetTypeConstructor
 */
/** @typedef {ProjectAssetTypeConstructor<any, any, any>} ProjectAssetTypeConstructorAny */

/**
 * @template TLiveAsset
 * @template TEditorData
 * @typedef {Object} LiveAssetData
 * @property {TLiveAsset} [liveAsset]
 * @property {TEditorData} [editorData]
 */

/**
 * @typedef {LiveAssetData<any, any>} LiveAssetDataAny
 */

/** @typedef {Object | string | BlobPart} ProjectAssetDiskData */

/**
 * @template {any} TLiveAsset
 * @template {any} TEditorData
 * @template {ProjectAssetDiskData} TFileData
 */
export class ProjectAssetType {
	/**
	 * Identifier of the assetType. This is stored in various places
	 * such as the asset settings file or the wrapped editor meta data.
	 * This should have the format "namespace:assetType", for example: "JJ:mesh".
	 * @type {ProjectAssetTypeIdentifier}
	 */
	static type = null;

	/**
	 * This will be used for storing the asset type in asset bundles.
	 * This should have the format "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx".
	 * You can generate a uuid in the editor browser console using `Util.generateUuid()`.
	 * @type {import("../../../../src/util/mod.js").UuidString}
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

	static storeInProjectAsJson = true;
	static storeInProjectAsText = false;

	/**
	 * Whether the assetdata from {@linkcode saveLiveAssetData} gets wrapped
	 * in a json object that contains extra editor metadata.
	 * @type {boolean}
	 */
	static wrapProjectJsonWithEditorMetaData = true;

	/** @typedef {import("../../UI/PropertiesTreeView/PropertiesTreeView.js").PropertiesTreeView} PropertiesTreeView */
	/**
	 * The properties window will show ui generated from this structure.
	 * This object will be fed into {@linkcode PropertiesTreeView.generateFromSerializableStructure}.
	 * Leave this as null if you don't want to show any ui or if you want to create
	 * custom ui using {@linkcode propertiesAssetContentConstructor}.
	 * @type {import("../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure}
	 */
	static propertiesAssetContentStructure = null;

	/** @typedef {import("../../PropertiesWindowContent/PropertiesAssetContent/PropertiesAssetContent.js").PropertiesAssetContent} PropertiesAssetContent */
	/**
	 * If you want more control over ui rendering in the properties window,
	 * you can set this to the constructor of an extended {@linkcode PropertiesAssetContent} class.
	 */
	static propertiesAssetContentConstructor = null;

	/**
	 * Fill this with asset settings you want to appear in the properties window.
	 * @type {import("../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure}
	 */
	static assetSettingsStructure = {};

	/* eslint-disable jsdoc/no-undefined-types */
	/** @typedef {import("../ProjectAsset.js").ProjectAsset<ProjectAssetType<TLiveAsset, TEditorData, TFileData>>} ProjectAsset */
	/* eslint-enable jsdoc/no-undefined-types */
	/**
	 * @param {import("../../Editor.js").Editor} editorInstance
	 * @param {ProjectAsset} projectAsset
	 * @param {import("../AssetManager.js").AssetManager} projectAssetTypeManager
	 * @param {import("../ProjectAssetTypeManager.js").ProjectAssetTypeManager} assetTypeManager
	 */
	constructor(editorInstance, projectAsset, projectAssetTypeManager, assetTypeManager) {
		this.editorInstance = editorInstance;
		/**
		 * You can use this in any of the hook methods of a ProjectAssetType.
		 * If you need access to the path or uuid of an asset for instance.
		 */
		this.projectAsset = projectAsset;
		this.assetManager = projectAssetTypeManager;
		this.projectAssetTypeManager = assetTypeManager;

		this.boundLiveAssetNeedsReplacement = this.liveAssetNeedsReplacement.bind(this);
		this.usedLiveAssets = new Set();
	}

	/**
	 * This will be called when a new file of this type is created
	 * the returned value will be passed along to {@linkcode saveLiveAssetData}.
	 * @returns {Promise<LiveAssetData<TLiveAsset, TEditorData>>}
	 */
	async createNewLiveAssetData() {
		return {liveAsset: null, editorData: null};
	}

	/**
	 * This is used to find out if a specific class could be stored as an asset,
	 * when dragging assets to a DroppableGui for instance.
	 * Set this to the constructor of the type that you expect to return in getLiveAsset().
	 * For example, if getLiveAsset() returns a `new Material()`, this value
	 * should be set to `Material` (without new).
	 * If you don't plan on adding support for loading this asset type at runtime,
	 * you can safely ommit this.
	 */
	static expectedLiveAssetConstructor = null;

	/**
	 * If you plan on supporting loading live assets in the editor,
	 * return your liveasset instance and editorData here.
	 * This it guaranteed to not get called if a liveAssets already exists,
	 * i.e. It is only called twice if destroyLiveAssetData gets called first.
	 * Both `editorData` and `liveAsset` are optional.
	 * `editorData` will be passed back to {@linkcode saveLiveAssetData}.
	 * You can use this to store extra data that can be manipulated by the editor.
	 * Editor data is useful for storing info that is not necessary in assetbundle exports.
	 * @param {TFileData} fileData
	 * @param {import("../LiveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 * @returns {Promise<LiveAssetData<TLiveAsset, TEditorData>>}
	 */
	async getLiveAssetData(fileData, recursionTracker) {
		return {liveAsset: null};
	}

	/**
	 * Use this to store a liveasset instance in the project folder
	 * the return value will be passed on to {@linkcode ProjectAsset.writeAssetData} so depending
	 * on your configuration you can return a json object, DOMString, or binary data.
	 * @param {*} liveAsset
	 * @param {*} editorData
	 * @returns {Promise<TFileData>}
	 */
	async saveLiveAssetData(liveAsset, editorData) {
		return null;
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
	 * @param {T} projectAsset
	 */
	listenForUsedLiveAssetChanges(projectAsset) {
		if (!projectAsset) return;
		this.usedLiveAssets.add(projectAsset);
		projectAsset.onNewLiveAssetInstance(this.boundLiveAssetNeedsReplacement);
	}

	/**
	 * Gets called when a liveAsset is no longer needed.
	 * You can override this for custom asset destruction.
	 * @param {*} liveAsset
	 * @param {*} editorData
	 */
	destroyLiveAssetData(liveAsset, editorData) {
		liveAsset.destructor?.();
		for (const projectAsset of this.usedLiveAssets) {
			projectAsset.removeOnNewLiveAssetInstance(this.boundLiveAssetNeedsReplacement);
		}
	}

	/**
	 * If this asset is a file that can be opened, open it
	 * either in the editor or in an external application.
	 * @param {import("../../windowManagement/WindowManager.js").WindowManager} windowManager
	 */
	async open(windowManager) {}

	/** @typedef {import("../../../../src/Assets/AssetLoaderTypes/AssetLoaderTypeGenericStructure.js").AssetLoaderTypeGenericStructure} AssetLoaderTypeGenericStructure */
	/** @typedef {import("../../../../src/util/BinaryComposer.js").BinaryComposer} BinaryComposer */
	/**
	 * If your asset loader extends {@linkcode AssetLoaderTypeGenericStructure}
	 * you don't need to implement {@linkcode createBundledAssetData}.
	 * The structure values of the AssetLoaderType will be passed on to
	 * {@linkcode BinaryComposer.objectToBinary} instead.
	 * @type {typeof import("../../../../src/mod.js").AssetLoaderType?}
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
	 * If `usedAssetLoaderType` has been set to an instance of `AssetLoaderTypeGenericStructure`,
	 * the references from its structure values, will automatically be collected as well.
	 * @returns {AsyncGenerator<string>}
	 */
	async *getReferencedAssetUuids() {}

	/**
	 * Used internally to log a message with a stacktrace that leads
	 * to this file.
	 * @param {string} message
	 */
	static invalidConfigurationWarning(message) {
		console.warn(message + "\nView ProjectAssetType.js for more info.");
	}
}
