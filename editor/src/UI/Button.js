export default class Button{
	constructor({
		text = null,
		icon = null,
		hasDownArrow = false,
		onClick = null,
	} = {}){
		this.el = document.createElement("div");
		this.el.classList.add("button", "buttonLike");
		this.onClick = onClick;
		this.boundFireOnClick = this.fireOnClick.bind(this);
		this.el.addEventListener("click", this.boundFireOnClick);
		this.setText(text);
	}

	destructor(){
		this.el.removeEventListener("click", this.boundFireOnClick);
	}

	fireOnClick(){
		if(this.onClick) this.onClick();
	}

	setText(text){
		this.el.textContent = text;
	}

	setActiveHighlight(active){
		this.el.classList.toggle("active", active);
	}
}
