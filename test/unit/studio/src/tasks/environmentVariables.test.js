import { assertEquals, assertThrows } from "std/testing/asserts.ts";
import { fillEnvironmentVariables } from "../../../../../studio/src/tasks/environmentVariables.js";

Deno.test({
	name: "Basic replacement",
	fn() {
		const config = {
			foo: { bar: "$VAR1" },
			baz: "(this text is not replaced) $VAR2 (and neither is this)",
		};

		fillEnvironmentVariables(config, {
			VAR1: "hello",
			VAR2: "world",
		});

		assertEquals(config, {
			foo: { bar: "hello" },
			baz: "(this text is not replaced) world (and neither is this)",
		});
	},
});

Deno.test({
	name: "Nested arrays and objects",
	fn() {
		const config = {
			arr: [
				{
					a: "$FOO_VAR",
					b: [
						"$BAR_VAR",
						{
							c: "$FOO_VAR",
						},
					],
				},
				{
					a: "$BAR_VAR",
					b: [
						"$FOO_VAR",
						{
							c: "$BAR_VAR",
						},
					],
				},
			],
		};

		fillEnvironmentVariables(config, {
			FOO_VAR: "foo",
			BAR_VAR: "bar",
		});

		assertEquals(config, {
			arr: [
				{
					a: "foo",
					b: [
						"bar",
						{
							c: "foo",
						},
					],
				},
				{
					a: "bar",
					b: [
						"foo",
						{
							c: "bar",
						},
					],
				},
			],
		});
	},
});

Deno.test({
	name: "Replace string only",
	fn() {
		assertThrows(() => {
			fillEnvironmentVariables("string", {});
		}, Error, "Applying environment variables to configs that are a single string is not supported.");
	},
});
