"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { cn, fmtLKR, fmtUSD } from "@/lib/utils";
import { channelById, type ChannelId, type BookingStatus } from "@/lib/mock-data";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="text-neutral-500 mt-2 text-sm font-medium">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("bg-white border border-neutral-100 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)]", className)}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{children}</h2>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ElementType;
  hint?: React.ReactNode;
}) {
  return (
    <div className="bg-soft border border-neutral-100 rounded-2xl p-6 hover:border-neutral-200 transition-colors">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</h3>
        {Icon && (
          <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-neutral-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <p className="text-2xl leading-tight font-bold tracking-tight text-ink whitespace-nowrap">{value}</p>
      {sub && <p className="mt-2 text-xs font-medium text-neutral-400">{sub}</p>}
      {hint && <div className="mt-4">{hint}</div>}
    </div>
  );
}

const TONES = {
  neutral: "bg-neutral-100 text-neutral-600",
  indigo: "bg-indigo-50 text-indigo-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-600",
  blue: "bg-sky-50 text-sky-700",
};

export function Badge({ tone = "neutral", children, dot }: { tone?: keyof typeof TONES; children: React.ReactNode; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap", TONES[tone])}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

const STATUS: Record<BookingStatus, { label: string; tone: keyof typeof TONES }> = {
  enquiry: { label: "Enquiry", tone: "neutral" },
  confirmed: { label: "Confirmed", tone: "indigo" },
  checked_in: { label: "Staying", tone: "green" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "red" },
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const s = STATUS[status];
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

export function ChannelTag({ id, className }: { id: ChannelId; className?: string }) {
  const c = channelById(id);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500", className)}>
      <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
      {c.name}
    </span>
  );
}

export function Money({ lkr, className, size = "base" }: { lkr: number; className?: string; size?: "base" | "lg" }) {
  return (
    <span className={cn("inline-flex flex-col", className)}>
      <span className={cn("font-bold tracking-tight text-ink", size === "lg" ? "text-lg" : "text-sm")}>{fmtLKR(lkr)}</span>
      <span className="text-[11px] font-medium text-neutral-400">{fmtUSD(lkr)}</span>
    </span>
  );
}

export function Segmented<T extends string>({
  id,
  options,
  value,
  onChange,
}: {
  id: string;
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-soft border border-neutral-100 p-1.5 rounded-xl w-fit max-w-full overflow-x-auto no-scrollbar">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap",
            value === o.value ? "text-ink" : "text-neutral-500 hover:text-neutral-900"
          )}
        >
          {value === o.value && (
            <motion.div
              layoutId={`seg-${id}`}
              className="absolute inset-0 bg-white rounded-lg shadow-sm border border-neutral-200/50"
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {o.label}
            {o.count !== undefined && (
              <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", value === o.value ? "bg-neutral-100" : "bg-neutral-200/50")}>
                {o.count}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 text-sm font-semibold rounded-xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none",
        variant === "primary" && "bg-neutral-900 hover:bg-black text-white px-4 py-2.5 shadow-sm",
        variant === "secondary" && "bg-white border border-neutral-200 hover:border-neutral-300 text-ink px-4 py-2.5",
        variant === "ghost" && "text-neutral-500 hover:text-ink hover:bg-neutral-100 px-3 py-2",
        className
      )}
    >
      {children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-neutral-700 block mb-1.5">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-neutral-400 mt-1 block">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full px-3.5 py-2.5 bg-neutral-50/70 border border-neutral-200/90 rounded-xl text-sm font-medium text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all placeholder:text-neutral-400";

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-neutral-900/20 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed z-[70] top-0 right-0 h-dvh w-full sm:w-[480px] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.08)] flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 40 }}
          >
            <div className="flex items-start justify-between px-8 pt-8 pb-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-ink">{title}</h2>
                {subtitle && <p className="text-sm text-neutral-500 mt-1 font-medium">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-ink transition-colors" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-8 pb-8">{children}</div>
            {footer && <div className="px-8 py-5 border-t border-neutral-100">{footer}</div>}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const parts = name.split(" ");
  return (
    <div className={cn("w-10 h-10 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center font-bold text-xs shrink-0 ring-4 ring-soft", className)}>
      {(parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase()}
    </div>
  );
}

export function Empty({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <div className="bg-soft border border-neutral-100 rounded-2xl py-14 px-6 flex flex-col items-center text-center">
      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-neutral-200/50 mb-4">
        <Icon className="w-5 h-5 text-neutral-400" />
      </div>
      <h3 className="text-base font-bold tracking-tight text-ink mb-1">{title}</h3>
      <p className="text-neutral-500 max-w-xs text-sm font-medium">{text}</p>
    </div>
  );
}
