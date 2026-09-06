-- افزودن ترجمه‌ی انگلیسی به جداول مرجع SBS (نمونه‌برداری از رفتارهای ایمنی):
-- ۱۲ دسته‌ی رفتار ناایمن (sbs_ref_category) و ۳۲ کد مصداق (sbs_ref_subitem)
-- که تا امروز فقط فارسی بودند. الگو دقیقاً مثل مهاجرت tripod_ref_english
-- است: یک ستون _en اضافه می‌شود، مقدار انگلیسی back-fill می‌شود و loader
-- (loadSbsCategories در sbsApi.js) با getCurrentLang() انتخاب می‌کند؛ اگر
-- ترجمه‌ی انگلیسی خالی بماند به فارسی برمی‌گردد. پیشوند شماره‌ی هر ردیف
-- («۱-» برای دسته، «۱٬۱.» برای مصداق) در انگلیسی به شکل «1-» و «1.1.»
-- نوشته شده تا با ترتیب فارسی یکی بماند.

alter table sbs_ref_category add column if not exists title_en text;
alter table sbs_ref_subitem  add column if not exists text_en  text;

-- ---------- دسته‌ها ----------
update sbs_ref_category set title_en = '1- Improper use of PPE'                                        where code = '1';
update sbs_ref_category set title_en = '2- Improper use of tools'                                      where code = '2';
update sbs_ref_category set title_en = '3- Unsafe work at height'                                       where code = '3';
update sbs_ref_category set title_en = '4- Unsafe lifting operations'                                   where code = '4';
update sbs_ref_category set title_en = '5- Unsafe driving'                                              where code = '5';
update sbs_ref_category set title_en = '6- Unsafe handling and moving operations'                       where code = '6';
update sbs_ref_category set title_en = '7- Creating unsafe conditions'                                  where code = '7';
update sbs_ref_category set title_en = '8- Working without a permit'                                    where code = '8';
update sbs_ref_category set title_en = '9- Performing a hazardous (unsafe) activity'                    where code = '9';
update sbs_ref_category set title_en = '10- Non-compliance with environmental and health regulations'  where code = '10';
update sbs_ref_category set title_en = '11- Non-compliance with site regulations'                       where code = '11';
update sbs_ref_category set title_en = '12- Other unsafe conditions and situations'                     where code = '12';

-- ---------- کدهای مصداق ----------
update sbs_ref_subitem set text_en = '1.1. Not using PPE'                                                                        where id = 'sbs-1-1';
update sbs_ref_subitem set text_en = '2.1. Incorrect use of tools'                                                               where id = 'sbs-2-1';
update sbs_ref_subitem set text_en = '3.1. Unsafe work at height'                                                                where id = 'sbs-3-1';
update sbs_ref_subitem set text_en = '4.1. The rigger does not give proper, standard signals to the crane operator'             where id = 'sbs-4-1';
update sbs_ref_subitem set text_en = '5.1. Unsafe driving, or driving without a licence and permit'                              where id = 'sbs-5-1';
update sbs_ref_subitem set text_en = '6.1. Carrying people on the load, in the forklift cab, or in the back of a pickup'         where id = 'sbs-6-1';
update sbs_ref_subitem set text_en = '7.1. Leaving equipment running unattended'                                                 where id = 'sbs-7-1';
update sbs_ref_subitem set text_en = '8.1. Working without a permit'                                                             where id = 'sbs-8-1';
update sbs_ref_subitem set text_en = '9.1. Poor posture'                                                                         where id = 'sbs-9-1';
update sbs_ref_subitem set text_en = '10.1. Dropping litter on the ground'                                                       where id = 'sbs-10-1';
update sbs_ref_subitem set text_en = '11.1. Distracting others, harassing, abusing, startling, shouting, horseplay, sleeping'    where id = 'sbs-11-1';
update sbs_ref_subitem set text_en = 'Other (describe in the notes field)'                                                       where id = 'sbs-12-1';
update sbs_ref_subitem set text_en = '1.2. Improper use of PPE'                                                                  where id = 'sbs-1-2';
update sbs_ref_subitem set text_en = '5.2. Not following site traffic rules'                                                     where id = 'sbs-5-2';
update sbs_ref_subitem set text_en = '6.2. Carrying loads in unfavourable conditions'                                            where id = 'sbs-6-2';
update sbs_ref_subitem set text_en = '3.2. Working on scaffolds carrying a red tag'                                              where id = 'sbs-3-2';
update sbs_ref_subitem set text_en = '7.2. Leaving gas hoses and power cables on the ground without protective covering'         where id = 'sbs-7-2';
update sbs_ref_subitem set text_en = '4.2. Unsafe moving and loading'                                                            where id = 'sbs-4-2';
update sbs_ref_subitem set text_en = '9.2. Entering barricaded and prohibited areas'                                             where id = 'sbs-9-2';
update sbs_ref_subitem set text_en = '2.2. Using the hand as a tool'                                                             where id = 'sbs-2-2';
update sbs_ref_subitem set text_en = '10.2. Releasing petroleum products into the environment'                                   where id = 'sbs-10-2';
update sbs_ref_subitem set text_en = '1.3. Wearing a neck scarf or shemagh during grinding operations'                          where id = 'sbs-1-3';
update sbs_ref_subitem set text_en = '7.3. Leaving tools scattered around the worksite'                                          where id = 'sbs-7-3';
update sbs_ref_subitem set text_en = '10.3. Discharging harmful substances into water'                                           where id = 'sbs-10-3';
update sbs_ref_subitem set text_en = '2.3. Using unsuitable or defective tools'                                                  where id = 'sbs-2-3';
update sbs_ref_subitem set text_en = '9.3. Working on moving or hazardous equipment'                                             where id = 'sbs-9-3';
update sbs_ref_subitem set text_en = 'Using weak or worn slings, chains, wire ropes and other lifting gear'                     where id = 'sbs-2-4';
update sbs_ref_subitem set text_en = '7.4. Failing to secure gas cylinders'                                                     where id = 'sbs-7-4';
update sbs_ref_subitem set text_en = '10.4. Eating food in the work area'                                                        where id = 'sbs-10-4';
update sbs_ref_subitem set text_en = '9.4. Working under a suspended load'                                                       where id = 'sbs-9-4';
update sbs_ref_subitem set text_en = '7.5. Smoking in prohibited areas'                                                          where id = 'sbs-7-5';
update sbs_ref_subitem set text_en = '9.5. Working on a live electrical panel'                                                   where id = 'sbs-9-5';
