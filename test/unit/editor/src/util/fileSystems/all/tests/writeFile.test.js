import {assert, assertRejects} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls} from "std/testing/mock.ts";
import {FsaEditorFileSystem} from "../../../../../../../../editor/src/util/fileSystems/FsaEditorFileSystem.js";
import {MemoryEditorFileSystem} from "../../../../../../../../editor/src/util/fileSystems/MemoryEditorFileSystem.js";
import {assertPromiseResolved} from "../../../../../../shared/asserts.js";
import {waitForMicrotasks} from "../../../../../../shared/waitForMicroTasks.js";
import {registerOnChangeSpy} from "../../shared.js";
import {testAll} from "../shared.js";

testAll({
	name: "writeFile should create the file and fire onChange",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();
		const onChangeSpy = registerOnChangeSpy(fs);

		const path = ["root", "newfile"];
		const writeFilePromise = fs.writeFile(path, "text");

		// Change the path to verify that the initial array is used
		path.push("extra");

		await writeFilePromise;

		const {files} = await fs.readDir(["root"]);
		assert(files.includes("newfile"), "'newfile' was not created");

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

testAll({
	name: "writeFile should error when a parent is not a directory",
	ignore: [FsaEditorFileSystem, MemoryEditorFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await assertRejects(async () => {
			await fs.writeFile(["root", "file1", "newfile"], "hello world");
		}, Error, 'Failed to write to "root/file1/newfile", "root/file1" is not a directory.');
	},
});

testAll({
	name: "writeFile should error when a parent of parent is not a directory",
	ignore: [FsaEditorFileSystem, MemoryEditorFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await assertRejects(async () => {
			await fs.writeFile(["root", "file1", "anotherdir", "newfile"], "hello world");
		}, Error, 'Failed to create directory at "root/file1/anotherdir", "root/file1" is file.');
	},
});

testAll({
	name: "writeFile() causes waitForWritesFinish to stay pending until done",
	ignore: [FsaEditorFileSystem, MemoryEditorFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		ctx.forcePendingOperations(true);
		const writeFilePromise = fs.writeFile(["root", "newfile"], "hello world");
		const waitPromise = fs.waitForWritesFinish();

		await waitForMicrotasks();
		await assertPromiseResolved(waitPromise, false);

		ctx.forcePendingOperations(false);
		await writeFilePromise;
		await waitForMicrotasks();
		await assertPromiseResolved(waitPromise, true);
	},
});
