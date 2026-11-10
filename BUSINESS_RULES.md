# Business Rules

Based on the instructions and sample orders provided with the Synapse Health assessment.

Normative requirements use `BUS_RULE-xxx`. Tests that assert a rule cite that id
in a comment. Policies the assessment leaves open use `OPEN-xxx` and are not
defaulted here. Full rule→test mapping: [`BUSINESS_RULES_COVERAGE.md`](./BUSINESS_RULES_COVERAGE.md).

## Purpose

Route a multi-item order to suppliers that can fulfill it. Prefer fewer shipments,
then better customer satisfaction, with a preference for local fulfillment when
ratings are similar.

## Inputs

| Input                | Information used                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Order                | `order_id`, `customer_zip`, `mail_order`, and items containing `product_code` and `quantity`.                     |
| `products.csv`       | Product codes and their categories.                                                                               |
| `suppliers.csv`      | Supplier ID and name, service ZIPs, supported categories, customer satisfaction score, and mail-order capability. |
| `sample_orders.json` | Three example orders for exercising the router.                                                                   |

1. **BUS_RULE-001** — Routing uses order `order_id`, `customer_zip`, `mail_order`, and items with `product_code` and `quantity`.
2. **BUS_RULE-002** — Product codes map to categories from the product catalog.
3. **BUS_RULE-003** — Supplier eligibility uses supplier id/name, service ZIPs, categories, customer satisfaction score, and mail-order capability.
4. **BUS_RULE-004** — Accept supplier ZIP lists (`10001, 10002`) and ranges (`10001-10100`).
5. **BUS_RULE-005** — Accept comma-separated supplier categories.
6. **BUS_RULE-006** — Accept ratings from 1 to 10 or `no ratings yet`.
7. **BUS_RULE-007** — Accept `y`/`n` mail-order flags.
8. **BUS_RULE-008** — Preserve ZIP codes with leading zeros (for example `02130`).
9. **BUS_RULE-009** — Sample fields `priority` and `notes` have no routing behavior.

## Supplier eligibility

10. **BUS_RULE-010** — Determine each product's category from the product catalog.
11. **BUS_RULE-011** — Assign an item only to a supplier that supports its category.
12. **BUS_RULE-012** — When `mail_order` is false, use only suppliers serving the customer's ZIP.
13. **BUS_RULE-013** — When `mail_order` is true, suppliers with `can_mail_order? = y` are eligible regardless of ZIP coverage.
14. **BUS_RULE-014** — Mail-order capability never overrides the product-category requirement.

## Selection priorities

Apply these in order:

15. **BUS_RULE-015** — Feasibility: only assign items to suppliers eligible to fulfill them.
16. **BUS_RULE-016** — Consolidation: prefer fewer shipments; use one supplier for the entire order when possible.
17. **BUS_RULE-017** — Quality: among otherwise suitable options, prefer higher customer satisfaction scores.
18. **BUS_RULE-018** — Local preference: prefer local suppliers over mail order when ratings are similar.
19. **BUS_RULE-019** — A higher rating must not justify an avoidable extra shipment.
20. **BUS_RULE-020** — Split an order among suppliers when necessary to cover its items.

## Decision

21. **BUS_RULE-021** — The routing endpoint is `POST /api/route`.
22. **BUS_RULE-022** — The endpoint always returns HTTP 200; `feasible` communicates the routing outcome.
23. **BUS_RULE-023** — Success: `feasible: true` and `routing` grouped by supplier. Each group includes `supplier_id`, `supplier_name`, and assigned items. Each item includes `product_code`, `quantity`, `category`, and `fulfillment_mode`.
24. **BUS_RULE-024** — Failure: `feasible: false` and an `errors` list explaining invalid input or why the order cannot be fulfilled.
25. **BUS_RULE-025** — An order must include at least one item and a valid customer ZIP.
26. **BUS_RULE-026** — Report multiple validation errors together when present.
27. **BUS_RULE-027** — A successful decision must account for all requested items and quantities.

## Out of scope

The supplied business model contains no stock, capacity, pricing, shipping-cost,
or delivery-time rules. The requested output is a routing decision, not an order
placement or shipment booking.

## Policies the assessment leaves open

These need explicit implementation decisions; no defaults are established in the
assessment brief. Choices below are what this repository implements.

1. **OPEN-001** — Mail-order permission: whether local suppliers without national shipping remain eligible when `mail_order` is true.
   - **Choice:** Yes. ZIP-local suppliers stay eligible even when they cannot mail.
2. **OPEN-002** — Shipment counting: whether each selected supplier counts as one shipment.
   - **Choice:** Yes. Minimize the number of selected suppliers.
3. **OPEN-003** — Ratings: how to compare unrated suppliers and combine ratings for split orders.
   - **Choice:** Unrated suppliers score `0`. Split-plan quality is the sum of selected supplier scores.
4. **OPEN-004** — Similar ratings: what rating difference permits local preference.
   - **Choice:** Plans within `0.5 × supplier_count` of the best total score compete on local preference (`SIMILAR_RATING_DIFFERENCE`).
5. **OPEN-005** — Ties: how to choose consistently between equally preferred routes.
   - **Choice:** Prefer lower mail-shipment count, then higher score, then lexicographically smaller joined supplier-id sets.
6. **OPEN-006** — Item allocation: whether quantities may be split, repeated product lines are combined, or partial assignments are returned on failure.
   - **Choice:** Combine duplicate product lines. Assign each product to one supplier (no quantity splitting). Fail the whole order when any item is uncoverable.
7. **OPEN-007** — Validation and data quality: exact field constraints and treatment of unknown products, malformed reference data, and duplicate identifiers.
   - **Choice:** A missing or malformed catalog does not stop the server: the load error is logged and every `POST /api/route` returns `feasible: false` with `Catalog unavailable.` (HTTP 200). A repeated `product_code` or `supplier_id` keeps the first row; every later row with that key is ignored (whatever else it contains) with one warning per skipped row. Unknown products and invalid orders return `feasible: false` with `errors` (HTTP 200).
8. **OPEN-008** — Fulfillment modes: naming of mode values beyond the illustrated `local`, and classification when a supplier qualifies both locally and by mail.
   - **Choice:** Modes are `local` and `mail_order`. A supplier that covers the ZIP is recorded as `local` even if it can also mail.
