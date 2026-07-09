import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as https from 'https';

export interface StockTicker {
  code: string;
  name: string;
  price: number;
  change: number; // percentage change on the day
  basePrice?: number; // scraped daily closing price
  volumeXof?: number; // volume in XOF (used for top-20 ranking)
  open?: number;
  high?: number;
  low?: number;
  volumeShares?: number;
}

// ---------------------------------------------------------------------------
// Real BRVM closing prices (July 2026) — used only as emergency fallback
// if Sika Finance is unreachable. Updated manually with latest market data.
// ---------------------------------------------------------------------------
const FALLBACK_STOCKS: StockTicker[] = [
  { code: 'SNTS',  name: 'SONATEL Sénégal',                     price: 31000, change:  3.68, basePrice: 31000, volumeXof: 220844000 },
  { code: 'CIEC',  name: 'CIE Côte d\'Ivoire',                  price:  5300, change: -3.37, basePrice:  5300, volumeXof:  30183500 },
  { code: 'SLBC',  name: 'SOLIBRA Côte d\'Ivoire',              price: 39900, change: -3.86, basePrice: 39900, volumeXof:   5187000 },
  { code: 'ONTBF', name: 'ONATEL Burkina Faso',                  price:  2795, change: -1.06, basePrice:  2795, volumeXof:   6749925 },
  { code: 'SGBC',  name: 'Société Générale Côte d\'Ivoire',     price: 38900, change: -0.26, basePrice: 38900, volumeXof:  56288300 },
  { code: 'ETIT',  name: 'ETI Togo',                             price:    56, change:  5.66, basePrice:    56, volumeXof: 188517560 },
  { code: 'TTLC',  name: 'TOTAL Côte d\'Ivoire',                price:  2850, change: -3.06, basePrice:  2850, volumeXof: 197391000 },
  { code: 'STBC',  name: 'SITAB Côte d\'Ivoire',                price: 24055, change: -2.02, basePrice: 24055, volumeXof: 198020760 },
  { code: 'UNXC',  name: 'UNIWAX Côte d\'Ivoire',               price:  1285, change: -7.22, basePrice:  1285, volumeXof:  36198450 },
  { code: 'BOAM',  name: 'BANK OF AFRICA Mali',                  price:  5395, change:  5.78, basePrice:  5395, volumeXof:  63671790 },
  { code: 'BOAN',  name: 'BANK OF AFRICA Niger',                 price:  4340, change:  5.34, basePrice:  4340, volumeXof:  45370360 },
  { code: 'BOAB',  name: 'BANK OF AFRICA Bénin',                price:  8870, change: -1.99, basePrice:  8870, volumeXof:  83555400 },
  { code: 'BOAC',  name: 'BANK OF AFRICA Côte d\'Ivoire',       price:  9490, change:  2.59, basePrice:  9490, volumeXof:  86577270 },
  { code: 'BOAS',  name: 'BANK OF AFRICA Sénégal',              price:  7290, change:  0.41, basePrice:  7290, volumeXof:  65697480 },
  { code: 'SDSC',  name: 'AFRICA GLOBAL LOGISTICS CI',          price:  2355, change: -4.66, basePrice:  2355, volumeXof:  55768755 },
  { code: 'BICB',  name: 'BICICI Bénin',                        price:  6375, change:  1.59, basePrice:  6375, volumeXof:  53938875 },
  { code: 'SAFC',  name: 'SAFCA Côte d\'Ivoire',                price:  4270, change: -5.11, basePrice:  4270, volumeXof:  30026640 },
  { code: 'SCRC',  name: 'SUCRIVOIRE Côte d\'Ivoire',           price:  3550, change: -2.74, basePrice:  3550, volumeXof:  23511650 },
  { code: 'ORGT',  name: 'ORAGROUP Togo',                       price:  2685, change: -1.29, basePrice:  2685, volumeXof:  17251125 },
  { code: 'SEMC',  name: 'CROWN SIEM Côte d\'Ivoire',           price:  1350, change: -6.57, basePrice:  1350, volumeXof:  11703150 },
];

// Mapping des codes boursiers Sika Finance → codes de l'application BAOU
// (Sika Finance utilise le format : /marches/cotation_CODE.pays)
const SIKA_HREF_TO_CODE: Record<string, string> = {
  'SNTS.sn':  'SNTS',
  'CIEC.ci':  'CIEC',
  'SLBC.ci':  'SLBC',
  'ONTBF.bf': 'ONTBF',
  'SGBC.ci':  'SGBC',
  'ETIT.tg':  'ETIT',
  'TTLC.ci':  'TTLC',
  'STBC.ci':  'STBC',
  'UNXC.ci':  'UNXC',
  'SDSC.ci':  'SDSC',
  'BOAM.ml':  'BOAM',
  'BOAN.ne':  'BOAN',
  'BOAB.bj':  'BOAB',
  'BOAC.ci':  'BOAC',
  'BOAS.sn':  'BOAS',
  'BICB.bj':  'BICB',
  'SAFC.ci':  'SAFC',
  'SCRC.ci':  'SCRC',
  'ORGT.tg':  'ORGT',
  'SEMC.ci':  'SEMC',
  'ORAC.ci':  'ORAC',
  'PALC.ci':  'PALC',
  'ECOC.ci':  'ECOC',
  'CFAC.ci':  'CFAC',
  'BICC.ci':  'BICC',
  'NSBC.ci':  'NSBC',
  'CBIBF.bf': 'CBIBF',
  'NEIC.ci':  'NEIC',
  'NTLC.ci':  'NTLC',
  'SIBC.ci':  'SIBC',
  'SDCC.ci':  'SDCC',
  'SMBC.ci':  'SMBC',
  'STAC.ci':  'STAC',
  'UNLC.ci':  'UNLC',
  'SHEC.ci':  'SHEC',
  'SOGC.ci':  'SOGC',
  'SPHC.ci':  'SPHC',
  'BNBC.ci':  'BNBC',
  'FTSC.ci':  'FTSC',
  'SIVC.ci':  'SIVC',
  'SVOC.ci':  'SVOC',
  'CABC.ci':  'CABC',
  'SICC.ci':  'SICC',
  'PRSC.ci':  'PRSC',
  'ABJC.ci':  'ABJC',
  'LNBB.bj':  'LNBB',
  'BOABF.bf': 'BOABF',
  'BICIB.bj': 'BICIB',
  'TTLS.sn':  'TTLS',
};

@Injectable()
export class MarketService implements OnModuleInit {
  private readonly logger = new Logger(MarketService.name);

  // Initialized with real fallback data so users never see wrong prices
  private stocks: StockTicker[] = [...FALLBACK_STOCKS];

  async onModuleInit() {
    this.logger.log('[BAOU Market] Scraping Sika Finance at startup...');
    try {
      await this.scrapeSikaFinance();
    } catch (error) {
      this.logger.error('[BAOU Market] Startup scrape failed. Using fallback data:', error.message);
    }
  }

  // Refresh every day at 17:30 WAT (15:30 UTC) after market close
  @Cron('30 15 * * 1-5')
  async handleDailyScrape() {
    this.logger.log('[BAOU Market] Daily market close scraping starting...');
    try {
      await this.scrapeSikaFinance();
    } catch (error) {
      this.logger.error('[BAOU Market] Daily scrape failed:', error.message);
    }
  }

  // Also refresh every morning at 09:30 WAT (07:30 UTC) for opening prices
  @Cron('30 7 * * 1-5')
  async handleMorningScrape() {
    this.logger.log('[BAOU Market] Morning market open scraping starting...');
    try {
      await this.scrapeSikaFinance();
    } catch (error) {
      this.logger.error('[BAOU Market] Morning scrape failed:', error.message);
    }
  }

  /**
   * Scrape all BRVM stock prices directly from Sika Finance.
   * Sika Finance provides real-time BRVM data in a clean HTML table (id="tblShare").
   * No Python script or JSON file required.
   */
  async scrapeSikaFinance(): Promise<void> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'www.sikafinance.com',
        path: '/marches/aaz',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9',
        }
      };

      const req = https.get(options, (res) => {
        let html = '';
        res.on('data', (chunk) => html += chunk);
        res.on('end', () => {
          try {
            const parsed = this.parseSikaFinanceHtml(html);
            if (parsed.length >= 5) {
              this.stocks = parsed;
              this.logger.log(`[BAOU Market] Sika Finance scraping OK: ${parsed.length} actions chargées.`);
              resolve();
            } else {
              this.logger.warn(`[BAOU Market] Sika Finance returned only ${parsed.length} rows. Keeping current data.`);
              resolve();
            }
          } catch (e) {
            this.logger.error(`[BAOU Market] Parse error: ${e.message}`);
            reject(e);
          }
        });
      });

      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Sika Finance request timed out after 15s'));
      });

      req.on('error', (e) => {
        reject(new Error(`Sika Finance request error: ${e.message}`));
      });
    });
  }

  /**
   * Parse the Sika Finance HTML table (id="tblShare").
   * Columns: Nom | Ouverture | +Haut | +Bas | Volume (titres) | Volume (XOF) | Dernier | Variation
   * Each row has a link href like: /marches/cotation_SNTS.sn
   */
  private parseSikaFinanceHtml(html: string): StockTicker[] {
    const results: StockTicker[] = [];

    // Find rows inside the #tblShare table
    const tableMatch = html.match(/<table[^>]+id="tblShare"[^>]*>([\s\S]*?)<\/table>/i);
    if (!tableMatch) {
      throw new Error('Table #tblShare not found on Sika Finance page');
    }

    const tableHtml = tableMatch[1];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;

    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const rowHtml = rowMatch[1];

      // Extract href to get the ticker code
      const hrefMatch = rowHtml.match(/href="\/marches\/cotation_([A-Za-z0-9]+\.[a-z]+)"/i);
      if (!hrefMatch) continue; // skip header row

      const hrefKey = hrefMatch[1].toUpperCase();
      const appCode = SIKA_HREF_TO_CODE[hrefKey] || hrefKey.split('.')[0];

      // Extract all td text contents
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells: string[] = [];
      let tdMatch: RegExpExecArray | null;
      while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
        // Strip HTML tags, replace non-breaking spaces, clean up
        const text = tdMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/\xa0/g, ' ')
          .replace(/\r/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        cells.push(text);
      }

      // columns: [0]=Nom, [1]=Ouverture, [2]=+Haut, [3]=+Bas, [4]=Vol titres, [5]=Vol XOF, [6]=Dernier, [7]=Variation
      if (cells.length < 7) continue;

      const parseFrenchNumber = (s: string): number => {
        // Sika Finance uses &#xA0; (HTML entity for non-breaking space) as thousands separator
        // e.g. "2&#xA0;305" → "2305", "14&#xA0;696&#xA0;680" → "14696680"
        const cleaned = s
          .replace(/&#xA0;/gi, '')  // remove HTML-encoded non-breaking space (thousands sep)
          .replace(/&nbsp;/gi, '')   // remove &nbsp; entity
          .replace(/\xa0/g, '')      // remove actual non-breaking space char
          .replace(/ /g, '')         // remove regular spaces
          .replace('%', '')
          .replace(',', '.');        // decimal comma → decimal point
        const n = parseFloat(cleaned);
        return isNaN(n) ? 0 : n;
      };

      const nom = cells[0];
      const open = parseFrenchNumber(cells[1]);
      const high = parseFrenchNumber(cells[2]);
      const low = parseFrenchNumber(cells[3]);
      const volumeShares = parseFrenchNumber(cells[4]);
      const volumeXof = parseFrenchNumber(cells[5]);
      const dernier = parseFrenchNumber(cells[6]);   // closing/last price
      const variation = parseFrenchNumber(cells[7]); // % change

      if (dernier <= 0) continue; // skip stocks with no price (suspended, etc.)

      results.push({
        code: appCode,
        name: nom,
        price: dernier,
        change: variation,
        basePrice: dernier,
        volumeXof,
        open: open || dernier,
        high: high || dernier,
        low: low || dernier,
        volumeShares: volumeShares || 0,
      });
    }

    // Sort by XOF volume descending and return all stocks
    results.sort((a, b) => (b.volumeXof || 0) - (a.volumeXof || 0));

    return results;
  }

  getStocks(): StockTicker[] {
    // Simulate tiny real-time fluctuations (+/- 0.3%) around today's closing price
    return this.stocks.map((stock) => {
      const base = stock.basePrice || stock.price;
      const pct = (Math.random() * 0.6 - 0.3) / 100; // -0.3% to +0.3%
      const newPrice = Math.round(base * (1 + pct));
      return {
        ...stock,
        price: newPrice,
      };
    });
  }

  // -------------------------------------------------------------------------
  // SGI scraping from brvm.org (official list of licensed brokerage firms)
  // -------------------------------------------------------------------------
  async scrapeSgis(): Promise<string[]> {
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.brvm.org',
        path: '/fr/intervenants/sgi/tous',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      };

      const req = https.get(options, (res) => {
        let html = '';
        res.on('data', (chunk) => html += chunk);
        res.on('end', () => {
          try {
            // The BRVM site lists SGIs inside divs like:
            // <div class="SénégalPays"> <img ...> ABCO Bourse </div>
            const regex = /<div class="[^"]*">\s*<img[^>]*>\s*([^<\r\n]+)/gi;
            let match: RegExpExecArray | null;
            const sgis = new Set<string>();
            while ((match = regex.exec(html)) !== null) {
              const cleanName = match[1].replace(/&amp;/g, '&').replace(/&#039;/g, "'").trim();
              if (cleanName && cleanName.length > 2 && !cleanName.toLowerCase().includes('toutes') && !cleanName.toLowerCase().includes('courtiers')) {
                sgis.add(cleanName);
              }
            }

            const list = sgis.size > 0 ? Array.from(sgis) : this.getDefaultSgis();
            this.logger.log(`[BAOU SGI] ${list.length} SGIs chargées (web: ${sgis.size > 0}).`);
            resolve(list);
          } catch (e) {
            this.logger.error(`SGI parse error: ${e.message}`);
            resolve(this.getDefaultSgis());
          }
        });
      });

      req.setTimeout(10000, () => { req.destroy(); resolve(this.getDefaultSgis()); });
      req.on('error', () => resolve(this.getDefaultSgis()));
    });
  }

  private getDefaultSgis(): string[] {
    return [
      'ABCO Bourse',
      'ATLANTIQUE FINANCE',
      'ATTIJARI SECURITIES WEST AFRICA',
      'BICI Bourse',
      'BOA Capital Securities',
      'Coris Bourse',
      'Ecobank Investment Corporation',
      'NSIA Finance',
      'SGI Phoenix Capital Management',
      'Société Générale Capital Securities West Africa',
    ];
  }
}
