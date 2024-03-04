import { getStudioInstance } from "../studioInstance.js";

/**
 * @typedef {import("./propertiesTreeView/types.ts").GuiOptionsBase} PathGuiOptions
 */

export class PathGui {
	/** @typedef {import("./propertiesTreeView/types.ts").PropertiesTreeViewEntryChangeCallback<import("../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath>} OnPathGuiChangeCallback */
	/** @type {Set<OnPathGuiChangeCallback>} */
	#onValueChangeCbs = new Set();

	/**
	 * @param {PathGuiOptions} options
	 */
	constructor({
		defaultValue = "",
		disabled = false,
	} = {}) {
		this.defaultValue = defaultValue;
		this.disabled = disabled;

		this.el = document.createElement("div");
		this.el.setAttribute("role", "textbox");
		this.el.ariaMultiLine = "false";
		this.el.contentEditable = "true";
		this.el.classList.add("button-like", "reset-input", "text-input", "pathInput");
		this.el.style.resize = "none";
		this.el.spellcheck = false;
		this.el.addEventListener("input", (e) => {
			this.#updateContent();
			this.#fireOnChangeCbs("user");
		});
	}

	/**
	 * @param {import("../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} value
	 */
	setValue(value) {
		this.el.textContent = value.join("/");
		this.#updateContent();
	}

	get value() {
		return this.el.textContent?.split("/") || [];
	}

	/**
	 * @param {OnPathGuiChangeCallback} cb
	 */
	onValueChange(cb) {
		this.#onValueChangeCbs.add(cb);
	}

	/**
	 * @param {import("./propertiesTreeView/types.ts").ChangeEventTriggerType} trigger
	 */
	#fireOnChangeCbs(trigger) {
		for (const cb of this.#onValueChangeCbs) {
			cb({
				value: this.value,
				trigger,
			});
		}
	}

	#updateContent() {
		const rootEl = this.el;
		const textContent = rootEl.textContent || "";

		// First we record the positions of the selection.
		/**
		 * @param {Node?} node
		 * @param {number} offset
		 */
		function recordCharacterIndex(node, offset) {
			if (!node) return 0;
			const firstNode = rootEl.childNodes[0];
			if (!firstNode) return 0;
			const range = document.createRange();
			range.setStart(firstNode, 0);
			range.setEnd(node, offset);
			const fragment = range.cloneContents();
			const textcontent = fragment.textContent;
			if (!textcontent) return 0;
			return textcontent.length;
		}
		const selection = getSelection();
		let anchorIndex = null;
		let focusIndex = null;
		if (selection) {
			anchorIndex = recordCharacterIndex(selection.anchorNode, selection.anchorOffset);
			focusIndex = recordCharacterIndex(selection.focusNode, selection.focusOffset);
		}

		// Then we replace the content with custom markup
		rootEl.textContent = "";
		const splitTexts = textContent.split("/");
		for (const [i, text] of splitTexts.entries()) {
			const isLast = i >= splitTexts.length - 1;
			const textNode = document.createTextNode(text);
			this.el.appendChild(textNode);

			if (!isLast) {
				const arrow = document.createElement("span");
				arrow.textContent = "/";
				getStudioInstance().colorizerFilterManager.applyFilter(arrow, "var(--text-color-level0)");
				arrow.classList.add("path-arrow");
				this.el.appendChild(arrow);
			}
		}

		// Finally we apply the stored selection
		if (selection && (anchorIndex || focusIndex)) {
			/**
			 * @param {number?} characterIndex
			 */
			function getNodeAndOffset(characterIndex) {
				if (characterIndex == null) return null;
				let passedCharacters = 0;
				let nodeIndex = 0;
				let lastNode = null;
				while (true) {
					const node = rootEl.childNodes[nodeIndex];
					if (!node) break;
					lastNode = node;
					const nodeCharacters = lastNode.textContent?.length || 0;
					if (passedCharacters + nodeCharacters >= characterIndex) {
						return {
							node,
							offset: characterIndex - passedCharacters,
						};
					}
					passedCharacters += nodeCharacters;
					nodeIndex++;
				}
				return null;
			}

			let anchor = getNodeAndOffset(anchorIndex);
			let focus = getNodeAndOffset(focusIndex);
			if (!anchor && focus) {
				anchor = focus;
			} else if (!focus && anchor) {
				focus = anchor;
			}
			if (anchor && focus) {
				selection.setBaseAndExtent(anchor.node, anchor.offset, focus.node, focus.offset);
			}
		}
	}
}
