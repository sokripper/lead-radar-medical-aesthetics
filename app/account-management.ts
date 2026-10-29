export type ManagedPlatform = "小红书" | "抖音";
export type ManagedAccountStatus = "待运维" | "正常" | "已失效" | "受限";
export type ManagedAccount = {
  id: string;
  platform: ManagedPlatform;
  name: string;
  handle: string;
  status: ManagedAccountStatus;
  assignedTo: string[];
};

export type QuotaModel = "A" | "G";
export type QuotaBucket = {
  total: number;
  used: number;
  reserved: number;
};
export type TenantQuota = Record<QuotaModel, QuotaBucket>;

export const demoQuota = (): TenantQuota => ({
  A: { total: 15000, used: 4800, reserved: 6 },
  G: { total: 8000, used: 2100, reserved: 4 },
});

export function quotaRemaining(quota: TenantQuota, model: QuotaModel) {
  const bucket = quota[model];
  return Math.max(0, bucket.total - bucket.used - bucket.reserved);
}

export function quotaCanReserve(quota: TenantQuota, needs: Record<QuotaModel, number>) {
  return (Object.keys(needs) as QuotaModel[]).every(model => needs[model] <= quotaRemaining(quota, model));
}

export function reserveQuota(quota: TenantQuota, model: QuotaModel, count = 1): TenantQuota {
  return { ...quota, [model]: { ...quota[model], reserved: quota[model].reserved + count } };
}

export function settleQuota(quota: TenantQuota, model: QuotaModel, count = 1): TenantQuota {
  return {
    ...quota,
    [model]: {
      ...quota[model],
      used: quota[model].used + count,
      reserved: Math.max(0, quota[model].reserved - count),
    },
  };
}

export function releaseQuota(quota: TenantQuota, model: QuotaModel, count = 1): TenantQuota {
  return { ...quota, [model]: { ...quota[model], reserved: Math.max(0, quota[model].reserved - count) } };
}

export function restoreQuota(value: unknown): TenantQuota {
  if (!value || typeof value !== "object") return demoQuota();
  const saved = value as Partial<TenantQuota>;
  const gradeLegacy = value as Record<"A" | "B" | "C" | "D", Partial<QuotaBucket>>;
  const modeLegacy = value as {PRECISION?:Partial<QuotaBucket>;BULK?:Partial<QuotaBucket>};
  const restoreBucket = (bucket: Partial<QuotaBucket>): QuotaBucket => {
    const total = Math.max(0, Number(bucket.total) || 0);
    const used = Math.max(0, Math.min(total, Number(bucket.used) || 0));
    const reserved = Math.max(0, Math.min(total - used, Number(bucket.reserved) || 0));
    return { total, used, reserved };
  };
  const mergeBuckets = (buckets: Partial<QuotaBucket>[]): QuotaBucket => restoreBucket({
    total: buckets.reduce((sum, bucket) => sum + (Number(bucket?.total) || 0), 0),
    used: buckets.reduce((sum, bucket) => sum + (Number(bucket?.used) || 0), 0),
    reserved: buckets.reduce((sum, bucket) => sum + (Number(bucket?.reserved) || 0), 0),
  });
  const defaults = demoQuota();
  if (saved.A && saved.G) return { A: restoreBucket(saved.A), G: restoreBucket(saved.G) };
  if (gradeLegacy.A && gradeLegacy.B && gradeLegacy.C && gradeLegacy.D) return {
    A: mergeBuckets([gradeLegacy.A, gradeLegacy.B, gradeLegacy.C, gradeLegacy.D]),
    G: mergeBuckets([gradeLegacy.A, gradeLegacy.B, gradeLegacy.C]),
  };
  if (modeLegacy.PRECISION && modeLegacy.BULK) return {
    A: restoreBucket(modeLegacy.BULK), G: restoreBucket(modeLegacy.PRECISION),
  };
  return defaults;
}

export const currentOperator = "当前操作人";
export const demoOperators = [currentOperator, "运营同事 A", "运营同事 B"];
export const demoAccounts = (): ManagedAccount[] => [
  { id: "xhs-main", platform: "小红书", name: "小红书品牌号", handle: "xhs-brand", status: "正常", assignedTo: [currentOperator] },
  { id: "xhs-sub", platform: "小红书", name: "小红书顾问号", handle: "xhs-adviser", status: "正常", assignedTo: [currentOperator] },
  { id: "dy-main", platform: "抖音", name: "抖音品牌号", handle: "dy-brand", status: "待运维", assignedTo: [] },
];

export function restoreManagedAccounts(value: unknown): ManagedAccount[] {
  if (!Array.isArray(value) || !value.length) return demoAccounts();
  const restored = value.filter(item => item && typeof item.id === "string" && typeof item.name === "string")
    .map(item => ({
      id: item.id,
      platform: item.platform === "抖音" ? "抖音" : "小红书",
      name: item.name,
      handle: typeof item.handle === "string" ? item.handle : "",
      status: (["正常", "已失效", "受限"] as string[]).includes(item.status) ? item.status : "待运维",
      assignedTo: Array.isArray(item.assignedTo) ? item.assignedTo.filter((name: unknown) => typeof name === "string") : [],
    })) as ManagedAccount[];
  return restored.length ? restored : demoAccounts();
}

export function assignedAccounts(accounts: ManagedAccount[], operator = currentOperator, platform: ManagedPlatform = "小红书") {
  return accounts.filter(account => account.platform === platform && account.assignedTo.includes(operator));
}

export function accountReady(accounts: ManagedAccount[], id: string, operator = currentOperator) {
  const account = accounts.find(item => item.id === id);
  return Boolean(account && account.platform === "小红书" && account.status === "正常" && account.assignedTo.includes(operator));
}

export function accountDraftError(draft: ManagedAccount, accounts: ManagedAccount[], editingId = "") {
  if (!draft.name.trim() || !draft.handle.trim()) return "请填写账号名称和平台账号标识。";
  if (accounts.some(item => item.id !== editingId && item.platform === draft.platform && item.handle === draft.handle.trim()))
    return "该平台账号标识已存在。";
  return "";
}

export type PlatformMember = { id: string; name: string; login: string; role: "管理员" | "成员"; enabled: boolean };
export const demoMembers = (): PlatformMember[] => [
  {id:currentOperator,name:"顾凯",login:"gukai",role:"管理员",enabled:true},
  {id:"运营同事 A",name:"运营同事 A",login:"operator-a",role:"成员",enabled:true},
  {id:"运营同事 B",name:"运营同事 B",login:"operator-b",role:"成员",enabled:true},
];
export function restoreMembers(value: unknown): PlatformMember[] {
  if(!Array.isArray(value)) return demoMembers();
  const members=value.filter(m=>m && typeof m.id === "string" && typeof m.name === "string" && typeof m.login === "string").map(m=>({...m,role:m.role === "管理员" ? "管理员" as const : "成员" as const,enabled:m.enabled !== false}));
  return members.some(m=>m.id === currentOperator) ? members : demoMembers();
}
