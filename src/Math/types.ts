export type GetFirstParam<T> = T extends [infer P] ? P : never;
