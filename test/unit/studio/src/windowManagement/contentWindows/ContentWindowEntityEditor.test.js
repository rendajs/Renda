import {getMockArgs} from "./shared.js";
import {ContentWindowEntityEditor} from "../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor.js";
import {FakeHtmlElement} from "fake-dom/FakeHtmlElement.js";
import {assertSpyCalls, stub} from "std/testing/mock.ts";
import {FakeTime} from "std/testing/time.ts";
import {SelectionManager} from "../../../../../../studio/src/misc/SelectionManager.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {createMockProjectAsset} from "../../../shared/createMockProjectAsset.js";
import {assertEquals, assertExists, assertStrictEquals} from "std/testing/asserts.ts";
import {Entity, Quat} from "../../../../../../src/mod.js";
import {assertQuatAlmostEquals, assertVecAlmostEquals} from "../../../../shared/asserts.js";

const BASIC_ENTITY_UUID = "entity uuid1";
const BASIC_ENTITY_PATH = ["path", "to", "entity"];

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
		watchAsset(assetUuid, options, cb) {},
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
				if (asset.path.join("/") == path.join("/")) return asset.uuid;
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
	name: "Has an empty entity by default",
	async fn() {
		const {args, uninstall} = basicTest();
		try {
			const contentWindow = new ContentWindowEntityEditor(...args);
			contentWindow.setProjectPreferencesLocationData({});

			assertExists(contentWindow.editingEntity);
			assertEquals(contentWindow.isEditingProjectEntity, false);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "last loaded entity and orbit controls are saved and loaded",
	async fn() {
		const {args, preferencesFlushSpy, getProjectAssetFromUuidResults, uninstall} = basicTest();
		const time = new FakeTime();
		try {
			const entity = new Entity();
			const {projectAsset: entityProjectAsset} = createMockProjectAsset({
				uuid: BASIC_ENTITY_UUID,
				path: BASIC_ENTITY_PATH,
				liveAsset: entity,
			});
			getProjectAssetFromUuidResults.set(BASIC_ENTITY_UUID, entityProjectAsset);
			const contentWindow1 = new ContentWindowEntityEditor(...args);
			contentWindow1.setProjectPreferencesLocationData({});

			await contentWindow1.loadEntityAsset(BASIC_ENTITY_UUID, false);
			assertSpyCalls(preferencesFlushSpy, 1);
			assertEquals(contentWindow1.editingEntityUuid, BASIC_ENTITY_UUID);
			assertStrictEquals(contentWindow1.editingEntity, entity);

			// Orbit controls should not be saved when nothing has changed
			contentWindow1.loop();
			await time.tickAsync(10_000);
			contentWindow1.loop();
			assertSpyCalls(preferencesFlushSpy, 1);

			const newLookRot = Quat.fromAxisAngle(0, 1, 0, Math.PI);

			contentWindow1.orbitControls.lookPos.set(1, 2, 3);
			contentWindow1.orbitControls.lookRot.set(newLookRot);
			contentWindow1.orbitControls.lookDist = 123;
			contentWindow1.loop();
			await time.tickAsync(10_000);
			contentWindow1.loop();
			assertSpyCalls(preferencesFlushSpy, 2);

			const preferencesData = contentWindow1.getProjectPreferencesLocationData();
			assertExists(preferencesData);
			contentWindow1.destructor();

			const contentWindow2 = new ContentWindowEntityEditor(...args);
			contentWindow2.setProjectPreferencesLocationData(preferencesData);
			// Wait for the entity to load
			await time.runMicrotasks();
			assertEquals(contentWindow1.editingEntityUuid, BASIC_ENTITY_UUID);
			assertStrictEquals(contentWindow1.editingEntity, entity);

			assertVecAlmostEquals(contentWindow2.orbitControls.lookPos, [1, 2, 3]);
			assertQuatAlmostEquals(contentWindow2.orbitControls.lookRot, newLookRot);
			assertEquals(contentWindow2.orbitControls.lookDist, 123);
		} finally {
			uninstall();
			time.restore();
		}
	},
});

Deno.test({
	name: "Orbit controls are not saved when editing a non project entity",
	async fn() {
		const {args, preferencesFlushSpy, uninstall} = basicTest();
		const time = new FakeTime();
		try {
			const contentWindow = new ContentWindowEntityEditor(...args);
			contentWindow.setProjectPreferencesLocationData({});

			// Orbit controls should not be saved when nothing has changed
			contentWindow.loop();
			await time.tickAsync(10_000);
			contentWindow.loop();

			const newLookRot = Quat.fromAxisAngle(0, 1, 0, Math.PI);

			contentWindow.orbitControls.lookPos.set(1, 2, 3);
			contentWindow.orbitControls.lookRot.set(newLookRot);
			contentWindow.orbitControls.lookDist = 123;
			contentWindow.loop();
			await time.tickAsync(10_000);
			contentWindow.loop();
			assertSpyCalls(preferencesFlushSpy, 0);

			// Double check that no preferences have been touched, otherwise they might
			// get written once preferences get flushed somewhere else.
			const preferencesData = contentWindow.getProjectPreferencesLocationData();
			assertEquals(preferencesData, null);
			contentWindow.destructor();
		} finally {
			uninstall();
			time.restore();
		}
	},
});
