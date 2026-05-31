// Extratores simples a partir do texto OCR. Best-effort — sempre exigem validação humana.

export type ExtractedFields = {
  nome?: string;
  cpf?: string;
  cnpj?: string;
  datas?: string[];
  protocolos?: string[];
};

const onlyDigits = (s: string) => s.replace(/\D+/g, "");

export function extractFields(text: string): ExtractedFields {
  const out: ExtractedFields = {};
  if (!text) return out;

  // CPF: 000.000.000-00
  const cpfMatch = text.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/);
  if (cpfMatch) out.cpf = cpfMatch[0];

  // CNPJ: 00.000.000/0000-00
  const cnpjMatch = text.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
  if (cnpjMatch) out.cnpj = cnpjMatch[0];

  // Datas: dd/mm/aaaa
  const datas = Array.from(text.matchAll(/\b(\d{2}\/\d{2}\/\d{4})\b/g)).map((m) => m[1]);
  if (datas.length) out.datas = Array.from(new Set(datas)).slice(0, 5);

  // Protocolos: SAE-2025-00001 ou similar
  const protos = Array.from(text.matchAll(/\b([A-Z]{2,5}-\d{4}-\d{3,6})\b/g)).map((m) => m[1]);
  if (protos.length) out.protocolos = Array.from(new Set(protos)).slice(0, 5);

  // Nome: linha após "Nome" / "NOME"
  const nomeMatch = text.match(/nome[:\s]+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÀ-ÿ' ]{4,80})/i);
  if (nomeMatch) out.nome = nomeMatch[1].trim();

  return out;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export const DOCUMENT_TYPES: { value: string; label: string }[] = [
  { value: "rg", label: "RG" },
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ / Cartão MEI" },
  { value: "comprovante_residencia", label: "Comprovante de residência" },
  { value: "alvara", label: "Alvará" },
  { value: "nota_fiscal", label: "Nota fiscal" },
  { value: "das", label: "DAS / Boleto" },
  { value: "contrato", label: "Contrato" },
  { value: "outro", label: "Outro" },
];

export const STATUS_LABEL: Record<string, string> = {
  uploaded: "Enviado",
  processing: "Processando",
  pending_review: "Aguardando revisão",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

export { onlyDigits };
