import {spy, stub} from "std/testing/mock.ts";
import {ProjectAsset} from "../../../../../../studio/src/assets/ProjectAsset.js";
import {DroppableGui} from "../../../../../../studio/src/ui/DroppableGui.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {HtmlElement} from "fake-dom/FakeHtmlElement.js";
import {FakeMouseEvent} from "fake-dom/FakeMouseEvent.js";
import {FocusEvent} from "fake-dom/FakeFocusEvent.js";
import {waitForMicrotasks} from "../../../../shared/waitForMicroTasks.js";
import {injectMockStudioInstance} from "../../../../../../studio/src/studioInstance.js";
import {assertContextMenuStructureContains, assertContextMenuStructureNotContainsText, triggerContextMenuItem} from "../../../shared/contextMenuHelpers.js";
import {ClipboardEvent} from "fake-dom/FakeClipboardEvent.js";
import {assertExists} from "std/testing/asserts.ts";
import {createMockProjectAsset} from "../../../shared/createMockProjectAsset.js";

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
 * @param {object} options
 * @param {import("../../../../../../src/mod.js").UuidString} [options.uuid]
 * @param {object?} [options.mockLiveAsset]
 * @param {boolean} [options.isEmbedded]
 * @param {boolean} [options.needsLiveAssetPreload] Set to true if you want getLiveAssetSync() to behave
 * like the real ProjectAsset.
 */
export function createMockDroppableProjectAsset({
	uuid = BASIC_ASSET_UUID,
	mockLiveAsset = {},
	isEmbedded = false,
	needsLiveAssetPreload = true,
} = {}) {
	let asyncGetLiveAssetCalled = false;
	const mockProjectAsset = /** @type {import("../../../../../../studio/src/assets/ProjectAsset.js").ProjectAsset<any>} */ ({
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
 * @param {object} options
 * @param {"basic" | "defaultAssetLink" | "embedded" | "none"} [options.valueType]
 * @param {Partial<import("../../../../../../studio/src/ui/DroppableGui.js").DroppableGuiOptions<any>>} [options.guiOpts]
 * @param {Iterable<[(new (...args: any) => any), Iterable<typeof import("../../../../../../studio/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetType>]>} [options.liveAssetProjectAssetTypeCombinations] The list of Project assets that should be returned for a call to ProjectAssetTypeManager.getAssetTypesForLiveAssetConstructor().
 * @param {boolean} [options.needsLiveAssetPreload] Set to true if you want getLiveAssetSync() to behave like the real ProjectAsset.
 * @param {PermissionState} [options.clipboardReadPermissionState] The permission state returned by navigator.permissions.query() for "clipboard-read".
 * @param {string} [options.clipboardReadTextReturn] The string returned by navigator.clipboard.readText().
 */
export function createBasicGui({
	valueType = "basic",
	guiOpts = {},
	liveAssetProjectAssetTypeCombinations = [],
	needsLiveAssetPreload = true,
	clipboardReadPermissionState = "granted",
	clipboardReadTextReturn = "",
} = {}) {
	const document = installFakeDocument();
	const oldNode = globalThis.Node;
	globalThis.Node = /** @type {any} */ (HtmlElement);

	const mockLiveAsset = {};

	const mockProjectAsset = createMockDroppableProjectAsset({mockLiveAsset, needsLiveAssetPreload});

	const mockDefaultAssetLink = /** @type {import("../../../../../../studio/src/assets/DefaultAssetLink.js").DefaultAssetLink} */ ({});

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
	 * @param {import("../../../../../../studio/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeIdentifier | typeof import("../../../../../../studio/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetType} assetType
	 * @param {import("../../../../../../studio/src/assets/ProjectAsset.js").ProjectAssetAny} parent
	 * @param {string} persistenceKey
	 */
	function createEmbeddedAssetFn(assetType, parent, persistenceKey) {
		return createMockDroppableProjectAsset({
			mockLiveAsset,
			isEmbedded: true,
			needsLiveAssetPreload,
		});
	}
	const createEmbeddedAssetSpy = spy(createEmbeddedAssetFn);

	/**
	 * @param {import("../../../../../../src/mod.js").UuidString | object | null | undefined} uuidOrData
	 * @param {import("../../../../../../studio/src/assets/AssetManager.js").GetLiveAssetFromUuidOrEmbeddedAssetDataOptions} options
	 */
	function getProjectAssetFromUuidOrEmbeddedAssetDataSyncFn(uuidOrData, options) {
		return createMockDroppableProjectAsset({
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

	const mockAssetManager = /** @type {import("../../../../../../studio/src/assets/AssetManager.js").AssetManager} */ ({
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
		async makeAssetUuidPersistent(asset) {},
		createEmbeddedAsset: /** @type {typeof createEmbeddedAssetFn} */ (createEmbeddedAssetSpy),
	});
	// @ts-ignore
	mockAssetManager.getProjectAssetFromUuidOrEmbeddedAssetDataSync = getProjectAssetFromUuidOrEmbeddedAssetDataSyncSpy;

	const mockProjectManager = /** @type {import("../../../../../../studio/src/projectSelector/ProjectManager.js").ProjectManager} */ ({
		assertAssetManagerExists() {
			return mockAssetManager;
		},
		assetManager: mockAssetManager,
	});

	const mockDragManager = /** @type {import("../../../../../../studio/src/misc/DragManager.js").DragManager} */ ({
		getDraggingData(uuid) {},
	});

	const mockWindowManager = /** @type {import("../../../../../../studio/src/windowManagement/WindowManager.js").WindowManager} */ ({});

	const liveAssetProjectAssetTypes = new Map(liveAssetProjectAssetTypeCombinations);
	const mockProjectAssetTypeManager = /** @type {import("../../../../../../studio/src/assets/ProjectAssetTypeManager.js").ProjectAssetTypeManager} */ ({
		*getAssetTypesForLiveAssetConstructor(constructor) {
			const assetTypes = liveAssetProjectAssetTypes.get(constructor);
			if (assetTypes) {
				yield* assetTypes;
			}
		},
	});

	const mockContextMenuManager = /** @type {import("../../../../../../studio/src/ui/popoverMenus/PopoverManager.js").PopoverManager} */ ({});

	/** @type {Map<string, unknown>} */
	const shortcutConditions = new Map();
	/** @type {Map<string, Set<import("../../../../../../studio/src/keyboardShortcuts/KeyboardShortcutManager.js").CommandCallback>>} */
	const shortcutCommandCallbacks = new Map();

	const mockKeyboardShortcutManager = /** @type {import("../../../../../../studio/src/keyboardShortcuts/KeyboardShortcutManager.js").KeyboardShortcutManager<any>} */ ({
		onCommand(command, cb) {
			let cbs = shortcutCommandCallbacks.get(command);
			if (!cbs) {
				cbs = new Set();
				shortcutCommandCallbacks.set(command, cbs);
			}
			cbs.add(cb);
		},
		removeOnCommand(command, cb) {
			const cbs = shortcutCommandCallbacks.get(command);
			if (cbs) {
				cbs.delete(cb);
				if (cbs.size == 0) {
					shortcutCommandCallbacks.delete(command);
				}
			}
		},
		getCondition(name) {
			const condition = /** @type {import("../../../../../../studio/src/keyboardShortcuts/ShortcutCondition.js").ShortcutCondition<any>} */ ({
				requestValueSetter() {
					const valueSetter = /** @type {import("../../../../../../studio/src/keyboardShortcuts/ShorcutConditionValueSetter.js").ShorcutConditionValueSetter<any>} */ ({
						setValue(value) {
							shortcutConditions.set(name, value);
						},
						destructor() {
							shortcutConditions.delete(name);
						},
					});
					return valueSetter;
				},
			});
			return condition;
		},
	});

	const mockStudio = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({
		projectManager: mockProjectManager,
		dragManager: mockDragManager,
		windowManager: mockWindowManager,
		popoverManager: mockContextMenuManager,
		projectAssetTypeManager: mockProjectAssetTypeManager,
		keyboardShortcutManager: mockKeyboardShortcutManager,
	});
	injectMockStudioInstance(mockStudio);

	const gui = DroppableGui.of(guiOpts);
	if (valueType == "basic") {
		gui.setValue(BASIC_ASSET_UUID);
	} else if (valueType == "defaultAssetLink") {
		gui.setValue(DEFAULTASSETLINK_LINK_UUID);
	} else if (valueType == "embedded") {
		const projectAsset = createMockDroppableProjectAsset({
			mockLiveAsset,
			isEmbedded: true,
			needsLiveAssetPreload,
		});
		gui.setValue(projectAsset);
	}
	return {
		gui,
		document,
		mockStudio,
		mockAssetManager,
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
		/**
		 * @param {string} name
		 */
		getLastShortcutCondition(name) {
			return shortcutConditions.get(name);
		},
		/**
		 * @param {string} command
		 */
		async triggerShortcutCommand(command) {
			const cbs = shortcutCommandCallbacks.get(command);
			if (cbs) {
				const event = /** @type {import("../../../../../../studio/src/keyboardShortcuts/KeyboardShortcutManager.js").CommandCallbackEvent} */ ({});
				cbs.forEach(cb => cb(event));
			}
			await waitForMicrotasks();
		},
		/**
		 * @param {boolean} focus
		 */
		async dispatchFocusEvent(focus) {
			if (focus) {
				gui.el.dispatchEvent(new FocusEvent("focusin"));
			} else {
				gui.el.dispatchEvent(new FocusEvent("focusout"));
			}
			await waitForMicrotasks();
		},
		uninstall() {
			uninstallFakeDocument();
			globalThis.Node = oldNode;
			// @ts-expect-error
			navigator.permissions = oldPermisisons;
			// @ts-expect-error
			navigator.clipboard = oldClipboard;
			injectMockStudioInstance(null);
		},
	};
}

export function createMockProjectAssetType({
	type = "namespace:type",
	uiName = "Mock Project Asset",
} = {}) {
	class MockLiveAssetConstructor { }

	class MockProjectAssetType {
		static type = type;
		static expectedLiveAssetConstructor = MockLiveAssetConstructor;
		static getUiName() {
			return uiName;
		}
	}

	const cast1 = /** @type {unknown} */ (MockProjectAssetType);
	const cast2 = /** @type {typeof import("../../../../../../studio/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetType} */ (cast1);

	return {
		MockLiveAssetConstructor,
		MockProjectAssetType,
		ProjectAssetType: cast2,
	};
}

/**
 * @param {object} options
 * @param {Parameters<typeof createBasicGui>[0]} [options.basicGuiOptions]
 * @param {boolean} [options.dispatchContextMenuEvent]
 */
export async function basicSetupForContextMenus({
	basicGuiOptions = {},
	dispatchContextMenuEvent = true,
} = {}) {
	/** @type {(import("../../../../../../studio/src/ui/popoverMenus/ContextMenu.js").ContextMenuStructure?)[]} */
	const createContextMenuCalls = [];
	const mockContextMenuManager = /** @type {import("../../../../../../studio/src/ui/popoverMenus/PopoverManager.js").PopoverManager} */ ({
		createContextMenu(structure = null) {
			createContextMenuCalls.push(structure);
			return {
				setPos(options) {},
			};
		},
	});
	const returnValue = createBasicGui(basicGuiOptions);
	returnValue.mockStudio.popoverManager = mockContextMenuManager;

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

export const BASIC_ASSET_UUID_FOR_SETTING = "a75c1304-5347-4f86-ae7a-3f57c1fb3ebf";

/**
 * @param {object} options
 * @param {string} [options.clipboardAsset] The content that is currently in the clipboard
 * @param {PermissionState} [options.clipboardReadPermissionState] The content that is currently in the clipboard
 * @param {string[]} [options.supportedAssetTypes] A mock liveasset constructor will be added to the supportedAssetTypes
 * option of the gui.
 * @param {boolean} [options.includeMockProjectAssetTypeAsSupported] Whether to add the MockProjectAssetTypeConstructor
 * from the pasted asset to the supported asset types.
 */
export async function basicSetupForSettingByUuid({
	clipboardAsset = BASIC_ASSET_UUID_FOR_SETTING,
	clipboardReadPermissionState = "granted",
	supportedAssetTypes: supportedAssetTypeStrings = [],
	includeMockProjectAssetTypeAsSupported = false,
} = {}) {
	/** @type {any[]} */
	const supportedAssetTypes = [];
	/** @type {[new (...args: any[]) => any, any[]][]} */
	const liveAssetProjectAssetTypeCombinations = [];
	for (const str of supportedAssetTypeStrings) {
		const mockLiveAsset = class {};
		supportedAssetTypes.push(mockLiveAsset);
		liveAssetProjectAssetTypeCombinations.push([
			mockLiveAsset, [
				{
					type: str,
					expectedLiveAssetConstructor: mockLiveAsset,
				},
			],
		]);
	}

	class MockLiveAsset {}

	const MockProjectAssetTypeConstructor = {
		type: "pasted asset type",
		expectedLiveAssetConstructor: MockLiveAsset,
	};
	if (includeMockProjectAssetTypeAsSupported) {
		supportedAssetTypes.push(MockLiveAsset);
		liveAssetProjectAssetTypeCombinations.push([MockLiveAsset, [MockProjectAssetTypeConstructor]]);
	}

	const returnValue = await basicSetupForContextMenus({
		basicGuiOptions: {
			clipboardReadTextReturn: clipboardAsset,
			clipboardReadPermissionState,
			valueType: "none",
			guiOpts: {
				supportedAssetTypes,
			},
			liveAssetProjectAssetTypeCombinations,
		},
		dispatchContextMenuEvent: false,
	});

	const {projectAsset: mockProjectAsset} = createMockProjectAsset({
		uuid: BASIC_ASSET_UUID_FOR_SETTING,
		projectAssetTypeConstructor: MockProjectAssetTypeConstructor,
	});
	returnValue.addMockProjectAsset(BASIC_ASSET_UUID_FOR_SETTING, mockProjectAsset);

	const assetManager = returnValue.mockStudio.projectManager.assetManager;
	assertExists(assetManager);
	stub(assetManager, "getProjectAssetFromUuid", async uuid => {
		if (uuid == BASIC_ASSET_UUID_FOR_SETTING) {
			return mockProjectAsset;
		}
		return null;
	});

	return {
		...returnValue,
		mockProjectAsset,
		/**
		 * @param {string} clipboardData
		 */
		async dispatchPasteEvent(clipboardData) {
			const event = new ClipboardEvent("paste");
			event.clipboardData.setData("text/plain", clipboardData);
			returnValue.document.dispatchEvent(event);
			await waitForMicrotasks();
		},
		async triggerPasteShortcut() {
			await returnValue.triggerShortcutCommand("droppableGui.pasteUuid");
		},
		async dispatchContextMenuEvent() {
			await returnValue.dispatchContextMenuEvent();
		},
		/**
		 * @param {boolean} visible
		 */
		async assertContextMenu(visible, disabled = false, tooltip = "") {
			const {createContextMenuCalls} = returnValue;
			const call = createContextMenuCalls[0];
			const itemText = "Paste Asset UUID";
			if (visible) {
				assertExists(call);
				await assertContextMenuStructureContains(call, {
					text: itemText,
					disabled,
					tooltip,
				});
			} else {
				if (call) {
					await assertContextMenuStructureNotContainsText(call, "Paste Asset UUID");
				}
			}
		},
		async clickPaste() {
			const {createContextMenuCalls} = returnValue;
			assertExists(createContextMenuCalls[0]);
			await triggerContextMenuItem(createContextMenuCalls[0], ["Paste Asset UUID"]);
		},
		uninstall() {
			returnValue.uninstall();
		},
	};
}
