export interface StatusDeps {
  pingFirestore: () => Promise<void>;
  pingFormsApi: () => Promise<void>;
  botPermissions: string[];
  requiredPermissions: string[];
  uptimeMs: number;
}

interface HealthOk {
  healthy: true;
}

interface HealthFail {
  healthy: false;
  reason: string;
}

export interface PermissionsResult {
  healthy: boolean;
  granted: string[];
  missing: string[];
}

export interface StatusResult {
  firestore: HealthOk | HealthFail;
  formsApi: HealthOk | HealthFail;
  permissions: PermissionsResult;
  uptime: string;
}

function formatUptime(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);

  return parts.join(" ");
}

async function pingCheck(fn: () => Promise<void>): Promise<HealthOk | HealthFail> {
  try {
    await fn();
    return { healthy: true };
  } catch (e) {
    const reason = e instanceof Error ? e.message : "Unknown error";
    return { healthy: false, reason };
  }
}

export async function checkStatus(deps: StatusDeps): Promise<StatusResult> {
  const [firestore, formsApi] = await Promise.all([
    pingCheck(deps.pingFirestore),
    pingCheck(deps.pingFormsApi),
  ]);

  const missing = deps.requiredPermissions.filter(
    (p) => !deps.botPermissions.includes(p)
  );

  return {
    firestore,
    formsApi,
    permissions: {
      healthy: missing.length === 0,
      granted: deps.botPermissions,
      missing,
    },
    uptime: formatUptime(deps.uptimeMs),
  };
}
