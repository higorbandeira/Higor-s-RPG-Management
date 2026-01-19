import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { http } from "@/shared/api/http";

type Asset = {
  id: string;
  type: "MAP" | "AVATAR";
  name: string;
  fileUrl: string;
  uploadedByUserId: string | null;
  createdAt: string | null;
};

type PlacedAvatar = {
  id: string;
  assetId: string;
  name: string;
  fileUrl: string;
  x: number;
  y: number;
};

type DragState = {
  avatarId: string;
  offsetX: number;
  offsetY: number;
};

const GRID_SIZE = 40;
const BOARD_WIDTH = 900;
const BOARD_HEIGHT = 480;

export function DashboardPage() {
  const { me, logout } = useAuth();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [type, setType] = useState<"MAP" | "AVATAR">("MAP");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMapId, setSelectedMapId] = useState<string>("");
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>("");
  const [placedAvatars, setPlacedAvatars] = useState<PlacedAvatar[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [activeAvatarId, setActiveAvatarId] = useState<string | null>(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  async function loadAssets() {
    const res = await http.get("/assets");
    setAssets(res.data.items as Asset[]);
  }

  useEffect(() => {
    loadAssets();
  }, []);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const maps = useMemo(() => assets.filter((asset) => asset.type === "MAP"), [assets]);
  const avatars = useMemo(() => assets.filter((asset) => asset.type === "AVATAR"), [assets]);
  const selectedMap = useMemo(
    () => maps.find((mapAsset) => mapAsset.id === selectedMapId) ?? null,
    [maps, selectedMapId]
  );
  const selectedAvatarAsset = useMemo(
    () => avatars.find((avatar) => avatar.id === selectedAvatarId) ?? null,
    [avatars, selectedAvatarId]
  );

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Selecione um arquivo");
      return;
    }
    if (!name.trim()) {
      setError("Dê um nome para o asset");
      return;
    }

    const fd = new FormData();
    fd.append("type", type);
    fd.append("name", name);
    fd.append("file", file);

    setBusy(true);
    try {
      await http.post("/assets/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setName("");
      setFile(null);
      await loadAssets();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Falha no upload");
    } finally {
      setBusy(false);
    }
  }

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  function handleAddAvatar() {
    if (!selectedAvatarAsset) return;
    handleAddAvatarFrom(selectedAvatarAsset);
  }

  function handleAddAvatarFrom(asset: Asset) {
    const avatarId = `${asset.id}-${Date.now()}`;
    setPlacedAvatars((prev) => [
      ...prev,
      {
        id: avatarId,
        assetId: asset.id,
        name: asset.name,
        fileUrl: asset.fileUrl,
        x: GRID_SIZE,
        y: GRID_SIZE,
      },
    ]);
    setActiveAvatarId(avatarId);
  }

  function handlePointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
    avatarId: string
  ) {
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const avatar = placedAvatars.find((item) => item.id === avatarId);
    if (!avatar) return;
    const offsetX = event.clientX - rect.left - avatar.x;
    const offsetY = event.clientY - rect.top - avatar.y;
    setDragState({ avatarId, offsetX, offsetY });
    setActiveAvatarId(avatarId);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState) return;
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const nextX = event.clientX - rect.left - dragState.offsetX;
    const nextY = event.clientY - rect.top - dragState.offsetY;
    setPlacedAvatars((prev) =>
      prev.map((avatar) =>
        avatar.id === dragState.avatarId
          ? {
              ...avatar,
              x: clamp(nextX, 0, BOARD_WIDTH - GRID_SIZE),
              y: clamp(nextY, 0, BOARD_HEIGHT - GRID_SIZE),
            }
          : avatar
      )
    );
  }

  function handlePointerUp() {
    setDragState(null);
  }

  function handleBoardKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!activeAvatarId) return;
    const step = event.shiftKey ? GRID_SIZE * 2 : GRID_SIZE;
    const delta =
      event.key === "ArrowUp"
        ? { x: 0, y: -step }
        : event.key === "ArrowDown"
        ? { x: 0, y: step }
        : event.key === "ArrowLeft"
        ? { x: -step, y: 0 }
        : event.key === "ArrowRight"
        ? { x: step, y: 0 }
        : null;
    if (!delta) return;
    event.preventDefault();
    setPlacedAvatars((prev) =>
      prev.map((avatar) =>
        avatar.id === activeAvatarId
          ? {
              ...avatar,
              x: clamp(avatar.x + delta.x, 0, BOARD_WIDTH - GRID_SIZE),
              y: clamp(avatar.y + delta.y, 0, BOARD_HEIGHT - GRID_SIZE),
            }
          : avatar
      )
    );
  }

  const pageStyle = {
    minHeight: "100vh",
    background: "#f5f5f5",
    fontFamily: "'Inter', 'Roboto', system-ui, sans-serif",
  };
  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid #d0d0d0",
    fontSize: 14,
  };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: "#424242" };
  const buttonStyle = {
    padding: "10px 18px",
    borderRadius: 999,
    border: "none",
    background: "#111111",
    color: "#ffffff",
    fontWeight: 600,
    cursor: "pointer",
  };
  const floatingButtonStyle = {
    width: 56,
    height: 56,
    borderRadius: 999,
    border: "none",
    background: "#111111",
    color: "#ffffff",
    fontSize: 24,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 16px 30px rgba(0,0,0,0.2)",
  };

  return (
    <div style={pageStyle}>
      <div style={{ position: "relative", width: "100%", height: "100vh" }}>
        <div
          ref={boardRef}
          tabIndex={0}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onKeyDown={handleBoardKeyDown}
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            overflow: "hidden",
            outline: "none",
            backgroundColor: "#f8f8f8",
            backgroundImage: selectedMap
              ? `linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
                 linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px),
                 url(${selectedMap.fileUrl})`
              : `linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
                 linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: selectedMap
              ? `${GRID_SIZE}px ${GRID_SIZE}px, ${GRID_SIZE}px ${GRID_SIZE}px, cover`
              : `${GRID_SIZE}px ${GRID_SIZE}px, ${GRID_SIZE}px ${GRID_SIZE}px`,
            backgroundPosition: "0 0, 0 0, center",
            touchAction: "none",
          }}
        >
          {placedAvatars.map((avatar) => (
            <button
              key={avatar.id}
              type="button"
              onPointerDown={(event) => handlePointerDown(event, avatar.id)}
              onClick={() => setActiveAvatarId(avatar.id)}
              style={{
                position: "absolute",
                left: avatar.x,
                top: avatar.y,
                width: GRID_SIZE,
                height: GRID_SIZE,
                padding: 0,
                borderRadius: 8,
                border:
                  avatar.id === activeAvatarId ? "2px solid #4f46e5" : "1px solid rgba(0,0,0,0.15)",
                background: "rgba(255,255,255,0.8)",
                cursor: "grab",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title={avatar.name}
            >
              <img
                src={avatar.fileUrl}
                alt={avatar.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }}
              />
            </button>
          ))}
          {placedAvatars.length === 0 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                color: "#666",
                padding: 24,
                textAlign: "center",
              }}
            >
              Adicione um mapa e pelo menos um avatar para começar a mover no tabuleiro.
            </div>
          )}
        </div>

        <div
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            background: "rgba(255,255,255,0.9)",
            padding: "8px 14px",
            borderRadius: 999,
            fontSize: 12,
            color: "#424242",
            boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
          }}
        >
          {me?.nickname ? `Logado como ${me.nickname}` : "Dashboard"}
        </div>

        <div
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            zIndex: 10,
          }}
        >
          <button onClick={() => setIsActionsOpen(true)} style={floatingButtonStyle} aria-label="Abrir ações">
            +
          </button>
          <button
            onClick={logout}
            style={{ ...floatingButtonStyle, background: "#ffffff", color: "#111111", border: "1px solid #111111" }}
            aria-label="Sair"
          >
            ⎋
          </button>
        </div>

        {isActionsOpen && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: 24,
              zIndex: 20,
            }}
          >
            <div
              style={{
                background: "#ffffff",
                width: "100%",
                maxWidth: 980,
                borderRadius: 24,
                padding: 24,
                boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
                display: "grid",
                gap: 24,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ margin: 0 }}>Ações rápidas</h2>
                  <p style={{ margin: "6px 0 0", color: "#616161" }}>
                    Selecione mapas e avatares existentes ou faça upload de novos assets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActionsOpen(false)}
                  style={{ ...buttonStyle, background: "#ffffff", color: "#111111", border: "1px solid #111111" }}
                >
                  Fechar
                </button>
              </div>

              <div style={{ display: "grid", gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Mapas</div>
                  {maps.length === 0 ? (
                    <div style={{ color: "#616161" }}>Nenhum mapa enviado.</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
                      {maps.map((mapAsset) => (
                        <button
                          key={mapAsset.id}
                          type="button"
                          onClick={() => setSelectedMapId(mapAsset.id)}
                          style={{
                            border: mapAsset.id === selectedMapId ? "2px solid #111111" : "1px solid #e0e0e0",
                            borderRadius: 16,
                            padding: 8,
                            background: "#fafafa",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <img
                            src={mapAsset.fileUrl}
                            alt={mapAsset.name}
                            style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 12 }}
                          />
                          <div style={{ marginTop: 6, fontSize: 13 }}>{mapAsset.name}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Avatares</div>
                  {avatars.length === 0 ? (
                    <div style={{ color: "#616161" }}>Nenhum avatar enviado.</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12 }}>
                      {avatars.map((avatar) => (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => {
                            setSelectedAvatarId(avatar.id);
                            handleAddAvatarFrom(avatar);
                          }}
                          style={{
                            border: "1px solid #e0e0e0",
                            borderRadius: 16,
                            padding: 8,
                            background: "#fafafa",
                            cursor: "pointer",
                            textAlign: "center",
                          }}
                        >
                          <img
                            src={avatar.fileUrl}
                            alt={avatar.name}
                            style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 12 }}
                          />
                          <div style={{ marginTop: 6, fontSize: 12 }}>{avatar.name}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ borderTop: "1px solid #eee", paddingTop: 16 }}>
                <h3 style={{ marginTop: 0 }}>Enviar novo asset</h3>
                <form onSubmit={handleUpload}>
                  <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, alignItems: "center" }}>
                    <label style={labelStyle}>Tipo</label>
                    <select value={type} onChange={(e) => setType(e.target.value as any)} style={inputStyle}>
                      <option value="MAP">Mapa</option>
                      <option value="AVATAR">Avatar</option>
                    </select>

                    <label style={labelStyle}>Nome</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Floresta 01"
                      style={inputStyle}
                    />

                    <label style={labelStyle}>Arquivo (png/jpg/webp)</label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      style={inputStyle}
                    />
                  </div>

                  {previewUrl && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Prévia:</div>
                      <img src={previewUrl} style={{ maxWidth: 320, borderRadius: 8, border: "1px solid #ddd" }} />
                    </div>
                  )}

                  {error && <div style={{ marginTop: 12, color: "#b00020" }}>{error}</div>}

                  <button
                    type="submit"
                    disabled={busy}
                    style={{ ...buttonStyle, marginTop: 12, opacity: busy ? 0.7 : 1 }}
                  >
                    {busy ? "Enviando..." : "Enviar"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
