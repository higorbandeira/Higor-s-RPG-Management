import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { getAccessToken, http } from "@/shared/api/http";
import { useTheme } from "@/shared/ui/useTheme";

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
  size: number;
  hpTotal: number;
  hpCurrent: number;
};

type DragState = {
  avatarId: string;
  offsetX: number;
  offsetY: number;
};

const GRID_SIZE = 40;
export function DashboardPage() {
  const { me, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const suppressNextSync = useRef(false);
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
  const [editingAvatarId, setEditingAvatarId] = useState<string | null>(null);
  const [isMapAdjustOpen, setIsMapAdjustOpen] = useState(false);
  const [mapViews, setMapViews] = useState<Record<string, { scale: number; x: number; y: number }>>({});
  const [isUploadAdjustOpen, setIsUploadAdjustOpen] = useState(false);
  const [pendingMapAdjust, setPendingMapAdjust] = useState<{ scale: number; x: number; y: number } | null>(null);

  async function loadAssets() {
    const res = await http.get("/assets");
    setAssets(res.data.items as Asset[]);
  }

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    if (type !== "MAP") {
      setPendingMapAdjust(null);
    }
  }, [type]);

  useEffect(() => {
    if (!me || wsRef.current) return;
    const token = getAccessToken();
    if (!token) return;
    const wsUrl = `${window.location.origin.replace("http", "ws")}/api/ws/board?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message?.type === "state" && message?.payload) {
          suppressNextSync.current = true;
          setSelectedMapId(message.payload.selectedMapId ?? "");
          const incoming = (message.payload.placedAvatars ?? []) as PlacedAvatar[];
          setPlacedAvatars(
            incoming.map((avatar) => ({
              ...avatar,
              size: avatar.size ?? 1,
              hpTotal: avatar.hpTotal ?? 10,
              hpCurrent: avatar.hpCurrent ?? avatar.hpTotal ?? 10,
            }))
          );
          setMapViews(message.payload.mapViews ?? {});
        }
      } catch {
        // ignore invalid payloads
      }
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };

    return () => {
      ws.close();
    };
  }, [me]);

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
  const activeAvatar = useMemo(
    () => placedAvatars.find((avatar) => avatar.id === editingAvatarId) ?? null,
    [editingAvatarId, placedAvatars]
  );
  const currentMapView = useMemo(() => {
    if (!selectedMapId) {
      return { scale: 100, x: 50, y: 50 };
    }
    return mapViews[selectedMapId] ?? { scale: 100, x: 50, y: 50 };
  }, [mapViews, selectedMapId]);
  const uploadMapView = useMemo(
    () => pendingMapAdjust ?? { scale: 100, x: 50, y: 50 },
    [pendingMapAdjust]
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
      const res = await http.post("/assets/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const createdAsset = res.data as Asset;
      setName("");
      setFile(null);
      if (type === "MAP" && pendingMapAdjust) {
        setMapViews((prev) => ({
          ...prev,
          [createdAsset.id]: pendingMapAdjust,
        }));
        setSelectedMapId(createdAsset.id);
        setPendingMapAdjust(null);
      }
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
    const { maxX, maxY } = getBoardBounds();
    const avatarId = `${asset.id}-${Date.now()}`;
    setPlacedAvatars((prev) => [
      ...prev,
      {
        id: avatarId,
        assetId: asset.id,
        name: asset.name,
        fileUrl: asset.fileUrl,
        x: clamp(GRID_SIZE, 0, maxX),
        y: clamp(GRID_SIZE, 0, maxY),
        size: 1,
        hpTotal: 10,
        hpCurrent: 10,
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
              x: clamp(nextX, 0, getBoardBounds(avatar.size).maxX),
              y: clamp(nextY, 0, getBoardBounds(avatar.size).maxY),
            }
          : avatar
      )
    );
  }

  function handlePointerUp() {
    if (dragState) {
      setPlacedAvatars((prev) =>
        prev.map((avatar) => {
          if (avatar.id !== dragState.avatarId) {
            return avatar;
          }
          const snappedX = Math.round(avatar.x / GRID_SIZE) * GRID_SIZE;
          const snappedY = Math.round(avatar.y / GRID_SIZE) * GRID_SIZE;
          const bounds = getBoardBounds(avatar.size);
          return {
            ...avatar,
            x: clamp(snappedX, 0, bounds.maxX),
            y: clamp(snappedY, 0, bounds.maxY),
          };
        })
      );
    }
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
              x: clamp(avatar.x + delta.x, 0, getBoardBounds(avatar.size).maxX),
              y: clamp(avatar.y + delta.y, 0, getBoardBounds(avatar.size).maxY),
            }
          : avatar
      )
    );
  }

  function getBoardBounds(size = 1) {
    const board = boardRef.current;
    if (!board) {
      return { maxX: 0, maxY: 0 };
    }
    const sizePx = GRID_SIZE * size;
    return {
      maxX: Math.max(board.clientWidth - sizePx, 0),
      maxY: Math.max(board.clientHeight - sizePx, 0),
    };
  }

  useEffect(() => {
    if (suppressNextSync.current) {
      suppressNextSync.current = false;
      return;
    }
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        type: "state",
        payload: {
          selectedMapId,
          placedAvatars,
          mapViews,
        },
      })
    );
  }, [selectedMapId, placedAvatars, mapViews]);

  const isDark = theme === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)";
  const pageStyle = {
    minHeight: "100vh",
    background: isDark ? "#0b0b0b" : "#f5f5f5",
    fontFamily: "'Inter', 'Roboto', system-ui, sans-serif",
  };
  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 14,
    border: isDark ? "1px solid #333333" : "1px solid #d0d0d0",
    background: isDark ? "#0f0f0f" : "#ffffff",
    color: isDark ? "#f5f5f5" : "#111111",
    fontSize: 14,
  };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: isDark ? "#d0d0d0" : "#424242" };
  const buttonStyle = {
    padding: "10px 18px",
    borderRadius: 999,
    border: "none",
    background: isDark ? "#ffffff" : "#111111",
    color: isDark ? "#111111" : "#ffffff",
    fontWeight: 600,
    cursor: "pointer",
    opacity: 0.9,
    transition: "opacity 0.2s ease",
  };
  const floatingButtonStyle = {
    width: 56,
    height: 56,
    borderRadius: 999,
    border: "none",
    background: isDark ? "#ffffff" : "#111111",
    color: isDark ? "#111111" : "#ffffff",
    fontSize: 24,
    fontWeight: 600,
    cursor: "pointer",
    opacity: 0.9,
    transition: "opacity 0.2s ease",
    boxShadow: "0 16px 30px rgba(0,0,0,0.2)",
  };
  const handleButtonEnter = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.style.opacity = "1";
  };
  const handleButtonLeave = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.style.opacity = "0.9";
  };

  return (
    <div style={pageStyle}>
      <div style={{ position: "relative", width: "100%", height: "100vh" }}>
        <div
          style={{
            position: "fixed",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 12,
            fontSize: 10,
            color: isDark ? "#f5f5f5" : "#111111",
            zIndex: 12,
            background: isDark ? "#111111" : "#ffffff",
            border: isDark ? "1px solid #2b2b2b" : "1px solid #e0e0e0",
            borderRadius: 999,
            padding: "6px 12px",
            boxShadow: "0 8px 16px rgba(0,0,0,0.12)",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input
              type="radio"
              name="theme"
              checked={theme === "light"}
              onChange={() => setTheme("light")}
            />
            white
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input
              type="radio"
              name="theme"
              checked={theme === "dark"}
              onChange={() => setTheme("dark")}
            />
            black
          </label>
        </div>
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
            backgroundColor: isDark ? "#0f0f0f" : "#f8f8f8",
            backgroundImage: selectedMap
              ? `linear-gradient(to right, ${gridColor} 1px, transparent 1px),
                 linear-gradient(to bottom, ${gridColor} 1px, transparent 1px),
                 url(${selectedMap.fileUrl})`
              : `linear-gradient(to right, ${gridColor} 1px, transparent 1px),
                 linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`,
            backgroundSize: selectedMap
              ? `${GRID_SIZE}px ${GRID_SIZE}px, ${GRID_SIZE}px ${GRID_SIZE}px, ${currentMapView.scale}%`
              : `${GRID_SIZE}px ${GRID_SIZE}px, ${GRID_SIZE}px ${GRID_SIZE}px`,
            backgroundPosition: selectedMap
              ? `0 0, 0 0, ${currentMapView.x}% ${currentMapView.y}%`
              : "0 0, 0 0",
            touchAction: "none",
          }}
        >
          {placedAvatars.map((avatar) => (
            <button
              key={avatar.id}
              type="button"
              onPointerDown={(event) => handlePointerDown(event, avatar.id)}
              onClick={() => {
                setActiveAvatarId(avatar.id);
                setEditingAvatarId(avatar.id);
              }}
              title={`Editar ${avatar.name}`}
              onMouseEnter={handleButtonEnter}
              onMouseLeave={handleButtonLeave}
              style={{
                position: "absolute",
                left: avatar.x,
                top: avatar.y,
                width: GRID_SIZE * avatar.size,
                height: GRID_SIZE * avatar.size,
                padding: 0,
                borderRadius: 0,
                border:
                  avatar.id === activeAvatarId ? "2px solid #4f46e5" : "1px solid rgba(0,0,0,0.15)",
                background: "rgba(255,255,255,0.9)",
                cursor: "grab",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.9,
                transition: "opacity 0.2s ease",
              }}
            >
              <img
                src={avatar.fileUrl}
                alt={avatar.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 0 }}
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
            background: isDark ? "rgba(17,17,17,0.9)" : "rgba(255,255,255,0.9)",
            padding: "8px 14px",
            borderRadius: 999,
            fontSize: 12,
            color: isDark ? "#f5f5f5" : "#424242",
            boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span>{me?.nickname ? `Logado como ${me.nickname}` : "Dashboard"}</span>
          <button
            onClick={logout}
            style={{ ...buttonStyle, padding: "6px 12px" }}
            title="Sair"
            onMouseEnter={handleButtonEnter}
            onMouseLeave={handleButtonLeave}
          >
            Sair
          </button>
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
          <button
            onClick={() => setIsActionsOpen(true)}
            style={floatingButtonStyle}
            aria-label="Abrir ações"
            title="Abrir ações"
            onMouseEnter={handleButtonEnter}
            onMouseLeave={handleButtonLeave}
          >
            +
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
                background: isDark ? "#111111" : "#ffffff",
                width: "100%",
                maxWidth: 980,
                borderRadius: 24,
                padding: 24,
                boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
                display: "grid",
                gap: 24,
                color: isDark ? "#f5f5f5" : "#111111",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ margin: 0, color: isDark ? "#ffffff" : "#111111" }}>Ações rápidas</h2>
                  <p style={{ margin: "6px 0 0", color: isDark ? "#bdbdbd" : "#616161" }}>
                    Selecione mapas e avatares existentes ou faça upload de novos assets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActionsOpen(false)}
                  style={{
                    ...buttonStyle,
                    background: isDark ? "#111111" : "#ffffff",
                    color: isDark ? "#ffffff" : "#111111",
                    border: `1px solid ${isDark ? "#ffffff" : "#111111"}`,
                  }}
                  title="Fechar"
                  onMouseEnter={handleButtonEnter}
                  onMouseLeave={handleButtonLeave}
                >
                  Fechar
                </button>
              </div>

              <div style={{ display: "grid", gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 8, color: isDark ? "#ffffff" : "#111111" }}>Mapas</div>
                  {maps.length === 0 ? (
                    <div style={{ color: isDark ? "#bdbdbd" : "#616161" }}>Nenhum mapa enviado.</div>
                  ) : (
                    <div
                      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}
                    >
                      {maps.map((mapAsset) => (
                        <button
                          key={mapAsset.id}
                          type="button"
                          onClick={() => setSelectedMapId(mapAsset.id)}
                          title={`Selecionar mapa ${mapAsset.name}`}
                          onMouseEnter={handleButtonEnter}
                          onMouseLeave={handleButtonLeave}
                          style={{
                            border: mapAsset.id === selectedMapId ? "2px solid #111111" : "1px solid #e0e0e0",
                            borderRadius: 16,
                            padding: 8,
                            background: isDark ? "#151515" : "#fafafa",
                            cursor: "pointer",
                            textAlign: "left",
                            opacity: 0.9,
                            transition: "opacity 0.2s ease",
                          }}
                        >
                          <img
                            src={mapAsset.fileUrl}
                            alt={mapAsset.name}
                            style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 12 }}
                          />
                          <div style={{ marginTop: 6, fontSize: 13, color: isDark ? "#f5f5f5" : "#111111" }}>
                            {mapAsset.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setIsMapAdjustOpen(true)}
                    disabled={!selectedMapId}
                    style={{ ...buttonStyle, opacity: selectedMapId ? 0.9 : 0.5 }}
                    title="Ajustar mapa"
                    onMouseEnter={handleButtonEnter}
                    onMouseLeave={handleButtonLeave}
                  >
                    Ajustar mapa
                  </button>
                </div>

                <div>
                  <div style={{ fontWeight: 600, marginBottom: 8, color: isDark ? "#ffffff" : "#111111" }}>
                    Avatares
                  </div>
                  {avatars.length === 0 ? (
                    <div style={{ color: isDark ? "#bdbdbd" : "#616161" }}>Nenhum avatar enviado.</div>
                  ) : (
                    <div
                      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12 }}
                    >
                      {avatars.map((avatar) => (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => {
                            setSelectedAvatarId(avatar.id);
                            handleAddAvatarFrom(avatar);
                          }}
                          title={`Adicionar avatar ${avatar.name}`}
                          onMouseEnter={handleButtonEnter}
                          onMouseLeave={handleButtonLeave}
                          style={{
                            border: "1px solid #e0e0e0",
                            borderRadius: 16,
                            padding: 8,
                            background: isDark ? "#151515" : "#fafafa",
                            cursor: "pointer",
                            textAlign: "center",
                            opacity: 0.9,
                            transition: "opacity 0.2s ease",
                          }}
                        >
                          <img
                            src={avatar.fileUrl}
                            alt={avatar.name}
                            style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 12 }}
                          />
                          <div style={{ marginTop: 6, fontSize: 12, color: isDark ? "#f5f5f5" : "#111111" }}>
                            {avatar.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ borderTop: "1px solid #eee", paddingTop: 16 }}>
                <h3 style={{ marginTop: 0, color: isDark ? "#ffffff" : "#111111" }}>Enviar novo asset</h3>
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

                  {previewUrl && type === "MAP" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!pendingMapAdjust) {
                          setPendingMapAdjust({ scale: 100, x: 50, y: 50 });
                        }
                        setIsUploadAdjustOpen(true);
                      }}
                      style={{ ...buttonStyle, marginTop: 12 }}
                      title="Ajustar imagem antes do upload"
                      onMouseEnter={handleButtonEnter}
                      onMouseLeave={handleButtonLeave}
                    >
                      Ajustar imagem
                    </button>
                  )}

                  {error && <div style={{ marginTop: 12, color: isDark ? "#ff6b6b" : "#b00020" }}>{error}</div>}

                  <button
                    type="submit"
                    disabled={busy}
                    style={{ ...buttonStyle, marginTop: 12, opacity: busy ? 0.7 : buttonStyle.opacity }}
                    title="Upload de asset"
                    onMouseEnter={handleButtonEnter}
                    onMouseLeave={handleButtonLeave}
                  >
                    {busy ? "Enviando..." : "Upload"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {isUploadAdjustOpen && previewUrl && (
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
              zIndex: 25,
            }}
          >
            <div
              style={{
                background: isDark ? "#111111" : "#ffffff",
                width: "100%",
                maxWidth: 560,
                borderRadius: 20,
                padding: 24,
                boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
                color: isDark ? "#f5f5f5" : "#111111",
                display: "grid",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0 }}>Ajustar imagem do mapa</h3>
                  <div style={{ color: isDark ? "#bdbdbd" : "#616161", fontSize: 12 }}>
                    Enquadre a imagem antes do upload.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUploadAdjustOpen(false)}
                  style={{
                    ...buttonStyle,
                    background: isDark ? "#111111" : "#ffffff",
                    color: isDark ? "#ffffff" : "#111111",
                    border: `1px solid ${isDark ? "#ffffff" : "#111111"}`,
                  }}
                  title="Fechar"
                  onMouseEnter={handleButtonEnter}
                  onMouseLeave={handleButtonLeave}
                >
                  Fechar
                </button>
              </div>

              <div
                style={{
                  borderRadius: 16,
                  border: isDark ? "1px solid #2b2b2b" : "1px solid #e0e0e0",
                  overflow: "hidden",
                  height: 220,
                  backgroundImage: `url(${previewUrl})`,
                  backgroundSize: `${uploadMapView.scale}%`,
                  backgroundPosition: `${uploadMapView.x}% ${uploadMapView.y}%`,
                  backgroundRepeat: "no-repeat",
                }}
              />

              <div style={{ display: "grid", gap: 12 }}>
                <div
                  style={{
                    borderRadius: 16,
                    border: isDark ? "1px solid #2b2b2b" : "1px solid #e0e0e0",
                    overflow: "hidden",
                    height: 180,
                    backgroundColor: isDark ? "#0f0f0f" : "#f8f8f8",
                    backgroundImage: `linear-gradient(to right, ${gridColor} 1px, transparent 1px),
                      linear-gradient(to bottom, ${gridColor} 1px, transparent 1px),
                      url(${selectedMap.fileUrl})`,
                    backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px, ${GRID_SIZE}px ${GRID_SIZE}px, ${currentMapView.scale}%`,
                    backgroundPosition: `0 0, 0 0, ${currentMapView.x}% ${currentMapView.y}%`,
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <label style={labelStyle}>Escala (%)</label>
                <input
                  type="range"
                  min={80}
                  max={200}
                  value={uploadMapView.scale}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setPendingMapAdjust({ ...uploadMapView, scale: value });
                  }}
                />

                <label style={labelStyle}>Posição horizontal</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={uploadMapView.x}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setPendingMapAdjust({ ...uploadMapView, x: value });
                  }}
                />

                <label style={labelStyle}>Posição vertical</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={uploadMapView.y}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setPendingMapAdjust({ ...uploadMapView, y: value });
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {editingAvatarId && activeAvatar && (
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
              zIndex: 30,
            }}
          >
            <div
              style={{
                background: isDark ? "#111111" : "#ffffff",
                width: "100%",
                maxWidth: 460,
                borderRadius: 20,
                padding: 24,
                boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
                color: isDark ? "#f5f5f5" : "#111111",
                display: "grid",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0 }}>{activeAvatar.name}</h3>
                  <div style={{ color: isDark ? "#bdbdbd" : "#616161", fontSize: 12 }}>
                    Ajuste tamanho e pontos de vida
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingAvatarId(null)}
                  style={{
                    ...buttonStyle,
                    background: isDark ? "#111111" : "#ffffff",
                    color: isDark ? "#ffffff" : "#111111",
                    border: `1px solid ${isDark ? "#ffffff" : "#111111"}`,
                  }}
                  title="Fechar"
                  onMouseEnter={handleButtonEnter}
                  onMouseLeave={handleButtonLeave}
                >
                  Fechar
                </button>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <label style={labelStyle}>Pontos de vida total</label>
                <input
                  type="number"
                  min={1}
                  value={activeAvatar.hpTotal}
                  onChange={(event) => {
                    const value = Math.max(Number(event.target.value), 1);
                    setPlacedAvatars((prev) =>
                      prev.map((avatar) =>
                        avatar.id === activeAvatar.id
                          ? { ...avatar, hpTotal: value, hpCurrent: Math.min(avatar.hpCurrent, value) }
                          : avatar
                      )
                    );
                  }}
                  style={inputStyle}
                />

                <label style={labelStyle}>Pontos de vida atual</label>
                <input
                  type="number"
                  min={0}
                  max={activeAvatar.hpTotal}
                  value={activeAvatar.hpCurrent}
                  onChange={(event) => {
                    const value = Math.min(Math.max(Number(event.target.value), 0), activeAvatar.hpTotal);
                    setPlacedAvatars((prev) =>
                      prev.map((avatar) => (avatar.id === activeAvatar.id ? { ...avatar, hpCurrent: value } : avatar))
                    );
                  }}
                  style={inputStyle}
                />

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={labelStyle}>Tamanho</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPlacedAvatars((prev) =>
                        prev.map((avatar) =>
                          avatar.id === activeAvatar.id
                            ? {
                                ...avatar,
                                size: Math.max(0.5, avatar.size - 0.25),
                                x: clamp(avatar.x, 0, getBoardBounds(Math.max(0.5, avatar.size - 0.25)).maxX),
                                y: clamp(avatar.y, 0, getBoardBounds(Math.max(0.5, avatar.size - 0.25)).maxY),
                              }
                            : avatar
                        )
                      );
                    }}
                    style={buttonStyle}
                    title="Diminuir tamanho"
                    onMouseEnter={handleButtonEnter}
                    onMouseLeave={handleButtonLeave}
                  >
                    -
                  </button>
                  <div style={{ minWidth: 40, textAlign: "center" }}>{activeAvatar.size.toFixed(2)}x</div>
                  <button
                    type="button"
                    onClick={() => {
                      setPlacedAvatars((prev) =>
                        prev.map((avatar) =>
                          avatar.id === activeAvatar.id
                            ? {
                                ...avatar,
                                size: Math.min(3, avatar.size + 0.25),
                                x: clamp(avatar.x, 0, getBoardBounds(Math.min(3, avatar.size + 0.25)).maxX),
                                y: clamp(avatar.y, 0, getBoardBounds(Math.min(3, avatar.size + 0.25)).maxY),
                              }
                            : avatar
                        )
                      );
                    }}
                    style={buttonStyle}
                    title="Aumentar tamanho"
                    onMouseEnter={handleButtonEnter}
                    onMouseLeave={handleButtonLeave}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isMapAdjustOpen && selectedMap && (
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
              zIndex: 25,
            }}
          >
            <div
              style={{
                background: isDark ? "#111111" : "#ffffff",
                width: "100%",
                maxWidth: 560,
                borderRadius: 20,
                padding: 24,
                boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
                color: isDark ? "#f5f5f5" : "#111111",
                display: "grid",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0 }}>Ajustar mapa</h3>
                  <div style={{ color: isDark ? "#bdbdbd" : "#616161", fontSize: 12 }}>
                    Ajuste escala e posição para enquadrar a imagem.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMapAdjustOpen(false)}
                  style={{
                    ...buttonStyle,
                    background: isDark ? "#111111" : "#ffffff",
                    color: isDark ? "#ffffff" : "#111111",
                    border: `1px solid ${isDark ? "#ffffff" : "#111111"}`,
                  }}
                  title="Fechar"
                  onMouseEnter={handleButtonEnter}
                  onMouseLeave={handleButtonLeave}
                >
                  Fechar
                </button>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <label style={labelStyle}>Escala (%)</label>
                <input
                  type="range"
                  min={80}
                  max={200}
                  value={currentMapView.scale}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setMapViews((prev) => ({
                      ...prev,
                      [selectedMap.id]: { ...currentMapView, scale: value },
                    }));
                  }}
                />

                <label style={labelStyle}>Posição horizontal</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={currentMapView.x}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setMapViews((prev) => ({
                      ...prev,
                      [selectedMap.id]: { ...currentMapView, x: value },
                    }));
                  }}
                />

                <label style={labelStyle}>Posição vertical</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={currentMapView.y}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setMapViews((prev) => ({
                      ...prev,
                      [selectedMap.id]: { ...currentMapView, y: value },
                    }));
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
