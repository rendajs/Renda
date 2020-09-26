export default class TextGui{
	constructor(){
		this.el = document.createElement("input");
		this.el.classList.add("textGui", "buttonLike", "resetInput", "textInput");
		this.el.spellcheck = false;

		this.onValueChangeCbs = new Set();
		this.boundFireOnChangeCbs = this.fireOnChangeCbs.bind(this);
		this.el.addEventListener("change", this.boundFireOnChangeCbs);
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
