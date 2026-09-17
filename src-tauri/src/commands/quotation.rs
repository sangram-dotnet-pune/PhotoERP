use rusqlite::{params, Result};

use tauri::AppHandle;

use crate::{
    database::connection,
    models::client::Client,
    models::quotation::{Quotation, ServiceItem},
    models::quotation_list::QuotationListItem,
    services::{payment, quotation_list as quotation_list_service, quotation_number},
};

/// Validate a quotation before it is saved or updated. Mirrors the frontend
/// rules so invalid data can never reach the database.
pub fn validate_quotation(quotation: &Quotation) -> Result<(), String> {
    if quotation.client.name.trim().is_empty() {
        return Err("Client name is required.".to_string());
    }

    if quotation.services.is_empty() {
        return Err("At least one service is required.".to_string());
    }

    for service in &quotation.services {
        if service.service_name.trim().is_empty() {
            return Err("Every service must have a name.".to_string());
        }

        if service.quantity < 1 {
            return Err("Service quantity must be at least 1.".to_string());
        }

        if service.price < 0.0 || service.total < 0.0 {
            return Err("Service price cannot be negative.".to_string());
        }
    }

    if quotation.subtotal < 0.0
        || quotation.discount < 0.0
        || quotation.advance_amount < 0.0
        || quotation.total < 0.0
    {
        return Err("Amounts cannot be negative.".to_string());
    }

    if quotation.discount > quotation.subtotal {
        return Err("Discount cannot exceed the subtotal.".to_string());
    }

    if quotation.advance_amount > quotation.total {
        return Err("Advance amount cannot exceed the total.".to_string());
    }

    Ok(())
}

/// Core save logic, factored out of the command so it can be unit-tested.
/// Returns the quotation number assigned to the new record.
pub(crate) fn save_quotation_core(
    tx: &rusqlite::Transaction,
    mut quotation: Quotation,
) -> Result<String, String> {
    validate_quotation(&quotation)?;

    // ---------------------------
    // Assign the next sequential number when one has not been provided or the
    // provided number is taken (e.g. a stale client-side value).
    // ---------------------------

    let assigned_number = if quotation.quotation_number.trim().is_empty()
        || quotation_number::quotation_number_exists(tx, &quotation.quotation_number)?
    {
        quotation_number::next_quotation_number(tx)?
    } else {
        quotation.quotation_number.clone()
    };

    // ---------------------------
    // Link the quotation to a client.
    //
    // When a client_id is supplied (e.g. the user picked an existing client in
    // the UI) the quotation is linked to that client and no new client is
    // created. Otherwise a client is created from the supplied details.
    // ---------------------------

    let client_id = match quotation.client_id {
        Some(client_id) => {
            let exists: i64 = tx
                .query_row(
                    "SELECT COUNT(*) FROM clients WHERE id = ?1",
                    [client_id],
                    |row| row.get(0),
                )
                .map_err(|e| format!("Failed to check client: {e}"))?;

            if exists == 0 {
                return Err("Selected client does not exist.".to_string());
            }

            client_id
        }
        None => {
            tx.execute(
                "
                INSERT INTO clients (name, phone, email, address)
                VALUES (?1, ?2, ?3, ?4)
                ",
                params![
                    quotation.client.name,
                    quotation.client.phone,
                    quotation.client.email,
                    quotation.client.address
                ],
            )
            .map_err(|e| format!("Failed to save client: {e}"))?;

            tx.last_insert_rowid()
        }
    };

    // The quotation date defaults to today (UTC) when not supplied.
    if quotation.quotation_date.trim().is_empty() {
        let today: String = tx
            .query_row("SELECT date('now', 'localtime')", [], |row| row.get(0))
            .map_err(|e| format!("Failed to read current date: {e}"))?;

        quotation.quotation_date = today;
    }

    tx.execute(
        "
        INSERT INTO quotations
        (
            quotation_number,
            client_id,
            event_type,
            event_date,
            event_time,
            venue,
            city,
            event_notes,
            subtotal,
            discount,
            advance_amount,
            total,
            balance,
            notes,
            status,
            quotation_date
        )
        VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)
        ",
        params![
            assigned_number,
            client_id,
            quotation.event_type,
            quotation.event_date,
            quotation.event_time,
            quotation.venue,
            quotation.city,
            quotation.event_notes,
            quotation.subtotal,
            quotation.discount,
            quotation.advance_amount,
            quotation.total,
            quotation.balance,
            quotation.notes,
            quotation.status,
            quotation.quotation_date
        ],
    )
    .map_err(|e| format!("Failed to save quotation: {e}"))?;

    let quotation_id = tx.last_insert_rowid();

    // The advance amount is stored on the quotation and, to keep the payments
    // table the single source of truth, recorded as an initial payment too.
    if quotation.advance_amount > 0.0 {
        tx.execute(
            "
            INSERT INTO payments (quotation_id, amount, payment_date, payment_method, notes)
            VALUES (?1, ?2, ?3, 'Advance', 'Initial advance payment')
            ",
            params![
                quotation_id,
                quotation.advance_amount,
                quotation.event_date
            ],
        )
        .map_err(|e| format!("Failed to record advance payment: {e}"))?;
    }

    // Recompute balance from payments so it never drifts.
    let _ = payment::sync_quotation_balance(tx, quotation_id)?;

    for service in &quotation.services {
        tx.execute(
            "
            INSERT INTO quotation_services
            (quotation_id, service_name, quantity, price, total, status)
            VALUES (?1,?2,?3,?4,?5,?6)
            ",
            params![
                quotation_id,
                service.service_name,
                service.quantity,
                service.price,
                service.total,
                "Pending"
            ],
        )
        .map_err(|e| format!("Failed to save service: {e}"))?;
    }

    Ok(assigned_number)
}

#[tauri::command]
pub fn save_quotation(app: AppHandle, quotation: Quotation) -> Result<String, String> {
    let mut conn = connection::get_connection(&app)?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let assigned = save_quotation_core(&tx, quotation)?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(format!("Quotation {assigned} saved successfully"))
}

#[tauri::command]
pub fn get_quotations(app: AppHandle) -> Result<Vec<QuotationListItem>, String> {
    let conn = connection::get_connection(&app)?;

    quotation_list_service::load_quotation_list(&conn, "", "q.id DESC", None)
}

/// All future events, nearest first. Shares the exact same date predicate as
/// the dashboard's Upcoming Events count so the two can never disagree.
#[tauri::command]
pub fn get_upcoming_events(app: AppHandle) -> Result<Vec<QuotationListItem>, String> {
    let conn = connection::get_connection(&app)?;

    quotation_list_service::load_quotation_list(
        &conn,
        "q.event_date IS NOT NULL AND q.event_date <> '' AND date(q.event_date) >= date('now')",
        "q.event_date ASC",
        None,
    )
}

/// Quotations with a remaining balance, largest balance first. The balance is
/// derived from the payments table (same formula used by the dashboard).
#[tauri::command]
pub fn get_pending_quotations(app: AppHandle) -> Result<Vec<QuotationListItem>, String> {
    let conn = connection::get_connection(&app)?;

    quotation_list_service::load_quotation_list(
        &conn,
        "(q.total - IFNULL((SELECT SUM(p.amount) FROM payments p WHERE p.quotation_id = q.id), 0)) > 0",
        "(q.total - IFNULL((SELECT SUM(p.amount) FROM payments p WHERE p.quotation_id = q.id), 0)) DESC",
        None,
    )
}

/// Core deletion logic, factored out of the command so it can be unit-tested.
///
/// Deletes the quotation and its dependent payments and services only. The
/// client is an independent business entity and is NEVER deleted here.
///
/// Must be called inside a transaction so a failure rolls everything back.
fn delete_quotation_core(tx: &rusqlite::Transaction, id: i64) -> Result<(), String> {
    // The quotation must exist before anything is deleted.
    let exists: i64 = tx
        .query_row(
            "SELECT COUNT(*) FROM quotations WHERE id = ?1",
            [id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to load quotation: {e}"))?;

    if exists == 0 {
        return Err("Quotation not found.".to_string());
    }

    // Payments and services are deleted by the quotation's own id only, so
    // data belonging to other quotations can never be touched.
    tx.execute(
        "DELETE FROM payments WHERE quotation_id = ?1",
        [id],
    )
    .map_err(|e| format!("Failed to delete quotation payments: {e}"))?;

    tx.execute(
        "DELETE FROM quotation_services WHERE quotation_id = ?1",
        [id],
    )
    .map_err(|e| format!("Failed to delete quotation services: {e}"))?;

    tx.execute("DELETE FROM quotations WHERE id = ?1", [id])
        .map_err(|e| format!("Failed to delete quotation: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn delete_quotation(id: i64, app: AppHandle) -> Result<(), String> {
    let mut conn = connection::get_connection(&app)?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    delete_quotation_core(&tx, id)?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_quotation_by_id(id: i64, app: tauri::AppHandle) -> Result<Quotation, String> {
    let conn = connection::get_connection(&app)?;

    // ---------------------------
    // Load quotation
    // ---------------------------

    let mut stmt = conn
        .prepare(
            "
            SELECT
                quotations.quotation_number,
                IFNULL(quotations.quotation_date, ''),
                quotations.client_id,

                clients.name,
                clients.phone,
                clients.email,
                clients.address,

                quotations.event_type,
                quotations.event_date,
                quotations.event_time,

                quotations.venue,
                quotations.city,
                IFNULL(quotations.event_notes, ''),

                quotations.subtotal,
                quotations.discount,
                quotations.advance_amount,
                quotations.total,
                quotations.balance,

                quotations.notes,
                IFNULL(quotations.status, 'Draft')

            FROM quotations

            INNER JOIN clients
                ON quotations.client_id = clients.id

            WHERE quotations.id = ?1
            ",
        )
        .map_err(|e| e.to_string())?;

    let mut quotation = stmt
        .query_row([id], |row| {
            Ok(Quotation {
                id: Some(id),
                quotation_number: row.get(0)?,
                quotation_date: row.get(1)?,
                client_id: row.get(2)?,

                client: Client {
                    name: row.get(3)?,
                    phone: row.get(4)?,
                    email: row.get(5)?,
                    address: row.get(6)?,
                },

                event_type: row.get(7)?,
                event_date: row.get(8)?,
                event_time: row.get(9)?,

                venue: row.get(10)?,
                city: row.get(11)?,
                event_notes: row.get(12)?,

                subtotal: row.get(13)?,
                discount: row.get(14)?,
                advance_amount: row.get(15)?,
                total: row.get(16)?,
                balance: row.get(17)?,

                notes: row.get(18)?,
                status: row.get(19)?,

                services: Vec::new(),
            })
        })
        .map_err(|e| e.to_string())?;

    // ---------------------------
    // Load services (including their stable DB ids so edits can preserve status)
    // ---------------------------

    let mut stmt = conn
        .prepare(
            "
            SELECT
                id,
                service_name,
                quantity,
                price,
                total,
                status
            FROM quotation_services
            WHERE quotation_id = ?1
            ORDER BY id ASC
            ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([id], |row| {
            Ok(ServiceItem {
                id: Some(row.get(0)?),
                service_name: row.get(1)?,
                quantity: row.get(2)?,
                price: row.get(3)?,
                total: row.get(4)?,
                status: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut services = Vec::new();

    for item in rows {
        services.push(item.map_err(|e| e.to_string())?);
    }

    quotation.services = services;

    Ok(quotation)
}

/// Core update logic, factored out of the command so it can be unit-tested.
fn update_quotation_core(
    tx: &rusqlite::Transaction,
    quotation: Quotation,
) -> Result<(), String> {
    validate_quotation(&quotation)?;

    let quotation_id = quotation.id.ok_or("Quotation id is missing")?;

    // The quotation must exist.
    let exists: i64 = tx
        .query_row(
            "SELECT COUNT(*) FROM quotations WHERE id = ?1",
            [quotation_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to load quotation: {e}"))?;

    if exists == 0 {
        return Err("Quotation not found.".to_string());
    }

    tx.execute(
        "
        UPDATE clients
        SET
            name = ?1,
            phone = ?2,
            email = ?3,
            address = ?4
        WHERE id = (
            SELECT client_id FROM quotations WHERE id = ?5
        )
        ",
        params![
            quotation.client.name,
            quotation.client.phone,
            quotation.client.email,
            quotation.client.address,
            quotation_id,
        ],
    )
    .map_err(|e| format!("Failed to update client: {e}"))?;

    // NOTE: quotation_number and quotation_date are deliberately untouched here
    // so an edit can never change the document number or its creation date.
    tx.execute(
        "
        UPDATE quotations
        SET
            event_type = ?1,
            event_date = ?2,
            event_time = ?3,
            venue = ?4,
            city = ?5,
            event_notes = ?6,
            subtotal = ?7,
            discount = ?8,
            advance_amount = ?9,
            total = ?10,
            notes = ?11
        WHERE id = ?12
        ",
        params![
            quotation.event_type,
            quotation.event_date,
            quotation.event_time,
            quotation.venue,
            quotation.city,
            quotation.event_notes,
            quotation.subtotal,
            quotation.discount,
            quotation.advance_amount,
            quotation.total,
            quotation.notes,
            quotation_id,
        ],
    )
    .map_err(|e| format!("Failed to update quotation: {e}"))?;

    // Capture existing service statuses keyed by their DB id (primary) and
    // service name (fallback) so edits preserve delivery status.
    let mut status_by_id = std::collections::HashMap::<i64, String>::new();
    let mut status_by_name = std::collections::HashMap::<String, String>::new();

    {
        let mut stmt = tx
            .prepare(
                "
                SELECT id, service_name, status
                FROM quotation_services
                WHERE quotation_id = ?1
                ",
            )
            .map_err(|e| format!("Failed to read existing services: {e}"))?;

        let rows = stmt
            .query_map([quotation_id], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            })
            .map_err(|e| format!("Failed to read existing services: {e}"))?;

        for row in rows.flatten() {
            status_by_id.insert(row.0, row.2.clone());
            status_by_name.insert(row.1, row.2);
        }
    }

    // Remove the old service rows; we re-insert the current set below while
    // carrying forward the delivery status of unchanged services.
    tx.execute(
        "DELETE FROM quotation_services WHERE quotation_id = ?1",
        [quotation_id],
    )
    .map_err(|e| format!("Failed to replace services: {e}"))?;

    for service in &quotation.services {
        let status = service
            .id
            .and_then(|sid| status_by_id.get(&sid).cloned())
            .or_else(|| status_by_name.get(&service.service_name).cloned())
            .unwrap_or_else(|| "Pending".to_string());

        tx.execute(
            "
            INSERT INTO quotation_services
            (quotation_id, service_name, quantity, price, total, status)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ",
            params![
                quotation_id,
                service.service_name,
                service.quantity,
                service.price,
                service.total,
                status,
            ],
        )
        .map_err(|e| format!("Failed to save service: {e}"))?;
    }

    // Balance is always derived from the payments table (single source of truth).
    let _ = payment::sync_quotation_balance(tx, quotation_id)?;

    Ok(())
}

#[tauri::command]
pub fn update_quotation(app: AppHandle, quotation: Quotation) -> Result<String, String> {
    let mut conn = connection::get_connection(&app)?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    update_quotation_core(&tx, quotation)?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok("Quotation Updated Successfully".to_string())
}

#[tauri::command]
pub fn generate_quotation_number(app: AppHandle) -> Result<String, String> {
    let conn = connection::get_connection(&app)?;

    quotation_number::next_quotation_number(&conn)
}

const WORKFLOW_STATUSES: &[&str] = &["Draft", "Sent", "Confirmed", "Completed", "Cancelled"];

pub fn is_valid_workflow_status(status: &str) -> bool {
    WORKFLOW_STATUSES.contains(&status)
}

#[tauri::command]
pub fn update_quotation_status(
    app: AppHandle,
    id: i64,
    status: String,
) -> Result<(), String> {
    if !is_valid_workflow_status(&status) {
        return Err(format!(
            "Invalid status '{status}'. Must be one of: {}.",
            WORKFLOW_STATUSES.join(", ")
        ));
    }

    let conn = connection::get_connection(&app)?;

    let updated = conn
        .execute(
            "UPDATE quotations SET status = ?1 WHERE id = ?2",
            params![status, id],
        )
        .map_err(|e| format!("Failed to update quotation status: {e}"))?;

    if updated == 0 {
        return Err("Quotation not found.".to_string());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::quotation::{Quotation, ServiceItem};

    fn quotation() -> Quotation {
        crate::test_support::sample_quotation()
    }

    fn quotation_id_by_number(tx: &rusqlite::Transaction, number: &str) -> i64 {
        let mut stmt = tx
            .prepare("SELECT id FROM quotations WHERE quotation_number = ?1")
            .unwrap();

        stmt.query_row([number], |row| row.get(0)).unwrap()
    }

    fn seed_quotation(
        tx: &rusqlite::Transaction,
        number: &str,
        client_name: &str,
    ) -> i64 {
        tx.execute(
            "INSERT INTO clients (name) VALUES (?1)",
            [client_name],
        )
        .unwrap();

        let client_id = tx.last_insert_rowid();

        seed_quotation_for_client(tx, client_id, number)
    }

    fn seed_quotation_for_client(
        tx: &rusqlite::Transaction,
        client_id: i64,
        number: &str,
    ) -> i64 {
        tx.execute(
            "INSERT INTO quotations
             (quotation_number, client_id, subtotal, discount, advance_amount,
              total, balance, notes, status)
             VALUES (?1, ?2, 1000, 0, 0, 1000, 1000, '', 'Draft')",
            rusqlite::params![number, client_id],
        )
        .unwrap();

        tx.last_insert_rowid()
    }

    fn add_service(tx: &rusqlite::Transaction, quotation_id: i64, name: &str) {
        tx.execute(
            "INSERT INTO quotation_services
             (quotation_id, service_name, quantity, price, total, status)
             VALUES (?1, ?2, 1, 1000, 1000, 'Pending')",
            rusqlite::params![quotation_id, name],
        )
        .unwrap();
    }

    fn add_payment(tx: &rusqlite::Transaction, quotation_id: i64, amount: f64) {
        tx.execute(
            "INSERT INTO payments (quotation_id, amount, payment_date, payment_method)
             VALUES (?1, ?2, '2026-01-01', 'Cash')",
            rusqlite::params![quotation_id, amount],
        )
        .unwrap();
    }

    fn count(conn: &rusqlite::Connection, table: &str) -> i64 {
        conn.query_row(
            &format!("SELECT COUNT(*) FROM {table}"),
            [],
            |row| row.get(0),
        )
        .unwrap()
    }

    #[test]
    fn delete_removes_quotation_dependents_but_keeps_client() {
        // TEST 1: one quotation with payments and services. Deleting it removes
        // all dependent rows but the client is an independent entity and stays.
        let mut conn = crate::test_support::test_connection();
        let tx = conn.transaction().unwrap();

        let quote_id = seed_quotation(&tx, "QT-D1", "Client A");
        add_service(&tx, quote_id, "Photography");
        add_payment(&tx, quote_id, 400.0);
        add_payment(&tx, quote_id, 600.0);

        let client_id: i64 = tx
            .query_row(
                "SELECT client_id FROM quotations WHERE id = ?1",
                [quote_id],
                |row| row.get(0),
            )
            .unwrap();

        delete_quotation_core(&tx, quote_id).unwrap();

        assert_eq!(count(&tx, "quotations"), 0);
        assert_eq!(count(&tx, "quotation_services"), 0);
        assert_eq!(count(&tx, "payments"), 0);

        // The client is NOT deleted automatically.
        assert_eq!(count(&tx, "clients"), 1);

        let client_count: i64 = tx
            .query_row(
                "SELECT COUNT(*) FROM clients WHERE id = ?1",
                [client_id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(client_count, 1);

        tx.rollback().unwrap();
    }

    #[test]
    fn delete_keeps_client_with_remaining_quotation() {
        // TEST 2: client has two quotations; deleting one keeps the client and
        // the remaining quotation, and only removes that quotation's dependents.
        let mut conn = crate::test_support::test_connection();
        let tx = conn.transaction().unwrap();

        tx.execute("INSERT INTO clients (name) VALUES ('Client A')", [])
            .unwrap();

        let client_id = tx.last_insert_rowid();

        let first = seed_quotation_for_client(&tx, client_id, "QT-D2A");
        add_service(&tx, first, "Photography");
        add_payment(&tx, first, 300.0);
        add_payment(&tx, first, 500.0);

        let second = seed_quotation_for_client(&tx, client_id, "QT-D2B");
        add_service(&tx, second, "Video");
        add_payment(&tx, second, 200.0);

        delete_quotation_core(&tx, first).unwrap();

        // Deleted quotation's dependents are gone.
        assert_eq!(count(&tx, "quotation_services"), 1);
        assert_eq!(count(&tx, "payments"), 1);

        let remaining_services: i64 = tx
            .query_row(
                "SELECT COUNT(*) FROM quotation_services WHERE quotation_id = ?1",
                [second],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(remaining_services, 1);

        let remaining_payments: i64 = tx
            .query_row(
                "SELECT COUNT(*) FROM payments WHERE quotation_id = ?1",
                [second],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(remaining_payments, 1);

        // Client survives with the remaining quotation.
        assert_eq!(count(&tx, "clients"), 1);

        let client_count: i64 = tx
            .query_row(
                "SELECT COUNT(*) FROM clients WHERE id = ?1",
                [client_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(client_count, 1);

        let remaining_quotes: i64 = tx
            .query_row(
                "SELECT COUNT(*) FROM quotations WHERE client_id = ?1",
                [client_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(remaining_quotes, 1);

        tx.rollback().unwrap();
    }

    #[test]
    fn delete_without_payments_still_keeps_client() {
        // TEST 3: deletion with no payments still keeps the client record.
        let mut conn = crate::test_support::test_connection();
        let tx = conn.transaction().unwrap();

        let quote_id = seed_quotation(&tx, "QT-D3", "Client A");
        add_service(&tx, quote_id, "Photography");

        delete_quotation_core(&tx, quote_id).unwrap();

        assert_eq!(count(&tx, "quotations"), 0);
        assert_eq!(count(&tx, "quotation_services"), 0);
        assert_eq!(count(&tx, "payments"), 0);
        assert_eq!(count(&tx, "clients"), 1);

        tx.rollback().unwrap();
    }

    #[test]
    fn delete_missing_quotation_returns_error_without_touching_data() {
        let mut conn = crate::test_support::test_connection();
        let tx = conn.transaction().unwrap();

        assert_eq!(
            delete_quotation_core(&tx, 999_999).unwrap_err(),
            "Quotation not found."
        );

        assert_eq!(count(&tx, "clients"), 0);
        assert_eq!(count(&tx, "quotations"), 0);
        assert_eq!(count(&tx, "payments"), 0);
        assert_eq!(count(&tx, "quotation_services"), 0);

        tx.rollback().unwrap();
    }

    #[test]
    fn failed_deletion_rolls_back_no_partial_data() {
        // TEST 5: a failure inside the deletion transaction must roll back all
        // in-flight changes so no partial deletion is ever persisted.
        let mut conn = crate::test_support::test_connection();

        // Pre-existing, committed data.
        let quote_id = {
            let commit_tx = conn.transaction().unwrap();
            let quote_id = seed_quotation(&commit_tx, "QT-D5", "Client A");
            add_service(&commit_tx, quote_id, "Photography");
            add_payment(&commit_tx, quote_id, 500.0);
            commit_tx.commit().unwrap();
            quote_id
        };

        // A second transaction that fails mid-deletion.
        {
            let tx = conn.transaction().unwrap();

            // Simulate work that succeeds but must be rolled back when the
            // overall deletion transaction fails.
            tx.execute("DELETE FROM payments WHERE quotation_id = ?1", [quote_id])
                .unwrap();

            // Failure after the partial delete: non-existent quotation.
            assert_eq!(
                delete_quotation_core(&tx, 999_999).unwrap_err(),
                "Quotation not found."
            );

            // Drop the transaction WITHOUT committing -> implicit rollback.
        }

        // Nothing may have been lost or partially deleted.
        assert_eq!(count(&conn, "clients"), 1);
        assert_eq!(count(&conn, "quotations"), 1);
        assert_eq!(count(&conn, "quotation_services"), 1);
        assert_eq!(count(&conn, "payments"), 1);
    }

    #[test]
    fn workflow_status_validation() {
        assert!(is_valid_workflow_status("Draft"));
        assert!(is_valid_workflow_status("Sent"));
        assert!(is_valid_workflow_status("Confirmed"));
        assert!(is_valid_workflow_status("Completed"));
        assert!(is_valid_workflow_status("Cancelled"));

        assert!(!is_valid_workflow_status("Delivered"));
        assert!(!is_valid_workflow_status(""));
    }

    #[test]
    fn validate_rejects_invalid_quotations() {
        let mut q = quotation();

        q.client.name = "   ".to_string();
        assert!(validate_quotation(&q).is_err());

        q.client.name = "Client".to_string();
        q.services.clear();
        assert!(validate_quotation(&q).is_err());

        q.services.push(ServiceItem {
            id: None,
            service_name: "Photography".to_string(),
            quantity: 0,
            price: 100.0,
            total: 0.0,
            status: "Pending".to_string(),
        });
        assert!(validate_quotation(&q).is_err());

        q.services[0].quantity = 1;
        q.discount = 999_999.0;
        assert!(validate_quotation(&q).is_err());

        q.discount = 100.0;
        q.advance_amount = 1_000_000.0;
        assert!(validate_quotation(&q).is_err());

        q.advance_amount = 10.0;
        assert!(validate_quotation(&q).is_ok());
    }

    #[test]
    fn save_assigns_sequential_number_and_records_advance() {
        let mut conn = crate::test_support::test_connection();
        let tx = conn.transaction().unwrap();

        let first = quotation();
        let first_number = save_quotation_core(&tx, first.clone()).unwrap();
        let first_id = quotation_id_by_number(&tx, &first_number);
        assert_eq!(first_number, "QT-000001");

        let mut second = quotation();
        second.client.name = "Second Client".to_string();
        let second_number = save_quotation_core(&tx, second).unwrap();

        assert_eq!(second_number, "QT-000002");

        // The advance (10,000) must exist as a payment row and reduce balance.
        let advance: f64 = tx
            .query_row(
                "SELECT amount FROM payments WHERE quotation_id = ?1",
                [first_id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(advance, 10_000.0);

        let balance: f64 = tx
            .query_row(
                "SELECT balance FROM quotations WHERE id = ?1",
                [first_id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(balance, 60_000.0);

        tx.rollback().unwrap();
    }

    #[test]
    fn save_persists_new_columns() {
        let mut conn = crate::test_support::test_connection();
        let tx = conn.transaction().unwrap();

        let q = quotation();
        save_quotation_core(&tx, q.clone()).unwrap();

        let (date, event_notes, status): (String, String, String) = tx
            .query_row(
                "SELECT quotation_date, event_notes, status FROM quotations",
                [],
                |row| {
                    Ok((
                        row.get(0).unwrap(),
                        row.get(1).unwrap(),
                        row.get(2).unwrap(),
                    ))
                },
            )
            .unwrap();

        assert_eq!(date, "2026-12-25");
        assert_eq!(event_notes, "Outdoor ceremony");
        assert_eq!(status, "Draft");

        tx.rollback().unwrap();
    }

    #[test]
    fn update_preserves_service_statuses_and_never_changes_number() {
        let mut conn = crate::test_support::test_connection();
        let tx = conn.transaction().unwrap();

        let q = quotation();
        let number = save_quotation_core(&tx, q.clone()).unwrap();
        let quotation_id = quotation_id_by_number(&tx, &number);

        // Mark the existing service as delivered.
        tx.execute(
            "UPDATE quotation_services SET status = 'Completed' WHERE quotation_id = ?1",
            [quotation_id],
        )
        .unwrap();

        let mut updated = quotation();
        updated.id = Some(quotation_id);
        updated.quotation_number = "QT-HACKED".to_string();
        updated.quotation_date = "1999-01-01".to_string();
        updated.total = 80_000.0;

        update_quotation_core(&tx, updated).unwrap();

        let (stored_number, stored_date): (String, String) = tx
            .query_row(
                "SELECT quotation_number, quotation_date FROM quotations WHERE id = ?1",
                [quotation_id],
                |row| row.get(0).and_then(|v| Ok((v, row.get(1)?))),
            )
            .unwrap();

        assert_eq!(stored_number, number);
        assert_eq!(stored_date, "2026-12-25");

        // Service status survived the re-insert.
        let status: String = tx
            .query_row(
                "SELECT status FROM quotation_services WHERE quotation_id = ?1",
                [quotation_id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(status, "Completed");

        // Balance is still derived from the advance payment.
        let balance: f64 = tx
            .query_row(
                "SELECT balance FROM quotations WHERE id = ?1",
                [quotation_id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(balance, 70_000.0);

        tx.rollback().unwrap();
    }
}