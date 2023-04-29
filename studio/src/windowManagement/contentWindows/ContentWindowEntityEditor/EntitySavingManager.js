import {SingleInstancePromise} from "../../../../../src/mod.js";
import {Button} from "../../../ui/Button.js";

export class EntitySavingManager {
	#entityDirty = false;
	#isSavingAsset = false;

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
			const autosave = this.#getAutosaveValue();
			this.saveEntityButton.setVisibility(!autosave);
		});

		this.saveEntityAssetInstance = new SingleInstancePromise(async () => {
			if (!this.entityEditor.editingEntityUuid) return;

			this.#isSavingAsset = true;
			this.#updateSaveButtonDisabled();

			const assetManager = await this.studioInstance.projectManager.getAssetManager();
			const asset = await assetManager.getProjectAssetFromUuid(this.entityEditor.editingEntityUuid);
			if (asset) await asset.saveLiveAssetData();

			this.#isSavingAsset = false;
			this.#entityDirty = false;
			this.#updateSaveButtonDisabled();
		});
	}

	#getAutosaveValue() {
		return this.studioInstance.preferencesManager.get("entityEditor.autosaveEntities", {
			contentWindowUuid: this.entityEditor.uuid,
		});
	}

	/**
	 * Mark the currently editing entity as containing unsaved changes.
	 * This enables the 'save' button or autosaves when autosave is enabled.
	 */
	setEntityDirty(dirty = true) {
		this.#entityDirty = dirty;
		if (dirty && this.#getAutosaveValue()) {
			this.saveEntityAssetInstance.run();
		}
		this.#updateSaveButtonDisabled();
	}

	#updateSaveButtonDisabled() {
		const disabled = !this.entityEditor.editingEntityUuid || this.#isSavingAsset || !this.#entityDirty;
		this.saveEntityButton.setDisabled(disabled);
	}
}
