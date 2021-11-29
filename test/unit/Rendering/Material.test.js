import {Material} from "../../../src/Rendering/Material.js";

describe("A new Material", () => {
	it("should not yield anything in getAllProperties()", () => {
		const material = new Material();

		const done = material.getAllProperties().next().done;
		expect(done).toBe(true);
	});
});
