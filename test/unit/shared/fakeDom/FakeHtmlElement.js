export class FakeHtmlElement {
	constructor({
		paddingLeft = "0px",
		paddingRight = "0px",
		paddingTop = "0px",
		paddingBottom = "0px",
		clientWidth = 100,
		clientHeight = 100,
	} = {}) {
		this.style = {
			paddingLeft, paddingRight, paddingTop, paddingBottom,
		};

		this.clientWidth = clientWidth;
		this.clientHeight = clientHeight;
	}
}

const cast = /** @type {typeof FakeHtmlElement & typeof HTMLElement & (new (...args: any) => FakeHtmlElement & HTMLElement)} */(FakeHtmlElement);
export {cast as HtmlElement};
