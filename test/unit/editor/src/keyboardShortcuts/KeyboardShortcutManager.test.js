import {KeyboardShortcutManager} from "../../../../../editor/src/keyboardShortcuts/KeyboardShortcutManager.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {KeyboardEvent} from "fake-dom/FakeKeyboardEvent.js";
import {assertSpyCalls, spy} from "std/testing/mock.ts";
import {assertEquals} from "std/testing/asserts.ts";
import {incrementTime, installMockTime, uninstallMockTime} from "../../../shared/mockTime.js";

/**
 * @typedef KeyboardShortcutManagerTestContext
 * @property {KeyboardShortcutManager} manager
 * @property {import("std/testing/mock.ts").Spy<any, [e: import("../../../../../editor/src/keyboardShortcuts/KeyboardShortcutManager.js").CommandCallbackEvent], void>} commandSpy A spy that you can use to observe command events.
 * @property {(code: string, down: boolean) => KeyboardEvent} fireKeyEvent
 */

/**
 * @param {object} options
 * @param {(ctx: KeyboardShortcutManagerTestContext) => void} options.fn The test function
 */
function basicSetup({
	fn,
}) {
	installFakeDocument();
	/**
	 * @param {import("../../../../../editor/src/keyboardShortcuts/KeyboardShortcutManager.js").CommandCallbackEvent} e
	 */
	const spyFn = e => {};
	const commandSpy = spy(spyFn);

	/**
	 * @param {string} code
	 * @param {boolean} down
	 */
	function fireKeyEvent(code, down) {
		const event = new KeyboardEvent(down ? "keydown" : "keyup", {
			code,
			cancelable: true,
		});
		document.body.dispatchEvent(event);
		return event;
	}

	try {
		const manager = new KeyboardShortcutManager();
		fn({manager, commandSpy, fireKeyEvent});
	} finally {
		uninstallFakeDocument();
	}
}

Deno.test({
	name: "holdType single",
	fn() {
		basicSetup({
			fn({manager, commandSpy, fireKeyEvent}) {
				manager.registerCommand({
					command: "cmd",
					defaultKeys: ["a"],
					holdType: "single",
				});
				manager.onCommand("cmd", commandSpy);

				const event1 = fireKeyEvent("KeyA", true);
				assertSpyCalls(commandSpy, 1);
				assertEquals(commandSpy.calls[0].args[0].command.holdStateActive, false);
				assertEquals(event1.defaultPrevented, true);

				const event2 = fireKeyEvent("KeyA", false);
				assertSpyCalls(commandSpy, 1);
				assertEquals(commandSpy.calls[0].args[0].command.holdStateActive, false);
				assertEquals(event2.defaultPrevented, false);
			},
		});
	},
});

Deno.test({
	name: "holdType hold",
	fn() {
		basicSetup({
			fn({manager, commandSpy, fireKeyEvent}) {
				manager.registerCommand({
					command: "cmd",
					defaultKeys: ["a"],
					holdType: "hold",
				});
				manager.onCommand("cmd", commandSpy);

				const event1 = fireKeyEvent("KeyA", true);
				assertSpyCalls(commandSpy, 1);
				assertEquals(commandSpy.calls[0].args[0].command.holdStateActive, true);
				assertEquals(event1.defaultPrevented, true);

				const event2 = fireKeyEvent("KeyA", false);
				assertSpyCalls(commandSpy, 2);
				assertEquals(commandSpy.calls[1].args[0].command.holdStateActive, false);
				assertEquals(event2.defaultPrevented, false);
			},
		});
	},
});

Deno.test({
	name: "holdType toggle",
	fn() {
		basicSetup({
			fn({manager, commandSpy, fireKeyEvent}) {
				manager.registerCommand({
					command: "cmd",
					defaultKeys: ["a"],
					holdType: "toggle",
				});
				manager.onCommand("cmd", commandSpy);

				const event1 = fireKeyEvent("KeyA", true);
				assertSpyCalls(commandSpy, 1);
				assertEquals(commandSpy.calls[0].args[0].command.holdStateActive, true);
				assertEquals(event1.defaultPrevented, true);

				const event2 = fireKeyEvent("KeyA", false);
				assertSpyCalls(commandSpy, 1);
				assertEquals(event2.defaultPrevented, false);

				const event3 = fireKeyEvent("KeyA", true);
				assertSpyCalls(commandSpy, 2);
				assertEquals(commandSpy.calls[1].args[0].command.holdStateActive, false);
				assertEquals(event3.defaultPrevented, true);

				const event4 = fireKeyEvent("KeyA", false);
				assertSpyCalls(commandSpy, 2);
				assertEquals(event4.defaultPrevented, false);
			},
		});
	},
});

Deno.test({
	name: "holdType smart: toggle",
	fn() {
		basicSetup({
			fn({manager, commandSpy, fireKeyEvent}) {
				manager.registerCommand({
					command: "cmd",
					defaultKeys: ["a"],
					holdType: "smart",
				});
				manager.onCommand("cmd", commandSpy);

				const event1 = fireKeyEvent("KeyA", true);
				assertSpyCalls(commandSpy, 1);
				assertEquals(commandSpy.calls[0].args[0].command.holdStateActive, true);
				assertEquals(event1.defaultPrevented, true);

				const event2 = fireKeyEvent("KeyA", false);
				assertSpyCalls(commandSpy, 1);
				assertEquals(event2.defaultPrevented, false);

				const event3 = fireKeyEvent("KeyA", true);
				assertSpyCalls(commandSpy, 2);
				assertEquals(commandSpy.calls[1].args[0].command.holdStateActive, false);
				assertEquals(event3.defaultPrevented, true);

				const event4 = fireKeyEvent("KeyA", false);
				assertSpyCalls(commandSpy, 2);
				assertEquals(event4.defaultPrevented, false);
			},
		});
	},
});

Deno.test({
	name: "forcing hold state while the key is still down",
	fn() {
		basicSetup({
			fn({manager, commandSpy, fireKeyEvent}) {
				manager.registerCommand({
					command: "cmd",
					defaultKeys: ["a"],
					holdType: "smart",
				});
				manager.onCommand("cmd", commandSpy);

				const event1 = fireKeyEvent("KeyA", true);
				assertSpyCalls(commandSpy, 1);
				assertEquals(commandSpy.calls[0].args[0].command.holdStateActive, true);
				assertEquals(event1.defaultPrevented, true);

				const event2 = fireKeyEvent("KeyA", false);
				assertSpyCalls(commandSpy, 1);
				assertEquals(event2.defaultPrevented, false);

				// force release the hold state
				commandSpy.calls[0].args[0].command.setHoldStateActive(false);

				const event3 = fireKeyEvent("KeyA", true);
				assertSpyCalls(commandSpy, 2);
				assertEquals(commandSpy.calls[1].args[0].command.holdStateActive, true);
				assertEquals(event3.defaultPrevented, true);

				const event4 = fireKeyEvent("KeyA", false);
				assertSpyCalls(commandSpy, 2);
				assertEquals(event4.defaultPrevented, false);
			},
		});
	},
});

Deno.test({
	name: "holdType smart: hold",
	fn() {
		basicSetup({
			fn({manager, commandSpy, fireKeyEvent}) {
				installMockTime();

				try {
					manager.registerCommand({
						command: "cmd",
						defaultKeys: ["a"],
						holdType: "smart",
					});
					manager.onCommand("cmd", commandSpy);

					const event1 = fireKeyEvent("KeyA", true);
					assertSpyCalls(commandSpy, 1);
					assertEquals(commandSpy.calls[0].args[0].command.holdStateActive, true);
					assertEquals(event1.defaultPrevented, true);

					incrementTime(1_000);

					const event2 = fireKeyEvent("KeyA", false);
					assertSpyCalls(commandSpy, 2);
					assertEquals(commandSpy.calls[1].args[0].command.holdStateActive, false);
					assertEquals(event2.defaultPrevented, false);
				} finally {
					uninstallMockTime();
				}
			},
		});
	},
});

Deno.test({
	name: "shortcut sequence",
	// TODO: #349
	ignore: true,
	fn() {
		basicSetup({
			fn({manager, commandSpy, fireKeyEvent}) {
				manager.registerCommand({
					command: "cmd",
					defaultKeys: ["ctrl+a b"],
				});
				manager.onCommand("cmd", commandSpy);

				fireKeyEvent("ControlLeft", true);
				fireKeyEvent("KeyA", true);
				fireKeyEvent("KeyA", false);
				fireKeyEvent("ControlLeft", false);

				assertSpyCalls(commandSpy, 0);

				fireKeyEvent("KeyB", true);
				assertSpyCalls(commandSpy, 1);
			},
		});
	},
});
