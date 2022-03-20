import {assertThrows} from "asserts";
import {Quat, Vec2, Vec3, Vec4} from "../../../../src/mod.js";
import {MaterialMap} from "../../../../src/rendering/MaterialMap.js";

Deno.test({
	name: "assertIsMappableType(), valid types",
	fn() {
		MaterialMap.assertIsMappableType(0);
		MaterialMap.assertIsMappableType([0, 1, 2, 3]);
		MaterialMap.assertIsMappableType(new Vec2());
		MaterialMap.assertIsMappableType(new Vec3());
		MaterialMap.assertIsMappableType(new Vec4());
		MaterialMap.assertIsMappableType(new Quat());
	},
});

Deno.test({
	name: "assertIsMappableType(), invalid types",
	fn() {
		assertThrows(() => MaterialMap.assertIsMappableType(undefined));
		assertThrows(() => MaterialMap.assertIsMappableType(null));
		assertThrows(() => MaterialMap.assertIsMappableType(true));
		assertThrows(() => MaterialMap.assertIsMappableType(false));
		assertThrows(() => MaterialMap.assertIsMappableType(() => {}));
		assertThrows(() => MaterialMap.assertIsMappableType({}));
		assertThrows(() => MaterialMap.assertIsMappableType(""));
		assertThrows(() => MaterialMap.assertIsMappableType(new Uint8Array()));
		class Foo {}
		assertThrows(() => MaterialMap.assertIsMappableType(new Foo()));
		assertThrows(() => MaterialMap.assertIsMappableType([new Vec2()]));
	},
});
