import { assertIsType } from "./typeAssertions.js";

// These are some tests to verify if the documentation of `assertType()` is correct.

const isString = "my string";
const isAny = /** @type {any} */ (null);
const isBool = true;
const isMaybeString = /** @type {string?} */ (null);

// @ts-expect-error Verify that the variable doesn't return 'any'
assertIsType(true, isString);
assertIsType(true, isAny);

assertIsType("", isString);

// @ts-expect-error
assertIsType("", isBool);

// @ts-expect-error
assertIsType("", isMaybeString);

const typeYouWishToCheck = /** @type {"yes" | "no"} */ ("yes");
const yesOrNo = /** @type {"yes" | "no"} */ ("yes");
assertIsType(yesOrNo, typeYouWishToCheck);
assertIsType(typeYouWishToCheck, "yes");
assertIsType(typeYouWishToCheck, "no");

const typeYouWishToCheckWithExtra = /** @type {"yes" | "no" | "extra"} */ ("yes");
// @ts-expect-error
assertIsType(yesOrNo, typeYouWishToCheckWithExtra);
