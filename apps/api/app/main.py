from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.routers import auth, admin_users, assets
from app.db.session import SessionLocal
from app.core.bootstrap import bootstrap_admin

app = FastAPI()

@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        bootstrap_admin(db)
    except BootstrapError as e:
        # em prod isso vai derrubar o startup, como desejado
        raise RuntimeError(str(e))
    finally:
        db.close()

app.include_router(auth.router)
app.include_router(admin_users.router)
app.include_router(assets.router)

app.mount("/storage", StaticFiles(directory="storage"), name="storage")