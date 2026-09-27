use rusqlite::{params, Connection};
use tauri::AppHandle;

use crate::{
    database::connection,
    models::package::{CatalogService, PackageService, ReusablePackage},
};

fn validate_service(service: &PackageService) -> Result<(), String> {
    if service.service_name.trim().is_empty() {
        return Err("Service name is required.".to_string());
    }

    if service.quantity < 1 {
        return Err("Service quantity must be at least 1.".to_string());
    }

    if !service.price.is_finite() || service.price < 0.0 {
        return Err("Service price must be a non-negative number.".to_string());
    }

    Ok(())
}

fn validate_package(pkg: &ReusablePackage) -> Result<(), String> {
    if pkg.name.trim().is_empty() {
        return Err("Package name is required.".to_string());
    }

    for service in &pkg.services {
        validate_service(service)?;
    }

    Ok(())
}

// ==============================
// Service Catalog (individual services)
// ==============================

fn get_catalog_services_core(conn: &Connection) -> Result<Vec<CatalogService>, String> {
    let mut stmt = conn
        .prepare(
            "
            SELECT id, name, price
            FROM service_catalog
            ORDER BY name COLLATE NOCASE ASC
            ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(CatalogService {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                price: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut services = Vec::new();

    for row in rows {
        services.push(row.map_err(|e| e.to_string())?);
    }

    Ok(services)
}

#[tauri::command]
pub fn get_catalog_services(app: AppHandle) -> Result<Vec<CatalogService>, String> {
    let conn = connection::get_connection(&app)?;

    get_catalog_services_core(&conn)
}

fn save_catalog_service_core(
    conn: &Connection,
    service: &CatalogService,
) -> Result<(), String> {
    let name = service.name.trim();

    if name.is_empty() {
        return Err("Service name is required.".to_string());
    }

    if !service.price.is_finite() || service.price < 0.0 {
        return Err("Service price must be a non-negative number.".to_string());
    }

    match service.id {
        Some(id) => {
            let updated = conn
                .execute(
                    "
                    UPDATE service_catalog
                    SET name = ?1,
                        price = ?2,
                        updated_at = datetime('now', 'localtime')
                    WHERE id = ?3
                    ",
                    params![name, service.price, id],
                )
                .map_err(|e| format!("Failed to update service: {e}"))?;

            if updated == 0 {
                return Err("Service not found.".to_string());
            }
        }
        None => {
            conn.execute(
                "
                INSERT INTO service_catalog (name, price)
                VALUES (?1, ?2)
                ",
                params![name, service.price],
            )
            .map_err(|e| format!("Failed to add service: {e}"))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn save_catalog_service(app: AppHandle, service: CatalogService) -> Result<(), String> {
    let conn = connection::get_connection(&app)?;

    save_catalog_service_core(&conn, &service)
}

fn delete_catalog_service_core(conn: &Connection, id: i64) -> Result<(), String> {
    let deleted = conn
        .execute("DELETE FROM service_catalog WHERE id = ?1", [id])
        .map_err(|e| format!("Failed to delete service: {e}"))?;

    if deleted == 0 {
        return Err("Service not found.".to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn delete_catalog_service(app: AppHandle, id: i64) -> Result<(), String> {
    let conn = connection::get_connection(&app)?;

    delete_catalog_service_core(&conn, id)
}

// ==============================
// Packages
// ==============================

fn get_packages_core(conn: &Connection) -> Result<Vec<ReusablePackage>, String> {
    let mut stmt = conn
        .prepare("SELECT id, name FROM packages ORDER BY name COLLATE NOCASE ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;

    let mut packages: Vec<ReusablePackage> = Vec::new();

    for row in rows {
        let (id, name) = row.map_err(|e| e.to_string())?;
        packages.push(ReusablePackage {
            id: Some(id),
            name,
            services: Vec::new(),
        });
    }

    if packages.is_empty() {
        return Ok(packages);
    }

    let mut services_stmt = conn
        .prepare(
            "
            SELECT id, package_id, service_name, quantity, price
            FROM package_services
            ORDER BY id ASC
            ",
        )
        .map_err(|e| e.to_string())?;

    let service_rows = services_stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, f64>(4)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    for service_row in service_rows {
        let (id, package_id, service_name, quantity, price) =
            service_row.map_err(|e| e.to_string())?;

        if let Some(pkg) = packages.iter_mut().find(|p| p.id == Some(package_id)) {
            pkg.services.push(PackageService {
                id: Some(id),
                service_name,
                quantity,
                price,
            });
        }
    }

    Ok(packages)
}

#[tauri::command]
pub fn get_packages(app: AppHandle) -> Result<Vec<ReusablePackage>, String> {
    let conn = connection::get_connection(&app)?;

    get_packages_core(&conn)
}

fn save_package_core(conn: &Connection, pkg: &ReusablePackage) -> Result<(), String> {
    validate_package(pkg)?;

    let name = pkg.name.trim();

    let tx = conn
        .unchecked_transaction()
        .map_err(|e| format!("Failed to start transaction: {e}"))?;

    let package_id = match pkg.id {
        Some(id) => {
            let updated = tx
                .execute(
                    "
                    UPDATE packages
                    SET name = ?1,
                        updated_at = datetime('now', 'localtime')
                    WHERE id = ?2
                    ",
                    params![name, id],
                )
                .map_err(|e| format!("Failed to update package: {e}"))?;

            if updated == 0 {
                return Err("Package not found.".to_string());
            }

            id
        }
        None => {
            tx.execute(
                "INSERT INTO packages (name) VALUES (?1)",
                params![name],
            )
            .map_err(|e| format!("Failed to add package: {e}"))?;

            tx.last_insert_rowid()
        }
    };

    tx.execute(
        "DELETE FROM package_services WHERE package_id = ?1",
        params![package_id],
    )
    .map_err(|e| format!("Failed to reset package services: {e}"))?;

    for service in &pkg.services {
        tx.execute(
            "
            INSERT INTO package_services (package_id, service_name, quantity, price)
            VALUES (?1, ?2, ?3, ?4)
            ",
            params![
                package_id,
                service.service_name.trim(),
                service.quantity,
                service.price
            ],
        )
        .map_err(|e| format!("Failed to add package service: {e}"))?;
    }

    tx.commit()
        .map_err(|e| format!("Failed to commit package: {e}"))
}

#[tauri::command]
pub fn save_package(app: AppHandle, package: ReusablePackage) -> Result<(), String> {
    let conn = connection::get_connection(&app)?;

    save_package_core(&conn, &package)
}

fn delete_package_core(conn: &Connection, id: i64) -> Result<(), String> {
    let deleted = conn
        .execute("DELETE FROM packages WHERE id = ?1", [id])
        .map_err(|e| format!("Failed to delete package: {e}"))?;

    if deleted == 0 {
        return Err("Package not found.".to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn delete_package(app: AppHandle, id: i64) -> Result<(), String> {
    let conn = connection::get_connection(&app)?;

    delete_package_core(&conn, id)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_package() -> ReusablePackage {
        ReusablePackage {
            id: None,
            name: "Premium Wedding Package".to_string(),
            services: vec![
                PackageService {
                    id: None,
                    service_name: "Photography".to_string(),
                    quantity: 1,
                    price: 30_000.0,
                },
                PackageService {
                    id: None,
                    service_name: "Videography".to_string(),
                    quantity: 1,
                    price: 25_000.0,
                },
            ],
        }
    }

    #[test]
    fn catalog_service_crud() {
        let conn = crate::test_support::test_connection();

        let created = CatalogService {
            id: None,
            name: "Photography".to_string(),
            price: 50_000.0,
        };

        save_catalog_service_core(&conn, &created).unwrap();

        let services = get_catalog_services_core(&conn).unwrap();
        assert_eq!(services.len(), 1);
        assert_eq!(services[0].name, "Photography");

        let id = services[0].id.unwrap();

        let updated = CatalogService {
            id: Some(id),
            name: "Cinematic Video".to_string(),
            price: 15_000.0,
        };

        save_catalog_service_core(&conn, &updated).unwrap();

        let services = get_catalog_services_core(&conn).unwrap();
        assert_eq!(services[0].name, "Cinematic Video");

        delete_catalog_service_core(&conn, id).unwrap();
        assert!(get_catalog_services_core(&conn).unwrap().is_empty());
    }

    #[test]
    fn catalog_service_validation() {
        let conn = crate::test_support::test_connection();

        let empty = CatalogService {
            id: None,
            name: "   ".to_string(),
            price: 0.0,
        };
        assert!(save_catalog_service_core(&conn, &empty).is_err());

        let negative = CatalogService {
            id: None,
            name: "Service".to_string(),
            price: -5.0,
        };
        assert!(save_catalog_service_core(&conn, &negative).is_err());
    }

    #[test]
    fn package_create_list_update_delete() {
        let conn = crate::test_support::test_connection();

        save_package_core(&conn, &sample_package()).unwrap();

        let packages = get_packages_core(&conn).unwrap();
        assert_eq!(packages.len(), 1);
        assert_eq!(packages[0].services.len(), 2);
        assert_eq!(packages[0].services[0].service_name, "Photography");

        let id = packages[0].id.unwrap();

        let mut updated = sample_package();
        updated.id = Some(id);
        updated.name = "Luxury Wedding".to_string();
        updated.services.pop();

        save_package_core(&conn, &updated).unwrap();

        let packages = get_packages_core(&conn).unwrap();
        assert_eq!(packages[0].name, "Luxury Wedding");
        assert_eq!(packages[0].services.len(), 1);

        delete_package_core(&conn, id).unwrap();
        assert!(get_packages_core(&conn).unwrap().is_empty());
    }

    #[test]
    fn package_validation() {
        let conn = crate::test_support::test_connection();

        let mut unnamed = sample_package();
        unnamed.name = "   ".to_string();
        assert!(save_package_core(&conn, &unnamed).is_err());

        let mut bad_quantity = sample_package();
        bad_quantity.services[0].quantity = 0;
        assert!(save_package_core(&conn, &bad_quantity).is_err());

        let mut bad_price = sample_package();
        bad_price.services[0].price = -100.0;
        assert!(save_package_core(&conn, &bad_price).is_err());

        let mut bad_name = sample_package();
        bad_name.services[0].service_name = "  ".to_string();
        assert!(save_package_core(&conn, &bad_name).is_err());
    }

    #[test]
    fn deleting_package_cascades_services() {
        let conn = crate::test_support::test_connection();

        save_package_core(&conn, &sample_package()).unwrap();

        let id = get_packages_core(&conn).unwrap()[0].id.unwrap();
        delete_package_core(&conn, id).unwrap();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM package_services", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(count, 0);
    }
}