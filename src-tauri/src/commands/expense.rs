use rusqlite::{params, Connection};
use tauri::AppHandle;

use crate::{
    database::connection,
    models::expense::Expense,
};

const VALID_EXPENSE_TYPES: &[&str] = &["Person", "Equipment", "Other"];

fn validate_expense(expense: &Expense) -> Result<(), String> {
    let expense_type = expense.expense_type.trim();

    if expense_type.is_empty() {
        return Err("Expense type is required.".to_string());
    }

    if !VALID_EXPENSE_TYPES.contains(&expense_type) {
        return Err(format!(
            "Invalid expense type '{expense_type}'. Must be one of: {}.",
            VALID_EXPENSE_TYPES.join(", ")
        ));
    }

    if expense.note.trim().is_empty() {
        return Err("Note is required.".to_string());
    }

    if !expense.amount.is_finite() || expense.amount < 0.0 {
        return Err("Expense amount must be a non-negative number.".to_string());
    }

    Ok(())
}

/// Local-time timestamp (YYYY-MM-DD HH:MM:SS) using SQLite so the recorded
/// value always matches the machine's local clock.
fn local_now(conn: &Connection) -> Result<String, String> {
    conn.query_row(
        "SELECT datetime('now', 'localtime')",
        [],
        |row| row.get(0),
    )
    .map_err(|e| format!("Failed to read local time: {e}"))
}

fn get_expenses_core(conn: &Connection) -> Result<Vec<Expense>, String> {
    let mut stmt = conn
        .prepare(
            "
            SELECT
                id,
                IFNULL(expense_type, 'Other'),
                IFNULL(note, ''),
                IFNULL(amount, 0),
                IFNULL(expense_date, '')
            FROM expenses
            ORDER BY expense_date DESC, id DESC
            ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Expense {
                id: Some(row.get(0)?),
                expense_type: row.get(1)?,
                note: row.get(2)?,
                amount: row.get(3)?,
                expense_date: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut expenses = Vec::new();

    for row in rows {
        expenses.push(row.map_err(|e| e.to_string())?);
    }

    Ok(expenses)
}

#[tauri::command]
pub fn get_expenses(app: AppHandle) -> Result<Vec<Expense>, String> {
    let conn = connection::get_connection(&app)?;

    get_expenses_core(&conn)
}

fn add_expense_core(conn: &Connection, expense: &Expense) -> Result<(), String> {
    validate_expense(expense)?;

    let expense_type = expense.expense_type.trim();
    let note = expense.note.trim();
    let expense_date = if expense.expense_date.trim().is_empty() {
        local_now(conn)?
    } else {
        expense.expense_date.trim().to_string()
    };

    conn.execute(
        "
        INSERT INTO expenses (expense_type, note, amount, expense_date)
        VALUES (?1, ?2, ?3, ?4)
        ",
        params![expense_type, note, expense.amount, expense_date],
    )
    .map_err(|e| format!("Failed to add expense: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn add_expense(app: AppHandle, expense: Expense) -> Result<(), String> {
    let conn = connection::get_connection(&app)?;

    add_expense_core(&conn, &expense)
}

fn update_expense_core(conn: &Connection, expense: &Expense) -> Result<(), String> {
    let id = expense.id.ok_or_else(|| "Expense id is required.".to_string())?;

    validate_expense(expense)?;

    let expense_type = expense.expense_type.trim();
    let note = expense.note.trim();
    let expense_date = if expense.expense_date.trim().is_empty() {
        local_now(conn)?
    } else {
        expense.expense_date.trim().to_string()
    };

    let updated = conn
        .execute(
            "
            UPDATE expenses
            SET expense_type = ?1,
                note = ?2,
                amount = ?3,
                expense_date = ?4,
                updated_at = datetime('now', 'localtime')
            WHERE id = ?5
            ",
            params![expense_type, note, expense.amount, expense_date, id],
        )
        .map_err(|e| format!("Failed to update expense: {e}"))?;

    if updated == 0 {
        return Err("Expense not found.".to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn update_expense(app: AppHandle, expense: Expense) -> Result<(), String> {
    let conn = connection::get_connection(&app)?;

    update_expense_core(&conn, &expense)
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

#[tauri::command]
pub fn delete_expense(app: AppHandle, id: i64) -> Result<(), String> {
    let conn = connection::get_connection(&app)?;

    delete_expense_core(&conn, id)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_expense() -> Expense {
        Expense {
            id: None,
            expense_type: "Equipment".to_string(),
            note: "Lenses".to_string(),
            amount: 5_000.0,
            expense_date: String::new(),
        }
    }

    #[test]
    fn add_and_list_expenses() {
        let conn = crate::test_support::test_connection();

        add_expense_core(&conn, &sample_expense()).unwrap();

        let mut second = sample_expense();
        second.expense_type = "Person".to_string();
        second.note = "Assistant".to_string();
        second.amount = 1_200.0;
        add_expense_core(&conn, &second).unwrap();

        let expenses = get_expenses_core(&conn).unwrap();

        assert_eq!(expenses.len(), 2);
        assert!(expenses.iter().any(|e| e.note == "Lenses"));
        assert!(expenses.iter().any(|e| e.note == "Assistant"));
    }

    #[test]
    fn add_expense_defaults_date_when_missing() {
        let conn = crate::test_support::test_connection();

        add_expense_core(&conn, &sample_expense()).unwrap();

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

        let mut bad_type = sample_expense();
        bad_type.expense_type = "Camera".to_string();
        assert!(add_expense_core(&conn, &bad_type).is_err());

        let mut bad_note = sample_expense();
        bad_note.note = "   ".to_string();
        assert!(add_expense_core(&conn, &bad_note).is_err());

        let mut bad_amount = sample_expense();
        bad_amount.amount = -10.0;
        assert!(add_expense_core(&conn, &bad_amount).is_err());
    }

    #[test]
    fn update_and_delete_expense() {
        let conn = crate::test_support::test_connection();

        add_expense_core(&conn, &sample_expense()).unwrap();

        let id: i64 = conn
            .query_row("SELECT id FROM expenses LIMIT 1", [], |row| row.get(0))
            .unwrap();

        let mut updated = sample_expense();
        updated.id = Some(id);
        updated.expense_type = "Other".to_string();
        updated.note = "Misc".to_string();
        updated.amount = 250.0;

        update_expense_core(&conn, &updated).unwrap();

        let note: String = conn
            .query_row("SELECT note FROM expenses WHERE id = ?1", [id], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(note, "Misc");

        delete_expense_core(&conn, id).unwrap();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM expenses", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn updating_missing_expense_is_error() {
        let conn = crate::test_support::test_connection();

        let mut expense = sample_expense();
        expense.id = Some(999);
        assert!(update_expense_core(&conn, &expense).is_err());
    }
}