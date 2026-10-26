import { BackBar } from "@/ui/Nav";

export default function AnalysisNotFound() {
  return (
    <>
      <BackBar href="/ogunler" label="Öğünler" />
      <h1 className="page-title">Analiz bulunamadı</h1>
      <p className="t-body t-secondary">Bu analiz silinmiş olabilir veya size ait değil.</p>
    </>
  );
}
