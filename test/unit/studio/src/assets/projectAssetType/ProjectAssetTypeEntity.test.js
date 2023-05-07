import {assertEquals, assertExists, assertInstanceOf} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import "../../../shared/initializeStudio.js";
import {ProjectAssetTypeEntity} from "../../../../../../studio/src/assets/projectAssetType/ProjectAssetTypeEntity.js";
import {createMockProjectAsset} from "../../../shared/createMockProjectAsset.js";
import {Component, Entity, Mat4, MeshComponent} from "../../../../../../src/mod.js";
import {createMockDependencies, getMockRecursionTracker} from "./shared.js";
import {assertVecAlmostEquals} from "../../../../shared/asserts.js";
import {createTreeViewStructure} from "../../../../../../studio/src/ui/propertiesTreeView/createStructureHelpers.js";

const BASIC_ASSET_UUID = "00000000-0000-0000-0000-000000000000";
const BASIC_COMPONENT_UUID = "basic component uuid";

Deno.test({
	name: "getLiveAssetData basic entity",
	async fn() {
		const {projectAssetTypeArgs} = createMockDependencies();
		const recursionTracker = getMockRecursionTracker();
		const assetType = new ProjectAssetTypeEntity(...projectAssetTypeArgs);

		const result = await assetType.getLiveAssetData({
			name: "my entity",
			children: [
				{
					name: "child1",
					matrix: Mat4.createTranslation(1, 2, 3).getFlatArray(),
				},
				{
					name: "child2",
				},
			],
		}, recursionTracker);
		assertEquals(result.studioData, null);

		const entity = result.liveAsset;
		assertInstanceOf(entity, Entity);
		assertEquals(entity.name, "my entity");
		assertEquals(entity.childCount, 2);
		assertEquals(entity.children[0].name, "child1");
		assertVecAlmostEquals(entity.children[0].pos, [1, 2, 3]);
		assertEquals(entity.children[1].name, "child2");
		assertVecAlmostEquals(entity.children[1].pos, [0, 0, 0]);
	},
});

Deno.test({
	name: "getLiveAssetData entity with component",
	async fn() {
		const {projectAssetTypeArgs, studio} = createMockDependencies();
		const recursionTracker = getMockRecursionTracker();
		const assetType = new ProjectAssetTypeEntity(...projectAssetTypeArgs);

		class FooComponent extends Component {
			/**
			 * @override
			 */
			static get guiStructure() {
				return createTreeViewStructure({
					foo: {
						type: "string",
					},
				});
			}

			/**
			 * @param {import("../../../../../../src/components/types.js").ComponentPropertyValues<any>} propertyValues
			 * @param {import("../../../../../../src/components/Component.js").ComponentConstructorRestArgs} args
			 */
			constructor(propertyValues = {}, ...args) {
				super();

				this.foo = "bar";

				this.initValues(propertyValues, ...args);
			}
		}

		studio.componentTypeManager = /** @type {import("../../../../../../src/components/ComponentTypeManager.js").ComponentTypeManager} */ ({});
		stub(studio.componentTypeManager, "getComponentConstructorForUuid", uuid => {
			if (uuid == BASIC_COMPONENT_UUID) {
				return FooComponent;
			}
			throw new Error("component uuid not found in test: " + uuid);
		});

		const result = await assetType.getLiveAssetData({
			components: [
				{
					uuid: BASIC_COMPONENT_UUID,
					propertyValues: {
						foo: "baz",
					},
				},
			],
		}, recursionTracker);

		assertEquals(result.liveAsset.components.length, 1);
		const component = result.liveAsset.components[0];
		assertInstanceOf(component, FooComponent);
		assertEquals(component.foo, "baz");
	},
});

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
	const mockStudioInstance = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({
		windowManager: {
			*getContentWindows(type) {
				if (type == "renda:entityEditor") {
					const w = /** @type {import("../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js").ContentWindowEntityEditor} */ ({
						markRenderDirty() {
							markRenderDirtyCalled = true;
						},
					});
					yield w;
				}
			},
		},
	});

	const assetType = new ProjectAssetTypeEntity(mockStudioInstance, /** @type {any} */ ({}), /** @type {any} */ ({}), /** @type {any} */ ({}));

	assetType.fillComponentPropertyValueFromJson(newComponentData, originalComponentData, "mesh", "droppable", {}, /** @type {any} */ (fakeRecursionTracker));

	fakeRecursionTracker.onChangeCbs.forEach(cb => cb(replacedMesh));

	assertEquals(newComponentData.mesh, replacedMesh);
	assertEquals(markRenderDirtyCalled, true);
});

async function basicSetupForAssetLoaderImportConfig({
	usedAssets = /** @type {import("../../../../../../studio/src/assets/ProjectAsset.js").ProjectAssetAny[]} */ ([]),
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
		studio: /** @type {any} */ ({
			componentTypeManager: {
				*getAllComponents() {
					yield MeshComponent;
				},
			},
		}),
		assetManager: /** @type {any} */ ({}),
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
		const castRootEntity = /** @type {import("../../../../../../studio/src/assets/EntityAssetManager.js").EntityWithAssetRootUuid} */ (rootEntity);
		castRootEntity[entityAssetRootUuidSymbol] = BASIC_ASSET_UUID;
		rootEntity.addComponent(MeshComponent);

		const childEntity = new Entity();
		rootEntity.add(childEntity);
		const castChildEntity = /** @type {import("../../../../../../studio/src/assets/EntityAssetManager.js").EntityWithAssetRootUuid} */ (childEntity);
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
