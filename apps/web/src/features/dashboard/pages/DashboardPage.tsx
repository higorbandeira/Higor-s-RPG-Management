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
    const avatarId = `${selectedAvatarAsset.id}-${Date.now()}`;
    setPlacedAvatars((prev) => [
      ...prev,
      {
        id: avatarId,
        assetId: selectedAvatarAsset.id,
        name: selectedAvatarAsset.name,
        fileUrl: selectedAvatarAsset.fileUrl,
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
    padding: "32px 24px 64px",
    fontFamily: "'Inter', 'Roboto', system-ui, sans-serif",
  };
  const containerStyle = { maxWidth: 1100, margin: "0 auto", display: "grid", gap: 24 };
  const cardStyle = {
    background: "#ffffff",
    borderRadius: 20,
    padding: 20,
    border: "1px solid #e4e4e4",
    boxShadow: "0 16px 40px rgba(0,0,0,0.08)",
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

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>Dashboard</h1>
            <div style={{ color: "#616161" }}>Logado como: {me?.nickname}</div>
          </div>
          <button onClick={logout} style={buttonStyle}>
            Sair
          </button>
        </div>

        {/* Tabuleiro 2D simples */}
        <div style={cardStyle}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
            <div style={{ display: "grid", gap: 8, minWidth: 220 }}>
              <label style={labelStyle}>Mapa de fundo</label>
              <select
                value={selectedMapId}
                onChange={(event) => setSelectedMapId(event.target.value)}
                style={inputStyle}
              >
                <option value="">Selecione um mapa</option>
                {maps.map((mapAsset) => (
                  <option key={mapAsset.id} value={mapAsset.id}>
                    {mapAsset.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "grid", gap: 8, minWidth: 260 }}>
              <label style={labelStyle}>Adicionar avatar</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  value={selectedAvatarId}
                  onChange={(event) => setSelectedAvatarId(event.target.value)}
                  style={inputStyle}
                >
                  <option value="">Selecione um avatar</option>
                  {avatars.map((avatar) => (
                    <option key={avatar.id} value={avatar.id}>
                      {avatar.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddAvatar}
                  disabled={!selectedAvatarAsset}
                  style={{ ...buttonStyle, opacity: selectedAvatarAsset ? 1 : 0.5 }}
                >
                  Adicionar
                </button>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#616161" }}>
              Dica: clique em um avatar e use as setas para mover. Arraste para reposicionar.
            </div>
          </div>

          <div
            ref={boardRef}
            tabIndex={0}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onKeyDown={handleBoardKeyDown}
            style={{
              marginTop: 16,
              width: BOARD_WIDTH,
              height: BOARD_HEIGHT,
              borderRadius: 16,
              position: "relative",
              border: "1px solid #d0d0d0",
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
              boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
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
        </div>

        {/* Upload simples */}
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Upload de Assets</h2>
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

        {/* Lista */}
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Assets disponíveis</h2>
          {assets.length === 0 ? (
            <div style={{ color: "#616161" }}>Ainda não há assets.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {assets.map((a) => (
                <div
                  key={a.id}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 16,
                    padding: 12,
                    background: "#fafafa",
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{a.type}</div>
                  <div style={{ fontWeight: 600 }}>{a.name}</div>
                  <div style={{ marginTop: 8 }}>
                    <img src={a.fileUrl} style={{ width: "100%", borderRadius: 8, border: "1px solid #ddd" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
