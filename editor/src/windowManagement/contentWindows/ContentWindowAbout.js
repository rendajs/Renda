import {BUILD_DATE, BUILD_GIT_BRANCH, BUILD_GIT_COMMIT} from "../../editorDefines.js";
import {ContentWindow} from "./ContentWindow.js";

export class ContentWindowAbout extends ContentWindow {
	static contentWindowTypeId = "about";
	static contentWindowUiName = "About";
	static contentWindowUiIcon = "static/icons/contentWindowTabs/about.svg";

	/**
	 * @param {ConstructorParameters<typeof ContentWindow>} args
	 */
	constructor(...args) {
		super(...args);

		const aboutEl = document.createElement("p");
		aboutEl.style.userSelect = "text";
		this.contentEl.appendChild(aboutEl);

		/**
		 * @param {string} text
		 */
		function addInfo(text) {
			const el = document.createTextNode(text);
			aboutEl.appendChild(el);
		}

		function addBr() {
			aboutEl.appendChild(document.createElement("br"));
		}

		addInfo("Branch: " + BUILD_GIT_BRANCH);
		addBr();
		addInfo("Commit: " + BUILD_GIT_COMMIT);
		addBr();

		const dateStr = new Date(BUILD_DATE).toLocaleString();
		const second = 1000;
		const minute = second * 60;
		const hour = minute * 60;
		const day = hour * 24;
		const month = day * 365 / 12;
		const year = day * 365;
		const elapsed = BUILD_DATE - Date.now();
		const rtf = new Intl.RelativeTimeFormat("en", {numeric: "auto"});
		let relativeDateStr = "";
		if (-elapsed < minute) {
			relativeDateStr = rtf.format(Math.floor(elapsed / second), "second");
		} else if (-elapsed < hour) {
			relativeDateStr = rtf.format(Math.floor(elapsed / minute), "minute");
		} else if (-elapsed < day) {
			relativeDateStr = rtf.format(Math.floor(elapsed / hour), "hour");
		} else if (-elapsed < month) {
			relativeDateStr = rtf.format(Math.floor(elapsed / day), "day");
		} else if (-elapsed < year) {
			relativeDateStr = rtf.format(Math.floor(elapsed / month), "month");
		} else {
			relativeDateStr = rtf.format(Math.floor(elapsed / year), "year");
		}
		addInfo(`Date: ${dateStr} (${relativeDateStr})`);
	}
}
