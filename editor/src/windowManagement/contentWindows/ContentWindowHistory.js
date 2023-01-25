import {contentWindowHistorySheet} from "../../styles/styles.js";
import {Button} from "../../ui/Button.js";
import {ButtonGroup} from "../../ui/ButtonGroup.js";
import {ContentWindow} from "./ContentWindow.js";

const svgNs = "http://www.w3.org/2000/svg";

export class ContentWindowHistory extends ContentWindow {
	static contentWindowTypeId = "history";
	static contentWindowUiName = "History";
	static contentWindowUiIcon = "static/icons/contentWindowTabs/history.svg";

	/**
	 * @param {ConstructorParameters<typeof ContentWindow>} args
	 */
	constructor(...args) {
		super(...args);

		this.shadow = this.contentEl.attachShadow({mode: "open"});
		this.shadow.adoptedStyleSheets = [contentWindowHistorySheet];
		this.graphEl = document.createElementNS(svgNs, "svg");
		this.graphEl.classList.add("graph");
		this.shadow.appendChild(this.graphEl);

		this.entriesEl = document.createElement("ul");
		this.entriesEl.setAttribute("role", "listbox");
		this.shadow.appendChild(this.entriesEl);

		this.editorInstance.historyManager.onTreeUpdated(this.#updateUi);

		const buttonGroup = new ButtonGroup();
		this.addTopBarEl(buttonGroup.el);
		buttonGroup.addButton(new Button({
			icon: "static/icons/undo.svg",
			colorizerFilterManager: this.editorInstance.colorizerFilterManager,
			onClick: () => {
				this.editorInstance.historyManager.undo();
			},
		}));
		buttonGroup.addButton(new Button({
			icon: "static/icons/redo.svg",
			colorizerFilterManager: this.editorInstance.colorizerFilterManager,
			onClick: () => {
				this.editorInstance.historyManager.redo();
			},
		}));

		this.#updateUi();
	}

	destructor() {
		super.destructor();
		this.editorInstance.historyManager.removeOnTreeUpdated(this.#updateUi);
	}

	#updateUi = () => {
		this.entriesEl.innerHTML = "";
		this.graphEl.innerHTML = "";

		/**
		 * @typedef GraphLine
		 * @property {boolean} isBranch
		 * @property {number[]} elementIndices
		 * @property {number} indentation
		 */
		/** @type {GraphLine[]} */
		const graphLines = [];
		/** @type {GraphLine[]} */
		const graphLineStack = [];

		const ROW_HEIGHT = 19;
		const INDENTATION_WIDTH = 12;
		const DOT_SIZE = 4;

		let selectedElementIndex = -1;
		let elementIndex = 0;
		for (const result of this.editorInstance.historyManager.getEntries()) {
			const el = document.createElement("li");
			el.tabIndex = 0;
			el.setAttribute("role", "option");
			el.classList.add("history-window-entry");
			el.classList.toggle("inactive", !result.active);
			el.classList.toggle("current", result.current);
			if (result.current) {
				selectedElementIndex = elementIndex;
				el.setAttribute("aria-selected", "true");
			}
			el.addEventListener("click", () => {
				this.editorInstance.historyManager.travelToEntry(result.entry);
			});
			el.textContent = result.entry.uiText;
			el.style.paddingLeft = 25 + result.indentation * INDENTATION_WIDTH + "px";
			this.entriesEl.appendChild(el);

			while (result.indentation + 1 != graphLineStack.length) {
				if (result.indentation + 1 > graphLineStack.length) {
					/** @type {GraphLine} */
					const graphLine = {
						isBranch: graphLineStack.length != 0,
						elementIndices: [],
						indentation: result.indentation,
					};
					graphLineStack.push(graphLine);
					graphLines.push(graphLine);
				} else {
					graphLineStack.pop();
				}
			}
			const currentGraphLine = graphLineStack.at(-1);
			if (!currentGraphLine) {
				throw new Error("Failed to create history graph");
			}
			currentGraphLine.elementIndices.push(elementIndex);
			elementIndex++;
		}

		let svgWidth = 0;
		let svgHeight = 0;
		const circleEls = [];
		for (const graphLine of graphLines) {
			const lineX = (graphLine.indentation + 1) * INDENTATION_WIDTH;
			svgWidth = Math.max(svgWidth, lineX + DOT_SIZE);
			let minDotY = Infinity;
			let maxDotY = -Infinity;
			for (const elIndex of graphLine.elementIndices) {
				const circleEl = document.createElementNS(svgNs, "circle");
				circleEl.classList.toggle("current", elIndex == selectedElementIndex);
				circleEl.setAttribute("cx", String(lineX));
				const dotY = (elIndex + 0.5) * ROW_HEIGHT;
				circleEl.setAttribute("cy", String(dotY));
				circleEl.setAttribute("r", String(DOT_SIZE));
				circleEls.push(circleEl);
				minDotY = Math.min(minDotY, dotY);
				maxDotY = Math.max(maxDotY, dotY);
				svgHeight = Math.max(svgHeight, dotY + DOT_SIZE);
			}
			const pathEl = document.createElementNS(svgNs, "path");
			this.graphEl.appendChild(pathEl);
			const lineStart = `${lineX},${minDotY}`;
			const lineEnd = `${lineX},${maxDotY}`;
			if (graphLine.isBranch) {
				const x1 = lineX - INDENTATION_WIDTH;
				const x2 = lineX;
				const y1 = minDotY - ROW_HEIGHT;
				const y2 = minDotY - ROW_HEIGHT * 2 / 3;
				const y3 = minDotY - ROW_HEIGHT * 1 / 3;
				pathEl.setAttribute("d", `M${x1} ${y1} C${x1},${y3} ${x2},${y2} ${lineStart} L${lineEnd}`);
			} else {
				pathEl.setAttribute("d", `M${lineStart} L${lineEnd}`);
			}
		}
		for (const el of circleEls) {
			this.graphEl.appendChild(el);
		}
		this.graphEl.setAttribute("width", String(svgWidth));
		this.graphEl.setAttribute("height", String(svgHeight));
	};
}
