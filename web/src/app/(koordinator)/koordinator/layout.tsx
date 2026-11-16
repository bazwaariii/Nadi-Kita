import { redirect } from "next/navigation";
import { CoordinatorSidebar } from "@/components/ui/Navigation";
import { getSessionUser } from "@/server/auth";

export default async function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();

  if (!session) {
    redirect("/masuk");
  }

  if (session.role === "DONOR") {
    redirect("/donor");
  }

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      <CoordinatorSidebar
        initialUser={{
          id: session.userId,
          name: session.name,
          email: session.email,
          role: session.role,
          donorId: session.donorId ?? null,
          bloodGroup: null,
          ktpVerified: null,
        }}
      />
      <main
        id="konten-utama"
        className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7"
      >
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>
    </div>
  );
}
