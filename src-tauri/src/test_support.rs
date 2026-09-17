#[cfg(test)]
pub fn test_connection() -> rusqlite::Connection {
    let conn = rusqlite::Connection::open_in_memory()
        .expect("failed to open in-memory database");

    crate::database::connection::configure_connection(&conn)
        .expect("failed to configure test connection");

    crate::database::migrations::run(&conn)
        .expect("failed to run migrations on test connection");

    conn
}

#[cfg(test)]
pub fn sample_quotation() -> crate::models::quotation::Quotation {
    use crate::models::quotation::{Quotation, ServiceItem};

    Quotation {
        id: None,
        quotation_number: String::new(),
        quotation_date: "2026-12-25".to_string(),
        client_id: None,
        client: crate::models::client::Client {
            name: "Test Client".to_string(),
            phone: "1234567890".to_string(),
            email: "client@example.com".to_string(),
            address: "Test Address".to_string(),
        },
        event_type: "Wedding".to_string(),
        event_date: "2026-12-25".to_string(),
        event_time: "11:00".to_string(),
        venue: "Venue".to_string(),
        city: "Pune".to_string(),
        event_notes: "Outdoor ceremony".to_string(),
        subtotal: 75_000.0,
        discount: 5_000.0,
        advance_amount: 10_000.0,
        total: 70_000.0,
        balance: 60_000.0,
        notes: "Inclusions as discussed".to_string(),
        status: "Draft".to_string(),
        services: vec![ServiceItem {
            id: None,
            service_name: "Photography".to_string(),
            quantity: 1,
            price: 50_000.0,
            total: 50_000.0,
            status: "Pending".to_string(),
        }],
    }
}