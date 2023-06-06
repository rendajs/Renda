import {AssertionError, assertEquals} from "std/testing/asserts.ts";
import {EntitySavingManager} from "../../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/EntitySavingManager.js";
import {runWithDom, runWithDomAsync} from "../../../../shared/runWithDom.js";
import {createPreferencesManager} from "../../../../shared/createPreferencesManager.js";
import {createMockProjectAsset} from "../../../../shared/createMockProjectAsset.js";
import {assertSpyCalls, spy} from "std/testing/mock.ts";
import {waitForMicrotasks} from "../../../../../shared/waitForMicroTasks.js";
import {ContentWindowPreferencesLocation} from "../../../../../../../studio/src/preferences/preferencesLocation/ContentWindowPreferencesLocation.js";
import {DEFAULT_CONTENT_WINDOW_UUID} from "../shared.js";

const BASIC_EDITING_ENTITY_UUID = "editing entity uuid";

function getMockArgs() {
	const {preferencesManager, preferencesManagerAny} = createPreferencesManager({
		"entityEditor.autosaveEntities": {type: "boolean", default: true},
	});

	const mockWindowManager = /** @type {import("../../../../../../../studio/src/windowManagement/WindowManager.js").WindowManager} */ ({});
	preferencesManager.addLocation(new ContentWindowPreferencesLocation("contentwindow-project", mockWindowManager, DEFAULT_CONTENT_WINDOW_UUID));

	const {projectAsset: editingEntityAsset} = createMockProjectAsset();
	const saveLiveAssetDataSpy = spy(editingEntityAsset, "saveLiveAssetData");

	const mockStudio = /** @type {import("../../../../../../../studio/src/Studio.js").Studio} */ ({
		preferencesManager: preferencesManagerAny,
		projectManager: {
			async getAssetManager() {
				const assetManager = /** @type {import("../../../../../../../studio/src/assets/AssetManager.js").AssetManager} */ ({
					async getProjectAssetFromUuid(uuid) {
						if (uuid == BASIC_EDITING_ENTITY_UUID) {
							return editingEntityAsset;
						}
						throw new AssertionError("Unexpected asset uuid passed");
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
		mockWindow,
		preferencesManager,
		saveLiveAssetDataSpy,
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
			const {args, preferencesManager, mockWindow, saveLiveAssetDataSpy} = getMockArgs();

			const manager = new EntitySavingManager(...args);
			preferencesManager.set("entityEditor.autosaveEntities", false);
			mockWindow.editingEntityUuid = BASIC_EDITING_ENTITY_UUID;

			manager.saveEntityButton.click();
			await waitForMicrotasks();

			assertSpyCalls(saveLiveAssetDataSpy, 1);
		});
	},
});

Deno.test({
	name: "Button is only enabled when entity is savable",
	fn() {
		runWithDom(() => {
			const {args, mockWindow, preferencesManager} = getMockArgs();

			const manager = new EntitySavingManager(...args);
			preferencesManager.set("entityEditor.autosaveEntities", false);

			manager.setEntityDirty(true);
			assertEquals(manager.saveEntityButton.disabled, true);

			mockWindow.editingEntityUuid = BASIC_EDITING_ENTITY_UUID;
			manager.setEntityDirty(true);
			assertEquals(manager.saveEntityButton.disabled, false);
		});
	},
});

Deno.test({
	name: "Button becomes disabled when there is nothing to save",
	async fn() {
		await runWithDomAsync(async () => {
			const {args, mockWindow, preferencesManager} = getMockArgs();

			const manager = new EntitySavingManager(...args);
			preferencesManager.set("entityEditor.autosaveEntities", false);
			mockWindow.editingEntityUuid = BASIC_EDITING_ENTITY_UUID;

			manager.setEntityDirty(true);
			assertEquals(manager.saveEntityButton.disabled, false);

			manager.saveEntityButton.click();
			await manager.saveEntityAssetInstance.waitForFinishIfRunning();

			assertEquals(manager.saveEntityButton.disabled, true);

			// Making changes to the entity should enable it again
			manager.setEntityDirty(true);
			assertEquals(manager.saveEntityButton.disabled, false);
		});
	},
});

Deno.test({
	name: "Entities are autosaved when making changes",
	async fn() {
		await runWithDomAsync(async () => {
			const {args, saveLiveAssetDataSpy, mockWindow, preferencesManager} = getMockArgs();

			const manager = new EntitySavingManager(...args);
			preferencesManager.set("entityEditor.autosaveEntities", true);
			mockWindow.editingEntityUuid = BASIC_EDITING_ENTITY_UUID;

			assertSpyCalls(saveLiveAssetDataSpy, 0);

			manager.setEntityDirty(true);
			await waitForMicrotasks();

			assertSpyCalls(saveLiveAssetDataSpy, 1);
		});
	},
});

Deno.test({
	name: "Loading a new entity should disable the button",
	async fn() {
		await runWithDomAsync(async () => {
			const {args, mockWindow, preferencesManager} = getMockArgs();

			const manager = new EntitySavingManager(...args);
			preferencesManager.set("entityEditor.autosaveEntities", false);
			mockWindow.editingEntityUuid = BASIC_EDITING_ENTITY_UUID;

			manager.setEntityDirty(true);
			assertEquals(manager.saveEntityButton.disabled, false);

			manager.setEntityDirty(false);
			assertEquals(manager.saveEntityButton.disabled, true);
		});
	},
});
