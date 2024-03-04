import { Entity } from "../../../../../src/core/Entity.js";
import { Component } from "../../../../../src/components/Component.js";

export function createBasicStructure() {
	const root = new Entity("root");

	const child1 = root.add(new Entity("child1"));
	root.add(new Entity());

	const child2 = child1.add(new Entity("child2"));
	child1.add(new Entity());

	child2.add(new Entity());
	child2.add(new Entity());
	const child3 = child2.add(new Entity("child3"));

	return { root, child1, child2, child3 };
}

export const EXTENDED_COMPONENT_UUID = "extended component uuid";

export class ExtendedComponent extends Component {
	/**
	 * @param {...any} restArgs
	 */
	constructor(...restArgs) {
		super(...restArgs);
		this.restArgs = restArgs;
	}

	toJson() {
		return {
			uuid: EXTENDED_COMPONENT_UUID,
			propertyValues: {
				foo: "bar",
			},
		};
	}
}

export class ExtendedComponent2 extends Component {}

