import {assertEquals, assertExists, assertStrictEquals, assertThrows} from "asserts";
import {assertSpyCall, assertSpyCalls} from "std/testing/mock";
import {triggerContextMenuItem} from "../../../shared/contextMenuHelpers.js";
import {basicSetupForContextMenus, createBasicGui, createMockProjectAssetType} from "./shared.js";

const BASIC_PERSISTENCE_KEY = "persistenceKey";

function createMockParentAsset() {
	const projectAsset = /** @type {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAssetAny} */ ({});
	return projectAsset;
}

function basicSetupForEmbeddedAssets() {
	const mockParent = createMockParentAsset();
	const {MockLiveAssetConstructor, ProjectAssetType} = createMockProjectAssetType();
	const returnValue = basicSetupForContextMenus({
		basicGuiOptions: {
			valueType: "none",
			guiOpts: {
				supportedAssetTypes: [MockLiveAssetConstructor],
				embeddedParentAsset: mockParent,
				embeddedParentAssetPersistenceKey: BASIC_PERSISTENCE_KEY,
			},
			liveAssetProjectAssetTypeCombinations: [[MockLiveAssetConstructor, [ProjectAssetType]]],
		},
		dispatchContextMenuEvent: false,
	});
	return {
		...returnValue,
		async triggerCreateEmbeddedAsset() {
			returnValue.dispatchContextMenuEvent();
			const lastCall = returnValue.createContextMenuCalls[returnValue.createContextMenuCalls.length - 1];
			assertExists(lastCall);
			await triggerContextMenuItem(lastCall, ["Create embedded asset"]);
		},
		MockProjectAssetType: ProjectAssetType,
		mockParent,
	};
}

Deno.test({
	name: "create embedded asset via context menu",
	async fn() {
		const {gui, uninstall, triggerCreateEmbeddedAsset, createEmbeddedAssetSpy, MockProjectAssetType, mockParent} = basicSetupForEmbeddedAssets();

		await triggerCreateEmbeddedAsset();

		assertSpyCalls(createEmbeddedAssetSpy, 1);
		assertSpyCall(createEmbeddedAssetSpy, 0, {
			args: [MockProjectAssetType, mockParent, BASIC_PERSISTENCE_KEY],
		});
		assertStrictEquals(createEmbeddedAssetSpy.calls[0].args[0], MockProjectAssetType);
		assertStrictEquals(createEmbeddedAssetSpy.calls[0].args[1], mockParent);

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
		const {gui, uninstall, triggerCreateEmbeddedAsset, mockLiveAsset} = basicSetupForEmbeddedAssets();

		const onValueChangePromise = new Promise(resolve => {
			gui.onValueChange(() => {
				const value = gui.getValue({returnLiveAsset: true});
				resolve(value);
			});
		});

		await triggerCreateEmbeddedAsset();

		const promiseResult = await onValueChangePromise;

		assertExists(promiseResult);
		assertStrictEquals(promiseResult, mockLiveAsset);

		uninstall();
	},
});

Deno.test({
	name: "removeEmbeddedAssetSupport() and setEmbeddedParentAsset()",
	async fn() {
		const {gui, uninstall, triggerCreateEmbeddedAsset, mockLiveAsset, createEmbeddedAssetSpy, MockProjectAssetType, mockParent} = basicSetupForEmbeddedAssets();

		await triggerCreateEmbeddedAsset();

		const liveAsset1 = gui.getValue({returnLiveAsset: true});
		assertStrictEquals(liveAsset1, mockLiveAsset);

		gui.removeEmbeddedAssetSupport();

		const value2 = gui.getValue();
		assertEquals(value2, null);

		const mockParent2 = createMockParentAsset();
		gui.setEmbeddedParentAsset(mockParent2, BASIC_PERSISTENCE_KEY);

		await triggerCreateEmbeddedAsset();

		const liveAsset2 = gui.getValue({returnLiveAsset: true});
		assertStrictEquals(liveAsset2, mockLiveAsset);

		assertSpyCalls(createEmbeddedAssetSpy, 2);
		assertSpyCall(createEmbeddedAssetSpy, 1, {
			args: [MockProjectAssetType, mockParent, BASIC_PERSISTENCE_KEY],
		});
		assertStrictEquals(createEmbeddedAssetSpy.calls[1].args[0], MockProjectAssetType);
		assertStrictEquals(createEmbeddedAssetSpy.calls[1].args[1], mockParent2);

		uninstall();
	},
});

Deno.test({
	name: "setEmbeddedParentAsset() remembers the previous persistence key when not provided",
	async fn() {
		const {gui, uninstall, triggerCreateEmbeddedAsset, mockLiveAsset, createEmbeddedAssetSpy, MockProjectAssetType, mockParent} = basicSetupForEmbeddedAssets();

		try {
			const mockParent2 = createMockParentAsset();
			gui.setEmbeddedParentAsset(mockParent2, BASIC_PERSISTENCE_KEY);
			gui.setEmbeddedParentAsset(mockParent2);

			await triggerCreateEmbeddedAsset();

			const liveAsset2 = gui.getValue({returnLiveAsset: true});
			assertStrictEquals(liveAsset2, mockLiveAsset);

			assertSpyCalls(createEmbeddedAssetSpy, 1);
			assertSpyCall(createEmbeddedAssetSpy, 0, {
				args: [MockProjectAssetType, mockParent, BASIC_PERSISTENCE_KEY],
			});
			assertStrictEquals(createEmbeddedAssetSpy.calls[0].args[0], MockProjectAssetType);
			assertStrictEquals(createEmbeddedAssetSpy.calls[0].args[1], mockParent2);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getValue() with isDiskData true, no embedded asset support enabled",
	fn() {
		const {gui, uninstall} = createBasicGui();

		try {
			const embeddedDiskData = {};

			assertThrows(() => {
				gui.setValue(embeddedDiskData, {isDiskData: true});
			}, Error, "Tried to set DroppableGui value to embedded asset data, but embedded asset support is not enabled.");
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getValue() with isDiskData true, no persistence key set",
	fn() {
		const {gui, uninstall} = createBasicGui();

		try {
			const mockParent = createMockParentAsset();
			gui.setEmbeddedParentAsset(mockParent, "");
			const embeddedDiskData = {};

			assertThrows(() => {
				gui.setValue(embeddedDiskData, {isDiskData: true});
			}, Error, "Tried to set DroppableGui value to embedded asset data, but no persistence key was set.");
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getValue() with isDiskData true, no supported asset types set",
	fn() {
		const {gui, uninstall} = createBasicGui();

		try {
			const mockParent = createMockParentAsset();
			gui.setEmbeddedParentAsset(mockParent, BASIC_PERSISTENCE_KEY);
			const embeddedDiskData = {};

			assertThrows(() => {
				gui.setValue(embeddedDiskData, {isDiskData: true});
			}, Error, "Tried to set DroppableGui value to embedded asset data, but no supported asset types are set.");
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getValue() with isDiskData true, too many supported asset types set",
	fn() {
		const {MockLiveAssetConstructor: MockLiveAssetConstructor1, ProjectAssetType: ProjectAssetType1} = createMockProjectAssetType();
		const {MockLiveAssetConstructor: MockLiveAssetConstructor2, ProjectAssetType: ProjectAssetType2} = createMockProjectAssetType();
		const {gui, uninstall} = createBasicGui({
			guiOpts: {
				supportedAssetTypes: [MockLiveAssetConstructor1, MockLiveAssetConstructor2],
			},
			liveAssetProjectAssetTypeCombinations: [
				[MockLiveAssetConstructor1, [ProjectAssetType1]],
				[MockLiveAssetConstructor2, [ProjectAssetType2]],
			],
		});

		try {
			const mockParent = createMockParentAsset();
			gui.setEmbeddedParentAsset(mockParent, BASIC_PERSISTENCE_KEY);
			const embeddedDiskData = {};

			assertThrows(() => {
				gui.setValue(embeddedDiskData, {isDiskData: true});
			}, Error, "Tried to set DroppableGui value to embedded asset data, but multiple asset types are supported.");
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getValue() with isDiskData true",
	fn() {
		const {gui, uninstall, getProjectAssetFromUuidOrEmbeddedAssetDataSyncSpy, MockProjectAssetType, mockParent} = basicSetupForEmbeddedAssets();

		try {
			const embeddedAssetData = {label: "embedded asset data"};
			gui.setValue(embeddedAssetData, {isDiskData: true});

			assertSpyCalls(getProjectAssetFromUuidOrEmbeddedAssetDataSyncSpy, 1);
			assertSpyCall(getProjectAssetFromUuidOrEmbeddedAssetDataSyncSpy, 0, {
				args: [
					embeddedAssetData, {
						assertAssetType: MockProjectAssetType,
						embeddedAssetPersistenceKey: BASIC_PERSISTENCE_KEY,
						parentAsset: mockParent,
					},
				],
			});
		} finally {
			uninstall();
		}
	},
});
