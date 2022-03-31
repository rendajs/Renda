import {assertEquals, assertExists, assertStrictEquals} from "asserts";
import {ProjectAsset} from "../../../../../editor/src/assets/ProjectAsset.js";
import {DroppableGui} from "../../../../../editor/src/ui/DroppableGui.js";
import {installFakeDocument, uninstallFakeDocument} from "../../../shared/fakeDom/FakeDocument.js";
import {FakeMouseEvent} from "../../../shared/fakeDom/FakeMouseEvent.js";
import {assertContextMenuStructureEquals, triggerContextMenuItem} from "../../shared/contextMenuHelpers.js";

const BASIC_ASSET_UUID = "BASIC_ASSET_UUID";
const DEFAULTASSETLINK_LINK_UUID = "DEFAULTASSETLINK_LINK_UUID";

/**
 * @param {Object} options
 * @param {object?} options.mockLiveAsset
 * @param {boolean} [options.isEmbedded]
 * @param {boolean} [options.needsLiveAssetPreload] Set to true if you want getLiveAssetImmediate() to behave
 * like the real ProjectAsset.
 */
function createMockProjectAsset({
	mockLiveAsset,
	isEmbedded = false,
	needsLiveAssetPreload = true,
}) {
	// We use Object.create so that the `instanceof ProjectAsset` check in the DroppableGui still works.
	const mockProjectAsset = /** @type {import("../../../../../editor/src/assets/ProjectAsset.js").ProjectAsset<any>} */ (
		Object.create(ProjectAsset.prototype)
	);
	mockProjectAsset.isEmbedded = isEmbedded;
	mockProjectAsset.getIsDeleted = async () => false;
	mockProjectAsset.uuid = BASIC_ASSET_UUID;
	Object.defineProperty(mockProjectAsset, "fileName", {
		value: "assetName.json",
		writable: false,
	});
	let asyncGetLiveAssetCalled = false;
	mockProjectAsset.getLiveAssetImmediate = () => {
		// The real ProjectAsset doesn't return a live asset immediately, only after
		// a call has been made to getLiveAssetData.
		if (!asyncGetLiveAssetCalled && needsLiveAssetPreload) return null;
		return mockLiveAsset;
	};
	mockProjectAsset.getLiveAsset = async () => {
		asyncGetLiveAssetCalled = true;
		return mockLiveAsset;
	};
	mockProjectAsset.readEmbeddedAssetData = () => {
		return {
			num: 42,
			str: "foo",
		};
	};
	return mockProjectAsset;
}

/**
 * @param {Object} options
 * @param {"basic" | "defaultAssetLink" | "embedded" | "none"} [options.valueType]
 * @param {Partial<import("../../../../../editor/src/ui/DroppableGui.js").DroppableGuiDependencies>} [options.extraMocks]
 * @param {Partial<import("../../../../../editor/src/ui/DroppableGui.js").DroppableGuiOptions<any>>} [options.guiOpts]
 * @param {Iterable<[(new (...args: any) => any), Iterable<typeof import("../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetType>]>} [options.liveAssetProjectAssetTypeCombinations] The list of Project assets that should be returned for a call to ProjectAssetTypeManager.getAssetTypesForLiveAssetConstructor().
 * @param {boolean} [options.needsLiveAssetPreload] Set to true if you want getLiveAssetImmediate() to behave like the real ProjectAsset.
 */
function createBasicGui({
	valueType = "basic",
	extraMocks = {},
	guiOpts = {},
	liveAssetProjectAssetTypeCombinations = [],
	needsLiveAssetPreload = true,
} = {}) {
	const mockLiveAsset = {};

	const mockProjectAsset = createMockProjectAsset({mockLiveAsset, needsLiveAssetPreload});

	const mockDefaultAssetLink = /** @type {import("../../../../../editor/src/assets/DefaultAssetLink.js").DefaultAssetLink} */ ({});

	const mockProjectManager = /** @type {import("../../../../../editor/src/projectSelector/ProjectManager.js").ProjectManager} */ ({
		assertAssetManagerExists() {
			return {
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
				createEmbeddedAsset(assetType) {
					return createMockProjectAsset({
						mockLiveAsset,
						isEmbedded: true,
						needsLiveAssetPreload,
					});
				},
			};
		},
	});

	const liveAssetProjectAssetTypes = new Map(liveAssetProjectAssetTypeCombinations);
	const mockProjectAssetTypeManager = /** @type {import("../../../../../editor/src/assets/ProjectAssetTypeManager.js").ProjectAssetTypeManager} */ ({
		*getAssetTypesForLiveAssetConstructor(constructor) {
			const assetTypes = liveAssetProjectAssetTypes.get(constructor);
			if (assetTypes) {
				yield* assetTypes;
			}
		},
	});

	/** @type {import("../../../../../editor/src/ui/DroppableGui.js").DroppableGuiDependencies} */
	const dependencies = {
		projectManager: mockProjectManager,
		dragManager: /** @type {import("../../../../../editor/src/misc/DragManager.js").DragManager} */ ({}),
		windowManager: /** @type {import("../../../../../editor/src/windowManagement/WindowManager.js").WindowManager} */ ({}),
		contextMenuManager: /** @type {import("../../../../../editor/src/ui/contextMenus/ContextMenuManager.js").ContextMenuManager} */ ({}),
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
	};
}

function createMockProjectAssetType({
	type = "namespace:type",
	uiCreateName = "Mock Project Asset",
} = {}) {
	class MockLiveAsset {}

	class MockProjectAssetType {
		static type = type;
		static expectedLiveAssetConstructor = MockLiveAsset;
		static uiCreateName = uiCreateName;
	}

	const cast1 = /** @type {unknown} */ (MockProjectAssetType);
	const cast2 = /** @type {typeof import("../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetType} */ (cast1);

	return {
		MockLiveAsset,
		MockProjectAssetType,
		ProjectAssetType: cast2,
	};
}

Deno.test({
	name: "Is not disabled by default",
	fn() {
		installFakeDocument();
		const {gui} = createBasicGui();

		assertEquals(gui.disabled, false);
		assertEquals(gui.el.getAttribute("aria-disabled"), "false");

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "setValue() to null",
	fn() {
		installFakeDocument();
		const {gui} = createBasicGui();

		gui.setValue(null);

		assertEquals(gui.projectAssetValue, null);
		assertEquals(gui.defaultAssetLink, null);
		assertEquals(gui.defaultAssetLinkUuid, null);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "setValue() with an uuid",
	fn() {
		installFakeDocument();
		const {gui, mockProjectAsset} = createBasicGui();

		gui.setValue(BASIC_ASSET_UUID);

		assertStrictEquals(gui.projectAssetValue, mockProjectAsset);
		assertEquals(gui.defaultAssetLink, null);
		assertEquals(gui.defaultAssetLinkUuid, null);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "setValue() with an assetlink uuid",
	fn() {
		installFakeDocument();
		const {gui, mockProjectAsset, mockDefaultAssetLink} = createBasicGui();

		gui.setValue(DEFAULTASSETLINK_LINK_UUID);

		assertStrictEquals(gui.projectAssetValue, mockProjectAsset);
		assertStrictEquals(gui.defaultAssetLink, mockDefaultAssetLink);
		assertEquals(gui.defaultAssetLinkUuid, DEFAULTASSETLINK_LINK_UUID);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "setValue() using a ProjectAsset",
	fn() {
		installFakeDocument();
		const {gui, mockProjectAsset} = createBasicGui();

		gui.setValue(mockProjectAsset);

		assertStrictEquals(gui.projectAssetValue, mockProjectAsset);
		assertEquals(gui.defaultAssetLink, null);
		assertEquals(gui.defaultAssetLinkUuid, null);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "setValue() using a live asset",
	fn() {
		installFakeDocument();
		const {gui, mockLiveAsset, mockProjectAsset} = createBasicGui();

		gui.setValue(mockLiveAsset);

		assertStrictEquals(gui.projectAssetValue, mockProjectAsset);
		assertEquals(gui.defaultAssetLink, null);
		assertEquals(gui.defaultAssetLinkUuid, null);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() without parameters",
	fn() {
		installFakeDocument();
		const {gui} = createBasicGui();

		const result = gui.getValue();

		assertEquals(result, BASIC_ASSET_UUID);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() without parameters and no value set",
	fn() {
		installFakeDocument();
		const {gui} = createBasicGui({valueType: "none"});

		const result = gui.getValue();

		assertEquals(result, null);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() without parameters and asset link",
	fn() {
		installFakeDocument();
		const {gui} = createBasicGui({valueType: "defaultAssetLink"});

		const result = gui.getValue();

		assertEquals(result, DEFAULTASSETLINK_LINK_UUID);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() with asset link and resolveDefaultAssetLinks = true",
	fn() {
		installFakeDocument();
		const {gui} = createBasicGui({valueType: "defaultAssetLink"});

		const result = gui.getValue({resolveDefaultAssetLinks: true});

		assertEquals(result, BASIC_ASSET_UUID);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() with returnLiveAsset = true",
	fn() {
		installFakeDocument();
		const {gui, mockLiveAsset} = createBasicGui({
			needsLiveAssetPreload: false,
		});

		const result = gui.getValue({returnLiveAsset: true});

		assertStrictEquals(result, mockLiveAsset);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() with returnLiveAsset = true and no value set",
	fn() {
		installFakeDocument();
		const {gui} = createBasicGui({valueType: "none"});

		const result = gui.getValue({returnLiveAsset: true});

		assertEquals(result, null);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() with purpose 'fileStorage'",
	fn() {
		installFakeDocument();
		const {gui} = createBasicGui();

		const result = gui.getValue({purpose: "fileStorage"});

		assertEquals(result, BASIC_ASSET_UUID);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() with purpose 'binaryComposer'",
	fn() {
		installFakeDocument();
		const {gui} = createBasicGui();

		const result = gui.getValue({purpose: "binaryComposer"});

		assertEquals(result, BASIC_ASSET_UUID);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() with purpose 'script'",
	fn() {
		installFakeDocument();
		const {gui, mockLiveAsset} = createBasicGui({
			needsLiveAssetPreload: false,
		});

		const result = gui.getValue({purpose: "script"});

		assertStrictEquals(result, mockLiveAsset);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() with no parameters and an embedded asset",
	fn() {
		installFakeDocument();
		const {gui} = createBasicGui({
			valueType: "embedded",
		});

		const result = gui.getValue();

		assertEquals(result, {
			num: 42,
			str: "foo",
		});

		uninstallFakeDocument();
	},
});

/**
 * @param {Object} [options]
 * @param {Parameters<typeof createBasicGui>[0]} [options.basicGuiOptions]
 * @param {boolean} [options.dispatchContextMenuEvent]
 */
function basicSetupForContextMenus({
	basicGuiOptions = {},
	dispatchContextMenuEvent = true,
} = {}) {
	installFakeDocument();
	/** @type {(import("../../../../../editor/src/ui/contextMenus/ContextMenu.js").ContextMenuStructure?)[]} */
	const createContextMenuCalls = [];
	const mockContextMenuManager = /** @type {import("../../../../../editor/src/ui/contextMenus/ContextMenuManager.js").ContextMenuManager} */ ({
		createContextMenu(structure = null) {
			createContextMenuCalls.push(structure);
			return {
				setPos(options) {},
			};
		},
	});
	const {gui, mockLiveAsset} = createBasicGui({
		...basicGuiOptions,
		extraMocks: {
			contextMenuManager: mockContextMenuManager,
		},
	});

	function dispatchContextMenuEventFn() {
		gui.el.dispatchEvent(new FakeMouseEvent("contextmenu"));
	}
	if (dispatchContextMenuEvent) {
		dispatchContextMenuEventFn();
	}

	return {
		gui,
		createContextMenuCalls,
		dispatchContextMenuEvent: dispatchContextMenuEventFn,
		mockLiveAsset,
		uninstall() {
			uninstallFakeDocument();
		},
	};
}

Deno.test({
	name: "context menu event creates a new context menu",
	fn() {
		const {uninstall, createContextMenuCalls} = basicSetupForContextMenus();

		assertExists(createContextMenuCalls[0]);
		assertContextMenuStructureEquals(createContextMenuCalls[0], [
			{text: "Unlink"},
			{text: "Copy asset UUID"},
			{text: "View location"},
		]);

		uninstall();
	},
});

Deno.test({
	name: "context menu on a disabled gui",
	fn() {
		const {uninstall, gui, createContextMenuCalls, dispatchContextMenuEvent} = basicSetupForContextMenus({
			dispatchContextMenuEvent: false,
		});
		gui.setDisabled(true);
		dispatchContextMenuEvent();

		assertExists(createContextMenuCalls[0]);
		assertContextMenuStructureEquals(createContextMenuCalls[0], [
			{text: "Copy asset UUID"},
			{text: "View location"},
		]);

		uninstall();
	},
});

Deno.test({
	name: "context menu without a value set",
	fn() {
		const {uninstall, createContextMenuCalls} = basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "none",
			},
		});

		assertEquals(createContextMenuCalls.length, 0);

		uninstall();
	},
});

Deno.test({
	name: "context menu without a value set and a disabled gui",
	fn() {
		const {uninstall, gui, createContextMenuCalls, dispatchContextMenuEvent} = basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "none",
			},
			dispatchContextMenuEvent: false,
		});
		gui.setDisabled(true);
		dispatchContextMenuEvent();

		assertEquals(createContextMenuCalls.length, 0);

		uninstall();
	},
});

Deno.test({
	name: "context menu with a default asset link set",
	fn() {
		const {uninstall, createContextMenuCalls} = basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "defaultAssetLink",
			},
		});

		assertExists(createContextMenuCalls[0]);
		assertContextMenuStructureEquals(createContextMenuCalls[0], [
			{text: "Unlink"},
			{text: "Copy asset UUID"},
			{text: "Copy resolved asset link UUID"},
			{text: "View location"},
		]);

		uninstall();
	},
});

Deno.test({
	name: "unlink via context menu",
	async fn() {
		const {uninstall, gui, createContextMenuCalls} = basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "defaultAssetLink",
			},
		});

		assertExists(createContextMenuCalls[0]);
		await triggerContextMenuItem(createContextMenuCalls[0], ["Unlink"]);

		assertEquals(gui.projectAssetValue, null);
		assertEquals(gui.defaultAssetLink, null);
		assertEquals(gui.defaultAssetLinkUuid, null);

		uninstall();
	},
});

Deno.test({
	name: "context menu with embedded assets enabled and one supported asset type",
	fn() {
		const {MockLiveAsset, ProjectAssetType} = createMockProjectAssetType();
		const {uninstall, createContextMenuCalls} = basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "none",
				guiOpts: {
					supportedAssetTypes: [MockLiveAsset],
				},
				liveAssetProjectAssetTypeCombinations: [[MockLiveAsset, [ProjectAssetType]]],
			},
		});

		assertExists(createContextMenuCalls[0]);
		assertContextMenuStructureEquals(createContextMenuCalls[0], [{text: "Create embedded asset"}]);

		uninstall();
	},
});

Deno.test({
	name: "context menu with embedded assets enabled and two supported asset types",
	fn() {
		const {MockLiveAsset: MockLiveAsset1, ProjectAssetType: ProjectAssetType1} = createMockProjectAssetType({type: "namespace1:type1", uiCreateName: "Mock Live Asset 1"});
		const {MockLiveAsset: MockLiveAsset2, ProjectAssetType: ProjectAssetType2} = createMockProjectAssetType({type: "namespace2:type2", uiCreateName: ""});
		const {uninstall, createContextMenuCalls} = basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "none",
				guiOpts: {
					supportedAssetTypes: [MockLiveAsset1, MockLiveAsset2],
				},
				liveAssetProjectAssetTypeCombinations: [
					[MockLiveAsset1, [ProjectAssetType1]],
					[MockLiveAsset2, [ProjectAssetType2]],
				],
			},
		});

		assertExists(createContextMenuCalls[0]);
		assertContextMenuStructureEquals(createContextMenuCalls[0], [
			{
				text: "Create embedded asset",
				submenu: [
					{text: "Mock Live Asset 1"},
					{text: "<namespace2:type2>"},
				],
			},
		]);

		uninstall();
	},
});

Deno.test({
	name: "create embedded asset via context menu",
	async fn() {
		const {MockLiveAsset, ProjectAssetType} = createMockProjectAssetType();
		const {gui, uninstall, createContextMenuCalls} = basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "none",
				guiOpts: {
					supportedAssetTypes: [MockLiveAsset],
				},
				liveAssetProjectAssetTypeCombinations: [[MockLiveAsset, [ProjectAssetType]]],
			},
		});

		assertExists(createContextMenuCalls[0]);
		await triggerContextMenuItem(createContextMenuCalls[0], ["Create embedded asset"]);

		assertExists(gui.projectAssetValue);
		assertEquals(gui.defaultAssetLink, null);
		assertEquals(gui.defaultAssetLinkUuid, null);
		assertEquals(gui.visibleAssetName, "Embedded asset");

		uninstall();
	},
});

Deno.test({
	name: "creating embedded assets waits with firing the onChange event until the live asset is loaded",
	async fn() {
		const {MockLiveAsset, ProjectAssetType} = createMockProjectAssetType();
		const {gui, uninstall, createContextMenuCalls, mockLiveAsset} = basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "none",
				guiOpts: {
					supportedAssetTypes: [MockLiveAsset],
				},
				liveAssetProjectAssetTypeCombinations: [[MockLiveAsset, [ProjectAssetType]]],
			},
		});

		const onValueChangePromise = new Promise(resolve => {
			gui.onValueChange(() => {
				const value = gui.getValue({returnLiveAsset: true});
				resolve(value);
			});
		});

		assertExists(createContextMenuCalls[0]);
		await triggerContextMenuItem(createContextMenuCalls[0], ["Create embedded asset"]);

		const promiseResult = await onValueChangePromise;

		assertExists(promiseResult);
		assertStrictEquals(promiseResult, mockLiveAsset);

		uninstall();
	},
});
