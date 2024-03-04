import { assertEquals } from "std/testing/asserts.ts";
import { getElementSize } from "../../../../../studio/src/util/util.js";

/**
 * @param {number} offsetWidth
 * @param {number} offsetHeight
 * @param {Object<string, string>} styleMap
 */
async function setup(offsetWidth, offsetHeight, styleMap) {
	const originalGetComputedStyle = globalThis.getComputedStyle;
	const fakeEl = /** @type {HTMLElement} */ ({ offsetWidth, offsetHeight });

	globalThis.getComputedStyle = /** @type {typeof getComputedStyle} */ ((el) => {
		if (el != fakeEl) {
			throw new Error("Wrong element");
		}
		return {
			/**
			 * @param {string} name
			 */
			getPropertyValue: (name) => {
				return styleMap[name] || "";
			},
		};
	});

	return {
		el: fakeEl,
		uninstall() {
			globalThis.getComputedStyle = originalGetComputedStyle;
		},
	};
}

Deno.test({
	name: "No extra styles",
	fn: async () => {
		const { el, uninstall } = await setup(10, 10, {});

		try {
			const result = getElementSize(el);
			assertEquals(result, [10, 10]);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "All styles",
	fn: async () => {
		const { el, uninstall } = await setup(10, 10, {
			"margin-left": "10px",
			"margin-right": "10px",
			"margin-top": "10px",
			"margin-bottom": "10px",

			"border-left": "10px",
			"border-right": "10px",
			"border-top": "10px",
			"border-bottom": "10px",

			"padding-left": "10px",
			"padding-right": "10px",
			"padding-top": "10px",
			"padding-bottom": "10px",
		});

		try {
			const result = getElementSize(el);
			assertEquals(result, [70, 70]);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Different values",
	fn: async () => {
		const { el, uninstall } = await setup(10, 10, {
			"margin-left": "10px",
			"margin-right": "20px",
			"margin-top": "30px",
			"margin-bottom": "40px",

			"border-left": "50px",
			"border-right": "60px",
			"border-top": "70px",
			"border-bottom": "80px",

			"padding-left": "90px",
			"padding-right": "100px",
			"padding-top": "110px",
			"padding-bottom": "120px",
		});

		try {
			const result = getElementSize(el);
			assertEquals(result, [340, 460]);
		} finally {
			uninstall();
		}
	},
});
