import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {assertEquals, assertExists, assertInstanceOf, assertNotStrictEquals, assertStrictEquals} from "std/testing/asserts";
import {PropertiesWindowContent} from "../../../../../../editor/src/propertiesWindowContent/PropertiesWindowContent.js";
import {ContentWindowProperties} from "../../../../../../editor/src/windowManagement/contentWindows/ContentWindowProperties.js";
import {EmptyPropertiesWindowContent} from "../../../../../../editor/src/propertiesWindowContent/EmptyPropertiesWindowContent.js";

const BASIC_WINDOW_UUID = "basic window uuid";

class PropertiesWindowContentExtended1 extends PropertiesWindowContent {
	/**
	 * @param {ConstructorParameters<typeof PropertiesWindowContent>} args
	 */
	constructor(...args) {
		super(...args);
		/** @type {unknown[][]}  */
		this.activeObjectsChangedCalls = [];
		this.destructed = false;
	}

	destructor() {
		super.destructor();
		this.destructed = true;
	}

	/**
	 * @param {unknown[]} selectedObjects
	 */
	activeObjectsChanged(selectedObjects) {
		this.activeObjectsChangedCalls.push([...selectedObjects]);
	}
}

class PropertiesWindowContentExtended2 extends PropertiesWindowContent {
	/**
	 * @param {ConstructorParameters<typeof PropertiesWindowContent>} args
	 */
	constructor(...args) {
		super(...args);
		/** @type {unknown[][]}  */
		this.activeObjectsChangedCalls = [];
		this.destructed = false;
	}

	destructor() {
		super.destructor();
		this.destructed = true;
	}

	/**
	 * @param {unknown[]} selectedObjects
	 */
	activeObjectsChanged(selectedObjects) {
		this.activeObjectsChangedCalls.push([...selectedObjects]);
	}
}

function basicSetup() {
	installFakeDocument();

	/** @type {Set<import("../../../../../../editor/src/misc/SelectionManager.js").SelectionChangeCallback>} */
	const selectionChangeCbs = new Set();

	const selectedObject1 = {obj1: "obj1"};
	const selectedObject2 = {obj2: "obj2"};
	const selectedObject3 = {obj2: "obj3"};
	const contentConstructorMap = new Map([
		[/** @type {unknown} */(selectedObject1), PropertiesWindowContentExtended1],
		[/** @type {unknown} */(selectedObject2), PropertiesWindowContentExtended2],
		[/** @type {unknown} */(selectedObject3), PropertiesWindowContentExtended2],
	]);
	const mockSelectionGroup = /** @type {import("../../../../../../editor/src/misc/SelectionGroup.js").SelectionGroup<any>} */ ({
		currentSelectedObjects: /** @type {unknown[]} */([]),
	});

	let getContentTypeForObjectsEnabled = true;
	const mockEditorInstance = /** @type {import("../../../../../../editor/src/Editor.js").Editor} */ ({
		selectionManager: {
			onSelectionChange(cb) {
				selectionChangeCbs.add(cb);
			},
			removeOnSelectionChange(cb) {
				selectionChangeCbs.delete(cb);
			},
		},
		propertiesWindowContentManager: {
			getContentTypeForObjects(objects) {
				if (!getContentTypeForObjectsEnabled) return EmptyPropertiesWindowContent;
				if (contentConstructorMap) {
					const constructor = contentConstructorMap.get(objects[0]);
					if (constructor) return constructor;
				}
				return /** @type {typeof PropertiesWindowContent} */ (PropertiesWindowContentExtended1);
			},
		},
	});

	const mockWindowManager = /** @type {import("../../../../../../editor/src/windowManagement/WindowManager.js").WindowManager} */ ({});

	const contentWindow = new ContentWindowProperties(mockEditorInstance, mockWindowManager, BASIC_WINDOW_UUID);
	contentWindow.isMostSuitableContentWindow = () => {
		return true;
	};

	/**
	 * @param {import("../../../../../../editor/src/misc/SelectionManager.js").SelectionChangeData} changes
	 */
	function fireSelectionChange(changes) {
		selectionChangeCbs.forEach(cb => cb(changes));
	}

	return {
		contentWindow,
		uninstall() {
			uninstallFakeDocument();
		},
		fireSelectionChange,
		/**
		 * @param {boolean} value
		 */
		setGetContentTypeForObjectsEnabled(value) {
			getContentTypeForObjectsEnabled = value;
		},
		selectedObject1,
		selectedObject2,
		selectedObject3,
		mockSelectionGroup,
		/**
		 * @param {unknown} object
		 */
		setSelectedObject(object) {
			mockSelectionGroup.currentSelectedObjects[0] = object;
			fireSelectionChange({
				changeData: {
					added: [object],
					removed: [],
					reset: false,
				},
				activeSelectionGroup: mockSelectionGroup,
			});
		},
	};
}

Deno.test({
	name: "a new selection creates content",
	fn() {
		const {contentWindow, selectedObject1, setSelectedObject, uninstall} = basicSetup();

		setSelectedObject(selectedObject1);

		assertExists(contentWindow.activeContent);
		assertInstanceOf(contentWindow.activeContent, PropertiesWindowContentExtended1);
		assertEquals(contentWindow.activeContent.activeObjectsChangedCalls, [[selectedObject1]]);
		assertStrictEquals(contentWindow.activeContent.activeObjectsChangedCalls[0][0], selectedObject1);

		assertEquals(contentWindow.contentEl.children.length, 1);
		assertStrictEquals(contentWindow.contentEl.children[0], contentWindow.activeContent.el);

		uninstall();
	},
});

Deno.test({
	name: "change active objects via setActiveObjects()",
	fn() {
		const {contentWindow, selectedObject1, uninstall} = basicSetup();

		contentWindow.setActiveObjects([selectedObject1]);

		assertExists(contentWindow.activeContent);
		assertInstanceOf(contentWindow.activeContent, PropertiesWindowContentExtended1);
		assertEquals(contentWindow.activeContent.activeObjectsChangedCalls, [[selectedObject1]]);
		assertStrictEquals(contentWindow.activeContent.activeObjectsChangedCalls[0][0], selectedObject1);

		assertEquals(contentWindow.contentEl.children.length, 1);
		assertStrictEquals(contentWindow.contentEl.children[0], contentWindow.activeContent.el);

		uninstall();
	},
});

Deno.test({
	name: "changing selection but keeping the same content constructor",
	fn() {
		const {contentWindow, selectedObject2, selectedObject3, setSelectedObject, uninstall} = basicSetup();

		setSelectedObject(selectedObject2);

		const firstActiveContent = contentWindow.activeContent;

		setSelectedObject(selectedObject3);

		assertExists(contentWindow.activeContent);
		assertStrictEquals(firstActiveContent, contentWindow.activeContent);
		assertInstanceOf(contentWindow.activeContent, PropertiesWindowContentExtended2);
		assertEquals(contentWindow.activeContent.activeObjectsChangedCalls, [[selectedObject2], [selectedObject3]]);
		assertStrictEquals(contentWindow.activeContent.activeObjectsChangedCalls[0][0], selectedObject2);
		assertStrictEquals(contentWindow.activeContent.activeObjectsChangedCalls[1][0], selectedObject3);

		assertEquals(contentWindow.contentEl.children.length, 1);
		assertStrictEquals(contentWindow.contentEl.children[0], contentWindow.activeContent.el);

		uninstall();
	},
});

Deno.test({
	name: "changing selection with a different content constructor",
	fn() {
		const {contentWindow, selectedObject1, selectedObject2, setSelectedObject, uninstall} = basicSetup();

		setSelectedObject(selectedObject1);

		const firstActiveContent = contentWindow.activeContent;

		setSelectedObject(selectedObject2);

		assertExists(contentWindow.activeContent);
		assertNotStrictEquals(firstActiveContent, contentWindow.activeContent);
		assertInstanceOf(contentWindow.activeContent, PropertiesWindowContentExtended2);
		assertEquals(contentWindow.activeContent.activeObjectsChangedCalls, [[selectedObject2]]);
		assertStrictEquals(contentWindow.activeContent.activeObjectsChangedCalls[0][0], selectedObject2);

		assertEquals(contentWindow.contentEl.children.length, 1);
		assertStrictEquals(contentWindow.contentEl.children[0], contentWindow.activeContent.el);

		uninstall();
	},
});

Deno.test({
	name: "selection changes before the content window is registered",
	fn() {
		const {contentWindow, selectedObject1, setSelectedObject, setGetContentTypeForObjectsEnabled, uninstall} = basicSetup();
		setGetContentTypeForObjectsEnabled(false);

		setSelectedObject(selectedObject1);

		setGetContentTypeForObjectsEnabled(true);
		contentWindow.onContentTypeRegistered();

		assertExists(contentWindow.activeContent);
		assertInstanceOf(contentWindow.activeContent, PropertiesWindowContentExtended1);
		assertEquals(contentWindow.activeContent.activeObjectsChangedCalls, [[selectedObject1]]);
		assertStrictEquals(contentWindow.activeContent.activeObjectsChangedCalls[0][0], selectedObject1);

		assertEquals(contentWindow.contentEl.children.length, 1);
		assertStrictEquals(contentWindow.contentEl.children[0], contentWindow.activeContent.el);

		uninstall();
	},
});

Deno.test({
	name: "destructor destructs the active content",
	fn() {
		const {contentWindow, selectedObject1, setSelectedObject, uninstall} = basicSetup();

		setSelectedObject(selectedObject1);

		const activeContent = contentWindow.activeContent;
		assertExists(activeContent);
		assertInstanceOf(activeContent, PropertiesWindowContentExtended1);

		contentWindow.destructor();

		assertEquals(contentWindow.destructed, true);
		assertEquals(contentWindow.activeContent, null);
		assertEquals(activeContent.destructed, true);

		uninstall();
	},
});

Deno.test({
	name: "selection change after destructor does nothing",
	fn() {
		const {contentWindow, selectedObject1, selectedObject2, setSelectedObject, uninstall} = basicSetup();

		setSelectedObject(selectedObject1);

		const firstActiveContent = contentWindow.activeContent;
		assertExists(firstActiveContent);
		assertInstanceOf(firstActiveContent, PropertiesWindowContentExtended1);

		contentWindow.destructor();

		setSelectedObject(selectedObject2);

		assertEquals(contentWindow.destructed, true);
		assertEquals(contentWindow.activeContent, null);

		assertEquals(firstActiveContent.activeObjectsChangedCalls, [[selectedObject1]]);
		assertStrictEquals(firstActiveContent.activeObjectsChangedCalls[0][0], selectedObject1);
		assertEquals(contentWindow.contentEl.children.length, 0);

		uninstall();
	},
});
