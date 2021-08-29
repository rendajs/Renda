export default class ContextMenuItem{
	/**
	 * @param {import("./ContextMenu.js").default} containingContextMenu
	 * @param {import("./ContextMenu.js").ContextMenuItemOpts} opts
	 */
	constructor(containingContextMenu, {
		text = "",
		onClick = null,
		onHover = null,
		disabled = false,
		showRightArrow = false,
		horizontalLine = false,
	} = {}){
		this.containingContextMenu = containingContextMenu;
		this.el = document.createElement("div");
		this.el.classList.add("contextMenuItem");
		this.el.classList.toggle("disabled", disabled || horizontalLine);

		this.textNode = document.createTextNode("");
		if (!horizontalLine) {
			this.el.appendChild(this.textNode);
		} else {
			const lineEl = document.createElement("div");
			lineEl.classList.add("contextMenuItemHorizontalLine");
			this.el.appendChild(lineEl);
		}

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
			this.containingContextMenu.onItemClicked();
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
		this.onClickCbs.clear();
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
