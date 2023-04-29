import {AssertionError, assertEquals} from "std/testing/asserts.ts";
import {EntitySavingManager} from "../../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/EntitySavingManager.js";
import {runWithDom, runWithDomAsync} from "../../../../shared/runWithDom.js";
import {createPreferencesManager} from "../../../../shared/createPreferencesManager.js";
import {createMockProjectAsset} from "../../../../shared/createMockProjectAsset.js";
import {assertSpyCalls, spy} from "std/testing/mock.ts";
import {waitForMicrotasks} from "../../../../../shared/waitForMicroTasks.js";

const BASIC_EDITING_ENTITY_UUID = "editing entity uuid";

function getMockArgs() {
	const {preferencesManager, preferencesManagerAny} = createPreferencesManager({
		"entityEditor.autosaveEntities": {type: "boolean", default: true},
	});

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
	const mockWindow = /** @type {import("../../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js").ContentWindowEntityEditor} */ ({});

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
