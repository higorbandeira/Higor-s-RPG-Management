import { useEffect, useMemo, useState } from "react";
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

export function DashboardPage() {
  const { me, logout } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [type, setType] = useState<"MAP" | "AVATAR">("MAP");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAssets() {
    const res = await http.get("/assets");
    setAssets(res.data.items as Asset[]);
  }

  useEffect(() => {
    loadAssets();
  }, []);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

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

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <div style={{ opacity: 0.7 }}>Logado como: {me?.nickname}</div>
        </div>
        <button onClick={logout}>Sair</button>
      </div>

      {/* MVP do tabuleiro */}
      <div
        style={{
          marginTop: 24,
          border: "1px dashed #aaa",
          height: 420,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fafafa",
        }}
      >
        <span>🧩 Tabuleiro (MVP placeholder) — próximo passo: grid 2D em tempo real</span>
      </div>

      {/* Upload simples */}
      <div style={{ marginTop: 24, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>Upload de Assets</h2>
        <form onSubmit={handleUpload}>
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, alignItems: "center" }}>
            <label>Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="MAP">Mapa</option>
              <option value="AVATAR">Avatar</option>
            </select>

            <label>Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Floresta 01" />

            <label>Arquivo (png/jpg/webp)</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {previewUrl && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Prévia:</div>
              <img src={previewUrl} style={{ maxWidth: 320, borderRadius: 8, border: "1px solid #ddd" }} />
            </div>
          )}

          {error && <div style={{ marginTop: 12, color: "crimson" }}>{error}</div>}

          <button type="submit" disabled={busy} style={{ marginTop: 12 }}>
            {busy ? "Enviando..." : "Enviar"}
          </button>
        </form>
      </div>

      {/* Lista */}
      <div style={{ marginTop: 24 }}>
        <h2>Assets disponíveis</h2>
        {assets.length === 0 ? (
          <div style={{ opacity: 0.7 }}>Ainda não há assets.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {assets.map((a) => (
              <div key={a.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
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
  );
}
