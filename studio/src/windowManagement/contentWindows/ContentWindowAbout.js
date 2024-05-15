import { BUILD_DATE, BUILD_GIT_BRANCH, BUILD_GIT_COMMIT } from "../../studioDefines.js";
import { licenses } from "../../misc/thirdPartyLicenses/mod.js";
import { Button } from "../../ui/Button.js";
import { TreeView } from "../../ui/TreeView.js";
import { ContentWindow } from "./ContentWindow.js";
import { getStudioInstance } from "../../studioInstance.js";
import { createSpinner } from "../../ui/spinner.js";
import { RENDA_VERSION_STRING } from "../../../../src/engineDefines.js";
import { ColorizerFilterManager } from "../../util/colorizerFilters/ColorizerFilterManager.js";

export class ContentWindowAbout extends ContentWindow {
	static contentWindowTypeId = /** @type {const} */ ("renda:about");
	static contentWindowUiName = "About";
	static contentWindowUiIcon = "static/icons/contentWindowTabs/about.svg";

	#updateEl;
	#updateCheckEl;
	#updateCheckFilter;
	#updateSpinnerEl;
	#updateTextEl;
	#updateButton;

	/**
	 * @param {ConstructorParameters<typeof ContentWindow>} args
	 */
	constructor(...args) {
		super(...args);

		this.#updateEl = document.createElement("div");
		this.#updateEl.classList.add("update-container");
		this.contentEl.append(this.#updateEl);

		this.#updateCheckEl = document.createElement("div");
		this.#updateCheckEl.classList.add("update-check-icon");
		this.#updateCheckFilter = ColorizerFilterManager.instance().applyFilter(this.#updateCheckEl, "var(--text-color-level0)");
		this.#updateEl.append(this.#updateCheckEl);

		this.#updateSpinnerEl = createSpinner();
		this.#updateEl.append(this.#updateSpinnerEl);

		this.#updateTextEl = document.createElement("span");
		this.#updateEl.append(this.#updateTextEl);

		this.#updateButton = new Button({
			onClick() {
				const state = getStudioInstance().serviceWorkerManager.installingState;
				if (state == "waiting-for-restart") {
					getStudioInstance().serviceWorkerManager.restartClients();
				} else if (state == "idle") {
					getStudioInstance().serviceWorkerManager.checkForUpdates();
				}
			},
		});
		this.#updateEl.append(this.#updateButton.el);

		const aboutEl = document.createElement("p");
		aboutEl.classList.add("about-container");
		this.contentEl.append(aboutEl);

		const dateStr = new Date(BUILD_DATE).toLocaleString();
		const second = 1000;
		const minute = second * 60;
		const hour = minute * 60;
		const day = hour * 24;
		const month = day * 365 / 12;
		const year = day * 365;
		const elapsed = BUILD_DATE - Date.now();
		const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
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
			Version: v${RENDA_VERSION_STRING} (beta)
			<br>
			Branch: ${BUILD_GIT_BRANCH}
			<br>
			Commit: ${commitHtml}
			<br>
			Date: <span title="${relativeDateStr}">${dateStr}</span>
		`;
		aboutEl.innerHTML = html;

		const licensesTreeView = new TreeView({
			name: "Third Party Software",
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

		getStudioInstance().serviceWorkerManager.onInstallingStateChange(this.#updateUpdateState);
		getStudioInstance().serviceWorkerManager.onOpenTabCountChange(this.#updateUpdateState);
		document.addEventListener("visibilitychange", this.#onPageVisibilityChange);

		this.#updateUpdateState();
	}

	destructor() {
		super.destructor();
		getStudioInstance().serviceWorkerManager.removeOnInstallingStateChange(this.#updateUpdateState);
		getStudioInstance().serviceWorkerManager.removeOnOpenTabCountChange(this.#updateUpdateState);
		document.removeEventListener("visibilitychange", this.#onPageVisibilityChange);
		this.#updateCheckFilter.destructor();
	}

	/**
	 * @param {boolean} visible
	 */
	onVisibilityChange(visible) {
		if (visible) {
			getStudioInstance().serviceWorkerManager.checkForUpdates();
		}
	}

	#onPageVisibilityChange = () => {
		if (document.visibilityState == "visible" && this.visible) {
			getStudioInstance().serviceWorkerManager.checkForUpdates();
		}
	};

	#updateUpdateState = () => {
		const state = getStudioInstance().serviceWorkerManager.installingState;
		this.#updateEl.classList.toggle("center-button", state == "idle");
		let buttonVisible = false;
		let spinnerVisible = false;
		let checkVisible = false;
		if (state == "up-to-date") {
			this.#updateTextEl.textContent = "Renda Studio is up to date!";
			checkVisible = true;
		} else if (state == "checking-for-updates") {
			this.#updateTextEl.textContent = "Checking for updates...";
			spinnerVisible = true;
		} else if (state == "installing") {
			this.#updateTextEl.textContent = "Installing update...";
			spinnerVisible = true;
		} else if (state == "waiting-for-restart") {
			const tabCount = getStudioInstance().serviceWorkerManager.openTabCount;
			this.#updateTextEl.textContent = "Almost up to date!";
			this.#updateButton.setText(tabCount > 1 ? `Reload ${tabCount} Tabs` : "Restart");
			buttonVisible = true;
		} else if (state == "restarting") {
			this.#updateTextEl.textContent = "Restarting...";
			spinnerVisible = true;
		} else if (state == "idle") {
			this.#updateTextEl.textContent = "";
			this.#updateButton.setText("Check for Updates");
			buttonVisible = true;
		}

		this.#updateButton.setVisibility(buttonVisible);
		this.#updateSpinnerEl.style.display = spinnerVisible ? "" : "none";
		this.#updateCheckEl.style.display = checkVisible ? "" : "none";
	};
}
