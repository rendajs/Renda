import {mod} from "../Util/Util.js";

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
		this.boundOnKeyDown = this.onKeyDown.bind(this);
		this.el.addEventListener("focus", this.boundOnFocus);
		this.el.addEventListener("blur", this.boundOnBlur);
		this.el.addEventListener("mousedown", this.boundOnMouseDown);
		this.el.addEventListener("wheel", this.boundOnWheel);
		this.el.addEventListener("input", this.boundOnInput);
		this.el.addEventListener("keydown", this.boundOnKeyDown);

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
		this.el.removeEventListeners("keydown", this.keydown);
		this.removeEventListeners();
		this.el = null;
		this.boundOnFocus = null;
		this.boundOnBlur = null;
		this.boundOnMouseDown = null;
		this.boundOnMouseMove = null;
		this.boundOnMouseUp = null;
		this.boundOnWheel = null;
		this.boundOnInput = null;
		this.boundOnKeyDown = null;
	}

	setValue(value, updateTextValue = true){
		if(this.min != null) value = Math.max(this.min, value);
		if(this.max != null) value = Math.min(this.max, value);
		this.internalValue = value;
		if(this.step > 0){
			this.value = Math.round((this.internalValue-this.stepStart)/this.step)*this.step + this.stepStart;
		}else{
			this.value = this.internalValue;
		}
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

	onKeyDown(e){
		if(e.key == "ArrowUp"){
			e.preventDefault();
			this.handleCaretAdjust(1);
		}else if(e.key == "ArrowDown"){
			e.preventDefault();
			this.handleCaretAdjust(-1);
		}
	}

	handleCaretAdjust(delta){
		let value = this.el.value;
		let caretPos = this.el.selectionStart;
		let foundDigit = null;
		let digitStart = 0;
		let digitEnd = 0;
		let re = /-?(\d+\.\d+|\d+)/g;
		while(true){
			let match = re.exec(value);
			if(!match) break;
			let start = match.index;
			let end = start + match[0].length;
			if(start <= caretPos && end >= caretPos){
				foundDigit = match[0];
				digitStart = start;
				digitEnd = end;
				break;
			}
		}
		if(foundDigit){
			let digit = parseFloat(foundDigit);
			let digitCaretPos = caretPos - digitStart;
			let dotIndex = foundDigit.indexOf(".");
			if(dotIndex < 0) dotIndex = digitEnd;
			if(digitCaretPos == dotIndex) digitCaretPos--;
			if(digit < 0 && digitCaretPos == 0) digitCaretPos++;

			let oldBeforeDotLength = this.getNumbersLength(foundDigit);
			let oldAfterDotLength = this.getNumbersLength(foundDigit, false);
			let dotDistance = digitCaretPos - dotIndex;
			let decimal = dotDistance + 1;
			if(decimal > 0) decimal--;
			let offset = Math.pow(10, -decimal);
			let newDigit = digit + offset * delta;
			let roundAmount = Math.pow(10, oldAfterDotLength);
			newDigit = Math.round(newDigit*roundAmount)/roundAmount;
			let newDigitStr = ""+newDigit;
			let newBeforeDotLength = this.getNumbersLength(newDigitStr);
			let beforeDotLengthDelta = oldBeforeDotLength - newBeforeDotLength;
			if(digitCaretPos == 0 || (digit < 0 && digitCaretPos == 1)){
				if(newDigit < 0) newDigitStr = newDigitStr.slice(1);
				newDigitStr = newDigitStr.padStart(newDigitStr.length + beforeDotLengthDelta, "0");
				if(newDigit < 0) newDigitStr = "-"+newDigitStr;
				beforeDotLengthDelta = Math.min(0, beforeDotLengthDelta);
			}
			let newValue = value.slice(0, digitStart)+newDigitStr+value.slice(digitEnd, value.length);
			this.el.value = newValue;
			let newCaretPos = digitCaretPos;
			if(digit >= 0 && newDigit < 0) newCaretPos++;
			if(digit <= 0 && newDigit > 0) newCaretPos--;
			newCaretPos -= beforeDotLengthDelta;
			this.el.selectionStart = digitStart + newCaretPos;
			this.el.selectionEnd = digitStart + newCaretPos + 1;
		}
	}

	//gets the amount of digits before or after the dot
	getNumbersLength(str, getBefore=true){
		let beforeDotLengthMatch = /-?(\d+)(\.(\d+))?/.exec(str);
		if(getBefore){
			if(!beforeDotLengthMatch) return 1;
			return beforeDotLengthMatch[1].length;
		}else{
			if(!beforeDotLengthMatch || !beforeDotLengthMatch[3]) return 0;
			return beforeDotLengthMatch[3].length;
		}
	}
}
