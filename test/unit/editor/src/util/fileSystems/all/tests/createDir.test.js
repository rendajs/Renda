import {assertEquals} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls} from "std/testing/mock.ts";
import {testAll} from "../shared.js";
import {registerOnChangeSpy} from "../../shared.js";
import {waitForMicrotasks} from "../../../../../../shared/waitForMicroTasks.js";
import {FsaEditorFileSystem} from "../../../../../../../../editor/src/util/fileSystems/FsaEditorFileSystem.js";
import {MemoryEditorFileSystem} from "../../../../../../../../editor/src/util/fileSystems/MemoryEditorFileSystem.js";

testAll({
	name: "should create a directory and fire onchange",
	async fn(ctx) {
		const fs = await ctx.createFs();
		const onChangeSpy = registerOnChangeSpy(fs);

		const path = ["root", "newdir"];
		const createDirPromise = fs.createDir(path);

		// Change the path to verify that the initial array value is used
		path.push("extra");

		await createDirPromise;

		let hasNewDir = false;
		const {directories} = await fs.readDir(["root"]);
		for (const name of directories) {
			if (name == "newdir") {
				hasNewDir = true;
				break;
			}
		}
		assertEquals(hasNewDir, true);

		const subResult = await fs.readDir(["root", "newdir"]);
		assertEquals(subResult, {
			directories: [],
			files: [],
		});

		assertSpyCalls(onChangeSpy, 1);
		assertSpyCall(onChangeSpy, 0, {
			args: [
				{
					external: false,
					kind: "directory",
					path: ["root", "newdir"],
					type: "created",
				},
			],
		});
	},
});

testAll({
	name: "createDir() the same path twice at the same time",
	async fn(ctx) {
		const fs = await ctx.createFs();
		const promise1 = fs.createDir(["root", "created", "dir1"]);
		const promise2 = fs.createDir(["root", "created", "dir1"]);
		await promise1;
		await promise2;

		const result = await fs.readDir(["root", "created"]);
		assertEquals(result, {
			directories: ["dir1"],
			files: [],
		});
	},
});

testAll({
	name: "createDir() causes waitForWritesFinish to stay pending until done",
	ignore: [FsaEditorFileSystem, MemoryEditorFileSystem],
	async fn(ctx) {
		const fs = await ctx.createFs();

		const createPromise = fs.createDir(["root", "newdir"]);
		const waitPromise = fs.waitForWritesFinish();
		ctx.forcePendingOperations(true);
		let waitPromiseResolved = false;
		waitPromise.then(() => {
			waitPromiseResolved = true;
		});

		await waitForMicrotasks();
		assertEquals(waitPromiseResolved, false);

		ctx.forcePendingOperations(false);
		await createPromise;
		await waitForMicrotasks();
		assertEquals(waitPromiseResolved, true);
	},
});
