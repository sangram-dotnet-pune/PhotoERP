use rusqlite::Connection;

use crate::models::quotation_list::QuotationListItem;

/// Load quotation list rows with a live-derived balance and payment status.
///
/// `where_clause` is optional extra SQL appended after `WHERE` (e.g. the
/// upcoming-events filter). `order_by` is appended verbatim. `limit` clamps
/// the result set when provided.
pub fn load_quotation_list(
    conn: &Connection,
    where_clause: &str,
    order_by: &str,
    limit: Option<u64>,
) -> Result<Vec<QuotationListItem>, String> {
    let mut query = String::from(
        "
        SELECT
            q.id,
            q.quotation_number,
            c.name,
            IFNULL(q.event_type, ''),
            IFNULL(q.event_date, ''),
            q.total,
            MAX(
                q.total - IFNULL(
                    (SELECT SUM(p.amount) FROM payments p WHERE p.quotation_id = q.id),
                    0
                ),
                0
            ) AS balance,
            CASE
                WHEN IFNULL((SELECT SUM(p.amount) FROM payments p WHERE p.quotation_id = q.id), 0) <= 0
                    THEN 'Pending'
                WHEN IFNULL((SELECT SUM(p.amount) FROM payments p WHERE p.quotation_id = q.id), 0) >= q.total
                    THEN 'Paid'
                ELSE 'Partial'
            END AS paid_status,
            IFNULL(q.status, 'Draft') AS workflow_status,
            IFNULL((SELECT SUM(p.amount) FROM payments p WHERE p.quotation_id = q.id), 0) AS paid,
            IFNULL(q.venue, ''),
            IFNULL(q.city, ''),
            CASE
                WHEN (SELECT COUNT(*) FROM quotation_services s WHERE s.quotation_id = q.id) = 0
                    THEN ''
                WHEN (SELECT COUNT(*) FROM quotation_services s WHERE s.quotation_id = q.id AND s.status <> 'Completed') = 0
                    THEN 'Completed'
                ELSE 'Pending'
            END AS service_status
        FROM quotations q
        INNER JOIN clients c ON q.client_id = c.id
        ",
    );

    if !where_clause.is_empty() {
        query.push_str("WHERE ");
        query.push_str(where_clause);
        query.push(' ');
    }

    query.push_str("ORDER BY ");
    query.push_str(order_by);
    query.push(' ');

    if let Some(limit) = limit {
        query.push_str(&format!("LIMIT {limit} "));
    }

    let mut stmt = conn
        .prepare(&query)
        .map_err(|e| format!("Failed to prepare quotation list query: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(QuotationListItem {
                id: row.get(0)?,
                quotation_number: row.get(1)?,
                client_name: row.get(2)?,
                event_type: row.get(3)?,
                event_date: row.get(4)?,
                total: row.get(5)?,
                balance: row.get(6)?,
                status: row.get(7)?,
                workflow_status: row.get(8)?,
                paid: row.get(9)?,
                venue: row.get(10)?,
                city: row.get(11)?,
                service_status: row.get(12)?,
            })
        })
        .map_err(|e| format!("Failed to query quotations: {e}"))?;

    let mut items = Vec::new();

    for row in rows {
        items.push(row.map_err(|e| format!("Failed to read quotation row: {e}"))?);
    }

    Ok(items)
}

#[cfg(test)]
mod tests {
    use super::*;

    const UPCOMING_FILTER: &str = "q.event_date IS NOT NULL AND q.event_date <> '' AND date(q.event_date) >= date('now')";

    const PENDING_FILTER: &str = "(q.total - IFNULL((SELECT SUM(p.amount) FROM payments p WHERE p.quotation_id = q.id), 0)) > 0";

    fn seed_client(conn: &Connection) -> i64 {
        conn.execute("INSERT INTO clients (name) VALUES ('Event Client')", [])
            .unwrap();
        conn.last_insert_rowid()
    }

    fn add_quotation(
        conn: &Connection,
        client_id: i64,
        number: &str,
        event_date: &str,
        total: f64,
        venue: &str,
        city: &str,
    ) -> i64 {
        conn.execute(
            "INSERT INTO quotations
             (quotation_number, client_id, event_type, event_date, venue, city,
              subtotal, discount, advance_amount, total, balance, status)
             VALUES (?1, ?2, 'Wedding', ?3, ?4, ?5, ?6, 0, 0, ?6, ?6, 'Confirmed')",
            rusqlite::params![number, client_id, event_date, venue, city, total],
        )
        .unwrap();

        conn.last_insert_rowid()
    }

    #[test]
    fn upcoming_filter_only_returns_valid_future_events_sorted() {
        let conn = crate::test_support::test_connection();
        let client = seed_client(&conn);

        add_quotation(&conn, client, "QT-FUTURE2", "2999-10-12", 300.0, "Hall", "Pune");
        add_quotation(&conn, client, "QT-PAST", "2000-01-01", 100.0, "Old", "Pune");
        add_quotation(&conn, client, "QT-FUTURE1", "2999-09-18", 200.0, "Lawn", "Mumbai");
        add_quotation(&conn, client, "QT-NODATE", "", 400.0, "", "");

        let events = load_quotation_list(&conn, UPCOMING_FILTER, "q.event_date ASC", None)
            .unwrap();

        assert_eq!(events.len(), 2);
        assert_eq!(events[0].quotation_number, "QT-FUTURE1");
        assert_eq!(events[1].quotation_number, "QT-FUTURE2");
        assert_eq!(events[0].venue, "Lawn");
        assert_eq!(events[0].city, "Mumbai");
    }

    #[test]
    fn pending_filter_returns_only_unpaid_sorted_by_balance_desc() {
        let conn = crate::test_support::test_connection();
        let client = seed_client(&conn);

        let small = add_quotation(&conn, client, "QT-SMALL", "2026-05-01", 500.0, "", "");
        add_quotation(&conn, client, "QT-BIG", "2026-06-01", 2000.0, "", "");
        let paid = add_quotation(&conn, client, "QT-PAID", "2026-07-01", 800.0, "", "");

        // small: 100 paid -> 400 pending; big: 0 paid -> 2000 pending; paid: full.
        conn.execute(
            "INSERT INTO payments (quotation_id, amount, payment_date, payment_method)
             VALUES (?1, 100, '2026-04-01', 'Cash')",
            [small],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO payments (quotation_id, amount, payment_date, payment_method)
             VALUES (?1, 800, '2026-04-02', 'Cash')",
            [paid],
        )
        .unwrap();

        let pending = load_quotation_list(&conn, PENDING_FILTER, "(q.total - IFNULL((SELECT SUM(p.amount) FROM payments p WHERE p.quotation_id = q.id), 0)) DESC", None)
            .unwrap();

        assert_eq!(pending.len(), 2);
        assert_eq!(pending[0].quotation_number, "QT-BIG");
        assert_eq!(pending[0].balance, 2000.0);
        assert_eq!(pending[0].paid, 0.0);
        assert_eq!(pending[1].quotation_number, "QT-SMALL");
        assert_eq!(pending[1].balance, 400.0);
        assert_eq!(pending[1].paid, 100.0);
        assert_eq!(pending[0].status, "Pending");
    }
}