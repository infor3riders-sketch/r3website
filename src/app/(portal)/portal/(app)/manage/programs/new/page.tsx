import Link from "next/link";
import { ProgramForm } from "@/components/portal/volunteer-forms";

export const metadata = { title: "New program" };

export default function NewProgramPage() {
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/manage/programs" className="text-sm text-gold hover:text-gold-hover">
        &larr; All programs
      </Link>
      <h1 className="text-3xl font-semibold uppercase">New program</h1>
      <div className="rounded-lg border border-line bg-panel p-5">
        <ProgramForm />
      </div>
    </div>
  );
}
