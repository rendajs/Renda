export function createMockKeyboardShortcutManager() {
	const keyboardShortcutManager = /** @type {import("../../../../studio/src/keyboardShortcuts/KeyboardShortcutManager.js").KeyboardShortcutManager<any>} */ ({
		onCommand(command, cb) {},
		getCondition(name) {
			const mockCondition = /** @type {import("../../../../studio/src/keyboardShortcuts/ShortcutCondition.js").ShortcutCondition<any>} */ ({
				requestValueSetter(priority) {
					const mockValueSetter = /** @type {import("../../../../studio/src/keyboardShortcuts/ShorcutConditionValueSetter.js").ShorcutConditionValueSetter<any>} */ ({
						setValue(value) {},
					});
					return mockValueSetter;
				},
			});
			return mockCondition;
		},
	});

	return {
		keyboardShortcutManager,
	};
}
