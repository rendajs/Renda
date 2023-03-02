import {assertEquals, assertRejects} from "std/testing/asserts.ts";
import {assertPromiseResolved} from "../../shared/asserts.js";
import {MockIndexedDbUtil, deleteAllDbs, forcePendingOperations} from "./MockIndexedDbUtil.js";

Deno.test({
	name: "Multiple instances share the same data",
	async fn() {
		const db1 = new MockIndexedDbUtil("multipleInstancesTest");
		const db2 = new MockIndexedDbUtil("multipleInstancesTest");

		await db1.set("key", "value");
		assertEquals(await db2.get("key"), "value");
	},
});

Deno.test({
	name: "deletedb",
	async fn() {
		const db1 = new MockIndexedDbUtil("deleteDbTest");
		await db1.set("foo", "bar");
		db1.deleteDb();

		const db2 = new MockIndexedDbUtil("deleteDbTest");
		assertEquals(await db2.get("foo"), undefined);
	},
});

Deno.test({
	name: "forcePendingOperations",
	async fn() {
		const db = new MockIndexedDbUtil("forcePendingOperationsTest");
		forcePendingOperations(true);

		const setPromise = db.set("key", "value");
		await assertPromiseResolved(setPromise, false);

		forcePendingOperations(false);
		await assertPromiseResolved(setPromise, true);

		assertEquals(await db.get("key"), "value");
	},
});

Deno.test({
	name: "deleteAllDbs",
	async fn() {
		const db1 = new MockIndexedDbUtil("deleteAllDbsTest");
		await db1.set("key", "value");
		deleteAllDbs();

		await assertRejects(async () => {
			await db1.set("key2", "value");
		});
		await assertRejects(async () => {
			await db1.get("key2");
		});

		const db2 = new MockIndexedDbUtil("deleteAllDbsTest");
		await db2.set("key3", "value");
		assertEquals(await db2.get("key3"), "value");
	},
});
