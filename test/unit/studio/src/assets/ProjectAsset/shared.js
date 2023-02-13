import {spy} from "std/testing/mock.ts";
import {ProjectAsset} from "../../../../../../studio/src/assets/ProjectAsset.js";
import {injectMockStudioInstance} from "../../../../../../studio/src/studioInstance.js";
import {MemoryEditorFileSystem} from "../../../../../../studio/src/util/fileSystems/MemoryEditorFileSystem.js";
import {createMockProjectAssetType} from "../../../shared/createMockProjectAssetType.js";
import {createMockProjectAssetTypeManager} from "../../../shared/createMockProjectAssetTypeManager.js";

export const BASIC_UUID = "00000000-0000-0000-0000-000000000000";
export const BASIC_PROJECTASSETTYPE = "test:basicassettype";
export const BASIC_ASSET_EXTENSION = "basicassetextension";
export const UNKNOWN_ASSET_EXTENSION = "unknownassetextension";

/**
 * @typedef GetMocksOptions
 * @property {boolean} [builtInAssetManagerAllowAssetEditingValue]
 */

/**
 * @param {GetMocksOptions} options
 */
export function getMocks({
	builtInAssetManagerAllowAssetEditingValue = false,
} = {}) {
	const mockAssetManager = /** @type {import("../../../../../../studio/src/assets/AssetManager.js").AssetManager} */ ({});

	const projectAssetTypeMocks = createMockProjectAssetType(BASIC_PROJECTASSETTYPE);

	const mockProjectAssetTypeManager = createMockProjectAssetTypeManager({
		BASIC_ASSET_EXTENSION, BASIC_PROJECTASSETTYPE,
		ProjectAssetType: projectAssetTypeMocks.ProjectAssetType,
	});

	const mockBuiltInAssetManager = /** @type {import("../../../../../../studio/src/assets/BuiltInAssetManager.js").BuiltInAssetManager} */ ({
		allowAssetEditing: builtInAssetManagerAllowAssetEditingValue,
	});

	const fileSystem = new MemoryEditorFileSystem();

	return {
		mockAssetManager,
		mockProjectAssetTypeManager,
		mockBuiltInAssetManager,
		fileSystem,
		...projectAssetTypeMocks,
		projectAssetArgs: /** @type {const} */ ([
			mockAssetManager,
			mockProjectAssetTypeManager,
			mockBuiltInAssetManager,
			fileSystem,
		]),
	};
}

/**
 * @template {boolean} [TIsKnown = true]
 * @param {object} options
 * @param {Partial<import("../../../../../../studio/src/assets/ProjectAsset.js").ProjectAssetOptions>} [options.extraProjectAssetOpts]
 * @param {GetMocksOptions} [options.mocksOptions]
 * @param {TIsKnown} [options.isKnownAssetType]
 * @param {boolean} [options.setMockEmbeddedParent]
 */
export function basicSetup({
	extraProjectAssetOpts,
	mocksOptions,
	isKnownAssetType = /** @type {TIsKnown} */ (true),
	setMockEmbeddedParent = false,
} = {}) {
	const mockEditor = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({});
	injectMockStudioInstance(mockEditor);

	const mocks = getMocks(mocksOptions);

	/**
	 * @param {string} persistenceKey
	 * @param {object} liveAsset
	 */
	function addEmbeddedChildLiveAssetFn(persistenceKey, liveAsset) {}
	const addEmbeddedChildLiveAssetSpy = spy(addEmbeddedChildLiveAssetFn);
	const mockParent = /** @type {import("../../../../../../studio/src/assets/ProjectAsset.js").ProjectAssetAny} */ ({
		addEmbeddedChildLiveAsset: /** @type {typeof addEmbeddedChildLiveAssetFn} */ (addEmbeddedChildLiveAssetSpy),
	});

	const extension = isKnownAssetType ? BASIC_ASSET_EXTENSION : UNKNOWN_ASSET_EXTENSION;
	const assetPath = ["path", "to", `asset.${extension}`];
	const projectAsset = new ProjectAsset(...mocks.projectAssetArgs, {
		uuid: BASIC_UUID,
		path: assetPath,
		embeddedParent: setMockEmbeddedParent ? mockParent : undefined,
		...extraProjectAssetOpts,
	});

	if (isKnownAssetType) {
		mocks.fileSystem.writeJson(assetPath, {
			assetType: BASIC_PROJECTASSETTYPE,
			asset: {
				num: 42,
				str: "defaultBasicAssetDiskString",
			},
		});
	}

	const castProjectAsset = /** @type {TIsKnown extends true ? ProjectAsset<import("../../../shared/createMockProjectAssetType.js").MockProjectAssetType> : import("../../../../../../studio/src/assets/ProjectAsset.js").ProjectAssetAny} */ (projectAsset);
	return {
		mocks,
		projectAsset: castProjectAsset,
		mockParent,
		addEmbeddedChildLiveAssetSpy,
		mockEditor,
		async uninstall() {
			await projectAsset.waitForInit();
			injectMockStudioInstance(null);
		},
	};
}
