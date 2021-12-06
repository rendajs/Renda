import {expect, test} from "@playwright/test";
import {Material} from "../../../src/Rendering/Material.js";

test.describe("A new Material", () => {
	test("should not yield anything in getAllProperties()", () => {
		const material = new Material();

		const done = material.getAllProperties().next().done;
		expect(done).toBe(true);
	});
});
