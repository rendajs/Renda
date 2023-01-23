import {contentWindowHistorySheet} from "../../styles/styles.js";
import {ContentWindow} from "./ContentWindow.js";

export class ContentWindowHistory extends ContentWindow {
	static contentWindowTypeId = "history";
	static contentWindowUiName = "History";
	static contentWindowUiIcon = "static/icons/contentWindowTabs/history.svg";

	/**
	 * @param {ConstructorParameters<typeof ContentWindow>} args
	 */
	constructor(...args) {
		super(...args);

		this.shadow = this.contentEl.attachShadow({mode: "open"});
		this.shadow.adoptedStyleSheets = [contentWindowHistorySheet];
		const svgNs = "http://www.w3.org/2000/svg";
		this.graphEl = document.createElementNS(svgNs, "svg");
		this.shadow.appendChild(this.graphEl);

		this.entriesEl = document.createElement("ul");
		this.shadow.appendChild(this.entriesEl);

		this.editorInstance.historyManager.onTreeUpdated(this.#updateUi);

		this.#updateUi();
	}

	destructor() {
		super.destructor();
		this.editorInstance.historyManager.removeOnTreeUpdated(this.#updateUi);
	}

	#updateUi = () => {
		this.entriesEl.innerHTML = "";
		for (const result of this.editorInstance.historyManager.getEntries()) {
			const el = document.createElement("li");
			el.classList.add("history-window-entry");
			el.classList.toggle("inactive", !result.active);
			el.classList.toggle("current", result.current);
			el.textContent = result.entry.uiText;
			el.style.paddingLeft = 10 + result.indentation * 10 + "px";
			this.entriesEl.appendChild(el);
		}
		this.graphEl.setAttribute("width", "20");
		this.graphEl.setAttribute("height", "20");
	};
}
