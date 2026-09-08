import type { Prospect } from "./operations-state";

export type OutreachProfile = {
  greeting: "哈喽姐妹" | "哈喽";
  project: string;
  experience: string;
  experienceConfirmed: boolean;
  disclosure: string;
};

const retiredDisclosureTemplates = new Set([
  "先说一声，我这边也做项目推广。",
  "也先跟你说明下，这次联系有推广推荐的目的。",
]);
export const emptyOutreachProfile = (): OutreachProfile => ({
  greeting: "哈喽姐妹",
  project: "",
  experience: "",
  experienceConfirmed: false,
  disclosure: "",
});

export function restoreOutreachProfile(value: unknown): OutreachProfile {
  const p = (value && typeof value === "object" ? value : {}) as Partial<OutreachProfile>;
  return {
    greeting: p.greeting === "哈喽" ? "哈喽" : "哈喽姐妹",
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
  const topics = lead.intent.split(/[\/／、,，;；|]/).map(normalize);
  return profile.experienceConfirmed && project.length >= 2 &&
    topics.includes(project) ? profile.experience.trim() : "";
}

function conversationAngle(lead: Context) {
  const context = `${lead.intent} ${lead.context}`;
  if (/双眼皮/.test(context) && /恢复|上班|肿/.test(context)) {
    return {
      question: "你做双眼皮的话，大概能留几天休息呀？",
      followup: "你有打算什么时候做吗？恢复到能上班和看不太出肿，最好分开问医生，别把时间排太紧。",
    };
  }
  if (/法令纹/.test(context) && /材料|玻尿酸|比较|假/.test(context)) {
    return {
      question: "法令纹填充你面诊过没？",
      followup: "你怕做完不自然，这个面诊时一定要说。两种材料怎么选，我没法隔着屏幕替你定，先问清楚医生为什么推荐那一种。",
    };
  }
  if (/超声炮/.test(context) && /推荐|机构/.test(context)) {
    const area = lead.location && lead.location !== "未知" ? `${lead.location}的` : "";
    return {
      question: `${area}超声炮机构有看中哪家没？`,
      followup: "可以呀，你想先聊面诊流程，还是报价里都包含什么？",
    };
  }
  if (/皮秒/.test(context) && /痘印|几次|有用|效果/.test(context)) {
    return {
      question: "皮秒去痘印，你面诊问过没？",
      followup: "你说的有没有用、要做几次，不能直接照搬别人的。可以问问面诊医生，为什么推荐皮秒、准备怎么看变化。",
    };
  }
  return {
    question: "你之前问的那个项目，最近还在看吗？",
    followup: "可以呀，你想先聊哪块？",
  };
}

// Deterministic demo copy; no live model or sending service is invoked here.
export function openingCopy(lead: Context, profile: OutreachProfile) {
  const angle = conversationAngle(lead);
  const experience = matchingExperience(lead, profile);
  const suppliedDisclosure = profile.disclosure.trim();
  const disclosure = retiredDisclosureTemplates.has(suppliedDisclosure) ? "" : suppliedDisclosure;
  const hasOffer = /需要的话|发你|给你推荐|推荐给你|分享给你/.test(`${experience}${disclosure}`);
  return [
    `${profile.greeting}～${experience || angle.question}`,
    disclosure && !experience.includes(disclosure) ? disclosure : "",
    experience && !hasOffer ? "需要的话，可以给你推荐。" : "",
  ].filter(Boolean).join("\n");
}

export function followupCopy(lead: Context | undefined) {
  // The demo's inbound message is “可以，想再了解一下”; do not invent a more
  // specific user reply or add unverified personal experience during follow-up.
  return lead ? conversationAngle(lead).followup : "可以呀，你想先聊哪块？";
}
