import {assert, assertEquals, assertRejects} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls} from "std/testing/mock.ts";
import {assertPromiseResolved} from "../../../../../../shared/asserts.js";
import {waitForMicrotasks} from "../../../../../../shared/waitForMicroTasks.js";
import {registerOnChangeSpy} from "../../shared.js";
import {testAll} from "../shared.js";

testAll({
	name: "writeFile should create the file and fire onChange",
	ignore: ["remote"],
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
					type: "created",
				},
			],
		});
	},
});

testAll({
	name: "writeFile to existing file should overwrite it and fire change event",
	ignore: ["remote"],
	async fn(ctx) {
		const fs = await ctx.createBasicFs({disableStructuredClone: true});
		const onChangeSpy = registerOnChangeSpy(fs);

		const path = ["root", "file1"];
		const writeFilePromise = fs.writeFile(path, "newText");

		// Change the path to verify that the initial array is used
		path.push("extra");

		await writeFilePromise;

		const result = await fs.readText(["root", "file1"]);
		assertEquals(result, "newText");

		assertSpyCalls(onChangeSpy, 1);
		assertSpyCall(onChangeSpy, 0, {
			args: [
				{
					external: false,
					kind: "file",
					path: ["root", "file1"],
					type: "changed",
				},
			],
		});
	},
});

testAll({
	name: "writeFile should create parent directories when they don't exist",
	ignore: ["remote"],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();
		const onChangeSpy = registerOnChangeSpy(fs);

		const path = ["root", "parent", "newfile"];
		const writeFilePromise = fs.writeFile(path, "text");

		// Change the path to verify that the initial array is used
		path.push("extra");

		await writeFilePromise;

		const {directories} = await fs.readDir(["root"]);
		assert(directories.includes("parent"), "'parent' was not created");

		const {files} = await fs.readDir(["root", "parent"]);
		assert(files.includes("newfile"), "'newfile' was not created");

		assertSpyCalls(onChangeSpy, 2);
		assertSpyCall(onChangeSpy, 0, {
			args: [
				{
					external: false,
					kind: "directory",
					path: ["root", "parent"],
					type: "created",
				},
			],
		});
		assertSpyCall(onChangeSpy, 1, {
			args: [
				{
					external: false,
					kind: "file",
					path: ["root", "parent", "newfile"],
					type: "created",
				},
			],
		});
	},
});

testAll({
	name: "writeFile should error when the target is a directory",
	ignore: ["indexedDb"],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await assertRejects(async () => {
			await fs.writeFile(["root", "onlydirs"], "hello world");
		}, Error, `Couldn't writeFile, "root/onlydirs" is not a file.`);
	},
});

testAll({
	name: "writeFile should error when a parent is not a directory",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await assertRejects(async () => {
			await fs.writeFile(["root", "file1", "newfile"], "hello world");
		}, Error, `Couldn't writeFile at "root/file1/newfile", "root/file1" is not a directory.`);
	},
});

testAll({
	name: "writeFile should error when a parent of parent is not a directory",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await assertRejects(async () => {
			await fs.writeFile(["root", "file1", "anotherdir", "newfile"], "hello world");
		}, Error, `Couldn't writeFile at "root/file1/anotherdir/newfile", "root/file1" is not a directory.`);
	},
});

testAll({
	name: "writeFile() causes waitForWritesFinish to stay pending until done",
	ignore: ["fsa", "memory", "remote"],
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
