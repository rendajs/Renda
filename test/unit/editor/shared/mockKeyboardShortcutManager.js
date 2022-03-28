export function createMockKeyboardShortcutManager() {
	const keyboardShortcutManager = /** @type {import("../../../../editor/src/KeyboardShortcuts/KeyboardShortcutManager.js").KeyboardShortcutManager} */ ({
		getCondition(name) {
			const mockCondition = /** @type {import("../../../../editor/src/KeyboardShortcuts/ShortcutCondition.js").ShortcutCondition} */ ({
				requestValueSetter(priority) {
					const mockValueSetter = /** @type {import("../../../../editor/src/KeyboardShortcuts/ShorcutConditionValueSetter.js").ShorcutConditionValueSetter<any>} */ ({
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
