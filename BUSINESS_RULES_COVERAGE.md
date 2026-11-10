# Business rule test coverage

Every `BUS_RULE-xxx` / `OPEN-xxx` from [`BUSINESS_RULES.md`](./BUSINESS_RULES.md) and the tests that cite it.
One row per coverage link. Keep in sync when adding or retagging tests.

## BUS_RULE

### `BUS_RULE-001`

Routing uses order `order_id`, `customer_zip`, `mail_order`, and items with `product_code` and `quantity`.

| Test file                                     | Test case                                             |
| --------------------------------------------- | ----------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | returns HTTP 200 with the success routing shape       |
| `unit/models/order.test.ts`                   | accepts a valid order and strips unused sample fields |

### `BUS_RULE-002`

Product codes map to categories from the product catalog.

| Test file                                     | Test case                                                                  |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | routes the assessment sample orders through the real catalog               |
| `unit/services/catalog.test.ts`               | parses ZIP lists, ranges, ratings, and the misspelled supplier_name header |
| `unit/services/catalog.test.ts`               | keeps the first product row when product codes repeat                      |

### `BUS_RULE-003`

Supplier eligibility uses supplier id/name, service ZIPs, categories, customer satisfaction score, and mail-order capability.

| Test file                                     | Test case                                                                  |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | routes the assessment sample orders through the real catalog               |
| `unit/services/catalog.test.ts`               | parses ZIP lists, ranges, ratings, and the misspelled supplier_name header |
| `unit/services/catalog.test.ts`               | keeps the first supplier row when supplier IDs repeat                      |

### `BUS_RULE-004`

Accept supplier ZIP lists (`10001, 10002`) and ranges (`10001-10100`).

| Test file                       | Test case                                                                  |
| ------------------------------- | -------------------------------------------------------------------------- |
| `unit/services/catalog.test.ts` | parses ZIP lists, ranges, ratings, and the misspelled supplier_name header |
| `unit/services/catalog.test.ts` | rejects inverted ZIP ranges with a record-level error                      |

### `BUS_RULE-005`

Accept comma-separated supplier categories.

| Test file                       | Test case                                                                  |
| ------------------------------- | -------------------------------------------------------------------------- |
| `unit/services/catalog.test.ts` | parses ZIP lists, ranges, ratings, and the misspelled supplier_name header |

### `BUS_RULE-006`

Accept ratings from 1 to 10 or `no ratings yet`.

| Test file                       | Test case                                                                  |
| ------------------------------- | -------------------------------------------------------------------------- |
| `unit/services/catalog.test.ts` | parses ZIP lists, ranges, ratings, and the misspelled supplier_name header |

### `BUS_RULE-007`

Accept `y`/`n` mail-order flags.

| Test file                       | Test case                                                                  |
| ------------------------------- | -------------------------------------------------------------------------- |
| `unit/services/catalog.test.ts` | parses ZIP lists, ranges, ratings, and the misspelled supplier_name header |

### `BUS_RULE-008`

Preserve ZIP codes with leading zeros (for example `02130`).

| Test file                                     | Test case                                                                  |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | combines duplicate line items and preserves leading-zero ZIPs              |
| `unit/models/order.test.ts`                   | accepts a valid order and strips unused sample fields                      |
| `unit/services/catalog.test.ts`               | parses ZIP lists, ranges, ratings, and the misspelled supplier_name header |
| `unit/services/routing.test.ts`               | matches leading-zero customer ZIPs against numeric supplier coverage       |

### `BUS_RULE-009`

Sample fields `priority` and `notes` have no routing behavior.

| Test file                                     | Test case                                             |
| --------------------------------------------- | ----------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | returns HTTP 200 with the success routing shape       |
| `unit/models/order.test.ts`                   | accepts a valid order and strips unused sample fields |

### `BUS_RULE-010`

Determine each product's category from the product catalog.

| Test file                                     | Test case                                                             |
| --------------------------------------------- | --------------------------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | returns HTTP 200 with the success routing shape                       |
| `component/controllers/order-routing.test.ts` | returns HTTP 200 when products are unknown or the order is infeasible |
| `unit/services/routing.test.ts`               | combines duplicate product lines and returns unknown-product errors   |

### `BUS_RULE-011`

Assign an item only to a supplier that supports its category.

| Test file                                     | Test case                                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | allows mail-capable suppliers regardless of ZIP when mail_order is true, but still requires category |
| `component/controllers/order-routing.test.ts` | splits across suppliers when no single supplier covers every category                                |
| `unit/services/routing.test.ts`               | splits across suppliers when no single supplier covers every category                                |
| `unit/services/routing.test.ts`               | improves on a suboptimal greedy cover and ignores irrelevant suppliers                               |
| `unit/services/routing.test.ts`               | reports infeasible mail-order failures when no supplier can cover a category                         |

### `BUS_RULE-012`

When `mail_order` is false, use only suppliers serving the customer's ZIP.

| Test file                                     | Test case                                                             |
| --------------------------------------------- | --------------------------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | returns HTTP 200 when products are unknown or the order is infeasible |
| `component/controllers/order-routing.test.ts` | uses only ZIP-local suppliers when mail_order is false                |
| `unit/services/routing.test.ts`               | uses only local suppliers when mail_order is false                    |

### `BUS_RULE-013`

When `mail_order` is true, suppliers with `can_mail_order? = y` are eligible regardless of ZIP coverage.

| Test file                                     | Test case                                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | allows mail-capable suppliers regardless of ZIP when mail_order is true, but still requires category |
| `unit/services/routing.test.ts`               | uses only local suppliers when mail_order is false                                                   |

### `BUS_RULE-014`

Mail-order capability never overrides the product-category requirement.

| Test file                                     | Test case                                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | allows mail-capable suppliers regardless of ZIP when mail_order is true, but still requires category |
| `unit/services/routing.test.ts`               | reports infeasible mail-order failures when no supplier can cover a category                         |

### `BUS_RULE-015`

Feasibility: only assign items to suppliers eligible to fulfill them.

| Test file                                     | Test case                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | returns HTTP 200 when products are unknown or the order is infeasible        |
| `component/controllers/order-routing.test.ts` | uses only ZIP-local suppliers when mail_order is false                       |
| `unit/services/routing.test.ts`               | uses only local suppliers when mail_order is false                           |
| `unit/services/routing.test.ts`               | splits across suppliers when no single supplier covers every category        |
| `unit/services/routing.test.ts`               | reports infeasible mail-order failures when no supplier can cover a category |

### `BUS_RULE-016`

Consolidation: prefer fewer shipments; use one supplier for the entire order when possible.

| Test file                                     | Test case                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | prefers consolidation over a higher total rating with more shipments   |
| `unit/services/routing.test.ts`               | prefers consolidation over a higher total rating with more shipments   |
| `unit/services/routing.test.ts`               | improves on a suboptimal greedy cover and ignores irrelevant suppliers |

### `BUS_RULE-017`

Quality: among otherwise suitable options, prefer higher customer satisfaction scores.

| Test file                                     | Test case                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| `unit/services/routing.test.ts`               | prefers the higher total rating among equally small multi-supplier covers     |
| `component/controllers/order-routing.test.ts` | prefers higher satisfaction among single-supplier options                     |
| `component/controllers/order-routing.test.ts` | prefers local fulfillment when ratings are similar, otherwise quality         |
| `unit/services/routing.test.ts`               | prefers higher satisfaction among otherwise equal single-supplier options     |
| `unit/services/routing.test.ts`               | prefers local fulfillment when ratings are similar, otherwise prefers quality |

### `BUS_RULE-018`

Local preference: prefer local suppliers over mail order when ratings are similar.

| Test file                                     | Test case                                                                           |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | keeps local non-mail suppliers eligible when mail_order is true                     |
| `component/controllers/order-routing.test.ts` | prefers local fulfillment when ratings are similar, otherwise quality               |
| `unit/services/routing.test.ts`               | keeps local suppliers eligible when mail_order is true even without mail capability |
| `unit/services/routing.test.ts`               | prefers local fulfillment when ratings are similar, otherwise prefers quality       |

### `BUS_RULE-019`

A higher rating must not justify an avoidable extra shipment.

| Test file                                     | Test case                                                            |
| --------------------------------------------- | -------------------------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | prefers consolidation over a higher total rating with more shipments |
| `unit/services/routing.test.ts`               | prefers consolidation over a higher total rating with more shipments |

### `BUS_RULE-020`

Split an order among suppliers when necessary to cover its items.

| Test file                                     | Test case                                                             |
| --------------------------------------------- | --------------------------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | splits across suppliers when no single supplier covers every category |
| `unit/services/routing.test.ts`               | splits across suppliers when no single supplier covers every category |

### `BUS_RULE-021`

The routing endpoint is `POST /api/route`.

| Test file                                     | Test case                                                    |
| --------------------------------------------- | ------------------------------------------------------------ |
| `component/app.test.ts`                       | disables x-powered-by and serves openapi, docs, and routing  |
| `component/controllers/order-routing.test.ts` | returns HTTP 200 with the success routing shape              |
| `component/controllers/order-routing.test.ts` | routes the assessment sample orders through the real catalog |

### `BUS_RULE-022`

The endpoint always returns HTTP 200; `feasible` communicates the routing outcome.

| Test file                                     | Test case                                                             |
| --------------------------------------------- | --------------------------------------------------------------------- |
| `component/app.test.ts`                       | disables x-powered-by and serves openapi, docs, and routing           |
| `component/app.test.ts`                       | returns HTTP 200 for invalid JSON bodies                              |
| `component/controllers/order-routing.test.ts` | returns HTTP 200 with the success routing shape                       |
| `component/controllers/order-routing.test.ts` | returns HTTP 200 with multiple validation errors for invalid orders   |
| `component/controllers/order-routing.test.ts` | returns HTTP 200 when products are unknown or the order is infeasible |
| `component/controllers/order-routing.test.ts` | routes the assessment sample orders through the real catalog          |
| `unit/middleware/error-handler.test.ts`       | returns HTTP 200 with a body-parser message for invalid JSON types    |
| `unit/middleware/error-handler.test.ts`       | returns HTTP 200 with an exposed client message                       |
| `unit/middleware/error-handler.test.ts`       | logs unexpected errors and returns a generic failure                  |

### `BUS_RULE-023`

Success: `feasible: true` and `routing` grouped by supplier. Each group includes `supplier_id`, `supplier_name`, and assigned items. Each item includes `product_code`, `quantity`, `category`, and `fulfillment_mode`.

| Test file                                     | Test case                                                    |
| --------------------------------------------- | ------------------------------------------------------------ |
| `component/controllers/order-routing.test.ts` | returns HTTP 200 with the success routing shape              |
| `component/controllers/order-routing.test.ts` | routes the assessment sample orders through the real catalog |
| `unit/models/routing.test.ts`                 | accepts a feasible routing response                          |
| `unit/models/routing.test.ts`                 | rejects empty routing groups and empty error lists           |

### `BUS_RULE-024`

Failure: `feasible: false` and an `errors` list explaining invalid input or why the order cannot be fulfilled.

| Test file                                     | Test case                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `component/app.test.ts`                       | returns HTTP 200 for invalid JSON bodies                                     |
| `component/controllers/order-routing.test.ts` | returns HTTP 200 with multiple validation errors for invalid orders          |
| `component/controllers/order-routing.test.ts` | returns HTTP 200 when products are unknown or the order is infeasible        |
| `unit/middleware/error-handler.test.ts`       | returns HTTP 200 with a body-parser message for invalid JSON types           |
| `unit/middleware/error-handler.test.ts`       | returns HTTP 200 with an exposed client message                              |
| `unit/middleware/error-handler.test.ts`       | logs unexpected errors and returns a generic failure                         |
| `unit/models/routing.test.ts`                 | accepts a failure response                                                   |
| `unit/models/routing.test.ts`                 | rejects empty routing groups and empty error lists                           |
| `unit/services/routing.test.ts`               | combines duplicate product lines and returns unknown-product errors          |
| `unit/services/routing.test.ts`               | reports infeasible mail-order failures when no supplier can cover a category |

### `BUS_RULE-025`

An order must include at least one item and a valid customer ZIP.

| Test file                                     | Test case                                                           |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | returns HTTP 200 with multiple validation errors for invalid orders |
| `unit/models/order.test.ts`                   | reports multiple validation errors together                         |
| `unit/models/order.test.ts`                   | requires at least one line item and a five-digit ZIP                |

### `BUS_RULE-026`

Report multiple validation errors together when present.

| Test file                                     | Test case                                                           |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | returns HTTP 200 with multiple validation errors for invalid orders |
| `unit/models/order.test.ts`                   | reports multiple validation errors together                         |

### `BUS_RULE-027`

A successful decision must account for all requested items and quantities.

| Test file                                     | Test case                                                             |
| --------------------------------------------- | --------------------------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | splits across suppliers when no single supplier covers every category |
| `component/controllers/order-routing.test.ts` | combines duplicate line items and preserves leading-zero ZIPs         |
| `component/controllers/order-routing.test.ts` | routes the assessment sample orders through the real catalog          |
| `unit/services/routing.test.ts`               | splits across suppliers when no single supplier covers every category |

## OPEN

### `OPEN-001`

Mail-order permission: whether local suppliers without national shipping remain eligible when `mail_order` is true.

| Test file                                     | Test case                                                                           |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | keeps local non-mail suppliers eligible when mail_order is true                     |
| `unit/services/routing.test.ts`               | keeps local suppliers eligible when mail_order is true even without mail capability |

### `OPEN-002`

Shipment counting: whether each selected supplier counts as one shipment.

| Test file                                     | Test case                                                            |
| --------------------------------------------- | -------------------------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | prefers consolidation over a higher total rating with more shipments |
| `unit/services/routing.test.ts`               | prefers consolidation over a higher total rating with more shipments |

### `OPEN-003`

Ratings: how to compare unrated suppliers and combine ratings for split orders.

| Test file                       | Test case                                                                 |
| ------------------------------- | ------------------------------------------------------------------------- |
| `unit/services/routing.test.ts` | prefers the higher total rating among equally small multi-supplier covers |
| `unit/services/routing.test.ts` | treats unrated suppliers as score 0 and breaks equal ties by supplier id  |

### `OPEN-004`

Similar ratings: what rating difference permits local preference.

| Test file                                     | Test case                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | prefers local fulfillment when ratings are similar, otherwise quality         |
| `unit/services/routing.test.ts`               | prefers local fulfillment when ratings are similar, otherwise prefers quality |

### `OPEN-005`

Ties: how to choose consistently between equally preferred routes.

| Test file                       | Test case                                                                |
| ------------------------------- | ------------------------------------------------------------------------ |
| `unit/services/routing.test.ts` | treats unrated suppliers as score 0 and breaks equal ties by supplier id |

### `OPEN-006`

Item allocation: whether quantities may be split, repeated product lines are combined, or partial assignments are returned on failure.

| Test file                                     | Test case                                                           |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | combines duplicate line items and preserves leading-zero ZIPs       |
| `unit/services/routing.test.ts`               | combines duplicate product lines and returns unknown-product errors |

### `OPEN-007`

Validation and data quality: exact field constraints and treatment of unknown products, malformed reference data, and duplicate identifiers.

| Test file                                     | Test case                                                             |
| --------------------------------------------- | --------------------------------------------------------------------- |
| `component/app.test.ts`                       | rejects when the catalog fails to load                                |
| `component/controllers/order-routing.test.ts` | returns HTTP 200 when products are unknown or the order is infeasible |
| `unit/services/catalog.test.ts`               | keeps the first supplier row when supplier IDs repeat                 |
| `unit/services/catalog.test.ts`               | keeps the first product row when product codes repeat                 |
| `unit/services/catalog.test.ts`               | rejects empty CSV files                                               |
| `unit/services/catalog.test.ts`               | rejects inverted ZIP ranges with a record-level error                 |
| `unit/services/catalog.test.ts`               | rejects duplicate column headers                                      |
| `unit/services/routing.test.ts`               | combines duplicate product lines and returns unknown-product errors   |

### `OPEN-008`

Fulfillment modes: naming of mode values beyond the illustrated `local`, and classification when a supplier qualifies both locally and by mail.

| Test file                                     | Test case                                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `component/controllers/order-routing.test.ts` | returns HTTP 200 with the success routing shape                                                      |
| `component/controllers/order-routing.test.ts` | uses only ZIP-local suppliers when mail_order is false                                               |
| `component/controllers/order-routing.test.ts` | allows mail-capable suppliers regardless of ZIP when mail_order is true, but still requires category |
| `component/controllers/order-routing.test.ts` | keeps local non-mail suppliers eligible when mail_order is true                                      |
| `component/controllers/order-routing.test.ts` | prefers local fulfillment when ratings are similar, otherwise quality                                |
| `component/controllers/order-routing.test.ts` | routes the assessment sample orders through the real catalog                                         |
| `unit/services/routing.test.ts`               | uses only local suppliers when mail_order is false                                                   |
| `unit/services/routing.test.ts`               | keeps local suppliers eligible when mail_order is true even without mail capability                  |
| `unit/services/routing.test.ts`               | prefers local fulfillment when ratings are similar, otherwise prefers quality                        |
