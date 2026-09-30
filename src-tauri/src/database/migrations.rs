use rusqlite::Connection;

fn column_exists(conn: &Connection, table: &str, column: &str) -> Result<bool, String> {
    conn.prepare(&format!(
        "SELECT COUNT(*) FROM pragma_table_info('{}') WHERE name = ?1",
        table
    ))
    .and_then(|mut stmt| {
        stmt.query_row([column], |row| row.get::<_, i64>(0))
    })
    .map(|count| count > 0)
    .map_err(|e| format!("Failed to inspect {table}.{column}: {e}"))
}

fn table_exists(conn: &Connection, table: &str) -> Result<bool, String> {
    conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
        [table],
        |row| row.get::<_, i64>(0),
    )
    .map(|count| count > 0)
    .map_err(|e| format!("Failed to inspect table {table}: {e}"))
}

pub fn run(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS quotations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quotation_number TEXT NOT NULL UNIQUE,

            client_id INTEGER NOT NULL,

            event_type TEXT,
            event_date TEXT,
            event_time TEXT,

            venue TEXT,
            city TEXT,

            subtotal REAL NOT NULL,
            discount REAL NOT NULL,
            advance_amount REAL NOT NULL,
            total REAL NOT NULL,
            balance REAL NOT NULL,

            notes TEXT,
            status TEXT DEFAULT 'Draft',

            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY(client_id)
            REFERENCES clients(id)
        );

        CREATE TABLE IF NOT EXISTS quotation_services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            quotation_id INTEGER NOT NULL,

            service_name TEXT NOT NULL,

            quantity INTEGER NOT NULL,

            price REAL NOT NULL,

            total REAL NOT NULL,

            FOREIGN KEY(quotation_id)
            REFERENCES quotations(id)
        );

        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            quotation_id INTEGER NOT NULL,

            amount REAL NOT NULL,

            payment_date TEXT NOT NULL,

            payment_method TEXT,

            notes TEXT,

            created_at TEXT DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY(quotation_id)
            REFERENCES quotations(id)
            ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS migration_meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS quotation_sequence (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            last_number INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quotation_id INTEGER,
            expense_date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            category TEXT NOT NULL DEFAULT 'Other',
            description TEXT NOT NULL DEFAULT '',
            amount REAL NOT NULL DEFAULT 0,
            payment_method TEXT NOT NULL DEFAULT '',
            vendor TEXT NOT NULL DEFAULT '',
            notes TEXT NOT NULL DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(quotation_id)
            REFERENCES quotations(id)
            ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS service_catalog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS packages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS package_services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            package_id INTEGER NOT NULL,
            service_name TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            price REAL NOT NULL DEFAULT 0,
            FOREIGN KEY(package_id)
            REFERENCES packages(id)
            ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_quotations_client_id
            ON quotations (client_id);

        CREATE INDEX IF NOT EXISTS idx_quotation_services_quotation_id
            ON quotation_services (quotation_id);

        CREATE INDEX IF NOT EXISTS idx_payments_quotation_id
            ON payments (quotation_id);

        CREATE INDEX IF NOT EXISTS idx_package_services_package_id
            ON package_services (package_id);
        ",
    )
    .map_err(|e| format!("Failed to run migrations: {e}"))?;

    // ---------------------------
    // Upgrade legacy expenses (expense_type/note) to the order-aware schema.
    // Keeps existing data: legacy category maps to `category`, legacy note maps
    // to `description`; general expenses get quotation_id = NULL.
    // ---------------------------

    if table_exists(conn, "expenses")? && !column_exists(conn, "expenses", "category")? {
        conn.execute_batch(
            "
            ALTER TABLE expenses ADD COLUMN quotation_id INTEGER;
            ALTER TABLE expenses ADD COLUMN category TEXT NOT NULL DEFAULT 'Other';
            ALTER TABLE expenses ADD COLUMN description TEXT NOT NULL DEFAULT '';
            ALTER TABLE expenses ADD COLUMN payment_method TEXT NOT NULL DEFAULT '';
            ALTER TABLE expenses ADD COLUMN vendor TEXT NOT NULL DEFAULT '';
            ALTER TABLE expenses ADD COLUMN notes TEXT NOT NULL DEFAULT '';
            ",
        )
        .map_err(|e| format!("Failed to upgrade expenses table: {e}"))?;

        // Backfill legacy columns onto the new ones. This only runs in the
        // same migration pass that just added the columns, so every row still
        // holds the fresh defaults ('Other' / '') and backs up safely.
        conn.execute_batch(
            "
            UPDATE expenses
            SET category = IFNULL(expense_type, 'Other'),
                description = IFNULL(note, '');
            ",
        )
        .map_err(|e| format!("Failed to backfill legacy expenses: {e}"))?;
    }

    // Index order expenses by quotation. Created here (not in the batch) so
    // existing databases get it after their legacy upgrade adds the column.
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_expenses_quotation_id
         ON expenses (quotation_id)",
        [],
    )
    .map_err(|e| format!("Failed to index expenses.quotation_id: {e}"))?;

    // ---------------------------
    // Safe additive migration:
    // Add service delivery status to quotation_services if missing.
    // Does NOT destroy existing data.
    // ---------------------------

    if !column_exists(conn, "quotation_services", "status")? {
        conn.execute_batch(
            "
            ALTER TABLE quotation_services
            ADD COLUMN status TEXT NOT NULL DEFAULT 'Pending';
            ",
        )
        .map_err(|e| format!("Failed to add status column to quotation_services: {e}"))?;
    }

    // ---------------------------
    // Add quotation_date (creation date) to quotations if missing.
    // Backfill: prefer event_date, then created_at, then today so that
    // existing records get a sensible creation date.
    // ---------------------------

    if !column_exists(conn, "quotations", "quotation_date")? {
        conn.execute_batch(
            "
            ALTER TABLE quotations
            ADD COLUMN quotation_date TEXT;
            ",
        )
        .map_err(|e| format!("Failed to add quotation_date column: {e}"))?;

        conn.execute_batch(
            "
            UPDATE quotations
            SET quotation_date =
                COALESCE(
                    NULLIF(event_date, ''),
                    substr(created_at, 1, 10),
                    date('now')
                )
            WHERE quotation_date IS NULL OR quotation_date = '';
            ",
        )
        .map_err(|e| format!("Failed to backfill quotation_date: {e}"))?;
    }

    // ---------------------------
    // Add event_notes (free text about the event) if missing.
    // ---------------------------

    if !column_exists(conn, "quotations", "event_notes")? {
        conn.execute_batch(
            "
            ALTER TABLE quotations
            ADD COLUMN event_notes TEXT NOT NULL DEFAULT '';
            ",
        )
        .map_err(|e| format!("Failed to add event_notes column: {e}"))?;
    }

    // ---------------------------
    // Seed existing advance amounts into the payments table once.
    // Markers prevent duplication across application restarts.
    // ---------------------------

    if table_exists(conn, "payments")? && !table_exists(conn, "migration_meta")? {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS migration_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );",
        )
        .map_err(|e| format!("Failed to create migration_meta table: {e}"))?;
    }

    let seeded_advance: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM migration_meta WHERE key = 'advance_payments_seeded'",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map(|count| count > 0)
        .map_err(|e| format!("Failed to read migration markers: {e}"))?;

    if !seeded_advance {
        conn.execute_batch(
            "
            INSERT INTO payments (quotation_id, amount, payment_date, payment_method, notes)
            SELECT
                id,
                advance_amount,
                COALESCE(NULLIF(event_date, ''), date('now')),
                'Advance',
                'Initial advance payment'
            FROM quotations
            WHERE advance_amount > 0;
            ",
        )
        .map_err(|e| format!("Failed to seed advance payments: {e}"))?;

        conn.execute_batch(
            "
            INSERT INTO migration_meta (key, value)
            VALUES ('advance_payments_seeded', '1');
            ",
        )
        .map_err(|e| format!("Failed to mark advance payments as seeded: {e}"))?;
    }

    // ---------------------------
    // Seed the quotation sequence from the highest existing quotation id so
    // that new sequential numbers never collide with existing rows.
    // Flagging with the year/marker guards against re-seeding.
    // ---------------------------

    let sequence_seeded: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM quotation_sequence WHERE id = 1",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map(|count| count > 0)
        .map_err(|e| format!("Failed to read quotation sequence: {e}"))?;

    if !sequence_seeded {
        conn.execute_batch(
            "
            INSERT INTO quotation_sequence (id, last_number)
            SELECT 1, COALESCE((SELECT MAX(id) FROM quotations), 0);
            ",
        )
        .map_err(|e| format!("Failed to seed quotation sequence: {e}"))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn legacy_connection() -> Connection {
        let conn = Connection::open_in_memory().unwrap();

        conn.execute_batch(
            "
            CREATE TABLE clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                address TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE quotations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quotation_number TEXT NOT NULL UNIQUE,
                client_id INTEGER NOT NULL,
                event_type TEXT,
                event_date TEXT,
                event_time TEXT,
                venue TEXT,
                city TEXT,
                subtotal REAL NOT NULL,
                discount REAL NOT NULL,
                advance_amount REAL NOT NULL,
                total REAL NOT NULL,
                balance REAL NOT NULL,
                notes TEXT,
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

            CREATE TABLE expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                expense_type TEXT NOT NULL DEFAULT 'Other',
                note TEXT NOT NULL DEFAULT '',
                amount REAL NOT NULL DEFAULT 0,
                expense_date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            ",
        )
        .unwrap();

        conn
    }

    #[test]
    fn run_is_idempotent() {
        let conn = crate::test_support::test_connection();

        run(&conn).unwrap();
        run(&conn).unwrap();
    }

    #[test]
    fn upgrades_legacy_schema_and_backfills_dates() {
        let conn = legacy_connection();

        conn.execute_batch(
            "
            INSERT INTO clients (name) VALUES ('Legacy Client');
            INSERT INTO quotations
                (quotation_number, client_id, event_date, subtotal, discount,
                 advance_amount, total, balance, notes, status)
            VALUES ('QT-LEGACY-1', 1, '2025-01-15', 1000, 0, 0, 1000, 1000, '', 'Sent');
            INSERT INTO quotation_services
                (quotation_id, service_name, quantity, price, total)
            VALUES (1, 'Video', 1, 1000, 1000);
            ",
        )
        .unwrap();

        run(&conn).unwrap();

        let quotation_date: String = conn
            .query_row(
                "SELECT quotation_date FROM quotations WHERE id = 1",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(quotation_date, "2025-01-15");

        let service_status: String = conn
            .query_row(
                "SELECT status FROM quotation_services WHERE quotation_id = 1",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(service_status, "Pending");

        assert!(column_exists(&conn, "quotations", "event_notes").unwrap());
        assert!(table_exists(&conn, "settings").unwrap());
        assert!(table_exists(&conn, "quotation_sequence").unwrap());
    }

    #[test]
    fn upgrades_legacy_expenses_table_without_losing_data() {
        let conn = legacy_connection();

        conn.execute_batch(
            "
            INSERT INTO expenses (expense_type, note, amount, expense_date)
            VALUES ('Equipment', 'Lenses', 5000, '2026-01-10');
            INSERT INTO expenses (expense_type, note, amount, expense_date)
            VALUES ('Person', 'Assistant', 1200, '2026-02-05');
            ",
        )
        .unwrap();

        run(&conn).unwrap();
        run(&conn).unwrap();

        assert!(column_exists(&conn, "expenses", "category").unwrap());
        assert!(column_exists(&conn, "expenses", "quotation_id").unwrap());

        let (category, description, amount, quotation_id): (String, String, f64, Option<i64>) = conn
            .query_row(
                "SELECT category, description, amount, quotation_id
                 FROM expenses WHERE expense_type = 'Equipment'",
                [],
                |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                    ))
                },
            )
            .unwrap();

        assert_eq!(category, "Equipment");
        assert_eq!(description, "Lenses");
        assert_eq!(amount, 5000.0);
        // General expenses stay unlinked to any quotation.
        assert_eq!(quotation_id, None);

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM expenses", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 2);
    }

    #[test]
    fn advance_seeding_runs_exactly_once() {
        let conn = legacy_connection();

        conn.execute_batch(
            "
            INSERT INTO clients (name) VALUES ('Client');
            INSERT INTO quotations
                (quotation_number, client_id, event_date, subtotal, discount,
                 advance_amount, total, balance, notes, status)
            VALUES ('QT-ADV-1', 1, '2026-06-01', 1000, 0, 250, 1000, 750, '', 'Draft');
            ",
        )
        .unwrap();

        run(&conn).unwrap();
        run(&conn).unwrap();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM payments", [], |row| row.get(0))
            .unwrap();

        assert_eq!(count, 1);

        let amount: f64 = conn
            .query_row("SELECT amount FROM payments", [], |row| row.get(0))
            .unwrap();

        assert_eq!(amount, 250.0);
    }

    #[test]
    fn sequence_seeded_from_existing_id() {
        let conn = legacy_connection();

        conn.execute_batch(
            "
            INSERT INTO clients (name) VALUES ('Client');
            INSERT INTO quotations
                (quotation_number, client_id, subtotal, discount, advance_amount, total, balance, notes, status)
            VALUES ('QT-1', 1, 0, 0, 0, 0, 0, '', 'Draft');
            ",
        )
        .unwrap();

        // Migrations must seed the sequence from the highest existing id.
        run(&conn).unwrap();

        let last_number: i64 = conn
            .query_row(
                "SELECT last_number FROM quotation_sequence WHERE id = 1",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(last_number, 1);
    }
}