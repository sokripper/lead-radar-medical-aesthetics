import test from 'node:test';
import assert from 'node:assert/strict';
import {resultPage} from '../app/result-pagination.ts';
test('result pages bound thousands of mixed rows without changing task membership',()=>{
 const items=Array.from({length:2503},(_,id)=>({id,kind:id%2?'comment':'post'}));
 const page=resultPage(items,126,20);assert.equal(page.rows.length,3);assert.equal(page.rows[0].id,2500);assert.equal(page.total,2503);assert.equal(items.length,2503);
 const filtered=items.filter(x=>x.id<5);assert.equal(resultPage(filtered,126,20).page,1);
 assert.deepEqual(resultPage([],1,10).rows,[]);assert.equal(resultPage(items,2,10).rows[0].id,10);
});
