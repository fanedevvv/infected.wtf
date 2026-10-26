import Link from "next/link";
import InfectionField from "@/components/lab/InfectionField";
import { LabWordmark } from "@/components/lab/LabMark";

export default function NotFound() {
  return (
    <div className="nf">
      <InfectionField className="nf-field" />
      <Link href="/" className="nf-brand"><LabWordmark /></Link>
      <div className="nf-body">
        <span className="lab-label"><span className="lab-dot" /> Error 404 · Specimen missing</span>
        <h1 className="nf-code">404</h1>
        <p>Nothing lives at this address. Yet — it could be yours.</p>
        <div className="nf-btns">
          <Link href="/" className="lab-btn lab-btn--solid lab-btn--lg">Back to base</Link>
          <Link href="/register" className="lab-btn lab-btn--ghost lab-btn--lg">Claim a name</Link>
        </div>
      </div>
    </div>
  );
}
