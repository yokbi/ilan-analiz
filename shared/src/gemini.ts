import type { AiClient } from './analiz'

// Zaman aşımı olmadan asılı kalan bir istek paneli sonsuza dek "Analiz ediliyor…"da
// bırakıyordu: fetch'in kendi süresi yok, MV3 service worker'ı da açık istek varken
// uyumuyor. Süre dolunca istek iptal edilir ve AYRI bir hata fırlar ki panel "Google'a
// ulaşılamadı" yerine "zamanında cevap vermedi, tekrar dene" diyebilsin.
export const GEMINI_ZAMAN_ASIMI_MS = 60_000

export class AiZamanAsimiHatasi extends Error {}

// Gemini native generateContent adaptörü. İstemcinin web_search aracını Gemini'nin
// dahili google_search grounding'ine çevirir — ayrı arama key'i gerekmez.
export function geminiClient(opts: {
  apiKey: string; baseUrl?: string; fetcher?: typeof fetch; zamanAsimiMs?: number
}): AiClient {
  const baseUrl = opts.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta'
  const fetcher = opts.fetcher ?? fetch
  const sure = opts.zamanAsimiMs ?? GEMINI_ZAMAN_ASIMI_MS
  return {
    messages: {
      async create(args: any) {
        const govde: Record<string, unknown> = {
          contents: (args.messages ?? []).map((m: any) => ({ role: 'user', parts: [{ text: m.content }] })),
          generationConfig: (() => {
            const gc: Record<string, unknown> = { maxOutputTokens: args.max_tokens }
            if (args.thinking?.type === 'disabled') gc.thinkingConfig = { thinkingBudget: 0 }
            return gc
          })()
        }
        if (args.tools?.some((t: any) => String(t.type ?? '').startsWith('web_search'))) {
          govde.tools = [{ google_search: {} }]
        }

        // Süre gövdenin okunmasını da kapsar: başlık gelip gövde akarken takılan yanıt
        // da asılı kalmasın. Sayaç her denemede (400 sonrası ikinci gönderim dahil) yeniden kurulur.
        const sinirli = async <T>(is: (signal: AbortSignal) => Promise<T>): Promise<T> => {
          const iptal = new AbortController()
          let doldu = false
          const sayac = setTimeout(() => { doldu = true; iptal.abort() }, sure)
          try {
            return await is(iptal.signal)
          } catch (e) {
            if (doldu) throw new AiZamanAsimiHatasi(`gemini: ${sure} ms içinde yanıt gelmedi`)
            throw e
          } finally {
            clearTimeout(sayac)
          }
        }

        const gonder = (g: Record<string, unknown>) => sinirli(async signal => {
          const r = await fetcher(`${baseUrl}/models/${args.model}:generateContent`, {
            method: 'POST',
            headers: { 'x-goog-api-key': opts.apiKey, 'content-type': 'application/json' },
            body: JSON.stringify(g),
            signal
          })
          // 400'de gövdeye bakmadan tekrar deniyoruz; başarılı ve hatalı yanıtın gövdesi
          // ise burada, aynı süre içinde okunur.
          if (r.status === 400 && (g.generationConfig as any)?.thinkingConfig) return { r, metin: null }
          return { r, metin: await r.text() }
        })

        let { r: res, metin } = await gonder(govde)
        // thinkingConfig'i HER model kabul etmiyor: gemini-flash-lite-latest
        // thinkingBudget:0'a 400 INVALID_ARGUMENT veriyor (canlıda ölçüldü) ve o modelde
        // düşünme zaten varsayılan kapalı, yani alan hem gereksiz hem yasak. Düşünmeyi
        // kapatabilen modellerde ise gerekli. Model adı listesi tutmak yerine 400'de
        // alanı düşürüp bir kez daha deniyoruz.
        // 400 çıkarım ÖNCESİ döner, ücretsizdir.
        if (res.status === 400 && (govde.generationConfig as any)?.thinkingConfig) {
          const gc = { ...(govde.generationConfig as Record<string, unknown>) }
          delete gc.thinkingConfig
          ;({ r: res, metin } = await gonder({ ...govde, generationConfig: gc }))
        }
        if (!res.ok) {
          // Boşluklar TEK satıra indirilir: sağlayıcı gövdesi JSON ve içindeki satır
          // sonları log satırını bölüyordu — canlıda mesaj '{' sonrası kayboluyor,
          // yani asıl sebep (RESOURCE_EXHAUSTED / INVALID_ARGUMENT) hiç görünmüyordu.
          const gövde = (metin ?? '').replace(/\s+/g, ' ').slice(0, 300)
          throw new Error(`gemini HTTP ${res.status}: ${gövde}`)
        }
        const data: any = JSON.parse(metin ?? 'null')
        const aday = data?.candidates?.[0]
        if (!aday) throw new Error(`gemini: yanıt boş — candidates yok: ${JSON.stringify(data).slice(0, 300)}`)
        const text = (aday.content?.parts ?? []).map((p: any) => p.text ?? '').join('')
        return {
          content: [{ type: 'text', text }],
          stop_reason: aday.finishReason === 'MAX_TOKENS' ? 'max_tokens' : 'end_turn'
        }
      }
    }
  }
}
