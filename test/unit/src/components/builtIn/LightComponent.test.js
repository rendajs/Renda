import {assertEquals} from "std/testing/asserts.ts";
import {LightComponent, Vec3} from "../../../../../src/mod.js";

Deno.test({
	name: "Light initializes with defaults",
	fn: () => {
		const light = new LightComponent();
		assertEquals(light.color.toArray(), [1, 1, 1]);
		assertEquals(light.intensity, 1.0);
		assertEquals(light.type, "point");
	},
});

Deno.test({
	name: "Light initializes with non-default options",
	fn: () => {
		const light = new LightComponent({
			color: new Vec3(0.3, 0.5, 0.6),
			type: "directional",
		});
		assertEquals(light.color.toArray(), [0.3, 0.5, 0.6]);
		assertEquals(light.intensity, 1.0);
		assertEquals(light.type, "directional");
	},
});
