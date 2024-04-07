import { assertEquals, assertExists, assertInstanceOf } from "std/testing/asserts.ts";
import { deserializeErrorHook, serializeErrorHook } from "../../../../../src/util/TypedMessenger/errorSerialization.js";

Deno.test({
	name: "Basic error",
	fn() {
		const error = new Error("error message");
		const serialized = serializeErrorHook(error);
		const json = JSON.stringify(serialized);
		const parsedJson = JSON.parse(json);
		const deserialized = deserializeErrorHook(parsedJson);

		assertInstanceOf(deserialized, Error);
		assertEquals(deserialized?.message, "error message");
		assertExists(error.stack);
		assertEquals(deserialized?.stack, error.stack);
	},
});

Deno.test({
	name: "Aggregate error",
	fn() {
		const error1 = new Error("error 1");
		const error2 = new Error("error 2");
		const error = new AggregateError([error1, error2], "aggregate message");

		const serialized = serializeErrorHook(error);
		const json = JSON.stringify(serialized);
		const parsedJson = JSON.parse(json);
		const deserialized = deserializeErrorHook(parsedJson);

		assertInstanceOf(deserialized, AggregateError);
		assertEquals(deserialized.errors.length, 2);
		assertEquals(deserialized.message, "aggregate message");
		assertExists(deserialized.stack);
		assertEquals(deserialized.stack, error.stack);

		assertEquals(deserialized.errors[0].message, "error 1");
		assertExists(deserialized.errors[0].stack);
		assertEquals(deserialized.errors[0].stack, error1.stack);

		assertEquals(deserialized.errors[1].message, "error 2");
		assertExists(deserialized.errors[1].stack);
		assertEquals(deserialized.errors[1].stack, error2.stack);
	},
});
