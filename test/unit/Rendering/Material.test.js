import {expect, test} from "@playwright/test";
import {Material} from "../../../src/Rendering/Material.js";

test.describe("A new Material", () => {
	test("should not yield anything in getAllProperties()", () => {
		const material = new Material();

		const done = material.getAllProperties().next().done;
		expect(done).toBe(true);
	});

	test("should call the destructor callbacks", () => {
		const material = new Material();
		let destructorCalled = false;
		const cb = () => {
			destructorCalled = true;
		};

		material.onDestructor(cb);
		material.destructor();

		expect(destructorCalled).toBe(true);
	});

	test("should not call removed destructors.", () => {
		const material = new Material();
		let destructorCalled = false;
		const cb = () => {
			destructorCalled = true;
		};

		material.onDestructor(cb);
		material.removeOnDestructor(cb);

		expect(destructorCalled).toBe(false);
	});
});
