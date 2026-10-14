const assert=require('node:assert/strict');
const engine=require('../js/algo-vis-engine.js');
const sorting=['bubble','select','insert','quick','merge','heap','counting','shell'];
let count=0;
for(const id of sorting)for(const arr of [[6,2,9,1,5],[3,3,1,1,2],[1,2,3,4,5],[5,4,3,2,1],[-3,0,7,-2,7]]){
 const input=arr.slice(),steps=engine.buildSteps(id,{arr:input});assert.deepEqual(input,arr,id+' mutated input');assert.deepEqual(steps.at(-1).arr,arr.slice().sort((a,b)=>a-b),id+' result');count++;
}
for(const id of ['binary','window','prime','factor','gcd','fib']){const steps=engine.buildSteps(id,{});assert(steps.length>1);assert(steps.at(-1).desc);count++;}
const fallback=engine.buildSteps('step',{code:'int a=1;\na+=2;'});assert(fallback.length>1);count++;
console.log(JSON.stringify({passed:count,algorithms:engine.ALGOS.length}));
