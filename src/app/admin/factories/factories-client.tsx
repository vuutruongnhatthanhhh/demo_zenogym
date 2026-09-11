"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import type { Factory } from "@/lib/types";

export function FactoriesClient({ initialFactories }: { initialFactories: Factory[] }) {
  const [factories, setFactories] = useState(initialFactories);
  const [newName, setNewName] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingCountry, setEditingCountry] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/factories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, country: newCountry.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Có lỗi xảy ra");
      setFactories((prev) => [...prev, data.factory].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setNewCountry("");
      toast.success("Đã thêm nhà máy");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(factory: Factory) {
    setEditingId(factory.id);
    setEditingName(factory.name);
    setEditingCountry(factory.country ?? "");
  }

  async function handleSaveEdit(id: string) {
    const name = editingName.trim();
    if (!name) return;
    setSavingId(id);
    try {
      const res = await fetch(`/api/factories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, country: editingCountry.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Có lỗi xảy ra");
      setFactories((prev) => prev.map((f) => (f.id === id ? data.factory : f)));
      setEditingId(null);
      toast.success("Đã cập nhật");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(factory: Factory) {
    if (!confirm(`Xoá nhà máy "${factory.name}"?`)) return;
    const res = await fetch(`/api/factories/${factory.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Xoá thất bại");
      return;
    }
    setFactories((prev) => prev.filter((f) => f.id !== factory.id));
    toast.success("Đã xoá");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Nhà máy</h1>
        <p className="text-sm text-muted-foreground">{factories.length} nhà máy sản xuất</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2 pt-6 sm:flex-row">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tên nhà máy"
            className="sm:flex-1"
          />
          <Input
            value={newCountry}
            onChange={(e) => setNewCountry(e.target.value)}
            placeholder="Quốc gia (không bắt buộc)"
            className="sm:w-48"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Thêm
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {factories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có nhà máy nào.</p>
        ) : (
          factories.map((factory) => (
            <Card key={factory.id}>
              <CardContent className="flex items-center justify-between gap-2 p-3">
                {editingId === factory.id ? (
                  <div className="flex flex-1 gap-2">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="h-8"
                      autoFocus
                    />
                    <Input
                      value={editingCountry}
                      onChange={(e) => setEditingCountry(e.target.value)}
                      className="h-8 w-40"
                      placeholder="Quốc gia"
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(factory.id)}
                    />
                  </div>
                ) : (
                  <span className="text-sm font-medium">
                    {factory.name}
                    {factory.country ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {factory.country}
                      </span>
                    ) : null}
                  </span>
                )}
                <div className="flex shrink-0 gap-1">
                  {editingId === factory.id ? (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleSaveEdit(factory.id)}
                        disabled={savingId === factory.id}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => startEdit(factory)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(factory)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
