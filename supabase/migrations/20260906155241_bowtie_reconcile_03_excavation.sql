-- BowTie reconciliation — Model «حفاری و گودبرداری» (Excavation & Trenching)
-- Source of truth: attached PDF "Md1HighRisk_004" page 3.
-- Scope: ONLY bowtie 2712798d-c3c4-47fe-b90d-43032437c1ef (company aa4db99c…).
-- The models «الکتریسیته» (f2708236…) and «کار در ارتفاع» (966fd46f…) are NOT
-- referenced anywhere in this migration and stay 100% untouched.
--
-- What this does:
--   * removes 6 duplicate / not-in-PDF threat rows and 1 duplicate consequence
--   * rewrites every barrier set exactly per the PDF (Threat→Preventive,
--     Consequence→Recovery)
--   * keeps barrier 276fa6e4 (the only one carrying a real effectiveness
--     assessment) in place and re-parents it to consequence C2 per the PDF
--   * fixes threat / consequence wording, ordering and the top event
-- Note: every barrier carries auto-generated dbee_score_history rows (NO ACTION
-- FK); those are cleared first for the barriers being replaced. DBEE recomputes
-- them on the next run.

begin;

-- 1) clear DBEE references for every model barrier except the one we keep
delete from dbee_score_history
where barrier_id in (
  select id from bowtie_barriers
  where bowtie_id = '2712798d-c3c4-47fe-b90d-43032437c1ef'
    and id <> '276fa6e4-1603-422f-a580-5b5906d89e05'
);
delete from dbee_source_barrier_map
where barrier_id in (
  select id from bowtie_barriers
  where bowtie_id = '2712798d-c3c4-47fe-b90d-43032437c1ef'
    and id <> '276fa6e4-1603-422f-a580-5b5906d89e05'
);

-- 2) drop all barriers except the kept one (junk-threat barriers included)
delete from bowtie_barriers
where bowtie_id = '2712798d-c3c4-47fe-b90d-43032437c1ef'
  and id <> '276fa6e4-1603-422f-a580-5b5906d89e05';

-- 3) drop duplicate / not-in-PDF threats and the duplicate consequence
delete from bowtie_threats where id in (
  '9ad4f699-b942-441b-902c-2924abc5e180', -- dup of T4
  '3f5b17ac-0270-472e-9d1b-c278b282c87d', -- dup of T5
  'e6af910c-ffd0-48c7-930b-12f17a89e949', -- «بارندگی…» not a PDF threat
  '587fbde7-275e-449f-91ff-b460624c3b7a', -- dup of T3
  'a6206363-4877-4e77-abc7-27e8f8574325', -- dup of T2
  '6213980d-91c8-40b8-9f31-7b1f440389b2'  -- «توقف بی‌مورد کارگر…» not a PDF threat
);
delete from bowtie_consequences where id = 'c5e0252a-5c90-4d3e-b4e4-d252bd1229e4';

-- 4) canonical threats: exact PDF wording + order
update bowtie_threats set label = 'سست و نامناسب بودن خاک محل حفاری',                         order_index = 0 where id = '43ef067a-4e94-4d04-bd2b-de6e35bb0cb7';
update bowtie_threats set label = 'بار زنده / ارتعاش / تردد ماشین‌آلات لبه محل گودبرداری',     order_index = 1 where id = 'a1e6bb29-a953-4891-977f-e612d6b57d87';
update bowtie_threats set label = 'بار مرده / نخاله لبه گود',                                  order_index = 2 where id = 'fcebf0d0-3ffc-49af-84db-23292dc3bb8a';
update bowtie_threats set label = 'تراوش آب یا ورود آبهای سطحی به داخل محل گودبرداری شده',     order_index = 3 where id = 'd1004c50-e7fe-4bdc-aa96-ee781735a20f';
update bowtie_threats set label = 'نبود / نامناسب بودن راه دسترسی به محل گودبرداری',           order_index = 4 where id = '43fc677c-1db8-487f-a7af-b55fd9e1c0a3';
update bowtie_threats set label = 'برخورد با تأسیسات زیرزمینی',                                order_index = 5 where id = '8625f7d2-4bd2-44dd-af23-46ae28b61fbb';

-- 5) canonical consequences: exact PDF wording + order
update bowtie_consequences set label = 'گیر افتادن در زیر آوار',                          order_index = 0 where id = '1b576476-6eba-4a60-8759-e1c9b10888c3';
update bowtie_consequences set label = 'آسیب دیدن ماشین‌آلات، تجهیزات و تأسیسات',          order_index = 1 where id = '1ea16224-4d2a-4702-bc4e-68933e6d2b42';

-- 6) top event
update bowties set top_event = 'ریزش خاک / برخورد با تأسیسات', updated_at = now()
where id = '2712798d-c3c4-47fe-b90d-43032437c1ef';

-- 7) re-parent the kept (assessed) barrier to consequence C2, per the PDF
update bowtie_barriers set
  side = 'recovery',
  threat_id = null,
  consequence_id = '1ea16224-4d2a-4702-bc4e-68933e6d2b42',
  order_index = 0,
  label = 'قرار گرفتن ماشین‌آلات و تجهیزات خارج از محدوده‌های خطر ریزش',
  owner = 'مسئول ساختمان پیمانکار'
where id = '276fa6e4-1603-422f-a580-5b5906d89e05';

-- 8) insert every barrier exactly per the PDF
insert into bowtie_barriers (id, bowtie_id, company_id, side, threat_id, consequence_id, order_index, label, owner, criticality, status, effectiveness_status) values
-- T1  سست و نامناسب بودن خاک محل حفاری
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','43ef067a-4e94-4d04-bd2b-de6e35bb0cb7',null,0,'انجام مطالعات ژئوتکنیک و آزمایشات مکانیک خاک','امور ساختمان','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','43ef067a-4e94-4d04-bd2b-de6e35bb0cb7',null,1,'حفاری مطابق جنس و مشخصات خاک به روش پلکانی یا شیبدار','مسئول ساختمان پیمانکار','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','43ef067a-4e94-4d04-bd2b-de6e35bb0cb7',null,2,'مهار دیواره‌های محل گودبرداری','مسئول ساختمان پیمانکار','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','43ef067a-4e94-4d04-bd2b-de6e35bb0cb7',null,3,'بازرسی و نظارت‌های تخصصی HSE','مسئول ایمنی و بهداشت پروژه','medium','green','not_assessed'),
-- T2  بار زنده / ارتعاش / تردد ماشین‌آلات لبه محل گودبرداری
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','a1e6bb29-a953-4891-977f-e612d6b57d87',null,0,'حفاری مطابق جنس و مشخصات خاک به روش پلکانی یا شیبدار','مسئول ساختمان پیمانکار','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','a1e6bb29-a953-4891-977f-e612d6b57d87',null,1,'محصورسازی اطراف محل گودبرداری','مسئول ایمنی، بهداشت و محیط زیست پیمانکار','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','a1e6bb29-a953-4891-977f-e612d6b57d87',null,2,'نصب تابلوها و علائم هشداردهنده','مسئول ایمنی، بهداشت و محیط زیست پیمانکار','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','a1e6bb29-a953-4891-977f-e612d6b57d87',null,3,'بازرسی و نظارت‌های تخصصی HSE','مسئول ایمنی و بهداشت پروژه','medium','green','not_assessed'),
-- T3  بار مرده / نخاله لبه گود
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','fcebf0d0-3ffc-49af-84db-23292dc3bb8a',null,0,'حفاری مطابق جنس و مشخصات خاک به روش پلکانی یا شیبدار','مسئول ساختمان پیمانکار','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','fcebf0d0-3ffc-49af-84db-23292dc3bb8a',null,1,'ممانعت از دپوی خاک و مصالح لبه‌ی محل گودبرداری شده','مسئول ساختمان پروژه','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','fcebf0d0-3ffc-49af-84db-23292dc3bb8a',null,2,'محصورسازی اطراف محل گودبرداری','مسئول ایمنی، بهداشت و محیط زیست پیمانکار','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','fcebf0d0-3ffc-49af-84db-23292dc3bb8a',null,3,'بازرسی و نظارت‌های تخصصی HSE','مسئول ایمنی و بهداشت پروژه','medium','green','not_assessed'),
-- T4  تراوش آب یا ورود آبهای سطحی به داخل محل گودبرداری شده
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','d1004c50-e7fe-4bdc-aa96-ee781735a20f',null,0,'انجام مطالعات ژئوتکنیک و آزمایشات مکانیک خاک','امور ساختمان','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','d1004c50-e7fe-4bdc-aa96-ee781735a20f',null,1,'زه‌کشی / تخلیه آب برای جلوگیری از تجمع آب داخل محل گودبرداری','مسئول ساختمان پیمانکار','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','d1004c50-e7fe-4bdc-aa96-ee781735a20f',null,2,'مهار دیواره‌های محل گودبرداری','مسئول ایمنی، بهداشت و محیط زیست پیمانکار','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','d1004c50-e7fe-4bdc-aa96-ee781735a20f',null,3,'بازرسی و نظارت‌های تخصصی HSE','مسئول ایمنی و بهداشت پروژه','medium','green','not_assessed'),
-- T5  نبود / نامناسب بودن راه دسترسی به محل گودبرداری
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','43fc677c-1db8-487f-a7af-b55fd9e1c0a3',null,0,'اجرای رمپ و راه دسترسی مناسب مطابق دستورالعمل گودبرداری','مسئول ساختمان پیمانکار','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','43fc677c-1db8-487f-a7af-b55fd9e1c0a3',null,1,'استفاده از نردبان‌های ثابت و سیار','مسئول ایمنی، بهداشت و محیط زیست پیمانکار','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','43fc677c-1db8-487f-a7af-b55fd9e1c0a3',null,2,'آموزش تخصصی HSE','مسئول ایمنی و بهداشت پروژه','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','43fc677c-1db8-487f-a7af-b55fd9e1c0a3',null,3,'بازرسی و نظارت‌های تخصصی HSE','مسئول ایمنی و بهداشت پروژه','medium','green','not_assessed'),
-- T6  برخورد با تأسیسات زیرزمینی
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','8625f7d2-4bd2-44dd-af23-46ae28b61fbb',null,0,'تهیه پلان و ازبیلت تأسیسات زیرزمینی','مسئول دفتر فنی پروژه','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','8625f7d2-4bd2-44dd-af23-46ae28b61fbb',null,1,'تغییر متد حفاری از حالت مکانیکی به دستی در محل‌های عبور تأسیسات','مسئول ساختمان پیمانکار','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','8625f7d2-4bd2-44dd-af23-46ae28b61fbb',null,2,'بکارگیری اپراتور و رانندگان صلاحیت‌دار','سرپرست کارگاه پیمانکار','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','8625f7d2-4bd2-44dd-af23-46ae28b61fbb',null,3,'آموزش تخصصی HSE','مسئول ایمنی و بهداشت پروژه','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','preventive','8625f7d2-4bd2-44dd-af23-46ae28b61fbb',null,4,'بازرسی و نظارت‌های تخصصی HSE','مسئول ایمنی و بهداشت پروژه','medium','green','not_assessed'),
-- C1  گیر افتادن در زیر آوار
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','recovery',null,'1b576476-6eba-4a60-8759-e1c9b10888c3',0,'استفاده از باکس‌های حفاظتی','مدیرپروژه پیمانکار','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','recovery',null,'1b576476-6eba-4a60-8759-e1c9b10888c3',1,'استقرار تیم آتش‌نشانی و بهداری در سایت','امور HSE','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','recovery',null,'1b576476-6eba-4a60-8759-e1c9b10888c3',2,'آمادگی واکنش در شرایط اضطراری','مسئول ایمنی و بهداشت پروژه','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','recovery',null,'1b576476-6eba-4a60-8759-e1c9b10888c3',3,'پوشش بیمه مسئولیت مدنی','مدیرپروژه پیمانکار','medium','green','not_assessed'),
-- C2  آسیب دیدن ماشین‌آلات، تجهیزات و تأسیسات  (order 0 kept as barrier 276fa6e4 above)
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','recovery',null,'1ea16224-4d2a-4702-bc4e-68933e6d2b42',1,'آمادگی واکنش در شرایط اضطراری','مسئول ایمنی و بهداشت پروژه','medium','green','not_assessed'),
(gen_random_uuid()::text,'2712798d-c3c4-47fe-b90d-43032437c1ef','aa4db99c-f669-4166-9d75-9a6108d44014','recovery',null,'1ea16224-4d2a-4702-bc4e-68933e6d2b42',2,'پوشش بیمه‌ای خسارت ماشین‌آلات و تجهیزات','مدیرپروژه پیمانکار','medium','green','not_assessed');

commit;
