import { SingleInstancePromise } from "../../../../../src/mod.js";
import { Button } from "../../../ui/Button.js";

export class EntitySavingManager {
	/** @typedef {import("../../../../../src/mod.js").Entity} Entity */

	/** @type {Set<Entity>} */
	#dirtyEntities = new Set();
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
		this.studioInstance.preferencesManager.onChange("entityEditor.autosaveEntities", this.entityEditor.uuid, () => {
			const autosave = this.#getAutosaveValue();
			this.saveEntityButton.setVisibility(!autosave);
		});

		this.saveEntityAssetInstance = new SingleInstancePromise(async () => {
			this.#isSavingAsset = true;
			this.#updateSaveButtonDisabled();

			const dirtyEntitiesCopy = [...this.#dirtyEntities];
			this.#dirtyEntities.clear();

			const assetManager = await this.studioInstance.projectManager.getAssetManager();
			/** @type {Set<import("../../../../../src/mod.js").UuidString>} */
			const dirtyUuids = new Set();
			for (const entity of dirtyEntitiesCopy) {
				const result = assetManager.entityAssetManager.findRootEntityAsset(entity);
				if (result) {
					dirtyUuids.add(result.uuid);
				}
			}

			const promises = [];
			for (const uuid of dirtyUuids) {
				promises.push((async () => {
					const asset = await assetManager.getProjectAssetFromUuid(uuid);
					if (asset) await asset.saveLiveAssetData();
				})());
			}
			await Promise.all(promises);

			this.#isSavingAsset = false;
			this.#updateSaveButtonDisabled();
		});

		this.#updateSaveButtonDisabled();
	}

	#getAutosaveValue() {
		return this.studioInstance.preferencesManager.get("entityEditor.autosaveEntities", this.entityEditor.uuid);
	}

	/**
	 * Mark the currently editing entity as containing unsaved changes.
	 * This enables the 'save' button or autosaves when autosave is enabled.
	 * @param {Entity} entity
	 */
	addDirtyEntity(entity) {
		this.#dirtyEntities.add(entity);
		if (this.#getAutosaveValue()) {
			this.saveEntityAssetInstance.run();
		}
		this.#updateSaveButtonDisabled();
	}

	clearDirtyEntities() {
		this.#dirtyEntities.clear();
		this.#updateSaveButtonDisabled();
	}

	#updateSaveButtonDisabled() {
		const disabled = this.#isSavingAsset || this.#dirtyEntities.size == 0;
		this.saveEntityButton.setDisabled(disabled);
	}
}
