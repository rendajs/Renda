import IndexedDbUtil from "../Util/IndexedDbUtil.js";

export default class ProjectSelector {
	constructor() {
		this.visible = true;
		this.indexedDb = new IndexedDbUtil("projectSelector");

		this.curtainEl = document.createElement("div");
		this.curtainEl.classList.add("project-selector-curtain");
		this.curtainEl.addEventListener("click", () => this.setVisibility(false));
		document.body.appendChild(this.curtainEl);

		this.el = document.createElement("div");
		this.el.classList.add("project-selector-window");
		document.body.appendChild(this.el);

		const titleEl = document.createElement("h1");
		titleEl.classList.add("project-selector-title");
		titleEl.textContent = "Jespers Wacky Web Engine";
		this.el.appendChild(titleEl);

		this.actionsList = this.createList("actions", "Start");
		this.recentList = this.createList("recent", "Recent");

		this.createAction("New Project");
		this.createAction("Open Project");
		this.createAction("Recover Last Session");
	}

	/**
	 * @param {string} name
	 * @param {string} title
	 */
	createList(name, title) {
		const containerEl = document.createElement("div");
		containerEl.classList.add(`project-selector-${name}-list-container`, "project-selector-list-container");
		this.el.appendChild(containerEl);

		const titleEl = document.createElement("h2");
		titleEl.textContent = title;
		containerEl.appendChild(titleEl);

		const listEl = document.createElement("ul");
		listEl.classList.add("project-selector-list");
		containerEl.appendChild(listEl);

		return listEl;
	}

	/**
	 * @param {string} name
	 */
	createAction(name) {
		const item = document.createElement("li");
		item.textContent = name;
		this.actionsList.appendChild(item);
	}

	/**
	 * @param {boolean} visible
	 */
	setVisibility(visible) {
		if (visible == this.visible) return;
		this.visible = visible;

		if (visible) {
			document.body.appendChild(this.el);
			document.body.appendChild(this.curtainEl);
		} else {
			document.body.removeChild(this.el);
			document.body.removeChild(this.curtainEl);
		}
	}
}
