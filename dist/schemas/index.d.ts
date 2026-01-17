import schemasJson from "./schemas.json";
export type SchemaKey = keyof typeof schemasJson;
export type Schema = (typeof schemasJson)[SchemaKey];
export declare const schemas: typeof schemasJson;
//# sourceMappingURL=index.d.ts.map