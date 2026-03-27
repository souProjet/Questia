import { Navbar } from '@/components/Navbar';

export default function LegalSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="pt-[4.75rem] sm:pt-24">{children}</div>
    </>
  );
}
