import {PropertiesTreeView} from "./PropertiesTreeView/PropertiesTreeView.js";

/**
 * @template {import("./PropertiesTreeView/types.js").PropertiesTreeViewStructure} T
 * @typedef {Object} ObjectGuiOptionsType
 * @property {T} [structure]
 * @property {import("./PropertiesTreeView/types.js").StructureToSetObject<T>} [value]
 */
/**
 * @template {import("./PropertiesTreeView/types.js").PropertiesTreeViewStructure} T
 * @typedef {import("./PropertiesTreeView/types.js").GuiOptionsBase & ObjectGuiOptionsType<T>} ObjectGuiOptions
 */

/**
 * @template TOpts
 * @typedef {TOpts extends {structure: infer S} ?
 * 	S extends import("./PropertiesTreeView/types.js").PropertiesTreeViewStructure ?
 * 		S :
 * 		never :
 * 	never} GuiOptionsToTemplate
 */

/**
 * @template TOpts
 * @typedef {ObjectGui<GuiOptionsToTemplate<TOpts>>} GetObjectGuiForOptions
 */

/**
 * @template TObjectGuiInstance
 * @template TOpts
 * @typedef {TObjectGuiInstance extends ObjectGui<infer TStructure> ?
 * 		import("./PropertiesTreeView/types.js").GetStructureValuesReturnType<TStructure, TOpts> :
 * 		never} GetObjectValueTypeForOptions
 */

/**
 * @template {import("./PropertiesTreeView/types.js").PropertiesTreeViewStructure} T
 */
export class ObjectGui {
	/**
	 * @typedef {(value: import("./PropertiesTreeView/types.js").GetStructureValuesReturnType<T, {}>) => void} OnValueChangeCallback
	 */

	/**
	 * @param {ObjectGuiOptions<T>} options
	 */
	constructor({
		structure = /** @type {T} */ ({}),
		value = /** @type {import("./PropertiesTreeView/types.js").StructureToSetObject<T>} */ ({}),
		disabled = false,
	} = {}) {
		this.disabled = false;
		this.structure = structure;
		this.treeView = PropertiesTreeView.withStructure(structure);
		/** @type {Set<OnValueChangeCallback>} */
		this.onValueChangeCbs = new Set();
		this.treeView.onChildValueChange(() => {
			this.fireValueChange();
		});

		this.setValue(value);
		if (disabled) this.setDisabled(true);
	}

	/**
	 * @param {import("./PropertiesTreeView/types.js").StructureToSetObject<T>} value
	 * @param {import("./PropertiesTreeView/types.js").AllPossibleSetValueOpts} [setValueOpts]
	 */
	setValue(value, setValueOpts) {
		this.treeView.fillSerializableStructureValues(value, setValueOpts);
	}

	/**
	 * @template {import("./PropertiesTreeView/types.js").AllPossibleGetValueOpts} [TGuiOpts = {}]
	 * @param {TGuiOpts} [guiOpts]
	 * @returns {import("./PropertiesTreeView/types.js").GetStructureValuesReturnType<T, TGuiOpts>}
	 */
	getValue(guiOpts) {
		const result = this.treeView.getSerializableStructureValues(this.structure, guiOpts);
		return /** @type {import("./PropertiesTreeView/types.js").GetStructureValuesReturnType<T, TGuiOpts>} */ (result);
	}

	get value() {
		return this.getValue();
	}

	/**
	 * @param {OnValueChangeCallback} cb
	 */
	onValueChange(cb) {
		this.onValueChangeCbs.add(cb);
	}

	fireValueChange() {
		const value = this.value;
		for (const cb of this.onValueChangeCbs) {
			cb(value);
		}
	}

	/**
	 * @param {boolean} disabled
	 */
	setDisabled(disabled) {
		this.disabled = disabled;
		this.treeView.setFullTreeDisabled(disabled);
	}
}
