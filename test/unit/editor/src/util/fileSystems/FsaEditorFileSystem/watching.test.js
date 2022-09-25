import {assertEquals} from "std/testing/asserts.ts";
import {registerOnChangeSpy} from "../shared.js";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {createBasicFs} from "./shared.js";

/**
 * @param  {Parameters<typeof createBasicFs>} args
 */
async function initListener(...args) {
	const basicFs = createBasicFs(...args);

	/** @type {import("../../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").FileSystemChangeEvent[]} */
	const changeEvents = [];
	basicFs.fs.onChange(e => changeEvents.push(e));

	await basicFs.fs.updateWatchTreeInstance.waitForFinishIfRunning();

	return {...basicFs, changeEvents};
}

Deno.test({
	name: "No external changes when loading for the first time",
	fn: async () => {
		const {fs} = createBasicFs();

		/** @type {import("../../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").FileSystemChangeEvent[]} */
		const changeEvents = [];
		fs.onChange(e => changeEvents.push(e));
		fs.suggestCheckExternalChanges();

		assertEquals(changeEvents.length, 0);
	},
});

Deno.test({
	name: "Changed file",
	fn: async () => {
		const {fs, fileHandle1, changeEvents} = await initListener();

		fileHandle1.mockLastModifiedValue(1);
		fs.suggestCheckExternalChanges();
		await fs.updateWatchTreeInstance.waitForFinishIfRunning();

		assertEquals(changeEvents, [
			{
				external: true,
				kind: "file",
				path: ["root", "file1"],
				type: "changed",
			},
		]);
	},
});

Deno.test({
	name: "Removed file",
	fn: async () => {
		const {fs, onlyFilesDirHandle, changeEvents} = await initListener();

		onlyFilesDirHandle.removeEntry("subfile1");
		fs.suggestCheckExternalChanges();
		await fs.updateWatchTreeInstance.waitForFinishIfRunning();

		assertEquals(changeEvents, [
			{
				external: true,
				kind: "file",
				path: ["root", "onlyfiles", "subfile1"],
				type: "deleted",
			},
		]);
	},
});

Deno.test({
	name: "Created file",
	fn: async () => {
		const {fs, onlyFilesDirHandle, changeEvents} = await initListener();

		onlyFilesDirHandle.addFakeEntry("file", "newfile");
		fs.suggestCheckExternalChanges();
		await fs.updateWatchTreeInstance.waitForFinishIfRunning();

		assertEquals(changeEvents, [
			{
				external: true,
				kind: "file",
				path: ["root", "onlyfiles", "newfile"],
				type: "created",
			},
		]);
	},
});

Deno.test({
	name: "Created directory",
	fn: async () => {
		const {fs, onlyFilesDirHandle, changeEvents} = await initListener();

		onlyFilesDirHandle.addFakeEntry("directory", "newdir");
		fs.suggestCheckExternalChanges();
		await fs.updateWatchTreeInstance.waitForFinishIfRunning();

		assertEquals(changeEvents, [
			{
				external: true,
				kind: "directory",
				path: ["root", "onlyfiles", "newdir"],
				type: "created",
			},
		]);
	},
});

Deno.test({
	name: "Removed directory",
	fn: async () => {
		const {fs, onlyDirsDirHandle, changeEvents} = await initListener();

		onlyDirsDirHandle.removeEntry("subdir1");
		fs.suggestCheckExternalChanges();
		await fs.updateWatchTreeInstance.waitForFinishIfRunning();

		assertEquals(changeEvents, [
			{
				external: true,
				kind: "directory",
				path: ["root", "onlydirs", "subdir1"],
				type: "deleted",
			},
		]);
	},
});

Deno.test({
	name: "No permission",
	fn: async () => {
		const {fs, onlyFilesDirHandle, changeEvents} = await initListener(basicFs => {
			basicFs.rootDirHandle.mockPermissionState("denied");
		});

		onlyFilesDirHandle.removeEntry("subfile1");
		fs.suggestCheckExternalChanges();
		await fs.updateWatchTreeInstance.waitForFinishIfRunning();

		assertEquals(changeEvents, []);
	},
});

Deno.test({
	name: "Permission granted after prompt, should not cause change events",
	fn: async () => {
		const {fs, fileHandle1, changeEvents} = await initListener(basicFs => {
			basicFs.rootHandle.mockPermissionState("prompt", "granted");
		});

		fileHandle1.mockLastModifiedValue(1);
		fs.suggestCheckExternalChanges();
		await fs.updateWatchTreeInstance.waitForFinishIfRunning();

		await fs.getPermission(["root", "file1"], {
			prompt: true,
		});

		fs.suggestCheckExternalChanges();
		await fs.updateWatchTreeInstance.waitForFinishIfRunning();

		assertEquals(changeEvents, []);
	},
});

Deno.test({
	name: "Permission partially granted",
	fn: async () => {
		const {fs, changeEvents, onlyFilesDirHandle, onlyDirsDirHandle} = await initListener(basicFs => {
			basicFs.onlyDirsDirHandle.mockPermissionState("denied");
		});

		onlyFilesDirHandle.addFakeEntry("file", "newfile");
		onlyDirsDirHandle.addFakeEntry("file", "newfile");
		fs.suggestCheckExternalChanges();
		await fs.updateWatchTreeInstance.waitForFinishIfRunning();

		assertEquals(changeEvents, [
			{
				external: true,
				kind: "file",
				path: ["root", "onlyfiles", "newfile"],
				type: "created",
			},
		]);
	},
});

Deno.test({
	name: "Creating files from application shouldn't trigger external change events",
	fn: async () => {
		const {fs} = await initListener();
		const onChangeSpy = registerOnChangeSpy(fs);

		fs.suggestCheckExternalChanges();
		await fs.updateWatchTreeInstance.waitForFinishIfRunning();

		await fs.writeFile(["root", "newfile"], new File([], ""));

		fs.suggestCheckExternalChanges();
		await fs.updateWatchTreeInstance.waitForFinishIfRunning();

		assertSpyCalls(onChangeSpy, 1);
		assertSpyCall(onChangeSpy, 0, {
			args: [
				{
					external: false,
					kind: "file",
					path: ["root", "newfile"],
					type: "changed",
				},
			],
		});
	},
});

Deno.test({
	name: "Getting write file stream shouldn't trigger watch events",
	fn: async () => {
		const {fs, changeEvents} = await initListener();

		fs.suggestCheckExternalChanges();
		await fs.updateWatchTreeInstance.waitForFinishIfRunning();

		await fs.writeFileStream(["root", "newfile"]);

		fs.suggestCheckExternalChanges();
		await fs.updateWatchTreeInstance.waitForFinishIfRunning();

		assertEquals(changeEvents, []);
	},
});

Deno.test({
	name: "Creating file in recursive subdirectory from application shouldn't trigger external change events",
	fn: async () => {
		const {fs} = await initListener();
		const onChangeSpy = registerOnChangeSpy(fs);

		fs.suggestCheckExternalChanges();
		await fs.updateWatchTreeInstance.waitForFinishIfRunning();

		await fs.writeFile(["root", "nonexistent", "newfile"], new File([], ""));

		fs.suggestCheckExternalChanges();
		await fs.updateWatchTreeInstance.waitForFinishIfRunning();

		assertSpyCalls(onChangeSpy, 1);
		assertSpyCall(onChangeSpy, 0, {
			args: [
				{
					external: false,
					kind: "file",
					path: ["root", "nonexistent", "newfile"],
					type: "changed",
				},
			],
		});
	},
});
