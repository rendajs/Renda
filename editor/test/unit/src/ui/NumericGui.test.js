import {expect, test} from "@playwright/test";
import {NumericGui} from "../../../../src/UI/NumericGui.js";
import {initializeDom} from "../../shared/initializeDom.js";

test.describe("A numeric gui", () => {
	test("should hide the cursor when scrolling.", () => {
		const window = initializeDom();
		const numericGui = new NumericGui();

		const wheelEvent = new window.WheelEvent("wheel", {deltaY: 1});
		numericGui.el.dispatchEvent(wheelEvent);

		expect(numericGui.el.classList.contains("no-cursor")).toBe(true);
	});

	test("should show the cursor when moving the mouse after scrolling.", () => {
		const window = initializeDom();
		const numericGui = new NumericGui();

		const wheelEvent = new window.WheelEvent("wheel", {deltaY: 1});
		numericGui.el.dispatchEvent(wheelEvent);
		const mouseEvent = new window.MouseEvent("mousemove");
		numericGui.el.dispatchEvent(mouseEvent);

		expect(numericGui.el.classList.contains("no-cursor")).toBe(false);
	});
});
