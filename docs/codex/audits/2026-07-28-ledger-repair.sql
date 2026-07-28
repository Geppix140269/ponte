-- Ponte production migration-ledger reconciliation, 2026-07-28.
--
-- Records in public.schema_migrations the repository migrations that this audit
-- verified are ALREADY APPLIED in production but were never recorded, because
-- they were applied by hand through the Supabase Management API / SQL editor.
--
-- This changes NO schema and NO application data. It is INSERT-only apart from
-- one hash alignment, and is reversible by deleting the rows written at this
-- applied_at timestamp.
--
-- 20260725a_verification_needs_selection.sql is DELIBERATELY EXCLUDED: it is
-- not applied, and cannot be applied as written (proven: it violates existing
-- rows). It must not be recorded as applied.


begin;

create temp table _rec (filename text primary key, sha256 text) on commit drop;

insert into _rec (filename, sha256) values
  ('01_catalogue_fields.sql', 'a0950633e7e1a399dc132f6f3aa119162747ce0aec13061e1b26b351b5eefc61'),
  ('02_ponte_previews_bucket.sql', 'e9684f5bd0d89a0abc26a5a752e25f67a22ca4c414b7e3f2062d78f3778e77a4'),
  ('20260526_b_catalogue_includes.sql', '1fb6a2139e6044b738706d4e1c313d34cf5a3fb9da1268a825b862fd03f0cef1'),
  ('20260526_capacity_queue.sql', '81f854bef06c5084675580bf61580c9687ff0b138b5f1eea365ef8e96964dccb'),
  ('20260526_catalogue_restructure.sql', 'dd3dfedfe1e1af2c8673ebe8b79573ae66e3d953a39d622b2ac604eed4586ec5'),
  ('20260527_wave4_catalogue.sql', '2ae2c34b47995ededa449862ba6d8c6d448458593bd947295a07760e005c40c7'),
  ('20260528_wave4_product_copy_ponte_voice.sql', '767e51f7047d31c6dc2bc5517c8a5548ba451d7ccca0062349564dea7105cb2f'),
  ('20260610_adamftd_catalogue.sql', '0e9484ef0d0189c237bbd982cf52060c295172beec57365dc2550fd9af10232c'),
  ('20260610_lock_profile_role.sql', '97f1ecbc64447421f4fba6a3d244020ca9a213d9bce9d85af137a54e4d222237'),
  ('20260720_marketplace_listings.sql', '01faaeea3a39350b03449823b29b844f2d2c256d63f961f0b43ecaeeccb67c9e'),
  ('20260720b_marketplace_browse.sql', '931e734d10ef11a33ec65d1175ef2501448c89871a11349a22a54f6091ca63ba'),
  ('20260720c_marketplace_media.sql', '9d09f78a3decf3e7d492c5fd1bab77689120c75aa54be7719635342b1843fb67'),
  ('20260720d_ai_review.sql', '16e3ab0c5f5a7260ce12dfa92122bf9c53f3a455c47c15b32a1a904e3255eab0'),
  ('20260720e_submitter_chain.sql', '95e538f58185aa7bf935a670ef443b20780f8a261b0d961fb949b3a65b1989b4'),
  ('20260721a_drafts_sharing.sql', '1ab1baa79b65f9ba4bfddacac08ec2fd5d21b9554c3b205e26b7446c608b8b28'),
  ('20260721b_connections.sql', 'caf733a580d87432d219c168f79571a50d6714d855c0c4ac4a9fac6192d665f3'),
  ('20260721c_translations.sql', 'b458f3e95260451adbe42768064154f0a9508477dc83d32bc71fa57232ddf2e8'),
  ('20260721d_account_briefs.sql', '8d5a630c3908387e88c7ef80cb9030065e132f60f2f22e4375155752914bc47a'),
  ('20260721e_ai_freemium.sql', 'f528d353bf88b3099fd26098774cb2818b1588d5ac4db17a91c522c3ba2fa098'),
  ('20260721f_credits_and_ai_metering.sql', '13102235f36a628ce880522d6863202abea8248eb19f712e3ee7b2d9a0b37a96'),
  ('20260721g_verification.sql', 'bcbbd267dc44d0e1517652535a769c0767ab45c04a517248243bffb50f3442df'),
  ('20260721h_sanctions_match.sql', '482a80fc535845dd53b4f60ca6346f66b53ce88593a75727972ab9058e001c84'),
  ('20260721i_verification_needs_selection.sql', '100a0189088569923482b326638f74a2d5541792cf81bc32cedac972668a3585'),
  ('20260721j_data_sources.sql', '59bbd99fd0c5966a8e862725a33aa4c3da16f90557191d8a40f213dfcea4c459'),
  ('20260722b_hs_codes.sql', '942978b089c30380af352a7eb357491594583bc568619d42aabb62245d1a55e6'),
  ('20260722c_listings_v4.sql', '8a6aa81001696f3bd6b7485c2c8d1816afef2fbc220bf7f1b6009c36d24c3c67'),
  ('20260722d_signup_credits.sql', 'e3a83eea7214c9c0fac5460cdf9996ee943ff51f2abe811f2731b2d23bae4d31'),
  ('20260722e_handle_new_user_search_path.sql', '3e7082ac000d7f55ab1446cdb3b97021762391d56d6a7030de6433ee3484e422'),
  ('20260722f_desk_radar.sql', '9fdaf58246434df59dfc46c8b68775a7789d6bbde2ae27b0a397cff34f5aa967'),
  ('20260723a_desk_radar_signal_gate.sql', '01cd45299a45977aa76aa136f141bc33965fa31946ec6769a144a0b812c1736f'),
  ('20260723b_verification_purpose.sql', 'ebe5faa5255a3a84dfac28233dd8e3eb9348467ac738ba1878e64577d815f5d1'),
  ('20260723c_verification_attestation.sql', '867a85cf47b3e55c8606a7fff2e19c11d772d0dc5c9d5f12d38160e62518b83c'),
  ('20260723d_investigation_and_interest.sql', '1c7b0d1a384c8aab89c8e3df4789c4b3ba4d68f6d0cc06f7ebcd204667435c53'),
  ('20260723e_investigation_dedupe_and_count.sql', '7b5182269d382681640fb8d563fcbf9d52e326985e0ade3ea4625eb1be65cf81'),
  ('20260723f_referral_attribution.sql', 'adb6eb4766a8915d9c33e878d3ee43ba1af8b283b32306a862a5181cf5d132d8'),
  ('20260724a_desk_radar_signal_import.sql', 'fe7b84730544a58a5e50f1519c86001c88af82a7452a387b075d0f98db420e1d'),
  ('20260724b_listings_desk_managed.sql', 'aa3140b4c78df13bc568f43757f5ed2a7485cad2fe14f4a0ae4415cbdb2a1aa9'),
  ('20260726a_investigation_kind.sql', '63f2c84c624532a4459656c6eef9079d4b94a0ebc18945b4cdc187b1fb56051b'),
  ('20260728a_market_classification.sql', '8e9d0e728d6a866571915e175c3b588c56b81504943041908836443ec661aa5f');


insert into public.schema_migrations (filename, sha256, applied_at)
select r.filename, r.sha256, now() from _rec r
on conflict (filename) do nothing;

-- 20260724a was applied on 2026-07-24, then the file was corrected in 9fa0aa6
-- (partial unique index -> plain unique index). Production was verified to match
-- the corrected file, so align the recorded hash with it.
update public.schema_migrations m set sha256 = r.sha256
  from _rec r
 where m.filename = r.filename
   and m.filename = '20260724a_desk_radar_signal_import.sql';

commit;
