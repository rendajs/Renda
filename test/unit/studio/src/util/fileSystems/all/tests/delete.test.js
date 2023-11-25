import {assertEquals, assertRejects} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls} from "std/testing/mock.ts";
import {FsaStudioFileSystem} from "../../../../../../../../studio/src/util/fileSystems/FsaStudioFileSystem.js";
import {MemoryStudioFileSystem} from "../../../../../../../../studio/src/util/fileSystems/MemoryStudioFileSystem.js";
import {assertPromiseResolved} from "../../../../../../shared/asserts.js";
import {waitForMicrotasks} from "../../../../../../shared/waitForMicroTasks.js";
import {registerOnChangeSpy} from "../../shared.js";
import {testAll} from "../shared.js";
import {RemoteStudioFileSystem} from "../../../../../../../../studio/src/util/fileSystems/RemoteStudioFileSystem.js";

testAll({
	name: "delete() should delete files and fire onChange",
	ignore: [RemoteStudioFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();
		const onChangeSpy = registerOnChangeSpy(fs);

		fs.onChange(onChangeSpy);

		const path = ["root", "file1"];
		const deletePromise = fs.delete(path);

		// Change the path to verify that the initial array is used
		path.push("extra");

		await deletePromise;

		let hasFile1 = false;
		const {directories} = await fs.readDir(["root"]);
		for (const name of directories) {
			if (name == "file1") {
				hasFile1 = true;
			}
		}
		assertEquals(hasFile1, false);

		assertSpyCalls(onChangeSpy, 1);
		assertSpyCall(onChangeSpy, 0, {
			args: [
				{
					external: false,
					kind: "unknown",
					path: ["root", "file1"],
					type: "deleted",
				},
			],
		});
	},
});

testAll({
	name: "delete() should throw when deleting a non-existent file",
	ignore: [FsaStudioFileSystem, MemoryStudioFileSystem, RemoteStudioFileSystem],
	async fn(ctx) {
		const fs = await ctx.createFs();

		await assertRejects(async () => {
			await fs.delete(["root", "onlyfiles", "nonexistent"]);
		}, Error, 'Failed to delete "root/onlyfiles/nonexistent" because it does not exist.');
	},
});

testAll({
	name: "delete() should throw when deleting a file with non-existent parent",
	ignore: [FsaStudioFileSystem, MemoryStudioFileSystem, RemoteStudioFileSystem],
	async fn(ctx) {
		const fs = await ctx.createFs();

		await assertRejects(async () => {
			await fs.delete(["root", "nonexistent", "nonexistent"]);
		}, Error, 'Failed to delete "root/nonexistent/nonexistent" because it does not exist.');
	},
});

testAll({
	name: "delete() should throw when deleting a non-empty directory with recursive=false",
	ignore: [FsaStudioFileSystem, MemoryStudioFileSystem, RemoteStudioFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await assertRejects(async () => {
			await fs.delete(["root", "onlyfiles"]);
		}, Error, 'Failed to delete "root/onlyfiles" because it is a non-empty directory. Use recursive = true to delete non-empty directories.');
	},
});

testAll({
	name: "delete() a directory with recursive = true",
	ignore: [RemoteStudioFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await fs.delete(["root", "onlyfiles"], true);

		assertEquals(await fs.readDir(["root"]), {
			directories: ["onlydirs"],
			files: [
				"file1",
				"file2",
			],
		});
	},
});

testAll({
	name: "delete() causes waitForWritesFinish to stay pending until done",
	ignore: [FsaStudioFileSystem, MemoryStudioFileSystem, RemoteStudioFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		ctx.forcePendingOperations(true);
		const deletePromise = fs.delete(["root", "file1"]);
		const waitPromise = fs.waitForWritesFinish();

		await waitForMicrotasks();
		await assertPromiseResolved(deletePromise, false);
		await assertPromiseResolved(waitPromise, false);

		ctx.forcePendingOperations(false);
		await waitForMicrotasks();
		await assertPromiseResolved(deletePromise, true);
		await assertPromiseResolved(waitPromise, true);
	},
});
