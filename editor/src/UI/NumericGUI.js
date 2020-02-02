import {clamp, mod} from "../Util/Util.js";

export default class NumericGUI{
	constructor({
		value = 0,
		min = null,
		max = null,
		mouseAdjustSpeed = 1,
		scrollAdjustSpeed = 1,
		step = 0,
		stepStart = 0,
		suffix = "",
		prefix = "",
	} = {}){
		this.el = document.createElement("input");
		this.el.classList.add("numericGUI");

		this.value = 0;
		this.internalValue = 0;
		this.min = min;
		this.max = max;
		this.mouseAdjustSpeed = mouseAdjustSpeed;
		this.scrollAdjustSpeed = scrollAdjustSpeed;
		this.step = step;
		this.stepStart = stepStart;
		this.suffix = suffix;
		this.prefix = prefix;

		this.isMouseAdjusting = false;
		this.hasMovedWhileAdjusting = false;
		this.isTextAdjusting = false;

		this.boundOnFocus = this.onFocus.bind(this);
		this.boundOnBlur = this.onBlur.bind(this);
		this.boundOnMouseDown = this.onMouseDown.bind(this);
		this.boundOnMouseMove = this.onMouseMove.bind(this);
		this.boundOnMouseUp = this.onMouseUp.bind(this);
		this.boundOnWheel = this.onWheel.bind(this);
		this.boundOnInput = this.onInput.bind(this);
		this.el.addEventListener("focus", this.boundOnFocus);
		this.el.addEventListener("blur", this.boundOnBlur);
		this.el.addEventListener("mousedown", this.boundOnMouseDown);
		this.el.addEventListener("wheel", this.boundOnWheel);
		this.el.addEventListener("input", this.boundOnInput);

		this.setIsTextAdjusting(false);
		this.setValue(value);
		this.updateTextValue();
	}

	destructor(){
		this.el.removeEventListener("focus", this.boundOnFocus);
		this.el.removeEventListener("blur", this.boundOnBlur);
		this.el.removeEventListener("mousedown", this.boundOnMouseDown);
		this.el.removeEventListeners("wheel", this.boundOnWheel);
		this.el.removeEventListeners("input", this.boundOnInput);
		this.removeEventListeners();
		this.el = null;
		this.boundOnFocus = null;
		this.boundOnBlur = null;
		this.boundOnMouseDown = null;
		this.boundOnMouseMove = null;
		this.boundOnMouseUp = null;
		this.boundOnWheel = null;
		this.boundOnInput = null;
	}

	setValue(value, updateTextValue = true){
		this.internalValue = clamp(value, this.min, this.max);
		this.value = Math.round((this.internalValue-this.stepStart)/this.step)*this.step + this.stepStart;
		if(updateTextValue) this.updateTextValue();
	}

	updateTextValue(){
		this.el.value = this.suffix+this.value+this.prefix;
	}

	addEventListeners(){
		window.addEventListener("mousemove", this.boundOnMouseMove);
		window.addEventListener("mouseup", this.boundOnMouseUp);
	}

	removeEventListeners(){
		window.removeEventListener("mousemove", this.boundOnMouseMove);
		window.removeEventListener("mouseup", this.boundOnMouseUp);
	}

	onFocus(){
		if(this.isMouseAdjusting) return;
		this.setIsTextAdjusting(true);
		let valueText = this.el.value;
		this.el.setSelectionRange(this.suffix.length, valueText.length - this.prefix.length);
	}

	onBlur(e){
		this.setIsTextAdjusting(false);
		this.updateTextValue();
		this.internalValue = this.value;
	}

	setIsTextAdjusting(value){
		this.isTextAdjusting = value;
		this.el.classList.toggle("nocaret", !value);
	}

	onMouseDown(e){
		if(this.isTextAdjusting) return;
		this.isMouseAdjusting = true;
		this.hasMovedWhileAdjusting = false;
		this.el.requestPointerLock();
		this.addEventListeners();
	}

	onMouseMove(e){
		if(!this.isMouseAdjusting) return;
		e.preventDefault();
		this.hasMovedWhileAdjusting = true;
		this.adjustValue(e.movementX, -e.movementY, e, this.mouseAdjustSpeed);
	}

	onMouseUp(e){
		if(!this.isMouseAdjusting) return;
		e.preventDefault();
		this.isMouseAdjusting = false;
		document.exitPointerLock();
		this.removeEventListeners();
		if(this.hasMovedWhileAdjusting){
			this.el.blur();
		}else{
			this.onFocus();
		}
	}

	adjustValue(x, y, e, adjustSpeed){
		let delta = 0;
		delta += x * adjustSpeed;
		delta += y * adjustSpeed;
		if(e.shiftKey) delta *= 0.1;
		this.setValue(this.internalValue + delta);
	}

	onWheel(e){
		e.preventDefault();
		this.adjustValue(-e.deltaX, e.deltaY, e, this.scrollAdjustSpeed);
		this.el.blur();
	}

	onInput(){
		let value = this.parseCurrentValue();
		this.setValue(value, false);
	}

	parseCurrentValue(){
		let value = this.el.value;
		if(value.startsWith(this.suffix) && value.endsWith(this.prefix)){
			value = value.slice(this.suffix.length);
			value = value.slice(0, value.length - this.prefix.length);
		}
		value = value.replace(/[^\d\.]/g,"");
		return parseFloat(value);
	}
}
