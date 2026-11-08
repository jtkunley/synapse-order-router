export interface Supplier {
  id: string;
  name: string;
  zipRanges: readonly { start: number; end: number }[];
  categories: ReadonlySet<string>;
  rating: number | null;
  canMailOrder: boolean;
}
