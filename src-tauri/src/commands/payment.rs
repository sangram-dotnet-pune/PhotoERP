use rusqlite::{params, Connection};
use tauri::AppHandle;

use crate::{
    database::connection,
    models::payment::{
        Payment,
        PaymentInput,
        PaymentSummary,
        PaymentUpdate,
        QuotationPayments,
    },
    services::payment as payment_service,
};

const VALID_PAYMENT_METHODS: &[&str] = &["Cash", "UPI", "Bank Transfer", "Card", "Other", "Advance"];

fn validate_payment(method: &str, amount: f64) -> Result<(), String> {
    if amount <= 0.0 {
        return Err("Payment amount must be greater than zero.".to_string());
    }

    if method.trim().is_empty() {
        return Err("Payment method is required.".to_string());
    }

    if !VALID_PAYMENT_METHODS.contains(&method.trim()) {
        return Err(format!(
            "Invalid payment method '{method}'. Must be one of: {}.",
            VALID_PAYMENT_METHODS.join(", ")
        ));
    }

    Ok(())
}

/// Local-time date in YYYY-MM-DD using SQLite's date() with 'localtime', so
/// timezone offsets never push the recorded date into the previous/next day.
fn local_today(conn: &Connection) -> Result<String, String> {
    conn.query_row("SELECT date('now', 'localtime')", [], |row| row.get(0))
        .map_err(|e| format!("Failed to read local date: {e}"))
}

#[tauri::command]
pub fn add_payment(app: AppHandle, payment: PaymentInput) -> Result<(), String> {
    let conn = connection::get_connection(&app)?;

    validate_payment(&payment.payment_method, payment.amount)?;

    // Prevent overpayment: the recorded amount must not exceed what is still due.
    let allowed = payment_service::max_payment_amount(&conn, payment.quotation_id)?;

    if payment.amount > allowed + 0.001 {
        return Err(format!(
            "Payment exceeds the pending balance of {allowed:.2}."
        ));
    }

    let payment_date = if payment.payment_date.is_empty() {
        local_today(&conn)?
    } else {
        payment.payment_date.clone()
    };

    conn.execute(
        "
        INSERT INTO payments
        (quotation_id, amount, payment_date, payment_method, notes)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ",
        params![
            payment.quotation_id,
            payment.amount,
            payment_date,
            payment.payment_method,
            payment.notes,
        ],
    )
    .map_err(|e| format!("Failed to record payment: {e}"))?;

    payment_service::sync_quotation_balance(&conn, payment.quotation_id)?;

    Ok(())
}

#[tauri::command]
pub fn get_payments_by_quotation(
    app: AppHandle,
    quotation_id: i64,
) -> Result<QuotationPayments, String> {
    let conn = connection::get_connection(&app)?;

    let mut stmt = conn
        .prepare(
            "
            SELECT
                id,
                quotation_id,
                amount,
                IFNULL(payment_date, ''),
                IFNULL(payment_method, ''),
                IFNULL(notes, ''),
                IFNULL(created_at, '')
            FROM payments
            WHERE quotation_id = ?1
            ORDER BY id ASC
            ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([quotation_id], |row| {
            Ok(Payment {
                id: row.get(0)?,
                quotation_id: row.get(1)?,
                amount: row.get(2)?,
                payment_date: row.get(3)?,
                payment_method: row.get(4)?,
                notes: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut payments = Vec::new();

    for row in rows {
        payments.push(row.map_err(|e| e.to_string())?);
    }

    let (total, paid, pending, status) =
        payment_service::quotation_financial(&conn, quotation_id)?;

    Ok(QuotationPayments {
        quotation_id,
        payments,
        summary: PaymentSummary {
            total,
            paid,
            pending,
            status,
        },
    })
}

#[tauri::command]
pub fn get_payment_summary(app: AppHandle, quotation_id: i64) -> Result<PaymentSummary, String> {
    let conn = connection::get_connection(&app)?;

    let (total, paid, pending, status) =
        payment_service::quotation_financial(&conn, quotation_id)?;

    Ok(PaymentSummary {
        total,
        paid,
        pending,
        status,
    })
}

#[tauri::command]
pub fn update_payment(app: AppHandle, payment: PaymentUpdate) -> Result<(), String> {
    let conn = connection::get_connection(&app)?;

    validate_payment(&payment.payment_method, payment.amount)?;

    // Keep the single source of truth: ensure the other payments plus this one
    // never exceed the quotation total.
    let quotation_id: i64 = conn
        .query_row(
            "SELECT quotation_id FROM payments WHERE id = ?1",
            [payment.id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Payment not found: {e}"))?;

    let total = payment_service::quotation_total(&conn, quotation_id)?;
    let current_amount: f64 = conn
        .query_row(
            "SELECT amount FROM payments WHERE id = ?1",
            [payment.id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Payment not found: {e}"))?;

    let other_paid = payment_service::total_paid_for_quotation(&conn, quotation_id)?
        - current_amount;

    if other_paid + payment.amount > total + 0.001 {
        return Err(format!(
            "Payment exceeds the pending balance of {:.2}.",
            (total - other_paid).max(0.0)
        ));
    }

    let updated = conn
        .execute(
            "
            UPDATE payments
            SET amount = ?1,
                payment_date = ?2,
                payment_method = ?3,
                notes = ?4
            WHERE id = ?5
            ",
            params![
                payment.amount,
                payment.payment_date,
                payment.payment_method,
                payment.notes,
                payment.id,
            ],
        )
        .map_err(|e| format!("Failed to update payment: {e}"))?;

    if updated == 0 {
        return Err("Payment not found.".to_string());
    }

    payment_service::sync_quotation_balance(&conn, quotation_id)?;

    Ok(())
}

#[tauri::command]
pub fn delete_payment(app: AppHandle, id: i64) -> Result<(), String> {
    let conn = connection::get_connection(&app)?;

    let quotation_id: i64 = conn
        .query_row(
            "SELECT quotation_id FROM payments WHERE id = ?1",
            [id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Payment not found: {e}"))?;

    let deleted = conn
        .execute("DELETE FROM payments WHERE id = ?1", [id])
        .map_err(|e| format!("Failed to delete payment: {e}"))?;

    if deleted == 0 {
        return Err("Payment not found.".to_string());
    }

    payment_service::sync_quotation_balance(&conn, quotation_id)?;

    Ok(())
}