export default class Button{
	constructor({
		text = null,
		icon = null,
		hasDownArrow = false,
		onClick = null,
		disabled = false,
	} = {}){
		this.el = document.createElement("div");
		this.el.classList.add("button", "buttonLike");
		this.onClick = onClick;
		this.boundClick = this.click.bind(this);
		this.el.addEventListener("click", this.boundClick);
		this.disabled = disabled;
		this.setText(text);
		this.setDisabled(disabled);
	}

	destructor(){
		this.el.removeEventListener("click", this.boundClick);
	}

	click(){
		if(this.disabled) return;
		if(this.onClick) this.onClick();
	}

	setText(text){
		this.el.textContent = text;
	}

	setSelectedHighlight(selected){
		this.el.classList.toggle("selected", selected);
	}

	setDisabled(disabled){
		this.disabled = disabled;
		this.el.classList.toggle("disabled", disabled);
	}
}
