import {getStudioInstance} from "../studioInstance.js";
import {DropDownGui} from "../ui/DropDownGui.js";
import {PropertiesTreeView} from "../ui/propertiesTreeView/PropertiesTreeView.js";

export class SettingsPopoverManager {
	/**
	 * @param {HTMLElement} buttonEl
	 */
	showPopover(buttonEl) {
		const popover = getStudioInstance().popoverManager.createPopover();
		const topBarEl = document.createElement("div");
		topBarEl.classList.add("settings-popover-top-bar")
		popover.el.appendChild(topBarEl);

		const locationDropDown = new DropDownGui({
			items: [
				"Default",
				"Global",
				"Workspace",
				"Version Control",
				"Project",
				"Window - Workspace",
				"Window - Project",
			],
			defaultValue: 0,
		});
		topBarEl.appendChild(locationDropDown.el);

		const settingsTreeView = new PropertiesTreeView();
		settingsTreeView.generateFromSerializableStructure({
			foo: {
				type: "boolean",
			},
			bar: {
				type: "string",
			},
			baz: {
				type: "number",
			},
		});
		popover.el.appendChild(settingsTreeView.el);

		popover.setPos(buttonEl);
	}
}
