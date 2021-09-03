/**
 * @typedef {Object} ButtonGuiOptionsType
 * @property {string} [text = ""]
 * @property {string} [icon = ""]
 * @property {boolean} [hasDownArrow = false]
 * @property {function(Object) : void} [onClick = null]
 *
 * @typedef {import("./PropertiesTreeView/PropertiesTreeViewEntry.js").GuiOptions & ButtonGuiOptionsType} ButtonGuiOptions
 */

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

		this.iconEl = document.createElement("div");
		this.iconEl.classList.add("buttonIcon");
		this.el.appendChild(this.iconEl);

		this.textEl = document.createElement("span");
		this.textEl.classList.add("buttonText");
		this.el.appendChild(this.textEl);

		this.setText(text);
		this.setIcon(icon);
		this.setDisabled(disabled);

		this.onContextMenuCbs = new Set();

		this.boundFireContextMenuCbs = this.fireContextMenuCbs.bind(this);
		this.el.addEventListener("contextmenu", this.boundFireContextMenuCbs);
	}

	destructor(){
		this.el.removeEventListener("click", this.boundClick);
		this.el.removeEventListener("contextmenu", this.boundFireContextMenuCbs);
	}

	click(){
		if(this.disabled) return;
		if(this.onClick) this.onClick();
	}

	/**
	 * @param {string} text
	 */
	setText(text){
		this.textEl.textContent = text;
	}

	setSelectedHighlight(selected){
		this.el.classList.toggle("selected", selected);
	}

	setDisabled(disabled){
		this.disabled = disabled;
		this.el.classList.toggle("disabled", disabled);
	}

	/**
	 * @param {string} iconUrl
	 */
	setIcon(iconUrl) {
		this.iconEl.style.backgroundImage = `url(${iconUrl})`;
		this.iconEl.style.display = iconUrl ? null : "none";
	}

	/**
	 * @param {number} size
	 */
	setIconSizeMultiplier(size = 1) {
		this.iconEl.style.backgroundSize = `${size * 100}%`;
	}

	fireContextMenuCbs(e) {
		for (const cb of this.onContextMenuCbs) {
			cb(this, e);
		}
	}

	onContextMenu(cb) {
		this.onContextMenuCbs.add(cb);
	}

	removeOnContextMenu(cb) {
		this.onContextMenuCbs.delete(cb);
	}
}
