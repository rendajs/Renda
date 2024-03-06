import { HistoryManager } from "../../../../../studio/src/misc/HistoryManager.js";
import { assertSpyCalls, spy } from "std/testing/mock.ts";
import { assertEquals, assertExists, assertStrictEquals } from "std/testing/asserts.ts";

/**
 * @typedef HistoryManagerTestContext
 * @property {HistoryManager} manager
 * @property {() => void} fireUndoShortcut
 * @property {() => void} fireRedoShortcut
 * @property {() => import("../../../../../studio/src/misc/HistoryManager.js").HistoryEntry} getCurrentEntry Attempts to get
 * the active history entry and throws if it doesn't exist.
 * @property {(expectedEntries: ExpectedEntry[]) => void} expectEntries Calls `getEntries()` and asserts if the result is correct.
 * @property {string[]} stateCalls A list of strings indicating which entries have been executed.
 * @property {(uiText: string) => void} executeEntry Pushes an entry to the manager that adds a string to `stateCalls` whenever
 * an undo or a redo is executed.
 * @property {() => void} clearStateCalls
 */

/**
 * @typedef ExpectedEntry
 * @property {string} uiText
 * @property {boolean} active
 * @property {boolean} current
 * @property {number} indentation
 */

/**
 * @param {object} options
 * @param {(ctx: HistoryManagerTestContext) => void} options.fn
 */
function basicTest({
	fn,
}) {
	/** @type {Map<string, Set<import("../../../../../studio/src/keyboardShortcuts/KeyboardShortcutManager.js").CommandCallback>>} */
	const commandCallbacks = new Map();
	const mockShortuctManager = /** @type {import("../../../../../studio/src/keyboardShortcuts/KeyboardShortcutManager.js").KeyboardShortcutManager<any>} */ ({
		onCommand(command, cb) {
			let cbs = commandCallbacks.get(command);
			if (!cbs) {
				cbs = new Set();
				commandCallbacks.set(command, cbs);
			}
			cbs.add(cb);
		},
	});
	const manager = new HistoryManager(mockShortuctManager);

	/**
	 * @param {string} command
	 */
	function fireShortcutCommand(command) {
		const cbs = commandCallbacks.get(command);
		if (cbs) {
			const mockEvent = /** @type {import("../../../../../studio/src/keyboardShortcuts/KeyboardShortcutManager.js").CommandCallbackEvent} */ ({});
			cbs.forEach((cb) => cb(mockEvent));
		}
	}

	/** @type {string[]} */
	const stateCalls = [];

	fn({
		manager,
		fireUndoShortcut() {
			fireShortcutCommand("history.undo");
		},
		fireRedoShortcut() {
			fireShortcutCommand("history.redo");
		},
		getCurrentEntry() {
			const entry = Array.from(manager.getEntries()).find((entry) => entry.current);
			assertExists(entry);
			return entry.entry;
		},
		expectEntries(expectedEntries) {
			const actualEntries = Array.from(manager.getEntries());
			const mapped = actualEntries.map((entry) => {
				/** @type {ExpectedEntry} */
				const mappedEntry = {
					uiText: entry.entry.uiText,
					active: entry.active,
					current: entry.current,
					indentation: entry.indentation,
				};
				return mappedEntry;
			});
			assertEquals(mapped, expectedEntries);
		},
		stateCalls,
		executeEntry(uiText) {
			manager.executeEntry({
				uiText,
				undo: () => {
					stateCalls.push("undo " + uiText);
				},
				redo: () => {
					stateCalls.push("redo " + uiText);
				},
			});
		},
		clearStateCalls() {
			stateCalls.splice(0, stateCalls.length);
		},
	});
}

Deno.test({
	name: "undo and redo shortcuts",
	fn() {
		basicTest({
			fn({ manager, fireUndoShortcut, fireRedoShortcut }) {
				const undoSpy = spy();
				const redoSpy = spy();
				manager.pushEntry({
					uiText: "text",
					undo: undoSpy,
					redo: redoSpy,
				});

				assertSpyCalls(undoSpy, 0);
				fireUndoShortcut();
				assertSpyCalls(undoSpy, 1);

				assertSpyCalls(redoSpy, 0);
				fireRedoShortcut();
				assertSpyCalls(redoSpy, 1);
			},
		});
	},
});

Deno.test({
	name: "multiple nodes",
	fn() {
		basicTest({
			fn({ manager }) {
				const undoSpy1 = spy();
				const redoSpy1 = spy();
				manager.pushEntry({
					uiText: "entry1",
					undo: undoSpy1,
					redo: redoSpy1,
				});
				const undoSpy2 = spy();
				const redoSpy2 = spy();
				manager.pushEntry({
					uiText: "entry2",
					undo: undoSpy2,
					redo: redoSpy2,
				});

				assertSpyCalls(undoSpy2, 0);
				manager.undo();
				assertSpyCalls(undoSpy2, 1);

				assertEquals(manager.canUndo(), true);

				assertSpyCalls(undoSpy1, 0);
				manager.undo();
				assertSpyCalls(undoSpy1, 1);

				// Undo when there are no entries to undo should do nothing
				manager.undo();
				assertEquals(manager.canUndo(), false);

				assertSpyCalls(redoSpy1, 0);
				manager.redo();
				assertSpyCalls(redoSpy1, 1);

				assertEquals(manager.canRedo(), true);

				assertSpyCalls(redoSpy2, 0);
				manager.redo();
				assertSpyCalls(redoSpy2, 1);

				// Undo when there are no entries to redo should do nothing
				manager.redo();
				assertEquals(manager.canRedo(), false);

				assertSpyCalls(undoSpy2, 1);
				manager.undo();
				assertSpyCalls(undoSpy2, 2);
			},
		});
	},
});

Deno.test({
	name: "executeEntry",
	fn() {
		basicTest({
			fn({ manager, fireUndoShortcut }) {
				const undoSpy = spy();
				const redoSpy = spy();
				manager.executeEntry({
					uiText: "text",
					undo: undoSpy,
					redo: redoSpy,
				});
				assertSpyCalls(redoSpy, 1);

				assertSpyCalls(undoSpy, 0);
				fireUndoShortcut();
				assertSpyCalls(undoSpy, 1);
			},
		});
	},
});

Deno.test({
	name: "getEntries",
	fn() {
		basicTest({
			fn({ manager, expectEntries, executeEntry }) {
				expectEntries([
					{
						uiText: "Open",
						active: true,
						current: true,
						indentation: 0,
					},
				]);

				executeEntry("entry1");
				executeEntry("entry2");
				executeEntry("entry3");

				expectEntries([
					{
						uiText: "Open",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry1",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry2",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry3",
						active: true,
						current: true,
						indentation: 0,
					},
				]);

				manager.undo();
				manager.undo();

				expectEntries([
					{
						uiText: "Open",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry1",
						active: true,
						current: true,
						indentation: 0,
					},
					{
						uiText: "entry2",
						active: false,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry3",
						active: false,
						current: false,
						indentation: 0,
					},
				]);

				executeEntry("subEntry1");
				executeEntry("subEntry2");

				expectEntries([
					{
						uiText: "Open",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry1",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry2",
						active: false,
						current: false,
						indentation: 1,
					},
					{
						uiText: "entry3",
						active: false,
						current: false,
						indentation: 1,
					},
					{
						uiText: "subEntry1",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "subEntry2",
						active: true,
						current: true,
						indentation: 0,
					},
				]);
			},
		});
	},
});

Deno.test({
	name: "onTreeUpdated",
	fn() {
		basicTest({
			fn({ manager }) {
				const updatedSpy = spy();
				manager.onTreeUpdated(updatedSpy);

				manager.pushEntry({
					uiText: "text",
					undo: () => {},
					redo: () => {},
				});
				assertSpyCalls(updatedSpy, 1);

				manager.undo();
				assertSpyCalls(updatedSpy, 2);

				manager.undo();
				assertSpyCalls(updatedSpy, 2);

				manager.redo();
				assertSpyCalls(updatedSpy, 3);

				manager.removeOnTreeUpdated(updatedSpy);
				manager.pushEntry({
					uiText: "text",
					undo: () => {},
					redo: () => {},
				});
				assertSpyCalls(updatedSpy, 3);
			},
		});
	},
});

Deno.test({
	name: "travelToEntry down",
	fn() {
		basicTest({
			fn({ manager, executeEntry, getCurrentEntry, stateCalls, clearStateCalls, expectEntries }) {
				executeEntry("entry1");
				executeEntry("entry2");
				executeEntry("entry3");
				const entry3 = getCurrentEntry();
				executeEntry("entry4");
				manager.undo();
				manager.undo();
				clearStateCalls();

				const updatedSpy = spy();
				manager.onTreeUpdated(updatedSpy);

				manager.travelToEntry(entry3);

				assertEquals(stateCalls, ["redo entry3"]);
				assertSpyCalls(updatedSpy, 1);

				expectEntries([
					{
						uiText: "Open",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry1",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry2",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry3",
						active: true,
						current: true,
						indentation: 0,
					},
					{
						uiText: "entry4",
						active: false,
						current: false,
						indentation: 0,
					},
				]);
			},
		});
	},
});

Deno.test({
	name: "travelToEntry up",
	fn() {
		basicTest({
			fn({ manager, executeEntry, getCurrentEntry, stateCalls, clearStateCalls, expectEntries }) {
				executeEntry("entry1");
				executeEntry("entry2");
				const entry2 = getCurrentEntry();
				executeEntry("entry3");
				executeEntry("entry4");
				manager.undo();
				clearStateCalls();

				const updatedSpy = spy();
				manager.onTreeUpdated(updatedSpy);

				manager.travelToEntry(entry2);

				assertEquals(stateCalls, ["undo entry3"]);
				assertSpyCalls(updatedSpy, 1);

				expectEntries([
					{
						uiText: "Open",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry1",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry2",
						active: true,
						current: true,
						indentation: 0,
					},
					{
						uiText: "entry3",
						active: false,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry4",
						active: false,
						current: false,
						indentation: 0,
					},
				]);
			},
		});
	},
});

Deno.test({
	name: "travelToEntry to current entry",
	fn() {
		basicTest({
			fn({ manager, executeEntry, getCurrentEntry, expectEntries, stateCalls, clearStateCalls }) {
				executeEntry("entry1");
				executeEntry("entry2");
				executeEntry("entry3");

				manager.undo();

				assertEquals(stateCalls, [
					"redo entry1",
					"redo entry2",
					"redo entry3",
					"undo entry3",
				]);
				clearStateCalls();

				const entry2 = getCurrentEntry();

				const updatedSpy = spy();
				manager.onTreeUpdated(updatedSpy);

				manager.travelToEntry(entry2);

				assertEquals(stateCalls, []);
				assertSpyCalls(updatedSpy, 0);

				expectEntries([
					{
						uiText: "Open",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry1",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry2",
						active: true,
						current: true,
						indentation: 0,
					},
					{
						uiText: "entry3",
						active: false,
						current: false,
						indentation: 0,
					},
				]);
			},
		});
	},
});

Deno.test({
	name: "travelToEntry up and into a subtree",
	fn() {
		basicTest({
			fn({ manager, executeEntry, getCurrentEntry, expectEntries, stateCalls, clearStateCalls }) {
				executeEntry("entry1");
				executeEntry("entry2");

				const entry2 = getCurrentEntry();

				executeEntry("entry3");

				manager.undo();
				manager.undo();

				executeEntry("subEntry1");
				executeEntry("subEntry2");

				assertEquals(stateCalls, [
					"redo entry1",
					"redo entry2",
					"redo entry3",
					"undo entry3",
					"undo entry2",
					"redo subEntry1",
					"redo subEntry2",
				]);
				clearStateCalls();

				const updatedSpy = spy();
				manager.onTreeUpdated(updatedSpy);

				manager.travelToEntry(entry2);

				assertEquals(stateCalls, [
					"undo subEntry2",
					"undo subEntry1",
					"redo entry2",
				]);

				assertSpyCalls(updatedSpy, 1);

				expectEntries([
					{
						uiText: "Open",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry1",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry2",
						active: true,
						current: true,
						indentation: 1,
					},
					{
						uiText: "entry3",
						active: false,
						current: false,
						indentation: 1,
					},
					{
						uiText: "subEntry1",
						active: false,
						current: false,
						indentation: 0,
					},
					{
						uiText: "subEntry2",
						active: false,
						current: false,
						indentation: 0,
					},
				]);
			},
		});
	},
});

Deno.test({
	name: "Pushing entries to a subtree makes it the main branch",
	fn() {
		basicTest({
			fn({ manager, executeEntry, getCurrentEntry, expectEntries }) {
				executeEntry("entry1");
				executeEntry("entry2");
				executeEntry("entry3");
				const entry3 = getCurrentEntry();
				manager.undo();
				executeEntry("subEntry1");
				executeEntry("subEntry2");
				manager.travelToEntry(entry3);

				const updatedSpy = spy();
				manager.onTreeUpdated(updatedSpy);

				executeEntry("entry4");

				assertSpyCalls(updatedSpy, 1);

				expectEntries([
					{
						uiText: "Open",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry1",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry2",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "subEntry1",
						active: false,
						current: false,
						indentation: 1,
					},
					{
						uiText: "subEntry2",
						active: false,
						current: false,
						indentation: 1,
					},
					{
						uiText: "entry3",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry4",
						active: true,
						current: true,
						indentation: 0,
					},
				]);
			},
		});
	},
});

Deno.test({
	name: "Creating a subtree on a subtree makes it the main branch",
	fn() {
		basicTest({
			fn({ manager, executeEntry, getCurrentEntry, expectEntries }) {
				executeEntry("entry1");
				executeEntry("entry2");
				const entry2 = getCurrentEntry();
				executeEntry("entry3");
				manager.undo();
				manager.undo();
				executeEntry("subEntry1");
				executeEntry("subEntry2");
				manager.travelToEntry(entry2);

				const updatedSpy = spy();
				manager.onTreeUpdated(updatedSpy);

				executeEntry("subSubEntry");

				assertSpyCalls(updatedSpy, 1);

				expectEntries([
					{
						uiText: "Open",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry1",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "subEntry1",
						active: false,
						current: false,
						indentation: 1,
					},
					{
						uiText: "subEntry2",
						active: false,
						current: false,
						indentation: 1,
					},
					{
						uiText: "entry2",
						active: true,
						current: false,
						indentation: 0,
					},
					{
						uiText: "entry3",
						active: false,
						current: false,
						indentation: 1,
					},
					{
						uiText: "subSubEntry",
						active: true,
						current: true,
						indentation: 0,
					},
				]);
			},
		});
	},
});

Deno.test({
	name: "Using redo chooses the main branch",
	fn() {
		basicTest({
			fn({ manager, executeEntry, getCurrentEntry }) {
				executeEntry("entry1");
				executeEntry("entry2");
				executeEntry("entry3");
				executeEntry("entry4");
				manager.undo();
				manager.undo();
				executeEntry("subEntry1");
				executeEntry("subEntry2");
				const subEntry2 = getCurrentEntry();
				manager.undo();
				manager.undo();
				manager.redo();
				manager.redo();
				assertStrictEquals(getCurrentEntry(), subEntry2);
			},
		});
	},
});
