import { cn } from "@/lib/utils";

export function ProductFilterTabs({
  label,
  options,
  total,
  value,
  onChange,
}: {
  label: string;
  options: { id: string; name: string; count: number }[];
  total: number;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1 border-b">
      <span className="pl-3 pr-1 text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <ProductFilterTab
        label="Tất cả"
        count={total}
        active={value === ""}
        onClick={() => onChange("")}
      />
      {options.map(({ id, name, count }) => (
        <ProductFilterTab
          key={id}
          label={name}
          count={count}
          active={value === id}
          onClick={() => onChange(id)}
        />
      ))}
    </div>
  );
}

export function ProductFilterTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {label}{" "}
      <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground">
        {count}
      </span>
    </button>
  );
}
