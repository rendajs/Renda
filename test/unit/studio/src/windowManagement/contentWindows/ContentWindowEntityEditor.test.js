import {getMockArgs} from "./shared.js";
import {ContentWindowEntityEditor} from "../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor.js";
import {FakeHtmlElement} from "fake-dom/FakeHtmlElement.js";
import {assertSpyCalls, stub} from "std/testing/mock.ts";
import {SelectionManager} from "../../../../../../studio/src/misc/SelectionManager.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {createMockProjectAsset} from "../../../shared/createMockProjectAsset.js";
import {assertEquals, assertExists} from "std/testing/asserts.ts";
import {waitForMicrotasks} from "../../../../shared/waitForMicroTasks.js";

/**
 * @typedef ContentWindowEntityEditorTestContext
 * @property {ContentWindowEntityEditor} contentWindow
 */

function basicTest() {
	installFakeDocument();
	const requestAnimationFrameStub = stub(window, "requestAnimationFrame");
	const {args, mockWindowManager, mockStudioInstance} = getMockArgs();
	mockStudioInstance.renderer = /** @type {import("../../../../../../src/mod.js").WebGpuRenderer} */ ({
		createDomTarget() {
			return {
				destructor() {},
				getElement() {
					const el = new FakeHtmlElement({tagName: "canvas"});
					return /** @type {HTMLCanvasElement} */ (/** @type {unknown} */ (el));
				},
			};
		},
	});
	mockStudioInstance.selectionManager = new SelectionManager();
	mockStudioInstance.engineAssetManager = /** @type {import("../../../../../../src/mod.js").EngineAssetsManager} */ ({
		watchAsset(assetUuid, cb) {},
	});
	/** @type {Map<string, import("../../../../../../studio/src/assets/ProjectAsset.js").ProjectAsset<import("../../../../../../studio/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeUnknown>>} */
	const getProjectAssetFromUuidResults = new Map();
	const assetManager = /** @type {import("../../../../../../studio/src/assets/AssetManager.js").AssetManager} */ ({
		async getProjectAssetFromUuid(uuid) {
			if (!uuid) return null;
			return getProjectAssetFromUuidResults.get(uuid) || null;
		},
		async getAssetUuidFromPath(path) {
			for (const asset of getProjectAssetFromUuidResults.values()) {
				if (asset.path.join("/") == path.join("/")) return asset;
			}
			return null;
		},
	});
	mockStudioInstance.projectManager = /** @type {import("../../../../../../studio/src/projectSelector/ProjectManager.js").ProjectManager} */ ({
		async getAssetManager() {
			return assetManager;
		},
	});
	stub(mockWindowManager, "getContentWindows", function *getContentWindows() {});
	const preferencesFlushSpy = stub(mockWindowManager, "requestContentWindowPreferencesFlush");

	mockStudioInstance.preferencesManager.registerPreference("entityEditor.invertScrollOrbitX", {type: "boolean"});
	mockStudioInstance.preferencesManager.registerPreference("entityEditor.invertScrollOrbitY", {type: "boolean"});
	mockStudioInstance.preferencesManager.registerPreference("entityEditor.orbitLookPos", {type: "unknown"});
	mockStudioInstance.preferencesManager.registerPreference("entityEditor.orbitLookRot", {type: "unknown"});
	mockStudioInstance.preferencesManager.registerPreference("entityEditor.orbitLookDist", {type: "number"});
	mockStudioInstance.preferencesManager.registerPreference("entityEditor.loadedEntityPath", {type: "unknown"});

	return {
		args,
		mockStudioInstance,
		getProjectAssetFromUuidResults,
		preferencesFlushSpy,
		uninstall() {
			uninstallFakeDocument();
			requestAnimationFrameStub.restore();
		},
	};
}

Deno.test({
	name: "last loaded entity is saved and loaded",
	async fn() {
		const ENTITY_UUID = "entity uuid1";
		const ENTITY_PATH = ["path", "to", "entity"];
		const {args, preferencesFlushSpy, getProjectAssetFromUuidResults, uninstall} = basicTest();
		try {
			const {projectAsset: entityProjectAsset} = createMockProjectAsset({
				uuid: ENTITY_UUID,
				path: ENTITY_PATH,
			});
			getProjectAssetFromUuidResults.set(ENTITY_UUID, entityProjectAsset);
			const contentWindow1 = new ContentWindowEntityEditor(...args);

			await contentWindow1.loadEntityAsset(ENTITY_UUID, false);

			assertSpyCalls(preferencesFlushSpy, 1);
			assertEquals(contentWindow1.editingEntityUuid, ENTITY_UUID);

			const preferencesData = contentWindow1.getProjectPreferencesLocationData();
			assertExists(preferencesData);
			contentWindow1.destructor();

			const contentWindow2 = new ContentWindowEntityEditor(...args);
			contentWindow2.setProjectPreferencesLocationData(preferencesData);
			// Wait for the entity to load
			await waitForMicrotasks();
			assertEquals(contentWindow1.editingEntityUuid, ENTITY_UUID);
		} finally {
			uninstall();
		}
	},
});
