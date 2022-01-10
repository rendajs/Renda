import {TreeView} from "../TreeView.js";
import {VectorGui} from "../VectorGui.js";
import {NumericGui} from "../NumericGui.js";
import {BooleanGui} from "../BooleanGui.js";
import {DropDownGui} from "../DropDownGui.js";
import {TextGui} from "../TextGui.js";
import {DroppableGui} from "../DroppableGui.js";
import {ArrayGui} from "../ArrayGui.js";
import {Button} from "../Button.js";
import {LabelGui} from "../LabelGui.js";
import {ObjectGui} from "../ObjectGui.js";

import {prettifyVariableName} from "../../Util/Util.js";
import {ButtonSelectorGui} from "../ButtonSelectorGui.js";

/**
 * @typedef {Object} GuiInterface
 * @property {(...args: any) => boolean} [isDefaultValue]
 * @property {boolean} [defaultValue]
 * @property {(...args: any) => any} [getValue]
 * @property {*} [value]
 * @property {function((value: any) => any) : void} [onValueChange]
 * @property {() => any} [destructor]
 * @property {(value: any, options: any) => any} [setValue]
 * @property {(disabled: boolean) => any} [setDisabled]
 */

/**
 * @typedef SetValueOptionsExta
 * @property {(data: BeforeValueSetHookData) => any} [beforeValueSetHook]
 * @property {any} [setOnObject]
 * @property {string} [setOnObjectKey]
 */

/**
 * @typedef BeforeValueSetHookData
 * @property {unknown} value
 * @property {any} setOnObject
 * @property {string} setOnObjectKey
 */

/**
 * @template T
 */
export class PropertiesTreeViewEntry extends TreeView {
	/**
	 * @template {import("./types.js").GuiTypes} T
	 * @template TOpts
	 * @param {import("./types.js").PropertiesTreeViewEntryOptionsGeneric<T, TOpts>} opts
	 */
	static of(opts) {
		const x = new PropertiesTreeViewEntry(opts);
		return /** @type {import("./types.js").TreeViewEntryFactoryReturnType<T, TOpts>} */ (x);
	}

	/**
	 * @private
	 * @param {import("./types.js").PropertiesTreeViewEntryOptionsGeneric<any>} opts
	 */
	constructor({
		type,
		guiOpts = {},
		callbacksContext = {},
	}) {
		super({
			addCustomEl: true,
			selectable: false,
			rowVisible: false,
		});

		if (!this.customEl) throw new Error("Assertion failed, PropertiesTreeViewEntry should always have a customEl.");

		this.customEl.classList.add("guiTreeViewEntry");

		const smallLabel = guiOpts.smallLabel ?? false;
		this.label = document.createElement("div");
		this.label.classList.add("guiTreeViewEntryLabel");
		this.label.classList.toggle("smallLabel", smallLabel);
		this.label.textContent = prettifyVariableName(guiOpts.label);
		this.customEl.appendChild(this.label);

		this.valueEl = document.createElement("div");
		this.valueEl.classList.add("guiTreeViewEntryValue");
		this.valueEl.classList.toggle("smallLabel", smallLabel);
		this.customEl.appendChild(this.valueEl);

		/** @type {T?} */
		this.gui = null;

		/**
		 * @template {import("./types.js").GuiTypes} U
		 * @typedef {import("./types.js").GetGuiOptions<U>} GetGuiOpts
		 */

		this.type = type;
		/** @type {*} */
		let setGui = null;
		if (type == "string") {
			setGui = new TextGui(guiOpts);
			this.valueEl.appendChild(setGui.el);
		} else if (type === "vec2") {
			setGui = new VectorGui({
				size: 2,
				...guiOpts,
			});
			this.valueEl.appendChild(setGui.el);
		} else if (type === "vec3") {
			setGui = new VectorGui({
				size: 3,
				...guiOpts,
			});
			this.valueEl.appendChild(setGui.el);
		} else if (type === "vec4") {
			setGui = new VectorGui({
				size: 4,
				...guiOpts,
			});
			this.valueEl.appendChild(setGui.el);
		} else if (type == "number") {
			const castGuiOpts = /** @type {GetGuiOpts<typeof type>} */ (guiOpts);
			setGui = new NumericGui({
				...castGuiOpts,
			});
			this.valueEl.appendChild(setGui.el);
		} else if (type == "boolean") {
			setGui = new BooleanGui({
				...guiOpts,
			});
			this.valueEl.appendChild(setGui.el);
		} else if (type == "dropdown") {
			setGui = new DropDownGui({
				...guiOpts,
			});
			this.valueEl.appendChild(setGui.el);
		} else if (type == "array") {
			const castGuiOpts = /** @type {GetGuiOpts<typeof type>} */ (guiOpts);
			setGui = new ArrayGui({
				...castGuiOpts,
			});
			this.valueEl.appendChild(setGui.el);
			this.label.classList.add("multiLine");
			this.valueEl.classList.add("multiLine");
		} else if (type == "object") {
			setGui = new ObjectGui({
				structure: type,
				...guiOpts,
			});
			this.valueEl.appendChild(setGui.treeView.el);
			this.label.classList.add("multiLine");
			this.valueEl.classList.add("multiLine");
		} else if (type == "button") {
			setGui = new Button({
				...guiOpts,
				onClick: () => {
					const castGuiOpts = /** @type {GetGuiOpts<typeof type>} */ (guiOpts);
					if (castGuiOpts.onClick) castGuiOpts.onClick(callbacksContext);
				},
			});
			this.valueEl.appendChild(setGui.el);
		} else if (type == "buttonSelector") {
			setGui = new ButtonSelectorGui({
				...guiOpts,
			});
			this.valueEl.appendChild(setGui.el);
		} else if (type == "label") {
			setGui = new LabelGui(guiOpts);
			this.valueEl.appendChild(setGui.el);
		} else if (type == "droppable") {
			setGui = DroppableGui.of({
				...guiOpts,
			});
			this.valueEl.appendChild(setGui.el);
		}
		this.gui = setGui;

		// todo: maybe instead of calling setvalue inside the constructor
		// of every gui class, call setValue over here

		this.registerNewEventType("propertiestreeviewentryvaluechange");
		const castGui = /** @type {GuiInterface} */ (this.gui);
		castGui?.onValueChange?.(newValue => {
			/** @type {import("./types.js").PropertiesTreeViewChangeEvent<T>} */
			const event = {
				target: this,
				newValue,
			};
			this.fireEvent("propertiestreeviewentryvaluechange", event);
		});
	}

	destructor() {
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

	/**
	 * @param {import("./types.js").SetValueType<T>} newValue
	 * @param {import("./types.js").SetValueOptionsType<T> & SetValueOptionsExta} setValueOpts
	 */
	setValue(newValue, setValueOpts = {}) {
		if (setValueOpts?.beforeValueSetHook && setValueOpts.setOnObject != undefined && setValueOpts.setOnObjectKey != undefined) {
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

	/**
	 * @param {(value: import("./types.js").GetValueType<T>) => any} cb
	 */
	onValueChange(cb) {
		const castGui = /** @type {GuiInterface} */ (this.gui);
		castGui?.onValueChange?.(cb);
	}

	get value() {
		return this.getValue();
	}

	/**
	 * @template {import("./types.js").GetValueOptionsType<T>} TOpts
	 * @param {TOpts} guiOpts
	 * @returns {import("./types.js").GetValueType<T, TOpts>}
	 */
	getValue(guiOpts = /** @type {TOpts} */ ({})) {
		if (!this.gui) return /** @type {import("./types.js").GetValueType<T, TOpts>} */ (null);
		const castGui = /** @type {GuiInterface} */ (this.gui);
		if (castGui.getValue) {
			return castGui.getValue(guiOpts);
		} else {
			return castGui?.value;
		}
	}

	/**
	 * Useful for entries that should not have a value such as buttons, labels, etc.
	 * Is also used for stripping default values.
	 * @param {Object} [guiOpts]
	 * @param {import("./types.js").TreeViewStructureOutputPurpose} [guiOpts.purpose]
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
			} else if (castGui.value == castGui.defaultValue) {
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
