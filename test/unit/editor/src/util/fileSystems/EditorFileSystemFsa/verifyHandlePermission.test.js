import {assertEquals} from "https://deno.land/std@0.118.0/testing/asserts.ts";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "verifyHandlePermission() granted",
	fn: async () => {
		const {fs, rootHandle} = createBasicFs();
		rootHandle.mockPermissionState("granted");

		const result = await fs.verifyHandlePermission(rootHandle);

		assertEquals(result, true);
	},
});

Deno.test({
	name: "verifyHandlePermission() errors by default",
	fn: async () => {
		const {fs, rootHandle} = createBasicFs();
		rootHandle.mockPermissionState("denied");

		let didThrow = false;
		try {
			await fs.verifyHandlePermission(rootHandle);
		} catch {
			didThrow = true;
		}

		assertEquals(didThrow, true);
	},
});

Deno.test({
	name: "verifyHandlePermission() suppressed errors",
	fn: async () => {
		const {fs, rootHandle} = createBasicFs();
		rootHandle.mockPermissionState("denied");

		const result = await fs.verifyHandlePermission(rootHandle, {error: false});

		assertEquals(result, false);
	},
});

Deno.test({
	name: "verifyHandlePermission() prompt",
	fn: async () => {
		const {fs, rootHandle} = createBasicFs();
		rootHandle.mockPermissionState("prompt", "granted");

		const result = await fs.verifyHandlePermission(rootHandle);

		assertEquals(result, true);
	},
});

Deno.test({
	name: "verifyHandlePermission() disabled prompt",
	fn: async () => {
		const {fs, rootHandle} = createBasicFs();
		rootHandle.mockPermissionState("prompt", "granted");

		let didThrow = false;
		try {
			await fs.verifyHandlePermission(rootHandle, {prompt: false});
		} catch {
			didThrow = true;
		}

		assertEquals(didThrow, true);
	},
});

Deno.test({
	name: "verifyHandlePermission() disabled prompt, disabled error",
	fn: async () => {
		const {fs, rootHandle} = createBasicFs();
		rootHandle.mockPermissionState("prompt", "granted");

		const result = await fs.verifyHandlePermission(rootHandle, {prompt: false, error: false});

		assertEquals(result, false);
	},
});

