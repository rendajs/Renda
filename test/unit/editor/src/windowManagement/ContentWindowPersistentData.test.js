import {assertEquals} from "std/testing/asserts.ts";
import {assertSpyCalls, spy} from "std/testing/mock.ts";
import {ContentWindowPersistentData} from "../../../../../editor/src/windowManagement/ContentWindowPersistentData.js";

function createMockWindowManager() {
	const mockWindowManager = /** @type {import("../../../../../editor/src/windowManagement/WindowManager.js").WindowManager} */ ({
		requestContentWindowPersistentDataFlush() {},
	});
	return mockWindowManager;
}

Deno.test({
	name: "Saving loading, getting and setting",
	async fn() {
		const data = new ContentWindowPersistentData();
		data.setWindowManager(createMockWindowManager());
		data.setAll({
			foo: "foo",
			bar: true,
		});

		assertEquals(data.get("foo"), "foo");
		assertEquals(data.get("bar"), true);
		assertEquals(data.get("nonexistent"), undefined);

		await data.set("foo", "foo2");
		await data.set("bar", false);
		await data.set("nonexistent", 42);

		assertEquals(data.get("foo"), "foo2");
		assertEquals(data.get("bar"), false);
		assertEquals(data.get("nonexistent"), 42);

		assertEquals(data.getAll(), {
			foo: "foo2",
			bar: false,
			nonexistent: 42,
		});
	},
});

Deno.test({
	name: "flushing data",
	async fn() {
		const windowManager = createMockWindowManager();
		const flushRequestSpy = spy(windowManager, "requestContentWindowPersistentDataFlush");
		const data = new ContentWindowPersistentData();
		data.setWindowManager(windowManager);

		await data.set("foo", "bar");
		assertSpyCalls(flushRequestSpy, 1);

		await data.set("foo", "bar", false);
		assertSpyCalls(flushRequestSpy, 1);

		await data.flush();
		assertSpyCalls(flushRequestSpy, 2);
	},
});

Deno.test({
	name: "onDataLoad events",
	async fn() {
		const data = new ContentWindowPersistentData();
		const spyFn = spy();
		data.onDataLoad(spyFn);

		data.setAll({});
		assertSpyCalls(spyFn, 1);

		data.removeOnDataLoad(spyFn);

		data.setAll({});
		assertSpyCalls(spyFn, 1);
	},
});
