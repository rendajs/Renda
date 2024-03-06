import { getContentWindowElement } from "./contentWindows.js";

/**
 * Returns the connect button if there is one, null otherwise.
 * Throws when there is more than one button.
 */
export function getRemoteProjectConnectButton() {
	const connectionsEl = getContentWindowElement("renda:connections");
	const labelsList = connectionsEl.querySelectorAll(".gui-tree-view-entry-label[title='Connect']");
	const labels = Array.from(labelsList);
	if (labels.length == 0) return null;
	if (labels.length > 1) {
		throw new Error("There was more than one connect button on the page");
	}
	const label = labels[0];
	const parent = label.parentElement;
	if (!parent) throw new Error("Label has no parent");
	const button = parent.querySelector(".button");
	if (!button) throw new Error("no button found");
	return button;
}

export function getFirstRemoteProjectAcceptButtons() {
	const connectionsEl = getContentWindowElement("renda:connections");
	const contentEl = connectionsEl.querySelector(".studio-content-window-content");
	if (!contentEl) throw new Error("no content el");
	const buttons = contentEl.querySelectorAll(".button");
	for (const button of buttons) {
		if (button.textContent == "Allow") {
			return button;
		}
	}
	return null;
}
