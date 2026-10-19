import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,reducedMotion:'reduce'});
const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
const b=(name)=>p.getByRole('button',{name,exact:true});
const d=(name)=>p.getByRole('dialog',{name,exact:true});
const check=async(name,fn)=>{await fn();console.log('PASS',name);};
const shot=process.env.QA_DIR||'/tmp/lead-radar-browser-qa';await fs.mkdir(shot,{recursive:true});
try {
await p.goto(process.env.BASE_URL||'http://127.0.0.1:3105/');
await check('采集任务首页不提前要求发送账号',async()=>{
 assert.equal(await p.getByLabel('个人侧选择发送账号',{exact:true}).count(),0);
 await b('触达与跟进').click();
 const picker=p.getByLabel('个人侧选择发送账号',{exact:true});
 assert.equal(await picker.locator('option').count(),3);
 await picker.selectOption('xhs-sub');
 assert.equal(await p.getByLabel('个人侧选择发送账号',{exact:true}).inputValue(),'xhs-sub');
 await b('数据处理').click();
});
await check('账号管理与业务页面同级导航且可直接返回',async()=>{assert.equal(await b('切换管理侧（演示）').count(),0);await b('账号管理（管理权限）').click();await p.getByRole('heading',{name:'账号管理'}).waitFor();await b('编辑与分配').first().click();await d('编辑与分配账号').getByLabel('运营同事 A').check();await b('保存账号').click();await p.getByText('当前操作人、运营同事 A',{exact:true}).waitFor();await b('数据处理').click();assert.equal(await b('新增账号').count(),0);assert.equal(await p.getByLabel('个人侧选择发送账号',{exact:true}).count(),0);});
await b('新建任务').first().click();const createTaskDialog=d('新建采集任务');await createTaskDialog.getByLabel('任务中文名称',{exact:true}).fill('新媒体增长线索');await createTaskDialog.getByLabel('羚羊任务 ID',{exact:true}).fill('6b27c68f027e412680393da7b322516e');await createTaskDialog.getByLabel('目标客户',{exact:true}).fill('近期有新媒体增长需求的商家');await createTaskDialog.getByRole('button',{name:'创建任务',exact:true}).click();
await check('任务列表进入独立工作区',async()=>{await b('进入任务').click();await b('← 返回任务列表').waitFor();await p.getByRole('navigation',{name:'任务工作区'}).waitFor();});
await check('等待数据或可解析阶段可编辑任务与规则',async()=>{await b('编辑任务').click();const editTaskDialog=d('编辑采集任务');await editTaskDialog.getByLabel('任务中文名称',{exact:true}).fill('新媒体增长线索筛选');await editTaskDialog.getByRole('button',{name:'保存修改',exact:true}).click();await p.getByRole('heading',{name:'新媒体增长线索筛选',exact:true}).waitFor();});
await b('开始解析').click();await p.getByText('0 位用户已选择',{exact:true}).waitFor();
await check('默认展示可触达且无人选中',async()=>{assert.equal(await p.locator('.lead-table tbody tr').count(),6);assert.equal(await p.locator('.lead-table tbody input:checked').count(),0);});
await check('规则与任务绑定并可在任务中查看',async()=>{await b('规则快照').click();await p.locator('.screening-rules').getByText('近期有新媒体增长需求的商家',{exact:true}).waitFor();await b('筛选结果').click();assert.equal(await p.locator('.lead-table tbody tr').count(),6);});
await p.getByLabel('选择 南宁轻奢美业',{exact:true}).check();
await check('异常独立处理且保留主流程选择',async()=>{await p.getByRole('navigation',{name:'任务工作区'}).getByRole('button',{name:'需要处理（2）',exact:true}).click();await b('查看并处理记录').click();await d('需要处理').waitFor();await b('待判断').click();await p.getByLabel('补充 提问样本 的信息',{exact:true}).waitFor();assert.equal(await p.locator('.attention-card').count(),1);assert.equal(await p.getByLabel('补充 提问样本 的信息',{exact:true}).count(),1);await b('处理失败').click();await b('重试此条（模拟）').waitFor();assert.equal(await p.locator('.attention-card').count(),1);await b('重试此条（模拟）').click();await b('返回正常结果').click();await b('筛选结果').click();assert.equal(await p.getByLabel('选择 南宁轻奢美业',{exact:true}).isChecked(),true);});
await p.screenshot({path:shot+'/rules.png',fullPage:true});
await b('可触达').click();await b('详情').first().click();await d('南宁轻奢美业').getByText('人工调整记录',{exact:true}).waitFor();await d('南宁轻奢美业').getByRole('button',{name:'关闭面板'}).click();
await check('人工调整必须有原因并可追溯',async()=>{await p.getByLabel('调整 南宁轻奢美业 的等级').selectOption('B');assert.equal(await d('调整意向等级').getByRole('button',{name:'保存调整'}).isEnabled(),false);await p.getByLabel('调整原因').fill('近期计划仍需了解');await b('保存调整').click();await b('详情').first().click();await d('南宁轻奢美业').getByText('人工调整记录',{exact:true}).click();await d('南宁轻奢美业').getByText(/近期计划仍需了解/).waitFor();await d('南宁轻奢美业').getByRole('button',{name:'关闭面板'}).click();});

await check('用户详情可以选择新等级并记录原因',async()=>{
 await b('详情').first().click();await d('南宁轻奢美业').getByRole('button',{name:'调整意向等级',exact:true}).click();
 await p.getByLabel('调整后的意向等级',{exact:true}).selectOption('A');await p.getByLabel('调整原因',{exact:true}).fill('补充确认近期正在找机构');await b('保存调整').click();
 await d('南宁轻奢美业').getByText('人工调整记录',{exact:true}).click();await d('南宁轻奢美业').getByText(/补充确认近期正在找机构/).waitFor();
 await d('南宁轻奢美业').getByRole('button',{name:'关闭面板'}).click();assert.equal(await p.getByLabel('调整 南宁轻奢美业 的等级').inputValue(),'A');
});
await p.getByLabel('选择 南宁轻奢美业',{exact:true}).check();await b('生成沟通内容').click();await d('规则与话术').waitFor();
await check('正式身份为空阻止生成',async()=>{assert.equal(await d('发送前确认').isVisible(),false);assert.equal(await p.getByLabel('真实对外身份',{exact:true}).inputValue(),'');});
await p.getByLabel('真实对外身份',{exact:true}).fill('测试运营团队');await p.getByLabel('确认上述为真实对外身份').check();await p.getByLabel('体验对应项目',{exact:true}).fill('小红书代运营 / 商旅账号运营 / 转化问题 / 投放效果 / 品牌种草 / 招聘运营');await p.getByLabel('确认真实体验素材',{exact:true}).check();await b('保存并返回').click();
await b('生成沟通内容').click();await d('发送前确认').waitFor();
await check('个人侧选择已分配账号且保留草稿',async()=>{await p.getByLabel('南宁轻奢美业的拟发送内容',{exact:true}).fill('人工编辑的演示正文');assert.equal(await p.getByLabel('云电脑名称').count(),0);assert.equal(await b('登录小红书').count(),0);assert.equal(await p.getByLabel('发送账号',{exact:true}).locator('option').count(),3);assert.equal(await p.getByLabel('发送账号',{exact:true}).inputValue(),'xhs-sub');await p.screenshot({path:shot+'/account-selection.png',fullPage:true});assert.equal(await p.getByLabel('南宁轻奢美业的拟发送内容',{exact:true}).inputValue(),'人工编辑的演示正文');});
await b('重新生成示例').click();await b('取消，保留编辑').click();assert.equal(await p.getByLabel('南宁轻奢美业的拟发送内容',{exact:true}).inputValue(),'人工编辑的演示正文');
await d('发送前确认').getByRole('button',{name:'关闭面板'}).click();await p.reload();await b('触达与跟进').click();await b('继续确认').click();
await check('刷新恢复草稿与配置',async()=>assert.equal(await p.getByLabel('南宁轻奢美业的拟发送内容',{exact:true}).inputValue(),'人工编辑的演示正文'));
if(await b('按当前话术重新生成本批').count()){await b('按当前话术重新生成本批').click();await d('确认覆盖正文').getByRole('button',{name:'确认按本批话术重新生成',exact:true}).click();if(await d('规则与话术').count())await d('规则与话术').getByRole('button',{name:'保存并返回',exact:true}).click();await d('发送前确认').waitFor();}
await p.screenshot({path:shot+'/review.png',fullPage:true});
await p.getByLabel('发送账号',{exact:true}).selectOption('xhs-main');await b('确认发送 1 条').click();await p.getByText('回复检查：未启用',{exact:true}).waitFor();
await p.locator('summary').filter({hasText:'南宁轻奢美业'}).click();await p.getByText('演示首轮发送结果',{exact:true}).click();await p.getByText('演示回复检查',{exact:true}).click();
await check('首轮提交不是发送成功且没有默认监控',async()=>{assert.equal(await b('模拟新回复').isEnabled(),false);assert.equal(await b('模拟发送成功').isVisible(),true);});
await b('模拟结果待核实').click();assert.equal(await b('确认已修复并重试').count(),0);await b('模拟核实为未发送').click();await b('确认已修复并重试').click();await b('模拟发送成功').click();
await check('首次发送后可开启检查，取消编辑不变更任务',async()=>{await b('回复检查设置').click();await d('回复检查设置').getByLabel('启用后续回复检查',{exact:true}).check();await p.getByLabel('任务检查间隔',{exact:true}).selectOption('60');await p.getByLabel('任务检查截止时间',{exact:true}).fill(new Date(Date.now()+8*3600*1000+86400000).toISOString().slice(0,16));await b('取消修改').click();await p.getByText('回复检查：未启用',{exact:true}).waitFor();await b('回复检查设置').click();await d('回复检查设置').getByLabel('启用后续回复检查',{exact:true}).check();await p.getByLabel('任务检查间隔',{exact:true}).selectOption('30');await p.getByLabel('任务检查截止时间',{exact:true}).fill(new Date(Date.now()+8*3600*1000+86400000).toISOString().slice(0,16));await b('保存回复检查设置').click();await p.getByText(/回复检查：等待检查 · 30 分钟/).waitFor();await p.locator('.task-person>summary').getByText('发送成功',{exact:true}).waitFor();assert.equal(await p.locator('.task-card').count(),1);});
await b('历史名单').click();await p.getByLabel('筛选地区').selectOption('南宁');await p.getByLabel('筛选联系状态').selectOption('已联系');assert.equal(await p.locator('tbody tr').count(),1);await b('查看聊天').click();await p.getByRole('dialog',{name:/^与.+的聊天$/}).getByText('发送成功',{exact:true}).waitFor();await p.screenshot({path:shot+'/chat.png',fullPage:true});await p.getByRole('dialog',{name:/^与.+的聊天$/}).getByRole('button',{name:'关闭面板'}).click();
await b('清空条件').click();await p.getByLabel('选择 星屿驰商旅',{exact:true}).check();
await check('导出已选与筛选范围一致',async()=>{await b('导出').click();await d('导出名单').getByLabel(/已选用户/).check();const ev=p.waitForEvent('download');await b('导出 1 位用户').click();const download=await ev;const csv=await fs.readFile(await download.path(),'utf8');assert.ok(csv.includes('星屿驰商旅'));assert.ok(!csv.includes('南宁轻奢美业'));await b('导出').click();await d('导出名单').getByLabel(/当前筛选结果/).check();assert.equal(await b('导出 6 位用户').isEnabled(),true);await d('导出名单').getByRole('button',{name:'关闭面板'}).click();});
await b('生成沟通内容').click();await d('发送前确认').getByLabel('启用后续回复检查',{exact:true}).check();assert.equal(await b('确认发送 1 条').isEnabled(),false);await p.getByLabel('检查间隔',{exact:true}).selectOption('30');assert.equal(await b('确认发送 1 条').isEnabled(),false);await p.getByLabel('检查截止时间',{exact:true}).fill(new Date(Date.now()+8*3600*1000+24*3600*1000).toISOString().slice(0,16));await b('确认发送 1 条').click();
await p.getByText('演示回复检查',{exact:true}).last().click();assert.equal(await b('模拟新回复').last().isDisabled(),true);await p.locator('summary').filter({hasText:'星屿驰商旅'}).click();await p.getByText('演示首轮发送结果',{exact:true}).last().click();await b('模拟发送成功').click();await b('模拟检查无新回复').last().click();await b('模拟新回复').last().click();await b('回复这位用户').click();await p.getByLabel('拟回复内容',{exact:true}).fill('手动跟进草稿');await d('确认跟进回复').getByRole('button',{name:'关闭面板'}).click();
await p.reload();await b('触达与跟进').click();await p.locator('summary').filter({hasText:'星屿驰商旅'}).click();await b('回复这位用户').click();assert.equal(await p.getByLabel('拟回复内容',{exact:true}).inputValue(),'手动跟进草稿');await p.getByLabel('我已根据最新消息重新核对回复正文',{exact:true}).check();await b('重新核对完成，进入待确认').click();await b('确认提交回复').click();await p.getByText('演示跟进发送结果',{exact:true}).click();
await check('跟进失败和待核实均保留待办，成功后才完成',async()=>{await p.getByText('跟进：待执行 · 待办未完成',{exact:true}).waitFor();await b('模拟发送失败').click();await p.getByText('跟进：发送失败 · 待办未完成',{exact:true}).waitFor();await b('确认已修复并重试').click();await b('模拟结果待核实').click();await p.getByText('跟进：结果待核实 · 待办未完成',{exact:true}).waitFor();assert.equal(await b('确认已修复并重试').count(),0);await b('模拟核实为已发送').click();await p.getByText('跟进：发送成功 · 已回复',{exact:true}).waitFor();});
await b('查看聊天').last().click();await b('暂停回复检查').click();await p.getByRole('dialog',{name:/^与.+的聊天$/}).getByText('回复检查：已暂停',{exact:true}).waitFor();await b('恢复回复检查').click();await b('结束回复检查').click();await p.getByRole('dialog',{name:/^与.+的聊天$/}).getByText('回复检查：已结束',{exact:true}).waitFor();await p.getByRole('dialog',{name:/^与.+的聊天$/}).getByRole('button',{name:'关闭面板'}).click();
await p.screenshot({path:shot+'/workflow.png',fullPage:true});
await b('历史名单').click();await p.screenshot({path:shot+'/history.png',fullPage:true});
await p.setViewportSize({width:390,height:844});await p.screenshot({path:shot+'/mobile.png',fullPage:true});await p.screenshot({path:shot+'/mobile-viewport.png'});
await check('手机名单与聊天无整体横向溢出，底部回复操作可见',async()=>{
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
 await b('查看聊天').last().click();const chat=p.getByRole('dialog',{name:/^与.+的聊天$/});await chat.waitFor();
 const rect=await chat.boundingBox();assert.ok(rect.x>=0&&rect.width<=390);
 assert.equal(await chat.getByRole('button',{name:'关闭面板'}).isVisible(),true);
 const action=await chat.getByRole('button',{name:'回复这位用户'}).boundingBox();assert.ok(action.y+action.height<=844);
 await p.screenshot({path:shot+'/mobile-chat.png'});await chat.getByRole('button',{name:'关闭面板'}).click();
});
await check('手机端账号管理可进入也可返回且不横向溢出',async()=>{await b('账号管理（管理权限）').click();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);await b('编辑与分配').first().click();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);await p.screenshot({path:shot+'/mobile-account-admin.png'});await b('取消').click();await b('触达与跟进').click();await p.getByRole('heading',{name:'触达与跟进'}).waitFor();});
assert.deepEqual(errors,[]);console.log('PASS browser flow; no page errors');
} finally {await browser.close();}
