export default class ContextMenuItem{
	constructor(parentContextMenu, text, {
		onClick = null,
		onHover = null,
		disabled = false,
		showRightArrow = false,
	} = {}){
		this.parentContextMenu = parentContextMenu;
		this.el = document.createElement("div");
		this.el.classList.add("contextMenuItem");
		this.el.classList.toggle("disabled", disabled);

		this.textNode = document.createTextNode("");
		this.el.appendChild(this.textNode);

		this.disabled = disabled;

		this.onClickCbs = new Set();
		if(onClick) this.onClick(onClick);

		this.onHoverCbs = new Set();
		if(onHover) this.onHover(onHover);

		this.el.addEventListener("click", () => {
			if(this.disabled) return;
			for(const cb of this.onClickCbs){
				cb();
			}
			this.parentContextMenu.onItemClicked();
		});
		this.el.addEventListener("mouseenter", () => {
			if(this.disabled) return;
			for(const cb of this.onHoverCbs){
				cb();
			}
		});

		if(showRightArrow){
			const arrowEl = document.createElement("div");
			arrowEl.classList.add("contextMenuRightArrow");
			this.el.appendChild(arrowEl);
		}

		this.setText(text);
	}

	destructor(){
		this.onClickCbs = [];
	}

	setText(text){
		this.textNode.textContent = text;
	}

	onClick(cb){
		this.onClickCbs.add(cb);
	}

	onHover(cb){
		this.onHoverCbs.add(cb);
	}
}
