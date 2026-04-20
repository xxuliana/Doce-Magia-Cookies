# Security Specification - Doce & Magia

## Data Invariants
1. **Users**:
   - `uid` must match `request.auth.uid`.
   - `points` should not be negative.
   - `isAdmin` cannot be set by the user themselves (only by admin or initial setup).
2. **Orders**:
   - Documents in `orders` must have a valid `status` ('pending', 'preparing', 'shipping', 'completed', 'canceled').
   - `userId` must match `request.auth.uid` if provided.
   - `timestamp` must be the server time.
3. **Settings**:
   - Only admins can write to the `settings` collection.
   - Public can read settings (e.g., delivery fee, templates).

## The Dirty Dozen (Attack Payloads)
1. **Spoofing Identity**: Authenticated user trying to update another user's `points`.
2. **Elevating Privilege**: User trying to set `isAdmin: true` on their own profile.
3. **Ghost Fields**: Adding `isVerified: true` to an order.
4. **ID Poisoning**: Creating an order with a massive 1MB string as ID.
5. **State Shortcut**: User trying to move their order from `pending` to `completed`.
6. **Orphaned Order**: Creating an order with a `userId` that doesn't exist.
7. **Negative Points**: Redeeeming more points than available.
8. **Malicious Settings**: Non-admin trying to change the `whatsappNumber`.
9. **Fake Timestamp**: Providing a future date as `timestamp`.
10. **Query Scraping**: Authenticated user trying to list ALL orders without a filter.
11. **Shadow Deletion**: User trying to delete an order that is already `preparing`.
12. **Junk Data**: Inserting a list into the `client` (string) field of an order.

## Test Runner (Draft)
A tests file will verify these cases.
