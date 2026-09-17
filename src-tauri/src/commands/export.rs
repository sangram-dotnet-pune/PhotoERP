use std::fs::File;
use std::io::Write;
use std::path::PathBuf;

use tauri::AppHandle;

use crate::database::connection;

/// Escape a single CSV field per RFC 4180 (double quotes, wrap in quotes).
fn csv_field(value: &str) -> String {
    let escaped = value.replace('"', "\"\"");
    format!("\"{escaped}\"")
}

fn write_row(file: &mut File, fields: &[String]) -> Result<(), String> {
    file.write_all(fields.join(",").as_bytes())
        .and_then(|_| file.write_all(b"\n"))
        .map_err(|e| format!("Failed to write CSV: {e}"))
}

/// Export a table to a CSV file. `kind` must be one of:
/// quotations | clients | payments | services.
#[tauri::command]
pub fn export_csv(
    app: AppHandle,
    kind: String,
    output_path: String,
) -> Result<String, String> {
    let dest = PathBuf::from(&output_path);

    if let Some(parent) = dest.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Unable to create output directory: {e}"))?;
        }
    }

    let conn = connection::get_connection(&app)?;

    let mut file = File::create(&dest).map_err(|e| format!("Unable to create file: {e}"))?;

    match kind.as_str() {
        "quotations" => export_quotations(&conn, &mut file)?,
        "clients" => export_clients(&conn, &mut file)?,
        "payments" => export_payments(&conn, &mut file)?,
        "services" => export_services(&conn, &mut file)?,
        _ => {
            return Err(
                "Unknown export type. Use 'quotations', 'clients', 'payments' or 'services'."
                    .to_string(),
            )
        }
    }

    Ok(dest.to_string_lossy().to_string())
}

fn export_quotations(
    conn: &rusqlite::Connection,
    file: &mut File,
) -> Result<(), String> {
    write_row(
        file,
        &[
            "Quotation No".to_string(),
            "Quotation Date".to_string(),
            "Client".to_string(),
            "Event".to_string(),
            "Event Date".to_string(),
            "Total".to_string(),
            "Balance".to_string(),
            "Payment Status".to_string(),
            "Workflow Status".to_string(),
        ],
    )?;

    let mut stmt = conn
        .prepare(
            "
            SELECT
                q.quotation_number,
                IFNULL(q.quotation_date, ''),
                c.name,
                IFNULL(q.event_type, ''),
                IFNULL(q.event_date, ''),
                q.total,
                MAX(q.total - IFNULL(paid.paid, 0), 0),
                CASE
                    WHEN IFNULL(paid.paid, 0) <= 0 THEN 'Pending'
                    WHEN IFNULL(paid.paid, 0) >= q.total THEN 'Paid'
                    ELSE 'Partial'
                END,
                IFNULL(q.status, 'Draft')
            FROM quotations q
            INNER JOIN clients c ON c.id = q.client_id
            LEFT JOIN (
                SELECT quotation_id, SUM(amount) AS paid
                FROM payments GROUP BY quotation_id
            ) AS paid ON paid.quotation_id = q.id
            ORDER BY q.id ASC
            ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, f64>(5)?,
                row.get::<_, f64>(6)?,
                row.get::<_, String>(7)?,
                row.get::<_, String>(8)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    for row in rows {
        let r = row.map_err(|e| e.to_string())?;

        write_row(
            file,
            &[
                csv_field(&r.0),
                csv_field(&r.1),
                csv_field(&r.2),
                csv_field(&r.3),
                csv_field(&r.4),
                r.5.to_string(),
                r.6.to_string(),
                csv_field(&r.7),
                csv_field(&r.8),
            ],
        )?;
    }

    Ok(())
}

fn export_clients(
    conn: &rusqlite::Connection,
    file: &mut File,
) -> Result<(), String> {
    write_row(
        file,
        &[
            "Name".to_string(),
            "Phone".to_string(),
            "Email".to_string(),
            "Address".to_string(),
            "Event Count".to_string(),
        ],
    )?;

    let mut stmt = conn
        .prepare(
            "
            SELECT
                name,
                IFNULL(phone, ''),
                IFNULL(email, ''),
                IFNULL(address, ''),
                (SELECT COUNT(*) FROM quotations WHERE client_id = clients.id)
            FROM clients
            ORDER BY name ASC
            ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, i64>(4)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    for row in rows {
        let r = row.map_err(|e| e.to_string())?;

        write_row(
            file,
            &[
                csv_field(&r.0),
                csv_field(&r.1),
                csv_field(&r.2),
                csv_field(&r.3),
                r.4.to_string(),
            ],
        )?;
    }

    Ok(())
}

fn export_payments(
    conn: &rusqlite::Connection,
    file: &mut File,
) -> Result<(), String> {
    write_row(
        file,
        &[
            "Quotation No".to_string(),
            "Client".to_string(),
            "Amount".to_string(),
            "Payment Date".to_string(),
            "Method".to_string(),
            "Notes".to_string(),
        ],
    )?;

    let mut stmt = conn
        .prepare(
            "
            SELECT
                q.quotation_number,
                c.name,
                p.amount,
                IFNULL(p.payment_date, ''),
                IFNULL(p.payment_method, ''),
                IFNULL(p.notes, '')
            FROM payments p
            INNER JOIN quotations q ON q.id = p.quotation_id
            INNER JOIN clients c ON c.id = q.client_id
            ORDER BY p.id ASC
            ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, f64>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    for row in rows {
        let r = row.map_err(|e| e.to_string())?;

        write_row(
            file,
            &[
                csv_field(&r.0),
                csv_field(&r.1),
                r.2.to_string(),
                csv_field(&r.3),
                csv_field(&r.4),
                csv_field(&r.5),
            ],
        )?;
    }

    Ok(())
}

fn export_services(
    conn: &rusqlite::Connection,
    file: &mut File,
) -> Result<(), String> {
    write_row(
        file,
        &[
            "Quotation No".to_string(),
            "Client".to_string(),
            "Service".to_string(),
            "Quantity".to_string(),
            "Price".to_string(),
            "Total".to_string(),
            "Status".to_string(),
        ],
    )?;

    let mut stmt = conn
        .prepare(
            "
            SELECT
                q.quotation_number,
                c.name,
                s.service_name,
                s.quantity,
                s.price,
                s.total,
                IFNULL(s.status, 'Pending')
            FROM quotation_services s
            INNER JOIN quotations q ON q.id = s.quotation_id
            INNER JOIN clients c ON c.id = q.client_id
            ORDER BY q.id ASC, s.id ASC
            ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i32>(3)?,
                row.get::<_, f64>(4)?,
                row.get::<_, f64>(5)?,
                row.get::<_, String>(6)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    for row in rows {
        let r = row.map_err(|e| e.to_string())?;

        write_row(
            file,
            &[
                csv_field(&r.0),
                csv_field(&r.1),
                csv_field(&r.2),
                r.3.to_string(),
                r.4.to_string(),
                r.5.to_string(),
                csv_field(&r.6),
            ],
        )?;
    }

    Ok(())
}