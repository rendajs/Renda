export default class Button{
	constructor({
		text = null,
		icon = null,
		hasDownArrow = false,
		onClick = null,
	}){
		this.el = document.createElement("div");
		this.el.classList.add("button");
		this.onClick = onClick;
		this.boundFireOnClick = this.fireOnClick.bind(this);
		this.el.addEventListener("click", this.boundFireOnClick);
	}

	destructor(){
		this.el.removeEventListener("click", this.boundFireOnClick);
	}

	fireOnClick(){
		if(this.onClick) this.onClick();
	}

	setActiveHighlight(active){
		this.el.classList.toggle("active", active);
	}
}
