import { assertEquals } from "std/testing/asserts.ts";
import { ShortcutCommand } from "../../../../../studio/src/keyboardShortcuts/ShortcutCommand.js";

/**
 * @typedef ShortcutCommandTestContext
 * @property {ShortcutCommand} cmd
 */

/**
 * @param {object} options
 * @param {import("../../../../../studio/src/keyboardShortcuts/ShortcutCommand.js").ShortcutCommandOptions} options.commandOpts
 * @param {(ctx: ShortcutCommandTestContext) => void} options.fn
 * @param {{[x: string]: boolean | string}} [options.shortcutConditions]
 */
function basicTest({
	commandOpts,
	fn,
	shortcutConditions = {},
}) {
	const mockShortcutManager = /** @type {import("../../../../../studio/src/keyboardShortcuts/KeyboardShortcutManager.js").KeyboardShortcutManager<any>} */ ({
		getCondition(name) {
			if (!Object.hasOwn(shortcutConditions, name)) {
				return;
			}
			return {
				value: shortcutConditions[name],
			};
		},
	});
	const cmd = new ShortcutCommand(mockShortcutManager, "cmd", commandOpts);
	fn({ cmd });
}

Deno.test({
	name: "parsedSequences",
	fn() {
		/**
		 * @param {string | string[] | null} keys
		 * @param {import("../../../../../studio/src/keyboardShortcuts/ShortcutCommand.js").ShortcutCommandSequence[]} expectedSequences
		 */
		function sequenceTest(keys, expectedSequences) {
			basicTest({
				commandOpts: {
					defaultKeys: keys,
				},
				fn({ cmd }) {
					assertEquals(cmd.parsedSequences, expectedSequences);
				},
			});
		}

		sequenceTest(null, []);
		sequenceTest("a", [[["a"]]]);
		sequenceTest("ctrl+v", [[["ctrl", "v"]]]);
		sequenceTest(["ctrl+v", "v"], [[["ctrl", "v"]], [["v"]]]);
		sequenceTest("ctrl+k w", [[["ctrl", "k"], ["w"]]]);
		sequenceTest(["ctrl+k w", "ctrl+k v"], [[["ctrl", "k"], ["w"]], [["ctrl", "k"], ["v"]]]);
	},
});

Deno.test({
	name: "verifyCondtions",
	fn() {
		const basicConditions = {
			isTrue: true,
			isFalse: false,
			isFoo: "foo",
			isBar: "bar",
			hasSpaces: "space space space",
			hasSyntax: "syntax&&more||syntax",
		};
		/**
		 * @param {string | undefined} conditions
		 * @param {boolean} expectedResult
		 */
		function conditionsTest(conditions, expectedResult) {
			basicTest({
				commandOpts: {
					conditions,
				},
				shortcutConditions: basicConditions,
				fn({ cmd }) {
					const result = cmd.verifyCondtions();
					assertEquals(result, expectedResult);
				},
			});
		}

		conditionsTest("isTrue", true);
		conditionsTest("isFalse", false);
		conditionsTest("missing", false);
		conditionsTest("isTrue && malformed syntax", false);
		conditionsTest("", true);
	},
});
