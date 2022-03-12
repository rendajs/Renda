import {assertEquals} from "asserts";
import {DroppableGui} from "../../../../../editor/src/ui/DroppableGui.js";
import {installFakeDocument, uninstallFakeDocument} from "../../../shared/fakeDom/FakeDocument.js";

Deno.test({
	name: "Is not disabled by default",
	fn() {
		installFakeDocument();
		const gui = DroppableGui.of();

		assertEquals(gui.disabled, false);
		assertEquals(gui.el.getAttribute("aria-disabled"), "false");

		uninstallFakeDocument();
	},
});
