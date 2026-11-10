# Business Rules

This document defines the business behavior of the Synapse Health order router. It
restates the assessment requirements and records the auxiliary business rules needed to
make unspecified behavior deterministic.

The rules describe required outcomes without prescribing architecture, algorithms,
storage, or implementation.

## Rule identifiers

| Template  | Meaning                                                                            |
| --------- | ---------------------------------------------------------------------------------- |
| `BR-000`  | A business rule derived directly from the assessment.                              |
| `BRX-000` | An auxiliary business rule adopted where the assessment leaves a gap or ambiguity. |

Both rule types are binding for this implementation. The separate identifiers preserve
the source of each rule. Together, they form the complete behavioral contract for
implementation and acceptance testing.

## Domain language

| Term                   | Meaning                                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Order                  | A request to route one or more line items for a customer ZIP code.                                                           |
| Line item              | A product code and requested quantity within an order.                                                                       |
| Product                | A catalog entry identified by a product code and assigned to a product category.                                             |
| Product category       | A supplier capability used to determine whether a supplier can fulfill a line item.                                          |
| Supplier               | A business with defined product capabilities, geographic service coverage, customer satisfaction, and mail-order capability. |
| Eligible supplier      | A supplier that supports the required product category and satisfies the applicable geographic or mail-order condition.      |
| Routing plan           | A proposed set of eligible suppliers capable of fulfilling the complete order.                                               |
| Routing decision       | The final routing produced from the selected routing plan, or an infeasible outcome with reasons.                            |
| Local fulfillment      | Fulfillment by a supplier that serves the customer's ZIP code.                                                               |
| Mail-order fulfillment | Fulfillment by a mail-order-capable supplier without requiring local ZIP coverage.                                           |
| Shipment               | The portion of an order assigned to one supplier.                                                                            |

## Source data and order request

1. **BR-001** — An order contains `order_id`, `customer_zip`, `mail_order`, and one or more line items containing `product_code` and `quantity`.
2. **BR-002** — The product catalog maps each product code to its product category.
3. **BR-003** — The supplier catalog provides supplier ID, supplier name, service ZIPs, supported product categories, customer satisfaction score, and mail-order capability.
4. **BR-004** — Supplier service coverage may be expressed as individual ZIP codes or ZIP ranges.
5. **BR-005** — A supplier may support multiple product categories.
6. **BR-006** — A customer satisfaction score is between 1 and 10, or is recorded as `no ratings yet`.
7. **BR-007** — Supplier mail-order capability is represented by `can_mail_order?` with a value of `y` or `n`.
8. **BR-008** — ZIP values must retain their ZIP-code meaning, including ZIP codes with a leading zero.
9. **BR-009** — Only the routing criteria defined in this document affect the routing decision.

## Supplier eligibility

10. **BR-010** — Each line item's product category is determined from its product code.
11. **BR-011** — A supplier can fulfill a line item only when it supports that line item's product category.
12. **BR-012** — When `mail_order` is false, a supplier satisfies the geographic condition only when it serves the customer's ZIP code.
13. **BR-013** — When `mail_order` is true, a supplier with `can_mail_order? = y` satisfies the geographic condition regardless of ZIP coverage.
14. **BR-014** — Mail-order capability does not override the product-category requirement.

## Routing priorities

Routing plans are evaluated using these priorities in order. The selected plan produces
the routing decision.

15. **BR-015** — **Feasibility:** assign line items only to eligible suppliers.
16. **BR-016** — **Customer experience:** prefer fewer shipments and consolidate the order with one supplier when possible.
17. **BR-017** — **Customer satisfaction:** when multiple otherwise suitable options exist, prefer suppliers with higher customer satisfaction scores.
18. **BR-018** — **Geographic preference:** prefer local fulfillment over mail-order fulfillment when customer satisfaction scores are similar.
19. **BR-019** — A lower-priority preference does not override a higher-priority preference.
20. **BR-020** — Use multiple suppliers when one eligible supplier cannot fulfill the complete order.

## Routing decision and API contract

21. **BR-021** — The routing endpoint is `POST /api/route`.
22. **BR-022** — The endpoint always returns HTTP 200; `feasible` communicates whether routing succeeded.
23. **BR-023** — A feasible decision returns `feasible: true` and `routing` grouped by supplier. Each group contains `supplier_id`, `supplier_name`, and assigned line items. Each line item contains `product_code`, `quantity`, `category`, and `fulfillment_mode`.
24. **BR-024** — An infeasible decision returns `feasible: false` and an `errors` list explaining invalid input or why the order cannot be fulfilled.
25. **BR-025** — An order must contain at least one line item and a valid customer ZIP code.
26. **BR-026** — An infeasible decision may report multiple applicable errors.
27. **BR-027** — A feasible routing decision accounts for every requested line item and quantity.

## Auxiliary business rules

### Eligibility and selection

1. **BRX-001 — Mail-order eligibility:** When `mail_order` is true, a ZIP-local supplier remains eligible without mail-order capability.
2. **BRX-002 — Shipment counting:** Each supplier assigned at least one line item represents one shipment.
3. **BRX-003 — Satisfaction calculation:** An unrated supplier has a comparison score of zero. A multi-supplier routing plan uses the sum of its selected suppliers' customer satisfaction scores.
4. **BRX-004 — Similar satisfaction:** A minimum-shipment routing plan has similar customer satisfaction to the best minimum-shipment plan when its average selected-supplier score is no more than 0.5 points lower.
5. **BRX-005 — Routing-plan tie-break:** Among minimum-shipment routing plans with similar customer satisfaction, prefer fewer mail-order shipments, then higher total customer satisfaction, then the lexicographically smaller ordered set of supplier IDs.

### Line-item handling

6. **BRX-006 — Repeated line items:** Repeated line items for the same product are combined into one total quantity.
7. **BRX-007 — Indivisible quantity:** A product's full requested quantity is assigned to one supplier.
8. **BRX-008 — Assignment tie-break:** When multiple selected suppliers can fulfill a line item, assign it to the supplier with the lexicographically smaller supplier ID.
9. **BRX-009 — Complete fulfillment:** If any line item cannot be fulfilled, the complete order is infeasible and no partial routing is returned.

### Validation and catalog

10. **BRX-010 — Order field validity:** The order ID is non-empty, a valid customer ZIP code has exactly five digits, and the mail-order value is Boolean. Each line item has a non-empty product code and a positive integer quantity.
11. **BRX-011 — Catalog availability:** A missing or malformed catalog prevents routing.
12. **BRX-012 — Duplicate catalog identifiers:** For repeated product codes or supplier IDs, the first valid record remains authoritative. Each subsequent valid record with the same identifier is ignored and reported.
13. **BRX-013 — Unknown products:** An order containing an unknown product code is infeasible and includes a reason.

### Fulfillment classification

14. **BRX-014 — Fulfillment modes:** The supported fulfillment modes are `local` and `mail_order`.
15. **BRX-015 — Dual eligibility:** A supplier eligible both locally and by mail order uses local fulfillment.

### Input normalization

16. **BRX-016 — Text normalization:** Surrounding whitespace is ignored in order IDs, customer ZIP codes, product codes, CSV headers, and catalog text values. Product categories, `no ratings yet`, and `y`/`n` mail-order values are interpreted without regard to letter case.
17. **BRX-017 — Supplier-name header:** The supplied `suplier_name` header represents `supplier_name`.
18. **BRX-018 — Four-digit service ZIP:** A four-digit service ZIP is interpreted as a ZIP code whose leading zero was lost.

### Quantity integrity

19. **BRX-019 — Exact quantity:** A line-item quantity, including a total formed by combining repeated line items, must be a positive integer that the service can represent exactly.

## Business boundaries

The assessment defines no rules for inventory, capacity, pricing, shipping cost, or
delivery time. The required outcome is a routing decision, not order placement or
shipment booking.
