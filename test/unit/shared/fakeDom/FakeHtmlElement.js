export class FakeHtmlElement extends EventTarget {
	#x;
	#y;
	#paddingLeft;
	#paddingTop;

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
}

const cast = /** @type {typeof FakeHtmlElement & typeof HTMLElement & (new (...args: any) => FakeHtmlElement & HTMLElement)} */(FakeHtmlElement);
export {cast as HtmlElement};
