export interface Supplier {
  id: string;
  name: string;
  /** Service ZIPs as inclusive ranges; a single ZIP is a one-ZIP range (BR-004). */
  serviceZipRanges: readonly { start: number; end: number }[];
  supportedCategories: ReadonlySet<string>;
  /** Customer satisfaction score from 1 to 10; null means "no ratings yet" (BR-006). */
  satisfactionScore: number | null;
  canMailOrder: boolean;
}
