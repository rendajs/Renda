import {HistoryManager} from "../../../../../editor/src/misc/HistoryManager.js";
import {assertSpyCalls, spy} from "std/testing/mock.ts";

/**
 * @typedef HistoryManagerTestContext
 * @property {HistoryManager} manager
 * @property {() => void} fireUndoShortcut
 * @property {() => void} fireRedoShortcut
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

	fn({
		manager,
		fireUndoShortcut() {
			fireShortcutCommand("history.undo");
		},
		fireRedoShortcut() {
			fireShortcutCommand("history.redo");
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

			}
		})
	}
})
