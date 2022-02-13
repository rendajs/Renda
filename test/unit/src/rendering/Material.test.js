import {assertEquals, assertNotStrictEquals, assertStrictEquals, assertThrows} from "asserts";
import {Vec2, Vec3, Vec4} from "../../../../src/mod.js";
import {Material} from "../../../../src/rendering/Material.js";
import {MaterialMapType} from "../../../../src/rendering/MaterialMapType.js";
import {assertVecAlmostEquals} from "../../shared/asserts.js";

Deno.test("Empty getAllProperties() for new materials", () => {
	const material = new Material();

	const done = material.getAllProperties().next().done;
	assertEquals(done, true);
});

Deno.test("should call the destructor callbacks", () => {
	const material = new Material();
	let destructorCalled = false;
	const cb = () => {
		destructorCalled = true;
	};

	material.onDestructor(cb);
	material.destructor();

	assertEquals(destructorCalled, true);
});

Deno.test("should not call removed destructors.", () => {
	const material = new Material();
	let destructorCalled = false;
	const cb = () => {
		destructorCalled = true;
	};

	material.onDestructor(cb);
	material.removeOnDestructor(cb);

	assertEquals(destructorCalled, false);
});

class FakeMaterialMapType extends MaterialMapType {}

/**
 * @param {Map<string, import("../../../../src/rendering/MaterialMap.js").MaterialMapMappedValue>} fakeMappedDatas
 */
function createFakeMaterialMap(fakeMappedDatas) {
	class FakeMaterialMap {
		/**
		 * @param {string} key
		 * @returns {Generator<[typeof MaterialMapType, import("../../../../src/rendering/MaterialMap.js").MaterialMapMappedValue]>}
		 */
		*mapProperty(key) {
			const mappedData = fakeMappedDatas.get(key);
			if (mappedData) {
				yield [FakeMaterialMapType, mappedData];
			}
		}

		/**
		 * @param {typeof MaterialMapType} mapType
		 * @returns {Generator<import("../../../../src/rendering/MaterialMap.js").MaterialMapMappedValue>}
		 */
		*getMappedDatas(mapType) {
			yield* fakeMappedDatas.values();
		}
	}
	return /** @type {import("../../../../src/rendering/MaterialMap.js").MaterialMap} */ (new FakeMaterialMap());
}

/** @type {Map<string, import("../../../../src/rendering/MaterialMap.js").MaterialMapMappedValue>} */
const fakeMappedDatas = new Map();
fakeMappedDatas.set("colorMappedName", {
	mappedName: "colorOriginalName",
	defaultValue: new Vec3(),
});
fakeMappedDatas.set("floatMappedName", {
	mappedName: "floatOriginalName",
	defaultValue: 0,
});
const mockMaterialMap = createFakeMaterialMap(fakeMappedDatas);

Deno.test({
	name: "Constructing a material with a material map and properties",
	fn() {
		const material = new Material(mockMaterialMap, {
			colorMappedName: new Vec3(0, 0.5, 1),
			floatMappedName: 3,
			unusedName: 5,
		});

		const properties = Array.from(material.getAllProperties());
		assertEquals(properties.length, 3);
		const colorProperty = material.getProperty("colorMappedName");
		assertVecAlmostEquals(colorProperty, [0, 0.5, 1]);
		const floatProperty = material.getProperty("floatMappedName");
		assertEquals(floatProperty, 3);
		const unusedProperty = material.getProperty("unusedName");
		assertEquals(unusedProperty, 5);

		const mappedProperties = Array.from(material.getAllMappedProperties(FakeMaterialMapType));
		assertEquals(mappedProperties.length, 2);
		const colorMappedProperty = material.getMappedProperty(FakeMaterialMapType, "colorOriginalName");
		assertVecAlmostEquals(colorMappedProperty, [0, 0.5, 1]);
		const floatMappedProperty = material.getMappedProperty(FakeMaterialMapType, "floatOriginalName");
		assertEquals(floatMappedProperty, 3);
	},
});

Deno.test({
	name: "setMaterialMap() should transfer properties",
	fn() {
		const material = new Material();
		material.setProperties({
			colorMappedName: new Vec3(0, 0.5, 1),
			floatMappedName: 3,
		});

		material.setMaterialMap(mockMaterialMap);

		const properties = Array.from(material.getAllProperties());
		assertEquals(properties.length, 2);
		const colorProperty = material.getProperty("colorMappedName");
		assertVecAlmostEquals(colorProperty, [0, 0.5, 1]);
		const floatProperty = material.getProperty("floatMappedName");
		assertEquals(floatProperty, 3);

		const mappedProperties = Array.from(material.getAllMappedProperties(FakeMaterialMapType));
		assertEquals(mappedProperties.length, 2);
		const colorMappedProperty = material.getMappedProperty(FakeMaterialMapType, "colorOriginalName");
		assertVecAlmostEquals(colorMappedProperty, [0, 0.5, 1]);
		const floatMappedProperty = material.getMappedProperty(FakeMaterialMapType, "floatOriginalName");
		assertEquals(floatMappedProperty, 3);
	},
});

Deno.test({
	name: "setProperty() should store unused properties",
	fn() {
		const material = new Material();

		material.setProperty("color", new Vec3(0, 0.5, 1));

		const properties = Array.from(material.getAllProperties());
		assertEquals(properties.length, 1);
		const colorProperty = material.getProperty("color");
		assertVecAlmostEquals(colorProperty, [0, 0.5, 1]);
	},
});

Deno.test({
	name: "setProperty() should store unused properties",
	fn() {
		const material = new Material();

		material.setProperty("color", new Vec3(0, 0.5, 1));

		const properties = Array.from(material.getAllProperties());
		assertEquals(properties.length, 1);
		const colorProperty = material.getProperty("color");
		assertVecAlmostEquals(colorProperty, [0, 0.5, 1]);
	},
});

Deno.test({
	name: "setProperty() should map properties when in a material map",
	fn() {
		const material = new Material(mockMaterialMap);

		material.setProperty("colorMappedName", new Vec3(0, 0.5, 1));

		const mappedProperties = Array.from(material.getAllMappedProperties(FakeMaterialMapType));
		assertEquals(mappedProperties.length, 2);
		const colorMappedProperty = material.getMappedProperty(FakeMaterialMapType, "colorOriginalName");
		assertVecAlmostEquals(colorMappedProperty, [0, 0.5, 1]);
		const floatMappedProperty = material.getMappedProperty(FakeMaterialMapType, "floatOriginalName");
		assertEquals(floatMappedProperty, 0); // default value from MockMaterialMap
	},
});

Deno.test({
	name: "setProperty() should throw when the material map contains a different type",
	fn() {
		const material = new Material(mockMaterialMap);
		assertThrows(() => {
			material.setProperty("colorMappedName", 5);
		});
		assertThrows(() => {
			material.setProperty("colorMappedName", new Vec2(0, 0.5));
		});
	},
});

Deno.test({
	name: "setProperty() shouldn't throw when changing the type of an unmapped property",
	fn() {
		const material = new Material();
		material.setProperty("colorMappedName", new Vec3(0, 0.5, 1));
		material.setProperty("colorMappedName", 5);
	},
});

Deno.test({
	name: "setProperty() should overwrite existing properties",
	fn() {
		const material = new Material(mockMaterialMap);
		material.setProperties({
			colorMappedName: new Vec3(0, 0.5, 1),
			unused: new Vec3(0, 0.5, 1),
		});

		material.setProperty("colorMappedName", new Vec3(0.5, 0.7, 0.2));
		material.setProperty("unused", new Vec3(0.5, 0.7, 0.2));

		const properties = Array.from(material.getAllProperties());
		assertEquals(properties.length, 2);
		const colorProperty = material.getProperty("colorMappedName");
		assertVecAlmostEquals(colorProperty, [0.5, 0.7, 0.2]);
		const floatProperty = material.getProperty("unused");
		assertVecAlmostEquals(floatProperty, [0.5, 0.7, 0.2]);

		const mappedProperties = Array.from(material.getAllMappedProperties(FakeMaterialMapType));
		assertEquals(mappedProperties.length, 2);
		const colorMappedProperty = material.getMappedProperty(FakeMaterialMapType, "colorOriginalName");
		assertVecAlmostEquals(colorMappedProperty, [0.5, 0.7, 0.2]);
		const floatMappedProperty = material.getMappedProperty(FakeMaterialMapType, "floatOriginalName");
		assertEquals(floatMappedProperty, 0); // default value from MockMaterialMap
	},
});

Deno.test({
	name: "setProperty() should not create new instances of vectors",
	fn() {
		const material = new Material(mockMaterialMap);

		const vec2 = new Vec2(0, 0.5);
		const vec3 = new Vec3(0, 0.5, 1);
		const vec4 = new Vec4(0, 0.5, 1, 0.5);
		material.setProperty("unusedVec2", vec2);
		material.setProperty("unusedVec3", vec3);
		material.setProperty("unusedVec4", vec4);
		material.setProperty("colorMappedName", vec3);

		const propertyVec2 = material.getProperty("unusedVec2");
		const propertyVec3 = material.getProperty("unusedVec3");
		const propertyVec4 = material.getProperty("unusedVec4");
		const propertyColor = material.getProperty("colorMappedName");

		assertStrictEquals(propertyVec2, vec2);
		assertStrictEquals(propertyVec3, vec3);
		assertStrictEquals(propertyVec4, vec4);

		assertStrictEquals(propertyColor, vec3);
		assertStrictEquals(propertyColor, propertyVec3);
	},
});

Deno.test({
	name: "getAllMappedProperties() is empty if no material map is set",
	fn() {
		const material = new Material();

		const result = Array.from(material.getAllMappedProperties(FakeMaterialMapType));

		assertEquals(result.length, 0);
	},
});

Deno.test({
	name: "getMappedProperty() returns null if no material map is set",
	fn() {
		const material = new Material();

		const result = material.getMappedProperty(FakeMaterialMapType, "colorOriginalName");

		assertEquals(result, null);
	},
});

Deno.test({
	name: "getMappedProperty() returns null if the requested property is not in the material map",
	fn() {
		const material = new Material(mockMaterialMap);

		const result = material.getMappedProperty(FakeMaterialMapType, "notInTheMaterialMap");

		assertEquals(result, null);
	},
});

Deno.test({
	name: "clone() creates a new instance with a copy of all unused properties",
	fn() {
		const material = new Material();
		const vecA = new Vec3(0, 0.5, 1);
		const vecB = new Vec2(0, 0.5);
		material.setProperties({
			propA: vecA,
			propB: vecB,
			propC: 5,
		});

		const newMaterial = material.clone();

		assertNotStrictEquals(material, newMaterial);

		const propA = material.getProperty("propA");
		const newPropA = newMaterial.getProperty("propA");
		assertNotStrictEquals(propA, newPropA);
		assertVecAlmostEquals(propA, vecA);

		const propB = material.getProperty("propB");
		const newPropB = newMaterial.getProperty("propB");
		assertNotStrictEquals(propB, newPropB);
		assertVecAlmostEquals(propB, vecB);

		const propC = material.getProperty("propC");
		assertEquals(propC, 5);
	},
});

Deno.test({
	name: "clone() creates a new instance with a copy of all mapped properties",
	fn() {
		const material = new Material(mockMaterialMap);
		const vecA = new Vec3(0, 0.5, 1);
		material.setProperties({
			colorMappedName: vecA,
		});

		const newMaterial = material.clone();

		assertNotStrictEquals(material, newMaterial);
		assertStrictEquals(material.materialMap, newMaterial.materialMap);

		const propA = material.getProperty("colorMappedName");
		const newPropA = newMaterial.getProperty("colorMappedName");
		assertNotStrictEquals(propA, newPropA);
		assertVecAlmostEquals(propA, vecA);
		const mappedPropA = material.getMappedProperty(FakeMaterialMapType, "colorOriginalName");
		const newMappedPropA = newMaterial.getMappedProperty(FakeMaterialMapType, "colorOriginalName");
		assertNotStrictEquals(mappedPropA, newMappedPropA);

		const propB = material.getProperty("floatMappedName");
		assertEquals(propB, null);
		const mappedPropB = material.getMappedProperty(FakeMaterialMapType, "floatOriginalName");
		assertEquals(mappedPropB, 0);
	},
});
