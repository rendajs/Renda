export default class BooleanGui{
	constructor({
		value = false,
	} = {}){
		this.el = document.createElement("input");
		this.el.type = "checkbox";
		this.el.classList.add("booleanGui", "buttonLike", "resetInput", "textInput");

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
		this.el.checked = value;
	}

	get value(){
		return this.el.checked;
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
