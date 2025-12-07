use actix_session::{storage::CookieSessionStore, Session, SessionMiddleware};
use actix_files::Files;
use actix_web::{cookie::Key, get, post, web, App, HttpResponse, HttpServer, Responder, Result};
use argon2::{password_hash::{SaltString, PasswordHasher, PasswordVerifier}, Argon2};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;


static USERS_FILE: &str = "users.json";

#[derive(Debug, Serialize, Deserialize, Clone)]
struct User {
    username: String,
    password_hash: String,
}

#[derive(Deserialize)]
struct RegisterForm {
    username: String,
    password: String,
}

#[derive(Deserialize)]
struct LoginForm {
    username: String,
    password: String,
}

async fn read_users() -> Result<Vec<User>, anyhow::Error> {
    if !Path::new(USERS_FILE).exists() {
        fs::write(USERS_FILE, "[]").await?;
    }
    let s = fs::read_to_string(USERS_FILE).await?;
    let users: Vec<User> = serde_json::from_str(&s)?;
    Ok(users)
}

async fn write_users(users: &Vec<User>) -> Result<(), anyhow::Error> {
    let s = serde_json::to_string_pretty(users)?;
    fs::write(USERS_FILE, s).await?;
    Ok(())
}

fn hash_password(password: &str) -> Result<String, anyhow::Error> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| anyhow::anyhow!(e))?
        .to_string();
    Ok(password_hash)
}

fn verify_password(hash: &str, password: &str) -> bool {
    if let Ok(parsed) = argon2::password_hash::PasswordHash::new(hash) {
        Argon2::default().verify_password(password.as_bytes(), &parsed).is_ok()
    } else {
        false
    }
}

// Helper to render simple HTML files from templates folder using basic templating (Tera)
async fn render_template(template: &str, ctx: tera::Context) -> Result<HttpResponse, actix_web::Error> {
    let tera = tera::Tera::new("templates/**/*.html").map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Template parsing error: {}", e))
    })?;
    let body = tera.render(template, &ctx).map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Template render error: {}", e))
    })?;
    Ok(HttpResponse::Ok().content_type("text/html").body(body))
}

#[get("/")]
async fn index() -> Result<impl Responder> {
    // Simple public index page
    render_template("index.html", tera::Context::new()).await
}

#[get("/login")]
async fn login_page() -> Result<impl Responder> {
    render_template("login.html", tera::Context::new()).await
}

#[get("/dashboard")]
async fn dashboard(session: Session) -> Result<impl Responder> {
    if let Some(username) = session.get::<String>("username").unwrap_or(None) {
        let mut ctx = tera::Context::new();
        ctx.insert("username", &username);
        render_template("dashboard.html", ctx).await
    } else {
        // redirect to login if not authenticated
        Ok(HttpResponse::SeeOther()
            .append_header(("Location", "/login"))
            .finish())
    }
}

#[get("/register")]
async fn register_page() -> Result<impl Responder> {
    render_template("register.html", tera::Context::new()).await
}

#[post("/register")]
async fn register(form: web::Form<RegisterForm>) -> Result<impl Responder> {
    let mut users = read_users().await.map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Read users failed: {}", e))
    })?;

    if users.iter().any(|u| u.username == form.username) {
        let mut ctx = tera::Context::new();
        ctx.insert("error", "Username already exists");
        return render_template("register.html", ctx).await;
    }

    let password_hash = hash_password(&form.password).map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Hashing failed: {}", e))
    })?;

    users.push(User {
        username: form.username.clone(),
        password_hash,
    });

    write_users(&users).await.map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Writing users failed: {}", e))
    })?;

    let mut ctx = tera::Context::new();
    ctx.insert("success", "Registration successful. Please log in.");
    render_template("login.html", ctx).await
}

#[post("/login")]
async fn login(form: web::Form<LoginForm>, session: Session) -> Result<impl Responder> {
    let users = read_users().await.map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Read users failed: {}", e))
    })?;

    if let Some(user) = users.iter().find(|u| u.username == form.username) {
        if verify_password(&user.password_hash, &form.password) {
            session.insert("username", &user.username).map_err(|e| {
                actix_web::error::ErrorInternalServerError(format!("Session insert failed: {}", e))
            })?;
            return Ok(HttpResponse::SeeOther()
                .append_header(("Location", "/dashboard"))
                .finish());
        }
    }

    let mut ctx = tera::Context::new();
    ctx.insert("error", "Invalid username or password");
    render_template("login.html", ctx).await
}

#[get("/logout")]
async fn logout(session: Session) -> Result<impl Responder> {
    session.purge();
    Ok(HttpResponse::SeeOther().append_header(("Location", "/")).finish())
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Ensure templates and static exist (templates included in repo)
    println!("Starting server at http://127.0.0.1:8080");

    // Random key for cookie session - in prod persist a key
    let secret_key = Key::generate();

    HttpServer::new(move || {
        App::new()
            .wrap(
                SessionMiddleware::builder(
                    CookieSessionStore::default(),
                    secret_key.clone(),
                )
                .cookie_same_site(actix_web::cookie::SameSite::Lax)
                .build(),
            )
            .service(index)
            .service(register_page)
            .service(register)
            .service(login_page)
            .service(login)
            .service(dashboard)
            .service(logout)
            .service(Files::new("/static", "./static").show_files_listing().use_last_modified(true))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
