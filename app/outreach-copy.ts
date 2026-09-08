import type { Prospect } from "./operations-state";

export type OutreachProfile = {
  approach: "experience" | "cooperation";
  greeting: "哈喽姐妹" | "哈喽";
  project: string;
  experience: string;
  experienceConfirmed: boolean;
  disclosure: string;
};

export const openingTemplates = {
  experience: "我之前也做过{项目}，需要的话，可以把我当时去的那家发你看看。",
  cooperation: "我之前也做过{项目}，我体验的那家现在也有合作，需要的话发你看看。",
} as const;
export const approachLabels = { experience: "体验推荐", cooperation: "体验＋合作推荐" } as const;

const retiredDisclosureTemplates = new Set([
  "先说一声，我这边也做项目推广。",
  "也先跟你说明下，这次联系有推广推荐的目的。",
]);
export const emptyOutreachProfile = (): OutreachProfile => ({
  approach: "experience",
  greeting: "哈喽姐妹",
  project: "",
  experience: openingTemplates.experience,
  experienceConfirmed: false,
  disclosure: "",
});

export function restoreOutreachProfile(value: unknown): OutreachProfile {
  const p = (value && typeof value === "object" ? value : {}) as Partial<OutreachProfile>;
  const approach = p.approach === "cooperation" ? "cooperation" : "experience";
  return {
    approach,
    greeting: p.greeting === "哈喽" ? "哈喽" : "哈喽姐妹",
    project: typeof p.project === "string" ? p.project : "",
    experience: typeof p.experience === "string" && p.experience.trim() ? p.experience : openingTemplates[approach],
    // Legacy profiles did not confirm the complete batch template.
    experienceConfirmed: Boolean(p.approach) && p.experienceConfirmed === true,
    disclosure: typeof p.disclosure === "string" ? p.disclosure : "",
  };
}

type Context = Pick<Prospect, "intent" | "context" | "location">;
const normalize = (text: string) => text.toLowerCase().replace(/\s/g, "");
export function projectNames(value: string) {
  return [...new Set(value.split(/[\/／、,，;；|\n]/).map(x => x.trim()).filter(Boolean))];
}
export function matchedProject(lead: Context, profile: OutreachProfile) {
  const topics = projectNames(lead.intent).map(normalize);
  const matches = projectNames(profile.project).filter(p => p.length >= 2 && topics.includes(normalize(p)));
  return matches.length === 1 ? matches[0] : "";
}
export function outreachIssue(lead: Context, profile: OutreachProfile) {
  if (!profile.experienceConfirmed) return "待补充：请确认本批项目和话术素材";
  if (!matchedProject(lead, profile)) return "待补充：该用户没有唯一对应的已确认项目";
  if (!profile.experience.trim()) return "待补充：请填写或选择开场模板";
  if (projectNames(profile.project).length > 1 && !profile.experience.includes("{项目}"))
    return "待补充：多项目话术需用 {项目} 对应每位用户，不能复用单一项目经历";
  if (profile.approach === "cooperation" && !/合作|返佣|佣金|转介/.test(profile.experience + profile.disclosure))
    return "待补充：合作推荐需保留对应合作关系说明";
  return "";
}
export function outreachKey(profile: OutreachProfile) {
  return JSON.stringify([profile.approach, profile.greeting, profile.project, profile.experience, profile.experienceConfirmed, profile.disclosure]);
}
export function matchingExperience(lead: Context, profile: OutreachProfile) {
  if (outreachIssue(lead, profile)) return "";
  return profile.experience.trim().replaceAll("{项目}", matchedProject(lead, profile));
}

function conversationAngle(lead: Context) {
  const context = `${lead.intent} ${lead.context}`;
  if (/双眼皮/.test(context) && /恢复|上班|肿/.test(context)) {
    return {
      followup: "你有打算什么时候做吗？恢复到能上班和看不太出肿，最好分开问医生，别把时间排太紧。",
    };
  }
  if (/法令纹/.test(context) && /材料|玻尿酸|比较|假/.test(context)) {
    return {
      followup: "你怕做完不自然，这个面诊时一定要说。两种材料怎么选，我没法隔着屏幕替你定，先问清楚医生为什么推荐那一种。",
    };
  }
  if (/超声炮/.test(context) && /推荐|机构/.test(context)) {
    return {
      followup: "可以呀，你想先聊面诊流程，还是报价里都包含什么？",
    };
  }
  if (/皮秒/.test(context) && /痘印|几次|有用|效果/.test(context)) {
    return {
      followup: "你说的有没有用、要做几次，不能直接照搬别人的。可以问问面诊医生，为什么推荐皮秒、准备怎么看变化。",
    };
  }
  return {
    followup: "可以呀，你想先聊哪块？",
  };
}

// Deterministic demo copy; no live model or sending service is invoked here.
export function openingCopy(lead: Context, profile: OutreachProfile) {
  const experience = matchingExperience(lead, profile);
  if (!experience) return "";
  const suppliedDisclosure = profile.disclosure.trim();
  const disclosure = retiredDisclosureTemplates.has(suppliedDisclosure) ? "" : suppliedDisclosure;
  const hasOffer = /需要的话|发你|给你推荐|推荐给你|分享给你/.test(`${experience}${disclosure}`);
  return [
    `${profile.greeting}～${experience}`,
    disclosure && !experience.includes(disclosure) ? disclosure : "",
    experience && !hasOffer ? "需要的话，可以给你推荐。" : "",
  ].filter(Boolean).join("\n");
}

export function followupCopy(lead: Context | undefined) {
  // The demo's inbound message is “可以，想再了解一下”; do not invent a more
  // specific user reply or add unverified personal experience during follow-up.
  return lead ? conversationAngle(lead).followup : "可以呀，你想先聊哪块？";
}
