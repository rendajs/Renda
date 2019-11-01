export default class ButtonGroup{
	constructor(buttons){
		this.el = document.createElement("div");
		this.el.classList.add("buttonGroup");

		this.buttons = [];
		for(const button of arguments){
			this.addButton(button);
		}
	}

	addButton(button){
		this.buttons.push(button);
		this.el.appendChild(button.el);
	}
}
