import {spy} from "std/testing/mock";
import {ProjectAsset} from "../../../../../../editor/src/assets/ProjectAsset.js";
import {DroppableGui} from "../../../../../../editor/src/ui/DroppableGui.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {FakeMouseEvent} from "fake-dom/FakeMouseEvent.js";

export const BASIC_ASSET_UUID = "BASIC_ASSET_UUID";
export const DEFAULTASSETLINK_LINK_UUID = "DEFAULTASSETLINK_LINK_UUID";

/** @type {unknown[]} */
const mockProjectAssetInstances = [];

let didApplyProjectAssetInstanceOf = false;
export function applyProjectAssetInstanceOf() {
	if (didApplyProjectAssetInstanceOf) return;
	didApplyProjectAssetInstanceOf = true;

	Object.defineProperty(ProjectAsset, Symbol.hasInstance, {
		/**
		 * @param {unknown} instance
		 */
		value: instance => {
			return mockProjectAssetInstances.includes(instance);
		},
	});
}

/**
 * @param {Object} [options]
 * @param {object?} [options.mockLiveAsset]
 * @param {boolean} [options.isEmbedded]
 * @param {boolean} [options.needsLiveAssetPreload] Set to true if you want getLiveAssetImmediate() to behave
 * like the real ProjectAsset.
 */
export function createMockProjectAsset({
	mockLiveAsset = {},
	isEmbedded = false,
	needsLiveAssetPreload = true,
} = {}) {
	let asyncGetLiveAssetCalled = false;
	const mockProjectAsset = /** @type {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAsset<any>} */ ({
		isEmbedded,
		async getIsDeleted() {
			return false;
		},
		uuid: BASIC_ASSET_UUID,
		fileName: "assetName.json",
		getLiveAssetImmediate() {
			// The real ProjectAsset doesn't return a live asset immediately, only after
			// a call has been made to getLiveAssetData.
			if (!asyncGetLiveAssetCalled && needsLiveAssetPreload) {
				return null;
			}
			return mockLiveAsset;
		},
		async getLiveAsset() {
			asyncGetLiveAssetCalled = true;
			return mockLiveAsset;
		},
		readEmbeddedAssetData() {
			return {
				num: 42,
				str: "foo",
			};
		},
	});

	// Add the instance to the mock instances list so that the `instanceof ProjectAsset` check in the DroppableGui still works.
	mockProjectAssetInstances.push(mockProjectAsset);
	applyProjectAssetInstanceOf();

	return mockProjectAsset;
}

/**
 * @param {Object} options
 * @param {"basic" | "defaultAssetLink" | "embedded" | "none"} [options.valueType]
 * @param {Partial<import("../../../../../../editor/src/ui/DroppableGui.js").DroppableGuiDependencies>} [options.extraMocks]
 * @param {Partial<import("../../../../../../editor/src/ui/DroppableGui.js").DroppableGuiOptions<any>>} [options.guiOpts]
 * @param {Iterable<[(new (...args: any) => any), Iterable<typeof import("../../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetType>]>} [options.liveAssetProjectAssetTypeCombinations] The list of Project assets that should be returned for a call to ProjectAssetTypeManager.getAssetTypesForLiveAssetConstructor().
 * @param {boolean} [options.needsLiveAssetPreload] Set to true if you want getLiveAssetImmediate() to behave like the real ProjectAsset.
 */
export function createBasicGui({
	valueType = "basic", extraMocks = {}, guiOpts = {}, liveAssetProjectAssetTypeCombinations = [], needsLiveAssetPreload = true,
} = {}) {
	installFakeDocument();

	const mockLiveAsset = {};

	const mockProjectAsset = createMockProjectAsset({mockLiveAsset, needsLiveAssetPreload});

	const mockDefaultAssetLink = /** @type {import("../../../../../../editor/src/assets/DefaultAssetLink.js").DefaultAssetLink} */ ({});

	/**
	 * @param {import("../../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeIdentifier | typeof import("../../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetType} assetType
	 * @param {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAssetAny} parent
	 * @param {string} persistenceKey
	 */
	function createEmbeddedAssetFn(assetType, parent, persistenceKey) {
		return createMockProjectAsset({
			mockLiveAsset,
			isEmbedded: true,
			needsLiveAssetPreload,
		});
	}
	const createEmbeddedAssetSpy = spy(createEmbeddedAssetFn);

	/**
	 *
	 * @param {import("../../../../../../src/mod.js").UuidString | object | null | undefined} uuidOrData
	 * @param {import("../../../../../../editor/src/assets/AssetManager.js").GetLiveAssetFromUuidOrEmbeddedAssetDataOptions} options
	 */
	function getProjectAssetFromUuidOrEmbeddedAssetDataSyncFn(uuidOrData, options) {
		return createMockProjectAsset({
			mockLiveAsset,
			isEmbedded: true,
			needsLiveAssetPreload,
		});
	}
	const getProjectAssetFromUuidOrEmbeddedAssetDataSyncSpy = spy(getProjectAssetFromUuidOrEmbeddedAssetDataSyncFn);

	const mockAssetManager = /** @type {import("../../../../../../editor/src/assets/AssetManager.js").AssetManager} */ ({
		getDefaultAssetLink(uuid) {
			if (uuid == DEFAULTASSETLINK_LINK_UUID) {
				return mockDefaultAssetLink;
			}
			return null;
		},
		getProjectAssetImmediate(uuid) {
			if (uuid == BASIC_ASSET_UUID) {
				return mockProjectAsset;
			} else if (uuid == DEFAULTASSETLINK_LINK_UUID) {
				return mockProjectAsset;
			}
			return null;
		},
		getProjectAssetForLiveAsset(liveAsset) {
			if (liveAsset == mockLiveAsset) {
				return mockProjectAsset;
			}
			return null;
		},
		createEmbeddedAsset: /** @type {typeof createEmbeddedAssetFn} */ (createEmbeddedAssetSpy),
		getProjectAssetFromUuidOrEmbeddedAssetDataSync: /** @type {typeof getProjectAssetFromUuidOrEmbeddedAssetDataSyncFn} */ (getProjectAssetFromUuidOrEmbeddedAssetDataSyncSpy),
	});

	const mockProjectManager = /** @type {import("../../../../../../editor/src/projectSelector/ProjectManager.js").ProjectManager} */ ({
		assertAssetManagerExists() {
			return mockAssetManager;
		},
	});

	const mockWindowManager = /** @type {import("../../../../../../editor/src/windowManagement/WindowManager.js").WindowManager} */ ({});

	const liveAssetProjectAssetTypes = new Map(liveAssetProjectAssetTypeCombinations);
	const mockProjectAssetTypeManager = /** @type {import("../../../../../../editor/src/assets/ProjectAssetTypeManager.js").ProjectAssetTypeManager} */ ({
		*getAssetTypesForLiveAssetConstructor(constructor) {
			const assetTypes = liveAssetProjectAssetTypes.get(constructor);
			if (assetTypes) {
				yield* assetTypes;
			}
		},
	});

	/** @type {import("../../../../../../editor/src/ui/DroppableGui.js").DroppableGuiDependencies} */
	const dependencies = {
		projectManager: mockProjectManager,
		dragManager: /** @type {import("../../../../../../editor/src/misc/DragManager.js").DragManager} */ ({}),
		windowManager: mockWindowManager,
		contextMenuManager: /** @type {import("../../../../../../editor/src/ui/contextMenus/ContextMenuManager.js").ContextMenuManager} */ ({}),
		projectAssetTypeManager: mockProjectAssetTypeManager,
		...extraMocks,
	};

	const gui = DroppableGui.of({
		dependencies,
		...guiOpts,
	});
	if (valueType == "basic") {
		gui.setValue(BASIC_ASSET_UUID);
	} else if (valueType == "defaultAssetLink") {
		gui.setValue(DEFAULTASSETLINK_LINK_UUID);
	} else if (valueType == "embedded") {
		const projectAsset = createMockProjectAsset({
			mockLiveAsset,
			isEmbedded: true,
			needsLiveAssetPreload,
		});
		gui.setValue(projectAsset);
	}
	return {
		gui,
		mockDefaultAssetLink,
		mockLiveAsset,
		mockProjectAsset,
		mockWindowManager,
		createEmbeddedAssetSpy,
		getProjectAssetFromUuidOrEmbeddedAssetDataSyncSpy,
		uninstall() {
			uninstallFakeDocument();
		},
	};
}

export function createMockProjectAssetType({
	type = "namespace:type", uiCreateName = "Mock Project Asset",
} = {}) {
	class MockLiveAssetConstructor { }

	class MockProjectAssetType {
		static type = type;
		static expectedLiveAssetConstructor = MockLiveAssetConstructor;
		static uiCreateName = uiCreateName;
	}

	const cast1 = /** @type {unknown} */ (MockProjectAssetType);
	const cast2 = /** @type {typeof import("../../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetType} */ (cast1);

	return {
		MockLiveAssetConstructor,
		MockProjectAssetType,
		ProjectAssetType: cast2,
	};
}

/**
 * @param {Object} [options]
 * @param {Parameters<typeof createBasicGui>[0]} [options.basicGuiOptions]
 * @param {boolean} [options.dispatchContextMenuEvent]
 */
export function basicSetupForContextMenus({
	basicGuiOptions = {},
	dispatchContextMenuEvent = true,
} = {}) {
	/** @type {(import("../../../../../../editor/src/ui/contextMenus/ContextMenu.js").ContextMenuStructure?)[]} */
	const createContextMenuCalls = [];
	const mockContextMenuManager = /** @type {import("../../../../../../editor/src/ui/contextMenus/ContextMenuManager.js").ContextMenuManager} */ ({
		createContextMenu(structure = null) {
			createContextMenuCalls.push(structure);
			return {
				setPos(options) {},
			};
		},
	});
	const returnValue = createBasicGui({
		...basicGuiOptions,
		extraMocks: {
			contextMenuManager: mockContextMenuManager,
		},
	});

	function dispatchContextMenuEventFn() {
		returnValue.gui.el.dispatchEvent(new FakeMouseEvent("contextmenu"));
	}
	if (dispatchContextMenuEvent) {
		dispatchContextMenuEventFn();
	}

	return {
		...returnValue,
		createContextMenuCalls,
		dispatchContextMenuEvent: dispatchContextMenuEventFn,
	};
}
