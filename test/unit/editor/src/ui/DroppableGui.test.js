import {assertEquals, assertExists, assertStrictEquals} from "asserts";
import {ProjectAsset} from "../../../../../editor/src/assets/ProjectAsset.js";
import {DroppableGui} from "../../../../../editor/src/ui/DroppableGui.js";
import {installFakeDocument, uninstallFakeDocument} from "../../../shared/fakeDom/FakeDocument.js";
import {FakeMouseEvent} from "../../../shared/fakeDom/FakeMouseEvent.js";
import {assertContextMenuStructureEquals, triggerContextMenuItem} from "../../shared/contextMenuHelpers.js";

const BASIC_ASSET_UUID = "BASIC_ASSET_UUID";
const DEFAULTASSETLINK_LINK_UUID = "DEFAULTASSETLINK_LINK_UUID";

const mockLiveAsset = {};

const mockProjectAsset = /** @type {import("../../../../../editor/src/assets/ProjectAsset.js").ProjectAsset<any>} */ (
	Object.create(ProjectAsset.prototype)
);
mockProjectAsset.getIsDeleted = async () => false;
mockProjectAsset.uuid = BASIC_ASSET_UUID;
Object.defineProperty(mockProjectAsset, "fileName", {
	value: "assetName.json",
	writable: false,
});
mockProjectAsset.getLiveAssetImmediate = () => {
	return mockLiveAsset;
};

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
		};
	},
});

/** @type {import("../../../../../editor/src/ui/DroppableGui.js").DroppableGuiDependencies} */
const defaultDroppableDependencies = {
	projectManager: mockProjectManager,
	dragManager: /** @type {import("../../../../../editor/src/misc/DragManager.js").DragManager} */ ({}),
	windowManager: /** @type {import("../../../../../editor/src/windowManagement/WindowManager.js").WindowManager} */ ({}),
	contextMenuManager: /** @type {import("../../../../../editor/src/ui/contextMenus/ContextMenuManager.js").ContextMenuManager} */ ({}),
};

/**
 * @param {Object} options
 * @param {"basic" | "defaultAssetLink" | "none"} [options.valueType]
 * @param {Partial<import("../../../../../editor/src/ui/DroppableGui.js").DroppableGuiDependencies>} [options.extraMocks]
 */
function createBasicGui({
	valueType = "basic",
	extraMocks = {},
} = {}) {
	const dependencies = {
		...defaultDroppableDependencies,
		...extraMocks,
	};
	const gui = DroppableGui.of({dependencies});
	if (valueType == "basic") {
		gui.setValue(BASIC_ASSET_UUID);
	} else if (valueType == "defaultAssetLink") {
		gui.setValue(DEFAULTASSETLINK_LINK_UUID);
	}
	return gui;
}

Deno.test({
	name: "Is not disabled by default",
	fn() {
		installFakeDocument();
		const gui = createBasicGui();

		assertEquals(gui.disabled, false);
		assertEquals(gui.el.getAttribute("aria-disabled"), "false");

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "setValue() to null",
	fn() {
		installFakeDocument();
		const gui = createBasicGui();

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
		const gui = createBasicGui();

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
		const gui = createBasicGui();

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
		const gui = createBasicGui();

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
		const gui = createBasicGui();

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
		const gui = createBasicGui();

		const result = gui.getValue();

		assertEquals(result, BASIC_ASSET_UUID);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() without parameters and no value set",
	fn() {
		installFakeDocument();
		const gui = createBasicGui({valueType: "none"});

		const result = gui.getValue();

		assertEquals(result, null);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() without parameters and asset link",
	fn() {
		installFakeDocument();
		const gui = createBasicGui({valueType: "defaultAssetLink"});

		const result = gui.getValue();

		assertEquals(result, DEFAULTASSETLINK_LINK_UUID);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() with asset link and resolveDefaultAssetLinks = true",
	fn() {
		installFakeDocument();
		const gui = createBasicGui({valueType: "defaultAssetLink"});

		const result = gui.getValue({resolveDefaultAssetLinks: true});

		assertEquals(result, BASIC_ASSET_UUID);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() with returnLiveAsset = true",
	fn() {
		installFakeDocument();
		const gui = createBasicGui();

		const result = gui.getValue({returnLiveAsset: true});

		assertStrictEquals(result, mockLiveAsset);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() with returnLiveAsset = true and no value set",
	fn() {
		installFakeDocument();
		const gui = createBasicGui({valueType: "none"});

		const result = gui.getValue({returnLiveAsset: true});

		assertEquals(result, null);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() with purpose 'fileStorage'",
	fn() {
		installFakeDocument();
		const gui = createBasicGui();

		const result = gui.getValue({purpose: "fileStorage"});

		assertEquals(result, BASIC_ASSET_UUID);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() with purpose 'binaryComposer'",
	fn() {
		installFakeDocument();
		const gui = createBasicGui();

		const result = gui.getValue({purpose: "binaryComposer"});

		assertEquals(result, BASIC_ASSET_UUID);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() with purpose 'script'",
	fn() {
		installFakeDocument();
		const gui = createBasicGui();

		const result = gui.getValue({purpose: "script"});

		assertStrictEquals(result, mockLiveAsset);

		uninstallFakeDocument();
	},
});

/**
 * @param {Parameters<typeof createBasicGui>[0]} [basicGuiOptions]
 */
function basicSetupForContextMenus(basicGuiOptions) {
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
	const gui = createBasicGui({
		...basicGuiOptions,
		extraMocks: {
			contextMenuManager: mockContextMenuManager,
		},
	});

	return {
		gui,
		createContextMenuCalls,
		uninstall() {
			uninstallFakeDocument();
		},
	};
}

Deno.test({
	name: "context menu event creates a new context menu",
	fn() {
		const {uninstall, gui, createContextMenuCalls} = basicSetupForContextMenus();
		gui.el.dispatchEvent(new FakeMouseEvent("contextmenu"));

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
		const {uninstall, gui, createContextMenuCalls} = basicSetupForContextMenus();
		gui.setDisabled(true);
		gui.el.dispatchEvent(new FakeMouseEvent("contextmenu"));

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
		const {uninstall, gui, createContextMenuCalls} = basicSetupForContextMenus({
			valueType: "none",
		});
		gui.el.dispatchEvent(new FakeMouseEvent("contextmenu"));

		assertEquals(createContextMenuCalls.length, 0);

		uninstall();
	},
});

Deno.test({
	name: "context menu with a default asset link set",
	fn() {
		const {uninstall, gui, createContextMenuCalls} = basicSetupForContextMenus({
			valueType: "defaultAssetLink",
		});
		gui.el.dispatchEvent(new FakeMouseEvent("contextmenu"));

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
			valueType: "defaultAssetLink",
		});
		gui.el.dispatchEvent(new FakeMouseEvent("contextmenu"));

		assertExists(createContextMenuCalls[0]);
		await triggerContextMenuItem(createContextMenuCalls[0], ["Unlink"]);

		assertEquals(gui.projectAssetValue, null);
		assertEquals(gui.defaultAssetLink, null);
		assertEquals(gui.defaultAssetLinkUuid, null);

		uninstall();
	},
});
