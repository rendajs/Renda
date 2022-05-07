import {assertEquals, assertStrictEquals, assertThrows} from "std/testing/asserts";
import {Quat, Vec2, Vec3, Vec4} from "../../../../src/mod.js";
import {MaterialMap} from "../../../../src/rendering/MaterialMap.js";
import {MaterialMapType} from "../../../../src/rendering/MaterialMapType.js";

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

Deno.test({
	name: "getMapTypeInstance()",
	fn() {
		class ExtendedMaterialMapType extends MaterialMapType {}
		const extendedMaterialMapType = new ExtendedMaterialMapType();
		const map = new MaterialMap({
			materialMapTypes: [
				{
					mapType: extendedMaterialMapType,
					mappedValues: {},
				},
			],
		});

		const result = map.getMapTypeInstance(ExtendedMaterialMapType);
		assertStrictEquals(result, extendedMaterialMapType);
	},
});

Deno.test({
	name: "mapProperty()",
	async fn() {
		class ExtendedMaterialMapType1 extends MaterialMapType {}
		class ExtendedMaterialMapType2 extends MaterialMapType {}
		class ExtendedMaterialMapType3 extends MaterialMapType {}
		class ExtendedMaterialMapType4 extends MaterialMapType {}
		const extendedMaterialMapType1 = new ExtendedMaterialMapType1();
		const extendedMaterialMapType2 = new ExtendedMaterialMapType2();
		const extendedMaterialMapType3 = new ExtendedMaterialMapType3();
		const extendedMaterialMapType4 = new ExtendedMaterialMapType4();
		const map = new MaterialMap({
			materialMapTypes: [
				// map type with a single property
				{
					mapType: extendedMaterialMapType1,
					mappedValues: {
						foo: {
							mappedName: "mappedFoo",
							mappedType: "vec3",
							defaultValue: new Vec3(1, 2, 3),
						},
					},
				},
				// map type with two properties pointing to the same key
				{
					mapType: extendedMaterialMapType2,
					mappedValues: {
						bar: {
							mappedName: "mappedFoo",
							mappedType: "vec3",
							defaultValue: new Vec3(4, 5, 6),
						},
						baz: {
							mappedName: "mappedFoo",
							mappedType: "vec3",
							defaultValue: new Vec3(7, 8, 9),
						},
					},
				},
				// map type with no properties
				{
					mapType: extendedMaterialMapType3,
					mappedValues: {},
				},
				// map type with properties pointing to a different key
				{
					mapType: extendedMaterialMapType4,
					mappedValues: {
						foo: {
							mappedName: "notMappedFoo",
							mappedType: "vec3",
							defaultValue: new Vec3(1, 2, 3),
						},
						bar: {
							mappedName: "alsoNotMappedFoo",
							mappedType: "vec3",
							defaultValue: new Vec3(4, 5, 6),
						},
					},
				},
			],
		});

		const result = Array.from(map.mapProperty("mappedFoo"));
		assertEquals(result, [
			[
				ExtendedMaterialMapType1, {
					mappedName: "foo",
					mappedType: "vec3",
					defaultValue: new Vec3(1, 2, 3),
				},
			],
			[
				ExtendedMaterialMapType2, {
					mappedName: "bar",
					mappedType: "vec3",
					defaultValue: new Vec3(4, 5, 6),
				},
			],
			[
				ExtendedMaterialMapType2, {
					mappedName: "baz",
					mappedType: "vec3",
					defaultValue: new Vec3(7, 8, 9),
				},
			],
		]);
		assertStrictEquals(result[0][0], ExtendedMaterialMapType1);
		assertStrictEquals(result[1][0], ExtendedMaterialMapType2);
		assertStrictEquals(result[2][0], ExtendedMaterialMapType2);
	},
});

Deno.test({
	name: "getMappedDatasForMapType()",
	fn() {
		class ExtendedMaterialMapType1 extends MaterialMapType {}
		class ExtendedMaterialMapType2 extends MaterialMapType {}
		const extendedMaterialMapType1 = new ExtendedMaterialMapType1();
		const extendedMaterialMapType2 = new ExtendedMaterialMapType2();
		const map = new MaterialMap({
			materialMapTypes: [
				{
					mapType: extendedMaterialMapType1,
					mappedValues: {
						foo: {
							mappedName: "mappedFoo",
							mappedType: "vec3",
							defaultValue: new Vec3(1, 2, 3),
						},
					},
				},
				// different map type with same property name
				{
					mapType: extendedMaterialMapType2,
					mappedValues: {
						foo: {
							mappedName: "mappedFoo",
							mappedType: "vec3",
							defaultValue: new Vec3(4, 5, 6),
						},
					},
				},
			],
		});

		const result = Array.from(map.getMappedDatasForMapType(ExtendedMaterialMapType1));
		assertEquals(result, [
			{
				mappedName: "foo",
				mappedType: "vec3",
				defaultValue: new Vec3(1, 2, 3),
			},
		]);
	},
});
