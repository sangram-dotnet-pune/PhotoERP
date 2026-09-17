use tauri::AppHandle;

use crate::{
    database::connection,
    models::reports::RevenueSummary,
};

/// Revenue grouped by calendar month based on actual payments received.
pub fn get_monthly_revenue(app: AppHandle) -> Result<Vec<RevenueSummary>, String> {
    let conn = connection::get_connection(&app)?;

    let mut stmt = conn
        .prepare(
            "
            SELECT
                strftime('%m', payment_date) AS month_number,
                IFNULL(SUM(amount), 0) AS amount
            FROM payments
            WHERE
                payment_date IS NOT NULL
                AND payment_date <> ''
                AND strftime('%m', payment_date) IS NOT NULL
            GROUP BY month_number
            ORDER BY month_number ASC
            ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            let month_number: String = row.get(0)?;

            let month = match month_number.as_str() {
                "01" => "Jan",
                "02" => "Feb",
                "03" => "Mar",
                "04" => "Apr",
                "05" => "May",
                "06" => "Jun",
                "07" => "Jul",
                "08" => "Aug",
                "09" => "Sep",
                "10" => "Oct",
                "11" => "Nov",
                "12" => "Dec",
                _ => "",
            };

            Ok(RevenueSummary {
                month: month.to_string(),
                amount: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut revenue = Vec::new();

    for row in rows {
        revenue.push(row.map_err(|e| e.to_string())?);
    }

    Ok(revenue)
}