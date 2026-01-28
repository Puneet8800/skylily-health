#!/usr/bin/env node
/**
 * skylily-health v1.0.0
 * Service health monitoring CLI
 */
import { execSync } from 'child_process';
const c = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
};
const services = [
    {
        name: 'Clawdbot Gateway',
        check: () => {
            try {
                execSync('pgrep -f "clawdbot"', { stdio: 'pipe' });
                const status = execSync('clawdbot status 2>&1 | head -5', { encoding: 'utf8' });
                return { ok: true, detail: 'running' };
            }
            catch {
                return { ok: false, detail: 'not running' };
            }
        }
    },
    {
        name: 'WhatsApp',
        check: () => {
            try {
                const status = execSync('clawdbot status 2>&1 | grep -i whatsapp', { encoding: 'utf8' });
                if (status.includes('OK'))
                    return { ok: true, detail: 'connected' };
                return { ok: false, detail: 'disconnected' };
            }
            catch {
                return { ok: false, detail: 'unknown' };
            }
        }
    },
    {
        name: 'Docker',
        check: () => {
            try {
                const containers = execSync('docker ps -q 2>/dev/null | wc -l', { encoding: 'utf8' }).trim();
                const count = parseInt(containers) || 0;
                return { ok: count > 0, detail: `${count} containers` };
            }
            catch {
                return { ok: false, detail: 'not running' };
            }
        }
    },
    {
        name: 'Tailscale',
        check: () => {
            try {
                const status = execSync('tailscale status 2>/dev/null | head -1', { encoding: 'utf8' });
                if (status.includes('stopped'))
                    return { ok: false, detail: 'stopped' };
                return { ok: true, detail: 'connected' };
            }
            catch {
                return { ok: false, detail: 'not installed' };
            }
        }
    },
    {
        name: 'Disk Space',
        check: () => {
            try {
                const df = execSync('df -h /Volumes/Illegg 2>/dev/null | tail -1', { encoding: 'utf8' });
                const parts = df.trim().split(/\s+/);
                const pct = parseInt(parts[4]) || 0;
                if (pct > 90)
                    return { ok: false, detail: `${parts[4]} used - CRITICAL` };
                if (pct > 80)
                    return { ok: true, detail: `${parts[4]} used - WARNING` };
                return { ok: true, detail: `${parts[4]} used` };
            }
            catch {
                return { ok: true, detail: 'unknown' };
            }
        }
    },
    {
        name: 'Memory',
        check: () => {
            try {
                const free = execSync("vm_stat | awk '/Pages free/ {print $3}'", { encoding: 'utf8' });
                const pagesFree = parseInt(free.replace('.', '')) || 0;
                const mbFree = (pagesFree * 16384) / (1024 * 1024);
                if (mbFree < 500)
                    return { ok: false, detail: `${mbFree.toFixed(0)}MB free - LOW` };
                return { ok: true, detail: `${mbFree.toFixed(0)}MB free` };
            }
            catch {
                return { ok: true, detail: 'unknown' };
            }
        }
    }
];
function main() {
    if (process.argv.includes('--version') || process.argv.includes('-V')) {
        console.log('sky-health v1.0.0');
        process.exit(0);
    }
    const quiet = process.argv.includes('--quiet') || process.argv.includes('-q');
    const json = process.argv.includes('--json');
    const results = [];
    let allOk = true;
    for (const service of services) {
        const result = service.check();
        results.push({ name: service.name, ...result });
        if (!result.ok)
            allOk = false;
    }
    if (json) {
        console.log(JSON.stringify({ ok: allOk, services: results }, null, 2));
        process.exit(allOk ? 0 : 1);
    }
    if (!quiet) {
        console.log(`\n${c.bright}${c.magenta}🏥 Skylily Health Check${c.reset}\n`);
    }
    for (const r of results) {
        if (quiet && r.ok)
            continue;
        const icon = r.ok ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
        console.log(`  ${icon} ${r.name.padEnd(20)} ${c.dim}${r.detail}${c.reset}`);
    }
    if (!quiet) {
        console.log('');
        if (allOk) {
            console.log(`${c.green}All systems operational.${c.reset}\n`);
        }
        else {
            console.log(`${c.red}Some services need attention.${c.reset}\n`);
        }
    }
    process.exit(allOk ? 0 : 1);
}
main();
