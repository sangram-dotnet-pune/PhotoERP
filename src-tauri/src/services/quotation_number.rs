use rusqlite::{params, Connection};

/// Generate the next sequential quotation number (e.g. `QT-000012`).
///
/// The sequence is stored in the `quotation_sequence` table and seeded from
/// the highest existing quotation id on first run, so numbers survive
/// restarts, backups and restores without collisions. The caller should hold
/// the write transaction so the increment is atomic with the insert.
pub fn next_quotation_number(conn: &Connection) -> Result<String, String> {
    conn.execute(
        "INSERT OR IGNORE INTO quotation_sequence (id, last_number)
         SELECT 1, COALESCE((SELECT MAX(id) FROM quotations), 0)",
        [],
    )
    .map_err(|e| format!("Failed to initialise quotation sequence: {e}"))?;

    let next: i64 = conn
        .query_row(
            "SELECT last_number + 1 FROM quotation_sequence WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to read quotation sequence: {e}"))?;

    conn.execute(
        "UPDATE quotation_sequence SET last_number = ?1 WHERE id = 1",
        params![next],
    )
    .map_err(|e| format!("Failed to advance quotation sequence: {e}"))?;

    Ok(format!("QT-{next:06}"))
}

/// Guard so the same number can never be reused by the numbering logic.
pub fn quotation_number_exists(conn: &Connection, number: &str) -> Result<bool, String> {
    conn.query_row(
        "SELECT COUNT(*) FROM quotations WHERE quotation_number = ?1",
        [number],
        |row| row.get::<_, i64>(0),
    )
    .map(|count| count > 0)
    .map_err(|e| format!("Failed to check quotation number: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sequential_numbers_increment_and_never_collide() {
        let conn = crate::test_support::test_connection();

        assert_eq!(next_quotation_number(&conn).unwrap(), "QT-000001");
        assert_eq!(next_quotation_number(&conn).unwrap(), "QT-000002");
        assert_eq!(next_quotation_number(&conn).unwrap(), "QT-000003");
    }

    #[test]
    fn sequence_seeds_from_existing_quotations() {
        // Build a raw legacy schema WITHOUT quotation_sequence so the
        // migration-time seeding path actually runs.
        let conn = Connection::open_in_memory().unwrap();

        conn.execute_batch(
            "
            CREATE TABLE clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT, email TEXT, address TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE quotations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quotation_number TEXT NOT NULL UNIQUE,
                client_id INTEGER NOT NULL,
                event_type TEXT, event_date TEXT, event_time TEXT,
                venue TEXT, city TEXT,
                subtotal REAL NOT NULL, discount REAL NOT NULL,
                advance_amount REAL NOT NULL, total REAL NOT NULL,
                balance REAL NOT NULL, notes TEXT,
                status TEXT DEFAULT 'Draft',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE quotation_services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quotation_id INTEGER NOT NULL,
                service_name TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                total REAL NOT NULL
            );

            CREATE TABLE payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quotation_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                payment_date TEXT NOT NULL,
                payment_method TEXT,
                notes TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            INSERT INTO clients (name) VALUES ('Client');
            INSERT INTO quotations
                (quotation_number, client_id, subtotal, discount, advance_amount, total, balance, notes, status)
            VALUES ('QT-OLD-1', 1, 0, 0, 0, 0, 0, '', 'Draft');
            ",
        )
        .unwrap();

        // Running migrations seeds the sequence from MAX(quotations.id) = 1.
        crate::database::migrations::run(&conn).unwrap();

        assert_eq!(next_quotation_number(&conn).unwrap(), "QT-000002");
    }

    #[test]
    fn existence_guard_detects_taken_numbers() {
        let conn = crate::test_support::test_connection();

        assert!(!quotation_number_exists(&conn, "QT-000005").unwrap());

        conn.execute("INSERT INTO clients (name) VALUES ('Client')", [])
            .unwrap();

        let client_id = conn.last_insert_rowid();

        conn.execute(
            "INSERT INTO quotations
             (quotation_number, client_id, subtotal, discount, advance_amount, total, balance, notes, status)
             VALUES ('QT-000005', ?1, 0, 0, 0, 0, 0, '', 'Draft')",
            [client_id],
        )
        .unwrap();

        assert!(quotation_number_exists(&conn, "QT-000005").unwrap());
    }
}