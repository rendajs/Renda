import {PropertiesTreeView} from "./propertiesTreeView/PropertiesTreeView.js";
import {ButtonGroup} from "./ButtonGroup.js";
import {Button} from "./Button.js";

/**
 * @template {import("./propertiesTreeView/types.ts").GuiTypes} T
 * @typedef {T extends import("./propertiesTreeView/types.ts").GuiTypes ?
 * 	{
 * 		arrayType: T,
 * 		arrayGuiOpts?: import("./propertiesTreeView/types.ts").GetGuiOptions<T>,
 * 		value?: any[],
 * 	} :
 * never} ArrayGuiOptionsType
 */
/**
 * @template {import("./propertiesTreeView/types.ts").GuiTypes} T
 * @typedef {import("./propertiesTreeView/types.ts").GuiOptionsBase & ArrayGuiOptionsType<T>} ArrayGuiOptions
 */

/**
 * @template TOpts
 * @typedef {TOpts extends ArrayGuiOptions<import("./propertiesTreeView/types.ts").GuiTypes> ? ArrayGui<TOpts> : never} GetArrayGuiForOptions
 */

/**
 * @template TObjectGuiInstance
 * @template {import("./propertiesTreeView/types.ts").AllPossibleGetValueOpts} TOpts
 * @template {import("./propertiesTreeView/types.ts").RecursionLimitNumbers} [TRecursionLimit = import("./propertiesTreeView/types.ts").DefaultRecursionLimit]
 * @typedef {TObjectGuiInstance extends ArrayGui<infer TStructure, 3> ?
 * 		import("./propertiesTreeView/types.ts").GetArrayStructureValuesReturnType<TStructure, TOpts, TRecursionLimit> :
 * 		never} GetArrayGuiValueTypeForOptions
 */

/**
 * @template {ArrayGuiOptions<import("./propertiesTreeView/types.ts").GuiTypes>} T
 * @template {import("./propertiesTreeView/types.ts").RecursionLimitNumbers} [TRecursionLimit = import("./propertiesTreeView/types.ts").DefaultRecursionLimit]
 */
export class ArrayGui {
	/**
	 * @typedef {import("./propertiesTreeView/types.ts").PropertiesTreeViewEntryChangeCallback<import("./propertiesTreeView/types.ts").GetArrayStructureValuesReturnType<T, {}, TRecursionLimit>>} OnValueChangeCallback
	 */

	/** @type {Set<OnValueChangeCallback>} */
	#onValueChangeCbs = new Set();

	/**
	 * @param {T} options
	 */
	constructor({
		defaultValue = [],
		arrayType,
		arrayGuiOpts = {},
		disabled = false,
	}) {
		this.disabled = false;

		this.el = document.createElement("div");
		this.el.classList.add("arrayGui");

		/** @type {import("./propertiesTreeView/types.ts").GetArrayValueItemType<T>[]} */
		this.valueItems = [];
		this.type = arrayType;
		this.arrayGuiOpts = arrayGuiOpts;

		this.addRemoveButtonGroup = new ButtonGroup();
		this.el.appendChild(this.addRemoveButtonGroup.el);
		this.removeItemButton = new Button({
			text: "-",
			onClick: () => {
				// todo: add support for removing selected entry
				this.removeItem(-1, "user");
			},
		});
		this.addRemoveButtonGroup.addButton(this.removeItemButton);
		this.addItemButton = new Button({
			text: "+",
			onClick: () => {
				this.addItem("user");
			},
		});
		this.addRemoveButtonGroup.addButton(this.addItemButton);

		this.treeView = new PropertiesTreeView();
		this.el.appendChild(this.treeView.el);

		this.setValue(defaultValue);
		if (disabled) this.setDisabled(true);
	}

	destructor() {
		if (this.el.parentElement) {
			this.el.parentElement.removeChild(this.el);
		}
	}

	/**
	 * @param {import("./TreeView.js").TreeView} parent
	 */
	updateContainerDepthFromParent(parent) {
		let depth = parent.containerRecursionDepth;
		const renderContainer = this.type != "object";
		if (renderContainer) depth++;
		this.treeView.renderContainer = renderContainer;
		this.treeView.forceContainerRecursionDepth(depth);
	}

	/**
	 * @param {import("./propertiesTreeView/types.ts").ChangeEventTriggerType} trigger
	 */
	addItem(trigger = "application") {
		const index = this.value.length;
		/** @type {import("./propertiesTreeView/types.ts").PropertiesTreeViewEntryOptionsGeneric<any>} */
		const addItemOpts = {
			type: this.type,
			guiOpts: {
				smallLabel: true,
				label: String(index),
				...this.arrayGuiOpts,
			},
		};
		const addedItem = this.treeView.addItem(addItemOpts);
		addedItem.onValueChange(changeEvent => {
			this.#fireValueChange(changeEvent.trigger);
		});
		if (this.disabled) addedItem.setDisabled(true);
		this.valueItems.push(addedItem);
		this.#fireValueChange(trigger);
		return addedItem;
	}

	/**
	 * remove array item by index, counts from the back when negative
	 * @param {number} index
	 * @param {import("./propertiesTreeView/types.ts").ChangeEventTriggerType} trigger
	 */
	removeItem(index = -1, trigger = "application") {
		if (index < 0) index = this.valueItems.length + index;

		if (index < 0 || index >= this.valueItems.length) {
			throw new Error(`Failed to remove array item, index ${index} does not exist`);
		}
		this.treeView.removeChildIndex(index);
		this.valueItems.splice(index, 1);
		this.#fireValueChange(trigger);
	}

	/**
	 * @param {import("./propertiesTreeView/types.ts").ArrayStructureToSetObject<T>} value
	 * @param {import("./propertiesTreeView/types.ts").AllPossibleSetValueOpts} [setValueOpts]
	 */
	setValue(value, setValueOpts) {
		if (!value) value = [];
		const removeCount = this.valueItems.length - value.length;
		if (removeCount > 0) {
			for (let i = 0; i < removeCount; i++) {
				this.removeItem(-1);
			}
		}
		const castValueAny = /** @type {any[]} */ (value);
		for (const [i, item] of castValueAny.entries()) {
			/** @type {import("./propertiesTreeView/types.ts").BaseSetValueOptions} */
			const newSetValueOpts = {
				...setValueOpts,
				setOnObject: value,
				setOnObjectKey: i,
			};
			if (this.valueItems.length <= i) {
				const addedItem = this.addItem();
				addedItem.setValue(item, newSetValueOpts);
			} else {
				const gui = /** @type {import("./propertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntry<any>} */ (this.valueItems[i]);
				gui.setValue(item, newSetValueOpts);
			}
		}
	}

	/**
	 * @template {import("./propertiesTreeView/types.ts").AllPossibleGetValueOpts} [TGuiOpts = {}]
	 * @param {TGuiOpts} [guiOpts]
	 * @returns {import("./propertiesTreeView/types.ts").GetArrayStructureValuesReturnType<T, TGuiOpts, TRecursionLimit>}
	 */
	getValue(guiOpts) {
		const valueArray = [];
		for (const item of this.valueItems) {
			let value = null;
			const gui = /** @type {import("./propertiesTreeView/PropertiesTreeViewEntry.js").GuiInterface} */ (item.gui);
			if (gui.getValue) {
				value = gui.getValue(guiOpts);
			} else {
				value = gui.value;
			}
			valueArray.push(value);
		}
		return valueArray;
	}

	get value() {
		return this.getValue();
	}

	/**
	 * @param {OnValueChangeCallback} cb
	 */
	onValueChange(cb) {
		this.#onValueChangeCbs.add(cb);
	}

	/**
	 * @param {import("./propertiesTreeView/types.ts").ChangeEventTriggerType} trigger
	 */
	#fireValueChange(trigger) {
		this.#onValueChangeCbs.forEach(cb => cb({
			trigger,
			value: this.value,
		}));
	}

	/**
	 * @param {boolean} disabled
	 */
	setDisabled(disabled) {
		this.disabled = disabled;
		for (const item of this.valueItems) {
			item.setDisabled(disabled);
		}
		this.addItemButton.setDisabled(disabled);
		this.removeItemButton.setDisabled(disabled);
	}
}
