export interface GeoObjcet {
value(value: any): unknown;
    type: string;
    crs: {
        type: string;
        properties: {
            name: string;
        };
    };
    features: {
        type: string;
        geometry: {
            type: string;
            coordinates: number[][][];
        };
    }[];
}