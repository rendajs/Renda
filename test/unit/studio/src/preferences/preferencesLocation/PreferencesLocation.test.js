import { assertEquals } from "std/testing/asserts.ts";
import { assertSpyCall, assertSpyCalls, spy } from "std/testing/mock.ts";
import { PreferencesLocation } from "../../../../../../studio/src/preferences/preferencesLocation/PreferencesLocation.js";

Deno.test({
	name: "Basic get, set, has and delete",
	fn() {
		const location = new PreferencesLocation("global");

		assertEquals(location.has("not set"), false);
		assertEquals(location.get("not set"), undefined);
		assertEquals(location.delete("not set"), false);

		location.set("num", 42);
		assertEquals(location.get("num"), 42);
		assertEquals(location.has("num"), true);
		assertEquals(location.delete("num"), true);
		assertEquals(location.get("num"), undefined);
	},
});

Deno.test({
	name: "Fires load callbacks",
	fn() {
		const location = new PreferencesLocation("global");

		/** @type {Parameters<typeof location.onPreferenceLoaded>[0]} */
		const fn = () => {};
		const spyFn = spy(fn);
		let fireCount = 0;

		location.onPreferenceLoaded(spyFn);

		assertSpyCalls(spyFn, fireCount);
		location.loadPreferences({
			foo: "foo",
			bar: true,
			baz: 42,
		});

		fireCount += 3;
		assertSpyCalls(spyFn, fireCount);
		assertSpyCall(spyFn, fireCount - 3, {
			args: ["foo"],
		});
		assertSpyCall(spyFn, fireCount - 2, {
			args: ["bar"],
		});
		assertSpyCall(spyFn, fireCount - 1, {
			args: ["baz"],
		});

		location.loadPreferences({
			foo: "foo2", // Value is changed, should fire events
			bar: true, // Value is *not* changed, should not fire event
			// baz has been removed, should fire an event
		});

		fireCount += 2;
		assertSpyCalls(spyFn, fireCount);
		assertSpyCall(spyFn, fireCount - 2, {
			args: ["foo"],
		});
		assertSpyCall(spyFn, fireCount - 1, {
			args: ["baz"],
		});

		// Removing should no longer fire events
		location.removeOnPreferenceLoaded(spyFn);
		location.loadPreferences({
			foo: "foo3",
			bar: false,
			baz: 43,
		});
		assertSpyCalls(spyFn, fireCount);
	},
});

Deno.test({
	name: "getAllPreferences",
	fn() {
		const location = new PreferencesLocation("global");
		location.loadPreferences({
			foo: "foo",
		});
		location.set("bar", true);

		assertEquals(location.getAllPreferences(), {
			foo: "foo",
			bar: true,
		});
	},
});
