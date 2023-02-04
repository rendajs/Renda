import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {installShadowDom} from "fake-dom/FakeShadowRoot.js";
import {assert, assertEquals, assertExists} from "std/testing/asserts.ts";
import {ContentWindowHistory} from "../../../../../../editor/src/windowManagement/contentWindows/ContentWindowHistory.js";

/**
 * @typedef ContentWindowHistoryTestContext
 * @property {ContentWindowHistory} contentWindow
 * @property {() => void} triggerOnTreeUpdated
 * @property {boolean} canUndo
 * @property {boolean} canRedo
 * @property {import("../../../../../../editor/src/misc/HistoryManager.js").HistoryEntriesResult[]} historyEntries
 */

/**
 * @param {string} uiText
 */
function createEntry(uiText) {
	/** @type {import("../../../../../../editor/src/misc/HistoryManager.js").HistoryEntry} */
	const entry = {
		uiText,
		undo() {},
		redo() {},
	};
	return entry;
}

/**
 * @param {object} options
 * @param {(ctx: ContentWindowHistoryTestContext) => void} options.fn
 * @param {import("../../../../../../editor/src/misc/HistoryManager.js").HistoryEntriesResult[]} [options.startHistoryEntries]
 */
function basicTest({fn, startHistoryEntries = []}) {
	installFakeDocument();
	installShadowDom();

	try {
		/** @type {ContentWindowHistoryTestContext} */
		const testContext = {
			contentWindow: /** @type {ContentWindowHistory} */ (/** @type {unknown} */ (null)),
			triggerOnTreeUpdated() {
				onTreeUpdatedCbs.forEach(cb => cb());
			},
			canUndo: false,
			canRedo: false,
			historyEntries: startHistoryEntries,
		};

		/** @type {Set<() => void>} */
		const onTreeUpdatedCbs = new Set();
		const mockEditorInstance = /** @type {import("../../../../../../editor/src/Editor.js").Editor} */ ({
			historyManager: {
				onTreeUpdated(cb) {
					onTreeUpdatedCbs.add(cb);
				},
				*getEntries() {
					for (const entry of testContext.historyEntries) {
						yield entry;
					}
				},
				canUndo() {
					return testContext.canUndo;
				},
				canRedo() {
					return testContext.canRedo;
				},
			},
		});
		const mockWindowManager = /** @type {import("../../../../../../editor/src/windowManagement/WindowManager.js").WindowManager} */ ({});

		testContext.contentWindow = new ContentWindowHistory(mockEditorInstance, mockWindowManager, "basic uuid");

		fn(testContext);
	} finally {
		uninstallFakeDocument();
	}
}

Deno.test({
	name: "Has the correct elements and updates when the tree updates",
	fn() {
		basicTest({
			startHistoryEntries: [
				{
					active: true,
					current: true,
					entry: {
						uiText: "Open",
						undo() {},
						redo() {},
					},
					indentation: 0,
				},
			],
			fn(ctx) {
				const shadow = ctx.contentWindow.contentEl.shadowRoot;
				assertExists(shadow);
				assertEquals(shadow.childElementCount, 2);

				const svgEl = shadow.children[0];
				assertEquals(svgEl.tagName, "svg");
				assertEquals(Array.from(svgEl.children).map(c => c.tagName), ["path", "circle"]);

				const entriesEl = shadow.children[1];
				assertEquals(entriesEl.tagName, "UL");
				assertEquals(entriesEl.childElementCount, 1);
				const entryEl = entriesEl.children[0];
				assertEquals(entryEl.tagName, "LI");
				assertEquals(entryEl.textContent, "Open");
				assert(entryEl.classList.contains("current"));

				ctx.historyEntries = [
					{
						active: true,
						current: false,
						entry: createEntry("Open"),
						indentation: 0,
					},
					{
						active: false,
						current: false,
						entry: createEntry("Branch"),
						indentation: 1,
					},
					{
						active: true,
						current: true,
						entry: createEntry("Entry2"),
						indentation: 0,
					},
				];

				for (const el of [entriesEl, svgEl]) {
					Object.defineProperty(el, "innerHTML", {
						set(value) {
							if (value == "") {
								for (const child of [...this.children]) {
									child.remove();
								}
							}
						},
					});
				}

				ctx.triggerOnTreeUpdated();
				assertEquals(entriesEl.childElementCount, 3);
				assertEquals(Array.from(svgEl.children).map(c => c.tagName), ["path", "path", "circle", "circle", "circle"]);
			},
		});
	},
});
