import {assertEquals} from "https://deno.land/std@0.137.0/testing/asserts.ts";

function createObject() {
	class MyCoolConstructor {}

	return {
		someData: "place a substitute for a large amount of data here...",
		foo: new MyCoolConstructor(),
	};
}

const a = createObject();
const b = createObject();

assertEquals(a, b);
