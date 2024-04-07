import { assertSpyCall, assertSpyCalls, spy } from "std/testing/mock.ts";
import { CustomMaterialData, Renderer } from "../../../../src/mod.js";
import { assertEquals, assertThrows } from "std/testing/asserts.ts";
import { assertIsType, testTypes } from "../../shared/typeAssertions.js";

class ExtendedRenderer extends Renderer {
	_customMaterialDataSignature = /** @type {(num: number, str: string) => string} */ (/** @type {unknown} */ (null));
}
const renderer = new ExtendedRenderer();

Deno.test({
	name: "Assigning a callback and firing it",
	fn() {
		const data = new CustomMaterialData();
		/** @type {(arg1: number, arg2: string) => string} */
		const callbackSignature = (arg1, arg2) => {
			return arg2;
		};
		const callbackSpy = spy(callbackSignature);
		data.registerCallback(renderer, callbackSpy);

		const returnValue = data.fireCallback(renderer, 42, "hello");
		assertSpyCalls(callbackSpy, 1);
		assertSpyCall(callbackSpy, 0, {
			args: [42, "hello"],
		});
		assertEquals(returnValue, "hello");
	},
});

Deno.test({
	name: "Firing unassigned callbacks throws",
	fn() {
		const data = new CustomMaterialData();
		assertThrows(() => {
			data.fireCallback(renderer, 123, "");
		}, Error, "No callback was registered for this renderer. Make sure to register one with CustomMaterialData.registerCallback().");
	},
});

testTypes({
	name: "Callback args are inferred from the renderer type",
	fn() {
		const data = new CustomMaterialData();
		data.registerCallback(renderer, (arg1, arg2) => {
			// Verify that the type is a number and nothing else
			assertIsType(0, arg1);
			// @ts-expect-error Verify that the type isn't 'any'
			assertIsType(true, arg1);

			// Verify that the type is a string and nothing else
			assertIsType("", arg2);
			// @ts-expect-error Verify that the type isn't 'any'
			assertIsType(true, arg2);

			return "";
		});

		// @ts-expect-error Verify that the right return type is required
		data.registerCallback(renderer, (arg1, arg2) => 0);
		// Same thing but with a string to verify that nothing else is suppressed by ts-expect-error
		data.registerCallback(renderer, (arg1, arg2) => "");

		// @ts-expect-error Verify that the right argument types are required
		data.fireCallback(renderer, "not a number", "hello");
		// Same thing but with a number to verify that nothing else is suppressed by ts-expect-error
		data.fireCallback(renderer, 42, "hello");

		const returnType = data.fireCallback(renderer, 42, "hello");
		// Verify that the type is a string and nothing else
		assertIsType("", returnType);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, returnType);
	},
});
