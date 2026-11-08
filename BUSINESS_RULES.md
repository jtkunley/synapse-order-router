# Business Rules

Based on the instructions and sample orders attached to the
[Synapse Health assessment email](https://mail.google.com/mail/#all/1a1ad2a187ac455c).
The rules below describe the assessment; unresolved policies are listed separately.

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

Supplier data may contain ZIP lists (`10001, 10002`) or ranges (`10001-10100`),
comma-separated categories, ratings from 1 to 10 or `no ratings yet`, and `y`/`n`
mail-order flags. Handle these supplied formats and preserve ZIP codes with leading
zeros, such as `02130`.

Sample orders also include `priority` and `notes`; the assessment specifies no
routing behavior for these fields.

## Supplier eligibility

- Determine each product's category from the supplied product catalog.
- Assign an item only to a supplier that supports its category.
- When `mail_order` is false, use only suppliers serving the customer's ZIP.
- When `mail_order` is true, suppliers with `can_mail_order? = y` are eligible
  regardless of ZIP coverage.
- Mail-order capability never overrides the product-category requirement.

## Selection priorities

Apply these in order:

| Priority         | Rule                                                                          |
| ---------------- | ----------------------------------------------------------------------------- |
| Feasibility      | Only assign items to suppliers eligible to fulfill them.                      |
| Consolidation    | Prefer fewer shipments; use one supplier for the entire order when possible.  |
| Quality          | Among otherwise suitable options, prefer higher customer satisfaction scores. |
| Local preference | Prefer local suppliers over mail order when ratings are similar.              |

A higher rating must not justify an avoidable extra shipment. Split an order among
suppliers when necessary to cover its items.

## Decision

The endpoint is `POST /api/route`. It always returns HTTP 200; `feasible` communicates
the routing outcome.

- **Success:** return `feasible: true` and `routing`, grouped by supplier. Each group
  includes `supplier_id`, `supplier_name`, and assigned items. Each item includes
  `product_code`, `quantity`, `category`, and `fulfillment_mode`.
- **Failure:** return `feasible: false` and an `errors` list explaining invalid input
  or why the order cannot be fulfilled.
- An order must include at least one item and a valid customer ZIP. The assessment
  illustrates reporting multiple validation errors together.

A successful decision must account for all requested items and quantities.

## Policies the assessment leaves open

These need explicit implementation decisions; no defaults are established here.

| Area                        | Decision needed                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Mail-order permission       | Whether local suppliers without national shipping remain eligible when `mail_order` is true.                                 |
| Shipment counting           | Whether each selected supplier counts as one shipment.                                                                       |
| Ratings                     | How to compare unrated suppliers and combine ratings for split orders.                                                       |
| Similar ratings             | What rating difference permits local preference.                                                                             |
| Ties                        | How to choose consistently between equally preferred routes.                                                                 |
| Item allocation             | Whether quantities may be split, repeated product lines are combined, or partial assignments are returned on failure.        |
| Validation and data quality | Exact field constraints and treatment of unknown products, malformed reference data, and duplicate identifiers.              |
| Fulfillment modes           | Naming of mode values beyond the illustrated `local`, and classification when a supplier qualifies both locally and by mail. |

The supplied business model contains no stock, capacity, pricing, shipping-cost,
or delivery-time rules. The requested output is a routing decision, not an order
placement or shipment booking.
