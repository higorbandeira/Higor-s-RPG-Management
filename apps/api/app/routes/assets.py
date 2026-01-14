from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from pathlib import Path
import uuid

from app.core.deps import require_role
from app.db.session import get_db
from app.db.models.asset import Asset
from app.db.models.user import User

router = APIRouter(prefix="/assets", tags=["assets"])

ALLOWED_MIME = {"image/png", "image/jpeg", "image/webp"}
UPLOAD_DIR = Path("storage/uploads")  # local no servidor

@router.post("/upload", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_role("USER"))])
def upload_asset(
    type: str = Form(...),  # "MAP" | "AVATAR"
    name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("USER")),
):
    # Validação: type
    if type not in ("MAP", "AVATAR"):
        raise HTTPException(status_code=422, detail="Invalid type. Use MAP or AVATAR.")

    # Validação: mime
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type: {file.content_type}. Allowed: png, jpeg, webp.",
        )

    # Sem limite de tamanho inicialmente: NÃO validamos Content-Length nem tamanho do stream.
    # (Mas note: isso pode permitir uploads gigantes; ideal colocar limite depois.)

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # Extensão por content_type (evita confiar no filename)
    ext_map = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}
    ext = ext_map[file.content_type]

    asset_id = str(uuid.uuid4())
    storage_name = f"{asset_id}{ext}"
    dst_path = UPLOAD_DIR / storage_name

    # salvar arquivo local
    with dst_path.open("wb") as out:
        while True:
            chunk = file.file.read(1024 * 1024)  # 1MB chunks
            if not chunk:
                break
            out.write(chunk)

    # URL local (ajuste conforme seu reverse proxy)
    file_url = f"/storage/uploads/{storage_name}"

    asset = Asset(
        id=asset_id,
        type=type,
        name=name,
        file_url=file_url,
        uploaded_by_user_id=current_user.id,
        width_cells=None,
        height_cells=None,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    return {
        "id": asset.id,
        "type": asset.type,
        "name": asset.name,
        "fileUrl": asset.file_url,
        "uploadedByUserId": asset.uploaded_by_user_id,
        "createdAt": asset.created_at,
    }
