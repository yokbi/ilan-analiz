import { AnalysisResultSchema, type AnalysisResult } from 'shared'
import { tarayici } from './tarayici'

/**
 * 24 saatlik yerel analiz önbelleği.
 *
 * Aynı ilanı tekrar açan kullanıcıya ikinci kez ücret çıkmasın diye var.
 * Önbellek OTORİTE DEĞİL: bir kayıt okunamıyorsa atılır ve analiz yeniden
 * üretilir — en kötü ihtimalle bir Gemini çağrısı daha yapılır.
 */

const TTL_MS = 24 * 3600_000

/**
 * Kayıt biçiminin sürümü.
 *
 * `AnalysisResult` şeması değiştiğinde burayı bir artır. Eski kayıtlar o an
 * geçersiz sayılır ve yeniden üretilir. Sürüm olmasaydı ne olurdu: şemaya
 * zorunlu bir alan eklendiğinde, dünkü kayıt paneli o alan `undefined` iken
 * çizmeye çalışırdı — ve bu, kullanıcıya çöken bir panel ya da eksik bir
 * bölüm olarak görünürdü, "önbellek eskimiş" olarak değil.
 */
export const KAYIT_SURUMU = 1

const anahtar = (ilanId: string, fiyat: number) => `analiz:${ilanId}:${fiyat}`

export async function lokalSonucGet(ilanId: string, fiyat: number): Promise<AnalysisResult | null> {
  const k = anahtar(ilanId, fiyat)
  const v = (await tarayici.storage.local.get(k))[k]
  if (!v || typeof v !== 'object') return null
  if (typeof v.ts !== 'number' || Date.now() - v.ts > TTL_MS) return null
  // Sürümü olmayan kayıtlar bu alan eklenmeden önce yazılmış olanlardır.
  if (v.surum !== KAYIT_SURUMU) return null

  // Sürüm doğru olsa bile gövde doğrulanıyor: depo kullanıcının makinesinde ve
  // elle de değiştirilebilir; şemaya uymayan bir gövdeyi panele vermek,
  // güvenilmeyen veriyi doğrudan arayüze bağlamak olurdu.
  const cozum = AnalysisResultSchema.safeParse(v.sonuc)
  return cozum.success ? cozum.data : null
}

export async function lokalSonucSet(ilanId: string, fiyat: number, sonuc: AnalysisResult): Promise<void> {
  await tarayici.storage.local.set({
    [anahtar(ilanId, fiyat)]: { sonuc, ts: Date.now(), surum: KAYIT_SURUMU }
  })
}
