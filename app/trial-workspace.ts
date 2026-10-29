import type { Workspace } from './Operations';
import type { Prospect } from './operations-state';
import { defaultRules } from './workflow-config.ts';
import { walkthroughTaskCode } from './demo-data.ts';

export const trialWorkspaceKey = 'lead-radar-trial-workspace-1';
export const trialDraftKey = 'lead-radar-trial-drafts-1';
export function createTrialWorkspace(base: Workspace, leads: Prospect[]): Workspace {
  const rows = leads.filter(lead => lead.sourceTaskCode === walkthroughTaskCode);
  return { ...base, presentationVersion: 1, dataState: '待处理', batchId: 0,
    collectionTasks: [{id:10004,name:'品牌运营 · 完整流程体验',sourceTaskCode:walkthroughTaskCode,
      platform:'小红书',status:'待配置',createdAt:'2026/10/29',rules:defaultRules(),touchMode:'PRECISION'}],
    batches: [], tasks: [], inboxMessages: [], inboxMonitoring: {}, selected: [], failed: [],
    supplements: {}, adjustments: {}, grades: Object.fromEntries(rows.map(lead => [lead.id,lead.grade])),
    queue: {ids:[],blocked:[],included:[],drafts:{},edited:[]},
    quota: {A:{total:100,used:0,reserved:0},G:{total:100,used:0,reserved:0}},
  };
}
