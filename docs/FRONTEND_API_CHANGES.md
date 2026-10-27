# Frontend API Changes — Receipt Financial Accuracy

This document summarizes backend changes made to align the API with the merged EcoSpend
PRD Phase 1 (receipt data accuracy and integrity). Frontend developers should update the
React app to handle the new fields and responses described below.

## 1. Database migration required

The `Expense` table has new columns. Before deploying the backend, run:

```bash
npx prisma migrate deploy
```

New `Expense` columns:

| Column       | Type    | Notes                                              |
| ------------ | ------- | -------------------------------------------------- |
| `subtotal`   | Float?  | Pre-tax subtotal (receipt-level)                    |
| `tax`        | Float?  | Total tax charged (receipt-level)                   |
| `currency`   | String? | ISO currency code, defaults to `NGN`                |
| `confidence` | Float?  | AI extraction confidence `0.0`–`1.0` (receipt-level)|

## 2. `POST /api/ai/scan-receipt`

The top-level response still contains `receiptUrl` and `extractedData`.
`extractedData` now includes these additional fields:

```jsonc
{
  "storeName": "Merchant name or null when not visible",
  "date": "2026-10-27",       // printed receipt date, or null when not visible
  "currency": "NGN",          // or null when unknown
  "subtotal": 900.00,         // or null
  "tax": 67.50,               // or null
  "totalAmount": 967.50,
  "items": [ /* unchanged */ ],
  "category": "Groceries",
  "confidence": 0.92,         // 0.0 to 1.0
  "sustainabilityScore": 8,
  "sustainabilityTip": "..."   // may now be null
}
```

Important behavior changes:

- `storeName` is now `null` (not `"Unknown"`) when the merchant is not visible.
- `date` is now `null` (not "today") when the printed date is not visible.
- `subtotal`, `tax`, and `currency` may be `null` when the model could not read them.
  Treat `null` as "unknown", not `0`.

## 3. `POST /api/ai/confirm-receipt`

### Request body

The endpoint accepts the canonical keys below and also still accepts legacy aliases
(`store`, `total`, `receiptDate`, `receiptImage`, `receiptImageUrl`) so the frontend
does not break during the transition.

| Canonical key        | Legacy aliases        | Notes                                   |
| -------------------- | --------------------- | --------------------------------------- |
| `storeName`          | `store`               | Merchant name                           |
| `date`               | `receiptDate`         | Printed receipt date                    |
| `totalAmount`        | `total`               | Receipt grand total                     |
| `subtotal`           | —                     | Pre-tax subtotal                        |
| `tax`                | —                     | Tax charged                             |
| `currency`           | —                     | ISO currency code                       |
| `confidence`         | —                     | `0.0`–`1.0`                             |
| `receiptUrl`         | `receiptImage`, `receiptImageUrl` | Receipt image URL        |
| `items`, `category`, `sustainabilityScore`, `sustainabilityTip` | — | Unchanged |

### New error responses

1. **Arithmetic mismatch** — `400 Bad Request`

   Returned when `subtotal + tax` does not equal `totalAmount` (within 0.01). The
   frontend should prompt the user to correct the totals and retry.

   ```jsonc
   {
     "message": "Receipt totals do not add up. Please correct subtotal, tax or total before saving.",
     "validation": {
       "arithmeticMismatch": true,
       "subtotal": 900.00,
       "tax": 67.50,
       "total": 967.50,
       "computedTotal": 967.50
     }
   }
   ```

2. **Likely duplicate** — `409 Conflict`

   Returned when an existing receipt matches the same merchant, total, and receipt date.
   To allow the user to save anyway, resend the request with `"force": true`.

   ```jsonc
   {
     "message": "This receipt appears to be a duplicate.",
     "duplicate": true,
     "duplicateReceiptId": "abc-123"
   }
   ```

### Behavior changes

- `sustainabilityScore` is stored as `null` when missing or `0` (previously defaulted to `5`).
- `sustainabilityTip` is stored as `null` when missing (previously a generic fallback).
- `date` now uses the printed receipt date when provided, otherwise the current time.
  Upload/processing time remains available as `createdAt`.

## 4. `GET /api/receipts/history`

Each receipt object now includes these receipt-level fields:

```jsonc
{
  "receiptId": "receipt-...",
  "storeName": "Merchant",
  "date": "2026-10-27",        // printed receipt date
  "scannedAt": "2026-10-27T...", // upload/processing timestamp
  "category": "Groceries",
  "itemCount": 3,
  "totalAmount": 967.50,
  "subtotal": 900.00,
  "tax": 67.50,
  "currency": "NGN",
  "confidence": 0.92,
  "sustainabilityScore": 80,   // percentage form (0-100), null when absent
  "sustainabilityTip": "...",
  "items": [ /* unchanged */ ]
}
```

## 5. Expense and transaction updates

- `POST /api/expenses` and `PUT /api/expenses/:id` now accept `subtotal`, `tax`, and
  `currency` in addition to the existing fields.
- `PUT /api/transactions/:id` now accepts `storeName`, `currency`, `subtotal`, and `tax`.
  It also accepts `amount: 0` (previously `0` was ignored).

## 6. Frontend integration checklist

- [ ] Handle `400` arithmetic mismatch: show a correction UI and resend corrected totals.
- [ ] Handle `409` duplicate: confirm with the user, then resend with `force: true` or cancel.
- [ ] Render `null` merchant/date/totals as "Unknown"/empty rather than `0` or "today".
- [ ] Stop relying on the old placeholder sustainability score/tip defaults.
- [ ] Use printed `date` for trend/filter grouping; keep `scannedAt`/`createdAt` for upload time.
