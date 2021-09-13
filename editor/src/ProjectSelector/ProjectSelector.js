export default class ProjectSelector {
	constructor() {
		this.el = document.createElement("div");
		this.el.classList.add("project-selector-window");
		document.body.appendChild(this.el);
	}
}
