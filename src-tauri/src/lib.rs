mod database;
mod commands;
mod models;
mod services;

#[cfg(test)]
mod test_support;

use commands::{
    quotation::{
        save_quotation,
        get_quotations,
        get_upcoming_events,
        get_pending_quotations,
        delete_quotation,
        get_quotation_by_id,
        update_quotation,
        generate_quotation_number,
        update_quotation_status,
    },
    client::{
        get_clients,
        get_client_details,
        update_service_status,
        update_client,
        delete_client,
        search_clients,
        find_client_by_contact,
    },
    expense::{
        get_expenses,
        add_expense,
        update_expense,
        delete_expense,
    },
    payment::{
        add_payment,
        get_payments_by_quotation,
        get_payment_summary,
        update_payment,
        delete_payment,
    },
    dashboard::get_dashboard_stats,
    revenue::get_monthly_revenue,
    data_management::{
        backup_database,
        restore_database,
        get_database_info,
    },
    settings::{
        get_settings,
        save_settings,
    },
    reports::{
        get_reports_summary,
        get_top_clients,
        get_pending_clients,
        get_all_payments,
    },
    export::export_csv,
};
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            println!("Initializing PhotoERP Database...");

            let conn = database::connection::get_connection(app.handle())
                .expect("Failed to open the PhotoERP database");

            database::migrations::run(&conn)
                .expect("Failed to apply PhotoERP migrations");

            println!("Database Ready!");

            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            save_quotation,
            get_quotations,
            get_upcoming_events,
            get_pending_quotations,
            delete_quotation,
            get_quotation_by_id,
            update_quotation,
            generate_quotation_number,
            update_quotation_status,
            get_dashboard_stats,
            get_monthly_revenue,
            get_clients,
            get_client_details,
            update_service_status,
            update_client,
            delete_client,
            search_clients,
            find_client_by_contact,
            get_expenses,
            add_expense,
            update_expense,
            delete_expense,
            add_payment,
            get_payments_by_quotation,
            get_payment_summary,
            update_payment,
            delete_payment,
            get_settings,
            save_settings,
            get_reports_summary,
            get_top_clients,
            get_pending_clients,
            get_all_payments,
            export_csv,
            backup_database,
            restore_database,
            get_database_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}