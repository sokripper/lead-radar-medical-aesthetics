import test from 'node:test';
import assert from 'node:assert/strict';
import {canEditTask, canEditTaskMessage, editTaskMessage, startNextRecipient} from '../app/operations-state.ts';
const task = (extra={}) => ({paused:false,results:{1:'待执行',2:'待执行'},texts:{1:'original',2:'pending'},...extra});
test('running tasks reject pending-message edits, even through the state update function',()=>{
 const running=task({startedAt:'2026-10-27',results:{1:'执行中',2:'待执行'}});
 assert.equal(canEditTask(running),false);
 assert.equal(canEditTaskMessage(running,2),false);
 assert.equal(editTaskMessage(running,2,'changed'),running);
});
test('pause permits pending edits but preserves in-flight and sent snapshots',()=>{
 const paused=task({paused:true,startedAt:'2026-10-27',results:{1:'发送成功',2:'待执行',3:'执行中',4:'结果待核实'}});
 assert.equal(canEditTaskMessage(paused,2),true);
 for(const id of [1,3,4]) assert.equal(editTaskMessage(paused,id,'changed'),paused);
 const edited=editTaskMessage(paused,2,'updated');
 assert.equal(edited.texts[2],'updated');
 assert.equal(edited.texts[1],'original');
 assert.deepEqual(edited.editedCopyIds,[2]);
 assert.equal(canEditTaskMessage({...edited,paused:false},2),false);
});
test('initial drafts are editable but a started task must be paused even if all remaining items are pending',()=>{
 assert.equal(canEditTask(task()),true);
 assert.equal(canEditTask(task({startedAt:'2026-10-27'})),false);
});
test('sequential dispatch leaves an editable queue and never resends in-flight or uncertain results',()=>{
 const original={1:'待执行',2:'待执行'};
 assert.deepEqual(startNextRecipient(original,[1,2]),{1:'执行中',2:'待执行'});
 assert.equal(original[1],'待执行');
 const inFlight={1:'执行中',2:'待执行'};
 assert.equal(startNextRecipient(inFlight,[1,2]),inFlight);
 const unknown={1:'结果待核实',2:'待执行'};
 assert.equal(startNextRecipient(unknown,[1,2]),unknown);
 assert.deepEqual(startNextRecipient({1:'发送成功',2:'待执行'},[1,2]),{1:'发送成功',2:'执行中'});
});
