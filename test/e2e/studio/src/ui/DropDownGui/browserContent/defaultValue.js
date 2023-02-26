import {DropDownGui} from "../../../../../../../studio/src/ui/DropDownGui.js";

const gui = new DropDownGui({
	items: ["item1", "item2", "item3"],
	defaultValue: "item2",
});
document.body.appendChild(gui.el);
