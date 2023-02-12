import {assertEquals, assertExists} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import "../../../shared/initializeEditor.js";
import {ProjectAssetTypeEntity, entityAssetRootUuidSymbol} from "../../../../../../editor/src/assets/projectAssetType/ProjectAssetTypeEntity.js";
import {ContentWindowEntityEditor} from "../../../../../../editor/src/windowManagement/contentWindows/ContentWindowEntityEditor.js";
import {createMockProjectAsset} from "../../../shared/createMockProjectAsset.js";
import {Entity, MeshComponent} from "../../../../../../src/mod.js";

const BASIC_ASSET_UUID = "00000000-0000-0000-0000-000000000000";

Deno.test("reload component values when changed", async () => {
	const initialMesh = {};
	const replacedMesh = {};

	class FakeRecursionTracker {
		/** @type {Set<(mesh: {} | null) => void>} */
		onChangeCbs = new Set();
		/**
		 * @param {import("../../../../../../src/util/mod.js").UuidString} uuid
		 * @param {(mesh: {}?) => void} cb
		 */
		getLiveAsset(uuid, cb, {repeatOnLiveAssetChange = false}) {
			if (uuid == BASIC_ASSET_UUID) {
				cb(initialMesh);
			} else {
				cb(null);
			}
			this.onChangeCbs.add(cb);
		}
	}

	const originalComponentData = {
		mesh: BASIC_ASSET_UUID,
	};
	/** @type {any} */
	const newComponentData = {};
	const fakeRecursionTracker = new FakeRecursionTracker();

	let markRenderDirtyCalled = false;
	const mockEditorInstance = /** @type {import("../../../../../../editor/src/Editor.js").Editor} */ ({
		windowManager: {
			*getContentWindowsByConstructor(windowConstructor) {
				if (windowConstructor == /** @type {any} */ (ContentWindowEntityEditor)) {
					const w = /** @type {ContentWindowEntityEditor} */ ({
						markRenderDirty() {
							markRenderDirtyCalled = true;
						},
					});
					yield w;
				}
			},
		},
	});

	const assetType = new ProjectAssetTypeEntity(mockEditorInstance, /** @type {any} */ ({}), /** @type {any} */ ({}), /** @type {any} */ ({}));

	assetType.fillComponentPropertyValueFromJson(newComponentData, originalComponentData, "mesh", "droppable", {}, /** @type {any} */ (fakeRecursionTracker));

	fakeRecursionTracker.onChangeCbs.forEach(cb => cb(replacedMesh));

	assertEquals(newComponentData.mesh, replacedMesh);
	assertEquals(markRenderDirtyCalled, true);
});

async function basicSetupForAssetLoaderImportConfig({
	usedAssets = /** @type {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAssetAny[]} */ ([]),
	includeAll = false,
} = {}) {
	/**
	 * @param {string} identifier
	 * @param {string} specifier
	 */
	function addImport(identifier, specifier) {}
	const addImportSpy = spy(addImport);

	assertExists(ProjectAssetTypeEntity.assetLoaderTypeImportConfig.extra);
	const result = await ProjectAssetTypeEntity.assetLoaderTypeImportConfig.extra({
		addImport: addImportSpy,
		editor: /** @type {any} */ ({
			componentTypeManager: {
				*getAllComponents() {
					yield MeshComponent;
				},
			},
		}),
		usedAssets,
		includeAll,
	});

	return {
		addImportSpy,
		result,
	};
}

Deno.test({
	name: "assetLoaderTypeImportConfig extra no assets",
	async fn() {
		const {addImportSpy, result} = await basicSetupForAssetLoaderImportConfig();

		assertEquals(result, `const componentTypeManager = new ComponentTypeManager();
entityLoader.setComponentTypeManager(componentTypeManager);`);

		assertSpyCalls(addImportSpy, 1);
		assertSpyCall(addImportSpy, 0, {
			args: ["ComponentTypeManager", "renda"],
		});
	},
});

Deno.test({
	name: "assetLoaderTypeImportConfig extra with assets",
	async fn() {
		const rootEntity = new Entity();
		const castRootEntity = /** @type {import("../../../../../../editor/src/assets/projectAssetType/ProjectAssetTypeEntity.js").EntityWithAssetRootUuid} */ (rootEntity);
		castRootEntity[entityAssetRootUuidSymbol] = BASIC_ASSET_UUID;
		rootEntity.addComponent(MeshComponent);

		const childEntity = new Entity();
		rootEntity.add(childEntity);
		const castChildEntity = /** @type {import("../../../../../../editor/src/assets/projectAssetType/ProjectAssetTypeEntity.js").EntityWithAssetRootUuid} */ (childEntity);
		castChildEntity[entityAssetRootUuidSymbol] = "non root uuid";

		const {projectAsset} = createMockProjectAsset({
			liveAsset: rootEntity,
		});
		const {addImportSpy, result} = await basicSetupForAssetLoaderImportConfig({
			usedAssets: [projectAsset],
		});

		assertEquals(result, `const componentTypeManager = new ComponentTypeManager();
entityLoader.setComponentTypeManager(componentTypeManager);
componentTypeManager.registerComponent(MeshComponent);`);

		assertSpyCalls(addImportSpy, 2);
		assertSpyCall(addImportSpy, 0, {
			args: ["ComponentTypeManager", "renda"],
		});
		assertSpyCall(addImportSpy, 1, {
			args: ["MeshComponent", "renda"],
		});
	},
});

Deno.test({
	name: "includeAll",
	async fn() {
		const {result, addImportSpy} = await basicSetupForAssetLoaderImportConfig({
			includeAll: true,
		});

		assertEquals(result, `const componentTypeManager = new ComponentTypeManager();
entityLoader.setComponentTypeManager(componentTypeManager);
componentTypeManager.registerComponent(MeshComponent);`);
		assertSpyCalls(addImportSpy, 2);
		assertSpyCall(addImportSpy, 0, {
			args: ["ComponentTypeManager", "renda"],
		});
		assertSpyCall(addImportSpy, 1, {
			args: ["MeshComponent", "renda"],
		});
	},
});
