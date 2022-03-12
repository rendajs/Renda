import {DomTokenList} from "./FakeDomTokenList.js";

export class FakeHtmlElement extends EventTarget {
	#x;
	#y;
	#paddingLeft;
	#paddingTop;
	/** @type {Map<string, string>} */
	#attributes = new Map();

	constructor({
		x = 0,
		y = 0,
		clientWidth = 100,
		clientHeight = 100,
		paddingLeft = 0,
		paddingRight = 0,
		paddingTop = 0,
		paddingBottom = 0,
	} = {}) {
		super();

		this.style = {
			paddingLeft: paddingLeft + "px",
			paddingRight: paddingRight + "px",
			paddingTop: paddingTop + "px",
			paddingBottom: paddingBottom + "px",
		};

		this.#x = x;
		this.#y = y;
		this.#paddingLeft = paddingLeft;
		this.#paddingTop = paddingTop;
		this.clientWidth = clientWidth;
		this.clientHeight = clientHeight;
		this.classList = new DomTokenList();
	}

	getBoundingClientRect() {
		const x = this.#x + this.#paddingLeft;
		const y = this.#y + this.#paddingTop;
		return {
			x, y,
			left: x,
			top: y,
			right: x + this.clientWidth,
			bottom: y + this.clientHeight,
			width: this.clientWidth,
			height: this.clientHeight,
		};
	}

	/**
	 * @param {string} name
	 * @param {string} value
	 */
	setAttribute(name, value) {
		name = name.toLowerCase();
		this.#attributes.set(name, value);
	}

	/**
	 * @param {string} name
	 */
	getAttribute(name) {
		return this.#attributes.get(name.toLowerCase()) || null;
	}
}

const cast = /** @type {typeof FakeHtmlElement & typeof HTMLElement & (new (...args: any) => FakeHtmlElement & HTMLElement)} */(FakeHtmlElement);
export {cast as HtmlElement};
