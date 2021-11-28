export class ContextMenuItem {
	/**
	 * @param {import("./ContextMenu.js").ContextMenu} containingContextMenu
	 * @param {import("./ContextMenu.js").ContextMenuItemOpts} opts
	 */
	constructor(containingContextMenu, {
		text = "",
		onClick = null,
		onHover = null,
		disabled = false,
		showRightArrow = false,
		horizontalLine = false,
		reserveIconSpace = false,
		showCheckmark = false,
		showBullet = false,
		icon = null,
	} = {}) {
		this.containingContextMenu = containingContextMenu;
		this.el = document.createElement("div");
		this.el.classList.add("contextMenuItem");
		this.el.classList.toggle("disabled", disabled || horizontalLine);

		this.iconEl = document.createElement("div");
		this.iconEl.classList.add("contextMenuItemIcon");
		this.textEl = document.createElement("div");
		this.textEl.classList.add("contextMenuItemText");
		if (!horizontalLine) {
			this.el.appendChild(this.iconEl);
			this.el.appendChild(this.textEl);
		} else {
			const lineEl = document.createElement("div");
			lineEl.classList.add("contextMenuItemHorizontalLine");
			this.el.appendChild(lineEl);
		}

		this._reserveIconSpace = reserveIconSpace;
		this._showCheckmark = showCheckmark;
		this._showBullet = showBullet;
		this._icon = icon;
		this.disabled = disabled;
		this.updateIconStyle();

		/** @type {Set<function(import("./ContextMenu.js").ContextMenuItemClickEvent) : void>} */
		this.onClickCbs = new Set();
		if (onClick) this.onClick(onClick);

		this.onHoverCbs = new Set();
		if (onHover) this.onHover(onHover);

		this.el.addEventListener("click", () => {
			if (this.disabled) return;
			let preventMenuClose = false;
			for (const cb of this.onClickCbs) {
				/** @type {import("./ContextMenu.js").ContextMenuItemClickEvent} */
				const event = {
					item: this,
					preventMenuClose: () => {
						preventMenuClose = true;
					},
				};
				cb(event);
			}
			if (!preventMenuClose) {
				this.containingContextMenu.onItemClicked();
			}
		});
		this.el.addEventListener("mouseenter", () => {
			if (this.disabled) return;
			for (const cb of this.onHoverCbs) {
				cb();
			}
		});

		if (showRightArrow) {
			const arrowEl = document.createElement("div");
			arrowEl.classList.add("contextMenuRightArrow");
			this.el.appendChild(arrowEl);
		}

		this.setText(text);
	}

	get reserveIconSpace() {
		return this._reserveIconSpace;
	}

	set reserveIconSpace(value) {
		this._reserveIconSpace = value;
		this.containingContextMenu.updateHasReservedIconSpaceItem();
	}

	get showCheckmark() {
		return this._showCheckmark;
	}

	set showCheckmark(value) {
		this._showCheckmark = value;
		this.updateIconStyle();
	}

	get showBullet() {
		return this._showBullet;
	}

	set showBullet(value) {
		this._showBullet = value;
		this.updateIconStyle();
	}

	get icon() {
		return this._icon;
	}

	set icon(value) {
		this._icon = value;
		this.updateIconStyle();
	}

	updateIconStyle() {
		const needsSpace = this.containingContextMenu.hasResevedIconSpaceItem || this.showCheckmark || this.showBullet || this.icon;
		this.iconEl.classList.toggle("hidden", !needsSpace);
		let iconUrl = null;
		if (this.showCheckmark) {
			iconUrl = "icons/contextMenuCheck.svg";
		} else if (this.showBullet) {
			iconUrl = "icons/contextMenuBullet.svg";
		} else if (this.icon) {
			iconUrl = this.icon;
		}
		if (iconUrl) {
			this.iconEl.style.backgroundImage = `url(${iconUrl})`;
		} else {
			this.iconEl.style.backgroundImage = "";
		}
	}

	destructor() {
		this.onClickCbs.clear();
	}

	setText(text) {
		this.textEl.textContent = text;
	}

	/**
	 * @param {function(import("./ContextMenu.js").ContextMenuItemClickEvent) : void} cb
	 */
	onClick(cb) {
		this.onClickCbs.add(cb);
	}

	onHover(cb) {
		this.onHoverCbs.add(cb);
	}
}
