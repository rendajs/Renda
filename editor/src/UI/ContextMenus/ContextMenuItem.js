/**
 * @typedef {Object} ContextMenuItemOpts
 * @property {string} text - The text to display in the item.
 * @property {function()} onClick - The function to call when the item is clicked.
 * @property {function()} onHover - The function to call when the item is hovered over.
 * @property {boolean} disabled - Whether the item should start disabled.
 * @property {boolean} showRightArrow - Whether to arrow on the right of the text should be shown.
 * @property {import("./ContextMenu.js").ContextMenuStructure} submenu - The submenu structure to show on hover.
 */

export default class ContextMenuItem{

	/** @typedef {import("./ContextMenu.js").default} ContextMenu */
	/**
	 * @param {ContextMenu} parentContextMenu
	 * @param {ContextMenuItemOpts} opts
	 */
	constructor(parentContextMenu, {
		text = "",
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
