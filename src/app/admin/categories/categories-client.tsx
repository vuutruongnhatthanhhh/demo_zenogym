"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import type { Category } from "@/lib/types";

export function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Có lỗi xảy ra");
      setCategories((prev) => [...prev, data.category].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      toast.success("Đã thêm loại sản phẩm");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditingName(category.name);
  }

  async function handleSaveEdit(id: string) {
    const name = editingName.trim();
    if (!name) return;
    setSavingId(id);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Có lỗi xảy ra");
      setCategories((prev) => prev.map((c) => (c.id === id ? data.category : c)));
      setEditingId(null);
      toast.success("Đã cập nhật");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(category: Category) {
    if (!confirm(`Xoá loại sản phẩm "${category.name}"?`)) return;
    const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Xoá thất bại");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== category.id));
    toast.success("Đã xoá");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Loại sản phẩm</h1>
        <p className="text-sm text-muted-foreground">{categories.length} loại thiết bị</p>
      </div>

      <Card>
        <CardContent className="flex gap-2 pt-6">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tên loại sản phẩm mới, ví dụ: Máy chạy bộ"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Thêm
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có loại sản phẩm nào.</p>
        ) : (
          categories.map((category) => (
            <Card key={category.id}>
              <CardContent className="flex items-center justify-between gap-2 p-3">
                {editingId === category.id ? (
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="h-8"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(category.id)}
                  />
                ) : (
                  <span className="text-sm font-medium">{category.name}</span>
                )}
                <div className="flex shrink-0 gap-1">
                  {editingId === category.id ? (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleSaveEdit(category.id)}
                        disabled={savingId === category.id}
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
                        onClick={() => startEdit(category)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(category)}
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
