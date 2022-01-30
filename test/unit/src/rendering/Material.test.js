import {assertEquals} from "asserts";
import {Material} from "../../../../src/Rendering/Material.js";

Deno.test("Empty getAllProperties() for new materials", () => {
	const material = new Material();

	const done = material.getAllProperties().next().done;
	assertEquals(done, true);
});

Deno.test("should call the destructor callbacks", () => {
	const material = new Material();
	let destructorCalled = false;
	const cb = () => {
		destructorCalled = true;
	};

	material.onDestructor(cb);
	material.destructor();

	assertEquals(destructorCalled, true);
});

Deno.test("should not call removed destructors.", () => {
	const material = new Material();
	let destructorCalled = false;
	const cb = () => {
		destructorCalled = true;
	};

	material.onDestructor(cb);
	material.removeOnDestructor(cb);

	assertEquals(destructorCalled, false);
});
