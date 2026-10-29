import type { Prospect } from "./operations-state";
import type { ScreeningRules } from "./workflow-config";

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

// D 类没有足够的业务上下文，只能使用已确认的客户产品信息。
// 原型按用户 id 稳定轮换文案，不伪装成读过对方的帖子或评论。
export function productOpeningCopy(rules:Pick<ScreeningRules,'offering'|'audience'|'businessNeeds'>,seed:number) {
  const offering=rules.offering.trim();
  const variants=[
    `你好，我这边在做${offering}。不确定你近期是否需要，有相关问题可以在这里聊。`,
    `打扰啦，我做的是${offering}。如果刚好是你在了解的方向，可以先聊聊具体需求。`,
    `你好，想和你认识一下。我这边做${offering}，有需要时可以聊，不着急。`,
  ];
  return variants[seed%variants.length];
}

export const contextualCopyVersion = "context-conversation-v2";
// Prototype examples, not an LLM. Production generation must use the linked post,
// comment and available parent comment plus verified business facts. Never infer
// personal experience, customer results, prices or available assets from a keyword.
export function contextualOpeningCopy(lead: Pick<Prospect, "intent" | "context" | "businessScene">, rules: Pick<ScreeningRules, "industry" | "offering">) {
  const text = `${lead.intent} ${lead.context}`;
  const social = /运营|投放|达人|新媒体|小红书|抖音/.test(rules.offering);
  if (social) {
    if (lead.businessScene === "泛讨论" || /^(谢谢|感谢|收藏|学习|蹲)/.test(lead.context.trim()))
      return "你是先了解账号运营，还是也在做自己的账号？如果只是看看也没关系。";
    if (lead.businessScene === "招聘运营")
      return "招人和外包可以先按手头的工作拆一拆。现在最缺的是写内容、拍摄，还是统筹整个账号？先把这块理清，选择会容易些。";
    if (lead.businessScene === "达人投放")
      return "找达人可以先把想覆盖的人群和内容方向定下来。你这次更想让大家认识产品，还是希望带来咨询？";
    if (lead.businessScene === "运营问题") {
      if (/投放|投流|预算/.test(text)) return "先别急着追加预算。你说的效果不理想，主要是咨询量不稳定，还是有人咨询但没往下聊？这两种情况可以分开看。";
      if (/转化|成交|咨询/.test(text)) return "有流量但没转化，先别急着把内容全推翻。现在主要卡在没人咨询，还是有人问了却没往下聊？这两种情况要分开看。";
      return "可以先从最卡住的那一步看。你现在主要是内容发出去没人看，还是有人看、互动却不多？";
    }
    if (/收费|报价|多少钱|价格/.test(lead.context)) return "费用要看具体做哪些事。你更想了解日常代运营，还是单次投放？先把范围对齐，会更好比较。";
    if (lead.businessScene === "服务合作") return "可以在这里聊。你是想把账号日常运营交出去，还是先解决内容和获客这块？先说说目前最着急的一件事就好。";
  }
  // A short comment may have no usable context. Ask a modest question rather
  // than restating an unsupported need or inserting an entire product pitch.
  const topic = lead.intent.split(/[\/／、]/)[0].trim();
  const subject = topic && !/未知|待判断|上下文|日常互动|泛讨论/.test(topic) ? topic.slice(0, 22) : rules.industry.trim();
  return `关于${subject}，你现在最想弄清楚哪一块？可以先聊具体情况，再看有没有合适的办法。`;
}

export function followupCopy(lead: Context | undefined) {
  // The demo's inbound message is “可以，想再了解一下”; do not invent a more
  // specific user reply or add unverified personal experience during follow-up.
  return lead ? conversationAngle(lead).followup : "可以呀，你想先聊哪块？";
}

export function postOpeningCopy(post: {title:string;content:string}, rules: Pick<ScreeningRules,'offering'>) {
  const topic=post.title.replace(/[。！？!?]$/,'');
  return `“${topic}”这个话题，确实要结合实际业务来看。我们提供${rules.offering.trim()}，可以围绕具体问题交流，不急着定方案。`;
}
