import {SingleInstancePromise} from "../../../../../src/mod.js";
import {Button} from "../../../ui/Button.js";

export class EntitySavingManager {
	/**
	 * @param {import("../../../Studio.js").Studio} studioInstance
	 * @param {import("./ContentWindowEntityEditor.js").ContentWindowEntityEditor} entityEditor
	 */
	constructor(studioInstance, entityEditor) {
		this.studioInstance = studioInstance;
		this.entityEditor = entityEditor;

		this.saveEntityButton = new Button({
			text: "Save",
			onClick: () => {
				this.saveEntityAssetInstance.run();
			},
		});
		this.studioInstance.preferencesManager.onChange("entityEditor.autosaveEntities", () => {
			const autoSave = this.studioInstance.preferencesManager.get("entityEditor.autosaveEntities", {
				contentWindowUuid: this.entityEditor.uuid,
			});
			this.saveEntityButton.setVisibility(!autoSave);
		});

		this.saveEntityAssetInstance = new SingleInstancePromise(async () => {
			if (!this.entityEditor.editingEntityUuid) return;
			const assetManager = await this.studioInstance.projectManager.getAssetManager();
			const asset = await assetManager.getProjectAssetFromUuid(this.entityEditor.editingEntityUuid);
			if (!asset) return;
			await asset.saveLiveAssetData();
		});
	}
}
