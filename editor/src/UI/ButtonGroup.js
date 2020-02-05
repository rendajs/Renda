export default class ButtonGroup{
	constructor(buttons){
		this.el = document.createElement("div");
		this.el.classList.add("buttonGroup", "buttonGroupLike");

		this.buttons = [];
		for(const button of arguments){
			this.addButton(button);
		}
	}

	destructor(){
		this.el = null;
		for(const button of this.buttons){
			button.destructor();
		}
		this.buttons = [];
	}

	addButton(button){
		this.buttons.push(button);
		this.el.appendChild(button.el);
	}
}
