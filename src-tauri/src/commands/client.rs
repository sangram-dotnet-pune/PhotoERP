use rusqlite::params;
use tauri::AppHandle;

use crate::{
    database::connection,
    models::client_details::{
        ClientDetails,
        ClientEvent,
        ClientEventService,
        ClientFinancialSummary,
        ClientInfo,
        ClientListItem,
    },
    services::payment as payment_service,
};

fn overall_status_for_services(services: &[ClientEventService]) -> String {
    if services.is_empty() {
        return "Pending".to_string();
    }

    if services.iter().all(|s| s.status == "Completed") {
        "Completed".to_string()
    } else {
        "Pending".to_string()
    }
}

#[tauri::command]
pub fn get_clients(app: AppHandle) -> Result<Vec<ClientListItem>, String> {
    let conn = connection::get_connection(&app)?;

    let mut stmt = conn
        .prepare(
            "
            SELECT
                clients.id,
                clients.name,
                IFNULL(clients.phone, ''),
                IFNULL(clients.email, ''),
                (
                    SELECT COUNT(*)
                    FROM quotations
                    WHERE quotations.client_id = clients.id
                ) AS event_count
            FROM clients
            ORDER BY clients.name COLLATE NOCASE ASC
            ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(ClientListItem {
                id: row.get(0)?,
                name: row.get(1)?,
                phone: row.get(2)?,
                email: row.get(3)?,
                event_count: row.get(4)?,
                overall_status: "Pending".to_string(),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut clients = Vec::new();

    for row in rows {
        let mut client = row.map_err(|e| e.to_string())?;

        client.overall_status = get_client_overall_status(&conn, client.id);

        clients.push(client);
    }

    Ok(clients)
}

fn get_client_overall_status(conn: &rusqlite::Connection, client_id: i64) -> String {
    let query = "
        SELECT COUNT(*)
        FROM quotation_services
        WHERE quotation_id IN (
            SELECT id FROM quotations WHERE client_id = ?1
        )
        AND status <> 'Completed'
    ";

    let pending: i64 = conn
        .query_row(query, [client_id], |row| row.get(0))
        .unwrap_or(0);

    if pending == 0 {
        "Completed".to_string()
    } else {
        "Pending".to_string()
    }
}

fn build_client_details(
    conn: &rusqlite::Connection,
    id: i64,
) -> Result<ClientDetails, String> {
    // ---------------------------
    // Load client
    // ---------------------------

    let client = conn
        .query_row(
            "
            SELECT id, name, IFNULL(phone,''), IFNULL(email,''), IFNULL(address,'')
            FROM clients
            WHERE id = ?1
            ",
            [id],
            |row| {
                Ok(ClientInfo {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    phone: row.get(2)?,
                    email: row.get(3)?,
                    address: row.get(4)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    // ---------------------------
    // Load quotations (events) for this client
    // ---------------------------

    let mut stmt = conn
        .prepare(
            "
            SELECT
                id,
                quotation_number,
                IFNULL(event_type, ''),
                IFNULL(event_date, ''),
                IFNULL(event_time, ''),
                IFNULL(venue, ''),
                IFNULL(city, '')
            FROM quotations
            WHERE client_id = ?1
            ORDER BY id DESC
            ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([id], |row| {
            Ok(ClientEvent {
                quotation_id: row.get(0)?,
                quotation_number: row.get(1)?,
                event_type: row.get(2)?,
                event_date: row.get(3)?,
                event_time: row.get(4)?,
                venue: row.get(5)?,
                city: row.get(6)?,
                total: 0.0,
                paid: 0.0,
                pending: 0.0,
                payment_status: "Pending".to_string(),
                services: Vec::new(),
                overall_status: "Pending".to_string(),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut events = Vec::new();

    let mut client_total_business = 0.0;
    let mut client_amount_paid = 0.0;
    let mut client_pending_amount = 0.0;

    for row in rows {
        let mut event = row.map_err(|e| e.to_string())?;

        // ---------------------------
        // Financial info derived live from payments
        // ---------------------------

        let (total, paid, pending, payment_status) =
            payment_service::quotation_financial(&conn, event.quotation_id)?;

        event.total = total;
        event.paid = paid;
        event.pending = pending;
        event.payment_status = payment_status;

        client_total_business += total;
        client_amount_paid += paid;
        client_pending_amount += pending;

        // ---------------------------
        // Load services for the event
        // ---------------------------

        let mut service_stmt = conn
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

        let service_rows = service_stmt
            .query_map([event.quotation_id], |row| {
                Ok(ClientEventService {
                    id: row.get(0)?,
                    service_name: row.get(1)?,
                    quantity: row.get(2)?,
                    price: row.get(3)?,
                    total: row.get(4)?,
                    status: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut services = Vec::new();

        for service in service_rows {
            services.push(service.map_err(|e| e.to_string())?);
        }

        event.services = services;
        event.overall_status = overall_status_for_services(&event.services);

        events.push(event);
    }

    let overall_status = {
        let all_completed = !events.is_empty()
            && events.iter().all(|e| e.overall_status == "Completed");

        if all_completed {
            "Completed".to_string()
        } else {
            "Pending".to_string()
        }
    };

    let financial = ClientFinancialSummary {
        total_business: client_total_business,
        amount_paid: client_amount_paid,
        pending_amount: if client_pending_amount < 0.0 {
            0.0
        } else {
            client_pending_amount
        },
        payment_status: payment_service::payment_status_calc(
            client_total_business,
            client_amount_paid,
        ),
    };

    Ok(ClientDetails {
        client,
        events,
        overall_status,
        financial,
    })
}

#[tauri::command]
pub fn get_client_details(id: i64, app: AppHandle) -> Result<ClientDetails, String> {
    let conn = connection::get_connection(&app)?;

    build_client_details(&conn, id)
}

/// Searches clients by name, phone or email. Returns full client info so the
/// UI can populate the quotation's client fields when one is selected.
fn search_clients_core(
    conn: &rusqlite::Connection,
    query: &str,
) -> Result<Vec<ClientInfo>, String> {
    let query = query.trim();

    let sql = "
        SELECT
            clients.id,
            clients.name,
            IFNULL(clients.phone, ''),
            IFNULL(clients.email, ''),
            IFNULL(clients.address, '')
        FROM clients
        WHERE ?1 <> ''
          AND (
                clients.name LIKE '%' || ?1 || '%' COLLATE NOCASE
             OR IFNULL(clients.phone, '') LIKE '%' || ?1 || '%'
             OR IFNULL(clients.email, '') LIKE '%' || ?1 || '%'
          )
        ORDER BY clients.name COLLATE NOCASE ASC
    ";

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([query], |row| {
            Ok(ClientInfo {
                id: row.get(0)?,
                name: row.get(1)?,
                phone: row.get(2)?,
                email: row.get(3)?,
                address: row.get(4)?,
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
pub fn search_clients(app: AppHandle, query: String) -> Result<Vec<ClientInfo>, String> {
    let conn = connection::get_connection(&app)?;

    search_clients_core(&conn, &query)
}

/// Locates an existing client that matches the supplied contact details, used
/// to prevent duplicate clients. Phone is the primary match, email the
/// secondary one. Returns `None` when no client matches either.
fn find_client_by_contact_core(
    conn: &rusqlite::Connection,
    phone: &str,
    email: &str,
) -> Result<Option<ClientInfo>, String> {
    let sql = "
        SELECT id, name, IFNULL(phone, ''), IFNULL(email, ''), IFNULL(address, '')
        FROM clients
        WHERE ?1 <> '' AND phone = ?1
        LIMIT 1
    ";

    let by_phone: Result<Option<ClientInfo>, rusqlite::Error> = conn
        .query_row(sql, [phone], |row| {
            Ok(ClientInfo {
                id: row.get(0)?,
                name: row.get(1)?,
                phone: row.get(2)?,
                email: row.get(3)?,
                address: row.get(4)?,
            })
        })
        .map(Some);

    if let Ok(Some(client)) = by_phone {
        return Ok(Some(client));
    }

    let sql = "
        SELECT id, name, IFNULL(phone, ''), IFNULL(email, ''), IFNULL(address, '')
        FROM clients
        WHERE ?1 <> '' AND email = ?1
        LIMIT 1
    ";

    let by_email = conn
        .query_row(sql, [email], |row| {
            Ok(ClientInfo {
                id: row.get(0)?,
                name: row.get(1)?,
                phone: row.get(2)?,
                email: row.get(3)?,
                address: row.get(4)?,
            })
        })
        .map(Some);

    match by_email {
        Ok(Some(client)) => Ok(Some(client)),
        _ => Ok(None),
    }
}

#[tauri::command]
pub fn find_client_by_contact(
    app: AppHandle,
    phone: String,
    email: String,
) -> Result<Option<ClientInfo>, String> {
    let conn = connection::get_connection(&app)?;

    find_client_by_contact_core(&conn, &phone, &email)
}

#[tauri::command]
pub fn update_client(
    app: AppHandle,
    client: ClientInfo,
) -> Result<(), String> {
    if client.name.trim().is_empty() {
        return Err("Client name is required.".to_string());
    }

    let conn = connection::get_connection(&app)?;

    let updated = conn
        .execute(
            "
            UPDATE clients
            SET name = ?1,
                phone = ?2,
                email = ?3,
                address = ?4,
                updated_at = datetime('now')
            WHERE id = ?5
            ",
            params![client.name, client.phone, client.email, client.address, client.id],
        )
        .map_err(|e| format!("Failed to update client: {e}"))?;

    if updated == 0 {
        return Err("Client not found.".to_string());
    }

    Ok(())
}

fn delete_client_core(conn: &rusqlite::Connection, id: i64) -> Result<(), String> {
    let event_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM quotations WHERE client_id = ?1",
            [id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if event_count > 0 {
        return Err(
            "This client has quotation history and cannot be deleted.".to_string(),
        );
    }

    let deleted = conn
        .execute("DELETE FROM clients WHERE id = ?1", [id])
        .map_err(|e| format!("Failed to delete client: {e}"))?;

    if deleted == 0 {
        return Err("Client not found.".to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn delete_client(app: AppHandle, id: i64) -> Result<(), String> {
    let conn = connection::get_connection(&app)?;

    delete_client_core(&conn, id)
}

#[tauri::command]
pub fn update_service_status(
    service_id: i64,
    status: String,
    app: AppHandle,
) -> Result<(), String> {
    let conn = connection::get_connection(&app)?;

    if status != "Completed" && status != "Pending" {
        return Err("Invalid status. Must be 'Completed' or 'Pending'.".to_string());
    }

    let updated = conn
        .execute(
            "
            UPDATE quotation_services
            SET status = ?1
            WHERE id = ?2
            ",
            params![status, service_id],
        )
        .map_err(|e| format!("Failed to update service status: {e}"))?;

    if updated == 0 {
        return Err("Service not found.".to_string());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn insert_client(
        conn: &rusqlite::Connection,
        name: &str,
        phone: &str,
        email: &str,
    ) -> i64 {
        conn.execute(
            "INSERT INTO clients (name, phone, email) VALUES (?1, ?2, ?3)",
            params![name, phone, email],
        )
        .unwrap();

        conn.last_insert_rowid()
    }

    #[test]
    fn zero_quotation_client_has_valid_details() {
        // TEST 3: a client with no quotations is valid and opens normally.
        let conn = crate::test_support::test_connection();

        let client_id = insert_client(&conn, "No Events", "111", "none@example.com");

        let details = build_client_details(&conn, client_id).unwrap();

        assert_eq!(details.client.id, client_id);
        assert_eq!(details.events.len(), 0);
        assert_eq!(details.overall_status, "Pending");
        assert_eq!(details.financial.total_business, 0.0);
        assert_eq!(details.financial.amount_paid, 0.0);
        assert_eq!(details.financial.pending_amount, 0.0);
    }

    #[test]
    fn search_clients_finds_by_name() {
        // TEST 5: search by (partial) name.
        let conn = crate::test_support::test_connection();

        insert_client(&conn, "Alice Johnson", "1001", "alice@example.com");
        insert_client(&conn, "Bob Smith", "1002", "bob@example.com");

        let results = search_clients_core(&conn, "alice Jo").unwrap();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].name, "Alice Johnson");
        assert_eq!(results[0].id, 1);

        let none = search_clients_core(&conn, "missing").unwrap();
        assert!(none.is_empty());
    }

    #[test]
    fn search_clients_finds_by_phone_and_email() {
        // TEST 5 & TEST 6: search also matches phone and email.
        let conn = crate::test_support::test_connection();

        insert_client(&conn, "Alice Johnson", "9876543210", "alice@example.com");
        insert_client(&conn, "Bob Smith", "1002", "bob@example.com");

        let by_phone = search_clients_core(&conn, "987654").unwrap();
        assert_eq!(by_phone.len(), 1);
        assert_eq!(by_phone[0].name, "Alice Johnson");

        let by_email = search_clients_core(&conn, "bob@example").unwrap();
        assert_eq!(by_email.len(), 1);
        assert_eq!(by_email[0].name, "Bob Smith");
    }

    #[test]
    fn find_client_by_contact_uses_phone_then_email() {
        // TEST 8: phone is the primary duplicate check; email is secondary.
        let conn = crate::test_support::test_connection();

        insert_client(&conn, "Alice Johnson", "9998887776", "alice@example.com");
        insert_client(&conn, "Bob Smith", "1002", "bob@example.com");

        let by_phone = find_client_by_contact_core(&conn, "9998887776", "different@email.com")
            .unwrap();
        assert_eq!(by_phone.unwrap().name, "Alice Johnson");

        let by_email = find_client_by_contact_core(&conn, "", "bob@example.com").unwrap();
        assert_eq!(by_email.unwrap().name, "Bob Smith");

        let none = find_client_by_contact_core(&conn, "", "").unwrap();
        assert!(none.is_none());

        let none = find_client_by_contact_core(&conn, "0000000000", "nobody@example.com").unwrap();
        assert!(none.is_none());
    }

    #[test]
    fn save_quotation_with_existing_client_id_does_not_duplicate_client() {
        // TEST 4 & TEST 7: when the existing client is reused (via client_id)
        // no duplicate client row is created.
        let mut conn = crate::test_support::test_connection();
        let tx = conn.transaction().unwrap();

        let client_id = insert_client(&tx, "Reuse Me", "7770001111", "reuse@example.com");

        let mut quotation = crate::test_support::sample_quotation();
        quotation.client_id = Some(client_id);
        quotation.client.name = "Reuse Me".to_string();

        crate::commands::quotation::save_quotation_core(&tx, quotation).unwrap();

        let client_count: i64 = tx
            .query_row("SELECT COUNT(*) FROM clients", [], |row| row.get(0))
            .unwrap();
        assert_eq!(client_count, 1);

        let linked_id: i64 = tx
            .query_row(
                "SELECT client_id FROM quotations LIMIT 1",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(linked_id, client_id);

        tx.rollback().unwrap();
    }

    #[test]
    fn delete_client_blocked_when_client_has_quotations() {
        // TEST 10: explicit deletion is refused for a client with history.
        let mut conn = crate::test_support::test_connection();
        let tx = conn.transaction().unwrap();

        let client_id = insert_client(&tx, "Has History", "555", "history@example.com");

        tx.execute(
            "
            INSERT INTO quotations
            (quotation_number, client_id, event_type, event_date, subtotal, discount, advance_amount, total, balance, status)
            VALUES ('QT-X1', ?1, 'Wedding', '2026-01-01', 10000.0, 0.0, 0.0, 10000.0, 10000.0, 'Draft')
            ",
            [client_id],
        )
        .unwrap();

        assert_eq!(
            delete_client_core(&tx, client_id).unwrap_err(),
            "This client has quotation history and cannot be deleted."
        );

        let remaining: i64 = tx
            .query_row("SELECT COUNT(*) FROM clients", [], |row| row.get(0))
            .unwrap();
        assert_eq!(remaining, 1);

        tx.rollback().unwrap();
    }

    #[test]
    fn delete_client_allowed_for_zero_quotation_client() {
        // TEST 9: explicit deletion is allowed for a client without history.
        let mut conn = crate::test_support::test_connection();
        let tx = conn.transaction().unwrap();

        let client_id = insert_client(&tx, "No History", "556", "newone@example.com");

        delete_client_core(&tx, client_id).unwrap();

        let remaining: i64 = tx
            .query_row("SELECT COUNT(*) FROM clients", [], |row| row.get(0))
            .unwrap();
        assert_eq!(remaining, 0);

        tx.rollback().unwrap();
    }
}