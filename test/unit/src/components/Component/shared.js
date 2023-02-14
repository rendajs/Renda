import {createTreeViewStructure} from "../../../../../studio/src/ui/propertiesTreeView/createStructureHelpers.js";
import {Component, Mesh} from "../../../../../src/mod.js";

export function getBasicExtendedComponent() {
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
		 * @param {import("../../../../../src/components/types.js").ComponentPropertyValues<typeof ExtendedComponent>} propertyValues
		 * @param {import("../../../../../src/components/Component.js").ComponentConstructorRestArgs} args
		 */
		constructor(propertyValues = {}, ...args) {
			super();

			this.foo = 3;
			/** @type {Mesh?} */
			this.bar = null;

			this.initValues(propertyValues, ...args);
		}
	}

	return ExtendedComponent;
}
