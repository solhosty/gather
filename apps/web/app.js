const transactions = [
  { icon: '☕', name: 'Coffee Shop', detail: 'Chase • posted today', amount: '$4.60', roundup: '$0.40' },
  { icon: 'F', name: 'Farmers Market', detail: 'Phantom • confirmed yesterday', amount: '$18.15', roundup: '$0.85' },
  { icon: 'M', name: 'Metro', detail: 'Chase • posted yesterday', amount: '$2.75', roundup: '$0.25' },
  { icon: 'B', name: 'Bookstore', detail: 'Chase • posted Sep 18', amount: '$26.03', roundup: '$0.97' },
];
const holdings = [
  { icon: 'A', cls: 'apple', name: 'Apple', symbol: 'AAPLx', amount: '7.84 shares', value: '$1,478.12', change: '+2.6%' },
  { icon: 'M', cls: 'microsoft', name: 'Microsoft', symbol: 'MSFTx', amount: '3.22 shares', value: '$1,102.44', change: '+4.2%' },
  { icon: 'N', cls: 'nvidia', name: 'Nvidia', symbol: 'NVDAx', amount: '9.10 shares', value: '$1,704.06', change: '+6.1%' },
];
let mix = [{name:'Apple',symbol:'A',cls:'apple',value:50},{name:'Microsoft',symbol:'M',cls:'microsoft',value:30},{name:'Nvidia',symbol:'N',cls:'nvidia',value:20}];

function transactionMarkup(item, full = false) { return `<article class="transaction"><div class="merchant-icon">${item.icon}</div><div class="merchant-copy"><strong>${item.name}</strong><span>${item.detail}</span></div>${full ? '<span class="status">Ready</span>' : ''}<div class="amount">${item.amount}<div class="roundup">+${item.roundup} roundup</div></div></article>`; }
document.querySelector('#home-transactions').innerHTML = transactions.slice(0,3).map(x => transactionMarkup(x)).join('');
document.querySelector('#activity-feed').innerHTML = `<div class="date-group">Today</div>${transactionMarkup(transactions[0],true)}<div class="date-group">Yesterday</div>${transactionMarkup(transactions[1],true)}${transactionMarkup(transactions[2],true)}<div class="date-group">Earlier this month</div>${transactionMarkup(transactions[3],true)}`;
document.querySelector('#holdings').innerHTML = holdings.map((x,i) => `<button class="holding" data-holding="${i}" aria-label="Open ${x.name} position and trade"><span class="stock-icon ${x.cls}">${x.icon}</span><div class="holding-copy"><strong>${x.name}</strong><span>${x.symbol} · ${x.amount}</span></div><div class="holding-value">${x.value}<span class="positive">${x.change}</span></div><span class="trade-action" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 7h11l-3-3M17 17H6l3 3"/></svg></span></button>`).join('');
function renderMix(){
  const total=mix.reduce((sum,x)=>sum+(Number(x.value)||0),0),free=100-total;
  document.querySelector('#allocation-total').textContent=`${total}% allocated`;
  document.querySelector('#free-allocation').textContent=`${free}% free`;
  document.querySelector('#free-allocation').classList.toggle('has-free',free>0);
  document.querySelector('#allocation-rows').innerHTML=mix.map((x,i)=>`<div class="allocation-row"><div class="stock-name"><span class="small-stock stock-icon ${x.cls}">${x.symbol}</span>${x.name}</div><input aria-label="${x.name} allocation; ${free}% unallocated" data-index="${i}" type="range" min="0" max="${Number(x.value)+free}" value="${x.value}"/><span class="percent">${x.value}%</span><button aria-label="Remove ${x.name}" data-remove="${i}">×</button></div>`).join('');
  document.querySelectorAll('[data-index]').forEach(input=>input.addEventListener('input',e=>{const index=Number(e.target.dataset.index),available=100-mix.reduce((sum,x)=>sum+Number(x.value),0);mix[index].value=Math.max(0,Math.min(Number(mix[index].value)+available,Math.round(Number(e.target.value))));renderMix();}));
  document.querySelectorAll('[data-remove]').forEach(button=>button.addEventListener('click',e=>{if(mix.length>1){mix.splice(e.target.dataset.remove,1);renderMix()}}));
  const colors=['#35423b','#ef8b54','#80a950','#7657b9','#3c82a8'];let cursor=0;const stops=mix.filter(x=>Number(x.value)>0).map((x,i)=>{const start=cursor;cursor+=Number(x.value);return `${colors[i%colors.length]} ${start}% ${cursor}%`;});if(free>0)stops.push(`#e7ece8 ${cursor}% 100%`);document.querySelector('#mix-donut').style.background=`conic-gradient(${stops.join(',')})`;document.querySelector('#donut-free').innerHTML=free?`${free}%<small>free</small>`:`100%<small>allocated</small>`;document.querySelector('#donut-legend').innerHTML=mix.map((x,i)=>`<div><i style="background:${colors[i%colors.length]}"></i><span>${x.name}</span><b>${x.value}%</b></div>`).join('');
}
renderMix();
document.querySelectorAll('[data-mix-view]').forEach(button=>button.addEventListener('click',()=>{const chart=button.dataset.mixView==='chart';document.querySelectorAll('[data-mix-view]').forEach(x=>x.classList.toggle('selected',x===button));document.querySelector('#allocation-rows').hidden=chart;document.querySelector('#allocation-chart').hidden=!chart;}));
const pageTitles={home:['Tuesday, September 21','Welcome back, Hunter.'],activity:['Roundups','Activity'],portfolio:['Investments','Portfolio'],plan:['Automation','Investment plan'],onboarding:['Getting started','Build your investing loop.']};
function showView(view){document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===view));document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===view));document.querySelector('#header-kicker').textContent=pageTitles[view][0];document.querySelector('#page-title').textContent=pageTitles[view][1];document.querySelectorAll('dialog[open]').forEach(x=>x.close());window.scrollTo({top:0,behavior:'smooth'});}
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.view)));
const details=document.querySelector('#policy-details'),description=document.querySelector('#policy-description'),policyButton=document.querySelector('#policy-button'),dialog=document.querySelector('#approval-dialog');
policyButton.addEventListener('click',()=>dialog.showModal());document.querySelector('#approve-policy').addEventListener('click',()=>{document.querySelector('#approve-policy').textContent='Wallet approval is a later integration';});
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
document.querySelector('#roundups-card').addEventListener('click',()=>document.querySelector('#roundups-dialog').showModal());
document.querySelector('#usdc-card').addEventListener('click',()=>document.querySelector('#fund-dialog').showModal());
document.querySelector('#top-up-button').addEventListener('click',()=>document.querySelector('#investment-review-dialog').showModal());
document.querySelector('#continue-investment').addEventListener('click',event=>{event.currentTarget.textContent='Quote review is a later integration';});
document.querySelector('#settings-button').addEventListener('click',()=>document.querySelector('#settings-dialog').showModal());
document.querySelector('#profile-button').addEventListener('click',()=>document.querySelector('#settings-dialog').showModal());
document.querySelector('#connect-source-button').addEventListener('click',()=>showView('onboarding'));
document.querySelector('#onboard-connect').addEventListener('click',()=>document.querySelector('#sources-dialog').showModal());
document.querySelector('#sources-button').addEventListener('click',()=>document.querySelector('#sources-dialog').showModal());
document.querySelector('#settings-sources').addEventListener('click',()=>{document.querySelector('#settings-dialog').close();document.querySelector('#sources-dialog').showModal();});
document.querySelector('#profile-details').addEventListener('click',()=>{document.querySelector('#settings-dialog').close();document.querySelector('#profile-dialog').showModal();});
document.querySelector('#onboard-profile').addEventListener('click',()=>document.querySelector('#profile-dialog').showModal());
document.querySelector('#portfolio-wallets').addEventListener('click',()=>document.querySelector('#sources-dialog').showModal());
document.querySelector('#filter-button').addEventListener('click',()=>document.querySelector('#filters-dialog').showModal());
document.querySelector('#privacy-button').addEventListener('click',()=>{document.querySelector('#profile-dialog').close();document.querySelector('#privacy-dialog').showModal();});
document.querySelector('#privacy-connections').addEventListener('click',()=>{document.querySelector('#privacy-dialog').close();document.querySelector('#sources-dialog').showModal();});
document.querySelector('.load-more').addEventListener('click',event=>{document.querySelector('#activity-feed').insertAdjacentHTML('beforeend',`<div class="date-group">August 2026</div>${transactionMarkup({icon:'G',name:'Grocery Store',detail:'Chase • posted Aug 28',amount:'$54.21',roundup:'$0.79'},true)}${transactionMarkup({icon:'R',name:'Restaurant',detail:'Phantom • confirmed Aug 23',amount:'$31.50',roundup:'$0.50'},true)}`);event.currentTarget.textContent='2 older purchases loaded';event.currentTarget.disabled=true;});
document.querySelector('#suggest-stocks').addEventListener('click',()=>document.querySelector('#ideas-dialog').showModal());
document.querySelectorAll('[data-currency]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-currency]').forEach(x=>x.classList.toggle('selected',x===button));}));
document.querySelectorAll('[data-option-group]').forEach(group=>group.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{group.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===button));})));
document.querySelector('#download-data').addEventListener('click',event=>{const data={profile:{displayName:'Hunter',homeCurrency:'USD'},connections:['Chase checking','Capital One card','Ally checking','Hunter\'s Phantom','Savings wallet'],roundups:transactions,exportedAt:new Date().toISOString()};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='roundup-data-export.json';link.click();URL.revokeObjectURL(url);event.currentTarget.textContent='Downloaded';});
document.querySelector('#add-stock-button').addEventListener('click',()=>document.querySelector('#stock-dialog').showModal());
document.querySelector('#edit-limits').addEventListener('click',()=>document.querySelector('#limits-dialog').showModal());
document.querySelectorAll('[data-holding]').forEach(button=>button.addEventListener('click',()=>{const holding=holdings[button.dataset.holding];document.querySelector('#holding-token').textContent=`${holding.symbol} · Tokenized stock`;document.querySelector('#holding-name').textContent=holding.name;document.querySelector('#holding-value').textContent=holding.value;document.querySelector('#holding-amount').textContent=holding.amount;document.querySelector('#sell-title').textContent=`Sell ${holding.name}`;document.querySelector('#holding-dialog').showModal();}));
document.querySelector('#sell-button').addEventListener('click',()=>{document.querySelector('#holding-dialog').close();document.querySelector('#sell-dialog').showModal();});
document.querySelector('#sell-review').addEventListener('click',()=>{document.querySelector('#sell-review').textContent='Route review is a later integration';});
document.querySelector('#toggle-portfolio').addEventListener('click',()=>{
  const empty=!document.querySelector('.empty-state').hidden;
  document.querySelector('.empty-state').hidden=empty;
  document.querySelectorAll('.portfolio-state').forEach(x=>x.hidden=!empty);
  document.querySelector('#toggle-portfolio b').textContent=empty?'Preview: new investor':'Preview: existing portfolio';
  document.querySelector('#toggle-portfolio span').textContent=empty?'Switch to the new-investor screen':'Switch to the existing-portfolio screen';
  document.querySelector('#settings-dialog').close();
});
const ranges={"1D":['$4,301.22','+$16.60 · 0.4% today'],"1W":['$4,246.11','+$71.20 · 1.7% this week'],"1M":['$4,284.62','+$128.40 · 3.1% this month'],"1Y":['$3,717.84','+$566.78 · 15.2% this year'],ALL:['$4,284.62','+$1,284.62 · 42.8% all time']};
document.querySelectorAll('[data-range]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-range]').forEach(x=>x.classList.toggle('selected',x===button));document.querySelector('#portfolio-value').textContent=ranges[button.dataset.range][0];document.querySelector('#portfolio-change').textContent=ranges[button.dataset.range][1];}));
