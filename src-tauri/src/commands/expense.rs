use rusqlite::{params, Connection, OptionalExtension};
use tauri::AppHandle;

use crate::{
    database::connection,
    models::expense::{Expense, ExpenseInput, ExpenseSummary, QuotationProfitability},
};

/// Local-time timestamp (YYYY-MM-DD HH:MM:SS) using SQLite so the recorded
/// value always matches the machine's local clock.
fn local_now(conn: &Connection) -> Result<String, String> {
    conn.query_row("SELECT datetime('now', 'localtime')", [], |row| row.get(0))
        .map_err(|e| format!("Failed to read local time: {e}"))
}

fn validate_expense(conn: &Connection, expense: &ExpenseInput) -> Result<(), String> {
    let category = expense.category.trim();

    if category.is_empty() {
        return Err("Category is required.".to_string());
    }

    if !expense.amount.is_finite() || expense.amount <= 0.0 {
        return Err("Expense amount must be greater than zero.".to_string());
    }

    if let Some(quotation_id) = expense.quotation_id {
        if quotation_id <= 0 {
            return Err("Please select a valid quotation for the order expense.".to_string());
        }

        let exists: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM quotations WHERE id = ?1",
                [quotation_id],
                |row| row.get::<_, i64>(0),
            )
            .map(|count| count > 0)
            .map_err(|e| format!("Failed to verify quotation: {e}"))?;

        if !exists {
            return Err(format!("Quotation #{quotation_id} does not exist."));
        }
    }

    Ok(())
}

const BASE_SELECT: &str = "
    SELECT
        e.id,
        e.quotation_id,
        IFNULL(e.expense_date, ''),
        IFNULL(e.category, ''),
        IFNULL(e.description, ''),
        IFNULL(e.amount, 0),
        IFNULL(e.payment_method, ''),
        IFNULL(e.vendor, ''),
        IFNULL(e.notes, ''),
        IFNULL(e.created_at, ''),
        IFNULL(e.updated_at, ''),
        q.quotation_number,
        c.name,
        q.event_type
    FROM expenses e
    LEFT JOIN quotations q ON q.id = e.quotation_id
    LEFT JOIN clients c ON c.id = q.client_id
";

fn map_expense_row(row: &rusqlite::Row) -> rusqlite::Result<Expense> {
    Ok(Expense {
        id: row.get(0)?,
        quotation_id: row.get(1)?,
        expense_date: row.get(2)?,
        category: row.get(3)?,
        description: row.get(4)?,
        amount: row.get(5)?,
        payment_method: row.get(6)?,
        vendor: row.get(7)?,
        notes: row.get(8)?,
        created_at: row.get(9)?,
        updated_at: row.get(10)?,
        quotation_number: row.get(11)?,
        client_name: row.get(12)?,
        event_type: row.get(13)?,
    })
}

fn get_expenses_core(conn: &Connection) -> Result<Vec<Expense>, String> {
    let mut stmt = conn
        .prepare(&format!(
            "{BASE_SELECT} ORDER BY e.expense_date DESC, e.id DESC"
        ))
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], map_expense_row)
        .map_err(|e| e.to_string())?;

    let mut expenses = Vec::new();

    for row in rows {
        expenses.push(row.map_err(|e| e.to_string())?);
    }

    Ok(expenses)
}

fn get_expense_by_id_core(conn: &Connection, id: i64) -> Result<Expense, String> {
    conn.query_row(
        &format!("{BASE_SELECT} WHERE e.id = ?1"),
        [id],
        map_expense_row,
    )
    .optional()
    .map_err(|e| format!("Failed to load expense: {e}"))?
    .ok_or_else(|| "Expense not found.".to_string())
}

fn get_expenses_by_quotation_core(
    conn: &Connection,
    quotation_id: i64,
) -> Result<Vec<Expense>, String> {
    let mut stmt = conn
        .prepare(&format!(
            "{BASE_SELECT} WHERE e.quotation_id = ?1 ORDER BY e.expense_date DESC, e.id DESC"
        ))
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([quotation_id], map_expense_row)
        .map_err(|e| e.to_string())?;

    let mut expenses = Vec::new();

    for row in rows {
        expenses.push(row.map_err(|e| e.to_string())?);
    }

    Ok(expenses)
}

fn create_expense_core(conn: &Connection, expense: &ExpenseInput) -> Result<(), String> {
    validate_expense(conn, expense)?;

    let expense_date = if expense.expense_date.trim().is_empty() {
        local_now(conn)?
    } else {
        expense.expense_date.trim().to_string()
    };

    conn.execute(
        "
        INSERT INTO expenses
            (quotation_id, expense_date, category, description, amount,
             payment_method, vendor, notes)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        ",
        params![
            expense.quotation_id,
            expense_date,
            expense.category.trim(),
            expense.description.trim(),
            expense.amount,
            expense.payment_method.trim(),
            expense.vendor.trim(),
            expense.notes.trim(),
        ],
    )
    .map_err(|e| format!("Failed to add expense: {e}"))?;

    Ok(())
}

fn update_expense_core(conn: &Connection, id: i64, expense: &ExpenseInput) -> Result<(), String> {
    validate_expense(conn, expense)?;

    let expense_date = if expense.expense_date.trim().is_empty() {
        local_now(conn)?
    } else {
        expense.expense_date.trim().to_string()
    };

    let updated = conn
        .execute(
            "
            UPDATE expenses
            SET quotation_id = ?1,
                expense_date = ?2,
                category = ?3,
                description = ?4,
                amount = ?5,
                payment_method = ?6,
                vendor = ?7,
                notes = ?8,
                updated_at = datetime('now', 'localtime')
            WHERE id = ?9
            ",
            params![
                expense.quotation_id,
                expense_date,
                expense.category.trim(),
                expense.description.trim(),
                expense.amount,
                expense.payment_method.trim(),
                expense.vendor.trim(),
                expense.notes.trim(),
                id,
            ],
        )
        .map_err(|e| format!("Failed to update expense: {e}"))?;

    if updated == 0 {
        return Err("Expense not found.".to_string());
    }

    Ok(())
}

fn delete_expense_core(conn: &Connection, id: i64) -> Result<(), String> {
    let deleted = conn
        .execute("DELETE FROM expenses WHERE id = ?1", [id])
        .map_err(|e| format!("Failed to delete expense: {e}"))?;

    if deleted == 0 {
        return Err("Expense not found.".to_string());
    }

    Ok(())
}

fn get_expense_summary_core(conn: &Connection) -> Result<ExpenseSummary, String> {
    conn.query_row(
        "
        SELECT
            IFNULL(SUM(amount), 0),
            IFNULL(SUM(CASE WHEN quotation_id IS NOT NULL THEN amount ELSE 0 END), 0),
            IFNULL(SUM(CASE WHEN quotation_id IS NULL THEN amount ELSE 0 END), 0),
            IFNULL(SUM(
                CASE WHEN strftime('%Y-%m', expense_date) = strftime('%Y-%m', 'now', 'localtime')
                     THEN amount ELSE 0 END
            ), 0)
        FROM expenses
        ",
        [],
        |row| {
            Ok(ExpenseSummary {
                total: row.get(0)?,
                order_total: row.get(1)?,
                general_total: row.get(2)?,
                this_month: row.get(3)?,
            })
        },
    )
    .map_err(|e| format!("Failed to load expense summary: {e}"))
}

fn get_quotation_profitability_core(
    conn: &Connection,
    quotation_id: i64,
) -> Result<QuotationProfitability, String> {
    let (quotation_number, client_name, event_type) = conn
        .query_row(
            "
            SELECT
                q.quotation_number,
                IFNULL(c.name, ''),
                IFNULL(q.event_type, '')
            FROM quotations q
            LEFT JOIN clients c ON c.id = q.client_id
            WHERE q.id = ?1
            ",
            [quotation_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()
        .map_err(|e| format!("Failed to load quotation: {e}"))?
        .ok_or_else(|| "Quotation not found.".to_string())?;

    let revenue_received: f64 = conn
        .query_row(
            "SELECT IFNULL(SUM(amount), 0) FROM payments WHERE quotation_id = ?1",
            [quotation_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to load payments for quotation: {e}"))?;

    let order_expenses: f64 = conn
        .query_row(
            "SELECT IFNULL(SUM(amount), 0) FROM expenses WHERE quotation_id = ?1",
            [quotation_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to load expenses for quotation: {e}"))?;

    Ok(QuotationProfitability {
        quotation_id,
        quotation_number,
        client_name,
        event_type,
        revenue_received,
        order_expenses,
        profit: revenue_received - order_expenses,
    })
}

#[tauri::command]
pub fn create_expense(app: AppHandle, expense: ExpenseInput) -> Result<(), String> {
    let conn = connection::get_connection(&app)?;

    create_expense_core(&conn, &expense)
}

#[tauri::command]
pub fn get_expenses(app: AppHandle) -> Result<Vec<Expense>, String> {
    let conn = connection::get_connection(&app)?;

    get_expenses_core(&conn)
}

#[tauri::command]
pub fn get_expense_by_id(app: AppHandle, id: i64) -> Result<Expense, String> {
    let conn = connection::get_connection(&app)?;

    get_expense_by_id_core(&conn, id)
}

#[tauri::command]
pub fn update_expense(app: AppHandle, id: i64, expense: ExpenseInput) -> Result<(), String> {
    let conn = connection::get_connection(&app)?;

    update_expense_core(&conn, id, &expense)
}

#[tauri::command]
pub fn delete_expense(app: AppHandle, id: i64) -> Result<(), String> {
    let conn = connection::get_connection(&app)?;

    delete_expense_core(&conn, id)
}

#[tauri::command]
pub fn get_expenses_by_quotation(
    app: AppHandle,
    quotation_id: i64,
) -> Result<Vec<Expense>, String> {
    let conn = connection::get_connection(&app)?;

    get_expenses_by_quotation_core(&conn, quotation_id)
}

#[tauri::command]
pub fn get_expense_summary(app: AppHandle) -> Result<ExpenseSummary, String> {
    let conn = connection::get_connection(&app)?;

    get_expense_summary_core(&conn)
}

#[tauri::command]
pub fn get_quotation_profitability(
    app: AppHandle,
    quotation_id: i64,
) -> Result<QuotationProfitability, String> {
    let conn = connection::get_connection(&app)?;

    get_quotation_profitability_core(&conn, quotation_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn seed_quotation(conn: &Connection) -> i64 {
        conn.execute("INSERT INTO clients (name) VALUES ('Rahul Sharma')", [])
            .unwrap();
        let client_id = conn.last_insert_rowid();

        conn.execute(
            "INSERT INTO quotations
             (quotation_number, client_id, event_type, event_date, subtotal, discount,
              advance_amount, total, balance, status)
             VALUES ('QT-000001', ?1, 'Wedding', '2026-12-25', 100000, 0, 10000, 100000,
                     90000, 'Confirmed')",
            [client_id],
        )
        .unwrap();

        conn.last_insert_rowid()
    }

    fn general_expense() -> ExpenseInput {
        ExpenseInput {
            quotation_id: None,
            expense_date: String::new(),
            category: "Equipment".to_string(),
            description: "Lenses".to_string(),
            amount: 5_000.0,
            payment_method: "Cash".to_string(),
            vendor: "Camera Store".to_string(),
            notes: String::new(),
        }
    }

    #[test]
    fn add_and_list_expenses() {
        let conn = crate::test_support::test_connection();
        let qid = seed_quotation(&conn);

        create_expense_core(&conn, &general_expense()).unwrap();

        let mut order = general_expense();
        order.quotation_id = Some(qid);
        order.category = "Travel".to_string();
        order.description = "Site visit".to_string();
        order.amount = 1_200.0;
        create_expense_core(&conn, &order).unwrap();

        let expenses = get_expenses_core(&conn).unwrap();

        assert_eq!(expenses.len(), 2);

        let order_expense = expenses
            .iter()
            .find(|e| e.quotation_id.is_some())
            .expect("order expense should exist");
        assert_eq!(order_expense.quotation_number.as_deref(), Some("QT-000001"));
        assert_eq!(order_expense.client_name.as_deref(), Some("Rahul Sharma"));
        assert_eq!(order_expense.event_type.as_deref(), Some("Wedding"));
    }

    #[test]
    fn by_quotation_and_by_id() {
        let conn = crate::test_support::test_connection();
        let qid = seed_quotation(&conn);

        create_expense_core(&conn, &general_expense()).unwrap();

        let mut order = general_expense();
        order.quotation_id = Some(qid);
        create_expense_core(&conn, &order).unwrap();

        let by_quote = get_expenses_by_quotation_core(&conn, qid).unwrap();
        assert_eq!(by_quote.len(), 1);
        assert_eq!(by_quote[0].quotation_number.as_deref(), Some("QT-000001"));

        let by_id = get_expense_by_id_core(&conn, by_quote[0].id).unwrap();
        assert_eq!(by_id.description, "Lenses");

        assert!(get_expense_by_id_core(&conn, 999_999).is_err());
    }

    #[test]
    fn add_expense_defaults_date_when_missing() {
        let conn = crate::test_support::test_connection();

        create_expense_core(&conn, &general_expense()).unwrap();

        let expense_date: String = conn
            .query_row(
                "SELECT expense_date FROM expenses LIMIT 1",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert!(!expense_date.is_empty());
    }

    #[test]
    fn add_expense_rejects_invalid_input() {
        let conn = crate::test_support::test_connection();

        let mut no_category = general_expense();
        no_category.category = "   ".to_string();
        assert!(create_expense_core(&conn, &no_category).is_err());

        let mut bad_amount = general_expense();
        bad_amount.amount = 0.0;
        assert!(create_expense_core(&conn, &bad_amount).is_err());

        let mut bad_amount = general_expense();
        bad_amount.amount = -10.0;
        assert!(create_expense_core(&conn, &bad_amount).is_err());

        let mut bad_quote = general_expense();
        bad_quote.quotation_id = Some(999_999);
        assert!(create_expense_core(&conn, &bad_quote).is_err());
    }

    #[test]
    fn update_and_delete_expense() {
        let conn = crate::test_support::test_connection();

        create_expense_core(&conn, &general_expense()).unwrap();

        let id: i64 = conn
            .query_row("SELECT id FROM expenses LIMIT 1", [], |row| row.get(0))
            .unwrap();

        let mut updated = general_expense();
        updated.category = "Other".to_string();
        updated.description = "Misc".to_string();
        updated.amount = 250.0;

        update_expense_core(&conn, id, &updated).unwrap();

        let description: String = conn
            .query_row(
                "SELECT description FROM expenses WHERE id = ?1",
                [id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(description, "Misc");

        delete_expense_core(&conn, id).unwrap();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM expenses", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn updating_missing_expense_is_error() {
        let conn = crate::test_support::test_connection();

        assert!(update_expense_core(&conn, 999, &general_expense()).is_err());
    }

    #[test]
    fn summary_splits_general_order_and_this_month() {
        let conn = crate::test_support::test_connection();
        let qid = seed_quotation(&conn);

        create_expense_core(&conn, &general_expense()).unwrap();

        let mut order = general_expense();
        order.quotation_id = Some(qid);
        order.amount = 2_000.0;
        create_expense_core(&conn, &order).unwrap();

        let summary = get_expense_summary_core(&conn).unwrap();

        assert_eq!(summary.total, 7_000.0);
        assert_eq!(summary.order_total, 2_000.0);
        assert_eq!(summary.general_total, 5_000.0);
        assert_eq!(summary.this_month, 7_000.0);
    }

    #[test]
    fn profitability_uses_payments_not_quotation_total() {
        let conn = crate::test_support::test_connection();
        let qid = seed_quotation(&conn);

        conn.execute(
            "INSERT INTO payments (quotation_id, amount, payment_date) VALUES (?1, 30000, '2026-12-01')",
            [qid],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO payments (quotation_id, amount, payment_date) VALUES (?1, 5000, '2026-12-05')",
            [qid],
        )
        .unwrap();

        let mut order = general_expense();
        order.quotation_id = Some(qid);
        order.amount = 2_000.0;
        create_expense_core(&conn, &order).unwrap();

        let profit = get_quotation_profitability_core(&conn, qid).unwrap();

        assert_eq!(profit.quotation_number, "QT-000001");
        assert_eq!(profit.client_name, "Rahul Sharma");
        assert_eq!(profit.event_type, "Wedding");
        assert_eq!(profit.revenue_received, 35_000.0);
        assert_eq!(profit.order_expenses, 2_000.0);
        assert_eq!(profit.profit, 33_000.0);
    }

    #[test]
    fn profitability_requires_existing_quotation() {
        let conn = crate::test_support::test_connection();

        assert!(get_quotation_profitability_core(&conn, 999_999).is_err());
    }
}