import {getMaybeStudioInstance} from "../studioInstance.js";

/**
 * @typedef {object} NumericGuiOptionsType
 * @property {number?} [min = null] The minimum allowed value.
 * @property {number?} [max = null] The maximum allowed value.
 * @property {number} [step = 0] The stepping interval for allowed values.
 * @property {number} [stepStart = 0] The start offset of the stepping interval.
 * @property {number} [mouseAdjustSpeed = 0.1] The speed at which the value is adjusted when the mouse is dragged.
 * @property {number} [scrollAdjustSpeed = 0.1] The speed at which the value is adjusted when the mouse is scrolled.
 * @property {string} [suffix = ""] The suffix to render after the value.
 * @property {string} [prefix = ""] The prefix to render before the value.
 * @property {[number, string][]} [mappedStringValues = []] The string to return when the numeric value is one of these values.
 * @property {number | string} [defaultValue = null] The default value of the gui when it hasn't been modified by the user.
 */
/**
 * @typedef {import("./propertiesTreeView/types.ts").GuiOptionsBase & NumericGuiOptionsType} NumericGuiOptions
 */

/**
 * @template {boolean} [T = false]
 * @template {import("./propertiesTreeView/types.ts").TreeViewStructureOutputPurpose} [U = "default"]
 * @typedef NumericGuiGetValueOptions
 * @property {T} [mapNumericValuesToStrings = true] If true, will return a string if the value is one of `mappedStringValues`.
 * @property {U} [purpose = "default"]
 */

/**
 * @template T
 * @template U
 * @typedef NumericGuiGetValueOptionsNoConstraints
 * @property {T} [mapNumericValuesToStrings]
 * @property {U} [purpose]
 */

/**
 * @template {boolean} [T = false]
 * @template {import("./propertiesTreeView/types.ts").TreeViewStructureOutputPurpose} [U = "default"]
 * @typedef {U extends "fileStorage" ?
 * 		number | string :
 * 	U extends "binarySerialization" ?
 * 		number :
 * U extends "default" | undefined ? (
 *   T extends true ? number | string :
 *   T extends false ? number :
 *   number
 * ) : number} NumericGuiGetValueReturn
 */

/**
 * @template TOpts
 * @typedef {TOpts extends NumericGuiGetValueOptionsNoConstraints<infer T, infer U> ?
 * 		import("./propertiesTreeView/types.ts").ReplaceUnknown<T, false> extends infer TDefaulted ?
 * 			import("./propertiesTreeView/types.ts").ReplaceUnknown<U, "default"> extends infer UDefaulted ?
 * 				TDefaulted extends boolean ?
 * 					UDefaulted extends import("./propertiesTreeView/types.ts").TreeViewStructureOutputPurpose ?
 * 						NumericGuiGetValueReturn<TDefaulted, UDefaulted> :
 * 						never :
 * 					never :
 * 				never :
 * 			never :
 * 		never} GetNumericGuiValueTypeForOptions
 */

export class NumericGui {
	/** @typedef {import("./propertiesTreeView/types.ts").PropertiesTreeViewEntryChangeCallback<number>} OnValueChangeCallback */
	/** @type {Set<OnValueChangeCallback>} */
	#onValueChangeCbs = new Set();

	#shortcutFocusValueSetter;

	/**
	 * @param {NumericGuiOptions} opts
	 */
	constructor({
		defaultValue = 0,
		min = null,
		max = null,
		mouseAdjustSpeed = 0.1,
		scrollAdjustSpeed = 0.1,
		step = 0,
		stepStart = 0,
		suffix = "",
		prefix = "",
		disabled = false,

		// when the numeric value is one of these keys, the mapped string will be displayed in the gui instead
		// this.getValue() will return a number, unless `mapNumericValuesToStrings` or `purpose: "fileStorage"` is set
		// example value: [[-1, "auto"], [-2, "disabled"]]
		mappedStringValues = [],
	} = {}) {
		this.el = document.createElement("input");
		this.el.classList.add("numeric-gui", "button-like", "reset-input", "text-input");

		this.defaultValue = defaultValue;
		this.internalValue = 0;
		this.unroundedValue = 0;
		this.min = min;
		this.max = max;
		this.mouseAdjustSpeed = mouseAdjustSpeed;
		this.scrollAdjustSpeed = scrollAdjustSpeed;
		this.step = step;
		this.stepStart = stepStart;
		this.suffix = suffix;
		this.prefix = prefix;
		this.disabled = disabled;
		/** @type {Map<number, string>} */
		this.mappedStringValues = new Map(mappedStringValues);
		/** @type {Map<string, number>} */
		this.inverseMappedStringValues = new Map();
		for (const [val, str] of mappedStringValues) {
			this.inverseMappedStringValues.set(str, val);
		}

		this.isMouseAdjusting = false;
		this.hasMovedWhileAdjusting = false;
		this.isTextAdjusting = false;

		this.boundShowCursor = this.showCursor.bind(this);
		this.boundOnFocus = this.onFocus.bind(this);
		this.boundOnBlur = this.onBlur.bind(this);
		this.boundOnMouseDown = this.onMouseDown.bind(this);
		this.boundOnMouseMove = this.onMouseMove.bind(this);
		this.boundOnMouseUp = this.onMouseUp.bind(this);
		this.boundOnWheel = this.onWheel.bind(this);
		this.el.addEventListener("mouseenter", this.boundShowCursor);
		this.el.addEventListener("mouseleave", this.boundShowCursor);
		this.el.addEventListener("mousemove", this.boundShowCursor);
		this.el.addEventListener("focus", this.boundOnFocus);
		this.el.addEventListener("blur", this.boundOnBlur);
		this.el.addEventListener("mousedown", this.boundOnMouseDown);
		this.el.addEventListener("wheel", this.boundOnWheel, {passive: false});
		this.el.addEventListener("input", this.#onInput);

		const studio = getMaybeStudioInstance();
		// We allow running without a studio instance to make this easier to use in tests
		if (studio) {
			const shortcutManager = studio.keyboardShortcutManager;
			if (shortcutManager) {
				shortcutManager.onCommand("numericGui.incrementAtCaret", this.#incrementAtCaret);
				shortcutManager.onCommand("numericGui.decrementAtCaret", this.#decrementAtCaret);
				const focusCondition = shortcutManager.getCondition("numericGui.hasFocus");
				this.#shortcutFocusValueSetter = focusCondition.requestValueSetter();
			}
		}

		this.setIsTextAdjusting(false);
		this.setValue(defaultValue);
		this.updateTextValue();
		this.setDisabled(disabled);
	}

	destructor() {
		this.el.removeEventListener("mouseenter", this.boundShowCursor);
		this.el.removeEventListener("mouseleave", this.boundShowCursor);
		this.el.removeEventListener("mousemove", this.boundShowCursor);
		this.el.removeEventListener("focus", this.boundOnFocus);
		this.el.removeEventListener("blur", this.boundOnBlur);
		this.el.removeEventListener("mousedown", this.boundOnMouseDown);
		this.el.removeEventListener("wheel", this.boundOnWheel);
		this.el.removeEventListener("input", this.#onInput);

		const studio = getMaybeStudioInstance();
		if (studio) {
			const shortcutManager = studio.keyboardShortcutManager;
			if (shortcutManager) {
				shortcutManager.removeOnCommand("numericGui.incrementAtCaret", this.#incrementAtCaret);
				shortcutManager.removeOnCommand("numericGui.decrementAtCaret", this.#decrementAtCaret);
			}
		}
		if (this.#shortcutFocusValueSetter) this.#shortcutFocusValueSetter.destructor();

		this.removeEventListeners();
		this.#onValueChangeCbs.clear();
	}

	/**
	 * @param {number | string} value
	 */
	setValue(value, {
		updateTextValue = true,
		trigger = /** @type {import("./propertiesTreeView/types.ts").ChangeEventTriggerType} */ ("application"),
	} = {}) {
		if (typeof value == "string") {
			if (this.inverseMappedStringValues.has(value)) {
				this.unroundedValue = /** @type {number} */ (this.inverseMappedStringValues.get(value));
			} else {
				this.unroundedValue = parseFloat(value);
			}
		} else {
			this.unroundedValue = value;
		}
		if (this.min != null) this.unroundedValue = Math.max(this.min, this.unroundedValue);
		if (this.max != null) this.unroundedValue = Math.min(this.max, this.unroundedValue);
		this.internalValue = this.unroundedValue;
		if (this.step > 0) {
			this.internalValue = Math.round((this.internalValue - this.stepStart) / this.step) * this.step + this.stepStart;
		}
		if (updateTextValue) this.updateTextValue();
		this.#fireOnChange(trigger);
	}

	get value() {
		const castValue = /** @type {number} */ (this.getValue());
		return castValue;
	}

	/**
	 * @template {boolean} [T = false]
	 * @template {import("./propertiesTreeView/types.ts").TreeViewStructureOutputPurpose} [U = "default"]
	 * @param {NumericGuiGetValueOptions<T, U>} opts
	 * @returns {NumericGuiGetValueReturn<T, U>}
	 */
	getValue({
		mapNumericValuesToStrings = /** @type {T} */ (false),
		purpose = /** @type {U} */ ("default"),
	} = {}) {
		let mapNumerics = /** @type {boolean} */ (mapNumericValuesToStrings);
		if (purpose == "fileStorage") {
			mapNumerics = true;
		} else if (purpose == "binarySerialization") {
			mapNumerics = false;
		}
		if (mapNumerics) {
			const stringValue = this.mappedStringValues.get(this.internalValue);
			if (stringValue) return /** @type {NumericGuiGetValueReturn<T, U>} */ (stringValue);
		}
		return /** @type {NumericGuiGetValueReturn<T, U>} */ (this.internalValue);
	}

	isDefaultValue() {
		return this.getValue() == this.defaultValue || this.getValue({mapNumericValuesToStrings: true}) == this.defaultValue;
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
	#fireOnChange(trigger) {
		for (const cb of this.#onValueChangeCbs) {
			cb({
				value: this.value,
				trigger,
			});
		}
	}

	/**
	 * @param {boolean} disabled
	 */
	setDisabled(disabled) {
		this.disabled = disabled;
		this.el.disabled = disabled;
	}

	updateTextValue() {
		const value = this.getValue({mapNumericValuesToStrings: true});
		if (typeof value == "string") {
			this.el.value = value;
		} else {
			this.el.value = this.suffix + value + this.prefix;
		}
	}

	addEventListeners() {
		window.addEventListener("mousemove", this.boundOnMouseMove);
		window.addEventListener("mouseup", this.boundOnMouseUp);
	}

	removeEventListeners() {
		window.removeEventListener("mousemove", this.boundOnMouseMove);
		window.removeEventListener("mouseup", this.boundOnMouseUp);
	}

	onFocus() {
		if (this.isMouseAdjusting) return;
		this.setIsTextAdjusting(true);
		const valueText = this.el.value;
		this.el.setSelectionRange(this.suffix.length, valueText.length - this.prefix.length);
		if (this.#shortcutFocusValueSetter) this.#shortcutFocusValueSetter.setValue(true);
	}

	onBlur() {
		this.setIsTextAdjusting(false);
		this.updateTextValue();
		this.unroundedValue = this.internalValue;
		if (this.#shortcutFocusValueSetter) this.#shortcutFocusValueSetter.setValue(false);
	}

	/**
	 * @param {boolean} value
	 */
	setIsTextAdjusting(value) {
		this.isTextAdjusting = value;
		this.el.classList.toggle("no-caret", !value);
	}

	onMouseDown() {
		if (this.isTextAdjusting) return;
		this.isMouseAdjusting = true;
		this.hasMovedWhileAdjusting = false;
		this.el.requestPointerLock();
		this.addEventListeners();
	}

	/**
	 * @param {MouseEvent} e
	 */
	onMouseMove(e) {
		if (!this.isMouseAdjusting) return;
		e.preventDefault();
		this.hasMovedWhileAdjusting = true;
		this.adjustValue(e.movementX, -e.movementY, e, this.mouseAdjustSpeed);
	}

	/**
	 * @param {MouseEvent} e
	 */
	onMouseUp(e) {
		if (!this.isMouseAdjusting) return;
		e.preventDefault();
		this.isMouseAdjusting = false;
		document.exitPointerLock();
		this.removeEventListeners();
		if (this.hasMovedWhileAdjusting) {
			this.el.blur();
		} else {
			this.onFocus();
		}
	}

	/**
	 * @param {MouseEvent?} e
	 */
	adjustValue(x = 0, y = 0, e = null, adjustSpeed = 0.1) {
		let delta = 0;
		delta += x * adjustSpeed;
		delta += y * adjustSpeed;
		if (e) {
			if (e.ctrlKey || e.metaKey) delta *= 100;
			if (e.shiftKey) delta *= 10;
			if (e.altKey) delta *= 0.1;
		}

		// round delta to prevent floating point errors from creating many digits
		// perhaps this could be more elegant, where you look at the amount of digits
		// in the provided arguments, but this will do for now
		const big = 10000000000000;
		delta = Math.round(delta * big) / big;

		const oldValue = this.unroundedValue;
		let newValue = this.unroundedValue + delta;
		const oldAfterDotLength = this.getNumbersLength(String(oldValue), false);
		const deltaAfterDotLength = this.getNumbersLength(String(delta), false);
		const desiredAfterDotLength = Math.max(oldAfterDotLength, deltaAfterDotLength);
		const roundAmount = 10 ** desiredAfterDotLength;
		newValue = Math.round(newValue * roundAmount) / roundAmount;
		this.setValue(newValue, {trigger: "user"});
	}

	/**
	 * @param {WheelEvent} e
	 */
	onWheel(e) {
		if (this.disabled) return;
		this.hideCursor();
		e.preventDefault();
		this.adjustValue(-e.deltaX, e.deltaY, e, this.scrollAdjustSpeed);
		this.el.blur();
	}

	hideCursor() {
		this.el.classList.add("no-cursor");
	}

	showCursor() {
		this.el.classList.remove("no-cursor");
	}

	#onInput = () => {
		const value = this.parseCurrentValue();
		this.setValue(value, {updateTextValue: false, trigger: "user"});
	};

	parseCurrentValue() {
		let value = this.el.value;
		if (value.startsWith(this.suffix) && value.endsWith(this.prefix)) {
			value = value.slice(this.suffix.length);
			value = value.slice(0, value.length - this.prefix.length);
		}
		if (this.inverseMappedStringValues.has(value)) return value;
		value = value.replace(/[^\d.-]/g, "");
		return parseFloat(value);
	}

	#incrementAtCaret = () => {
		this.#handleCaretAdjust(1);
	};

	#decrementAtCaret = () => {
		this.#handleCaretAdjust(-1);
	};

	/**
	 * @param {number} delta
	 */
	#handleCaretAdjust = delta => {
		if (document.activeElement != this.el) return;
		const value = this.el.value;
		const caretPos = this.el.selectionStart;
		if (caretPos == null) return;
		let foundDigit = null;
		let digitStart = 0;
		let digitEnd = 0;
		const re = /-?(?<digit>\d+\.\d+|\d+)/g;
		while (true) {
			const match = re.exec(value);
			if (!match) break;
			const start = match.index;
			if (!match.groups) continue;
			const end = start + match.groups.digit.length;
			if (start <= caretPos && end >= caretPos) {
				foundDigit = match.groups.digit;
				digitStart = start;
				digitEnd = end;
				break;
			}
		}
		if (foundDigit) {
			const oldValue = parseFloat(foundDigit);
			let dotIndex = foundDigit.indexOf(".");
			const hasDot = dotIndex >= 0;
			if (!hasDot) dotIndex = digitEnd;
			let digitCaretPos = caretPos - digitStart - dotIndex;
			if (digitCaretPos > 0) digitCaretPos--;

			const oldBeforeDotLength = this.getNumbersLength(foundDigit);
			const oldAfterDotLength = this.getNumbersLength(foundDigit, false);
			const offset = 10 ** (-digitCaretPos - 1);
			let newDigit = oldValue + offset * delta;

			// prevent number from getting huge because of floating point errors
			let roundDigitCount = oldAfterDotLength;
			if (digitCaretPos == oldAfterDotLength) roundDigitCount++; // allow adding extra digits when caret is at the very end
			const roundAmount = 10 ** roundDigitCount;
			newDigit = Math.round(newDigit * roundAmount) / roundAmount;

			let newDigitStr = String(newDigit);

			// prevent removal of trailing 0 when the caret is currently at the beginning
			const newBeforeDotLength = this.getNumbersLength(newDigitStr);
			const beforeDotLengthDelta = oldBeforeDotLength - newBeforeDotLength;
			if (-digitCaretPos == oldBeforeDotLength) {
				if (newDigit < 0) newDigitStr = newDigitStr.slice(1);
				newDigitStr = newDigitStr.padStart(newDigitStr.length + beforeDotLengthDelta, "0");
				if (newDigit < 0) newDigitStr = "-" + newDigitStr;
			}

			// prevent removal of leading 0 when carret is currently at the very end
			const newAfterDotLength = this.getNumbersLength(newDigitStr, false);
			const afterDotLengthDelta = oldAfterDotLength - newAfterDotLength;
			if (digitCaretPos + 1 == oldAfterDotLength && oldAfterDotLength > 0) {
				if (!newDigitStr.includes(".")) newDigitStr = newDigitStr + ".";
				newDigitStr = newDigitStr.padEnd(newDigitStr.length + afterDotLengthDelta, "0");
			}

			const newValue = value.slice(0, digitStart) + newDigitStr + value.slice(digitEnd, value.length);
			this.el.value = newValue;

			let newDotIndex = newDigitStr.indexOf(".");
			if (newDotIndex < 0) newDotIndex = newDigitStr.length;
			let newCaretPosRelativeToDot = digitCaretPos;
			if (newCaretPosRelativeToDot >= 0) newCaretPosRelativeToDot++;
			const newCaretPos = digitStart + newDotIndex + newCaretPosRelativeToDot;
			this.el.selectionStart = newCaretPos;
			this.el.selectionEnd = newCaretPos + 1;

			this.#onInput();
		}
	};

	/**
	 * Gets the amount of digits before or after the dot.
	 * @param {string} str
	 */
	getNumbersLength(str, getBefore = true) {
		const beforeDotLengthMatch = /-?(?<whole>\d+)(?:\.(?<decimal>\d+))?/.exec(str);
		if (getBefore) {
			if (!beforeDotLengthMatch || !beforeDotLengthMatch.groups) return 1;
			return beforeDotLengthMatch.groups.whole.length;
		} else {
			if (!beforeDotLengthMatch || !beforeDotLengthMatch.groups) return 0;
			const {decimal} = beforeDotLengthMatch.groups;
			if (!beforeDotLengthMatch || !decimal) return 0;
			return decimal.length;
		}
	}
}
