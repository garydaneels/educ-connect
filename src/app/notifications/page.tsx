"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

interface Notif {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

const NOTIF_ICONS: Record<string, string> = {
  STAGE_ACCEPTED:       "🎉",
  APPLICATION_ACCEPTED: "✅",
  APPLICATION_REJECTED: "❌",
  NEW_MESSAGE:          "💬",
  SCHEDULE_REQUEST:     "📅",
  UNAVAILABILITY:       "🗓️",
  STAGE_STATUS_CHANGED: "📋",
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `il y a ${days} jour${days > 1 ? "s" : ""}`;
  return new Date(d).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
}

const LIMIT = 30;

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const load = useCallback(async (p: number, unread: boolean, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
    if (unread) params.set("unread", "1");
    const res = await fetch(`/api/notifications?${params}`);
    const data = await res.json();
    const notifList: Notif[] = data.notifications ?? [];
    if (append) {
      setNotifs(prev => [...prev, ...notifList]);
    } else {
      setNotifs(notifList);
    }
    setTotal(data.total ?? 0);
    if (append) setLoadingMore(false); else setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      setPage(1);
      load(1, unreadOnly);
    }
  }, [status, unreadOnly, load]);

  async function markAllRead() {
    setMarking(true);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    setMarking(false);
  }

  async function handleClick(notif: Notif) {
    if (!notif.read) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notif.id }),
      });
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    }
    if (notif.link) router.push(notif.link);
  }

  function loadMore() {
    const next = page + 1;
    setPage(next);
    load(next, unreadOnly, true);
  }

  const unreadCount = notifs.filter(n => !n.read).length;
  const hasMore = notifs.length < total;

  if (status === "loading") return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #f0f9ff 50%, #fef3c7 100%)" }}>
      <Navbar />

      <main className="flex-1 max-w-2xl mx-auto px-5 py-10 w-full">

        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-medium text-stone-900">Notifications</h1>
            <p className="text-sm text-stone-500 mt-0.5">
              {loading ? "Chargement…" : `${total} au total${unreadCount > 0 ? ` · ${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setUnreadOnly(v => !v)}
              className={`text-sm px-4 h-11 rounded-xl border transition-colors font-medium ${
                unreadOnly
                  ? "bg-sky-600 text-white border-sky-600"
                  : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {unreadOnly ? "Non lues" : "Toutes"}
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={marking}
                className="text-sm px-4 h-11 rounded-xl bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors font-medium disabled:opacity-50"
              >
                {marking ? "…" : "✓ Tout lire"}
              </button>
            )}
          </div>
        </div>

        {/* Liste */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-stone-300">
              <div className="text-4xl mb-3 animate-pulse">🔔</div>
              <p className="text-sm">Chargement…</p>
            </div>
          ) : notifs.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-4xl mb-3">🔔</p>
              <p className="text-stone-400 text-sm">
                {unreadOnly ? "Aucune notification non lue." : "Aucune notification pour le moment."}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-stone-50">
                {notifs.map(notif => (
                  <button
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={`w-full text-left px-5 py-4 hover:bg-stone-50/80 transition-colors flex items-start gap-4 ${
                      !notif.read ? "bg-sky-50/40" : ""
                    }`}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{NOTIF_ICONS[notif.type] ?? "🔔"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${notif.read ? "text-stone-600" : "font-medium text-stone-900"}`}>
                        {notif.title}
                      </p>
                      {notif.body && (
                        <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">{notif.body}</p>
                      )}
                      <p className="text-xs text-stone-300 mt-1.5">{timeAgo(notif.createdAt)}</p>
                    </div>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0 mt-2 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {hasMore && (
                <div className="px-5 py-4 border-t border-stone-50">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="w-full text-sm text-stone-500 hover:text-stone-900 font-medium transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? "Chargement…" : `Charger plus (${total - notifs.length} restante${total - notifs.length > 1 ? "s" : ""})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Session infos */}
        {session?.user?.name && (
          <p className="text-center text-xs text-stone-400 mt-6">
            Connecté en tant que <strong className="text-stone-500">{session.user.name}</strong>
          </p>
        )}
      </main>

      <Footer />
    </div>
  );
}
