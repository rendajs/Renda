import {assertEquals} from "https://deno.land/std@0.118.0/testing/asserts.ts";
import {Importer} from "https://deno.land/x/fake_imports@v0.0.6/mod.js";

/**
 * @param {number} offsetWidth
 * @param {number} offsetHeight
 * @param {Object.<string, string>} styleMap
 */
async function setup(offsetWidth, offsetHeight, styleMap) {
	const importer = new Importer(import.meta.url);
	const utilPath = "../../../../../editor/src/Util/Util.js";
	importer.fakeModule(utilPath, original => {
		return `
			let window = null;
			export function setTestWindow(w) {
				window = w;
			}

			${original.fullContent}
			`;
	});
	const module = await importer.import(utilPath);
	module.setTestWindow(window);

	const fakeEl = /** @type {HTMLElement} */ ({offsetWidth, offsetHeight});
	/** @type {Object.<string, string>} */
	module.setTestWindow({
		/**
		 * @param {HTMLElement} el
		 */
		getComputedStyle: el => {
			if (el != fakeEl) {
				throw new Error("Wrong element");
			}
			return {
				/**
				 * @param {string} name
				 */
				getPropertyValue: name => {
					return styleMap[name] || "";
				},
			};
		},
	});

	return {module, el: fakeEl};
}

Deno.test({
	name: "No extra styles",
	fn: async () => {
		const {module, el} = await setup(10, 10, {});

		const result = module.getElemSize(el);

		assertEquals(result, [10, 10]);
	},
});

Deno.test({
	name: "All styles",
	fn: async () => {
		const {module, el} = await setup(10, 10, {
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

		const result = module.getElemSize(el);

		assertEquals(result, [70, 70]);
	},
});

Deno.test({
	name: "Different values",
	fn: async () => {
		const {module, el} = await setup(10, 10, {
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

		const result = module.getElemSize(el);

		assertEquals(result, [340, 460]);
	},
});
