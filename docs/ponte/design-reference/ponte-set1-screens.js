/* PONTE · SET 1 — screen builders. Every state drawn, both themes.
   Theme is an attribute on the frame, so light and dark render side by side. */
(function(){
var esc = function(s){ return s; };

function frame(o){
  return '<div class="s1" data-theme="'+o.theme+'" data-screen-label="'+(o.label||'')+'">'
    + '<div class="s1__st"><span class="mono">9:41</span><span><span class="mono">LTE</span><i></i></span></div>'
    + '<div class="s1__prog" role="img" aria-label="Step '+(o.seg||1)+' of 3">'
    + [1,2,3].map(function(n){ return '<i'+(n<=(o.seg||1)?' data-on':'')+'></i>'; }).join('') + '</div>'
    + '<div class="s1__nav">'+(o.back===false?'<span class="lab">Ponte</span>':'<button class="s1__back" type="button"><u>‹</u>'+(o.back||'Back')+'</button>')
    + '<span class="step">'+(o.step||'')+'</span></div>'
    + '<div class="s1__c">'+o.body+'</div>'
    + (o.foot?'<div class="s1__f">'+o.foot+'</div>':'')
    + (o.over||'')
    + '</div>';
}
function act(t, sub, dis){
  return '<button class="s1__act" type="button"'+(dis?' aria-disabled="true"':'')+'><span>'+t+(sub?'<small>'+sub+'</small>':'')+'</span></button>';
}
function foots(t){ return '<div class="s1__foot"><p class="note">'+t+'</p></div>'; }
function row(g, b, s, go){
  return '<button class="row" type="button"><span class="gl gl--'+g+'"></span><span><b>'+b+'</b>'+(s?'<small>'+s+'</small>':'')+'</span><span class="go">'+(go||'›')+'</span></button>';
}

/* ============================ SCREEN 1 · TELL PONTE ============================ */
var HERO = '<div class="s1__pad"><h1 class="stmt">Tell Ponte what you supply, in your own words.</h1></div>';

var ROUTES_3 = '<div class="rows">'
  + row('cam','Photograph or upload','Sign in first, so the file is held against your account')
  + row('grid','Browse categories','5,613 product classes, by picture. No code needed.')
  + row('find','Type it, with search')
  + '</div>';

var S1 = {
 n:'1', id:'B02 \u00b7 S01 \u00b7 T01', title:'Tell Ponte',
 purpose:'Used by B02 (product), S01 (trade service) and T01 (distribution) \u2014 three families, one interaction, three content models underneath. The one job: get the facts out of the user\u2019s head with the least possible effort. Four routes in, weighted by size and position, never by label.',
 states:[['empty','Empty'],['voice','Voice active'],['unclear','Voice unclear'],['denied','Microphone denied'],['upload','Upload in progress \u00b7 signed in'],['unreadable','Upload unreadable \u00b7 signed in'],['processing','Processing'],['error','Error']],
 build:function(st, th){
  var o = { theme:th, seg:1, back:false, step:'Step 1 of 3', label:'S1 '+st };

  if(st === 'empty'){
    o.body = HERO
      + '<button class="spk" type="button"><span class="spk__g"></span><span><b>Speak it</b><p>Any language. Tap and say what you supply, how much, and where from.</p></span></button>'
      + ROUTES_3;
    o.foot = foots('Saved only in this browser for up to 7 days. Sign in to keep it longer and continue on another device.');
  }

  if(st === 'voice'){
    o.body = '<div class="s1__pad" style="padding-bottom:14px"><span class="lab">Listening</span><h1 class="stmt stmt--2" style="margin-top:12px">Say what you supply, how much, and where from.</h1></div>'
      + '<div class="spk" style="cursor:default;gap:20px"><div class="wave">'+Array(19).join('<i></i>')+'</div>'
      + '<p class="tscript">We supply Vietnamese white rice, five per cent broken, twenty four tonnes a month<span class="caret"></span></p></div>'
      + '<div class="s1__pad"><p class="note">Language detected: English. Keep going \u2014 Ponte structures this after you stop.</p></div>';
    o.foot = act('Stop and continue') + '<button class="s1__2nd" type="button">Cancel, keep nothing</button>';
  }

  if(st === 'unclear'){
    o.body = '<div class="s1__pad" style="padding-bottom:16px"><span class="lab" style="color:var(--attention)">Two parts unclear</span>'
      + '<h1 class="stmt stmt--2" style="margin-top:12px">Ponte heard most of it. Two words are uncertain.</h1></div>'
      + '<div class="band" style="padding:20px;border-block:1px solid var(--rule)"><p class="tscript">We supply Vietnamese white rice, <em>five</em> per cent broken, <em>twenty four</em> tonnes a month.</p>'
      + '<p class="note" style="margin-top:14px">Underlined words were not heard clearly. Nothing is lost \u2014 correct them or carry on.</p></div>'
      + '<div class="rows">'
      + '<button class="row" type="button"><span class="mk mk--need"></span><span><b>Correct \u201cfive\u201d</b><small>Choose the number, or say it again</small></span><span class="go">\u203a</span></button>'
      + '<button class="row" type="button"><span class="mk mk--need"></span><span><b>Correct \u201ctwenty four\u201d</b><small>Choose the quantity, or say it again</small></span><span class="go">\u203a</span></button>'
      + row('mic','Add to what you said','Continues from here. Does not start again.')
      + '</div>';
    o.foot = act('Continue with this', 'Uncertain values are marked for you to confirm');
  }

  if(st === 'denied'){
    o.body = '<div class="msg"><span class="mk mk--blocked"></span><h2>Ponte cannot reach the microphone.</h2>'
      + '<p>Your phone has not granted access. Nothing you have entered is affected, and you can turn it on later in settings.</p></div>'
      + '<div class="hr"></div>'
      + '<div class="s1__pad" style="padding:16px 20px 8px"><span class="lab">The other three routes</span></div>'
      + ROUTES_3;
    o.foot = '<button class="s1__2nd" type="button">Open phone settings</button>' + foots('Saved only in this browser for up to 7 days. Sign in to keep it longer and continue on another device.');
  }

  if(st === 'upload'){
    o.seg = 1; o.back = 'Tell Ponte';
    o.body = '<div class="s1__pad" style="padding-bottom:8px"><span class="lab">One file \u00b7 signed in as giuseppe@mekongrice.vn</span>'
      + '<h1 class="stmt stmt--2" style="margin-top:12px">Before this is sent</h1></div>'
      + '<div class="disc"><p class="prose">Ponte reads this on its own servers, not on your phone. Here is exactly what happens to it.</p>'
      + '<ul><li><i></i><span><b>What is sent:</b> the file itself \u2014 <span class="id">offer-2026-08.pdf, 412 KB</span></span></li>'
      + '<li><i></i><span><b>What is kept:</b> the product facts Ponte reads from it, and the file itself, both against your account.</span></li>'
      + '<li><i></i><span><b>For how long:</b> 90 days from your last edit to this draft. Ponte warns you 14 days and 3 days before. After that it is recoverable for a further 30 days.</span></li>'
      + '<li><i></i><span><b>Who sees it:</b> nobody. Nothing is published or shown to any counterparty by uploading.</span></li></ul></div>'
      + '<div class="upl"><div class="upl__bar"><i style="inline-size:64%"></i></div>'
      + '<div class="upl__m"><span class="id">Sending \u00b7 264 KB of 412 KB</span><button type="button" class="act-txt" style="background:none;border:0;padding:0">Stop</button></div></div>';
    o.foot = act('Continue', 'You can stop this at any point') + foots('Saved to your account. Continue on any device.');
  }

  if(st === 'unreadable'){
    o.back = 'Tell Ponte';
    o.body = '<div class="msg"><span class="mk mk--blocked"></span><h2>Ponte could not read this file.</h2>'
      + '<p>The pages are a scan without text, and the resolution is too low for the characters to be recovered. Nothing was kept.</p>'
      + '<dl><dt>File</dt><dd class="id">offer-2026-08.pdf \u00b7 412 KB</dd><dt>Kept</dt><dd class="wasnt">Nothing. It has been deleted.</dd></dl></div>'
      + '<div class="hr"></div>'
      + '<div class="rows">'
      + row('cam','Photograph the paper instead','Hold the page flat in good light \u2014 usually clearer than a scan. Sign in first.')
      + row('mic','Say what is in it','Fastest route. Any language.')
      + row('grid','Browse categories')
      + '</div>';
    o.foot = foots('Saved to your account. Continue on any device.');
  }

  if(st === 'processing'){
    o.body = '<div class="s1__pad" style="padding-bottom:18px"><span class="lab">Working</span>'
      + '<h1 class="stmt stmt--2" style="margin-top:12px">Ponte is structuring what you said.</h1>'
      + '<p class="lede">About ten seconds. You can leave this screen \u2014 it carries on.</p></div>'
      + '<div class="upl" style="padding-top:0"><div class="upl__bar upl__bar--ind"><i></i></div></div>'
      + '<div class="fl">'
      + '<div class="fl__i fl__i--ok"><div class="fl__k"><span class="lab">Product</span><span class="r"><span class="mk mk--done"></span></span></div><div class="fl__v"><b>Rice, semi-milled or wholly milled</b></div></div>'
      + '<div class="fl__i fl__i--ok"><div class="fl__k"><span class="lab">Origin</span><span class="r"><span class="mk mk--done"></span></span></div><div class="fl__v"><b>Vietnam</b></div></div>'
      + '</div>'
      + '<div class="sk"><div><i></i><u></u></div><div><i></i><u></u></div><div><i></i><u></u></div></div>'
      + '<div class="s1__pad"><p class="note">Two facts read so far. Nothing is published by structuring.</p></div>';
    o.foot = '<button class="s1__2nd" type="button">Stop and keep what is read</button>';
  }

  if(st === 'error'){
    o.body = '<div class="msg"><span class="mk mk--blocked"></span><h2>Ponte lost the connection while structuring.</h2>'
      + '<p>This was a network failure, not a problem with what you said. Here is exactly where things stand.</p>'
      + '<dl><dt>Saved</dt><dd class="was">Your recording and its transcript, in this browser.</dd>'
      + '<dt>Not saved</dt><dd class="wasnt">The structured listing. It has to be built again.</dd>'
      + '<dt>Reference</dt><dd class="id">PT-4471-08 \u00b7 02 Aug 2026, 09:41</dd></dl></div>';
    o.foot = act('Try again', 'Uses the transcript already saved') + '<button class="s1__2nd" type="button">Go back to what you said</button>';
  }
  return frame(o);
 }
};

/* ============================ SCREEN 2 · THE X SO FAR ============================ */
function fOK(k, v, hs, src){
  return '<button class="fl__i fl__i--ok" type="button"><div class="fl__k"><span class="lab">'+k+'</span>'
    + '<span class="r"><span class="mk mk--done"></span></span></div>'
    + '<div class="fl__v"><b>'+v+'</b>'+(hs?'<span class="hs">'+hs+'</span>':'')+'</div></button>';
}
function fINF(k, v, prov){
  return '<button class="fl__i fl__i--inf" type="button"><div class="fl__k"><span class="mk mk--inferred"></span><span class="lab">'+k+'</span>'
    + '<span class="r">Inferred, not read</span></div>'
    + '<div class="fl__v"><b>'+v+'</b></div>'
    + (prov?'<span class="prov">'+prov+'</span>':'')
    + '<div class="conf"><span>Yes, that is right</span><span>Change it</span></div></button>';
}
function fNEED(k, v, ask){
  return '<button class="fl__i fl__i--need" type="button"><div class="fl__k"><span class="mk mk--need"></span><span class="lab">'+k+'</span>'
    + '<span class="r">Needed to publish</span></div>'
    + '<div class="fl__v"><b>'+v+'</b></div>'+(ask?'<span class="ask">'+ask+'</span>':'')+'</button>';
}
/* R2 · stage completion. Five elements, none omitted:
   milestone · what completed · why it matters · what remains preserved
   or unresolved · one next action with owner. */
function r2(milestone, what, why, held, next, owner, due, dismiss){
  return '<div class="r2"><div class="r2__m"><span class="mk mk--done"></span><span class="lab">'+milestone+'</span></div>'
    + '<h2>'+what+'</h2><p>'+why+'</p>'
    + '<div class="held"><i></i><span>'+held+'</span></div>'
    + '<div class="r2__next"><span class="lab">Next action</span><b>'+next+'</b></div>'
    + '<div class="r2__meta"><span>Owner: '+owner+'</span>'+(due?'<span>Due: '+due+'</span>':'')+'</div>'
    + (dismiss?'<button type="button" class="r2__dismiss">'+dismiss+'</button>':'')+'</div>';
}

function hd2(title, need, inf, ok){
  return '<div class="fl__hd"><h1 class="stmt stmt--2">'+title+'</h1><div class="cnt">'
    + (need?'<span><span class="mk mk--need"></span>'+need+' needed</span>':'')
    + (inf?'<span><span class="mk mk--inferred"></span>'+inf+' inferred</span>':'')
    + (ok?'<span><span class="mk mk--done"></span>'+ok+' confirmed</span>':'')
    + '</div></div>';
}

var S2 = {
 n:'2', id:'B03\u2013B05 \u00b7 S02 \u00b7 T02', title:'The X so far',
 purpose:'Used by B03\u2013B05 (product), S02 (trade service) and T02 (distribution). The most reused surface in the product. One fact per line, missing and uncertain above confirmed, correction in place \u2014 never a bare text field, never a form.',
 states:[['captured','First arrival \u00b7 R2 objective captured'],['few','Few gaps \u2014 the common case'],['many','Many gaps'],['all','All confirmed'],['lowconf','Low confidence'],['correct','Correction open'],['loading','Loading'],['empty','Empty (recovery)'],['error','Error']],
 build:function(st, th){
  var o = { theme:th, seg:2, back:'Tell Ponte', step:'Step 2 of 3', label:'S2 '+st };

  if(st === 'captured'){
    o.body = r2('Objective captured',
      'Ponte has carried your objective forward without forcing a classification.',
      'What you said is now a structured listing that a buyer can find. Nothing about it is published, and nothing has been shown to anyone.',
      'Two facts are still needed, and one Ponte inferred rather than read. They are marked below and none of them block you from leaving this screen.',
      'Review the structured interpretation', 'You', '',
      'This gives way to your facts as soon as you scroll or correct anything.')
      + hd2('The listing so far', 2, 1, 6)
      + '<div class="fl">'
      + fNEED('Destination', 'Where can you deliver?', 'Choose one or more markets. This is what buyers filter on.')
      + fNEED('Price basis', 'How is the price quoted?', 'A basis, not a figure. The figure stays private until you choose to give it.')
      + fINF('Quantity', '24 t per month', 'Heard as \u201ctwenty four tonnes a month\u201d, not read from a document.')
      + '</div>';
    o.foot = act('Continue to publication', '2 facts still needed before it can publish');
  }

  if(st === 'few'){
    o.body = hd2('The listing so far', 2, 1, 6)
      + '<div class="fl">'
      + fNEED('Destination', 'Where can you deliver?', 'Choose one or more markets. This is what buyers filter on.')
      + fNEED('Price basis', 'How is the price quoted?', 'A basis, not a figure. The figure stays private until you choose to give it.')
      + fINF('Quantity', '24 t per month', 'Heard as \u201ctwenty four tonnes a month\u201d')
      + '</div>'
      + '<div class="fl__grp">Read from what you gave Ponte</div>'
      + '<div class="fl">'
      + fOK('Product', 'Rice, semi-milled or wholly milled', 'HS 1006.30')
      + fOK('Grade', 'White, 5% broken')
      + fOK('Origin', 'Vietnam')
      + fOK('Packing', '25 kg PP bags, 40 ft container')
      + fOK('Incoterms', 'FOB Ho Chi Minh City')
      + fOK('Validity', '60 days \u2014 expires 1 October 2026')
      + '</div>';
    o.foot = act('Continue to publication', '2 facts still needed before it can publish') + foots('Saved only in this browser for up to 7 days. Sign in to keep it longer and continue on another device.');
  }

  if(st === 'many'){
    o.body = hd2('The listing so far', 6, 2, 3)
      + '<div class="fl">'
      + fNEED('Destination', 'Where can you deliver?', 'Choose one or more markets.')
      + fNEED('Price basis', 'How is the price quoted?', 'A basis, not a figure.')
      + fNEED('Quantity', 'How much, and how often?', 'A monthly or per-shipment capacity.')
      + fNEED('Incoterms', 'On what terms?', 'FOB, CIF, EXW and the rest \u2014 chosen, not typed.')
      + fNEED('Packing', 'How is it packed?')
      + fNEED('Lead time', 'How long from order to shipment?')
      + '</div>'
      + '<div class="fl__grp">Inferred \u2014 confirm or change</div>'
      + '<div class="fl">'
      + fINF('Grade', 'White, 5% broken')
      + fINF('Validity', '60 days \u2014 expires 1 October 2026')
      + '</div>'
      + '<div class="fl__grp">Read from what you gave Ponte</div>'
      + '<div class="fl">'
      + fOK('Product', 'Rice, semi-milled or wholly milled', 'HS 1006.30')
      + fOK('Origin', 'Vietnam')
      + fOK('Supplier', 'Mekong Delta Rice Co.')
      + '</div>';
    o.foot = act('Continue to publication', '6 facts still needed before it can publish') + foots('Six gaps. The order is the work order \u2014 top first.');
  }

  if(st === 'all'){
    o.body = r2('Deal structured',
      'Your rice offer is ready for review.',
      'Every fact is confirmed or read from your own document, so a buyer sees evidence rather than a claim. Nothing is inferred and nothing is guessed.',
      'The price figure stays private until you choose to give it, and you can still change any line after publication.',
      'Review public and private information', 'You', '', '')
      + hd2('The listing so far', 0, 0, 9)
      + '<div class="fl">'
      + fOK('Product', 'Rice, semi-milled or wholly milled', 'HS 1006.30')
      + fOK('Grade', 'White, 5% broken')
      + fOK('Origin', 'Vietnam')
      + fOK('Destination', 'West Africa, Middle East')
      + fOK('Quantity', '24 t per month')
      + fOK('Incoterms', 'FOB Ho Chi Minh City')
      + fOK('Price basis', 'On application, per tonne')
      + fOK('Packing', '25 kg PP bags, 40 ft container')
      + fOK('Validity', '60 days \u2014 expires 1 October 2026')
      + '</div>';
    o.foot = act('Continue to publication') + foots('Saved only in this browser for up to 7 days. Sign in to keep it longer and continue on another device.');
  }

  if(st === 'lowconf'){
    o.body = hd2('The listing so far', 1, 3, 5)
      + '<div class="fl">'
      + '<button class="fl__i fl__i--inf" type="button" style="background:var(--attention-wash)"><div class="fl__k"><span class="mk mk--inferred"></span><span class="lab">Quantity</span><span class="r" style="color:var(--attention)">Ponte is unsure</span></div>'
      + '<div class="fl__v"><b>24 t per month</b></div>'
      + '<span class="ask" style="display:block;font-size:12.5px;color:var(--pf-ink-2);margin-top:7px;line-height:1.5">Heard as \u201ctwenty four\u201d, but it could have been \u201ctwenty four hundred\u201d. Ponte will not guess.</span>'
      + '<div class="conf"><span>24 t is right</span><span>Change it</span></div></button>'
      + fNEED('Destination', 'Where can you deliver?', 'Choose one or more markets.')
      + fINF('Incoterms', 'FOB Ho Chi Minh City')
      + fINF('Validity', '60 days \u2014 expires 1 October 2026')
      + '</div>'
      + '<div class="fl__grp">Read from what you gave Ponte</div>'
      + '<div class="fl">'
      + fOK('Product', 'Rice, semi-milled or wholly milled', 'HS 1006.30')
      + fOK('Grade', 'White, 5% broken')
      + fOK('Origin', 'Vietnam')
      + fOK('Packing', '25 kg PP bags')
      + fOK('Supplier', 'Mekong Delta Rice Co.')
      + '</div>';
    o.foot = act('Continue to publication', '1 fact needed \u00b7 3 waiting on you to confirm');
  }

  if(st === 'correct'){
    o.body = hd2('The listing so far', 2, 1, 6)
      + '<div class="fl">'
      + fNEED('Destination', 'Where can you deliver?', 'Choose one or more markets.')
      + fNEED('Price basis', 'How is the price quoted?', 'A basis, not a figure.')
      + '<div class="fl__i fl__i--inf row--sel"><div class="fl__k"><span class="mk mk--inferred"></span><span class="lab">Quantity</span><span class="r">Correcting</span></div><div class="fl__v"><b>24 t per month</b></div></div>'
      + '</div>'
      + '<div class="fl__grp">Read from what you gave Ponte</div>'
      + '<div class="fl">'+fOK('Product', 'Rice, semi-milled or wholly milled', 'HS 1006.30')+fOK('Origin', 'Vietnam')+'</div>';
    o.over = '<div class="pick__scrim"></div>'
      + '<div class="pick"><div class="pick__h"><b>Quantity</b><button type="button">Done</button></div>'
      + '<div class="step2"><button type="button" aria-label="Less">\u2212</button><span>24</span><button type="button" aria-label="More">+</button></div>'
      + '<div class="pick__b"><div class="rows">'
      + '<button class="row row--sel" type="button"><span class="mk mk--done"></span><span><b>Tonnes per month</b></span><span class="go"></span></button>'
      + '<button class="row" type="button"><span class="gl"></span><span><b>Tonnes per shipment</b></span><span class="go"></span></button>'
      + '<button class="row" type="button"><span class="gl"></span><span><b>Containers per month</b></span><span class="go"></span></button>'
      + '<button class="row" type="button"><span class="gl gl--mic"></span><span><b>Say it instead</b><small>\u201cTwenty four tonnes a month\u201d</small></span><span class="go">\u203a</span></button>'
      + '</div><div class="pick__s"><span class="gl gl--find"></span><input type="text" placeholder="Or type a different unit" /></div></div></div>';
    o.foot = act('Continue to publication', '2 facts still needed before it can publish');
  }

  if(st === 'loading'){
    o.body = '<div class="fl__hd"><h1 class="stmt stmt--2">The listing so far</h1><p class="note" style="margin-top:11px">Ponte is still structuring what you gave it.</p></div>'
      + '<div class="upl" style="padding:0 20px 18px"><div class="upl__bar upl__bar--ind"><i></i></div></div>'
      + '<div class="sk"><div><i></i><u></u></div><div><i></i><u></u></div><div><i></i><u></u></div><div><i></i><u></u></div><div><i></i><u></u></div><div><i></i><u></u></div><div><i></i><u></u></div></div>';
    o.foot = act('Continue to publication', 'Available once structuring finishes', true);
  }

  if(st === 'empty'){
    o.body = '<div class="msg"><span class="mk mk--need"></span><h2>There is nothing in this listing yet.</h2>'
      + '<p>This should not normally happen. Either the last step was interrupted, or the draft was opened before anything was given to Ponte.</p>'
      + '<dl><dt>Draft</dt><dd class="id">PT-4471-08 \u00b7 opened 02 Aug 2026</dd><dt>Kept</dt><dd class="was">Your recording, in this browser.</dd></dl></div>'
      + '<div class="hr"></div>'
      + '<div class="rows">'
      + row('mic','Say what you supply','Any language. The fastest route back.')
      + row('cam','Photograph or upload','Sign in first, so the file is held against your account')
      + row('grid','Browse categories')
      + '</div>';
    o.foot = foots('Nothing has been published or shown to anyone.');
  }

  if(st === 'error'){
    o.body = '<div class="msg"><span class="mk mk--blocked"></span><h2>Ponte could not finish structuring this listing.</h2>'
      + '<p>The service failed part-way. What it had already read is kept, and your original input is untouched.</p>'
      + '<dl><dt>Saved</dt><dd class="was">Four facts read, and your recording.</dd>'
      + '<dt>Not saved</dt><dd class="wasnt">The five remaining fields.</dd>'
      + '<dt>Reference</dt><dd class="id">PT-4471-08 \u00b7 02 Aug 2026, 09:44</dd></dl></div>'
      + '<div class="hr"></div>'
      + '<div class="fl">'+fOK('Product', 'Rice, semi-milled or wholly milled', 'HS 1006.30')+fOK('Origin', 'Vietnam')+'</div>';
    o.foot = act('Try again', 'Continues from the four facts already read') + '<button class="s1__2nd" type="button">Go back without losing this</button>';
  }
  return frame(o);
 }
};

/* ============================ SCREEN 3 · SIGN IN ============================ */
var STORE_OUT = '<div class="store"><span class="mk mk--inferred" style="margin-top:2px"></span><span><b>Saved only in this browser for up to 7 days.</b>'
  + '<span>Not on your other devices. Sign in to keep it longer and continue on another device.</span></span></div>';
var STORE_IN = '<div class="store"><span class="mk mk--done" style="margin-top:2px"></span><span><b>Saved to your account. Continue on any device.</b>'
  + '<span>Kept for 90 days from your last edit, with a warning 14 days and 3 days before.</span></span></div>';

var S3 = {
 n:'3', id:'B08', title:'Sign in',
 purpose:'B08 Light Account Gate. Authenticate without the user feeling they have hit a wall after doing real work. The draft survives the round trip and returns to the exact node.',
 states:[['default','Default'],['create','Create account'],['loading','Loading'],['failed','Failed'],['returning','Returning mid-flow'],['expired','Session expired']],
 build:function(st, th){
  var o = { theme:th, seg:3, back:'The listing so far', step:'Step 3 of 3', label:'S3 '+st };

  if(st === 'default'){
    o.body = '<div class="s1__pad" style="padding-bottom:20px"><h1 class="stmt">Sign in to publish this listing.</h1>'
      + '<p class="lede">Your listing is written and waiting. Signing in publishes it and keeps it with you.</p></div>'
      + '<div class="si__f">'
      + '<label><span class="lab">Email</span><input type="email" placeholder="you@company.com" /></label>'
      + '<label><span class="lab">Password</span><input type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" /></label>'
      + '</div>'
      + STORE_OUT
      + '<div class="alt"><button type="button">Create an account<span class="go">\u203a</span></button>'
      + '<button type="button">Send me a sign-in link<span class="go">\u203a</span></button></div>';
    o.foot = act('Continue to publication') + foots('Saved only in this browser for up to 7 days. Sign in to keep it longer and continue on another device.');
  }

  if(st === 'create'){
    o.body = '<div class="s1__pad" style="padding-bottom:20px"><h1 class="stmt stmt--2">Create an account to publish this listing.</h1>'
      + '<p class="lede">Nothing about your listing changes. This is who it belongs to.</p></div>'
      + '<div class="si__f">'
      + '<label><span class="lab">Email</span><input type="email" placeholder="you@company.com" /></label>'
      + '<label><span class="lab">Password</span><input type="password" placeholder="At least 10 characters" /></label>'
      + '<label><span class="lab">Company</span><input type="text" placeholder="Mekong Delta Rice Co." /></label>'
      + '</div>'
      + STORE_IN
      + '<div class="alt"><button type="button">I already have an account<span class="go">\u203a</span></button></div>';
    o.foot = act('Continue to publication') + foots('Ponte states what it verifies. Creating an account verifies nothing yet.');
  }

  if(st === 'loading'){
    o.body = '<div class="s1__pad" style="padding-bottom:20px"><h1 class="stmt stmt--2">Signing you in.</h1></div>'
      + '<div class="upl" style="padding:0 20px 22px"><div class="upl__bar upl__bar--ind"><i></i></div>'
      + '<p class="note">Your listing is moving with you. This does not publish it.</p></div>'
      + '<div class="si__f" style="opacity:.45">'
      + '<label><span class="lab">Email</span><input type="email" value="giuseppe@mekongrice.vn" readonly /></label>'
      + '<label><span class="lab">Password</span><input type="password" value="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" readonly /></label>'
      + '</div>' + STORE_OUT;
    o.foot = act('Continue to publication', 'Signing in\u2026', true) + '<button class="s1__2nd" type="button">Cancel</button>';
  }

  if(st === 'failed'){
    o.body = '<div class="s1__pad" style="padding-bottom:18px"><span class="lab" style="color:var(--blocked)"><span class="mk mk--blocked" style="vertical-align:-3px;margin-inline-end:6px"></span>Not signed in</span>'
      + '<h1 class="stmt stmt--2" style="margin-top:12px">That password does not match this email.</h1>'
      + '<p class="lede">The email is recognised. Your listing is untouched and still here.</p></div>'
      + '<div class="si__f">'
      + '<label><span class="lab">Email</span><input type="email" value="giuseppe@mekongrice.vn" /></label>'
      + '<label class="bad"><span class="lab">Password \u2014 does not match</span><input type="password" value="\u2022\u2022\u2022\u2022\u2022\u2022\u2022" /></label>'
      + '</div>'
      + STORE_OUT
      + '<div class="alt"><button type="button">Send me a sign-in link instead<span class="go">\u203a</span></button>'
      + '<button type="button">Reset password<span class="go">\u203a</span></button></div>';
    o.foot = act('Continue to publication') + foots('Two attempts left before a short wait.');
  }

  if(st === 'returning'){
    o.body = '<div class="resume"><span class="lab">Waiting for you</span>'
      + '<b>Rice, semi-milled or wholly milled \u2014 24 t per month, FOB Ho Chi Minh City</b>'
      + '<span class="id">Draft PT-4471-08 \u00b7 9 facts \u00b7 last edited 02 Aug 2026, 09:44</span></div>'
      + '<div class="s1__pad" style="padding:20px 20px 18px"><h1 class="stmt stmt--2">Sign in and this carries on where you left it.</h1>'
      + '<p class="lede">You will land back on the listing, not on a home page.</p></div>'
      + '<div class="si__f">'
      + '<label><span class="lab">Email</span><input type="email" value="giuseppe@mekongrice.vn" /></label>'
      + '<label><span class="lab">Password</span><input type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" /></label>'
      + '</div>' + STORE_OUT;
    o.foot = act('Continue to publication') + '<button class="s1__2nd" type="button">Keep working without signing in</button>';
  }

  if(st === 'expired'){
    o.body = '<div class="msg"><span class="mk mk--need"></span><h2>Your session ended while you were away.</h2>'
      + '<p>Nothing was lost. Sign in again and Ponte returns you to the exact line you were editing.</p>'
      + '<dl><dt>Returning to</dt><dd>The listing so far \u2014 Quantity</dd><dt>Draft</dt><dd class="id">PT-4471-08 \u00b7 9 facts</dd></dl></div>'
      + '<div class="si__f">'
      + '<label><span class="lab">Password</span><input type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" /></label>'
      + '</div>' + STORE_IN
      + '<div class="alt"><button type="button">Sign in as someone else<span class="go">\u203a</span></button></div>';
    o.foot = act('Continue', 'Returns you to Quantity') + foots('Signed in as giuseppe@mekongrice.vn');
  }
  return frame(o);
 }
};

window.PS1 = { S1:S1, S2:S2, S3:S3, order:['S1','S2','S3'] };
})();
