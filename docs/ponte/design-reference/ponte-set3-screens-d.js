/* PONTE · SET 3 — Part 2: D02 respondent, D02 owner-side acceptance variant,
   D03 counterparty fit, D04 deal room progression. Helpers from part 1. */
(function(){
var H = window.PS3H;
var frame=H.frame, act=H.act, snd=H.snd, foots=H.foots, head=H.head, msg=H.msg, sk=H.sk, ind=H.ind, rec=H.rec;
var SAVED90 = H.SAVED90;

function tl(items){
  return '<div class="tl">'+items.map(function(i){
    return '<div><i class="dot'+(i[2]?' dot--now':'')+'"></i><b>'+i[0]+'</b><span class="t">'+i[1]+'</span></div>';
  }).join('')+'</div>';
}

/* ===================== 4 · D02 REQUEST STATUS (respondent) ===================== */
var D02 = {
 n:'4', id:'D02', title:'Request Status',
 purpose:'Three honest states for interest in a member opportunity. Pending never implies a reply is owed; lapsed is said plainly rather than left silent; accepted carries the mutually disclosed information and the route to a room. It is a state, not a messaging product. A paid investigation is not shown here \u2014 it has no owner to accept it and no lifecycle beyond the purchase commitment made at D01.',
 states:[['pending','Pending'],['lapsed','Lapsed'],['accepted','Accepted'],['withdraw','Withdrawing'],['empty','No requests yet'],['loading','Loading'],['error','Error']],
 build:function(st, th){
  var o = { theme:th, segs:5, seg:4, back:'Your requests', label:'D02 '+st, step:'Your interest' };

  if(st === 'pending'){
    o.body = '<div class="stat"><div class="stat__m"><span class="mk mk--inferred"></span><span class="lab">Pending</span></div>'
      + '<h2>Sent. Waiting on the owner.</h2>'
      + '<p>Ponte does not promise that an owner will reply. Some do within a day, some never do. You will be told the moment anything changes, and you can withdraw at any time.</p>'
      + '<dl><dt>Listing</dt><dd>PT-4482 \u00b7 Extra virgin olive oil, 24,000 L</dd><dt>Sent</dt><dd>29 July 2026, 14:12</dd><dt>Your identity</dt><dd>Not revealed</dd><dt>Listing expires</dt><dd>1 October 2026</dd></dl></div>'
      + tl([['Interest sent','29 Jul'],['Owner notified','29 Jul'],['Reminder sent to the owner','1 Aug', true],['Second and final reminder','8 Aug']])
      + '<div class="perim"><p>Two reminders, then Ponte stops. It will not chase an owner beyond that, and silence is not a decision you need to wait out \u2014 send interest elsewhere while this one sits.</p></div>';
    o.foot = act('Find other opportunities', 'Your interest here stays open') + snd('Withdraw this interest') + foots(SAVED90);
  }

  if(st === 'lapsed'){
    o.body = '<div class="stat"><div class="stat__m"><span class="mk mk--inferred"></span><span class="lab">Lapsed</span></div>'
      + '<h2>The listing closed before the owner answered.</h2>'
      + '<p>It expired on 1 August. Your interest was never declined and was never accepted \u2014 it simply has nowhere left to go. No identity was revealed on either side.</p>'
      + '<dl><dt>Listing</dt><dd>PT-4482</dd><dt>Closed</dt><dd>1 August 2026 \u00b7 expired</dd><dt>Your statement</dt><dd class="was">Kept in your account</dd><dt>Identity revealed</dt><dd class="wasnt">No</dd></dl></div>'
      + '<div class="perim"><p>Ponte says this rather than leaving the request sitting in a list looking live. Your statement can be reused as written on any similar listing.</p></div>';
    o.foot = act('Reuse this statement elsewhere', 'Four open listings in HS 1509 into the EU') + snd('Archive this request') + foots(SAVED90);
  }

  if(st === 'accepted'){
    o.body = '<div class="r2"><div class="r2__m"><span class="mk mk--done"></span><span class="lab">Accepted</span></div>'
      + '<h2>The owner accepted your interest</h2>'
      + '<p>Your company identities have been disclosed to each other, and the private fields the owner opened are below. This is a state, not an inbox \u2014 Ponte gives you both what you need to proceed, and the room is where the work happens.</p>'
      + '<div class="held"><i></i><span>What stays as it was: the listing, your statement, and the reference. Nothing is re-entered anywhere.</span></div>'
      + '<div class="r2__next"><span class="lab">Next</span><b>Create the Deal Room \u2014 either of you may open it, and it will be the same room.</b></div>'
      + '<div class="r2__meta"><span>PT-4482</span><span>AI-90233</span><span>Accepted 2 Aug, 08:20</span></div></div>'
      + '<div class="rel__h" style="padding-bottom:6px"><span class="lab">Disclosed to you</span></div>'
      + rec([
        ['Company', 'Olivares del Sur S.L. \u00b7 Ja\u00e9n, Spain', 'Mutual'],
        ['Acting as', 'Producer \u00b7 own goods', 'Mutual'],
        ['Contact', 'Ana Ruiz \u00b7 export manager', 'Opened'],
        ['Price', '\u20ac3.98 / L, CIF Rotterdam', 'Opened'],
        ['Certificate of analysis', 'Harvest 2025 \u00b7 2 pages', 'Opened']], true)
      + '<div class="perim"><p>They received the same disclosure about you at the same moment. Neither side saw the other first.</p></div>';
    o.foot = act('Create the Deal Room', 'The listing, the statement and the disclosed fields carry in') + snd('Not yet \u2014 keep this open') + foots(SAVED90);
  }

  if(st === 'withdraw'){
    o.body = head('Withdraw your interest?', 'PT-4482 \u00b7 pending', 10)
      + '<div class="s1__pad" style="padding:0 20px 14px"><p class="prose">The owner stops seeing it and the reminders stop. Nothing of yours was ever revealed, so nothing needs undoing.</p></div>'
      + rec([['Your statement', 'Kept in your account', 'Kept'],['Identity', 'Was never revealed', 'None'],['Sending again', 'Allowed while the listing is open', 'Open']], true)
      + '<div class="perim"><p>You can send interest to this listing again later. It will be a new request, and the owner will see it as one.</p></div>';
    o.foot = act('Withdraw interest', 'The owner is not told why') + snd('Leave it pending') + foots(SAVED90);
  }

  if(st === 'empty'){
    o.body = msg('inferred', 'You have not sent any interest yet', 'When you do, each request sits here with its real state: pending, lapsed or accepted. Ponte will not decorate a pending request to make it look promising.');
    o.foot = act('Find opportunities', 'Product, trade service, distribution') + foots(SAVED90);
  }

  if(st === 'loading'){ o.body = head('Reading your requests', '', 10) + ind() + sk(4); }

  if(st === 'error'){
    o.body = msg('blocked', 'Ponte could not read the state of this request', 'The request is unaffected. This screen could not confirm where it stands, so it is not going to guess.',
      '<dt>Reference</dt><dd>AI-90233</dd><dt>Request</dt><dd class="was">Unchanged</dd><dt>Shown state</dt><dd class="wasnt">Not confirmed</dd>');
    o.foot = act('Try again') + snd('Back to your requests');
  }
  return frame(o);
 }
};

/* ============ 5 · D02 OWNER-SIDE ACCEPTANCE VARIANT — informed disclosure ============ */
var D02O = {
 n:'5', id:'D02 \u00b7 owner', title:'Acceptance \u2014 owner-side variant of D02',
 purpose:'Not a new screen ID: the owner-side acceptance variant of D02. Acceptance is a disclosure action, so before accepting the owner sees exactly what it releases \u2014 both identities mutually, the precise private fields opened, and the respondent\u2019s intermediary status restated at the moment identity is given. The consequence is written on the primary control itself.',
 states:[['review','Interest received \u00b7 what acceptance releases'],['inter','Respondent is an intermediary'],['verify','Require business verification first'],['decline','Declining'],['loading','Accepting'],['error','Error \u00b7 not accepted']],
 build:function(st, th){
  var o = { theme:th, segs:3, seg:2, back:'Your listing', label:'D02-own '+st, step:'Owner \u00b7 step 2 of 3' };
  var STMT = '<div class="rel__h" style="padding-bottom:6px"><span class="lab">What they said</span></div>'
    + rec([['Capacity', 'Importer and blender, own account'],
      ['Relevance', 'Bottles EVOO for Nordic grocery under contract; buys Andalusian lots each October.'],
      ['What they can fulfil', 'Full 24,000 L in one lift, CIF Rotterdam, October window, payment at sight.']], true);
  var RELEASE = '<div class="rel">'
    + '<div class="rel__h"><span class="lab">Accepting releases</span><b>These, and only these, at the same moment</b></div>'
    + '<div class="rel__i rel__i--open"><span class="mk mk--pub"></span><span><b>Both company identities</b><small>Yours to them and theirs to you, together. Neither side sees the other first.</small></span><span class="fx">Mutual</span></div>'
    + '<div class="rel__i rel__i--open"><span class="mk mk--acc"></span><span><b>Price \u00b7 \u20ac3.98 / L CIF</b><small>Currently held private on the listing</small></span><span class="fx">Opens</span></div>'
    + '<div class="rel__i rel__i--open"><span class="mk mk--acc"></span><span><b>Certificate of analysis</b><small>Harvest 2025 \u00b7 2 pages</small></span><span class="fx">Opens</span></div>'
    + '<div class="rel__i"><span class="mk mk--priv"></span><span><b>Your internal notes</b><small>Never released by acceptance, at any point</small></span><span class="fx">Stays private</span></div>'
    + '</div>';

  if(st === 'review'){
    o.body = '<div class="prov prov--mem" style="padding-block:14px"><div class="prov__h"><span class="lab">Interest received</span><span class="mk mk--done"></span><span class="id">AI-90233</span></div>'
      + '<p style="margin-top:8px">On PT-4482 \u00b7 received 29 July, 14:12. Their identity is withheld from you until you accept, as yours is from them.</p></div>'
      + STMT + RELEASE
      + '<div class="perim"><p>Declining releases nothing and tells them only that it was declined.</p></div>';
    o.foot = act('Accept \u2014 and reveal our companies to each other', 'Price and certificate open to them at the same moment')
      + snd('Decline') + snd('Require business verification first') + foots(SAVED90);
  }

  if(st === 'inter'){
    o.body = '<div class="inter"><span class="lab">Read this before you accept</span>'
      + '<b>This respondent is acting as an intermediary.</b>'
      + '<p>They are not buying on their own account. They state that they act for a principal, and Ponte does not know who that principal is and has not asked.</p>'
      + '<dl><dt>Stated as</dt><dd>Agent, acting for an undisclosed principal</dd><dt>Declared</dt><dd>By the respondent, at sign-up</dd><dt>Confirmed by Ponte</dt><dd>No</dd></dl></div>'
      + STMT + RELEASE
      + '<div class="perim"><p>Ponte does not hide intermediary status and does not let a member hide it either. It is restated here because this is the moment you give your identity away.</p></div>';
    o.foot = act('Accept \u2014 reveal our companies to an intermediary', 'Their principal stays unknown to you and to Ponte')
      + snd('Decline') + snd('Require business verification first') + foots(SAVED90);
  }

  if(st === 'verify'){
    o.body = head('Ask them to verify their business first', 'AI-90233 \u00b7 your choice, not a Ponte rule', 10)
      + '<div class="s1__pad" style="padding:0 20px 14px"><p class="prose">Ponte does not require business verification to respond to a listing. You may require it before you reveal your company, open sensitive fields, or admit anyone to a room \u2014 at your discretion.</p></div>'
      + '<div class="rel">'
      + '<div class="rel__i"><span class="mk mk--lock"></span><span><b>Nothing is released now</b><small>Your identity, price and certificate stay closed while they verify</small></span><span class="fx">Held</span></div>'
      + '<div class="rel__i"><span class="mk mk--inferred"></span><span><b>They are told what you asked for</b><small>Business verification, and that the interest is still live</small></span><span class="fx">Told</span></div>'
      + '<div class="rel__i"><span class="mk mk--inferred"></span><span><b>They may decline to verify</b><small>Then the interest lapses and neither side learns anything</small></span><span class="fx">Possible</span></div>'
      + '</div>'
      + '<div class="perim"><p>Requiring verification is not an acceptance and does not commit you to one. You decide again once it is done.</p></div>';
    o.foot = act('Require business verification', 'Releases nothing. You decide again afterwards') + snd('Back to the interest') + foots(SAVED90);
  }

  if(st === 'decline'){
    o.body = head('Decline this interest?', 'AI-90233 \u00b7 PT-4482', 10)
      + rec([['Your identity', 'Not revealed, now or later', 'None'],
        ['Price and certificate', 'Stay private', 'Closed'],
        ['What they are told', 'That it was declined. No reason is sent', 'Minimal'],
        ['Your listing', 'Stays open to everyone else', 'Live']], true)
      + '<div class="perim"><p>A reason is optional and is shown to them as your words if you give one. Ponte does not write one for you.</p></div>';
    o.foot = act('Decline', 'Releases nothing') + snd('Back to the interest') + foots(SAVED90);
  }

  if(st === 'loading'){
    o.body = head('Accepting and disclosing', 'AI-90233', 10) + ind()
      + rec([['Identities', 'Being exchanged', 'Mutual'],['Price and certificate', 'Opening to them', 'In progress']], true);
    o.foot = act('Accepting\u2026', 'Both disclosures complete together or neither does', true);
  }

  if(st === 'error'){
    o.body = msg('blocked', 'The acceptance did not complete', 'Ponte could not disclose both sides at once, so it disclosed neither. Your identity, price and certificate are exactly as they were.',
      '<dt>Reference</dt><dd>AI-90233</dd><dt>Your identity</dt><dd class="wasnt">Not revealed</dd><dt>Their identity</dt><dd class="wasnt">Not received</dd><dt>Private fields</dt><dd class="was">Still closed</dd><dt>Interest</dt><dd class="was">Still pending</dd>');
    o.foot = act('Try accepting again', 'Shows you the same release list first') + snd('Leave it pending') + foots(SAVED90);
  }
  return frame(o);
 }
};

/* ===================== 6 · D03 COUNTERPARTY FIT SUMMARY ===================== */
function fitI(mk, b, s){ return '<div class="fit__i"><span class="mk mk--'+mk+'"></span><span><b>'+b+'</b><small>'+s+'</small></span></div>'; }
var D03 = {
 n:'6', id:'D03', title:'Counterparty Fit Summary',
 purpose:'Why progression may or may not be worthwhile. Both parties see the same two ledgers: what Ponte checked, and what remains unproved. Never a guarantee, never a score, never a claim that the checks are exhaustive. R2 surface \u2014 credible_interest_confirmed \u2014 with all five elements.',
 states:[['product','Product \u00b7 both ledgers'],['dist','Distribution \u00b7 position is material'],['thin','Little proved either way'],['loading','Loading'],['error','Error']],
 build:function(st, th){
  var o = { theme:th, segs:5, seg:5, back:'Accepted interest', label:'D03 '+st, step:'Before the room' };
  var UN = '<div class="fit__h" style="padding-top:20px"><span class="lab">What remains unproved</span>'
    + '<p>Ponte has not looked at any of these. Their absence is not a warning, and their presence on this list is not a reassurance \u2014 it is the boundary of what was checked.</p></div>';

  if(st === 'product'){
    o.body = '<div class="r2"><div class="r2__m"><span class="mk mk--done"></span><span class="lab">Credible interest confirmed</span></div>'
      + '<h2>A credible path, and what is still unknown</h2>'
      + '<p>Both companies are disclosed, both are screened, and the respondent can take the whole lot on the stated terms. That is what makes this worth continuing \u2014 not a score, and not a judgement that either of you is safe.</p>'
      + '<div class="held"><i></i><span>Held so far: the listing, the interest statement, the disclosed fields and both references. None of it is re-entered in the room.</span></div>'
      + '<div class="r2__next"><span class="lab">Next</span><b>Prepare the Deal Room \u2014 Nordoli AB or Olivares del Sur may open it.</b></div>'
      + '<div class="r2__meta"><span>PT-4482</span><span>AI-90233</span><span>2 Aug, 08:22</span></div></div>'
      + '<div class="fit"><div class="fit__h"><span class="lab">What Ponte checked</span>'
      + '<p>Automated checks, run on both sides, at the moment of acceptance.</p></div>'
      + fitI('done','Both companies screened against sanctions lists','Nordoli AB and Olivares del Sur S.L. \u00b7 no match, 2 Aug')
      + fitI('done','Neither trades a prohibited category','HS 1509.20, unrestricted in both jurisdictions')
      + fitI('done','Both contacts verified','Email confirmed on both sides before disclosure')
      + fitI('done','The stated need matches the listing','24,000 L against 24,000 L \u00b1 5%, CIF Rotterdam, October')
      + fitI('done','Business verification, owner side','Registry number checked against the Spanish register')
      + '</div>' + UN
      + '<div class="fit fit--un">'
      + fitI('inferred','Whether either party can pay or perform','No credit, trade-reference or financial check was run')
      + fitI('inferred','The goods themselves','Ponte has not inspected, sampled or tested anything')
      + fitI('inferred','What the certificate of analysis claims','Shown as given. Its contents are not confirmed')
      + fitI('inferred','Business verification, respondent side','Not required to respond, and not supplied')
      + fitI('inferred','Any trading history between you','Ponte holds none and does not infer any')
      + '</div>'
      + '<div class="perim"><p>This is not comprehensive screening and Ponte does not claim it is. A credible path is a reason to talk, not evidence that a counterparty is sound.</p></div>';
    o.foot = act('Prepare the Deal Room', 'Everything above carries in') + snd('Not yet') + foots(SAVED90);
  }

  if(st === 'dist'){
    o.body = '<div class="r2"><div class="r2__m"><span class="mk mk--done"></span><span class="lab">Credible interest confirmed</span></div>'
      + '<h2>Facing positions, which is what makes this fit</h2>'
      + '<p>A principal seeking a distributor and a distributor seeking brands are counterparties. Two principals are not, however well the categories match \u2014 so position is shown before anything else.</p>'
      + '<div class="held"><i></i><span>Held so far: the listing, both positions, the interest statement and both references.</span></div>'
      + '<div class="r2__next"><span class="lab">Next</span><b>Prepare the Deal Room \u2014 either party may open it.</b></div>'
      + '<div class="r2__meta"><span>PT-4530</span><span>AI-90411</span><span>2 Aug, 09:04</span></div></div>'
      + '<div class="pos"><div><span class="lab">Owner</span><b>Principal</b><small>Seeking a distributor for Nordic grocery</small></div>'
      + '<span class="arrow">\u21c4</span>'
      + '<div><span class="lab">Respondent</span><b>Distributor</b><small>Seeking brands for Swedish and Danish grocery</small></div></div>'
      + '<div class="fit"><div class="fit__h"><span class="lab">What Ponte checked</span></div>'
      + fitI('done','The positions face each other','Principal seeking \u21c4 distributor offering. Not two peers')
      + fitI('done','Both companies screened against sanctions lists','No match, 2 Aug')
      + fitI('done','Markets overlap','Sweden and Denmark sought; both held by the respondent')
      + fitI('done','Channel matches','Grocery retail, own-label excluded on both sides')
      + '</div>' + UN
      + '<div class="fit fit--un">'
      + fitI('inferred','Whether the respondent holds the listings they describe','Stated, not evidenced. Ponte has not contacted a retailer')
      + fitI('inferred','Exclusivity, commission or term','Commercial matter for the room. Nothing agreed by reaching this screen')
      + fitI('inferred','Any existing distribution agreement','Ponte does not know what either party is already bound by')
      + '</div>'
      + '<div class="perim"><p>Position is checked. Performance is not. Ponte can tell you these two are counterparties; it cannot tell you the arrangement will work.</p></div>';
    o.foot = act('Prepare the Deal Room', 'Both positions carry in') + snd('Not yet') + foots(SAVED90);
  }

  if(st === 'thin'){
    o.body = '<div class="r2"><div class="r2__m"><span class="mk mk--done"></span><span class="lab">Credible interest confirmed</span></div>'
      + '<h2>Credible, and thinly evidenced</h2>'
      + '<p>Two checks passed and most of the list below is unproved. That is the honest shape of this one: enough to justify a conversation, not enough to justify much else. The unproved column is longer than the checked column, and Ponte is not going to hide that.</p>'
      + '<div class="held"><i></i><span>Held so far: the listing, the interest statement and both references.</span></div>'
      + '<div class="r2__next"><span class="lab">Next</span><b>Prepare the Deal Room, or ask them for what is missing first.</b></div>'
      + '<div class="r2__meta"><span>PT-4519</span><span>AI-90377</span><span>2 Aug, 09:31</span></div></div>'
      + '<div class="fit"><div class="fit__h"><span class="lab">What Ponte checked</span></div>'
      + fitI('done','Both companies screened against sanctions lists','No match, 2 Aug')
      + fitI('done','Both contacts verified','Email confirmed on both sides')
      + '</div>' + UN
      + '<div class="fit fit--un">'
      + fitI('inferred','The ISO/IEC 17020 accreditation','Stated by the member. Ponte has not seen or checked a certificate')
      + fitI('inferred','Business verification, both sides','Neither party has supplied it')
      + fitI('inferred','Coverage at the ports named','Stated, not evidenced')
      + fitI('inferred','Whether either party can pay or perform','No financial check was run')
      + '</div>'
      + '<div class="perim"><p>You may ask for any of this in the room, or require business verification before opening one.</p></div>';
    o.foot = act('Prepare the Deal Room', 'You can still ask for what is missing inside it') + snd('Ask for business verification first') + foots(SAVED90);
  }

  if(st === 'loading'){ o.body = head('Setting out what was checked', '', 10) + ind() + sk(5); }

  if(st === 'error'){
    o.body = msg('blocked', 'Ponte could not assemble the fit summary', 'Rather than show half of it, it shows none. A partial list of checks reads as a shorter list of checks, and that would be misleading.',
      '<dt>Reference</dt><dd>AI-90233</dd><dt>Acceptance</dt><dd class="was">Unaffected</dd><dt>Disclosed fields</dt><dd class="was">Still open to you</dd>');
    o.foot = act('Try again') + snd('Prepare the Deal Room anyway') + foots(SAVED90);
  }
  return frame(o);
 }
};

/* ===================== 7 · D04 DEAL ROOM PROGRESSION DECISION ===================== */
var CARRY = '<div class="carry">'
  + '<div><span class="mk mk--done"></span><b>The listing, as published</b><span class="fx">Carried</span></div>'
  + '<div><span class="mk mk--done"></span><b>The interest statement</b><span class="fx">Carried</span></div>'
  + '<div><span class="mk mk--done"></span><b>Both company identities</b><span class="fx">Carried</span></div>'
  + '<div><span class="mk mk--done"></span><b>The fields opened on acceptance</b><span class="fx">Carried</span></div>'
  + '<div><span class="mk mk--done"></span><b>Both references and every timestamp</b><span class="fx">Carried</span></div>'
  + '</div>';
var D04 = {
 n:'7', id:'D04', title:'Deal Room Progression Decision',
 purpose:'The commercial transition into the controlled layer. Idempotent per accepted interest: either party may initiate, both routes carry the same accepted-interest ID, and one room results. One listing may still produce several rooms with different respondents. Nothing from the listing is re-entered.',
 states:[['open','Open the room'],['exists','Already open \u00b7 idempotent'],['second','A second room from the same interest'],['many','Several rooms, different respondents'],['loading','Opening'],['error','Error \u00b7 not opened']],
 build:function(st, th){
  var o = { theme:th, segs:5, seg:5, back:'Fit summary', label:'D04 '+st, step:'Into the room' };

  if(st === 'open'){
    o.body = head('Open the Deal Room', 'PT-4482 \u00b7 AI-90233', 10)
      + '<div class="s1__pad" style="padding:0 20px 14px"><p class="prose">This is the move into the controlled layer. Everything already established comes with it \u2014 nothing is re-entered, by either of you.</p></div>'
      + CARRY
      + '<div class="idem"><span class="lab">One room per accepted interest</span>'
      + '<p>Either party may open it. If Olivares del Sur opens it first, this action takes you into the same room rather than making a second one.</p>'
      + '<dl><dt>Accepted interest</dt><dd>AI-90233</dd><dt>Room</dt><dd>One</dd></dl></div>';
    o.foot = act('Open the Deal Room', 'Olivares del Sur is told it is open') + snd('Not yet') + foots(SAVED90);
  }

  if(st === 'exists'){
    o.body = '<div class="r2"><div class="r2__m"><span class="mk mk--done"></span><span class="lab">Already open</span></div>'
      + '<h2>Olivares del Sur opened it eight minutes ago</h2>'
      + '<p>Both routes carry the same accepted-interest ID, so this is the same room \u2014 not a second one. Nothing you were about to do is lost, and nothing is duplicated.</p>'
      + '<div class="r2__next"><span class="lab">Next</span><b>Go into the room \u2014 everything from the listing is already there.</b></div>'
      + '<div class="r2__meta"><span>AI-90233</span><span>Room DR-1180</span><span>Opened 09:38</span></div></div>'
      + CARRY
      + '<div class="perim"><p>Idempotency is per accepted interest, not per listing. The same listing can still hold separate rooms with other respondents.</p></div>';
    o.foot = act('Go into the room', 'DR-1180 \u00b7 opened by Olivares del Sur') + foots(SAVED90);
  }

  if(st === 'second'){
    o.body = head('A room already exists for this interest', 'AI-90233 \u00b7 DR-1180', 10)
      + '<div class="s1__pad" style="padding:0 20px 14px"><p class="prose">A second room from the same accepted interest is possible, but it is not something one party does alone \u2014 it splits the record of a single deal in two.</p></div>'
      + rec([['Existing room', 'DR-1180 \u00b7 open since 30 July', 'Live'],
        ['A second room', 'Requires both parties to agree explicitly', 'Both'],
        ['Olivares del Sur', 'Has not been asked yet', 'Pending you']], true)
      + '<div class="perim"><p>Ponte will ask them plainly and show you their answer. If they decline, DR-1180 continues as it is.</p></div>';
    o.foot = act('Ask them to agree to a second room', 'They see why you asked, in your words') + snd('Go into DR-1180 instead') + foots(SAVED90);
  }

  if(st === 'many'){
    o.body = head('Three rooms on this listing', 'PT-4482 \u00b7 still open', 10)
      + '<div class="s1__pad" style="padding:0 20px 14px"><p class="prose">One listing, three accepted interests, three separate respondents \u2014 and so three rooms. They do not see each other, and none of them is exclusive until you make it so inside one.</p></div>'
      + '<div class="rows">'
      + '<button class="row" type="button"><span class="mk mk--done"></span><span><b>Nordoli AB</b><small>DR-1180 \u00b7 AI-90233 \u00b7 open since 30 July</small></span><span class="go">\u203a</span></button>'
      + '<button class="row" type="button"><span class="mk mk--done"></span><span><b>Baltic Oils O\u00dc</b><small>DR-1194 \u00b7 AI-90298 \u00b7 open since 1 August</small></span><span class="go">\u203a</span></button>'
      + '<button class="row" type="button"><span class="mk mk--inferred"></span><span><b>Kvarnen Import AB</b><small>AI-90340 \u00b7 accepted, no room opened yet</small></span><span class="go">\u203a</span></button>'
      + '</div>'
      + '<div class="perim"><p>Ponte does not tell any respondent how many others there are, and does not rank them for you.</p></div>';
    o.foot = act('Open the room with Kvarnen Import', 'AI-90340 \u00b7 the third accepted interest') + foots(SAVED90);
  }

  if(st === 'loading'){
    o.body = head('Opening the room', 'AI-90233', 10) + ind()
      + rec([['Listing and statement', 'Carrying in', 'In progress'],['Disclosed fields', 'Carrying in', 'In progress'],['Room', 'One, keyed to AI-90233', 'Held']], true);
    o.foot = act('Opening\u2026', 'If it is already open you will land in the same room', true);
  }

  if(st === 'error'){
    o.body = msg('blocked', 'The room did not open', 'Nothing was created, so there is no half-made room to clear up. The accepted interest and every disclosure stand exactly as they were.',
      '<dt>Accepted interest</dt><dd>AI-90233</dd><dt>Room created</dt><dd class="wasnt">No</dd><dt>Disclosures</dt><dd class="was">Unchanged</dd><dt>Counterparty told</dt><dd class="wasnt">No</dd>')
      + '<div class="perim"><p>Trying again is safe: one accepted interest can only ever key one room, so a retry cannot leave you with two.</p></div>';
    o.foot = act('Try again', 'Cannot create a duplicate room') + snd('Back to the fit summary') + foots(SAVED90);
  }
  return frame(o);
 }
};

window.PS3.D02 = D02; window.PS3.D02O = D02O; window.PS3.D03 = D03; window.PS3.D04 = D04;
window.PS3.order = ['A05','A06','D01','D02','D02O','D03','D04'];
})();
