# b2b-basket-splitter

A web application for optimizing wholesale purchase orders across multiple suppliers. It automates product allocation to minimize the total order cost, taking into account wholesale price differences, delivery charges, and minimum order values (MOQ).

## Problem

When ordering supplies for hospitality or sports venues, purchasing managers typically juggle 3–5 different wholesalers. 

- Supplier A offers cheap soft drinks, but charges 40 PLN for delivery unless the subtotal exceeds 400 PLN.
- Supplier B has slightly higher product prices, but offers free delivery above 150 PLN.
- Supplier C has limited stock, requiring fallback substitutions.

Calculating the optimal order split manually across multiple invoices or spreadsheets is tedious and usually leads to either overpaying for shipping or buying unnecessary stock just to reach a free-delivery threshold.

## How It Works

1. **Order Input & Ingestion**: Ingests line items (SKU/name, quantity, target price).
2. **Catalog & Policy Matching**: Evaluates live offers against individual supplier policies (free shipping thresholds, MOQ, stock availability).
3. **Basket Engine**: Uses a greedy heuristic with fallback combinations to test split scenarios:
   - Direct best-price allocation.
   - Consolidation into fewer suppliers to waive shipping fees.
   - Threshold-filler suggestions when a basket is close to the free shipping limit.
4. **Export**: Generates individual purchase order sheets grouped by supplier.

## Project Structure

```text
src/
├── app/                  # Next.js App Router (dashboard and API routes)
├── components/           # UI components (tables, scenario selectors, modals)
├── core/
│   ├── optimizer/        # Basket split algorithms and threshold math
│   ├── matching/         # Product matching and substitution logic
│   ├── audit/            # Pre-order checks and MOQ warnings
│   └── import/           # CSV/tabular parser
├── data/                 # Demo sets and mock supplier policies
└── utils/                # Formatting and export helpers
