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

	/**
	 * @param {string} iconUrl
	 */
	setIcon(iconUrl) {
		this.el.style.backgroundImage = `url(${iconUrl})`;
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
