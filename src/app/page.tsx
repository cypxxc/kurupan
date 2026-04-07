import Link from "next/link";

const links = [
  { href: "/login", label: "Login" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/assets", label: "Assets" },
  { href: "/borrow-requests", label: "Borrow Requests" },
];

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "720px",
          border: "1px solid var(--border)",
          borderRadius: "24px",
          background: "var(--surface)",
          padding: "2rem",
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
        }}
      >
        <p style={{ margin: 0, color: "var(--muted)" }}>Kurupan V1</p>
        <h1 style={{ marginTop: "0.75rem", marginBottom: "0.75rem" }}>
          Project structure scaffold is ready
        </h1>
        <p style={{ marginTop: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          This entry page exists to confirm the App Router under <code>src/app</code>{" "}
          is active and the requested module areas are in place.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "999px",
                padding: "0.7rem 1rem",
                background: "#f8fafc",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
