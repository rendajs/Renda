import { assertEquals } from "std/testing/asserts.ts";
import { createBasicFs } from "./shared.js";

Deno.test({
	name: "getPermission, no permission",
	fn: async () => {
		const { fs, fileHandle1 } = createBasicFs();
		fileHandle1.mockPermissionState("denied");

		const permission = await fs.getPermission(["root", "file1"]);

		assertEquals(permission, false);
	},
});

Deno.test({
	name: "getPermission, permission granted",
	fn: async () => {
		const { fs, fileHandle1 } = createBasicFs();
		fileHandle1.mockPermissionState("granted");

		const permission = await fs.getPermission(["root", "file1"]);

		assertEquals(permission, true);
	},
});

Deno.test({
	name: "getPermission, permission granted",
	fn: async () => {
		const { fs, fileHandle1 } = createBasicFs();
		fileHandle1.mockPermissionState("granted");

		const permission = await fs.getPermission(["root", "file1"]);

		assertEquals(permission, true);
	},
});

Deno.test({
	name: "getPermission, prompt, but don't allow prompt",
	fn: async () => {
		const { fs, fileHandle1 } = createBasicFs();
		fileHandle1.mockPermissionState("prompt");

		const permission = await fs.getPermission(["root", "file1"], {
			prompt: false,
		});

		assertEquals(permission, false);
	},
});

Deno.test({
	name: "getPermission, prompt, allow prompt, prompt denied",
	fn: async () => {
		const { fs, fileHandle1 } = createBasicFs();
		fileHandle1.mockPermissionState("prompt", "denied");

		const permission = await fs.getPermission(["root", "file1"], {
			prompt: true,
		});

		assertEquals(permission, false);
	},
});

Deno.test({
	name: "getPermission, prompt, allow prompt, prompt granted",
	fn: async () => {
		const { fs, fileHandle1 } = createBasicFs();
		fileHandle1.mockPermissionState("prompt", "granted");

		const permission = await fs.getPermission(["root", "file1"], {
			prompt: true,
		});

		assertEquals(permission, true);
	},
});

Deno.test({
	name: "getPermission, non existent file, parents permission denied",
	fn: async () => {
		const { fs, rootHandle, rootDirHandle } = createBasicFs();
		rootHandle.mockPermissionState("denied");
		rootDirHandle.mockPermissionState("denied");

		const permission = await fs.getPermission(["root", "doesnt", "exist"]);

		assertEquals(permission, false);
	},
});

Deno.test({
	name: "getPermission, non existent file, parents permission granted",
	fn: async () => {
		const { fs, rootHandle, rootDirHandle } = createBasicFs();
		rootHandle.mockPermissionState("granted");
		rootDirHandle.mockPermissionState("granted");

		const permission = await fs.getPermission(["root", "doesnt", "exist"]);

		assertEquals(permission, true);
	},
});

Deno.test({
	name: "getPermission, non existent file, existing parent",
	fn: async () => {
		const { fs, rootHandle, rootDirHandle } = createBasicFs();
		rootHandle.mockPermissionState("granted");
		rootDirHandle.mockPermissionState("granted");

		const permission = await fs.getPermission(["root", "doesnt_exist"]);

		assertEquals(permission, true);
	},
});

Deno.test({
	name: "waitForPermission() resolves once permission is granted",
	fn: async () => {
		const path = ["root", "file1"];
		const { fs } = createBasicFs();

		const permisionPromise = fs.waitForPermission(path);

		await fs.getPermission(path);

		const permissionPromiseResult = await permisionPromise;
		assertEquals(permissionPromiseResult, undefined);
	},
});

Deno.test({
	name: "waitForPermission() resolves once permission is granted, but it's denied first",
	fn: async () => {
		const path = ["root", "file1"];
		const { fs, fileHandle1 } = createBasicFs();
		fileHandle1.mockPermissionState("prompt", "denied");

		const permisionPromise = fs.waitForPermission(path);

		const firstResult = await fs.getPermission(path);
		assertEquals(firstResult, false);

		fileHandle1.mockPermissionState("prompt", "granted");
		const secondResult = await fs.getPermission(path, { prompt: true });
		assertEquals(secondResult, true);

		const permissionPromiseResult = await permisionPromise;
		assertEquals(permissionPromiseResult, undefined);
	},
});
