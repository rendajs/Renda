export default class TextGui{
	constructor(){
		this.el = document.createElement("input");
		this.el.classList.add("textGui", "buttonLike", "resetInput", "textInput");
	}

	destructor(){

	}

	setValue(value){
		this.el.value = value;
	}
}
