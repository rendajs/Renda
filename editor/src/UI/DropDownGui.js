export default class DropDownGui{
	constructor({
		items = [],
		value = null,
	} = {}){
		this.el = document.createElement("select");
		for(const option of items){
			const optionEl = document.createElement("option");
			optionEl.textContent = option;
			this.el.appendChild(optionEl);
		}

		this.onValueChangeCbs = new Set();
		this.boundFireOnChangeCbs = this.fireOnChangeCbs.bind(this);
		this.el.addEventListener("change", this.boundFireOnChangeCbs);
		this.setValue(value);
	}

	destructor(){
		this.el.removeEventListener("change", this.boundFireOnChangeCbs);
		this.boundFireOnChangeCbs = null;
	}

	setValue(value){
		this.el.value = value;
	}

	get value(){
		return this.el.value;
	}

	onValueChange(cb){
		this.onValueChangeCbs.add(cb);
	}

	fireOnChangeCbs(){
		for(const cb of this.onValueChangeCbs){
			cb(this.value);
		}
	}
}
