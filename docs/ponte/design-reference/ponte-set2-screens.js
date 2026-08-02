/* PONTE · SET 2 — publish a listing, end to end, all three families.
   Uses the Set 1 patterns unchanged. Every surface: empty, loading, error. */
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
  return '<div class="msg"><span class="mk mk--'+mk+'"></span><h2>'+h+'</h2><p>'+p+'</p>'
    + (dl?'<dl>'+dl+'</dl>':'')+'</div>';
}
function sk(n){ var s=''; for(var i=0;i<n;i++) s+='<div><i></i><u></u></div>'; return '<div class="sk">'+s+'</div>'; }
function ind(){ return '<div class="upl" style="padding:0 20px 18px"><div class="upl__bar upl__bar--ind"><i></i></div></div>'; }

var SAVED7 = 'Saved only in this browser for up to 7 days. Sign in to keep it longer and continue on another device.';
var SAVED90 = 'Saved to your account. Kept for 90 days from your last edit.';

/* ===================== 1 · B01 CHOOSE DEAL INTENT ===================== */
function dirBtn(b, s, on){
  return '<button type="button" aria-pressed="'+(on?'true':'false')+'"><span><b>'+b+'</b><small>'+s+'</small></span>'
    + '<span class="mk '+(on?'mk--done':'')+'"></span></button>';
}
function famRow(b, s, on){
  return '<button class="row'+(on?' row--sel':'')+'" type="button"><span class="mk '+(on?'mk--done':'')+'"></span>'
    + '<span><b>'+b+'</b>'+(s?'<small>'+s+'</small>':'')+'</span><span class="go">'+(on?'':'\u203a')+'</span></button>';
}
var B01 = {
 n:'1', id:'B01', title:'Choose Deal Intent',
 purpose:'Direction and family in one surface, revealed progressively, plus the mandatory position attribute for distribution. A persistent shortcut exposes all six opportunity types directly for returning members.',
 states:[['direction','Empty \u00b7 direction only'],['family','Family revealed'],['position','Position \u00b7 distribution, mandatory'],['shortcut','Returning member \u00b7 shortcut'],['loading','Loading'],['error','Error']],
 build:function(st, th){
  var o = { theme:th, segs:5, seg:1, back:false, label:'B01 '+st };

  if(st === 'direction'){
    o.body = head('What are you here to do?', '', 18)
      + '<div class="dir">'
      + dirBtn('I need something', 'You are buying, sourcing or looking for a partner')
      + dirBtn('I am offering something', 'You supply, provide a service, or represent others')
      + '</div>'
      + '<div class="s1__pad" style="padding:20px 20px 8px"><span class="lab">Or go straight to one</span></div>'
      + '<div class="sc">'
      + '<button type="button"><b>Offer a product</b><span>B02</span></button>'
      + '<button type="button"><b>Source a product</b><span>B02</span></button>'
      + '<button type="button"><b>Offer a service</b><span>S01</span></button>'
      + '<button type="button"><b>Need a service</b><span>S01</span></button>'
      + '<button type="button"><b>Offer distribution</b><span>T01</span></button>'
      + '<button type="button"><b>Seek distribution</b><span>T01</span></button>'
      + '</div>';
    o.foot = foots(SAVED7);
  }

  if(st === 'family'){
    o.body = head('What are you offering?', 'You are offering something', 14)
      + '<div class="rows">'
      + famRow('A product', 'Goods you supply, in any quantity')
      + famRow('A trade service', 'Inspection, finance, logistics, certification, legal')
      + famRow('Distribution or representation', 'Acting for someone else, or seeking someone to act for you')
      + '</div>'
      + '<div class="s1__pad" style="padding:18px 20px 8px"><span class="lab">Change</span></div>'
      + '<div class="rows">'
      + '<button class="row" type="button"><span class="mk mk--inferred"></span><span><b>I need something instead</b></span><span class="go">\u203a</span></button>'
      + '</div>';
    o.foot = act('Continue', 'Choose one to continue', true) + foots(SAVED7);
  }

  if(st === 'position'){
    o.body = head('Which side of the arrangement are you on?', 'Distribution and representation', 12)
      + '<div class="s1__pad" style="padding:0 20px 14px"><p class="prose">This one is required. Without it, two listings that are each other\u2019s counterparty look identical to two that are peers.</p></div>'
      + grp('Distribution')
      + '<div class="rows">'
      + famRow('I am seeking a distributor', 'You have the goods and want someone to sell them in a market')
      + famRow('I am offering to distribute', 'You have the market and want goods to sell in it')
      + '</div>'
      + grp('Representation')
      + '<div class="rows">'
      + famRow('I am seeking an agent', 'You want someone to represent you in a market')
      + famRow('I am offering to represent', 'You want to represent others in your market')
      + '</div>';
    o.foot = act('Continue', 'Required before this listing can be published', true) + foots(SAVED7);
  }

  if(st === 'shortcut'){
    o.body = '<div class="sug"><span class="lab">Last time</span><b>You offered a product</b>'
      + '<p>Ponte remembers, but it will not choose for you. Confirm it or pick something else.</p>'
      + '<div class="acts"><span>Same again</span><span>Something else</span></div></div>'
      + head('All six, directly', '', 8)
      + '<div class="sc">'
      + '<button type="button"><b>Offer a product</b><span>B02 \u00b7 4 live</span></button>'
      + '<button type="button"><b>Source a product</b><span>B02</span></button>'
      + '<button type="button"><b>Offer a service</b><span>S01</span></button>'
      + '<button type="button"><b>Need a service</b><span>S01 \u00b7 1 live</span></button>'
      + '<button type="button"><b>Offer distribution</b><span>T01</span></button>'
      + '<button type="button"><b>Seek distribution</b><span>T01</span></button>'
      + '</div>';
    o.foot = foots(SAVED90);
  }

  if(st === 'loading'){
    o.body = head('What are you offering?', 'You are offering something', 10) + ind() + sk(3);
    o.foot = act('Continue', 'Available once the families load', true);
  }

  if(st === 'error'){
    o.body = msg('blocked', 'Ponte could not load the opportunity types.',
      'A network failure, not a problem with anything you chose. Your direction is kept.',
      '<dt>Saved</dt><dd class="was">Direction \u2014 you are offering something.</dd>'
      + '<dt>Not saved</dt><dd class="wasnt">Nothing else. You had not chosen a family yet.</dd>'
      + '<dt>Reference</dt><dd class="id">PT-4482-08 \u00b7 02 Aug 2026, 10:02</dd>');
    o.foot = act('Try again', 'Keeps the direction you chose') + snd('Go back');
  }
  return frame(o);
 }
};

/* ===================== 2 · CAPACITY DECLARATION ===================== */
var CAP_ROWS = function(sel){
  return '<div class="rows">'
    + famRow('Principal for my own company', 'The goods or service are yours to sell', sel==='p')
    + famRow('Authorised representative', 'You act for a named company with its authority', sel==='r')
    + famRow('Broker or intermediary', 'You connect the parties and are not the principal', sel==='b')
    + famRow('Service provider', 'You perform the service yourself', sel==='s')
    + '</div>';
};
var PUBLIC_NOTE = '<div class="lay__h" style="padding:18px 20px 18px;border-block-start:1px solid var(--rule)">'
  + '<span class="mk mk--pub"></span><span><b>Your capacity is public.</b>'
  + '<span>It appears on the listing in all three families, before anyone contacts you. Buyers filter on it.</span></span></div>';

var CAP = {
 n:'2', id:'B01b', title:'Capacity declaration',
 purpose:'A statement about the person, not the goods, so it sits outside the fact list. A previous answer is offered as a suggestion and must be actively confirmed, never silently applied. Intermediary status is public and the screen says so where it is declared.',
 states:[['empty','Empty'],['suggested','Previous answer offered'],['authority','Authority declaration inline'],['confirmed','Confirmed'],['loading','Loading'],['error','Error']],
 build:function(st, th){
  var o = { theme:th, segs:5, seg:1, back:'Deal intent', label:'CAP '+st };

  if(st === 'empty'){
    o.body = head('For this opportunity, I am acting as\u2026', '', 12) + CAP_ROWS('') + PUBLIC_NOTE;
    o.foot = act('Continue', 'Choose one to continue', true) + foots(SAVED7);
  }

  if(st === 'suggested'){
    o.body = '<div class="sug"><span class="lab">On your last listing</span><b>Authorised representative</b>'
      + '<p>Ponte has not applied this. Capacity can differ from one opportunity to the next, so it asks every time.</p>'
      + '<div class="acts"><span>Yes, again</span><span>Not this time</span></div></div>'
      + head('For this opportunity, I am acting as\u2026', '', 12) + CAP_ROWS('') + PUBLIC_NOTE;
    o.foot = act('Continue', 'Nothing is chosen yet', true) + foots(SAVED90);
  }

  if(st === 'authority'){
    o.body = head('For this opportunity, I am acting as\u2026', '', 12) + CAP_ROWS('r')
      + '<div class="auth"><span class="lab"><span class="mk mk--need" style="vertical-align:-3px;margin-inline-end:7px"></span>Authority declaration</span>'
      + '<p>Name the company you act for, and confirm you hold its authority to offer on its behalf.</p>'
      + '<input type="text" placeholder="Company you represent" />'
      + '<label class="on"><i></i><span>I hold written authority from this company to offer on its behalf, and I will provide it if asked.</span></label></div>'
      + PUBLIC_NOTE;
    o.foot = act('Continue', 'Both are needed before this listing can be published') + foots(SAVED90);
  }

  if(st === 'confirmed'){
    o.body = head('For this opportunity, I am acting as\u2026', '', 12) + CAP_ROWS('b')
      + '<div class="lay__h" style="padding:18px 20px 18px;border-block-start:1px solid var(--rule);background:var(--tone)">'
      + '<span class="mk mk--pub"></span><span><b>\u201cBroker or intermediary\u201d will appear on this listing.</b>'
      + '<span>Publicly, before anyone contacts you. Ponte does not hide intermediary status and does not let you either.</span></span></div>';
    o.foot = act('Continue') + foots(SAVED90);
  }

  if(st === 'loading'){
    o.body = head('For this opportunity, I am acting as\u2026', '', 10) + ind() + sk(4);
    o.foot = act('Continue', 'Available in a moment', true);
  }

  if(st === 'error'){
    o.body = msg('blocked', 'Ponte could not save your capacity.',
      'The service failed on the way out. Nothing else about this listing is affected.',
      '<dt>Saved</dt><dd class="was">Your deal intent, and everything before it.</dd>'
      + '<dt>Not saved</dt><dd class="wasnt">Capacity, and the authority declaration.</dd>'
      + '<dt>Reference</dt><dd class="id">PT-4482-08 \u00b7 02 Aug 2026, 10:06</dd>');
    o.foot = act('Try again', 'Your answers are still on screen') + snd('Go back without losing this');
  }
  return frame(o);
 }
};

/* ===================== 3 · B06 PRODUCT DESCRIPTION AND ASSETS ===================== */
function asset(kind, name, meta, vis){
  var m = vis === 'pub' ? '<span class="mk mk--pub"></span>Public'
        : vis === 'acc' ? '<span class="mk mk--acc"></span>On accepted interest'
        : '<span class="mk mk--priv"></span>Private';
  return '<button class="ast__i" type="button"><span class="ast__t">'+kind+'</span>'
    + '<span><b>'+name+'</b><small>'+m+' \u00b7 '+meta+'</small></span><span class="go" style="font-family:var(--f-mono);color:var(--pf-ink-3)">\u203a</span></button>';
}
var B06 = {
 n:'3', id:'B06', title:'Product Description and Assets',
 purpose:'Product family only. Present the listing credibly, with visibility set per item rather than per listing. Every asset states who can see it, at the point of adding it.',
 states:[['empty','Empty'],['some','Assets added'],['uploading','Uploading'],['error','Error']],
 build:function(st, th){
  var o = { theme:th, segs:5, seg:3, back:'The listing so far', label:'B06 '+st };

  if(st === 'empty'){
    o.body = head('Show buyers what they are looking at.', '', 10)
      + '<div class="s1__pad" style="padding:0 20px 6px"><p class="prose">A listing with photographs and a specification is read more often than one without. Nothing here is required to publish, and you set who sees each item.</p></div>'
      + '<button class="ast__drop" type="button"><b>Add a photograph or document</b>'
      + '<span>Photograph the goods, or attach a specification, certificate or price list. You are signed in, so files are held against your account.</span></button>'
      + '<div class="s1__pad" style="padding:20px 20px 8px"><span class="lab">Visibility, per item</span></div>'
      + '<div class="lay__l">'
      + '<div><span><span class="k">Public</span><span class="v">Anyone browsing Ponte</span></span><span class="fx"><span class="mk mk--pub"></span></span></div>'
      + '<div><span><span class="k">On accepted interest</span><span class="v">Only a counterparty you have accepted</span></span><span class="fx"><span class="mk mk--acc"></span></span></div>'
      + '<div><span><span class="k">Private</span><span class="v">Only you. Held, never shown.</span></span><span class="fx"><span class="mk mk--priv"></span></span></div>'
      + '</div>';
    o.foot = act('Continue without assets', 'You can add them after publishing') + foots(SAVED90);
  }

  if(st === 'some'){
    o.body = head('Show buyers what they are looking at.', '4 items \u00b7 2 public', 10)
      + '<div class="ast">'
      + asset('JPG', 'Milled grain, close', '2.1 MB \u00b7 02 Aug', 'pub')
      + asset('JPG', '25 kg bags, palletised', '1.7 MB \u00b7 02 Aug', 'pub')
      + asset('PDF', 'Specification sheet', '412 KB \u00b7 02 Aug', 'acc')
      + asset('PDF', 'Phytosanitary certificate', '208 KB \u00b7 02 Aug', 'priv')
      + '</div>'
      + '<button class="ast__drop" type="button"><b>Add another</b><span>Photograph, specification, certificate or price list.</span></button>'
      + '<div class="s1__pad" style="padding:18px 20px 4px"><p class="note">Ponte does not check what a document claims. It shows buyers what you gave it and says where it came from.</p></div>';
    o.foot = act('Continue') + foots(SAVED90);
  }

  if(st === 'uploading'){
    o.body = head('Show buyers what they are looking at.', '3 items \u00b7 1 sending', 10)
      + '<div class="ast">'
      + asset('JPG', 'Milled grain, close', '2.1 MB \u00b7 02 Aug', 'pub')
      + asset('JPG', '25 kg bags, palletised', '1.7 MB \u00b7 02 Aug', 'pub')
      + '</div>'
      + '<div class="upl"><div class="upl__bar"><i style="inline-size:41%"></i></div>'
      + '<div class="upl__m"><span class="id">spec-sheet.pdf \u00b7 169 KB of 412 KB</span>'
      + '<button type="button" class="act-txt" style="background:none;border:0;padding:0">Stop</button></div></div>'
      + '<div class="disc" style="border-block-end:0"><p class="prose">Held against your account. Kept for 90 days from your last edit to this listing, with a warning 14 days and 3 days before. Nobody sees it until you set it public or accept an interest.</p></div>';
    o.foot = act('Continue', 'You can leave this \u2014 the upload carries on');
  }

  if(st === 'error'){
    o.body = msg('blocked', 'One file did not upload.',
      'The connection dropped part-way through. The other three are held against your account and are unaffected.',
      '<dt>Sent</dt><dd class="was">3 items \u00b7 4.0 MB</dd>'
      + '<dt>Not sent</dt><dd class="wasnt">phytosanitary-cert.pdf \u00b7 208 KB</dd>'
      + '<dt>Reference</dt><dd class="id">PT-4482-08 \u00b7 02 Aug 2026, 10:14</dd>')
      + '<div class="ast">'
      + asset('JPG', 'Milled grain, close', '2.1 MB \u00b7 02 Aug', 'pub')
      + asset('JPG', '25 kg bags, palletised', '1.7 MB \u00b7 02 Aug', 'pub')
      + asset('PDF', 'Specification sheet', '412 KB \u00b7 02 Aug', 'acc')
      + '</div>';
    o.foot = act('Send it again', 'The other three stay as they are') + snd('Continue without it');
  }
  return frame(o);
 }
};

/* ===================== 4 · B07 / S03 / T03 DEAL PREVIEW ===================== */
function layPub(rows){
  return '<div class="lay--pub"><div class="lay__h"><span class="mk mk--pub"></span>'
    + '<span><b>Public \u2014 anyone browsing Ponte</b><span>The minimum public dataset. It is what makes a listing findable, so it cannot be reduced.</span></span>'
    + '<span class="fixed"><span class="mk mk--lock"></span>Fixed</span></div>'
    + '<div class="lay__l">'+rows+'</div></div>';
}
function layAcc(rows){
  return '<div class="lay__h"><span class="mk mk--acc"></span>'
    + '<span><b>On accepted interest \u2014 both sides, at once</b><span>Disclosure is mutual. Neither party sees the other\u2019s identity without giving their own.</span></span></div>'
    + '<div class="lay__l">'+rows+'</div>';
}
function layPriv(rows){
  return '<div class="lay__h"><span class="mk mk--priv"></span>'
    + '<span><b>Private \u2014 only you</b><span>Held against your account. Never shown, and never inferred from anything public.</span></span></div>'
    + '<div class="lay__l">'+rows+'</div>';
}
/* A row with a control IS the control — 64px, tappable, acknowledged.
   Fixed rows stay divs: there is nothing to change, so there is nothing to tap. */
function lr(k, v, ctl){
  var body = '<span><span class="k">'+k+'</span><span class="v">'+v+'</span></span>';
  if(ctl === 'fixed') return '<div>'+body+'<span class="fx">Fixed</span></div>';
  return '<button type="button">'+body+'<span class="ctl">'+(ctl||'Change')+'</span></button>';
}
var VALIDITY = '<div class="val"><span class="lab">Validity</span>'
  + '<div class="pills"><button type="button" aria-pressed="true">60 DAYS</button>'
  + '<button type="button">30 DAYS</button><button type="button">90 DAYS</button></div>'
  + '<span class="exp">This listing expires on <b>1 October 2026</b>. After that it stops appearing in results, and you can republish it.</span></div>';

var PREVIEWS = {
 product:{
  label:'Product \u00b7 B07',
  head:'Rice, semi-milled or wholly milled',
  pub: lr('Product', 'Rice, semi-milled or wholly milled <span class="hs">HS 1006.30</span>', 'fixed')
     + lr('Origin', 'Vietnam', 'fixed') + lr('Quantity', '24 t per month', 'fixed')
     + lr('Incoterms', 'FOB Ho Chi Minh City', 'fixed') + lr('Price basis', 'On application, per tonne', 'fixed')
     + lr('Capacity', 'Principal for own company', 'fixed'),
  acc: lr('Company', 'Mekong Delta Rice Co.', 'Show publicly')
     + lr('Contact', 'Giuseppe \u00b7 named on acceptance') + lr('Assets', '1 specification sheet'),
  priv: lr('Price', 'USD 512 per tonne') + lr('Certificate', 'Phytosanitary \u00b7 held, not shown')
      + lr('Notes', 'Two buyers approached in July')
 },
 service:{
  label:'Trade service \u00b7 S03',
  head:'Pre-shipment inspection, agricultural bulk',
  pub: lr('Service', 'Pre-shipment inspection', 'fixed') + lr('Sectors', 'Agricultural bulk, containerised', 'fixed')
     + lr('Coverage', 'Vietnam, Thailand, Cambodia', 'fixed') + lr('Turnaround', '48 hours from instruction', 'fixed')
     + lr('Fee basis', 'Per inspection, on application', 'fixed') + lr('Capacity', 'Service provider', 'fixed'),
  acc: lr('Company', 'Delta Survey Services Ltd', 'Show publicly')
     + lr('Accreditations', '2 \u00b7 named on acceptance') + lr('References', '3 \u00b7 named on acceptance'),
  priv: lr('Fee', 'USD 380 per inspection') + lr('Capacity held', '11 inspections per week')
      + lr('Notes', 'Do not quote below 340')
 },
 distribution:{
  label:'Distribution \u00b7 T03',
  head:'Distributor sought \u2014 West Africa',
  pub: lr('Position', 'Seeking a distributor', 'fixed') + lr('Goods', 'Rice, semi-milled <span class="hs">HS 1006.30</span>', 'fixed')
     + lr('Markets sought', 'Nigeria, Ghana, Senegal', 'fixed') + lr('Exclusivity', 'Open to discussion', 'fixed')
     + lr('Term sought', '12 months, renewable', 'fixed') + lr('Capacity', 'Authorised representative', 'fixed'),
  acc: lr('Company', 'Mekong Delta Rice Co.', 'Show publicly')
     + lr('Represented by', 'Named on acceptance') + lr('Volume available', '280 t per month'),
  priv: lr('Margin offered', '4.5% of invoice value') + lr('Authority', 'Written mandate \u00b7 held, not shown')
      + lr('Notes', 'Two agents declined on margin')
 }
};

var B07 = {
 n:'4', id:'B07 \u00b7 S03 \u00b7 T03', title:'Deal Preview',
 purpose:'The most important surface in Set 2. Three layers \u2014 public, on accepted interest, private \u2014 with the minimum public dataset shown as fixed and unmovable. The three family variants differ in their field sets, not in their structure.',
 states:[['product','Product \u00b7 B07'],['service','Trade service \u00b7 S03'],['distribution','Distribution \u00b7 T03'],['identity','Identity \u00b7 show publicly'],['loading','Loading'],['empty','Empty (recovery)'],['error','Error']],
 build:function(st, th){
  var o = { theme:th, segs:5, seg:4, back:'The listing so far', label:'B07 '+st };
  var v = PREVIEWS[st] || PREVIEWS.product;

  if(PREVIEWS[st]){
    o.body = '<div class="fl__hd"><span class="lab">'+v.label+' \u00b7 what the market sees</span>'
      + '<h1 class="stmt stmt--2" style="margin-top:11px">'+v.head+'</h1></div>'
      + layPub(v.pub) + layAcc(v.acc) + layPriv(v.priv) + VALIDITY;
    o.foot = act('Publish', 'Public and free. Anyone can find it.') + foots(SAVED90);
  }

  if(st === 'identity'){
    o.body = '<div class="fl__hd"><span class="lab">Product \u00b7 B07 \u00b7 company identity</span>'
      + '<h1 class="stmt stmt--2" style="margin-top:11px">Who sees that this is Mekong Delta Rice Co.?</h1></div>'
      + '<div class="rows">'
      + famRow('On accepted interest', 'The default. They see you when you see them \u2014 mutual, at the same moment.', true)
      + famRow('Publicly, on the listing', 'Anyone browsing sees your company name before contacting you.')
      + '</div>'
      + '<div class="lay__h" style="border-block-start:1px solid var(--rule);padding-block:18px"><span class="mk mk--acc"></span>'
      + '<span><b>Disclosure is mutual either way.</b><span>If you stay on accepted interest, no counterparty ever sees your identity without giving theirs in the same moment. Choosing public gives yours first.</span></span></div>'
      + '<div class="s1__pad" style="padding:18px 20px 4px"><p class="note">This can be changed after publishing. Anyone who already saw your identity has already seen it.</p></div>';
    o.foot = act('Keep it on accepted interest') + snd('Show my company publicly');
  }

  if(st === 'loading'){
    o.body = '<div class="fl__hd"><span class="lab">Preview</span><h1 class="stmt stmt--2" style="margin-top:11px">Ponte is assembling what the market will see.</h1></div>'
      + ind() + sk(7);
    o.foot = act('Publish', 'Available once the preview is assembled', true);
  }

  if(st === 'empty'){
    o.body = msg('need', 'There is nothing to preview yet.',
      'This should not normally happen. The listing has a reference but no facts against it, so there is nothing the market could see.',
      '<dt>Listing</dt><dd class="id">PT-4482-08 \u00b7 opened 02 Aug 2026</dd>'
      + '<dt>Kept</dt><dd class="was">Your deal intent and capacity.</dd>')
      + '<div class="hr"></div>'
      + '<div class="rows">'
      + '<button class="row" type="button"><span class="gl gl--mic"></span><span><b>Say what you supply</b><small>Any language. The fastest route back.</small></span><span class="go">\u203a</span></button>'
      + '<button class="row" type="button"><span class="gl gl--grid"></span><span><b>Browse categories</b></span><span class="go">\u203a</span></button>'
      + '</div>';
    o.foot = foots('Nothing has been published or shown to anyone.');
  }

  if(st === 'error'){
    o.body = msg('blocked', 'Ponte could not build the preview.',
      'The service failed while assembling it. Every fact in your listing is untouched \u2014 this failed on the way to the screen, not on the way to storage.',
      '<dt>Saved</dt><dd class="was">All 9 facts, your assets and your capacity.</dd>'
      + '<dt>Not saved</dt><dd class="wasnt">Nothing. The preview is built fresh each time.</dd>'
      + '<dt>Reference</dt><dd class="id">PT-4482-08 \u00b7 02 Aug 2026, 10:21</dd>');
    o.foot = act('Try again', 'Nothing needs re-entering') + snd('Go back to the listing');
  }
  return frame(o);
 }
};

/* ===================== 5 · B09 SUBMISSION CONFIRMATION (R2) ===================== */
function r2(milestone, what, why, held, next, owner, due){
  return '<div class="r2"><div class="r2__m"><span class="mk mk--done"></span><span class="lab">'+milestone+'</span></div>'
    + '<h2>'+what+'</h2><p>'+why+'</p>'
    + '<div class="held"><i></i><span>'+held+'</span></div>'
    + '<div class="r2__next"><span class="lab">Next action</span><b>'+next+'</b></div>'
    + '<div class="r2__meta"><span>Owner: '+owner+'</span>'+(due?'<span>Due: '+due+'</span>':'')+'</div></div>';
}
var B09 = {
 n:'5', id:'B09', title:'Submission Confirmation',
 purpose:'The Momentum catalogue maps deal_published to R2, so this is a stage-completion recognition rather than a receipt. All five elements, the listing reference, the exact expiry date, and an honest next step \u2014 responses may or may not come.',
 states:[['published','Published \u00b7 R2 deal published'],['loading','Publishing'],['error','Error']],
 build:function(st, th){
  var o = { theme:th, segs:5, seg:5, back:false, label:'B09 '+st };

  if(st === 'published'){
    o.body = r2('Deal published',
      'Your rice offer is live and anyone can find it.',
      'It appears in results from now until it expires, with your public facts and without your price or your identity. Nothing about publishing guarantees a response \u2014 Ponte can make you findable, not wanted.',
      'Your price, your certificate and your notes stay private, and your company name is disclosed only when you accept an interest and the other side gives theirs.',
      'Watch for interest, or add another listing', 'You', '')
      + '<div class="lay__l">'
      + '<div><span><span class="k">Listing reference</span><span class="v"><span class="mono">PT-4482-08</span></span></span><span class="fx">Public</span></div>'
      + '<div><span><span class="k">Expires</span><span class="v">1 October 2026</span></span><span class="fx">60 days</span></div>'
      + '<div><span><span class="k">Visible as</span><span class="v">Principal for own company</span></span><span class="fx">Public</span></div>'
      + '</div>'
      + '<div class="perim"><p>Ponte checked this submission against its sanctions and prohibited-goods lists and confirmed the fields are complete and internally consistent. That is what was checked. It is not a check of your counterparty, and it is not a guarantee about anyone who contacts you.</p></div>';
    o.foot = act('Back to my listings') + snd('Publish another');
  }

  if(st === 'loading'){
    o.body = head('Publishing your listing.', '', 12)
      + '<div class="s1__pad" style="padding:0 20px 16px"><p class="prose">Automated checks run first. This takes seconds, not days.</p></div>'
      + ind()
      + '<div class="scr">'
      + '<div class="scr__i"><span class="mk mk--done"></span><span><b>Fields complete and consistent</b></span><span class="st ok">Checked</span></div>'
      + '<div class="scr__i"><span class="mk mk--inferred"></span><span><b>Sanctions and prohibited goods</b></span><span class="st run">Running</span></div>'
      + '<div class="scr__i"><span class="mk mk--inferred"></span><span><b>Duplicate listing</b></span><span class="st run">Waiting</span></div>'
      + '</div>';
    o.foot = act('Publishing\u2026', 'Nothing is public yet', true);
  }

  if(st === 'error'){
    o.body = msg('blocked', 'Publishing failed. Your listing is not public.',
      'The submission reached Ponte and the checks did not complete. Nothing was published, so nothing needs withdrawing.',
      '<dt>Saved</dt><dd class="was">The listing in full, exactly as you previewed it.</dd>'
      + '<dt>Not saved</dt><dd class="wasnt">Nothing. It was never public.</dd>'
      + '<dt>Reference</dt><dd class="id">PT-4482-08 \u00b7 02 Aug 2026, 10:26</dd>');
    o.foot = act('Publish again', 'Nothing needs re-entering') + snd('Go back to the preview');
  }
  return frame(o);
 }
};

/* ===================== 6 · SCREENING STATES ===================== */
function scrRow(mk, b, s, st, cls){
  return '<div class="scr__i"><span class="mk mk--'+mk+'"></span><span><b>'+b+'</b>'+(s?'<small>'+s+'</small>':'')+'</span>'
    + '<span class="st '+(cls||'')+'">'+st+'</span></div>';
}
var PERIM = '<div class="perim"><p><b style="color:var(--pf-ink)">What Ponte checked, and only that.</b> Ponte runs sanctions and prohibited-goods lists and tests the submission for completeness and internal consistency. It does not verify your counterparty, inspect your goods, or confirm that anything a document claims is true. A checked listing is a complete one, not a safe one.</p></div>';

var SCREEN = {
 n:'6', id:'B09s', title:'Screening',
 purpose:'Publication is automated-first, so these run in seconds. A submission that passes is Checked \u2014 never Approved, Vetted or Reviewed. The language never suggests a person is queued to look at a standard submission.',
 states:[['running','Running'],['checked','Checked'],['attention','Needs something from you'],['refused','Refused'],['error','Error']],
 build:function(st, th){
  var o = { theme:th, segs:5, seg:5, back:'Preview', label:'SCR '+st };

  if(st === 'running'){
    o.body = head('Checking your submission.', 'Seconds, not days', 12)
      + '<div class="s1__pad" style="padding:0 20px 14px"><p class="prose">Automated. Nobody is queued to look at this.</p></div>'
      + ind()
      + '<div class="scr">'
      + scrRow('done', 'Fields complete and consistent', '', 'Checked', 'ok')
      + scrRow('inferred', 'Sanctions and prohibited goods', '', 'Running', 'run')
      + scrRow('inferred', 'Duplicate listing', '', 'Waiting', 'run')
      + '</div>' + PERIM;
    o.foot = act('Publishing\u2026', 'Nothing is public yet', true) + snd('Cancel and go back');
  }

  if(st === 'checked'){
    o.body = head('Checked.', '3 of 3 \u00b7 completed in 4 seconds', 12)
      + '<div class="scr">'
      + scrRow('done', 'Fields complete and consistent', '9 facts, no contradictions', 'Checked', 'ok')
      + scrRow('done', 'Sanctions and prohibited goods', 'No match on the lists Ponte runs', 'Checked', 'ok')
      + scrRow('done', 'Duplicate listing', 'No other live listing matches this one', 'Checked', 'ok')
      + '</div>' + PERIM;
    o.foot = act('Publish', 'Public and free. Anyone can find it.');
  }

  if(st === 'attention'){
    o.body = head('One thing needs you before this can publish.', '', 12)
      + '<div class="scr">'
      + scrRow('done', 'Fields complete and consistent', '', 'Checked', 'ok')
      + scrRow('done', 'Sanctions and prohibited goods', 'No match on the lists Ponte runs', 'Checked', 'ok')
      + scrRow('need', 'Duplicate listing', 'PT-4390-07 is live and matches this on product, origin and terms', 'Your call', '')
      + '</div>'
      + '<div class="band--attention" style="padding:18px 20px 20px;border-block-start:1px solid var(--rule)">'
      + '<p class="prose" style="color:var(--pf-ink)">Two identical listings split the interest between them and neither reads as the stronger offer. Ponte will publish both if that is what you want.</p></div>'
      + '<div class="rows">'
      + '<button class="row" type="button"><span class="mk mk--inferred"></span><span><b>Replace the live one</b><small>PT-4390-07 comes down as this goes up</small></span><span class="go">\u203a</span></button>'
      + '<button class="row" type="button"><span class="mk mk--inferred"></span><span><b>Publish both anyway</b><small>They will appear as separate listings</small></span><span class="go">\u203a</span></button>'
      + '</div>' + PERIM;
    o.foot = act('Choose one to continue', '', true) + snd('Go back to the preview');
  }

  if(st === 'refused'){
    o.body = msg('blocked', 'Ponte cannot publish this listing.',
      'The goods named fall inside a category Ponte does not carry. This is a rule about the category, not a judgement about you or your company.',
      '<dt>Reason</dt><dd class="wasnt">Prohibited goods \u00b7 category not carried by Ponte</dd>'
      + '<dt>Saved</dt><dd class="was">The listing in full, as a private draft.</dd>'
      + '<dt>Not saved</dt><dd class="wasnt">Nothing. It was never public.</dd>'
      + '<dt>Reference</dt><dd class="id">PT-4482-08 \u00b7 02 Aug 2026, 10:31</dd>')
      + '<div class="hr"></div>'
      + '<div class="rows">'
      + '<button class="row" type="button"><span class="gl gl--find"></span><span><b>Change the product</b><small>The rest of the listing stays as it is</small></span><span class="go">\u203a</span></button>'
      + '<button class="row" type="button"><span class="gl gl--file"></span><span><b>Ask Ponte to look again</b><small>If you think the category is wrong. A person reads this one.</small></span><span class="go">\u203a</span></button>'
      + '</div>';
    o.foot = snd('Keep it as a private draft');
  }

  if(st === 'error'){
    o.body = msg('blocked', 'The checks did not finish.',
      'A service failure, not a finding. Ponte does not publish on an incomplete check, so your listing stayed where it was.',
      '<dt>Completed</dt><dd class="was">Fields complete and consistent \u2014 checked.</dd>'
      + '<dt>Did not run</dt><dd class="wasnt">Sanctions and prohibited goods. Duplicate listing.</dd>'
      + '<dt>Reference</dt><dd class="id">PT-4482-08 \u00b7 02 Aug 2026, 10:33</dd>')
      + '<div class="hr"></div>'
      + '<div class="scr">'
      + scrRow('done', 'Fields complete and consistent', '', 'Checked', 'ok')
      + scrRow('blocked', 'Sanctions and prohibited goods', '', 'Did not run', 'no')
      + scrRow('blocked', 'Duplicate listing', '', 'Did not run', 'no')
      + '</div>';
    o.foot = act('Run the checks again', 'Starts from the two that did not run') + snd('Go back to the preview');
  }
  return frame(o);
 }
};

window.PS2 = { B01:B01, CAP:CAP, B06:B06, B07:B07, B09:B09, SCREEN:SCREEN,
  order:['B01','CAP','B06','B07','B09','SCREEN'] };
})();
