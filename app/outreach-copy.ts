import type { Prospect } from "./operations-state";

export type OutreachProfile = {
  project: string;
  experience: string;
  experienceConfirmed: boolean;
  disclosure: string;
};

const defaultDisclosure = "也先跟你说明下，这次联系有推广推荐的目的。";
export const emptyOutreachProfile = (): OutreachProfile => ({
  project: "",
  experience: "",
  experienceConfirmed: false,
  disclosure: "",
});

export function restoreOutreachProfile(value: unknown): OutreachProfile {
  const p = (value && typeof value === "object" ? value : {}) as Partial<OutreachProfile>;
  return {
    project: typeof p.project === "string" ? p.project : "",
    experience: typeof p.experience === "string" ? p.experience : "",
    experienceConfirmed: p.experienceConfirmed === true,
    disclosure: typeof p.disclosure === "string" ? p.disclosure : "",
  };
}

type Context = Pick<Prospect, "intent" | "context" | "location">;
const normalize = (text: string) => text.toLowerCase().replace(/\s/g, "");
export function matchingExperience(lead: Context, profile: OutreachProfile) {
  const project = normalize(profile.project.trim());
  // This prototype only reuses explicitly confirmed, matching material. It does
  // not infer an account owner's treatment history from the recipient's post.
  return profile.experienceConfirmed && project.length >= 2 &&
    normalize(lead.intent).includes(project) ? profile.experience.trim() : "";
}

function conversationAngle(lead: Context) {
  const context = `${lead.intent} ${lead.context}`;
  if (/双眼皮/.test(context) && /恢复|上班|肿/.test(context)) {
    return {
      opening: "看到你在问双眼皮术后上班的事。",
      question: "你主要是想提前安排请假吗？",
      followup: "你是担心上班不方便，还是比较在意看起来肿不肿呀？具体恢复时间还是得结合个人情况问医生。",
    };
  }
  if (/法令纹/.test(context) && /材料|玻尿酸|比较|假/.test(context)) {
    return {
      opening: "看到你在比较法令纹填充的材料。",
      question: "你现在更纠结材料怎么选，还是担心做完不自然呀？",
      followup: "你有去面诊了解过吗？具体用哪种材料，我没法替你判断；可以先把担心的地方整理出来，当面问清楚。",
    };
  }
  if (/超声炮/.test(context) && /推荐|机构/.test(context)) {
    const area = lead.location && lead.location !== "未知" ? `${lead.location}的` : "";
    return {
      opening: `看到你在找${area}超声炮机构。`,
      question: "你是想先多了解几家，还是已经有备选了？",
      followup: "你目前有备选的机构了吗？如果还没定，可以先把想问的费用、面诊和后续安排理清楚，再慢慢比较。",
    };
  }
  if (/皮秒/.test(context) && /痘印|几次|有用|效果/.test(context)) {
    return {
      opening: "看到你在了解皮秒去痘印。",
      question: "你现在更想了解次数和费用，还是担心不适合自己呀？",
      followup: "你有去咨询过，还是现在主要看大家的分享呀？要做几次、适不适合，还是得让医生看具体情况。",
    };
  }
  return {
    opening: "看到你的留言。",
    question: "你现在还在了解这个项目吗？",
    followup: "可以呀，你更想了解哪一块？先聊你关心的就好。",
  };
}

// Deterministic demo copy; no live model or sending service is invoked here.
export function openingCopy(lead: Context, identity: string, profile: OutreachProfile) {
  const angle = conversationAngle(lead);
  const experience = matchingExperience(lead, profile);
  return [
    `你好呀，我是${identity.trim()}。${angle.opening}`,
    experience,
    angle.question,
    defaultDisclosure,
    profile.disclosure.trim() !== defaultDisclosure ? profile.disclosure.trim() : "",
  ].filter(Boolean).join("\n");
}

export function followupCopy(lead: Context | undefined) {
  // The demo's inbound message is “可以，想再了解一下”; do not invent a more
  // specific user reply or add unverified personal experience during follow-up.
  return lead ? conversationAngle(lead).followup : "可以呀，你更想了解哪一块？先聊你关心的就好。";
}
