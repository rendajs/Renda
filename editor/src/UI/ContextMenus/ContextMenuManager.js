import editor from "../../editorInstance.js";
import ContextMenu from "./ContextMenu.js";

export default class ContextMenuManager {
	constructor() {
		this.activeContextMenu = null;
		this.curtainEl = document.createElement("div");
		this.curtainEl.classList.add("contextMenuCurtain");
		this.curtainEl.addEventListener("click", () => {
			this.closeCurrent();
		});
		document.body.appendChild(this.curtainEl);
		this.updateCurtainActive();
	}

	init() {
		const iconDefaultColorFilter = editor.colorizerFilterManager.getFilter("var(--default-text-color)");
		this.iconDefaultColorFilterRef = iconDefaultColorFilter.getUsageReference();

		const iconHoverColorFilter = editor.colorizerFilterManager.getFilter("var(--selected-text-color)");
		this.iconHoverColorFilterRef = iconHoverColorFilter.getUsageReference();

		const styleBlock = document.createElement("style");
		styleBlock.textContent = `
			.contextMenuItemIcon {
				filter: url(#${iconDefaultColorFilter.getFilterId()});
			}
			.contextMenuItem:hover:not(.disabled) .contextMenuItemIcon {
				filter: url(#${iconHoverColorFilter.getFilterId()});
			}
		`;
		document.head.appendChild(styleBlock);
	}

	get current() {
		if (this.activeContextMenu && this.activeContextMenu.el) return this.activeContextMenu;
		return null;
	}

	/**
	 * @param {import("./ContextMenu.js").ContextMenuStructure} structure
	 * @returns ContextMenu
	 */
	createContextMenu(structure = null) {
		if (this.activeContextMenu && this.activeContextMenu.el) return null;

		this.activeContextMenu = new ContextMenu(this, {structure});
		this.updateCurtainActive();
		return this.activeContextMenu;
	}

	closeCurrent() {
		if (this.current) {
			this.current.close();
			return true;
		}
		return false;
	}

	onContextMenuClosed(contextMenu) {
		if (contextMenu == this.activeContextMenu) {
			this.activeContextMenu = null;
			this.updateCurtainActive();
		}
	}

	updateCurtainActive() {
		const active = !!this.current;
		this.curtainEl.style.display = active ? null : "none";
	}
}
