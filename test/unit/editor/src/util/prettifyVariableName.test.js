import {assertEquals} from "std/testing/asserts";
import {prettifyVariableName} from "../../../../../editor/src/util/util.js";

Deno.test("Basic name", () => {
	const variableName = "myVariableName";

	const result = prettifyVariableName(variableName);

	assertEquals(result, "My Variable Name");
});

Deno.test("Already pretty", () => {
	const variableName = "My Variable Name";

	const result = prettifyVariableName(variableName);

	assertEquals(result, "My Variable Name");
});

Deno.test("Upper camel case", () => {
	const variableName = "MyVariableName";

	const result = prettifyVariableName(variableName);

	assertEquals(result, "My Variable Name");
});

Deno.test("One word", () => {
	const variableName = "variable";

	const result = prettifyVariableName(variableName);

	assertEquals(result, "Variable");
});
