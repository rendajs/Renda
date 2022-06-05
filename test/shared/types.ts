/**
 * Remove readonly from all properties in T
 */
 type NotReadonly<T> = {
    -readonly [P in keyof T]: T[P];
};
