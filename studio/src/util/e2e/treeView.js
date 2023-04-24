/**
 * @deprecated Use one of the functions in `test/e2e/studio/shared/treeView.js` instead.
 *
 * Tries to find the element of a treeview from a specified path.
 * @param {Element} treeViewElement The element to start searching from
 * @param {(string | number)[]} itemsPath An array of items to search for. Items can either be a number to get
 * a specific index of a TreeView, or a string to get the name of the tree view or the label of a PropertiesTreeViewEntry.
 */
export function getTreeViewPathElement(treeViewElement, itemsPath) {
	const jointItemsPath = itemsPath.join(" > ");
	if (!treeViewElement.classList.contains("treeViewItem")) {
		throw new TypeError(`Invalid root treeViewElementHandle element type received while trying to find the treeview at ${jointItemsPath}. Element is not a TreeView because it doesn't have the "treeViewItem" class.`);
	}
	/** @type {Element} */
	let currentTreeView = treeViewElement;
	for (let i = 0; i < itemsPath.length; i++) {
		const itemIdentifier = itemsPath[i];
		const treeViewChildren = Array.from(currentTreeView.querySelectorAll(":scope > .treeViewChildList > .treeViewItem"));
		let child;
		if (typeof itemIdentifier == "number") {
			child = treeViewChildren[itemIdentifier];
		} else {
			child = treeViewChildren.find(child => {
				// First check the row name, in case this is a regular TreeView.
				const row = child.querySelector(".treeViewRow");
				if (row && row.textContent == itemIdentifier) return true;

				// If this is a PropertiesTreeViewEntry, check the name of the lebel.
				const labelEl = child.querySelector(":scope > .treeViewCustomEl.guiTreeViewEntry > .guiTreeViewEntryLabel");
				if (labelEl && labelEl.textContent == itemIdentifier) return true;

				return false;
			});
		}
		if (!child) {
			return null;
		}
		currentTreeView = child;
	}
	return currentTreeView;
}

/**
 * Logs the path needed to reach the provided TreeView element.
 * This is useful to find out which path to provide to {@linkcode getTreeViewPathElement}.
 * @param {Element} treeViewElement
 */
export function logTreeViewPath(treeViewElement) {
	const stringsPath = [];

	/** @type {Element} */
	let currentTreeView = treeViewElement;
	while (currentTreeView.parentElement) {
		if (currentTreeView.classList.contains("treeViewItem")) {
			let pathItem = "";

			// First we check if the regular TreeView row contains text
			const row = currentTreeView.querySelector(".treeViewRow");
			if (row instanceof HTMLElement) {
				pathItem = row.textContent || "";
			}

			// And if not, we check if it's a PropertiesTreeViewEntry and use the name of the label.
			if (!pathItem) {
				const labelEl = currentTreeView.querySelector(":scope > .treeViewCustomEl.guiTreeViewEntry > .guiTreeViewEntryLabel");
				if (labelEl) pathItem = labelEl.textContent || "";
			}

			stringsPath.unshift(pathItem);
		}
		currentTreeView = currentTreeView.parentElement;
	}
	if (stringsPath.length == 0) {
		console.log("No TreeView elements were found in any of the parents of this element.");
	} else {
		console.log("The path from the root TreeView to the provided one is:", stringsPath);
		if (!treeViewElement.classList.contains("treeViewItem")) {
			console.log("Note that you did not provide a treeViewItem element, but rather a child of one. `getTreeViewPathElement()` will return the first parent above your provided element that contains the 'treeViewItem' class.");
		}
	}
}
