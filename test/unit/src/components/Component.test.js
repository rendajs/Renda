import {assertEquals, assertStrictEquals} from "std/testing/asserts";
import {createTreeViewStructure} from "../../../../editor/src/ui/propertiesTreeView/createStructureHelpers.js";
import {Component, Mesh} from "../../../../src/mod.js";

class ExtendedComponent extends Component {
	static get componentName() {
		return "Extended";
	}
	static get uuid() {
		return "a00434e6-cfda-40eb-88f6-f05229c19b9e";
	}

	/**
	 * @override
	 */
	static get guiStructure() {
		return createTreeViewStructure({
			foo: {
				type: "number",
			},
			bar: {
				type: "droppable",
				guiOpts: {
					supportedAssetTypes: [Mesh],
				},
			},
		});
	}

	/**
	 * @param {import("../../../../src/components/types.js").ComponentPropertyValues<typeof ExtendedComponent>} propertyValues
	 * @param {import("../../../../src/components/Component.js").ComponentConstructorRestArgs} args
	 */
	constructor(propertyValues = {}, ...args) {
		super();

		this.foo = 3;
		/** @type {Mesh?} */
		this.bar = null;

		this.initValues(propertyValues, ...args);
	}
}

Deno.test({
	name: "Component without any constructor properties",
	fn() {
		const component = new ExtendedComponent();
		assertEquals(component.foo, 3);
		assertEquals(component.bar, null);
	},
});

Deno.test({
	name: "Component with constructor properties",
	fn() {
		const mesh = new Mesh();
		const component = new ExtendedComponent({
			foo: 4,
			bar: mesh,
		});
		assertEquals(component.foo, 4);
		assertStrictEquals(component.bar, mesh);
	},
});
