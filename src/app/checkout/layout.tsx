import { AuditStepper } from "@/components/AuditStepper";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <AuditStepper>{children}</AuditStepper>;
}
