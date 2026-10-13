import { Sidebar } from "@/components/shell/Sidebar";

// Layout for every real screen (Today, Roadmap...). The "(app)" folder name is
// a route group: it groups these pages under one layout without adding
// "/app" to their URLs. The /kit showcase sits outside it, so it has no sidebar.

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
