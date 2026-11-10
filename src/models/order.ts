/** A request to route one or more line items for a customer ZIP code. */
export interface Order {
  id: string;
  customerZip: string;
  /** The customer accepts mail-order fulfillment (BR-012, BR-013). */
  allowsMailOrder: boolean;
  lineItems: readonly LineItem[];
}

/** A product code and requested quantity within an order. */
export interface LineItem {
  productCode: string;
  quantity: number;
}

/** A line item with its product category from the catalog (BR-010). */
export interface CategorizedLineItem extends LineItem {
  category: string;
}
