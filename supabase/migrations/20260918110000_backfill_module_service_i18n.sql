-- پرکردنِ label_en/label_de (module_prices) و name_en/de + description_en/de
-- (services) — ستون‌ها در 20260917150000 اضافه شدند اما هرگز پر نشدند، پس
-- moduleLabelFor()/serviceNameFor()/serviceDescriptionFor() (که زبانِ
-- خواسته‌شده → انگلیسی → فارسی زنجیره می‌کنند) همیشه به فارسی برمی‌گشتند —
-- دقیقاً همان چیزی که کاربر در صفحه‌ی خریدِ ماژول‌ها و صفحه‌ی «اشتراکِ شما
-- به پایان رسیده است» دید و گزارش داد. این فقط دادهٔ نمایشی را پر می‌کند؛
-- هیچ ستون یا رفتاری تغییر نمی‌کند، پس با ویرایشِ بعدیِ ادمین از کنسولِ
-- قیمت‌گذاری هم بی‌خطر جایگزین می‌شود.
update public.module_prices set label_en = 'Internal Chat', label_de = 'Interner Chat' where module_key = 'chat';
update public.module_prices set label_en = 'Notifications', label_de = 'Benachrichtigungen' where module_key = 'notifications';
update public.module_prices set label_en = 'Profile & Settings', label_de = 'Profil & Einstellungen' where module_key = 'profile';
update public.module_prices set label_en = 'HSE Quick Tools (Basic)', label_de = 'HSE-Schnellwerkzeuge (Basis)' where module_key = 'quickTools';
update public.module_prices set label_en = 'Non-Conformance Management (Anomalies)', label_de = 'Abweichungsmanagement (Anomalien)' where module_key = 'anomalyReport';
update public.module_prices set label_en = 'Incident Management', label_de = 'Vorfallmanagement' where module_key = 'incidentManagement';
update public.module_prices set label_en = 'Proactive HSE Indicators', label_de = 'Proaktive HSE-Kennzahlen' where module_key = 'proactiveIndicators';
update public.module_prices set label_en = 'Scaffold Tag Management', label_de = 'Gerüst-Tag-Verwaltung' where module_key = 'scaffoldManagement';
update public.module_prices set label_en = 'Personnel Access & Attendance', label_de = 'Personalzugang & Anwesenheit' where module_key = 'personnelAccess';
update public.module_prices set label_en = 'Risk Assessment Management (BowTie)', label_de = 'Risikobewertungsmanagement (BowTie)' where module_key = 'riskAssessment';
update public.module_prices set label_en = 'HCMS – Hazard Control', label_de = 'HCMS – Gefahrenkontrolle' where module_key = 'hcmsDashboard';
update public.module_prices set label_en = 'Risk Assessment Knowledge Bank', label_de = 'Wissensdatenbank Risikobewertung' where module_key = 'riskKnowledgeManagement';
update public.module_prices set label_en = 'Operational Dashboard', label_de = 'Operatives Dashboard' where module_key = 'operationalDashboard';
update public.module_prices set label_en = 'Management & Analytics Dashboard', label_de = 'Management- & Analyse-Dashboard' where module_key = 'managementDashboard';
update public.module_prices set label_en = 'Machinery Management', label_de = 'Maschinenmanagement' where module_key = 'machineryManagement';
update public.module_prices set label_en = 'Lifting Plan Design & Simulation', label_de = 'Hebeplan-Design & Simulation' where module_key = 'liftingPlan';
update public.module_prices set label_en = 'Electricity Consumption Calculator', label_de = 'Stromverbrauchsrechner' where module_key = 'energy-calculator';
update public.module_prices set label_en = 'Fleet Fuel Consumption Calculator', label_de = 'Flottenkraftstoffverbrauchsrechner' where module_key = 'fleet-fuel-calculator';
update public.module_prices set label_en = 'Safe Excavation Slope & Width Calculator', label_de = 'Rechner für sichere Grabungsböschung & -breite' where module_key = 'excavation-calculator';
update public.module_prices set label_en = 'File Archive', label_de = 'Dateiarchiv' where module_key = 'archiveManagement';
update public.module_prices set label_en = 'Training Management', label_de = 'Schulungsmanagement' where module_key = 'trainingManagement';
update public.module_prices set label_en = 'Role & Permission Management', label_de = 'Rollen- & Berechtigungsverwaltung' where module_key = 'permissionManagement';
update public.module_prices set label_en = 'Job Position Management', label_de = 'Verwaltung der Stellen' where module_key = 'jobPositionManagement';
update public.module_prices set label_en = 'Effectiveness Thresholds', label_de = 'Wirksamkeitsschwellen' where module_key = 'effectivenessThresholds';
update public.module_prices set label_en = 'HCMS Matrix Management', label_de = 'HCMS-Matrix-Verwaltung' where module_key = 'hcmsMatrixManagement';
update public.module_prices set label_en = 'Chat Access Management', label_de = 'Chat-Zugriffsverwaltung' where module_key = 'chatAccessManagement';
update public.module_prices set label_en = 'Scaffold Code Management', label_de = 'Gerüstcode-Verwaltung' where module_key = 'scaffoldCodeManagement';
update public.module_prices set label_en = 'Anomaly Category Management', label_de = 'Anomalie-Kategorieverwaltung' where module_key = 'anomalyCategoryManagement';
update public.module_prices set label_en = 'HSE Survey', label_de = 'HSE-Umfrage' where module_key = 'hseSurvey';
update public.module_prices set label_en = 'Permit to Work', label_de = 'Arbeitserlaubnis' where module_key = 'permitToWork';
update public.module_prices set label_en = 'Pre-Startup Safety Review (PSSR)', label_de = 'Sicherheitsüberprüfung vor Inbetriebnahme (PSSR)' where module_key = 'pssr';

update public.services set
  name_en = '24/7 Dedicated Support', name_de = '24/7-Premium-Support',
  description_en = 'Dedicated channel + SLA', description_de = 'Eigener Kanal + SLA'
  where id = 'svc-support-247';
update public.services set
  name_en = 'On-site Onboarding Training', name_de = 'Vor-Ort-Einführungsschulung',
  description_en = 'One-time, expert on-site visit', description_de = 'Einmalig, Experte vor Ort'
  where id = 'svc-onsite';
update public.services set
  name_en = 'Extra 50GB Storage', name_de = 'Zusätzlicher Speicher 50 GB',
  description_en = 'On top of your plan''s storage cap', description_de = 'Zusätzlich zum Speicherlimit Ihres Tarifs'
  where id = 'svc-storage-50';
update public.services set
  name_en = 'Attendance System Integration', name_de = 'Integration mit Zeiterfassungssystem',
  description_en = 'Automatic personnel access/time sync', description_de = 'Automatische Synchronisierung der Personalanwesenheit'
  where id = 'svc-tardad';
