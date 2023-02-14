import {BUILD_DATE, BUILD_GIT_BRANCH, BUILD_GIT_COMMIT} from "../../studioDefines.js";
import {licenses} from "../../misc/thirdPartyLicenses.js";
import {Button} from "../../ui/Button.js";
import {TreeView} from "../../ui/TreeView.js";
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
		aboutEl.classList.add("about-container");
		this.contentEl.appendChild(aboutEl);

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

		let commitHtml = "-";
		if (BUILD_GIT_COMMIT != "-") {
			commitHtml = `<span title="${BUILD_GIT_COMMIT}">${BUILD_GIT_COMMIT.slice(0, 8)}</span>`;
		}

		const html = `
			Branch: ${BUILD_GIT_BRANCH}
			<br>
			Commit: ${commitHtml}
			<br>
			Date: <span title="${relativeDateStr}">${dateStr}</span>
		`;
		aboutEl.innerHTML = html;

		const licensesTreeView = new TreeView({
			name: "Third party software",
			selectable: false,
			collapsed: true,
		});
		this.contentEl.appendChild(licensesTreeView.el);

		for (const licenseInfo of licenses) {
			const treeView = licensesTreeView.addChild();
			treeView.name = licenseInfo.libraryName;

			const homePageTreeView = treeView.addChild();
			const homePageButton = new Button({
				text: "Visit Homepage",
				onClick() {
					window.open(licenseInfo.homepage, "_blank", "noopener");
				},
			});
			homePageTreeView.addButton(homePageButton);

			const licenseTreeView = treeView.addChild();
			const licenseButton = new Button({
				text: "View License",
				onClick() {
					const w = window.open("about:blank", "_blank");
					if (!w) {
						throw new Error("Failed to open window, the pop-up was probably blocked.");
					}
					const node = w.document.createElement("pre");
					node.style.maxWidth = "700px";
					node.style.whiteSpace = "pre-wrap";
					node.textContent = licenseInfo.license;
					w.document.body.appendChild(node);
				},
			});
			licenseTreeView.addButton(licenseButton);
		}
	}
}
