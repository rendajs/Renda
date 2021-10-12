import TreeView from "../TreeView.js";
import VectorGui from "../VectorGui.js";
import NumericGui from "../NumericGui.js";
import BooleanGui from "../BooleanGui.js";
import DropDownGui from "../DropDownGui.js";
import TextGui from "../TextGui.js";
import DroppableGui from "../DroppableGui.js";
import ArrayGui from "../ArrayGui.js";
import Button from "../Button.js";
import LabelGui from "../LabelGui.js";
import ObjectGui from "../ObjectGui.js";

import {prettifyVariableName} from "../../Util/Util.js";

/**
 * @typedef {Object} GuiOptions
 * @property {string} [label = ""] The label to show in front of the GUI element.
 * @property {boolean} [smallLabel = false] Set to true if you want the value GUI element to take up a bigger portion of the line.
 * @property {boolean} [disabled = false] Whether the GUI element is disabled.
 * @property {*} [defaultValue = null] The default value of the GUI element.
 */

/**
 * @typedef {Object} PropertiesTreeViewGuiOptionsMap
 * @property {import("../VectorGui.js").VectorGuiOptions} vec3
 * @property {import("../TextGui.js").TextGuiOptions} string
 * @property {import("../NumericGui.js").NumericGuiOptions} number
 * @property {import("../BooleanGui.js").BooleanGuiOptions} boolean
 * @property {import("../Button.js").ButtonGuiOptions} button
 * @property {import("../LabelGui.js").LabelGuiOptions} label
 * @property {import("../DropDownGui.js").DropDownGuiOptions} dropdown
 * @property {import("../DroppableGui.js").DroppableGuiOptions} droppable
 * @property {import("../ArrayGui.js").ArrayGuiOptions} array
 * @property {import("../ObjectGui.js").ObjectGuiOptions} object
 */

/** @typedef {keyof PropertiesTreeViewGuiOptionsMap} PropertiesTreeViewEntryType */
/** @typedef {PropertiesTreeViewGuiOptionsMap[PropertiesTreeViewEntryType]} GuiOptionsGeneric */

/**
 * @template {PropertiesTreeViewEntryType} T
 * @typedef {Object} PropertiesTreeViewEntryOptionsGeneric
 * @property {PropertiesTreeViewEntryType} [type]
 * @property {*} [defaultValue = undefined]
 * @property {PropertiesTreeViewGuiOptionsMap[T]} [guiOpts = {}]
 * @property {Object} [callbacksContext = {}]
 */

/** @typedef {PropertiesTreeViewEntryOptionsGeneric<PropertiesTreeViewEntryType>} PropertiesTreeViewEntryOptions */

/** @typedef {Object.<string,PropertiesTreeViewEntryOptions>} PropertiesTreeViewStructure */

// @typedef {"vec3" | typeof String | "number" | typeof Boolean | typeof Array | typeof ProjectAsset | "droppable" | "button" | "label"} PropertiesTreeViewEntryType */

/**
 * @typedef {Object} GuiInterface
 * @property {function(*) : boolean} [isDefaultValue]
 * @property {boolean} [defaultValue]
 * @property {function(*) : *} [getValue]
 * @property {*} [value]
 * @property {function(function() : void) : void} [onValueChange]
 * @property {function() : void} [destructor]
 * @property {Function} [setValue]
 * @property {function(boolean) : void} [setDisabled]
 */

/**
 * @typedef {Object} PropertiesTreeViewChangeEventType
 * @property {*} newValue
 * @property {PropertiesTreeViewEntry} target
 *
 * @typedef {import("../TreeView.js").TreeViewEvent & PropertiesTreeViewChangeEventType} PropertiesTreeViewChangeEvent
 */

export default class PropertiesTreeViewEntry extends TreeView {
	/**
	 * @param {PropertiesTreeViewEntryOptions} opts
	 */
	constructor({
		type = "number",
		defaultValue = undefined,
		guiOpts = {},
		callbacksContext = {},
	} = {}) {
		super({
			addCustomEl: true,
			selectable: false,
			rowVisible: false,
		});

		this.customEl.classList.add("guiTreeViewEntry");

		const smallLabel = guiOpts.smallLabel ?? false;
		this.label = document.createElement("div");
		this.label.classList.add("guiTreeViewEntryLabel");
		this.label.classList.toggle("smallLabel", smallLabel);
		this.label.textContent = prettifyVariableName(guiOpts.label) ?? "";
		this.customEl.appendChild(this.label);

		this.valueEl = document.createElement("div");
		this.valueEl.classList.add("guiTreeViewEntryValue");
		this.valueEl.classList.toggle("smallLabel", smallLabel);
		this.customEl.appendChild(this.valueEl);

		this.type = type;
		if (type == "string") {
			this.gui = new TextGui(guiOpts);
			this.valueEl.appendChild(this.gui.el);
		} else if (type === "vec3") {
			this.gui = new VectorGui({
				defaultValue,
				size: 3,
				...guiOpts,
			});
			this.valueEl.appendChild(this.gui.el);
		} else if (type == "number") {
			this.gui = new NumericGui({
				defaultValue,
				...guiOpts,
			});
			this.valueEl.appendChild(this.gui.el);
		} else if (type == "boolean") {
			this.gui = new BooleanGui({
				defaultValue,
				...guiOpts,
			});
			this.valueEl.appendChild(this.gui.el);
		} else if (type == "dropdown") {
			this.gui = new DropDownGui({
				defaultValue,
				...guiOpts,
			});
			this.valueEl.appendChild(this.gui.el);
		} else if (type == "array") {
			this.gui = new ArrayGui({
				...guiOpts,
			});
			this.valueEl.appendChild(this.gui.el);
			this.label.classList.add("multiLine");
			this.valueEl.classList.add("multiLine");
		} else if (type && type.constructor == Object) {
			this.gui = new ObjectGui({
				structure: type,
				...guiOpts,
			});
			this.valueEl.appendChild(this.gui.treeView.el);
			this.label.classList.add("multiLine");
			this.valueEl.classList.add("multiLine");
		} else if (type == "button") {
			this.gui = new Button({
				...guiOpts,
				onClick: () => {
					const castGuiOpts = /** @type {import("../Button.js").ButtonGuiOptions} */ (guiOpts);
					if (castGuiOpts.onClick) castGuiOpts.onClick(callbacksContext);
				},
			});
			this.valueEl.appendChild(this.gui.el);
		} else if (type == "label") {
			this.gui = new LabelGui(guiOpts);
			this.valueEl.appendChild(this.gui.el);
		} else if (type == "droppable") {
			this.gui = new DroppableGui({
				...guiOpts,
			});
			this.valueEl.appendChild(this.gui.el);
		}

		// todo: maybe instead of calling setvalue inside the constructor
		// of every gui class, call setValue over here

		this.registerNewEventType("propertiestreeviewentryvaluechange");
		const castGui = /** @type {GuiInterface} */ (this.gui);
		castGui?.onValueChange?.(newValue => {
			/** @type {PropertiesTreeViewChangeEvent} */
			const event = {
				target: this,
				newValue,
			};
			this.fireEvent("propertiestreeviewentryvaluechange", event);
		});
	}

	destructor() {
		this.label = null;
		this.valueEl = null;
		const castGui = /** @type {GuiInterface} */ (this.gui);
		castGui?.destructor?.();
		this.gui = null;
		super.destructor();
	}

	/**
	 * @param {boolean} disabled
	 */
	setDisabled(disabled) {
		const castGui = /** @type {GuiInterface} */ (this.gui);
		castGui?.setDisabled?.(disabled);
	}

	setValue(newValue, setValueOpts) {
		if (setValueOpts?.beforeValueSetHook) {
			newValue = setValueOpts.beforeValueSetHook({
				value: newValue,
				setOnObject: setValueOpts.setOnObject,
				setOnObjectKey: setValueOpts.setOnObjectKey,
			});
		}
		const castGui = /** @type {GuiInterface} */ (this.gui);
		if (castGui?.setValue) {
			castGui?.setValue(newValue, setValueOpts);
		} else if (castGui) {
			castGui.value = newValue;
		}
	}

	onValueChange(cb) {
		const castGui = /** @type {GuiInterface} */ (this.gui);
		castGui?.onValueChange?.(cb);
	}

	get value() {
		return this.getValue();
	}

	getValue(guiOpts) {
		const castGui = /** @type {GuiInterface} */ (this.gui);
		if (castGui.getValue) {
			return castGui.getValue(guiOpts);
		} else {
			return castGui?.value;
		}
	}

	/**
	 * Useful for entries such as buttons, labels, etc.
	 * @param {Object} guiOpts
	 * @param {import("./PropertiesTreeView.js").SerializableStructureOutputPurpose} [guiOpts.purpose]
	 * @param {boolean} [guiOpts.stripDefaultValues]
	 * @returns {boolean} If `true`, the value will be omitted from getSerializableStructureValues.
	 */
	omitFromSerializableStuctureValues(guiOpts) {
		if (this.gui instanceof Button || this.gui instanceof LabelGui) {
			return true;
		}
		let {
			purpose = "default",
			stripDefaultValues = false,
		} = guiOpts || {};
		if (purpose == "fileStorage") {
			stripDefaultValues = true;
		} else if (purpose == "binaryComposer") {
			stripDefaultValues = false;
		}
		if (stripDefaultValues) {
			const castGui = /** @type {GuiInterface} */ (this.gui);
			if (castGui.isDefaultValue) {
				if (castGui.isDefaultValue(guiOpts)) return true;
			} else if (this.gui.value == castGui.defaultValue) {
				return true;
			}
		}
		return false;
	}

	/** @typedef {import("./PropertiesTreeView.js").PropertiesTreeViewEventCbMap} PropertiesTreeViewEventCbMap */

	/**
	 * @template {keyof PropertiesTreeViewEventCbMap} T
	 * @param {T} eventType The identifier of the event type.
	 * @param {function(PropertiesTreeViewEventCbMap[T]) : void} cb The callback to invoke when the event occurs.
	 */
	addEventListener(eventType, cb) {
		// @ts-ignore
		// eslint-disable-next-line prefer-rest-params
		super.addEventListener(...arguments);
	}

	/**
	 * @template {keyof PropertiesTreeViewEventCbMap} T
	 * @param {T} eventType The identifier of the event type.
	 * @param {function(PropertiesTreeViewEventCbMap[T]) : void} cb The callback to remove.
	 */
	removeEventListener(eventType, cb) {
		// @ts-ignore
		// eslint-disable-next-line prefer-rest-params
		super.removeEventListener(...arguments);
	}

	/**
	 * Fires an event on this TreeView and its parents.
	 * @template {keyof PropertiesTreeViewEventCbMap} T
	 * @param {T} eventType The identifier of the event type.
	 * @param {PropertiesTreeViewEventCbMap[T]} event The data to pass to the event callbacks.
	 */
	fireEvent(eventType, event) {
		// @ts-ignore
		// eslint-disable-next-line prefer-rest-params
		super.fireEvent(...arguments);
	}
}
