use crate::{
    database::connection,
    models::{
        dashboard::DashboardStats,
        reports::StatusCount,
    },
    services::quotation_list,
};

pub fn get_dashboard_stats(app: tauri::AppHandle) -> Result<DashboardStats, String> {
    let conn = connection::get_connection(&app)?;

    // -----------------------------------
    // Total Quotations
    // -----------------------------------

    let total_quotations: i64 = conn
        .query_row("SELECT COUNT(*) FROM quotations", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    // -----------------------------------
    // Revenue = SUM of all payments received
    // -----------------------------------

    let total_revenue: f64 = conn
        .query_row(
            "SELECT IFNULL(SUM(amount), 0) FROM payments",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // -----------------------------------
    // Pending Balance = SUM(max(total - paid, 0))
    // -----------------------------------

    let pending_balance: f64 = conn
        .query_row(
            "
            SELECT IFNULL(
                SUM(
                    MAX(
                        quotations.total - IFNULL(paid_totals.paid, 0),
                        0
                    )
                ),
                0
            )
            FROM quotations
            LEFT JOIN (
                SELECT quotation_id, SUM(amount) AS paid
                FROM payments
                GROUP BY quotation_id
            ) AS paid_totals
            ON paid_totals.quotation_id = quotations.id
            ",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // -----------------------------------
    // Upcoming Events
    // -----------------------------------

    let upcoming_events: i64 = conn
        .query_row(
            "
            SELECT COUNT(*)
            FROM quotations
            WHERE event_date IS NOT NULL
              AND event_date <> ''
              AND date(event_date) >= date('now')
            ",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // -----------------------------------
    // Workflow Status Summary
    // -----------------------------------

    let mut status_stmt = conn
        .prepare(
            "
            SELECT IFNULL(status, 'Draft') AS status, COUNT(*) AS count
            FROM quotations
            GROUP BY IFNULL(status, 'Draft')
            ORDER BY CASE IFNULL(status, 'Draft')
                WHEN 'Draft' THEN 1
                WHEN 'Sent' THEN 2
                WHEN 'Confirmed' THEN 3
                WHEN 'Completed' THEN 4
                WHEN 'Cancelled' THEN 5
                ELSE 6
            END
            ",
        )
        .map_err(|e| e.to_string())?;

    let status_rows = status_stmt
        .query_map([], |row| {
            Ok(StatusCount {
                status: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut workflow_summary = Vec::new();

    for row in status_rows {
        workflow_summary.push(row.map_err(|e| e.to_string())?);
    }

    // -----------------------------------
    // Recent Quotations
    // -----------------------------------

    let recent_quotations = quotation_list::load_quotation_list(
        &conn,
        "",
        "q.id DESC",
        Some(6),
    )?;

    // -----------------------------------
    // Upcoming Events List
    // -----------------------------------

    let upcoming_event_list = quotation_list::load_quotation_list(
        &conn,
        "q.event_date IS NOT NULL AND q.event_date <> '' AND date(q.event_date) >= date('now')",
        "q.event_date ASC",
        Some(6),
    )?;

    Ok(DashboardStats {
        total_quotations,
        total_revenue,
        pending_balance,
        upcoming_events,
        workflow_summary,
        recent_quotations,
        upcoming_event_list,
    })
}