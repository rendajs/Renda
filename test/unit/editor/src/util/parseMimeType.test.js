import {assertEquals} from "https://deno.land/std@0.118.0/testing/asserts.ts";
import {parseMimeType} from "../../../../../editor/src/Util/Util.js";

Deno.test("Basic mime", () => {
	const mimeType = "type/subType";

	const result = parseMimeType(mimeType);

	assertEquals(result, {
		type: "type",
		subType: "subType",
		parameters: {},
	});
});

Deno.test("With parameters", () => {
	const mimeType = "type/subType; parameter1=value1; parameter2=value2";

	const result = parseMimeType(mimeType);

	assertEquals(result, {
		type: "type",
		subType: "subType",
		parameters: {
			parameter1: "value1",
			parameter2: "value2",
		},
	});
});

Deno.test("With parameters without spaces", () => {
	const mimeType = "type/subType;parameter1=value1;parameter2=value2";

	const result = parseMimeType(mimeType);

	assertEquals(result, {
		type: "type",
		subType: "subType",
		parameters: {
			parameter1: "value1",
			parameter2: "value2",
		},
	});
});

// https://datatracker.ietf.org/doc/html/rfc6838#:~:text=Parameter%20names%20are%20case%2Dinsensitive
Deno.test("Parameter names should be converted to lowercase, values shouldn't", () => {
	const mimeType = "type/subType;PARAMETER1=VALUE1;PARAMETER2=VALUE2";

	const result = parseMimeType(mimeType);

	assertEquals(result, {
		type: "type",
		subType: "subType",
		parameters: {
			parameter1: "VALUE1",
			parameter2: "VALUE2",
		},
	});
});

Deno.test("Invalid MimeType", () => {
	const mimeType = "invalid";

	const resultMimeType = parseMimeType(mimeType);

	assertEquals(resultMimeType, null);
});
