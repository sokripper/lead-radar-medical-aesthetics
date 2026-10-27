import test from 'node:test';
import assert from 'node:assert/strict';
import { originalPostUrl } from '../app/source-data.ts';
import { partitionResults } from '../app/workflow-config.ts';
test('original links preserve supplier parameters and reject missing or unrelated destinations', () => {
  const url='https://www.xiaohongshu.com/explore/example-post?xsec_token=sample&xsec_source=pc_feed#comment';
  assert.equal(originalPostUrl(url),url);
  assert.equal(originalPostUrl('https://xhslink.com/a/example'),'https://xhslink.com/a/example');
  for(const invalid of [undefined,'','javascript:alert(1)','https://xiaohongshu.com.attacker.test/explore/post','https://attacker.test/post','https://www.xiaohongshu.com/','https://name:secret@www.xiaohongshu.com/explore/post']) assert.equal(originalPostUrl(invalid),null);
});
test('source anomalies stay out of normal results even with old manual grades or cleared failure state', () => {
  const rows=[{id:1},{id:2,sourceIssue:'missing_context'},{id:3,sourceIssue:'missing_body'},{id:4}];
  const {completed,attention}=partitionResults(rows,{1:'A',2:'A',3:'B',4:'C'},[]);
  assert.deepEqual(completed.map(x=>x.id),[1,4]);
  assert.deepEqual(attention.map(x=>x.id),[2,3]);
});
