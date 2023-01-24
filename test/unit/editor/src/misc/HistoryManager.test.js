import {HistoryManager} from "../../../../../editor/src/misc/HistoryManager.js";
import {assertSpyCalls, spy} from "std/testing/mock.ts";
import {assertEquals, assertExists} from "std/testing/asserts.ts";

/**
 * @typedef HistoryManagerTestContext
 * @property {HistoryManager} manager
 * @property {() => void} fireUndoShortcut
 * @property {() => void} fireRedoShortcut
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
 * @param {Object} options
 * @param {(ctx: HistoryManagerTestContext) => void} options.fn
 */
function basicTest({
	fn,
}) {
	/** @type {Map<string, Set<import("../../../../../editor/src/keyboardShortcuts/KeyboardShortcutManager.js").CommandCallback>>} */
	const commandCallbacks = new Map();
	const mockShortuctManager = /** @type {import("../../../../../editor/src/keyboardShortcuts/KeyboardShortcutManager.js").KeyboardShortcutManager} */ ({
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
			const mockEvent = /** @type {import("../../../../../editor/src/keyboardShortcuts/KeyboardShortcutManager.js").CommandCallbackEvent} */ ({});
			cbs.forEach(cb => cb(mockEvent));
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
		expectEntries(expectedEntries) {
			const actualEntries = Array.from(manager.getEntries());
			const mapped = actualEntries.map(entry => {
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
			fn({manager, fireUndoShortcut, fireRedoShortcut}) {
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
			fn({manager}) {
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

				assertSpyCalls(undoSpy1, 0);
				manager.undo();
				assertSpyCalls(undoSpy1, 1);

				// Undo when there are no entries to undo should do nothing
				manager.undo();

				assertSpyCalls(redoSpy1, 0);
				manager.redo();
				assertSpyCalls(redoSpy1, 1);

				assertSpyCalls(redoSpy2, 0);
				manager.redo();
				assertSpyCalls(redoSpy2, 1);

				// Undo when there are no entries to redo should do nothing
				manager.redo();

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
			fn({manager, fireUndoShortcut}) {
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
			fn({manager, expectEntries, executeEntry}) {
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
			fn({manager}) {
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
			fn({manager, executeEntry, stateCalls, clearStateCalls, expectEntries}) {
				executeEntry("entry1");
				executeEntry("entry2");
				executeEntry("entry3");
				const entry3 = Array.from(manager.getEntries()).find(entry => entry.current);
				assertExists(entry3);
				executeEntry("entry4");
				manager.undo();
				manager.undo();
				clearStateCalls();

				const updatedSpy = spy();
				manager.onTreeUpdated(updatedSpy);

				manager.travelToEntry(entry3.entry);

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
			fn({manager, executeEntry, stateCalls, clearStateCalls, expectEntries}) {
				executeEntry("entry1");
				executeEntry("entry2");
				const entry2 = Array.from(manager.getEntries()).find(entry => entry.current);
				assertExists(entry2);
				executeEntry("entry3");
				executeEntry("entry4");
				manager.undo();
				clearStateCalls();

				const updatedSpy = spy();
				manager.onTreeUpdated(updatedSpy);

				manager.travelToEntry(entry2.entry);

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
			fn({manager, executeEntry, expectEntries, stateCalls, clearStateCalls}) {
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

				const entry2 = Array.from(manager.getEntries()).find(entry => entry.current);
				assertExists(entry2);

				const updatedSpy = spy();
				manager.onTreeUpdated(updatedSpy);

				manager.travelToEntry(entry2.entry);

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
			fn({manager, executeEntry, expectEntries, stateCalls, clearStateCalls}) {
				executeEntry("entry1");
				executeEntry("entry2");

				const entry2 = Array.from(manager.getEntries()).find(entry => entry.current);
				assertExists(entry2);

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

				manager.travelToEntry(entry2.entry);

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
