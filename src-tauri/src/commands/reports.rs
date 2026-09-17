use rusqlite::{params, Connection};
use tauri::AppHandle;

use crate::{
    database::connection,
    models::reports::{
        PaymentRecord, PendingClient, ReportsSummary, StatusCount, TopClient,
    },
    services::payment as payment_service,
};

// ==============================
// Reports Summary
// ==============================

/// Build the business summary from the single source of truth (quotations +
/// payments). Shared by the Reports view and the dashboard detail pages so the
/// numbers can never diverge.
fn build_reports_summary(conn: &Connection) -> Result<ReportsSummary, String> {
    let total_quotations: i64 = conn
        .query_row("SELECT COUNT(*) FROM quotations", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let total_quotation_value: f64 = conn
        .query_row(
            "SELECT IFNULL(SUM(total), 0) FROM quotations",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Revenue is money actually received, never unpaid quotation totals.
    let total_revenue: f64 = conn
        .query_row(
            "SELECT IFNULL(SUM(amount), 0) FROM payments",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let total_pending: f64 = conn
        .query_row(
            "
            SELECT IFNULL(
                SUM(MAX(quotations.total - IFNULL(paid.paid, 0), 0)),
                0
            )
            FROM quotations
            LEFT JOIN (
                SELECT quotation_id, SUM(amount) AS paid
                FROM payments
                GROUP BY quotation_id
            ) AS paid ON paid.quotation_id = quotations.id
            ",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let quotations_with_payments: i64 = conn
        .query_row(
            "SELECT COUNT(DISTINCT quotation_id) FROM payments",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let workflow_summary = status_summary(conn, "workflow")?;
    let payment_summary = status_summary(conn, "payment")?;

    Ok(ReportsSummary {
        total_quotations,
        total_quotation_value,
        total_revenue,
        total_pending,
        quotations_with_payments,
        workflow_summary,
        payment_summary,
    })
}

#[tauri::command]
pub fn get_reports_summary(app: AppHandle) -> Result<ReportsSummary, String> {
    let conn = connection::get_connection(&app)?;

    build_reports_summary(&conn)
}

fn status_summary(conn: &Connection, kind: &str) -> Result<Vec<StatusCount>, String> {
    let query = if kind == "workflow" {
        "
        SELECT IFNULL(status, 'Draft') AS status, COUNT(*) AS count
        FROM quotations
        GROUP BY IFNULL(status, 'Draft')
        ORDER BY count DESC
        "
    } else {
        "
        SELECT
            CASE
                WHEN IFNULL(paid.paid, 0) <= 0 THEN 'Pending'
                WHEN IFNULL(paid.paid, 0) >= quotations.total THEN 'Paid'
                ELSE 'Partial'
            END AS status,
            COUNT(*) AS count
        FROM quotations
        LEFT JOIN (
            SELECT quotation_id, SUM(amount) AS paid
            FROM payments
            GROUP BY quotation_id
        ) AS paid ON paid.quotation_id = quotations.id
        GROUP BY status
        ORDER BY count DESC
        "
    };

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(StatusCount {
                status: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut summary = Vec::new();

    for row in rows {
        summary.push(row.map_err(|e| e.to_string())?);
    }

    Ok(summary)
}

// ==============================
// Per-client financials
// ==============================

struct ClientFinancial {
    client_id: i64,
    name: String,
    event_count: i64,
    total_business: f64,
    amount_paid: f64,
}

/// Aggregate total business / paid per client using live payment data.
fn load_client_financials(conn: &Connection) -> Result<Vec<ClientFinancial>, String> {
    let mut stmt = conn
        .prepare(
            "
            SELECT
                c.id,
                c.name,
                COUNT(q.id) AS event_count,
                IFNULL(SUM(q.total), 0) AS total_business,
                IFNULL(
                    SUM(IFNULL((
                        SELECT SUM(p.amount) FROM payments p
                        WHERE p.quotation_id = q.id
                    ), 0)),
                    0
                ) AS amount_paid
            FROM clients c
            LEFT JOIN quotations q ON q.client_id = c.id
            GROUP BY c.id
            ORDER BY c.name COLLATE NOCASE ASC
            ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(ClientFinancial {
                client_id: row.get(0)?,
                name: row.get(1)?,
                event_count: row.get(2)?,
                total_business: row.get(3)?,
                amount_paid: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut clients = Vec::new();

    for row in rows {
        clients.push(row.map_err(|e| e.to_string())?);
    }

    Ok(clients)
}

#[tauri::command]
pub fn get_top_clients(
    app: AppHandle,
    limit: Option<i64>,
) -> Result<Vec<TopClient>, String> {
    let conn = connection::get_connection(&app)?;

    let limit = limit.unwrap_or(10).clamp(1, 100);

    let mut financials = load_client_financials(&conn)?;

    financials.sort_by(|a, b| {
        b.total_business
            .partial_cmp(&a.total_business)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    let clients = financials
        .into_iter()
        .take(limit as usize)
        .map(|c| {
            let pending_amount = (c.total_business - c.amount_paid).max(0.0);

            TopClient {
                client_name: c.name,
                event_count: c.event_count,
                total_business: c.total_business,
                amount_paid: c.amount_paid,
                pending_amount,
                payment_status: payment_service::payment_status_calc(
                    c.total_business,
                    c.amount_paid,
                ),
            }
        })
        .collect();

    Ok(clients)
}

/// Clients that still owe money, aggregated across all their quotations.
fn load_pending_clients(conn: &Connection) -> Result<Vec<PendingClient>, String> {
    let mut clients: Vec<PendingClient> = load_client_financials(conn)?
        .into_iter()
        .filter_map(|c| {
            let pending_amount = c.total_business - c.amount_paid;

            if pending_amount > 0.0 {
                Some(PendingClient {
                    client_id: c.client_id,
                    client_name: c.name,
                    total_business: c.total_business,
                    amount_paid: c.amount_paid,
                    pending_amount,
                })
            } else {
                None
            }
        })
        .collect();

    clients.sort_by(|a, b| {
        b.pending_amount
            .partial_cmp(&a.pending_amount)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    Ok(clients)
}

#[tauri::command]
pub fn get_pending_clients(app: AppHandle) -> Result<Vec<PendingClient>, String> {
    let conn = connection::get_connection(&app)?;

    load_pending_clients(&conn)
}

// ==============================
// Payments ledger
// ==============================

/// All recorded payments with their quotation and client, newest first.
/// Optional `from`/`to` (YYYY-MM-DD) filter the payment date.
fn load_all_payments(
    conn: &Connection,
    from: Option<&str>,
    to: Option<&str>,
) -> Result<Vec<PaymentRecord>, String> {
    let mut stmt = conn
        .prepare(
            "
            SELECT
                p.id,
                p.quotation_id,
                q.quotation_number,
                c.name,
                p.amount,
                IFNULL(p.payment_date, ''),
                IFNULL(p.payment_method, ''),
                IFNULL(p.notes, '')
            FROM payments p
            INNER JOIN quotations q ON q.id = p.quotation_id
            INNER JOIN clients c ON c.id = q.client_id
            WHERE (?1 IS NULL OR p.payment_date >= ?1)
              AND (?2 IS NULL OR p.payment_date <= ?2)
            ORDER BY p.payment_date DESC, p.id DESC
            ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![from, to], |row| {
            Ok(PaymentRecord {
                id: row.get(0)?,
                quotation_id: row.get(1)?,
                quotation_number: row.get(2)?,
                client_name: row.get(3)?,
                amount: row.get(4)?,
                payment_date: row.get(5)?,
                payment_method: row.get(6)?,
                notes: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut payments = Vec::new();

    for row in rows {
        payments.push(row.map_err(|e| e.to_string())?);
    }

    Ok(payments)
}

fn normalize_date(value: Option<String>) -> Option<String> {
    value.and_then(|v| {
        let trimmed = v.trim().to_string();

        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

#[tauri::command]
pub fn get_all_payments(
    app: AppHandle,
    from: Option<String>,
    to: Option<String>,
) -> Result<Vec<PaymentRecord>, String> {
    let conn = connection::get_connection(&app)?;

    let from = normalize_date(from);
    let to = normalize_date(to);

    load_all_payments(&conn, from.as_deref(), to.as_deref())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn seed(conn: &Connection) {
        conn.execute("INSERT INTO clients (name) VALUES ('Alice')", [])
            .unwrap();
        let alice = conn.last_insert_rowid();

        conn.execute("INSERT INTO clients (name) VALUES ('Bob')", [])
            .unwrap();
        let bob = conn.last_insert_rowid();

        // Alice: 1000 total, 400 paid -> 600 pending.
        conn.execute(
            "INSERT INTO quotations
             (quotation_number, client_id, event_date, subtotal, discount,
              advance_amount, total, balance, status)
             VALUES ('QT-000001', ?1, '2026-12-01', 1000, 0, 400, 1000, 600, 'Confirmed')",
            [alice],
        )
        .unwrap();
        let q1 = conn.last_insert_rowid();

        // Alice: 500 total, fully paid -> 0 pending.
        conn.execute(
            "INSERT INTO quotations
             (quotation_number, client_id, event_date, subtotal, discount,
              advance_amount, total, balance, status)
             VALUES ('QT-000002', ?1, '2026-12-02', 500, 0, 500, 500, 0, 'Draft')",
            [alice],
        )
        .unwrap();
        let q2 = conn.last_insert_rowid();

        // Bob: 2000 total, 0 paid -> 2000 pending.
        conn.execute(
            "INSERT INTO quotations
             (quotation_number, client_id, event_date, subtotal, discount,
              advance_amount, total, balance, status)
             VALUES ('QT-000003', ?1, '2026-11-01', 2000, 0, 0, 2000, 2000, 'Sent')",
            [bob],
        )
        .unwrap();
        let q3 = conn.last_insert_rowid();

        conn.execute(
            "INSERT INTO payments (quotation_id, amount, payment_date, payment_method)
             VALUES (?1, 400, '2026-01-15', 'Cash')",
            [q1],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO payments (quotation_id, amount, payment_date, payment_method)
             VALUES (?1, 500, '2026-02-20', 'UPI')",
            [q2],
        )
        .unwrap();

        let _ = q3;
    }

    #[test]
    fn reports_summary_matches_payment_source_of_truth() {
        let conn = crate::test_support::test_connection();
        seed(&conn);

        let summary = build_reports_summary(&conn).unwrap();

        assert_eq!(summary.total_quotations, 3);
        assert_eq!(summary.total_quotation_value, 3500.0);
        assert_eq!(summary.total_revenue, 900.0);
        assert_eq!(summary.total_pending, 2600.0);
        assert_eq!(summary.quotations_with_payments, 2);
    }

    #[test]
    fn pending_clients_aggregate_and_are_sorted() {
        let conn = crate::test_support::test_connection();
        seed(&conn);

        let clients = load_pending_clients(&conn).unwrap();

        // Alice: (1000 + 500) - (400 + 500) = 600 pending.
        // Bob: 2000 pending. Only clients with pending are returned.
        assert_eq!(clients.len(), 2);

        assert_eq!(clients[0].client_name, "Bob");
        assert_eq!(clients[0].pending_amount, 2000.0);

        assert_eq!(clients[1].client_name, "Alice");
        assert_eq!(clients[1].total_business, 1500.0);
        assert_eq!(clients[1].amount_paid, 900.0);
        assert_eq!(clients[1].pending_amount, 600.0);
    }

    #[test]
    fn payments_ledger_filters_by_date_and_is_newest_first() {
        let conn = crate::test_support::test_connection();
        seed(&conn);

        let all = load_all_payments(&conn, None, None).unwrap();
        assert_eq!(all.len(), 2);
        assert_eq!(all[0].payment_date, "2026-02-20");
        assert_eq!(all[0].client_name, "Alice");
        assert_eq!(all[0].quotation_number, "QT-000002");
        assert_eq!(all[1].payment_date, "2026-01-15");

        let january = load_all_payments(&conn, Some("2026-01-01"), Some("2026-01-31"))
            .unwrap();
        assert_eq!(january.len(), 1);
        assert_eq!(january[0].amount, 400.0);
    }
}
