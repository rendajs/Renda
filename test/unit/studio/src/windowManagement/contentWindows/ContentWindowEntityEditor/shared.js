import {getMockArgs} from "../shared.js";
import {FakeHtmlElement} from "fake-dom/FakeHtmlElement.js";
import {stub} from "std/testing/mock.ts";
import {SelectionManager} from "../../../../../../../studio/src/misc/SelectionManager.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {EntityAssetManager} from "../../../../../../../studio/src/assets/EntityAssetManager.js";
import {Entity} from "../../../../../../../src/mod.js";
import {createMockProjectAsset} from "../../../../shared/createMockProjectAsset.js";

export const BASIC_ENTITY_UUID = "entity uuid1";
export const BASIC_ENTITY_PATH = ["path", "to", "entity"];

export function basicTest() {
	installFakeDocument();
	const requestAnimationFrameStub = stub(window, "requestAnimationFrame");
	const {args, mockWindowManager, mockStudioInstance} = getMockArgs();
	mockStudioInstance.renderer = /** @type {import("../../../../../../../src/mod.js").WebGpuRenderer} */ ({
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
	mockStudioInstance.engineAssetManager = /** @type {import("../../../../../../../src/mod.js").EngineAssetsManager} */ ({
		watchAsset(assetUuid, options, cb) {},
	});
	/** @type {Map<string, import("../../../../../../../studio/src/assets/ProjectAsset.js").ProjectAsset<import("../../../../../../../studio/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeUnknown>>} */
	const getProjectAssetFromUuidResults = new Map();
	const assetManager = /** @type {import("../../../../../../../studio/src/assets/AssetManager.js").AssetManager} */ ({
		async getProjectAssetFromUuid(uuid) {
			if (!uuid) return null;
			return getProjectAssetFromUuidResults.get(uuid) || null;
		},
		async getAssetUuidFromPath(path) {
			for (const asset of getProjectAssetFromUuidResults.values()) {
				if (asset.path.join("/") == path.join("/")) return asset.uuid;
			}
			return null;
		},
		async getLiveAsset(uuid) {
			if (!uuid) return null;
			const projectAsset = getProjectAssetFromUuidResults.get(uuid);
			return projectAsset?.getLiveAsset();
		},
	});
	assetManager.entityAssetManager = new EntityAssetManager(assetManager);
	mockStudioInstance.projectManager = /** @type {import("../../../../../../../studio/src/projectSelector/ProjectManager.js").ProjectManager} */ ({
		async getAssetManager() {
			return assetManager;
		},
		assetManager,
		onAssetManagerChange(cb) {},
		removeOnAssetManagerChange(cb) {},
	});
	stub(mockWindowManager, "getContentWindows", function *getContentWindows() {});
	const preferencesFlushSpy = stub(mockWindowManager, "requestContentWindowPreferencesFlush");

	mockStudioInstance.preferencesManager.registerPreference("entityEditor.autosaveEntities", {type: "boolean"});
	mockStudioInstance.preferencesManager.registerPreference("entityEditor.showGrid", {type: "boolean"});
	mockStudioInstance.preferencesManager.registerPreference("entityEditor.invertScrollOrbitX", {type: "boolean"});
	mockStudioInstance.preferencesManager.registerPreference("entityEditor.invertScrollOrbitY", {type: "boolean"});
	mockStudioInstance.preferencesManager.registerPreference("entityEditor.orbitLookPos", {
		type: "unknown",
		default: [0, 0, 0],
	});
	mockStudioInstance.preferencesManager.registerPreference("entityEditor.orbitLookRot", {
		type: "unknown",
		default: [0.13806283196906857, 0.37838630992789435, -0.057187497461225936, 0.9135053612442318],
	});
	mockStudioInstance.preferencesManager.registerPreference("entityEditor.orbitLookDist", {
		type: "number",
		default: 0,
	});
	mockStudioInstance.preferencesManager.registerPreference("entityEditor.loadedEntityPath", {type: "unknown"});

	const entity = new Entity("editing entity");
	assetManager.entityAssetManager.setLinkedAssetUuid(entity, BASIC_ENTITY_UUID);

	const {projectAsset: entityProjectAsset} = createMockProjectAsset({
		uuid: BASIC_ENTITY_UUID,
		path: BASIC_ENTITY_PATH,
		liveAsset: entity,
	});
	getProjectAssetFromUuidResults.set(BASIC_ENTITY_UUID, entityProjectAsset);

	return {
		args,
		mockStudioInstance,
		getProjectAssetFromUuidResults,
		preferencesFlushSpy,
		assetManager,
		uninstall() {
			uninstallFakeDocument();
			requestAnimationFrameStub.restore();
		},
	};
}
