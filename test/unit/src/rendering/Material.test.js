import {assertEquals, assertExists, assertInstanceOf, assertNotStrictEquals, assertStrictEquals, assertThrows} from "std/testing/asserts.ts";
import {Texture} from "../../../../src/core/Texture.js";
import {CustomMaterialData, Vec2, Vec3, Vec4} from "../../../../src/mod.js";
import {Material} from "../../../../src/rendering/Material.js";
import {MaterialMapType} from "../../../../src/rendering/MaterialMapType.js";
import {assertVecAlmostEquals} from "../../shared/asserts.js";
import {Sampler} from "../../../../src/rendering/Sampler.js";

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
		*getMappedDatasForMapType(mapType) {
			yield* fakeMappedDatas.values();
		}
	}
	return /** @type {import("../../../../src/rendering/MaterialMap.js").MaterialMap} */ (new FakeMaterialMap());
}

/** @type {Map<string, import("../../../../src/rendering/MaterialMap.js").MaterialMapMappedValue>} */
const fakeMappedDatas = new Map();
fakeMappedDatas.set("vec2MappedName", {
	mappedName: "vec2OriginalName",
	mappedType: "vec2",
	defaultValue: new Vec2(),
});
fakeMappedDatas.set("vec3MappedName", {
	mappedName: "vec3OriginalName",
	mappedType: "vec3",
	defaultValue: new Vec3(),
});
fakeMappedDatas.set("vec4MappedName", {
	mappedName: "vec4OriginalName",
	mappedType: "vec4",
	defaultValue: new Vec4(),
});
fakeMappedDatas.set("floatMappedName", {
	mappedName: "floatOriginalName",
	mappedType: "number",
	defaultValue: 0,
});
fakeMappedDatas.set("textureMappedName", {
	mappedName: "textureOriginalName",
	mappedType: "texture2d",
	defaultValue: null,
});
fakeMappedDatas.set("samplerMappedName", {
	mappedName: "samplerOriginalName",
	mappedType: "sampler",
	defaultValue: null,
});
fakeMappedDatas.set("enumMappedName", {
	mappedName: "enumOriginalName",
	mappedType: "enum",
	defaultValue: "option1",
});
fakeMappedDatas.set("customDataMappedName", {
	mappedName: "customDataOriginalName",
	mappedType: "custom",
	defaultValue: null,
});
const EXPECTED_MAPPED_PROPERTIES_LENGTH = fakeMappedDatas.size;
const mockMaterialMap = createFakeMaterialMap(fakeMappedDatas);

Deno.test({
	name: "Constructing a material with a material map and properties",
	fn() {
		const texture = new Texture(new Blob());
		const material = new Material(mockMaterialMap, {
			vec3MappedName: new Vec3(0, 0.5, 1),
			floatMappedName: 3,
			textureMappedName: texture,
			unusedName: 5,
		});

		const properties = Array.from(material.getAllProperties());
		assertEquals(properties.length, 4);
		const colorProperty = material.getProperty("vec3MappedName");
		assertVecAlmostEquals(colorProperty, [0, 0.5, 1]);
		const floatProperty = material.getProperty("floatMappedName");
		assertEquals(floatProperty, 3);
		const textureProperty = material.getProperty("textureMappedName");
		assertStrictEquals(textureProperty, texture);
		const unusedProperty = material.getProperty("unusedName");
		assertEquals(unusedProperty, 5);

		const mappedProperties = Array.from(material.getMappedPropertiesForMapType(FakeMaterialMapType));
		assertEquals(mappedProperties.length, EXPECTED_MAPPED_PROPERTIES_LENGTH);
		const colorMappedProperty = material.getMappedPropertyForMapType(FakeMaterialMapType, "vec3OriginalName");
		assertExists(colorMappedProperty);
		assertVecAlmostEquals(colorMappedProperty.value, [0, 0.5, 1]);
		const floatMappedProperty = material.getMappedPropertyForMapType(FakeMaterialMapType, "floatOriginalName");
		assertExists(floatMappedProperty);
		assertEquals(floatMappedProperty.value, 3);
		const textureMappedProperty = material.getMappedPropertyForMapType(FakeMaterialMapType, "textureOriginalName");
		assertExists(textureMappedProperty);
		assertStrictEquals(textureMappedProperty.value, texture);
	},
});

Deno.test({
	name: "setMaterialMap() should transfer properties",
	fn() {
		const material = new Material();
		const texture = new Texture(new Blob());
		material.setProperties({
			vec3MappedName: new Vec3(0, 0.5, 1),
			floatMappedName: 3,
			textureMappedName: texture,
		});

		material.setMaterialMap(mockMaterialMap);

		const properties = Array.from(material.getAllProperties());
		assertEquals(properties.length, 3);
		const colorProperty = material.getProperty("vec3MappedName");
		assertVecAlmostEquals(colorProperty, [0, 0.5, 1]);
		const floatProperty = material.getProperty("floatMappedName");
		assertEquals(floatProperty, 3);
		const textureProperty = material.getProperty("textureMappedName");
		assertStrictEquals(textureProperty, texture);

		const mappedProperties = Array.from(material.getMappedPropertiesForMapType(FakeMaterialMapType));
		assertEquals(mappedProperties.length, EXPECTED_MAPPED_PROPERTIES_LENGTH);
		const colorMappedProperty = material.getMappedPropertyForMapType(FakeMaterialMapType, "vec3OriginalName");
		assertExists(colorMappedProperty);
		assertVecAlmostEquals(colorMappedProperty.value, [0, 0.5, 1]);
		const floatMappedProperty = material.getMappedPropertyForMapType(FakeMaterialMapType, "floatOriginalName");
		assertExists(floatMappedProperty);
		assertEquals(floatMappedProperty.value, 3);
		const textureMappedProperty = material.getMappedPropertyForMapType(FakeMaterialMapType, "textureOriginalName");
		assertExists(textureMappedProperty);
		assertStrictEquals(textureMappedProperty.value, texture);
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

		material.setProperty("vec3MappedName", new Vec3(0, 0.5, 1));

		const mappedProperties = Array.from(material.getMappedPropertiesForMapType(FakeMaterialMapType));
		assertEquals(mappedProperties.length, EXPECTED_MAPPED_PROPERTIES_LENGTH);
		const colorMappedProperty = material.getMappedPropertyForMapType(FakeMaterialMapType, "vec3OriginalName");
		assertExists(colorMappedProperty);
		assertVecAlmostEquals(colorMappedProperty.value, [0, 0.5, 1]);
		const floatMappedProperty = material.getMappedPropertyForMapType(FakeMaterialMapType, "floatOriginalName");
		assertExists(floatMappedProperty);
		assertEquals(floatMappedProperty.value, 0); // default value from MockMaterialMap
	},
});

Deno.test({
	name: "setProperty() with null should set the value to null",
	fn() {
		const material = new Material(mockMaterialMap);

		material.setProperty("vec3MappedName", null);
		const result1 = material.getProperty("vec3MappedName");
		assertEquals(result1, null);

		material.setProperty("floatMappedName", null);
		const result2 = material.getProperty("floatMappedName");
		assertEquals(result2, null);

		material.setProperty("textureMappedName", null);
		const result3 = material.getProperty("textureMappedName");
		assertEquals(result3, null);
	},
});

Deno.test({
	name: "setProperty() should throw when the material map contains a different type",
	fn() {
		const material = new Material(mockMaterialMap);

		// assigning number to vec3
		assertThrows(() => {
			material.setProperty("vec3MappedName", 5);
		}, Error, 'Invalid type received for "vec3MappedName". Received number but in the "FakeMaterialMapType" a "vec3" was configured.');

		// assigning vec2 to vec3
		assertThrows(() => {
			material.setProperty("vec3MappedName", new Vec2(0, 0.5));
		}, Error, 'Invalid type received for "vec3MappedName". Received Vec2 but in the "FakeMaterialMapType" a "vec3" was configured.');

		// assigning vec3 to vec2
		assertThrows(() => {
			material.setProperty("vec2MappedName", new Vec3(0, 0.5, 1));
		}, Error, 'Invalid type received for "vec2MappedName". Received Vec3 but in the "FakeMaterialMapType" a "vec2" was configured.');

		// assigning vec3 to number
		assertThrows(() => {
			material.setProperty("floatMappedName", new Vec3(0, 0.5, 1));
		}, Error, 'Invalid type received for "floatMappedName". Received Vec3 but in the "FakeMaterialMapType" a "number" was configured.');

		// assigning Texture to number
		assertThrows(() => {
			material.setProperty("floatMappedName", new Texture(new Blob()));
		}, Error, 'Invalid type received for "floatMappedName". Received Texture but in the "FakeMaterialMapType" a "number" was configured.');

		// assigning array that is too long to vec3
		assertThrows(() => {
			material.setProperty("vec3MappedName", [0, 1, 2, 3, 4, 5, 6, 7]);
		}, Error, 'Invalid type received for "vec3MappedName". Received Array but in the "FakeMaterialMapType" a "vec3" was configured.');
	},
});

Deno.test({
	name: "setProperty() shouldn't throw when changing the type of an unmapped property",
	fn() {
		const material = new Material();
		material.setProperty("vec3MappedName", new Vec3(0, 0.5, 1));
		material.setProperty("vec3MappedName", 5);
		material.setProperty("vec3MappedName", new Texture(new Blob()));
	},
});

Deno.test({
	name: "setProperty() should overwrite existing properties",
	fn() {
		const material = new Material(mockMaterialMap);
		material.setProperties({
			vec3MappedName: new Vec3(0, 0.5, 1),
			unused: new Vec3(0, 0.5, 1),
		});

		material.setProperty("vec3MappedName", new Vec3(0.5, 0.7, 0.2));
		material.setProperty("unused", new Vec3(0.5, 0.7, 0.2));

		const properties = Array.from(material.getAllProperties());
		assertEquals(properties.length, 2);
		const colorProperty = material.getProperty("vec3MappedName");
		assertVecAlmostEquals(colorProperty, [0.5, 0.7, 0.2]);
		const floatProperty = material.getProperty("unused");
		assertVecAlmostEquals(floatProperty, [0.5, 0.7, 0.2]);

		const mappedProperties = Array.from(material.getMappedPropertiesForMapType(FakeMaterialMapType));
		assertEquals(mappedProperties.length, EXPECTED_MAPPED_PROPERTIES_LENGTH);
		const colorMappedProperty = material.getMappedPropertyForMapType(FakeMaterialMapType, "vec3OriginalName");
		assertExists(colorMappedProperty);
		assertVecAlmostEquals(colorMappedProperty.value, [0.5, 0.7, 0.2]);
		const floatMappedProperty = material.getMappedPropertyForMapType(FakeMaterialMapType, "floatOriginalName");
		assertExists(floatMappedProperty);
		assertEquals(floatMappedProperty.value, 0); // default value from MockMaterialMap
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
		material.setProperty("vec3MappedName", vec3);

		const propertyVec2 = material.getProperty("unusedVec2");
		const propertyVec3 = material.getProperty("unusedVec3");
		const propertyVec4 = material.getProperty("unusedVec4");
		const propertyColor = material.getProperty("vec3MappedName");

		assertStrictEquals(propertyVec2, vec2);
		assertStrictEquals(propertyVec3, vec3);
		assertStrictEquals(propertyVec4, vec4);

		assertStrictEquals(propertyColor, vec3);
		assertStrictEquals(propertyColor, propertyVec3);
	},
});

Deno.test({
	name: "setProperty() should convert arrays to vector types",
	fn() {
		const material = new Material(mockMaterialMap);
		material.setProperty("vec2MappedName", [0, 0.5]);
		material.setProperty("vec3MappedName", [0, 0.5, 1]);
		material.setProperty("vec4MappedName", [0, 0.5, 1, 2]);
		const vec2Result = material.getProperty("vec2MappedName");
		const vec3Result = material.getProperty("vec3MappedName");
		const vec4Result = material.getProperty("vec4MappedName");
		assertInstanceOf(vec2Result, Vec2);
		assertInstanceOf(vec3Result, Vec3);
		assertInstanceOf(vec4Result, Vec4);
		assertVecAlmostEquals(vec2Result, [0, 0.5]);
		assertVecAlmostEquals(vec3Result, [0, 0.5, 1]);
		assertVecAlmostEquals(vec4Result, [0, 0.5, 1, 2]);
	},
});

Deno.test({
	name: "setProperty() should overwrite textures",
	fn() {
		const material = new Material(mockMaterialMap);
		const texture2 = new Texture(new Blob());
		const texture1 = new Texture(new Blob());

		material.setProperty("textureMappedName", texture1);
		const result1 = material.getProperty("textureMappedName");
		assertStrictEquals(result1, texture1);

		material.setProperty("textureMappedName", texture2);
		const result2 = material.getProperty("textureMappedName");
		assertStrictEquals(result2, texture2);
	},
});

Deno.test({
	name: "getAllMappedProperties() is empty if no material map is set",
	fn() {
		const material = new Material();

		const result = Array.from(material.getMappedPropertiesForMapType(FakeMaterialMapType));

		assertEquals(result.length, 0);
	},
});

Deno.test({
	name: "getMappedProperty() returns null if no material map is set",
	fn() {
		const material = new Material();

		const result = material.getMappedPropertyForMapType(FakeMaterialMapType, "vec3OriginalName");

		assertEquals(result, null);
	},
});

Deno.test({
	name: "getMappedProperty() returns null if the requested property is not in the material map",
	fn() {
		const material = new Material(mockMaterialMap);

		const result = material.getMappedPropertyForMapType(FakeMaterialMapType, "notInTheMaterialMap");

		assertEquals(result, null);
	},
});

Deno.test({
	name: "clone() creates a new instance with a copy of all unused properties",
	fn() {
		const material = new Material();
		const vecA = new Vec2(0, 0.5);
		const vecB = new Vec3(0, 0.5, 1);
		const vecC = new Vec4(0, 0.5, 1, 2);
		const texture = new Texture(new Blob());
		material.setProperties({
			propA: vecA,
			propB: vecB,
			propC: vecC,
			propD: 5,
			propE: texture,
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
		const newPropC = newMaterial.getProperty("propC");
		assertNotStrictEquals(propC, newPropC);
		assertVecAlmostEquals(propC, vecC);

		const propD = material.getProperty("propD");
		assertEquals(propD, 5);

		const propE = material.getProperty("propE");
		assertStrictEquals(propE, texture);
	},
});

Deno.test({
	name: "clone() creates a new instance with a copy of properties that are set to null",
	fn() {
		const material = new Material(mockMaterialMap);
		material.setProperties({
			vec3MappedName: null,
			floatMappedName: null,
			textureMappedName: null,
			unused: null,
		});

		const newMaterial = material.clone();

		assertNotStrictEquals(material, newMaterial);
		assertStrictEquals(material.materialMap, newMaterial.materialMap);

		const colorProp = newMaterial.getProperty("vec3MappedName");
		assertEquals(colorProp, null);
		const floatProp = newMaterial.getProperty("floatMappedName");
		assertEquals(floatProp, null);
		const textureProp = newMaterial.getProperty("textureMappedName");
		assertEquals(textureProp, null);
		const unusedProp = newMaterial.getProperty("unused");
		assertEquals(unusedProp, null);
	},
});

Deno.test({
	name: "clone() creates a new instance with a copy of all mapped properties",
	fn() {
		const material = new Material(mockMaterialMap);
		const vecA = new Vec3(0, 0.5, 1);
		material.setProperties({
			vec3MappedName: vecA,
		});

		const newMaterial = material.clone();

		assertNotStrictEquals(material, newMaterial);
		assertStrictEquals(material.materialMap, newMaterial.materialMap);

		const propA = material.getProperty("vec3MappedName");
		const newPropA = newMaterial.getProperty("vec3MappedName");
		assertNotStrictEquals(propA, newPropA);
		assertVecAlmostEquals(propA, vecA);
		const mappedPropA = material.getMappedPropertyForMapType(FakeMaterialMapType, "vec3OriginalName");
		const newMappedPropA = newMaterial.getMappedPropertyForMapType(FakeMaterialMapType, "vec3OriginalName");
		assertExists(mappedPropA);
		assertExists(newMappedPropA);
		assertNotStrictEquals(mappedPropA.value, newMappedPropA.value);

		const propB = material.getProperty("floatMappedName");
		assertEquals(propB, null);
		const mappedPropB = material.getMappedPropertyForMapType(FakeMaterialMapType, "floatOriginalName");
		assertExists(mappedPropB);
		assertEquals(mappedPropB.value, 0);
	},
});

/**
 * @param {object} options
 * @param {string} options.name The name of the test.
 * @param {string} options.propertyName The name used in material.setProperty().
 * @param {any} options.propertyValue The instance to use.
 * @param {string} options.expectedType The expected type in the error message when an invalid type is set.
 * @param {boolean} [options.only]
 */
function instancePropertyTest({
	name,
	propertyName,
	propertyValue,
	expectedType,
	only = false,
}) {
	Deno.test({
		name: `Material with a ${name} property`,
		only,
		fn() {
			const material = new Material(mockMaterialMap);
			material.setProperties({
				[propertyName]: propertyValue,
			});
			assertStrictEquals(material.getProperty(propertyName), propertyValue);

			assertThrows(() => {
				material.setProperty(propertyName, 0);
			}, Error, `Invalid type received for "${propertyName}". Received number but in the "FakeMaterialMapType" a "${expectedType}" was configured.`);

			const material2 = material.clone();
			assertStrictEquals(material2.getProperty(propertyName), propertyValue);

			material.setProperty(propertyName, null);
			assertEquals(material.getProperty(propertyName), null);

			const material3 = material.clone();
			assertEquals(material3.getProperty(propertyName), null);
		},
	});
}

instancePropertyTest({
	name: "Texture",
	propertyName: "textureMappedName",
	expectedType: "texture2d",
	propertyValue: new Texture(new Blob([])),
});

instancePropertyTest({
	name: "Sampler",
	propertyName: "samplerMappedName",
	expectedType: "sampler",
	propertyValue: new Sampler(),
});

instancePropertyTest({
	name: "Enum",
	propertyName: "enumMappedName",
	expectedType: "enum",
	propertyValue: "option",
});

instancePropertyTest({
	name: "CustomData",
	propertyName: "customDataMappedName",
	expectedType: "custom",
	propertyValue: new CustomMaterialData(),
});
