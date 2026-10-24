// Logs visits from search and AI crawlers and checks whether each one is genuine.
// A user-agent string can be faked, so a visit is only "verified" when its IP is in the
// operator's published IP list (OpenAI, Anthropic, Perplexity) or passes the reverse +
// forward DNS check Google and Bing document. This never blocks anything — it only logs:
//   [crawler] {"bot":"OAI-SearchBot","verified":true,"ip":"…","path":"/dtdc-tracking","status":200}
// Turn off with CRAWLER_LOG=off.
import { BlockList, isIPv4, isIPv6 } from 'node:net';
import dns from 'node:dns/promises';

const BOTS = [
  { name: 'OAI-SearchBot', ua: /OAI-SearchBot/i, list: 'https://openai.com/searchbot.json' },
  { name: 'GPTBot', ua: /GPTBot/i, list: 'https://openai.com/gptbot.json' },
  { name: 'ChatGPT-User', ua: /ChatGPT-User/i, list: 'https://openai.com/chatgpt-user.json' },
  { name: 'Claude-SearchBot', ua: /Claude-SearchBot/i, list: 'https://claude.com/crawling/bots.json' },
  { name: 'Claude-User', ua: /Claude-User/i, list: 'https://claude.com/crawling/bots.json' },
  { name: 'ClaudeBot', ua: /ClaudeBot/i, list: 'https://claude.com/crawling/bots.json' },
  { name: 'PerplexityBot', ua: /PerplexityBot/i, list: 'https://www.perplexity.com/perplexitybot.json' },
  { name: 'Perplexity-User', ua: /Perplexity-User/i, list: 'https://www.perplexity.com/perplexity-user.json' },
  { name: 'Googlebot', ua: /Googlebot/i, rdns: /\.(googlebot|google)\.com$/i },
  { name: 'bingbot', ua: /bingbot/i, rdns: /\.search\.msn\.com$/i },
];

const lists = new Map(); // url -> { at, blocks }
const DAY = 24 * 3600e3;

// Published lists are JSON; pick out every CIDR in them so small format changes don't break this.
async function ipList(url) {
  const hit = lists.get(url);
  if (hit && Date.now() - hit.at < DAY) return hit.blocks;
  const blocks = new BlockList();
  try {
    const text = await (await fetch(url, { signal: AbortSignal.timeout(8000) })).text();
    for (const [, net, bits] of text.matchAll(/"([0-9a-fA-F:.]+)\/(\d{1,3})"/g)) {
      if (isIPv4(net)) blocks.addSubnet(net, +bits, 'ipv4');
      else if (isIPv6(net)) blocks.addSubnet(net, +bits, 'ipv6');
    }
    lists.set(url, { at: Date.now(), blocks });
    return blocks;
  } catch {
    return null; // list unavailable -> "unknown"
  }
}

async function rdnsCheck(ip, pattern) {
  try {
    const names = await dns.reverse(ip);
    const name = names.find((n) => pattern.test(n));
    if (!name) return false;
    const { address } = await dns.lookup(name, { family: isIPv4(ip) ? 4 : 6 });
    return address === ip;
  } catch {
    return false;
  }
}

async function verify(bot, ip) {
  if (bot.rdns) return rdnsCheck(ip, bot.rdns);
  const blocks = await ipList(bot.list);
  if (!blocks) return null;
  return blocks.check(ip, isIPv4(ip) ? 'ipv4' : 'ipv6');
}

export function crawlerLog() {
  if ((process.env.CRAWLER_LOG || '').toLowerCase() === 'off') return (_req, _res, next) => next();
  return (req, res, next) => {
    const ua = req.get('user-agent') || '';
    const bot = BOTS.find((b) => b.ua.test(ua));
    // Pages and crawler files only (not scripts, images or the API)
    if (!bot || /^\/(assets|api)\//.test(req.path) || /\.(js|css|png|ico|svg|woff2?)$/.test(req.path)) return next();
    const ip = (req.ip || '').replace(/^::ffff:/, '');
    res.on('finish', () => {
      verify(bot, ip).then((verified) => {
        console.log('[crawler] ' + JSON.stringify({ bot: bot.name, verified, ip, path: req.originalUrl.slice(0, 200), status: res.statusCode }));
      });
    });
    next();
  };
}
