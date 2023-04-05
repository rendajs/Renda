import {assertEquals, assertNotEquals} from "std/testing/asserts.ts";
import {LightComponent, Entity, Vec2, Vec3} from "../../../../../src/mod.js";
import {assertAlmostEquals, assertVecAlmostEquals} from "../../../shared/asserts.js";

Deno.test({
  name: "Light initializes with defaults",
  fn: () => {
    const light = new LightComponent();
    assertEquals(light.color.toArray(), [1, 1, 1]);
    assertEquals(light.intensity, 1.0);
    assertEquals(light.type, "point");
  }
});

Deno.test({
  name: "Light initializes with non-default options",
  fn: () => {
    const light = new LightComponent({
      color: new Vec3(0.3, 0.5, 0.6),
      type: "directional"
    });
    assertEquals(light.color.toArray(), [0.3, 0.5, 0.6]);
    assertEquals(light.intensity, 1.0);
    assertEquals(light.type, "directional");
  }
})

Deno.test({
  name: "set color clamps values between 0 and 1",
  fn: () => {
    const light = new LightComponent();
    light.color = new Vec3(55, 35, 20);
    assertEquals(light.color.toArray(), [1,1,1]);

    light.color = new Vec3(-55, -35, -20);
    assertEquals(light.color.toArray(), [0,0,0]);
  }
});
