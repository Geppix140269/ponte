/* PONTE · SET 3 — respond and connect. Part 1: helpers, A05, A06, D01.
   Uses the Set 1 and Set 2 patterns unchanged. */
(function(){

function frame(o){
  var n = o.segs || 5, on = o.seg || 1;
  var segs = ''; for(var i=1;i<=n;i++) segs += '<i'+(i<=on?' data-on':'')+'></i>';
  return '<div class="s1" data-theme="'+o.theme+'" data-screen-label="'+(o.label||'')+'">'
    + '<div class="s1__st"><span class="mono">9:41</span><span><span class="mono">LTE</span><i></i></span></div>'
    + '<div class="s1__prog" role="img" aria-label="Step '+on+' of '+n+'">'+segs+'</div>'
    + '<div class="s1__nav">'+(o.back===false?'<span class="lab">Ponte</span>':'<button class="s1__back" type="button"><u>\u2039</u>'+o.back+'</button>')
    + '<span class="step">'+(o.step||('Step '+on+' of '+n))+'</span></div>'
    + '<div class="s1__c">'+o.body+'</div>'
    + (o.foot?'<div class="s1__f">'+o.foot+'</div>':'')
    + (o.over||'') + '</div>';
}
function act(t, sub, dis){
  return '<button class="s1__act" type="button"'+(dis?' aria-disabled="true"':'')+'><span>'+t+(sub?'<small>'+sub+'</small>':'')+'</span></button>';
}
function snd(t){ return '<button class="s1__2nd" type="button">'+t+'</button>'; }
function foots(t){ return '<div class="s1__foot"><p class="note">'+t+'</p></div>'; }
function head(t, l, p){
  return '<div class="s1__pad" style="padding-bottom:'+(p||14)+'px">'+(l?'<span class="lab">'+l+'</span>':'')
    + '<h1 class="stmt stmt--2"'+(l?' style="margin-top:12px"':'')+'>'+t+'</h1></div>';
}
function grp(t){ return '<div class="fl__grp">'+t+'</div>'; }
function msg(mk, h, p, dl){
  return '<div class="msg"><span class="mk mk--'+mk+'"></span><h2>'+h+'</h2><p>'+p+'</p>'+(dl?'<dl>'+dl+'</dl>':'')+'</div>';
}
function sk(n){ var s=''; for(var i=0;i<n;i++) s+='<div><i></i><u></u></div>'; return '<div class="sk">'+s+'</div>'; }
function ind(){ return '<div class="upl" style="padding:0 20px 18px"><div class="upl__bar upl__bar--ind"><i></i></div></div>'; }
function rec(rows, thin){
  return '<div class="rec'+(thin?' rec--thin':'')+'">'+rows.map(function(r){
    return '<div><span><span class="k">'+r[0]+'</span><span class="v">'+r[1]+'</span></span>'+(r[2]?'<span class="fx">'+r[2]+'</span>':'<span></span>')+'</div>';
  }).join('')+'</div>';
}
var SAVED7 = 'Saved only in this browser for up to 7 days. Sign in to keep it longer and continue on another device.';
var SAVED90 = 'Saved to your account. Kept for 90 days from your last meaningful edit.';
var DISCLAIM = 'Nothing has been confirmed with the party named in it, and nobody behind one is a Ponte member.';
var PERIM = 'Ponte runs sanctions and prohibited-goods lists and tests for completeness and internal consistency. It does not verify your counterparty, inspect your goods, or confirm that anything a document claims is true.';

/* provenance bands — the one place the two record types are told apart */
function provSig(id, src, read){
  return '<div class="prov prov--sig"><div class="prov__h"><span class="lab">Market Signal</span>'
    + '<span class="mk mk--inferred"></span><span class="id">'+id+'</span></div>'
    + '<b>Read from a public source. Not confirmed.</b>'
    + '<p><strong>'+DISCLAIM+'</strong> Ponte publishes it because it may be worth pursuing, not because it is true.</p>'
    + '<div class="prov__src"><span>Source <b>'+src+'</b></span><span>Read <b>'+read+'</b></span></div></div>';
}
function provMem(id, when){
  return '<div class="prov prov--mem"><div class="prov__h"><span class="lab">Member opportunity</span>'
    + '<span class="mk mk--done"></span><span class="id">'+id+'</span></div>'
    + '<b>Published by a Ponte member. Screening checked.</b>'
    + '<p>'+PERIM+' A checked listing is a complete one, not a safe one.</p>'
    + '<div class="prov__src"><span>Published <b>'+when+'</b></span><span>Identity <b>on accepted interest</b></span></div></div>';
}

/* ===================== 1 · A05 MARKET RECORD DETAIL ===================== */
var A05 = {
 n:'1', id:'A05', title:'Market Record Detail',
 purpose:'One pattern, two record types that are never conflated. A Market Signal and a member opportunity differ in provenance, in verification state, in reference form, in the facts they can hold and in what may be done with them \u2014 and every one of those differences is visible on the surface.',
 states:[['signal','Market Signal'],['member','Member opportunity \u00b7 product'],['service','Member opportunity \u00b7 trade service'],['dist','Member opportunity \u00b7 distribution'],['loading','Loading'],['gone','Closed or expired'],['error','Error']],
 build:function(st, th){
  var o = { theme:th, segs:5, seg:1, back:'Results', label:'A05 '+st, step:'Record 1 of 5' };

  if(st === 'signal'){
    o.body = provSig('PONTE-SUP-4471902', 'Port of Valencia arrivals bulletin', '29 July 2026')
      + head('Olive oil, bulk, seeking buyers in northern Europe', '', 10)
      + '<div class="s1__pad" style="padding:0 20px 14px"><p class="prose">This is the whole of what the source said. Ponte does not hold more, and has not asked the party named in it.</p></div>'
      + rec([
        ['Chapter', 'Animal or vegetable fats and oils<span class="hs">HS&nbsp;15</span>', 'Read'],
        ['Quantity', '24,000 litres', 'Read'],
        ['Destination', 'Rotterdam, Netherlands', 'Read'],
        ['Origin', 'Not stated in the source', 'Absent'],
        ['Delivery term', 'CIF', 'Read'],
        ['Read', '29 July 2026', 'Fact']])
      + '<div class="perim"><p>No quantity tolerance, no price, no validity and no company name: a signal holds a 2-digit chapter and the few facts above, and nothing else. If you need more, Ponte can go and look.</p></div>';
    o.foot = act('Choose what to do next', 'Investigation costs $49. Interest cannot be sent on a signal.') + foots(SAVED7);
  }

  if(st === 'member'){
    o.body = provMem('PT-4482', '24 July 2026')
      + head('Extra virgin olive oil, 24,000 L, Ja\u00e9n', '', 10)
      + rec([
        ['Commodity', 'Extra virgin olive oil, bulk<span class="hs">HS&nbsp;1509.20</span>'],
        ['Quantity', '24,000 L \u00b7 tolerance \u00b1 5%'],
        ['Origin', 'Ja\u00e9n, Andalusia, Spain'],
        ['Destination', 'Any EU port'],
        ['Delivery term', 'CIF Rotterdam'],
        ['Packing', 'IBC, 1,000 L'],
        ['Owner acts as', 'Producer \u00b7 own goods'],
        ['Valid until', '1 October 2026'],
        ['Price', 'Held private', 'Hidden'],
        ['Certificate of analysis', 'Held private', 'Hidden'],
        ['Company', 'Disclosed on accepted interest', 'Hidden']])
      + '<div class="perim"><p>Three facts are held back by the owner. They are named so you know they exist, and they open only if your interest is accepted.</p></div>';
    o.foot = act('Choose what to do next', 'Expressing interest is free.') + foots(SAVED7);
  }

  if(st === 'service'){
    o.body = provMem('PT-4519', '28 July 2026')
      + head('Pre-shipment inspection, agrifood, Iberian ports', '', 10)
      + rec([
        ['Service', 'Pre-shipment inspection and sampling'],
        ['Sector', 'Agrifood \u00b7 oils and fats<span class="hs">HS&nbsp;15</span>'],
        ['Coverage', 'Valencia, Algeciras, Sines, Leix\u00f5es'],
        ['Accreditation', 'ISO/IEC 17020 \u00b7 stated by the member', 'Unverified'],
        ['Turnaround', '48 hours from instruction'],
        ['Engagement', 'Per shipment, or standing'],
        ['Valid until', '20 September 2026'],
        ['Fee schedule', 'Held private', 'Hidden'],
        ['Company', 'Disclosed on accepted interest', 'Hidden']])
      + '<div class="perim"><p>Ponte has not inspected the accreditation. It is shown as the member stated it, labelled as such.</p></div>';
    o.foot = act('Choose what to do next', 'Expressing interest is free.') + foots(SAVED7);
  }

  if(st === 'dist'){
    o.body = provMem('PT-4530', '31 July 2026')
      + head('Seeking a distributor for Nordic grocery retail', '', 10)
      + rec([
        ['Position', 'Principal \u00b7 seeking a distributor'],
        ['Goods represented', 'Preserved vegetables and oils<span class="hs">HS&nbsp;15, 20</span>'],
        ['Market sought', 'Sweden, Denmark, Norway'],
        ['Channel', 'Grocery retail, own-label excluded'],
        ['Exclusivity', 'Negotiable, market by market'],
        ['Term sought', '24 months, renewable'],
        ['Owner acts as', 'Producer \u00b7 own brands'],
        ['Valid until', '15 October 2026'],
        ['Commission terms', 'Held private', 'Hidden'],
        ['Company', 'Disclosed on accepted interest', 'Hidden']])
      + '<div class="perim"><p>Position is part of the record, not an inference. A principal seeking a distributor and a distributor seeking brands are counterparties. Two principals are not.</p></div>';
    o.foot = act('Choose what to do next', 'Expressing interest is free.') + foots(SAVED7);
  }

  if(st === 'loading'){
    o.body = head('Opening the record', '', 10) + ind() + sk(5);
    o.foot = act('Choose what to do next', 'Available once the record opens', true);
  }

  if(st === 'gone'){
    o.body = provMem('PT-4463', '2 July 2026')
      + msg('inferred', 'This listing was closed by its owner on 30 July', 'It is shown so the reference resolves rather than dying silently. Nothing can be sent to a closed listing, and nothing you wrote is lost.',
        '<dt>Reference</dt><dd>PT-4463</dd><dt>Closed</dt><dd>30 July 2026</dd><dt>Your draft</dt><dd class="was">Kept, unsent</dd>');
    o.foot = snd('Find similar opportunities') + foots(SAVED90);
  }

  if(st === 'error'){
    o.body = msg('blocked', 'Ponte could not open this record', 'The record exists. Ponte could not read it just now. Nothing about it has changed and nothing of yours was affected.',
      '<dt>Reference</dt><dd>PT-4482</dd><dt>Attempt</dt><dd>9:41, 2 August</dd><dt>Your draft</dt><dd class="was">Saved</dd><dt>Record</dt><dd class="wasnt">Not read</dd>');
    o.foot = act('Try again', 'Returns you to this record, not to the results') + snd('Back to results') + foots(SAVED90);
  }
  return frame(o);
 }
};

/* ===================== 2 · A06 ACTION CHOICE ===================== */
function arow(b, s, right, dis){
  return '<button class="row" type="button"'+(dis?' aria-disabled="true"':'')+'><span class="mk"></span>'
    + '<span><b>'+b+'</b><small>'+s+'</small></span>'+right+'</button>';
}
var A06 = {
 n:'2', id:'A06', title:'Action Choice',
 purpose:'Turn a relevant record into the right next move. The available actions follow the record type: interest is free and exists only on a member opportunity; investigation costs $49 and exists only on a signal. Neither list ever shows the other\u2019s action greyed out as a tease.',
 states:[['signal','On a Market Signal'],['member','On a member opportunity'],['saved','Saved for later'],['loading','Loading'],['error','Error']],
 build:function(st, th){
  var o = { theme:th, segs:5, seg:2, back:'Record', label:'A06 '+st };

  if(st === 'signal'){
    o.body = '<div class="prov prov--sig" style="padding-block:14px"><div class="prov__h"><span class="lab">Market Signal</span><span class="mk mk--inferred"></span><span class="id">PONTE-SUP-4471902</span></div>'
      + '<p style="margin-top:8px"><strong>'+DISCLAIM+'</strong></p></div>'
      + head('What would you like Ponte to do?', '', 10)
      + '<div class="s1__pad" style="padding:0 20px 14px"><p class="prose">There is no one to express interest to. A signal names no member, so the only route forward is to find out whether it is real.</p></div>'
      + '<div class="rows a06">'
      + arow('Ask Ponte to investigate', 'A source and freshness check, a result, an evidence trail and a recommended next action', '<span class="price">$49</span>')
      + arow('Save this signal', 'Kept in your account. Ponte tells you if the source is updated', '<span class="free">Free</span>')
      + arow('Find member opportunities like it', 'Published listings in HS 15 into northern Europe', '<span class="free">Free</span>')
      + '</div>'
      + '<div class="perim"><p>Payment buys the investigation, not a guaranteed opportunity, response or introduction.</p></div>';
    o.foot = foots(SAVED90);
  }

  if(st === 'member'){
    o.body = '<div class="prov prov--mem" style="padding-block:14px"><div class="prov__h"><span class="lab">Member opportunity</span><span class="mk mk--done"></span><span class="id">PT-4482</span></div>'
      + '<p style="margin-top:8px">Published by a Ponte member and checked. Not verified, inspected or vouched for.</p></div>'
      + head('What would you like to do?', '', 10)
      + '<div class="rows a06">'
      + arow('Express interest', 'A short structured statement. Sign-in and a verified contact, nothing more', '<span class="free">Free</span>')
      + arow('Save this opportunity', 'Kept in your account until it expires on 1 October', '<span class="free">Free</span>')
      + arow('Find others like it', 'Same chapter, same delivery term, open now', '<span class="free">Free</span>')
      + '</div>'
      + '<div class="perim"><p>Ponte does not promise that an owner will reply. Interest is a request, and it can be withdrawn at any time before it is accepted.</p></div>';
    o.foot = foots(SAVED90);
  }

  if(st === 'saved'){
    o.body = '<div class="r2"><div class="r2__m"><span class="mk mk--done"></span><span class="lab">Saved</span></div>'
      + '<h2>Kept in your account</h2><p>It stays until it expires on 1 October. If the owner closes it earlier, you will be told once.</p>'
      + '<div class="r2__next"><span class="lab">Next</span><b>Express interest whenever you are ready \u2014 saving does not tell the owner anything.</b></div>'
      + '<div class="r2__meta"><span>PT-4482</span><span>Saved 9:41, 2 Aug</span></div></div>'
      + '<div class="rows a06">'
      + arow('Express interest now', 'Free, and withdrawable until accepted', '<span class="free">Free</span>')
      + arow('Back to results', 'Six more in this chapter', '<span class="go">\u203a</span>')
      + '</div>';
    o.foot = foots(SAVED90);
  }

  if(st === 'loading'){ o.body = head('Reading what is available here', '', 10) + ind() + sk(3); }

  if(st === 'error'){
    o.body = msg('blocked', 'Ponte could not load the actions for this record', 'The record is fine. This list is not. Nothing has been sent and nothing has been charged.',
      '<dt>Record</dt><dd>PT-4482</dd><dt>Charged</dt><dd class="wasnt">Nothing</dd><dt>Sent</dt><dd class="wasnt">Nothing</dd>');
    o.foot = act('Try again') + snd('Back to the record');
  }
  return frame(o);
 }
};

/* ===================== 3 · D01 INVESTIGATION OR INTEREST ===================== */
var D01 = {
 n:'3', id:'D01', title:'Investigation or Interest Request',
 purpose:'Two variants of one surface, and all four gating states. Interest on a member opportunity is free and asks for sign-in and a verified contact only \u2014 business verification is not required to respond. Investigation on a signal costs $49 and describes a defined deliverable and nothing more. Every gate says what to do next rather than disabling a control.',
 states:[['empty','Interest \u00b7 empty'],['filled','Interest \u00b7 verified, eligible'],['signedout','Gate 1 \u00b7 signed out'],['gate','Gate 2 \u00b7 contact not verified'],['invest','Investigation \u00b7 $49'],['payfail','Gate 4 \u00b7 payment unsuccessful'],['loading','Sending'],['error','Error \u00b7 not sent']],
 build:function(st, th){
  var o = { theme:th, segs:5, seg:3, back:'Actions', label:'D01 '+st };
  var CONS = '<div class="cons"><span class="lab">Before you send</span>'
    + '<p>If the owner accepts your interest, your company identities will be revealed to each other.</p>'
    + '<p>Nothing is revealed while your interest is pending, and nothing is revealed if it is declined or you withdraw it.</p></div>';

  if(st === 'empty'){
    o.body = head('Tell them what you can do', 'Interest \u00b7 PT-4482 \u00b7 free', 10)
      + '<div class="s1__pad" style="padding:0 20px 14px"><p class="prose">Three short answers. The owner sees these before deciding, and nothing else about you.</p></div>'
      + '<div class="stm">'
      + '<label><span class="lab">Capacity</span><span class="hint">What you are acting as on this deal</span><input placeholder="Buyer, own account" /></label>'
      + '<label><span class="lab">Relevance</span><span class="hint">Why this opportunity, and not any other</span><textarea rows="2" placeholder="What connects you to this trade"></textarea></label>'
      + '<label><span class="lab">What you can fulfil</span><span class="hint">Volume, timing, terms you can meet</span><textarea rows="2" placeholder="Be specific. Vague interest is usually declined"></textarea></label>'
      + '<button class="voice" type="button"><span class="gl gl--mic"></span><span>Say it instead \u2014 Ponte writes it into the three answers</span></button>'
      + '</div>' + CONS;
    o.foot = act('Send interest', 'Complete the three answers to send', true) + foots(SAVED90);
  }

  if(st === 'filled'){
    o.body = head('Tell them what you can do', 'Interest \u00b7 PT-4482 \u00b7 free', 10)
      + '<div class="stm">'
      + '<label><span class="lab">Capacity</span><input value="Importer and blender, own account" /></label>'
      + '<label><span class="lab">Relevance</span><textarea rows="3">We bottle EVOO for Nordic grocery under contract and buy Andalusian lots each October.</textarea><span class="cnt">96 / 300</span></label>'
      + '<label><span class="lab">What you can fulfil</span><textarea rows="3">Full 24,000 L in one lift, CIF Rotterdam, October window, payment at sight against documents.</textarea><span class="cnt">113 / 300</span></label>'
      + '</div>'
      + '<div class="rec rec--thin"><div><span><span class="k">Sending as</span><span class="v">Verified contact \u00b7 m\u2022\u2022\u2022@nordoli.se</span></span><span class="fx">Signed in</span></div>'
      + '<div><span><span class="k">Business verification</span><span class="v">Not required to respond</span></span><span class="fx">Not asked</span></div></div>'
      + CONS;
    o.foot = act('Send interest', 'Free. Withdrawable at any time before it is accepted.') + foots(SAVED90);
  }

  if(st === 'invest'){
    o.body = head('Ask Ponte to investigate this signal', 'Investigation \u00b7 PONTE-SUP-4471902', 8)
      + '<div class="fee"><b>$49</b><span>One signal, one investigation.</span></div>'
      + '<div class="deliv"><span class="lab">What you receive</span><ul>'
      + '<li><i></i><span>A <b>source and freshness check</b> \u2014 whether the source still says this, and when it last did</span></li>'
      + '<li><i></i><span>A result: <b>confirmed, not confirmed, or unable to confirm</b></span></li>'
      + '<li><i></i><span>An <b>evidence and source trail</b> \u2014 what was looked at, and where</span></li>'
      + '<li><i></i><span>A <b>recommended next action</b></span></li>'
      + '</ul></div>'
      + '<div class="cons"><span class="lab">What it does not buy</span>'
      + '<p>Payment buys the investigation, not a guaranteed opportunity, response or introduction.</p>'
      + '<p>Unable to confirm is a real and common result. It is delivered in full, at the same price.</p></div>'
      + '<div class="rec rec--thin"><div><span><span class="k">Typical delivery</span><span class="v">3 working days</span></span><span class="fx">Estimate</span></div>'
      + '<div><span><span class="k">Charged</span><span class="v">On starting the investigation</span></span><span class="fx">Once</span></div></div>';
    o.foot = act('Pay $49 and start', 'You are charged once, now. The result arrives either way.') + snd('Not now') + foots(SAVED90);
  }

  if(st === 'signedout'){
    o.body = head('Sign in to express interest', 'Interest \u00b7 PT-4482 \u00b7 free', 10)
      + '<div class="s1__pad" style="padding:0 20px 16px"><p class="prose">Everything public on this listing stays readable without an account. Sending interest needs one, because the owner is being asked to disclose their company to a named person.</p></div>'
      + '<div class="disc"><span class="lab">Signing in unlocks</span><ul>'
      + '<li><i></i><span><b>Sending interest</b> \u2014 free, on this and any listing</span></li>'
      + '<li><i></i><span><b>Keeping your statement</b> \u2014 90 days instead of 7</span></li>'
      + '<li><i></i><span><b>Being told</b> if this listing is accepted, declined or closed</span></li>'
      + '</ul></div>'
      + '<div class="store"><span class="mk mk--done"></span><span><b>What you have written so far is kept</b><span>'+SAVED7+'</span></span></div>';
    o.foot = act('Sign in and continue', 'Takes you back to this statement, not to the start') + snd('Keep reading the listing');
  }

  if(st === 'gate'){
    o.body = head('Confirm your contact to send this', 'Interest \u00b7 PT-4482', 10)
      + '<div class="s1__pad" style="padding:0 20px 16px"><p class="prose">A verified contact is all that is needed. <b>Business verification is not required to respond to a listing</b> \u2014 you can add it later, and an owner may ask for it before revealing sensitive fields.</p></div>'
      + '<div class="si__f"><label><span class="lab">Code sent to m\u2022\u2022\u2022@nordoli.se</span><input placeholder="6 digits" inputmode="numeric" /></label></div>'
      + '<div class="s1__pad" style="padding:14px 20px 0"><span class="act-txt">Send it again</span></div>'
      + '<div class="store"><span class="mk mk--done"></span><span><b>Your statement is written and waiting</b><span>Nothing is sent until the code is confirmed. Going back does not lose it.</span></span></div>';
    o.foot = act('Confirm and send interest', 'Enter the code to continue', true) + foots(SAVED90);
  }

  if(st === 'payfail'){
    o.body = '<div class="prov prov--sig" style="padding-block:14px"><div class="prov__h"><span class="lab">Market Signal</span><span class="mk mk--inferred"></span><span class="id">PONTE-SUP-4471902</span></div>'
      + '<p style="margin-top:8px">The signal and its facts are untouched.</p></div>'
      + msg('blocked', 'The payment did not go through', 'Your card was declined by the issuer. Ponte has not started the investigation and has not taken anything.',
        '<dt>Charged</dt><dd class="wasnt">Nothing</dd><dt>Investigation</dt><dd class="wasnt">Not started</dd><dt>Signal</dt><dd class="was">Unchanged, still readable</dd><dt>Attempt</dt><dd>9:41, 2 August</dd>')
      + '<div class="perim"><p>Nothing about the signal depended on the payment. You can pay another way, or leave it and come back \u2014 the signal is saved to your account either way.</p></div>';
    o.foot = act('Try another payment method', '$49, charged once, only when it succeeds') + snd('Back to the signal') + foots(SAVED90);
  }

  if(st === 'loading'){
    o.body = head('Sending your interest', 'PT-4482', 10) + ind()
      + '<div class="rec rec--thin"><div><span><span class="k">Statement</span><span class="v">Written</span></span><span class="fx">Held</span></div>'
      + '<div><span><span class="k">Identity</span><span class="v">Not revealed</span></span><span class="fx">Held</span></div></div>';
    o.foot = act('Sending\u2026', 'Do not leave \u2014 this takes a moment', true);
  }

  if(st === 'error'){
    o.body = msg('blocked', 'Your interest was not sent', 'Ponte could not reach the listing. Your statement is intact and the owner has not been told anything.',
      '<dt>Reference</dt><dd>PT-4482</dd><dt>Statement</dt><dd class="was">Saved in full</dd><dt>Owner notified</dt><dd class="wasnt">No</dd><dt>Identity revealed</dt><dd class="wasnt">No</dd><dt>Charged</dt><dd class="wasnt">Nothing</dd>')
      + '<div class="perim"><p>Trying again sends the statement as written. It does not ask you to write it a second time.</p></div>';
    o.foot = act('Send it again', 'Continues from your statement, not from the start') + snd('Keep it as a draft') + foots(SAVED90);
  }
  return frame(o);
 }
};

window.PS3H = { frame:frame, act:act, snd:snd, foots:foots, head:head, grp:grp, msg:msg, sk:sk, ind:ind, rec:rec,
  SAVED7:SAVED7, SAVED90:SAVED90, PERIM:PERIM, DISCLAIM:DISCLAIM, provSig:provSig, provMem:provMem };
window.PS3 = { A05:A05, A06:A06, D01:D01, order:['A05','A06','D01'] };
})();
