import { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Plus,
  X,
  BookOpen,
  RotateCcw,
  StickyNote,
  ChevronDown,
  LogOut,
  Users,
  Lock,
  ShieldCheck,
  Star,
  Sparkles,
  Award,
  Dices,
  Library,
  User,
  GraduationCap,
  UserCog,
  CheckCircle2,
  Clock3,
  Inbox,
  Bookmark,
  LayoutGrid,
  Calendar,
  Tag,
  PenLine,
  Pencil,
  Ban,
  Trash2,
  School,
  Building2,
} from "lucide-react";

// ---- Palette ----
// #2E1A47 deep library green (ink/spine)
// #F5EEFB aged paper cream (background)
// #FFFCFE card paper (lighter)
// #7A2E6B oxblood (accent / stamp)
// #A66DD4 brass (secondary accent)
// #241830 ink black (text)

const SPINE_COLORS = ["#2E1A47", "#7A2E6B", "#4A2574", "#6C3483", "#8E44AD", "#5B2C6F"];

const ROLE_LABEL = { admin: "Súper usuario", docente: "Docente", alumno: "Alumno" };
const ROLE_ICON = { admin: UserCog, docente: GraduationCap, alumno: User };

const GENRES = [
  "Novela",
  "Cuento",
  "Poesía",
  "Ensayo",
  "Ciencia ficción",
  "Fantasía",
  "Misterio y policial",
  "Terror",
  "Historia",
  "Biografía",
  "Ciencia y divulgación",
  "Autoayuda",
  "Infantil",
  "Juvenil",
  "Cómic / Novela gráfica",
  "Teatro",
  "Otro",
];

const PERMS = {
  admin: { addBook: true, lend: true, return: true, deleteBook: true, manageUsers: true, manageSchools: true, manageEditorials: true, request: false },
  docente: { addBook: true, lend: true, return: true, deleteBook: false, manageUsers: false, manageSchools: false, manageEditorials: false, request: false },
  alumno: { addBook: false, lend: false, return: false, deleteBook: false, manageUsers: false, manageSchools: false, manageEditorials: false, request: true },
};

function spineColorFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return SPINE_COLORS[h % SPINE_COLORS.length];
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(iso) {
  const d = new Date(iso + "T00:00:00");
  const t = new Date(todayISO() + "T00:00:00");
  return Math.round((d - t) / 86400000);
}

function avgRating(book) {
  if (!book.ratings || book.ratings.length === 0) return null;
  const sum = book.ratings.reduce((acc, r) => acc + r.value, 0);
  return sum / book.ratings.length;
}

function isNew(book) {
  if (!book.createdAt) return false;
  const daysOld = Math.round((new Date(todayISO()) - new Date(book.createdAt)) / 86400000);
  return daysOld <= 7 && daysOld >= 0;
}

const BOOKS_KEY = "library-books";
const USERS_KEY = "library-users";
const SCHOOLS_KEY = "library-schools";
const EDITORIALS_KEY = "library-editorials";

const DEFAULT_SCHOOLS = [{ id: "esc-1", name: "Escuela Secundaria Generativa Rural" }];
const DEFAULT_EDITORIALS = [
  { id: "ed-1", name: "Planeta" },
  { id: "ed-2", name: "Alfaguara" },
  { id: "ed-3", name: "Sudamericana" },
];

const SAMPLE_BOOKS = [
  {
    id: uid(),
    title: "Cien años de soledad",
    author: "Gabriel García Márquez",
    genre: "Novela",
    condition: "Bueno",
    notes: "",
    status: "available",
    loan: null,
    history: [],
    createdAt: "2026-06-01",
    ratings: [{ by: "Docente", value: 5 }],
    schoolId: "esc-1",
    editorialId: "ed-2",
  },
  {
    id: uid(),
    title: "El nombre del viento",
    author: "Patrick Rothfuss",
    genre: "Fantasía",
    condition: "Como nuevo",
    notes: "Edición tapa dura",
    status: "loaned",
    loan: { borrower: "Marina", dateOut: todayISO(), dueDate: todayISO(), notes: "" },
    history: [],
    createdAt: todayISO(),
    ratings: [],
    schoolId: "esc-1",
    editorialId: "ed-1",
  },
];

const DEFAULT_USERS = [
  { id: uid(), username: "admin", password: "admin123", name: "Administrador", role: "admin", schoolId: null },
  { id: uid(), username: "docente", password: "docente123", name: "Docente", role: "docente", schoolId: null },
  { id: uid(), username: "alumno", password: "alumno123", name: "Alumno", role: "alumno", schoolId: "esc-1" },
  { id: uid(), username: "jose.perez", password: "alumno123", name: "José Pérez", role: "alumno", schoolId: "esc-1" },
  { id: uid(), username: "lautaro.gomez", password: "alumno123", name: "Lautaro Gómez", role: "alumno", schoolId: "esc-1" },
];

export default function Biblioteca() {
  const [books, setBooks] = useState(null);
  const [users, setUsers] = useState(null);
  const [schools, setSchools] = useState(null);
  const [editorials, setEditorials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("todos");
  const [genreFilter, setGenreFilter] = useState("todos");
  const [schoolFilter, setSchoolFilter] = useState("todas");
  const [editorialFilter, setEditorialFilter] = useState("todas");
  const [showAdd, setShowAdd] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showSchools, setShowSchools] = useState(false);
  const [showEditorials, setShowEditorials] = useState(false);
  const [loanModal, setLoanModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [surprise, setSurprise] = useState(null);
  const [toast, setToast] = useState(null);

  const lastSyncedBooks = useRef(null);
  const lastSyncedUsers = useRef(null);
  const lastSyncedSchools = useRef(null);
  const lastSyncedEditorials = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [booksRes, usersRes, schoolsRes, editorialsRes] = await Promise.allSettled([
          window.storage.get(BOOKS_KEY, true),
          window.storage.get(USERS_KEY, true),
          window.storage.get(SCHOOLS_KEY, true),
          window.storage.get(EDITORIALS_KEY, true),
        ]);
        const booksValue = booksRes.status === "fulfilled" && booksRes.value ? booksRes.value.value : JSON.stringify(SAMPLE_BOOKS);
        const usersValue = usersRes.status === "fulfilled" && usersRes.value ? usersRes.value.value : JSON.stringify(DEFAULT_USERS);
        const schoolsValue = schoolsRes.status === "fulfilled" && schoolsRes.value ? schoolsRes.value.value : JSON.stringify(DEFAULT_SCHOOLS);
        const editorialsValue = editorialsRes.status === "fulfilled" && editorialsRes.value ? editorialsRes.value.value : JSON.stringify(DEFAULT_EDITORIALS);
        lastSyncedBooks.current = booksValue;
        lastSyncedUsers.current = usersValue;
        lastSyncedSchools.current = schoolsValue;
        lastSyncedEditorials.current = editorialsValue;
        setBooks(JSON.parse(booksValue));
        setUsers(JSON.parse(usersValue));
        setSchools(JSON.parse(schoolsValue));
        setEditorials(JSON.parse(editorialsValue));
      } catch (e) {
        setBooks(SAMPLE_BOOKS);
        setUsers(DEFAULT_USERS);
        setSchools(DEFAULT_SCHOOLS);
        setEditorials(DEFAULT_EDITORIALS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Guarda solo si el contenido cambió realmente (evita escrituras innecesarias)
  useEffect(() => {
    if (loading || books === null) return;
    const json = JSON.stringify(books);
    if (json === lastSyncedBooks.current) return;
    lastSyncedBooks.current = json;
    window.storage.set(BOOKS_KEY, json, true).catch((e) => console.error(e));
  }, [books, loading]);

  useEffect(() => {
    if (loading || users === null) return;
    const json = JSON.stringify(users);
    if (json === lastSyncedUsers.current) return;
    lastSyncedUsers.current = json;
    window.storage.set(USERS_KEY, json, true).catch((e) => console.error(e));
  }, [users, loading]);

  useEffect(() => {
    if (loading || schools === null) return;
    const json = JSON.stringify(schools);
    if (json === lastSyncedSchools.current) return;
    lastSyncedSchools.current = json;
    window.storage.set(SCHOOLS_KEY, json, true).catch((e) => console.error(e));
  }, [schools, loading]);

  useEffect(() => {
    if (loading || editorials === null) return;
    const json = JSON.stringify(editorials);
    if (json === lastSyncedEditorials.current) return;
    lastSyncedEditorials.current = json;
    window.storage.set(EDITORIALS_KEY, json, true).catch((e) => console.error(e));
  }, [editorials, loading]);

  // Sincronización periódica: revisa cada 4s si otro dispositivo cambió los datos
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(async () => {
      try {
        const res = await window.storage.get(BOOKS_KEY, true);
        if (res && res.value && res.value !== lastSyncedBooks.current) {
          lastSyncedBooks.current = res.value;
          setBooks(JSON.parse(res.value));
        }
      } catch (e) {}
      try {
        const res2 = await window.storage.get(USERS_KEY, true);
        if (res2 && res2.value && res2.value !== lastSyncedUsers.current) {
          lastSyncedUsers.current = res2.value;
          setUsers(JSON.parse(res2.value));
        }
      } catch (e) {}
      try {
        const res3 = await window.storage.get(SCHOOLS_KEY, true);
        if (res3 && res3.value && res3.value !== lastSyncedSchools.current) {
          lastSyncedSchools.current = res3.value;
          setSchools(JSON.parse(res3.value));
        }
      } catch (e) {}
      try {
        const res4 = await window.storage.get(EDITORIALS_KEY, true);
        if (res4 && res4.value && res4.value !== lastSyncedEditorials.current) {
          lastSyncedEditorials.current = res4.value;
          setEditorials(JSON.parse(res4.value));
        }
      } catch (e) {}
    }, 4000);
    return () => clearInterval(interval);
  }, [loading]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function addBook(data) {
    const book = {
      id: uid(),
      title: data.title.trim(),
      author: data.author.trim(),
      genre: data.genre.trim() || "Sin género",
      condition: data.condition || "Bueno",
      notes: data.notes.trim(),
      status: "available",
      loan: null,
      history: [],
      createdAt: todayISO(),
      ratings: [],
      schoolId: data.schoolId,
      editorialId: data.editorialId,
    };
    setBooks((prev) => [book, ...prev]);
    setShowAdd(false);
    showToast("Libro añadido al catálogo");
  }

  function deleteBook(id) {
    setBooks((prev) => prev.filter((b) => b.id !== id));
    setDetailModal(null);
    showToast("Libro eliminado");
  }

  function lendBook(id, loan) {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, status: "loaned", loan: { ...loan }, request: null } : b)));
    setLoanModal(null);
    showToast(`Prestado a ${loan.borrower}`);
  }

  function requestBook(id) {
    setBooks((prev) =>
      prev.map((b) =>
        b.id === id
          ? { ...b, status: "requested", request: { studentName: currentUser.name, dateRequested: todayISO() } }
          : b
      )
    );
    showToast("Solicitud enviada");
  }

  function cancelRequest(id) {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, status: "available", request: null } : b)));
    showToast("Solicitud cancelada");
  }

  function rateBook(id, value) {
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const ratings = b.ratings ? b.ratings.filter((r) => r.by !== currentUser.name) : [];
        return { ...b, ratings: [...ratings, { by: currentUser.name, value }] };
      })
    );
    showToast("¡Gracias por tu opinión!");
  }

  function returnBook(id) {
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const historyEntry = b.loan ? { ...b.loan, dateReturned: todayISO() } : null;
        return { ...b, status: "available", loan: null, history: historyEntry ? [historyEntry, ...b.history] : b.history };
      })
    );
    showToast("Libro devuelto al estante");
  }

  function pickSurprise() {
    const pool = visibleBooks.filter((b) => b.status === "available");
    if (pool.length === 0) {
      showToast("No hay libros disponibles ahora mismo");
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setSurprise(pick.id);
  }

  const perms = currentUser ? PERMS[currentUser.role] : PERMS.alumno;

  const visibleBooks = useMemo(() => {
    if (!books) return [];
    if (currentUser && currentUser.role === "alumno") {
      return books.filter((b) => b.schoolId === currentUser.schoolId);
    }
    return books;
  }, [books, currentUser]);

  const filtered = useMemo(() => {
    let list = visibleBooks;
    if (filter === "disponibles") list = list.filter((b) => b.status === "available");
    if (filter === "prestados") list = list.filter((b) => b.status === "loaned");
    if (filter === "mis-prestamos" && currentUser) {
      list = list.filter((b) => b.status === "loaned" && b.loan && b.loan.borrower.toLowerCase() === currentUser.name.toLowerCase());
    }
    if (filter === "solicitudes") {
      list = list.filter((b) => b.status === "requested");
    }
    if (genreFilter !== "todos") {
      list = list.filter((b) => b.genre === genreFilter);
    }
    if (schoolFilter !== "todas") {
      list = list.filter((b) => b.schoolId === schoolFilter);
    }
    if (editorialFilter !== "todas") {
      list = list.filter((b) => b.editorialId === editorialFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          (b.loan && b.loan.borrower.toLowerCase().includes(q))
      );
    }
    return list;
  }, [visibleBooks, query, filter, genreFilter, schoolFilter, editorialFilter, currentUser]);

  const availableGenres = useMemo(() => {
    return Array.from(new Set(visibleBooks.map((b) => b.genre))).sort();
  }, [visibleBooks]);

  const stats = useMemo(() => {
    const loaned = visibleBooks.filter((b) => b.status === "loaned");
    const overdue = loaned.filter((b) => b.loan && daysUntil(b.loan.dueDate) < 0).length;
    const requested = visibleBooks.filter((b) => b.status === "requested").length;
    return { total: visibleBooks.length, loaned: loaned.length, available: visibleBooks.filter((b) => b.status === "available").length, overdue, requested };
  }, [visibleBooks]);

  const myBooks = useMemo(() => {
    if (!currentUser || currentUser.role !== "alumno") return [];
    return visibleBooks.filter((b) => b.status === "loaned" && b.loan && b.loan.borrower.toLowerCase() === currentUser.name.toLowerCase());
  }, [visibleBooks, currentUser]);

  const studentNames = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => u.role === "alumno").map((u) => u.name).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const schoolName = (id) => {
    const s = schools.find((sc) => sc.id === id);
    return s ? s.name : "Sin escuela";
  };

  const editorialName = (id) => {
    const e = editorials.find((ed) => ed.id === id);
    return e ? e.name : null;
  };

  const topBooks = useMemo(() => {
    return visibleBooks
      .map((b) => ({ book: b, timesLoaned: (b.history ? b.history.length : 0) + (b.status === "loaned" ? 1 : 0) }))
      .filter((x) => x.timesLoaned > 0)
      .sort((a, b) => b.timesLoaned - a.timesLoaned)
      .slice(0, 3);
  }, [visibleBooks]);

  if (loading || books === null || users === null || schools === null || editorials === null) {
    return (
      <div style={{ background: "#F5EEFB", minHeight: "100vh" }} className="flex items-center justify-center font-mono text-sm opacity-60">
        Abriendo el catálogo...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginScreen
        users={users}
        onLogin={setCurrentUser}
        onResetUsers={() => setUsers(DEFAULT_USERS)}
      />
    );
  }

  return (
    <div style={{ background: "#F5EEFB", minHeight: "100vh", fontFamily: "'Source Serif 4', Georgia, serif", color: "#241830" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,500&family=Source+Serif+4:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap');
        .font-display { font-family: 'Fraunces', Georgia, serif; }
        .font-mono { font-family: 'Space Mono', monospace; }
        .card-hover { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .card-hover:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(46,26,71,0.18); }
        .stamp { transform: rotate(-4deg); }
        input:focus, textarea:focus, select:focus { outline: 2px solid #7A2E6B; outline-offset: 1px; }
        button:focus-visible { outline: 2px solid #7A2E6B; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { .card-hover { transition: none; } }
      `}</style>

      {/* Header */}
      <header style={{ background: "#2E1A47", borderBottom: "6px solid #A66DD4" }} className="px-6 py-6 sm:px-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Escudo Escuela Secundaria Generativa Rural — Tomando Vuelo" className="h-14 w-14 sm:h-16 sm:w-16 object-contain shrink-0" />
            <div>
              <p className="font-mono text-xs tracking-widest uppercase mb-1 flex items-center gap-1.5" style={{ color: "#A66DD4" }}>
                {(() => {
                  const RoleIcon = ROLE_ICON[currentUser.role];
                  return <RoleIcon size={12} />;
                })()}
                Catálogo · {ROLE_LABEL[currentUser.role]}
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold" style={{ color: "#FFFCFE" }}>
                Mi Biblioteca
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={pickSurprise}
              className="flex items-center gap-2 px-3 py-2.5 rounded-sm font-mono text-xs uppercase tracking-wide border"
              style={{ borderColor: "#A66DD4", color: "#FFFCFE" }}
              title="Elegir un libro al azar"
            >
              <Dices size={14} /> Sugerime un libro
            </button>
            {perms.manageSchools && (
              <button
                onClick={() => setShowSchools(true)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-sm font-mono text-xs uppercase tracking-wide border"
                style={{ borderColor: "#A66DD4", color: "#FFFCFE" }}
              >
                <School size={14} /> Escuelas
              </button>
            )}
            {perms.manageEditorials && (
              <button
                onClick={() => setShowEditorials(true)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-sm font-mono text-xs uppercase tracking-wide border"
                style={{ borderColor: "#A66DD4", color: "#FFFCFE" }}
              >
                <Building2 size={14} /> Editoriales
              </button>
            )}
            {perms.manageUsers && (
              <button
                onClick={() => setShowUsers(true)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-sm font-mono text-xs uppercase tracking-wide border"
                style={{ borderColor: "#A66DD4", color: "#FFFCFE" }}
              >
                <Users size={14} /> Usuarios
              </button>
            )}
            {perms.addBook && (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-sm font-mono text-sm uppercase tracking-wide"
                style={{ background: "#A66DD4", color: "#2E1A47", fontWeight: 700 }}
              >
                <Plus size={16} /> Añadir libro
              </button>
            )}
            <div className="flex items-center gap-2 pl-2 ml-1 border-l" style={{ borderColor: "#FFFCFE33" }}>
              <span className="font-mono text-xs" style={{ color: "#FFFCFE" }}>
                {currentUser.name}
              </span>
              <button
                onClick={() => setCurrentUser(null)}
                aria-label="Cerrar sesión"
                className="p-2 rounded-sm"
                style={{ color: "#FFFCFE" }}
                title="Cerrar sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 sm:px-10 py-8">
        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 font-mono">
          {[
            { label: "Total", value: stats.total, icon: Library },
            { label: "Disponibles", value: stats.available, icon: CheckCircle2 },
            { label: "Prestados", value: stats.loaned, icon: Clock3 },
            perms.lend
              ? { label: "Solicitudes", value: stats.requested, alert: stats.requested > 0, icon: Inbox }
              : { label: "Atrasados", value: stats.overdue, alert: stats.overdue > 0, icon: Clock3 },
          ].map((s) => (
            <div key={s.label} className="border rounded-sm px-4 py-3" style={{ background: "#FFFCFE", borderColor: s.alert ? "#7A2E6B" : "#2E1A4722" }}>
              <div className="flex items-center gap-1.5 mb-0.5" style={{ color: s.alert ? "#7A2E6B" : "#2E1A47" }}>
                <s.icon size={14} className="opacity-70" />
                <span className="text-2xl font-bold">{s.value}</span>
              </div>
              <div className="text-[11px] uppercase tracking-widest opacity-70">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tus libros (alumno) */}
        {currentUser.role === "alumno" && myBooks.length > 0 && (
          <div className="mb-6 p-4 rounded-sm border-2" style={{ borderColor: "#A66DD4", background: "#FFFCFE" }}>
            <p className="font-mono text-[11px] uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: "#7A2E6B" }}>
              <Bookmark size={13} /> Tus libros ({myBooks.length})
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {myBooks.map((b) => {
                const overdue = b.loan && daysUntil(b.loan.dueDate) < 0;
                return (
                  <button
                    key={b.id}
                    onClick={() => setDetailModal(b.id)}
                    className="text-left px-3 py-2 rounded-sm border flex items-center justify-between gap-2"
                    style={{ borderColor: overdue ? "#7A2E6B" : "#2E1A4722" }}
                  >
                    <span>
                      <span className="font-display font-semibold">{b.title}</span>
                      <span className="block text-xs opacity-60">Vence {fmtDate(b.loan.dueDate)}{overdue && " · Atrasado"}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Salón de la fama */}
        {topBooks.length > 0 && (
          <div className="mb-6 p-4 rounded-sm border" style={{ borderColor: "#2E1A4722", background: "#FFFCFE" }}>
            <p className="font-mono text-[11px] uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: "#2E1A47" }}>
              <Award size={13} /> Salón de la fama · Los más prestados
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {topBooks.map(({ book, timesLoaned }, i) => (
                <button
                  key={book.id}
                  onClick={() => setDetailModal(book.id)}
                  className="text-left px-3 py-2 rounded-sm border flex items-start gap-2"
                  style={{ borderColor: "#2E1A4722" }}
                >
                  <span className="font-display font-bold text-lg opacity-40 leading-none">{i + 1}</span>
                  <span>
                    <span className="font-display font-semibold block leading-snug">{book.title}</span>
                    <span className="text-xs opacity-60 font-mono">
                      {timesLoaned} préstamo{timesLoaned !== 1 && "s"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título, autor o quién lo tiene..."
              className="w-full pl-9 pr-3 py-2.5 rounded-sm border bg-transparent text-sm"
              style={{ borderColor: "#2E1A4733", background: "#FFFCFE" }}
            />
          </div>
          <div className="w-52">
            <Dropdown
              value={genreFilter}
              onChange={setGenreFilter}
              options={[{ value: "todos", label: "Todos los géneros" }, ...availableGenres.map((g) => ({ value: g, label: g }))]}
            />
          </div>
          {currentUser.role !== "alumno" && (
            <div className="w-56">
              <Dropdown
                value={schoolFilter}
                onChange={setSchoolFilter}
                options={[{ value: "todas", label: "Todas las escuelas" }, ...schools.map((s) => ({ value: s.id, label: s.name }))]}
              />
            </div>
          )}
          <div className="w-52">
            <Dropdown
              value={editorialFilter}
              onChange={setEditorialFilter}
              options={[{ value: "todas", label: "Todas las editoriales" }, ...editorials.map((e) => ({ value: e.id, label: e.name }))]}
            />
          </div>
          <div className="flex gap-2 font-mono text-xs uppercase tracking-wide flex-wrap">
            {[
              { key: "todos", label: "Todos", icon: LayoutGrid },
              { key: "disponibles", label: "Disponibles", icon: CheckCircle2 },
              { key: "prestados", label: "Prestados", icon: Clock3 },
              ...(perms.lend ? [{ key: "solicitudes", label: `Solicitudes${stats.requested ? ` (${stats.requested})` : ""}`, icon: Inbox }] : []),
              ...(currentUser.role === "alumno" ? [{ key: "mis-prestamos", label: "Mis préstamos", icon: Bookmark }] : []),
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-sm border"
                style={{
                  borderColor: "#2E1A4733",
                  background: filter === f.key ? "#2E1A47" : "#FFFCFE",
                  color: filter === f.key ? "#FFFCFE" : "#241830",
                }}
              >
                <f.icon size={13} />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Book grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 rounded-sm border border-dashed" style={{ borderColor: "#2E1A4733" }}>
            <BookOpen size={28} className="mx-auto mb-3 opacity-40" />
            <p className="font-display text-lg mb-1">El estante está vacío</p>
            <p className="text-sm opacity-60">{books.length > 0 ? "Ningún libro coincide con la búsqueda." : "Añade tu primer libro para empezar."}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((b) => (
              <BookCard
                key={b.id}
                book={b}
                perms={perms}
                currentUser={currentUser}
                schoolLabel={currentUser.role !== "alumno" ? schoolName(b.schoolId) : null}
                editorialLabel={editorialName(b.editorialId)}
                onOpen={() => setDetailModal(b.id)}
                onLend={() => setLoanModal(b.id)}
                onReturn={() => returnBook(b.id)}
                onRequest={() => requestBook(b.id)}
                onCancelRequest={() => cancelRequest(b.id)}
                onDelete={() => deleteBook(b.id)}
              />
            ))}
          </div>
        )}
      </main>

      {showAdd && perms.addBook && <AddBookModal schools={schools} editorials={editorials} onClose={() => setShowAdd(false)} onSave={addBook} />}
      {loanModal && perms.lend && (
        <LoanModal
          book={books.find((b) => b.id === loanModal)}
          initialBorrower={books.find((b) => b.id === loanModal)?.request?.studentName || ""}
          students={studentNames}
          onClose={() => setLoanModal(null)}
          onSave={(loan) => lendBook(loanModal, loan)}
        />
      )}
      {detailModal && books.find((b) => b.id === detailModal) && (
        <DetailModal
          book={books.find((b) => b.id === detailModal)}
          perms={perms}
          currentUser={currentUser}
          schoolLabel={schoolName(books.find((b) => b.id === detailModal).schoolId)}
          editorialLabel={editorialName(books.find((b) => b.id === detailModal).editorialId)}
          onClose={() => setDetailModal(null)}
          onDelete={() => deleteBook(detailModal)}
          onReturn={() => {
            returnBook(detailModal);
            setDetailModal(null);
          }}
          onLend={() => {
            setDetailModal(null);
            setLoanModal(detailModal);
          }}
          onRequest={() => requestBook(detailModal)}
          onCancelRequest={() => {
            cancelRequest(detailModal);
            setDetailModal(null);
          }}
          onRate={(value) => rateBook(detailModal, value)}
        />
      )}
      {surprise && books.find((b) => b.id === surprise) && (
        <SurpriseModal
          book={books.find((b) => b.id === surprise)}
          onClose={() => setSurprise(null)}
          onAnother={pickSurprise}
          onSeeDetail={() => {
            setDetailModal(surprise);
            setSurprise(null);
          }}
        />
      )}
      {showUsers && perms.manageUsers && (
        <UsersModal users={users} setUsers={setUsers} schools={schools} currentUser={currentUser} onClose={() => setShowUsers(false)} showToast={showToast} />
      )}
      {showSchools && perms.manageSchools && (
        <SchoolsModal schools={schools} setSchools={setSchools} books={books} onClose={() => setShowSchools(false)} showToast={showToast} />
      )}
      {showEditorials && perms.manageEditorials && (
        <EditorialsModal editorials={editorials} setEditorials={setEditorials} books={books} onClose={() => setShowEditorials(false)} showToast={showToast} />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-sm font-mono text-sm shadow-lg" style={{ background: "#2E1A47", color: "#FFFCFE" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function LoginScreen({ users, onLogin, onResetUsers }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [reset, setReset] = useState(false);

  function submit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const u = username.trim().toLowerCase();
    const p = password.trim();
    const match = users.find((usr) => usr.username.trim().toLowerCase() === u && usr.password.trim() === p);
    if (match && match.suspended) {
      setError("Este usuario está suspendido. Consultá con el súper usuario.");
    } else if (match) {
      setError("");
      onLogin(match);
    } else {
      setError("Usuario o contraseña incorrectos. Revisá mayúsculas y espacios.");
    }
  }

  return (
    <div style={{ background: "#2E1A47", minHeight: "100vh", fontFamily: "'Source Serif 4', Georgia, serif" }} className="flex items-center justify-center px-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700&family=Source+Serif+4:wght@400;500&family=Space+Mono:wght@400;700&display=swap');
        .font-display { font-family: 'Fraunces', Georgia, serif; }
        .font-mono { font-family: 'Space Mono', monospace; }
      `}</style>
      <div className="w-full max-w-sm rounded-sm border-2 p-7" style={{ background: "#FFFCFE", borderColor: "#A66DD4" }}>
        <div className="flex justify-center mb-3">
          <img src="/logo.png" alt="Escudo Escuela Secundaria Generativa Rural — Tomando Vuelo" className="h-20 w-20 object-contain" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-1" style={{ color: "#7A2E6B" }}>
          <ShieldCheck size={18} />
          <span className="font-mono text-[11px] uppercase tracking-widest">Acceso al catálogo</span>
        </div>
        <h1 className="font-display text-2xl font-semibold mb-5 text-center" style={{ color: "#2E1A47" }}>
          Mi Biblioteca
        </h1>

        <label className="block mb-3">
          <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest opacity-70 mb-1.5">
            <User size={12} /> Usuario
          </span>
          <input
            className="w-full px-3 py-2 rounded-sm border text-sm"
            style={{ borderColor: "#2E1A4733" }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit(e)}
            autoFocus
          />
        </label>
        <label className="block mb-2">
          <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest opacity-70 mb-1.5">
            <Lock size={12} /> Contraseña
          </span>
          <input
            type="password"
            className="w-full px-3 py-2 rounded-sm border text-sm"
            style={{ borderColor: "#2E1A4733" }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit(e)}
          />
        </label>

        {error && <p className="text-xs mb-3" style={{ color: "#7A2E6B" }}>{error}</p>}

        <button type="button" onClick={submit} className="w-full font-mono text-sm uppercase tracking-wide py-2.5 rounded-sm mt-2" style={{ background: "#2E1A47", color: "#FFFCFE" }}>
          <span className="inline-flex items-center gap-2"><Lock size={14} /> Entrar</span>
        </button>

        <div className="mt-5 pt-4 border-t" style={{ borderColor: "#2E1A4722" }} />

        <button
          type="button"
          onClick={() => {
            onResetUsers();
            setReset(true);
            setTimeout(() => setReset(false), 2500);
          }}
          className="w-full mt-3 font-mono text-[11px] uppercase tracking-wide py-2 rounded-sm border opacity-70 hover:opacity-100"
          style={{ borderColor: "#2E1A4733" }}
        >
          {reset ? "Usuarios restaurados ✓" : "¿No entra ninguno? Restaurar usuarios de prueba"}
        </button>
      </div>
    </div>
  );
}

function Stars({ value, size = 14, interactive = false, onRate }) {
  const [hover, setHover] = useState(0);
  const display = interactive && hover ? hover : Math.round(value || 0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={interactive ? () => onRate(n) : undefined}
          onMouseEnter={interactive ? () => setHover(n) : undefined}
          onMouseLeave={interactive ? () => setHover(0) : undefined}
          className={interactive ? "cursor-pointer" : ""}
        >
          <Star size={size} fill={n <= display ? "#A66DD4" : "none"} color={n <= display ? "#A66DD4" : "#2E1A4755"} />
        </span>
      ))}
    </div>
  );
}

function BookCard({ book, perms, currentUser, schoolLabel, editorialLabel, onOpen, onLend, onReturn, onRequest, onCancelRequest, onDelete }) {
  const spine = spineColorFor(book.id);
  const overdue = book.status === "loaned" && book.loan && daysUntil(book.loan.dueDate) < 0;
  const isMyRequest = book.status === "requested" && book.request && currentUser && book.request.studentName.toLowerCase() === currentUser.name.toLowerCase();
  const rating = avgRating(book);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="card-hover rounded-sm overflow-hidden border flex flex-col" style={{ background: "#FFFCFE", borderColor: "#2E1A4722" }}>
      <div className="flex">
        <div style={{ background: spine, width: 10 }} />
        <button onClick={onOpen} className="flex-1 text-left p-4">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="font-mono text-[10px] uppercase tracking-widest opacity-50">{book.genre}</p>
            {isNew(book) && (
              <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm" style={{ background: "#7A2E6B", color: "#FFFCFE" }}>
                Nuevo
              </span>
            )}
          </div>
          <h3 className="font-display text-lg font-semibold leading-snug mb-1">{book.title}</h3>
          <p className="text-sm opacity-70 mb-1">{book.author}</p>
          {schoolLabel && (
            <p className="flex items-center gap-1 text-[11px] font-mono opacity-60 mb-2">
              <School size={11} /> {schoolLabel}
            </p>
          )}
          {editorialLabel && (
            <p className="flex items-center gap-1 text-[11px] font-mono opacity-50 mb-2">
              <Building2 size={11} /> {editorialLabel}
            </p>
          )}
          {rating !== null && (
            <div className="mb-2 flex items-center gap-1.5">
              <Stars value={rating} size={12} />
              <span className="font-mono text-[10px] opacity-50">({book.ratings.length})</span>
            </div>
          )}

          {book.status === "available" && (
            <span className="inline-block font-mono text-[11px] px-2 py-1 rounded-sm uppercase tracking-wide" style={{ background: "#5B2C6F22", color: "#2E1A47" }}>
              En el estante
            </span>
          )}

          {book.status === "requested" && book.request && (
            <div className="stamp inline-block font-mono text-[11px] px-2.5 py-1.5 rounded-sm uppercase tracking-wide border-2" style={{ borderColor: "#A66DD4", color: "#7A2E6B" }}>
              Solicitado por {book.request.studentName}
              <br />
              {fmtDate(book.request.dateRequested)}
            </div>
          )}

          {book.status === "loaned" && book.loan && (
            <div
              className="stamp inline-block font-mono text-[11px] px-2.5 py-1.5 rounded-sm uppercase tracking-wide border-2"
              style={{ borderColor: overdue ? "#7A2E6B" : "#A66DD4", color: "#7A2E6B" }}
            >
              Prestado a {book.loan.borrower}
              <br />
              Vence {fmtDate(book.loan.dueDate)}
              {overdue && " · Atrasado"}
            </div>
          )}
        </button>
      </div>

      <div className="mt-auto border-t px-4 py-2.5 flex justify-end gap-2" style={{ borderColor: "#2E1A4715" }}>
        {book.status === "available" && perms.request && (
          <button onClick={onRequest} className="font-mono text-xs uppercase tracking-wide px-3 py-1.5 rounded-sm" style={{ background: "#7A2E6B", color: "#FFFCFE" }}>
            Solicitar préstamo
          </button>
        )}
        {book.status === "available" && perms.lend && (
          <button onClick={onLend} className="font-mono text-xs uppercase tracking-wide px-3 py-1.5 rounded-sm" style={{ background: "#2E1A47", color: "#FFFCFE" }}>
            Prestar
          </button>
        )}

        {book.status === "requested" && perms.lend && (
          <>
            <button onClick={onCancelRequest} className="font-mono text-xs uppercase tracking-wide px-3 py-1.5 rounded-sm border" style={{ borderColor: "#7A2E6B", color: "#7A2E6B" }}>
              Rechazar
            </button>
            <button onClick={onLend} className="font-mono text-xs uppercase tracking-wide px-3 py-1.5 rounded-sm" style={{ background: "#2E1A47", color: "#FFFCFE" }}>
              Aprobar
            </button>
          </>
        )}
        {book.status === "requested" && !perms.lend && isMyRequest && (
          <button onClick={onCancelRequest} className="font-mono text-xs uppercase tracking-wide px-3 py-1.5 rounded-sm border" style={{ borderColor: "#2E1A47", color: "#2E1A47" }}>
            Cancelar solicitud
          </button>
        )}
        {book.status === "requested" && !perms.lend && !isMyRequest && (
          <span className="font-mono text-[11px] uppercase tracking-wide opacity-50">No disponible</span>
        )}

        {book.status === "loaned" && perms.return && (
          <button onClick={onReturn} className="flex items-center gap-1 font-mono text-xs uppercase tracking-wide px-3 py-1.5 rounded-sm border" style={{ borderColor: "#2E1A47", color: "#2E1A47" }}>
            <RotateCcw size={12} /> Devolver
          </button>
        )}

        {perms.deleteBook && (
          confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wide opacity-70">¿Eliminar?</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="font-mono text-xs uppercase tracking-wide px-2 py-1.5 rounded-sm"
                style={{ background: "#7A2E6B", color: "#FFFCFE" }}
              >
                Sí
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(false);
                }}
                className="font-mono text-xs uppercase tracking-wide px-2 py-1.5 rounded-sm border"
                style={{ borderColor: "#2E1A4733" }}
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(true);
              }}
              title="Eliminar libro"
              aria-label="Eliminar libro"
              className="p-1.5 rounded-sm opacity-60 hover:opacity-100"
              style={{ color: "#7A2E6B" }}
            >
              <Trash2 size={15} />
            </button>
          )
        )}
      </div>
    </div>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(46,26,71,0.45)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-sm border-2 max-h-[90vh] overflow-y-auto" style={{ background: "#FFFCFE", borderColor: "#2E1A47" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#2E1A4722" }}>
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-1 rounded-sm hover:opacity-60">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function SurpriseModal({ book, onClose, onAnother, onSeeDetail }) {
  const rating = avgRating(book);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(46,26,71,0.6)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="stamp w-full max-w-sm rounded-sm border-2 p-6 text-center"
        style={{ background: "#FFFCFE", borderColor: "#7A2E6B" }}
      >
        <div className="flex items-center justify-center gap-1.5 mb-3 font-mono text-[11px] uppercase tracking-widest" style={{ color: "#7A2E6B" }}>
          <Sparkles size={14} /> Tu ficha del azar
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest opacity-50 mb-1">{book.genre}</p>
        <h3 className="font-display text-2xl font-semibold mb-1">{book.title}</h3>
        <p className="text-sm opacity-70 mb-3">{book.author}</p>
        {rating !== null && (
          <div className="flex justify-center mb-3">
            <Stars value={rating} size={16} />
          </div>
        )}
        {book.notes && <p className="text-xs opacity-60 mb-4 italic">"{book.notes}"</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={onAnother} className="flex-1 font-mono text-xs uppercase tracking-wide py-2 rounded-sm border" style={{ borderColor: "#2E1A4733" }}>
            Otro libro
          </button>
          <button onClick={onSeeDetail} className="flex-1 font-mono text-xs uppercase tracking-wide py-2 rounded-sm" style={{ background: "#2E1A47", color: "#FFFCFE" }}>
            Ver ficha
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block mb-4">
      <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest opacity-70 mb-1.5">
        {Icon && <Icon size={12} />}
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle = { borderColor: "#2E1A4733", background: "#FFFCFE" };

function Dropdown({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-sm border text-sm text-left"
        style={inputStyle}
      >
        <span>{selected ? selected.label : placeholder || "Seleccionar"}</span>
        <ChevronDown
          size={14}
          className="opacity-60 shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}
        />
      </button>
      {open && (
        <ul
          className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-sm border-2"
          style={{ background: "#FFFCFE", borderColor: "#2E1A47", boxShadow: "0 10px 24px rgba(46,26,71,0.25)" }}
        >
          {options.map((opt) => (
            <li
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="px-3 py-2 text-sm cursor-pointer font-mono"
              style={{
                background: opt.value === value ? "#2E1A4714" : "transparent",
                color: opt.value === value ? "#2E1A47" : "#241830",
                fontWeight: opt.value === value ? 700 : 400,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#2E1A470d")}
              onMouseLeave={(e) => (e.currentTarget.style.background = opt.value === value ? "#2E1A4714" : "transparent")}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddBookModal({ schools, editorials, onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState(GENRES[0]);
  const [customGenre, setCustomGenre] = useState("");
  const [condition, setCondition] = useState("Bueno");
  const [notes, setNotes] = useState("");
  const [schoolId, setSchoolId] = useState(schools[0] ? schools[0].id : "");
  const [editorialId, setEditorialId] = useState(editorials[0] ? editorials[0].id : "");

  function submit() {
    if (!title.trim() || !author.trim() || !schoolId || !editorialId) return;
    const finalGenre = genre === "Otro" ? customGenre.trim() || "Otro" : genre;
    onSave({ title, author, genre: finalGenre, condition, notes, schoolId, editorialId });
  }

  if (schools.length === 0) {
    return (
      <Modal onClose={onClose} title="Nuevo libro">
        <p className="text-sm opacity-70 mb-2">
          Primero tenés que crear al menos una escuela (botón "Escuelas" en el encabezado, si sos súper usuario) antes de poder cargar libros.
        </p>
        <button onClick={onClose} className="w-full font-mono text-xs uppercase tracking-wide py-2 rounded-sm border" style={{ borderColor: "#2E1A4733" }}>
          Entendido
        </button>
      </Modal>
    );
  }

  if (editorials.length === 0) {
    return (
      <Modal onClose={onClose} title="Nuevo libro">
        <p className="text-sm opacity-70 mb-2">
          Primero tenés que crear al menos una editorial (botón "Editoriales" en el encabezado, si sos súper usuario) antes de poder cargar libros.
        </p>
        <button onClick={onClose} className="w-full font-mono text-xs uppercase tracking-wide py-2 rounded-sm border" style={{ borderColor: "#2E1A4733" }}>
          Entendido
        </button>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title="Nuevo libro">
      <Field label="Título *" icon={BookOpen}>
        <input className="w-full px-3 py-2 rounded-sm border text-sm" style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </Field>
      <Field label="Autor *" icon={PenLine}>
        <input className="w-full px-3 py-2 rounded-sm border text-sm" style={inputStyle} value={author} onChange={(e) => setAuthor(e.target.value)} />
      </Field>
      <Field label="Escuela *" icon={School}>
        <Dropdown value={schoolId} onChange={setSchoolId} options={schools.map((s) => ({ value: s.id, label: s.name }))} />
      </Field>
      <Field label="Editorial *" icon={Building2}>
        <Dropdown value={editorialId} onChange={setEditorialId} options={editorials.map((e) => ({ value: e.id, label: e.name }))} />
      </Field>
      <Field label="Género" icon={Tag}>
        <Dropdown value={genre} onChange={setGenre} options={GENRES.map((g) => ({ value: g, label: g }))} />
      </Field>
      {genre === "Otro" && (
        <Field label="Especificar género">
          <input className="w-full px-3 py-2 rounded-sm border text-sm" style={inputStyle} value={customGenre} onChange={(e) => setCustomGenre(e.target.value)} placeholder="Escribí el género" />
        </Field>
      )}
      <Field label="Estado del ejemplar" icon={Sparkles}>
        <select className="w-full px-3 py-2 rounded-sm border text-sm" style={inputStyle} value={condition} onChange={(e) => setCondition(e.target.value)}>
          <option>Como nuevo</option>
          <option>Bueno</option>
          <option>Desgastado</option>
          <option>Dañado</option>
        </select>
      </Field>
      <Field label="Notas" icon={StickyNote}>
        <textarea className="w-full px-3 py-2 rounded-sm border text-sm" style={inputStyle} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Edición, dedicatoria, detalles..." />
      </Field>
      <button
        onClick={submit}
        disabled={!title.trim() || !author.trim() || !schoolId || !editorialId}
        className="w-full mt-1 font-mono text-sm uppercase tracking-wide py-2.5 rounded-sm disabled:opacity-40"
        style={{ background: "#2E1A47", color: "#FFFCFE" }}
      >
        Añadir al catálogo
      </button>
    </Modal>
  );
}

function LoanModal({ book, initialBorrower, students, onClose, onSave }) {
  const knownNames = students || [];
  const startsAsOther = !!initialBorrower && !knownNames.includes(initialBorrower);
  const [useOther, setUseOther] = useState(startsAsOther || knownNames.length === 0);
  const [borrower, setBorrower] = useState(startsAsOther || knownNames.length === 0 ? initialBorrower || "" : initialBorrower || knownNames[0] || "");
  const [customBorrower, setCustomBorrower] = useState(startsAsOther ? initialBorrower : "");
  const [dateOut, setDateOut] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const finalBorrower = useOther ? customBorrower.trim() : borrower;

  function submit() {
    if (!finalBorrower || !dueDate) return;
    onSave({ borrower: finalBorrower, dateOut, dueDate, notes: notes.trim() });
  }

  if (!book) return null;

  return (
    <Modal onClose={onClose} title={`Prestar «${book.title}»`}>
      <Field label="¿A quién se lo prestas? *" icon={User}>
        {!useOther && knownNames.length > 0 ? (
          <>
            <Dropdown
              value={borrower}
              onChange={setBorrower}
              options={knownNames.map((n) => ({ value: n, label: n }))}
              placeholder="Elegí un alumno"
            />
            <button type="button" onClick={() => setUseOther(true)} className="mt-1.5 font-mono text-[11px] uppercase tracking-wide opacity-60 hover:opacity-90">
              Prestar a alguien que no está en la lista
            </button>
          </>
        ) : (
          <>
            <input
              className="w-full px-3 py-2 rounded-sm border text-sm"
              style={inputStyle}
              value={customBorrower}
              onChange={(e) => setCustomBorrower(e.target.value)}
              placeholder="Nombre completo"
              autoFocus
            />
            {knownNames.length > 0 && (
              <button type="button" onClick={() => setUseOther(false)} className="mt-1.5 font-mono text-[11px] uppercase tracking-wide opacity-60 hover:opacity-90">
                Elegir de la lista de alumnos
              </button>
            )}
          </>
        )}
      </Field>
      <Field label="Fecha de préstamo" icon={Calendar}>
        <input type="date" className="w-full px-3 py-2 rounded-sm border text-sm font-mono" style={inputStyle} value={dateOut} onChange={(e) => setDateOut(e.target.value)} />
      </Field>
      <Field label="Fecha de devolución esperada *" icon={Calendar}>
        <input type="date" className="w-full px-3 py-2 rounded-sm border text-sm font-mono" style={inputStyle} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </Field>
      <Field label="Notas del préstamo" icon={StickyNote}>
        <textarea className="w-full px-3 py-2 rounded-sm border text-sm" style={inputStyle} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Condiciones, recordatorios..." />
      </Field>
      <button
        onClick={submit}
        disabled={!finalBorrower || !dueDate}
        className="w-full mt-1 font-mono text-sm uppercase tracking-wide py-2.5 rounded-sm disabled:opacity-40"
        style={{ background: "#7A2E6B", color: "#FFFCFE" }}
      >
        Registrar préstamo
      </button>
    </Modal>
  );
}

function DetailModal({ book, perms, currentUser, schoolLabel, editorialLabel, onClose, onDelete, onReturn, onLend, onRequest, onCancelRequest, onRate }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const overdue = book.status === "loaned" && book.loan && daysUntil(book.loan.dueDate) < 0;
  const isMyRequest = book.status === "requested" && book.request && currentUser && book.request.studentName.toLowerCase() === currentUser.name.toLowerCase();
  const rating = avgRating(book);
  const myRating = book.ratings && currentUser ? book.ratings.find((r) => r.by === currentUser.name) : null;

  return (
    <Modal onClose={onClose} title={book.title}>
      <p className="text-sm opacity-70 mb-1">{book.author}</p>
      <p className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest opacity-50 mb-3">
        {book.genre} · Estado: {book.condition}
        {schoolLabel && (
          <>
            {" "}· <School size={11} className="inline" /> {schoolLabel}
          </>
        )}
        {editorialLabel && (
          <>
            {" "}· <Building2 size={11} className="inline" /> {editorialLabel}
          </>
        )}
      </p>

      <div className="flex items-center justify-between mb-4 p-3 rounded-sm" style={{ background: "#2E1A470a" }}>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">
            {rating !== null ? `Promedio: ${rating.toFixed(1)} (${book.ratings.length})` : "Sin valoraciones aún"}
          </p>
          {rating !== null && <Stars value={rating} size={14} />}
        </div>
        {currentUser && (
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">Tu opinión</p>
            <Stars value={myRating ? myRating.value : 0} size={16} interactive onRate={onRate} />
          </div>
        )}
      </div>

      {book.notes && (
        <div className="flex gap-2 mb-4 text-sm p-3 rounded-sm" style={{ background: "#2E1A470d" }}>
          <StickyNote size={14} className="mt-0.5 shrink-0 opacity-60" />
          <span>{book.notes}</span>
        </div>
      )}

      {book.status === "loaned" && book.loan && (
        <div className="mb-4 p-3 rounded-sm border-2" style={{ borderColor: overdue ? "#7A2E6B" : "#A66DD4" }}>
          <p className="font-mono text-xs uppercase tracking-widest opacity-70 mb-1">Préstamo activo</p>
          <p className="text-sm mb-0.5">
            Prestado a <strong>{book.loan.borrower}</strong>
          </p>
          <p className="text-sm mb-0.5">Desde: {fmtDate(book.loan.dateOut)}</p>
          <p className="text-sm mb-0.5" style={{ color: overdue ? "#7A2E6B" : "inherit" }}>
            Vence: {fmtDate(book.loan.dueDate)} {overdue && "· Atrasado"}
          </p>
          {book.loan.notes && <p className="text-sm mt-2 opacity-80">Nota: {book.loan.notes}</p>}
          {perms.return && (
            <button onClick={onReturn} className="w-full mt-3 flex items-center justify-center gap-1.5 font-mono text-xs uppercase tracking-wide py-2 rounded-sm" style={{ background: "#2E1A47", color: "#FFFCFE" }}>
              <RotateCcw size={13} /> Marcar como devuelto
            </button>
          )}
        </div>
      )}

      {book.status === "requested" && book.request && (
        <div className="mb-4 p-3 rounded-sm border-2" style={{ borderColor: "#A66DD4" }}>
          <p className="font-mono text-xs uppercase tracking-widest opacity-70 mb-1">Solicitud pendiente</p>
          <p className="text-sm mb-0.5">
            Solicitado por <strong>{book.request.studentName}</strong>
          </p>
          <p className="text-sm mb-3">El {fmtDate(book.request.dateRequested)}</p>
          {perms.lend && (
            <div className="flex gap-2">
              <button onClick={onLend} className="flex-1 font-mono text-xs uppercase tracking-wide py-2 rounded-sm" style={{ background: "#2E1A47", color: "#FFFCFE" }}>
                Aprobar
              </button>
              <button onClick={onCancelRequest} className="flex-1 font-mono text-xs uppercase tracking-wide py-2 rounded-sm border" style={{ borderColor: "#7A2E6B", color: "#7A2E6B" }}>
                Rechazar
              </button>
            </div>
          )}
          {!perms.lend && isMyRequest && (
            <button onClick={onCancelRequest} className="w-full font-mono text-xs uppercase tracking-wide py-2 rounded-sm border" style={{ borderColor: "#2E1A47", color: "#2E1A47" }}>
              Cancelar solicitud
            </button>
          )}
        </div>
      )}

      {book.status === "available" && (
        <>
          {perms.request && (
            <button onClick={onRequest} className="w-full mb-4 font-mono text-xs uppercase tracking-wide py-2 rounded-sm" style={{ background: "#7A2E6B", color: "#FFFCFE" }}>
              Solicitar préstamo
            </button>
          )}
          {perms.lend && (
            <button onClick={onLend} className="w-full mb-4 font-mono text-xs uppercase tracking-wide py-2 rounded-sm" style={{ background: "#7A2E6B", color: "#FFFCFE" }}>
              Prestar este libro
            </button>
          )}
        </>
      )}

      {book.history && book.history.length > 0 && (
        <details className="mb-4">
          <summary className="font-mono text-[11px] uppercase tracking-widest opacity-60 cursor-pointer flex items-center gap-1">
            <ChevronDown size={12} /> Historial de préstamos ({book.history.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {book.history.map((h, i) => (
              <li key={i} className="text-xs opacity-70 font-mono">
                {h.borrower} · {fmtDate(h.dateOut)} → {fmtDate(h.dateReturned)}
              </li>
            ))}
          </ul>
        </details>
      )}

      {perms.deleteBook &&
        (confirmDelete ? (
          <div className="flex gap-2">
            <button onClick={onDelete} className="flex-1 font-mono text-xs uppercase tracking-wide py-2 rounded-sm" style={{ background: "#7A2E6B", color: "#FFFCFE" }}>
              Confirmar eliminación
            </button>
            <button onClick={() => setConfirmDelete(false)} className="flex-1 font-mono text-xs uppercase tracking-wide py-2 rounded-sm border" style={{ borderColor: "#2E1A4733" }}>
              Cancelar
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="w-full font-mono text-[11px] uppercase tracking-wide py-2 rounded-sm opacity-50 hover:opacity-80">
            Eliminar libro del catálogo
          </button>
        ))}
    </Modal>
  );
}

function UsersModal({ users, setUsers, schools, currentUser, onClose, showToast }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("alumno");
  const [schoolId, setSchoolId] = useState(schools[0] ? schools[0].id : "");
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState("alumno");
  const [editSchoolId, setEditSchoolId] = useState(schools[0] ? schools[0].id : "");
  const [editError, setEditError] = useState("");

  function addUser() {
    if (!name.trim() || !username.trim() || !password.trim()) return;
    if (role === "alumno" && !schoolId) {
      setError("Elegí a qué escuela asiste.");
      return;
    }
    if (users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
      setError("Ese nombre de usuario ya existe.");
      return;
    }
    setUsers((prev) => [
      ...prev,
      { id: uid(), name: name.trim(), username: username.trim(), password, role, suspended: false, schoolId: role === "alumno" ? schoolId : null },
    ]);
    setName("");
    setUsername("");
    setPassword("");
    setRole("alumno");
    setError("");
    setCreating(false);
    showToast("Usuario creado");
  }

  function removeUser(id) {
    if (id === currentUser.id) {
      showToast("No podés eliminar tu propio usuario");
      return;
    }
    const admins = users.filter((u) => u.role === "admin");
    const target = users.find((u) => u.id === id);
    if (target.role === "admin" && admins.length <= 1) {
      showToast("Debe existir al menos un súper usuario");
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
    showToast("Usuario eliminado");
  }

  function toggleSuspend(id) {
    if (id === currentUser.id) {
      showToast("No podés suspender tu propio usuario");
      return;
    }
    const target = users.find((u) => u.id === id);
    const activeAdmins = users.filter((u) => u.role === "admin" && !u.suspended);
    if (target.role === "admin" && !target.suspended && activeAdmins.length <= 1) {
      showToast("Debe existir al menos un súper usuario activo");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, suspended: !u.suspended } : u)));
    showToast(target.suspended ? "Usuario reactivado" : "Usuario suspendido");
  }

  function startEdit(u) {
    setEditingId(u.id);
    setEditName(u.name);
    setEditUsername(u.username);
    setEditPassword("");
    setEditRole(u.role);
    setEditSchoolId(u.schoolId || (schools[0] ? schools[0].id : ""));
    setEditError("");
  }

  function saveEdit(id) {
    if (!editName.trim() || !editUsername.trim()) return;
    if (editRole === "alumno" && !editSchoolId) {
      setEditError("Elegí a qué escuela asiste.");
      return;
    }
    const clash = users.some((u) => u.id !== id && u.username.toLowerCase() === editUsername.trim().toLowerCase());
    if (clash) {
      setEditError("Ese nombre de usuario ya existe.");
      return;
    }
    const target = users.find((u) => u.id === id);
    if (target.role === "admin" && editRole !== "admin") {
      const otherAdmins = users.filter((u) => u.role === "admin" && u.id !== id);
      if (otherAdmins.length === 0) {
        setEditError("Debe existir al menos un súper usuario.");
        return;
      }
    }
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? {
              ...u,
              name: editName.trim(),
              username: editUsername.trim(),
              role: editRole,
              password: editPassword.trim() ? editPassword.trim() : u.password,
              schoolId: editRole === "alumno" ? editSchoolId : null,
            }
          : u
      )
    );
    setEditingId(null);
    showToast("Usuario actualizado");
  }

  const schoolName = (id) => {
    const s = schools.find((sc) => sc.id === id);
    return s ? s.name : "Sin escuela";
  };

  return (
    <Modal onClose={onClose} title="Gestionar usuarios">
      <p className="text-xs opacity-60 mb-4 leading-relaxed">
        Estos usuarios se comparten con todas las personas que abren esta página. No es un sistema de autenticación seguro: usalo para organizar accesos, no para datos sensibles.
      </p>

      <ul className="space-y-2 mb-5">
        {users.map((u) => {
          const RoleIcon = ROLE_ICON[u.role];

          if (editingId === u.id) {
            return (
              <li key={u.id} className="p-3 rounded-sm border-2" style={{ borderColor: "#A66DD4" }}>
                <Field label="Nombre" icon={User}>
                  <input className="w-full px-3 py-2 rounded-sm border text-sm" style={inputStyle} value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                </Field>
                <Field label="Usuario" icon={User}>
                  <input className="w-full px-3 py-2 rounded-sm border text-sm" style={inputStyle} value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
                </Field>
                <Field label="Nueva contraseña (opcional)" icon={Lock}>
                  <input className="w-full px-3 py-2 rounded-sm border text-sm" style={inputStyle} value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Dejar en blanco para no cambiarla" />
                </Field>
                {u.role !== "admin" && (
                  <Field label="Tipo de usuario">
                    <Dropdown
                      value={editRole}
                      onChange={setEditRole}
                      options={[
                        { value: "alumno", label: "Alumno" },
                        { value: "docente", label: "Docente" },
                      ]}
                    />
                  </Field>
                )}
                {editRole === "alumno" && (
                  <Field label="Escuela *" icon={School}>
                    <Dropdown value={editSchoolId} onChange={setEditSchoolId} options={schools.map((s) => ({ value: s.id, label: s.name }))} placeholder="Elegí una escuela" />
                  </Field>
                )}
                {editError && <p className="text-xs mb-3" style={{ color: "#7A2E6B" }}>{editError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(u.id)} className="flex-1 font-mono text-xs uppercase tracking-wide py-2 rounded-sm" style={{ background: "#2E1A47", color: "#FFFCFE" }}>
                    Guardar
                  </button>
                  <button onClick={() => setEditingId(null)} className="flex-1 font-mono text-xs uppercase tracking-wide py-2 rounded-sm border" style={{ borderColor: "#2E1A4733" }}>
                    Cancelar
                  </button>
                </div>
              </li>
            );
          }

          return (
            <li
              key={u.id}
              className="flex items-center justify-between px-3 py-2 rounded-sm border text-sm"
              style={{ borderColor: "#2E1A4722", opacity: u.suspended ? 0.55 : 1 }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0" style={{ background: "#2E1A4712" }}>
                  <RoleIcon size={14} style={{ color: "#2E1A47" }} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium flex items-center gap-1.5 truncate">
                    {u.name}
                    {u.id === currentUser.id && <span className="opacity-50 text-xs shrink-0">(vos)</span>}
                    {u.suspended && (
                      <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm shrink-0" style={{ background: "#7A2E6B", color: "#FFFCFE" }}>
                        Suspendido
                      </span>
                    )}
                  </p>
                  <p className="font-mono text-[11px] opacity-60 truncate">
                    {u.username} · {ROLE_LABEL[u.role]}
                    {u.role === "alumno" && ` · ${schoolName(u.schoolId)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => startEdit(u)} title="Editar" aria-label="Editar" className="p-1.5 rounded-sm opacity-60 hover:opacity-100" style={{ color: "#2E1A47" }}>
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => toggleSuspend(u.id)}
                  title={u.suspended ? "Reactivar" : "Suspender"}
                  aria-label={u.suspended ? "Reactivar" : "Suspender"}
                  className="p-1.5 rounded-sm opacity-60 hover:opacity-100"
                  style={{ color: "#A66DD4" }}
                >
                  {u.suspended ? <RotateCcw size={15} /> : <Ban size={15} />}
                </button>
                <button onClick={() => removeUser(u.id)} title="Eliminar" aria-label="Eliminar" className="p-1.5 rounded-sm opacity-60 hover:opacity-100" style={{ color: "#7A2E6B" }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {creating ? (
        <div className="p-3 rounded-sm border" style={{ borderColor: "#2E1A4733" }}>
          <Field label="Nombre" icon={User}>
            <input className="w-full px-3 py-2 rounded-sm border text-sm" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label="Usuario" icon={User}>
            <input className="w-full px-3 py-2 rounded-sm border text-sm" style={inputStyle} value={username} onChange={(e) => setUsername(e.target.value)} />
          </Field>
          <Field label="Contraseña" icon={Lock}>
            <input className="w-full px-3 py-2 rounded-sm border text-sm" style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Tipo de usuario">
            <Dropdown
              value={role}
              onChange={setRole}
              options={[
                { value: "alumno", label: "Alumno" },
                { value: "docente", label: "Docente" },
              ]}
            />
          </Field>
          {role === "alumno" && (
            <Field label="Escuela *" icon={School}>
              {schools.length === 0 ? (
                <p className="text-xs opacity-60">Primero creá una escuela desde el botón "Escuelas".</p>
              ) : (
                <Dropdown value={schoolId} onChange={setSchoolId} options={schools.map((s) => ({ value: s.id, label: s.name }))} placeholder="Elegí una escuela" />
              )}
            </Field>
          )}
          {error && <p className="text-xs mb-3" style={{ color: "#7A2E6B" }}>{error}</p>}
          <div className="flex gap-2">
            <button onClick={addUser} className="flex-1 font-mono text-xs uppercase tracking-wide py-2 rounded-sm" style={{ background: "#2E1A47", color: "#FFFCFE" }}>
              Crear usuario
            </button>
            <button onClick={() => setCreating(false)} className="flex-1 font-mono text-xs uppercase tracking-wide py-2 rounded-sm border" style={{ borderColor: "#2E1A4733" }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} className="w-full flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-wide py-2.5 rounded-sm" style={{ background: "#A66DD4", color: "#2E1A47", fontWeight: 700 }}>
          <Plus size={14} /> Nuevo usuario
        </button>
      )}
    </Modal>
  );
}

function SchoolsModal({ schools, setSchools, books, onClose, showToast }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  function addSchool() {
    if (!name.trim()) return;
    setSchools((prev) => [...prev, { id: uid(), name: name.trim() }]);
    setName("");
    setCreating(false);
    showToast("Escuela creada");
  }

  function startEdit(s) {
    setEditingId(s.id);
    setEditName(s.name);
  }

  function saveEdit(id) {
    if (!editName.trim()) return;
    setSchools((prev) => prev.map((s) => (s.id === id ? { ...s, name: editName.trim() } : s)));
    setEditingId(null);
    showToast("Escuela actualizada");
  }

  function removeSchool(id) {
    const inUse = books.some((b) => b.schoolId === id);
    if (inUse) {
      showToast("No se puede eliminar: hay libros cargados en esa escuela");
      return;
    }
    setSchools((prev) => prev.filter((s) => s.id !== id));
    showToast("Escuela eliminada");
  }

  return (
    <Modal onClose={onClose} title="Gestionar escuelas">
      <p className="text-xs opacity-60 mb-4 leading-relaxed">
        Cada escuela del circuito aparece como opción al cargar libros y al crear alumnos. Los docentes y el súper usuario ven todas; cada alumno solo ve la suya.
      </p>

      <ul className="space-y-2 mb-5">
        {schools.map((s) => (
          <li key={s.id} className="flex items-center justify-between px-3 py-2 rounded-sm border text-sm" style={{ borderColor: "#2E1A4722" }}>
            {editingId === s.id ? (
              <div className="flex-1 flex items-center gap-2">
                <input className="flex-1 px-2 py-1.5 rounded-sm border text-sm" style={inputStyle} value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                <button onClick={() => saveEdit(s.id)} className="font-mono text-[11px] uppercase tracking-wide px-2 py-1 rounded-sm" style={{ background: "#2E1A47", color: "#FFFCFE" }}>
                  Guardar
                </button>
                <button onClick={() => setEditingId(null)} className="font-mono text-[11px] uppercase tracking-wide px-2 py-1 rounded-sm border" style={{ borderColor: "#2E1A4733" }}>
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0" style={{ background: "#2E1A4712" }}>
                    <School size={14} style={{ color: "#2E1A47" }} />
                  </div>
                  <p className="font-medium truncate">{s.name}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => startEdit(s)} title="Editar" aria-label="Editar" className="p-1.5 rounded-sm opacity-60 hover:opacity-100" style={{ color: "#2E1A47" }}>
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => removeSchool(s.id)} title="Eliminar" aria-label="Eliminar" className="p-1.5 rounded-sm opacity-60 hover:opacity-100" style={{ color: "#7A2E6B" }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {creating ? (
        <div className="p-3 rounded-sm border" style={{ borderColor: "#2E1A4733" }}>
          <Field label="Nombre de la escuela" icon={School}>
            <input className="w-full px-3 py-2 rounded-sm border text-sm" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <div className="flex gap-2">
            <button onClick={addSchool} className="flex-1 font-mono text-xs uppercase tracking-wide py-2 rounded-sm" style={{ background: "#2E1A47", color: "#FFFCFE" }}>
              Crear escuela
            </button>
            <button onClick={() => setCreating(false)} className="flex-1 font-mono text-xs uppercase tracking-wide py-2 rounded-sm border" style={{ borderColor: "#2E1A4733" }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} className="w-full flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-wide py-2.5 rounded-sm" style={{ background: "#A66DD4", color: "#2E1A47", fontWeight: 700 }}>
          <Plus size={14} /> Nueva escuela
        </button>
      )}
    </Modal>
  );
}

function EditorialsModal({ editorials, setEditorials, books, onClose, showToast }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  function addEditorial() {
    if (!name.trim()) return;
    setEditorials((prev) => [...prev, { id: uid(), name: name.trim() }]);
    setName("");
    setCreating(false);
    showToast("Editorial creada");
  }

  function startEdit(e) {
    setEditingId(e.id);
    setEditName(e.name);
  }

  function saveEdit(id) {
    if (!editName.trim()) return;
    setEditorials((prev) => prev.map((e) => (e.id === id ? { ...e, name: editName.trim() } : e)));
    setEditingId(null);
    showToast("Editorial actualizada");
  }

  function removeEditorial(id) {
    const inUse = books.some((b) => b.editorialId === id);
    if (inUse) {
      showToast("No se puede eliminar: hay libros cargados con esa editorial");
      return;
    }
    setEditorials((prev) => prev.filter((e) => e.id !== id));
    showToast("Editorial eliminada");
  }

  return (
    <Modal onClose={onClose} title="Gestionar editoriales">
      <p className="text-xs opacity-60 mb-4 leading-relaxed">
        Cada editorial aparece como opción al cargar libros, y sirve para filtrar el catálogo.
      </p>

      <ul className="space-y-2 mb-5">
        {editorials.map((e) => (
          <li key={e.id} className="flex items-center justify-between px-3 py-2 rounded-sm border text-sm" style={{ borderColor: "#2E1A4722" }}>
            {editingId === e.id ? (
              <div className="flex-1 flex items-center gap-2">
                <input className="flex-1 px-2 py-1.5 rounded-sm border text-sm" style={inputStyle} value={editName} onChange={(ev) => setEditName(ev.target.value)} autoFocus />
                <button onClick={() => saveEdit(e.id)} className="font-mono text-[11px] uppercase tracking-wide px-2 py-1 rounded-sm" style={{ background: "#2E1A47", color: "#FFFCFE" }}>
                  Guardar
                </button>
                <button onClick={() => setEditingId(null)} className="font-mono text-[11px] uppercase tracking-wide px-2 py-1 rounded-sm border" style={{ borderColor: "#2E1A4733" }}>
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0" style={{ background: "#2E1A4712" }}>
                    <Building2 size={14} style={{ color: "#2E1A47" }} />
                  </div>
                  <p className="font-medium truncate">{e.name}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => startEdit(e)} title="Editar" aria-label="Editar" className="p-1.5 rounded-sm opacity-60 hover:opacity-100" style={{ color: "#2E1A47" }}>
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => removeEditorial(e.id)} title="Eliminar" aria-label="Eliminar" className="p-1.5 rounded-sm opacity-60 hover:opacity-100" style={{ color: "#7A2E6B" }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {creating ? (
        <div className="p-3 rounded-sm border" style={{ borderColor: "#2E1A4733" }}>
          <Field label="Nombre de la editorial" icon={Building2}>
            <input className="w-full px-3 py-2 rounded-sm border text-sm" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <div className="flex gap-2">
            <button onClick={addEditorial} className="flex-1 font-mono text-xs uppercase tracking-wide py-2 rounded-sm" style={{ background: "#2E1A47", color: "#FFFCFE" }}>
              Crear editorial
            </button>
            <button onClick={() => setCreating(false)} className="flex-1 font-mono text-xs uppercase tracking-wide py-2 rounded-sm border" style={{ borderColor: "#2E1A4733" }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} className="w-full flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-wide py-2.5 rounded-sm" style={{ background: "#A66DD4", color: "#2E1A47", fontWeight: 700 }}>
          <Plus size={14} /> Nueva editorial
        </button>
      )}
    </Modal>
  );
}
