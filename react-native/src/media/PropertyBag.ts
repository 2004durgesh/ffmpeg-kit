export type Properties = Record<string, any>;

export class PropertyBag {
  #properties: Properties | undefined;

  constructor(properties: Properties | undefined) {
    this.#properties = properties;
  }

  getStringProperty(key: string): any {
    return this.#properties?.[key];
  }
  getNumberProperty(key: string): any {
    return this.#properties?.[key];
  }
  getProperty(key: string): any {
    return this.#properties?.[key];
  }
  getAllProperties(): Properties | undefined {
    return this.#properties;
  }
}
