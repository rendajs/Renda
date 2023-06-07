import {AssertionError, assertEquals} from "std/testing/asserts.ts";
import {EntitySavingManager} from "../../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/EntitySavingManager.js";
import {runWithDom, runWithDomAsync} from "../../../../shared/runWithDom.js";
import {createPreferencesManager} from "../../../../shared/createPreferencesManager.js";
import {createMockProjectAsset} from "../../../../shared/createMockProjectAsset.js";
import {assertSpyCalls, stub} from "std/testing/mock.ts";
import {waitForMicrotasks} from "../../../../../shared/waitForMicroTasks.js";
import {ContentWindowPreferencesLocation} from "../../../../../../../studio/src/preferences/preferencesLocation/ContentWindowPreferencesLocation.js";
import {DEFAULT_CONTENT_WINDOW_UUID} from "../shared.js";
import {Entity} from "../../../../../../../src/mod.js";

const BASIC_EDITING_ENTITY_UUID = "editing entity uuid";

function getMockArgs() {
	const {preferencesManager, preferencesManagerAny} = createPreferencesManager({
		"entityEditor.autosaveEntities": {type: "boolean", default: true},
	});

	const mockWindowManager = /** @type {import("../../../../../../../studio/src/windowManagement/WindowManager.js").WindowManager} */ ({});
	preferencesManager.addLocation(new ContentWindowPreferencesLocation("contentwindow-project", mockWindowManager, DEFAULT_CONTENT_WINDOW_UUID));

	/** @type {{uuid: import("../../../../../../../src/mod.js").UuidString, entity: Entity, asset: import("../../../../../../../studio/src/assets/ProjectAsset.js").ProjectAssetAny}[]} */
	const editingEntities = [];

	/**
	 * @param {import("../../../../../../../src/mod.js").UuidString} uuid
	 * @param {Entity} entity
	 */
	function addEntityAsset(uuid, entity, {
		autoResolveSaveLiveAssetData = true,
	} = {}) {
		const {projectAsset: editingEntityAsset} = createMockProjectAsset();
		let resolveFn = () => {};
		const saveLiveAssetDataSpy = stub(editingEntityAsset, "saveLiveAssetData", () => {
			if (autoResolveSaveLiveAssetData) return Promise.resolve();
			/** @type {Promise<void>} */
			const promise = new Promise(resolve => {
				resolveFn = resolve;
			});
			return promise;
		});
		editingEntities.push({
			uuid,
			entity,
			asset: editingEntityAsset,
		});
		return {
			saveLiveAssetDataSpy,
			resolveSaveLiveAssetData() {
				resolveFn();
			},
		};
	}
	const editingEntity = new Entity();

	const {saveLiveAssetDataSpy} = addEntityAsset(BASIC_EDITING_ENTITY_UUID, editingEntity);

	const mockStudio = /** @type {import("../../../../../../../studio/src/Studio.js").Studio} */ ({
		preferencesManager: preferencesManagerAny,
		projectManager: {
			async getAssetManager() {
				const assetManager = /** @type {import("../../../../../../../studio/src/assets/AssetManager.js").AssetManager} */ ({
					async getProjectAssetFromUuid(uuid) {
						const data = editingEntities.find(data => data.uuid == uuid);
						if (data) {
							return data.asset;
						}
						throw new AssertionError("Unexpected asset uuid passed");
					},
					entityAssetManager: {
						findRootEntityAsset(entity) {
							const data = editingEntities.find(data => data.entity == entity);
							if (data) {
								return {uuid: data.uuid};
							}
							return null;
						},
					},
				});
				return assetManager;
			},
		},
	});
	const mockWindow = /** @type {import("../../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js").ContentWindowEntityEditor} */ ({
		uuid: DEFAULT_CONTENT_WINDOW_UUID,
	});

	/** @type {ConstructorParameters<typeof EntitySavingManager>} */
	const args = [
		mockStudio,
		mockWindow,
	];

	return {
		args,
		preferencesManager,
		saveLiveAssetDataSpy,
		editingEntity,
		addEntityAsset,
	};
}

Deno.test({
	name: "Save button is hidden when autosave is enabled",
	async fn() {
		runWithDom(() => {
			const {args, preferencesManager} = getMockArgs();

			const manager = new EntitySavingManager(...args);
			assertEquals(manager.saveEntityButton.visible, false);

			preferencesManager.set("entityEditor.autosaveEntities", false);
			assertEquals(manager.saveEntityButton.visible, true);
		});
	},
});

Deno.test({
	name: "Entity is saved when clicking the button",
	async fn() {
		await runWithDomAsync(async () => {
			const {args, editingEntity, preferencesManager, saveLiveAssetDataSpy} = getMockArgs();

			const manager = new EntitySavingManager(...args);
			preferencesManager.set("entityEditor.autosaveEntities", false);

			manager.addDirtyEntity(editingEntity);

			manager.saveEntityButton.click();
			await waitForMicrotasks();

			assertSpyCalls(saveLiveAssetDataSpy, 1);
		});
	},
});

Deno.test({
	name: "Button becomes disabled when there is nothing to save",
	async fn() {
		await runWithDomAsync(async () => {
			const {args, preferencesManager} = getMockArgs();

			const manager = new EntitySavingManager(...args);
			preferencesManager.set("entityEditor.autosaveEntities", false);

			const entity = new Entity();
			manager.addDirtyEntity(entity);
			assertEquals(manager.saveEntityButton.disabled, false);

			manager.saveEntityButton.click();
			await manager.saveEntityAssetInstance.waitForFinishIfRunning();

			assertEquals(manager.saveEntityButton.disabled, true);

			// Making changes to the entity should enable it again
			manager.addDirtyEntity(entity);
			assertEquals(manager.saveEntityButton.disabled, false);
		});
	},
});

Deno.test({
	name: "Entities are autosaved when making changes",
	async fn() {
		await runWithDomAsync(async () => {
			const {args, editingEntity, saveLiveAssetDataSpy, preferencesManager} = getMockArgs();

			const manager = new EntitySavingManager(...args);
			preferencesManager.set("entityEditor.autosaveEntities", true);

			assertSpyCalls(saveLiveAssetDataSpy, 0);

			manager.addDirtyEntity(editingEntity);
			await waitForMicrotasks();

			assertSpyCalls(saveLiveAssetDataSpy, 1);
		});
	},
});

Deno.test({
	name: "Loading a new entity should disable the button",
	async fn() {
		await runWithDomAsync(async () => {
			const {args, editingEntity, preferencesManager} = getMockArgs();

			const manager = new EntitySavingManager(...args);
			preferencesManager.set("entityEditor.autosaveEntities", false);

			manager.addDirtyEntity(editingEntity);
			assertEquals(manager.saveEntityButton.disabled, false);

			manager.clearDirtyEntities();
			assertEquals(manager.saveEntityButton.disabled, true);
		});
	},
});

Deno.test({
	name: "Marking an entity as dirty while another is being saved still saves it in a second pass",
	async fn() {
		await runWithDomAsync(async () => {
			const {args, addEntityAsset, preferencesManager} = getMockArgs();

			const entity1 = new Entity();
			const uuid1 = "editing entity 1";
			const {saveLiveAssetDataSpy: saveLiveAssetDataSpy1, resolveSaveLiveAssetData: resolve1} = addEntityAsset(uuid1, entity1, {autoResolveSaveLiveAssetData: false});

			const entity2 = new Entity();
			const uuid2 = "editing entity 2";
			const {saveLiveAssetDataSpy: saveLiveAssetDataSpy2} = addEntityAsset(uuid2, entity2);

			const manager = new EntitySavingManager(...args);
			preferencesManager.set("entityEditor.autosaveEntities", true);

			assertSpyCalls(saveLiveAssetDataSpy1, 0);

			manager.addDirtyEntity(entity1);
			await waitForMicrotasks();
			assertSpyCalls(saveLiveAssetDataSpy1, 1);

			manager.addDirtyEntity(entity2);
			await waitForMicrotasks();

			assertSpyCalls(saveLiveAssetDataSpy2, 0);
			resolve1();
			await waitForMicrotasks();
			assertSpyCalls(saveLiveAssetDataSpy2, 1);
		});
	},
});
