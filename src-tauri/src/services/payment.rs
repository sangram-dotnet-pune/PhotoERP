use rusqlite::Connection;

/// Derive the payment status for a quotation from its total and paid amount.
///
/// Rule (single source of truth):
/// - paid == 0                -> "Pending"
/// - paid > 0 && paid >= total -> "Paid"
/// - otherwise                -> "Partial"
pub fn payment_status_calc(total: f64, paid: f64) -> String {
    if paid <= 0.0 {
        "Pending".to_string()
    } else if paid >= total {
        "Paid".to_string()
    } else {
        "Partial".to_string()
    }
}

/// Total billed amount for a quotation.
pub fn quotation_total(conn: &Connection, quotation_id: i64) -> Result<f64, String> {
    conn.query_row(
        "SELECT IFNULL(total, 0) FROM quotations WHERE id = ?1",
        [quotation_id],
        |row| row.get(0),
    )
    .map_err(|e| format!("Failed to read quotation total: {e}"))
}

/// Sum of all recorded payments for a quotation.
pub fn total_paid_for_quotation(conn: &Connection, quotation_id: i64) -> Result<f64, String> {
    conn.query_row(
        "SELECT IFNULL(SUM(amount), 0) FROM payments WHERE quotation_id = ?1",
        [quotation_id],
        |row| row.get(0),
    )
    .map_err(|e| format!("Failed to read paid amount: {e}"))
}

/// Financial snapshot (total, paid, pending, status) for a quotation, always
/// derived live from the payments table so it can never drift.
pub fn quotation_financial(
    conn: &Connection,
    quotation_id: i64,
) -> Result<(f64, f64, f64, String), String> {
    let total = quotation_total(conn, quotation_id)?;
    let paid = total_paid_for_quotation(conn, quotation_id)?;
    let pending = if total - paid > 0.0 { total - paid } else { 0.0 };
    let status = payment_status_calc(total, paid);

    Ok((total, paid, pending, status))
}

/// Sync the cached `quotations.balance` column with the live payments table
/// after any payment insert/update/delete. Returns the pending amount (>= 0).
pub fn sync_quotation_balance(conn: &Connection, quotation_id: i64) -> Result<f64, String> {
    let (_total, _paid, pending, _status) = quotation_financial(conn, quotation_id)?;

    conn.execute(
        "UPDATE quotations SET balance = ?1 WHERE id = ?2",
        rusqlite::params![pending, quotation_id],
    )
    .map_err(|e| format!("Failed to sync quotation balance: {e}"))?;

    Ok(pending)
}

/// Validate that adding `extra` to the currently paid amount for a quotation
/// does not exceed its total. Returns the maximum amount that may be recorded.
pub fn max_payment_amount(conn: &Connection, quotation_id: i64) -> Result<f64, String> {
    let (total, paid, _pending, _status) = quotation_financial(conn, quotation_id)?;
    let allowed = total - paid;

    Ok(if allowed > 0.0 { allowed } else { 0.0 })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn seeded_quotation(conn: &Connection) -> i64 {
        conn.execute(
            "INSERT INTO clients (name) VALUES ('Client')",
            [],
        )
        .unwrap();

        let client_id = conn.last_insert_rowid();

        conn.execute(
            "INSERT INTO quotations
             (quotation_number, client_id, event_date, subtotal, discount,
              advance_amount, total, balance, notes, status)
             VALUES ('QT-000001', ?1, '2026-12-01', 1000, 0, 200, 1000, 0, '', 'Draft')",
            [client_id],
        )
        .unwrap();

        let quotation_id = conn.last_insert_rowid();

        conn.execute(
            "INSERT INTO payments (quotation_id, amount, payment_date, payment_method)
             VALUES (?1, 200, '2026-11-01', 'Advance')",
            [quotation_id],
        )
        .unwrap();

        quotation_id
    }

    #[test]
    fn payment_status_calc_maps_correctly() {
        assert_eq!(payment_status_calc(1000.0, 0.0), "Pending");
        assert_eq!(payment_status_calc(1000.0, 500.0), "Partial");
        assert_eq!(payment_status_calc(1000.0, 1000.0), "Paid");
        assert_eq!(payment_status_calc(1000.0, 1200.0), "Paid");
    }

    #[test]
    fn financial_snapshot_derives_live_values() {
        let conn = crate::test_support::test_connection();
        let id = seeded_quotation(&conn);

        let (total, paid, pending, status) =
            quotation_financial(&conn, id).unwrap();

        assert_eq!(total, 1000.0);
        assert_eq!(paid, 200.0);
        assert_eq!(pending, 800.0);
        assert_eq!(status, "Partial");
    }

    #[test]
    fn sync_balance_writes_pending_to_quotation() {
        let conn = crate::test_support::test_connection();
        let id = seeded_quotation(&conn);

        let pending = sync_quotation_balance(&conn, id).unwrap();

        assert_eq!(pending, 800.0);

        let stored: f64 = conn
            .query_row(
                "SELECT balance FROM quotations WHERE id = ?1",
                [id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(stored, 800.0);
    }

    #[test]
    fn max_payment_never_exceeds_total() {
        let conn = crate::test_support::test_connection();
        let id = seeded_quotation(&conn);

        assert_eq!(max_payment_amount(&conn, id).unwrap(), 800.0);

        // After paying the full balance nothing further may be added.
        conn.execute(
            "INSERT INTO payments (quotation_id, amount, payment_date, payment_method)
             VALUES (?1, 800, '2026-12-01', 'UPI')",
            [id],
        )
        .unwrap();

        assert_eq!(max_payment_amount(&conn, id).unwrap(), 0.0);
    }
}