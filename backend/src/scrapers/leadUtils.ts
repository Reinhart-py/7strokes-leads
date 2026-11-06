import { ScrapedLead } from './types';

const normalizeText = (value?: string | null): string =>
  (value || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9؀-ۿ]+/g, '');

const digitsOnly = (value?: string | null): string => (value || '').replace(/\D/g, '');

/**
 * Stable identity for a lead used for de-duplication.
 *
 * Place IDs are authoritative. Without one we combine the business name with
 * its phone (or address), so different branches of the same chain are kept as
 * separate leads instead of being collapsed into one.
 */
export function leadKey(lead: Pick<ScrapedLead, 'place_id' | 'title' | 'phone_1' | 'address' | 'street'>): string {
  if (lead.place_id) return `id:${lead.place_id}`;
  const title = normalizeText(lead.title);
  const phone = digitsOnly(lead.phone_1);
  if (phone.length >= 7) return `tp:${title}|${phone.slice(-9)}`;
  return `ta:${title}|${normalizeText(lead.address || lead.street).slice(0, 40)}`;
}

/**
 * Runs `worker` over a queue that may grow while it is being processed,
 * keeping at most `concurrency` tasks in flight. Stops pulling new work as
 * soon as `shouldStop` returns true.
 */
export async function runWorkQueue<T>(
  initial: T[],
  concurrency: number,
  worker: (item: T, enqueue: (...items: T[]) => void) => Promise<void>,
  shouldStop: () => Promise<boolean>
): Promise<void> {
  const queue = [...initial];
  let active = 0;
  let stopped = false;

  await new Promise<void>((resolve) => {
    const pump = async () => {
      if (!stopped && (await shouldStop())) stopped = true;
      while (!stopped && active < concurrency && queue.length > 0) {
        const item = queue.shift() as T;
        active++;
        worker(item, (...items) => queue.push(...items))
          .catch(() => {})
          .finally(() => {
            active--;
            void pump();
          });
      }
      if (active === 0 && (stopped || queue.length === 0)) resolve();
    };
    void pump();
  });
}
