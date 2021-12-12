import {describe, expect, it, run} from "https://deno.land/x/tincan/mod.ts";
import {NumericGui} from "../../../../src/UI/NumericGui.js";
import {initializeDom} from "../../shared/initializeDom.js";

describe("A numeric gui", () => {
	it("should hide the cursor when scrolling.", () => {
		const window = initializeDom();
		const numericGui = new NumericGui();

		const wheelEvent = new window.WheelEvent("wheel", {deltaY: 1});
		numericGui.el.dispatchEvent(wheelEvent);

		expect(numericGui.el.classList.contains("no-cursor")).toBe(true);
	});

	it("should show the cursor when moving the mouse after scrolling.", () => {
		const window = initializeDom();
		const numericGui = new NumericGui();

		const wheelEvent = new window.WheelEvent("wheel", {deltaY: 1});
		numericGui.el.dispatchEvent(wheelEvent);
		const mouseEvent = new window.MouseEvent("mousemove");
		numericGui.el.dispatchEvent(mouseEvent);

		expect(numericGui.el.classList.contains("no-cursor")).toBe(false);
	});
});

run();
