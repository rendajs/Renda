import {spy} from "std/testing/mock.ts";
import {ProjectAsset} from "../../../../../../editor/src/assets/ProjectAsset.js";
import {DroppableGui} from "../../../../../../editor/src/ui/DroppableGui.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {FakeMouseEvent} from "fake-dom/FakeMouseEvent.js";
import {waitForMicrotasks} from "../../../../shared/waitForMicroTasks.js";
import {injectMockEditorInstance} from "../../../../../../editor/src/editorInstance.js";

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
 * @param {Object} options
 * @param {import("../../../../../../src/mod.js").UuidString} [options.uuid]
 * @param {object?} [options.mockLiveAsset]
 * @param {boolean} [options.isEmbedded]
 * @param {boolean} [options.needsLiveAssetPreload] Set to true if you want getLiveAssetSync() to behave
 * like the real ProjectAsset.
 */
export function createMockProjectAsset({
	uuid = BASIC_ASSET_UUID,
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
		uuid,
		fileName: "assetName.json",
		getLiveAssetSync() {
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
 * @param {boolean} [options.needsLiveAssetPreload] Set to true if you want getLiveAssetSync() to behave like the real ProjectAsset.
 * @param {PermissionState} [options.clipboardReadPermissionState] The permission state returned by navigator.permissions.query() for "clipboard-read".
 * @param {string} [options.clipboardReadTextReturn] The string returned by navigator.clipboard.readText().
 */
export function createBasicGui({
	valueType = "basic",
	extraMocks = {},
	guiOpts = {},
	liveAssetProjectAssetTypeCombinations = [],
	needsLiveAssetPreload = true,
	clipboardReadPermissionState = "granted",
	clipboardReadTextReturn = "",
} = {}) {
	installFakeDocument();

	const mockLiveAsset = {};

	const mockProjectAsset = createMockProjectAsset({mockLiveAsset, needsLiveAssetPreload});

	const mockDefaultAssetLink = /** @type {import("../../../../../../editor/src/assets/DefaultAssetLink.js").DefaultAssetLink} */ ({});

	const oldPermisisons = navigator.permissions;
	const stubPermissions = /** @type {Permissions} */ ({
		async query(options) {
			return {
				state: clipboardReadPermissionState,
			};
		},
	});
	// @ts-expect-error
	navigator.permissions = stubPermissions;

	const oldClipboard = navigator.clipboard;
	const stubClipboard = /** @type {Clipboard} */ ({
		async readText() {
			return clipboardReadTextReturn;
		},
	});
	// @ts-expect-error
	navigator.clipboard = stubClipboard;

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

	/** @type {Map<import("../../../../../../src/mod.js").UuidString, ProjectAsset<any>>} */
	const projectAssets = new Map();
	projectAssets.set(BASIC_ASSET_UUID, mockProjectAsset);
	projectAssets.set(DEFAULTASSETLINK_LINK_UUID, mockProjectAsset);

	const mockAssetManager = /** @type {import("../../../../../../editor/src/assets/AssetManager.js").AssetManager} */ ({
		getDefaultAssetLink(uuid) {
			if (uuid == DEFAULTASSETLINK_LINK_UUID) {
				return mockDefaultAssetLink;
			}
			return null;
		},
		getProjectAssetFromUuidSync(uuid) {
			if (!uuid) return null;
			return projectAssets.get(uuid) || null;
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
		assetManager: mockAssetManager,
	});

	const mockDragManager = /** @type {import("../../../../../../editor/src/misc/DragManager.js").DragManager} */ ({
		getDraggingData(uuid) {},
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

	const mockContextMenuManager = /** @type {import("../../../../../../editor/src/ui/contextMenus/ContextMenuManager.js").ContextMenuManager} */ ({});

	/** @type {import("../../../../../../editor/src/ui/DroppableGui.js").DroppableGuiDependencies} */
	const dependencies = {
		projectManager: mockProjectManager,
		dragManager: mockDragManager,
		windowManager: mockWindowManager,
		contextMenuManager: mockContextMenuManager,
		projectAssetTypeManager: mockProjectAssetTypeManager,
		...extraMocks,
	};

	const mockEditor = /** @type {import("../../../../../../editor/src/Editor.js").Editor} */ ({
		projectManager: mockProjectManager,
		dragManager: mockDragManager,
		windowManager: mockWindowManager,
		contextMenuManager: mockContextMenuManager,
		projectAssetTypeManager: mockProjectAssetTypeManager,
	});
	injectMockEditorInstance(mockEditor);

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
		mockEditor,
		mockDefaultAssetLink,
		mockLiveAsset,
		mockProjectAsset,
		mockDragManager,
		mockWindowManager,
		createEmbeddedAssetSpy,
		getProjectAssetFromUuidOrEmbeddedAssetDataSyncSpy,
		/**
		 * @param {import("../../../../../../src/mod.js").UuidString} uuid
		 * @param {ProjectAsset<any>} projectAsset
		 */
		addMockProjectAsset(uuid, projectAsset) {
			projectAssets.set(uuid, projectAsset);
		},
		uninstall() {
			uninstallFakeDocument();
			// @ts-expect-error
			navigator.permissions = oldPermisisons;
			// @ts-expect-error
			navigator.clipboard = oldClipboard;
			injectMockEditorInstance(null);
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
 * @param {Object} options
 * @param {Parameters<typeof createBasicGui>[0]} [options.basicGuiOptions]
 * @param {boolean} [options.dispatchContextMenuEvent]
 */
export async function basicSetupForContextMenus({
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

	async function dispatchContextMenuEventFn() {
		returnValue.gui.el.dispatchEvent(new FakeMouseEvent("contextmenu"));
		await waitForMicrotasks();
	}
	if (dispatchContextMenuEvent) {
		await dispatchContextMenuEventFn();
	}

	return {
		...returnValue,
		createContextMenuCalls,
		dispatchContextMenuEvent: dispatchContextMenuEventFn,
	};
}
